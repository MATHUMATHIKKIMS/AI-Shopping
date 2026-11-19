"""
Retriever module for RAG Shopping Assistant.
Performs FAISS vector similarity search and combines with exact SQL lookups
for price comparisons, inventory status, and aisle-based queries.
"""
import json
import re
import numpy as np
import faiss
from backend.config import Config, SAVED_INDEX_PATH, SAVED_METADATA_PATH
from backend.rag.embeddings import EmbeddingModel
from backend.database import compare_products_exact, get_products_by_aisle_exact, search_products_sql

TAMIL_KEYWORD_MAP = {
    "அரிசி": "rice",
    "சர்க்கரை": "sugar",
    "எண்ணெய்": "oil",
    "பால்": "milk",
    "பிஸ்கட்": "biscuit",
    "சோப்பு": "soap",
    "ஷாம்பு": "shampoo",
    "வெங்காயம்": "onion",
    "உருளைக்கிழங்கு": "potato",
    "தக்காளி": "tomato",
    "ஆப்பிள்": "apple",
    "வாழைப்பழம்": "banana",
    "கோதுமை": "wheat atta",
    "ஆட்டா": "atta",
    "நெய்": "ghee",
    "பருப்பு": "dal"
}

def translate_tamil_query(query):
    """Augments query with English equivalents if Tamil grocery terms are detected."""
    augmented = query
    for tam_word, eng_word in TAMIL_KEYWORD_MAP.items():
        if tam_word in query:
            augmented += f" {eng_word}"
    return augmented

class ProductRetriever:

    def __init__(self):
        self.embedder = EmbeddingModel()
        self.index = None
        self.metadata = None
        self.load_index()

    def load_index(self):
        """Loads FAISS index and metadata from disk."""
        if SAVED_INDEX_PATH.exists() and SAVED_METADATA_PATH.exists():
            try:
                self.index = faiss.read_index(str(SAVED_INDEX_PATH))
                with open(SAVED_METADATA_PATH, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
                print(f"[Retriever] Loaded FAISS index with {self.index.ntotal} vectors.")
            except Exception as e:
                print(f"[Retriever] Error loading FAISS index: {e}")
                self.index = None
                self.metadata = None
        else:
            print("[Retriever] FAISS index files not found. Call build_index first.")

    def reload(self):
        """Reloads index from disk after a rebuild."""
        # Re-initialize embedder to refresh fitted vectorizer if changed
        self.embedder = EmbeddingModel()
        self.load_index()

    def _detect_comparison_intent(self, query):
        """
        Detects if query is an exact price comparison, ranking, or aisle lookup.
        Examples: 'Which rice is cheaper?', 'cheapest cooking oil', 'what is in aisle 2?'
        """
        q_lower = query.lower()

        # Check for aisle query
        aisle_match = re.search(r"aisle\s*(\d+)", q_lower)
        if aisle_match:
            return {"type": "aisle", "param": f"Aisle {aisle_match.group(1)}"}

        # Check for price comparison / cheap / expensive
        comparison_words = ["cheap", "cheaper", "cheapest", "lowest price", "cost less", "compare", "difference between"]
        is_comparison = any(w in q_lower for w in comparison_words)

        # Detect product target
        targets = ["rice", "sugar", "atta", "wheat", "oil", "milk", "biscuit", "soap", "shampoo", "toothpaste", "detergent", "apple", "banana", "potato", "onion"]
        matched_target = None
        for t in targets:
            if t in q_lower:
                matched_target = t
                break

        if is_comparison and matched_target:
            return {"type": "compare_price", "target": matched_target}
        elif is_comparison:
            return {"type": "compare_general", "target": None}

        # Check for offer query
        if any(w in q_lower for w in ["offer", "offers", "discount", "discounts", "deal", "deals"]):
            return {"type": "offers", "param": None}

        return None

    def retrieve(self, query, top_k=Config.TOP_K, threshold=Config.RELEVANCE_THRESHOLD):
        """
        Main retrieval method combining FAISS vector search and exact SQL queries.
        Returns:
            dict containing:
                - 'results': list of matched product records with similarity scores
                - 'intent': detected query intent
                - 'is_relevant': boolean indicating if relevance threshold was satisfied
                - 'search_type': 'vector', 'sql_exact', or 'hybrid'
        """
        query = (query or "").strip()
        if not query:
            return {
                "results": [],
                "intent": "empty",
                "is_relevant": False,
                "search_type": "none",
                "message": "Empty query provided."
            }

        # If Tamil keywords are present, augment query with English counterpart
        search_query = translate_tamil_query(query)
        intent_data = self._detect_comparison_intent(search_query)


        # 1. Exact SQL Path for Aisle Queries
        if intent_data and intent_data["type"] == "aisle":
            aisle_name = intent_data["param"]
            sql_products = get_products_by_aisle_exact(aisle_name)
            if sql_products:
                for p in sql_products:
                    p["similarity_score"] = 0.98  # Exact SQL match confidence
                    p["match_type"] = "exact_sql_aisle"
                return {
                    "results": sql_products[:top_k],
                    "intent": "aisle_lookup",
                    "is_relevant": True,
                    "search_type": "sql_exact"
                }

        # 2. Exact SQL Path for Price Comparison
        if intent_data and intent_data["type"] == "compare_price":
            target = intent_data["target"]
            sql_products = compare_products_exact(target)
            if sql_products:
                for rank, p in enumerate(sql_products):
                    p["similarity_score"] = round(0.99 - (rank * 0.03), 4)
                    p["match_type"] = "exact_sql_comparison"
                return {
                    "results": sql_products[:top_k + 2],  # Provide more items for comparison
                    "intent": "price_comparison",
                    "is_relevant": True,
                    "search_type": "sql_exact"
                }

        # 3. Exact SQL Path for Offers Query
        if intent_data and intent_data["type"] == "offers":
            sql_products = search_products_sql()
            discounted = [p for p in sql_products if p["discount_offer"] and p["discount_offer"] != "No Offer"]
            if discounted:
                for p in discounted:
                    p["similarity_score"] = 0.95
                    p["match_type"] = "exact_sql_offer"
                return {
                    "results": discounted[:top_k + 2],
                    "intent": "active_offers",
                    "is_relevant": True,
                    "search_type": "sql_exact"
                }

        # 4. FAISS Vector Search Path
        if self.index is None or self.metadata is None:
            self.load_index()

        if self.index is None or self.metadata is None:
            # Fallback to direct SQL search if index is somehow not loaded
            sql_results = search_products_sql(query=query)
            for p in sql_results:
                p["similarity_score"] = 0.70
                p["match_type"] = "sql_fallback"
            return {
                "results": sql_results[:top_k],
                "intent": "general_keyword",
                "is_relevant": len(sql_results) > 0,
                "search_type": "sql_fallback"
            }

        # Encode query to vector (using augmented search_query)
        query_vec = self.embedder.encode(search_query)
        if query_vec.ndim == 1:
            query_vec = np.expand_dims(query_vec, axis=0)


        # Search top_k * 2 to filter by threshold
        k_search = min(top_k * 2, self.index.ntotal)
        scores, indices = self.index.search(query_vec, k_search)

        matched_products = []
        is_relevant = False

        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self.metadata["products"]):
                continue
            
            sim_score = float(score)
            prod = dict(self.metadata["products"][idx])
            prod["similarity_score"] = round(sim_score, 4)
            prod["match_type"] = "faiss_vector"

            # Check relevance threshold
            if sim_score >= threshold:
                is_relevant = True
                matched_products.append(prod)

        # If vector score is borderline, perform a secondary SQL keyword search to ensure no miss
        if len(matched_products) == 0:
            sql_matches = search_products_sql(query=search_query)
            if sql_matches:
                for p in sql_matches[:top_k]:
                    p["similarity_score"] = 0.75
                    p["match_type"] = "sql_keyword_fallback"
                    matched_products.append(p)
                is_relevant = True


        return {
            "results": matched_products[:top_k],
            "intent": "semantic_search",
            "is_relevant": is_relevant,
            "search_type": "faiss_vector" if not any(p.get("match_type") == "sql_keyword_fallback" for p in matched_products) else "hybrid"
        }

