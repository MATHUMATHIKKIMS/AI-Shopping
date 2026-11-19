"""
Index builder module for FAISS vector similarity search.
Reads products from SQLite database, generates dense representations,
and serializes the FAISS index and metadata.
"""
import json
import numpy as np
import faiss
from backend.config import Config, SAVED_INDEX_DIR
from backend.database import get_all_products, init_db
from backend.rag.embeddings import EmbeddingModel

def format_product_document(p):
    """Formats a product dictionary into a rich semantic text representation."""
    doc = (
        f"Product Name: {p['product_name']}. "
        f"Brand: {p['brand']}. "
        f"Category: {p['category']}. "
        f"Health Tags: {p.get('health_tags', 'General Grocery')}. "
        f"Allergens: {p.get('allergens', 'None')}. "
        f"Nutritional Info: {p.get('nutritional_summary', '')}. "
        f"Price: Rs. {p['price']:.2f} for {p['quantity']}. "
        f"Location: {p['aisle_number']}, {p['shelf_location']}. "
        f"Availability: {p['availability']}. "
        f"Offer: {p['discount_offer']}. "
        f"Description: {p['product_description']}"
    )
    return doc


def build_product_index():
    """
    Builds or rebuilds the FAISS vector index from current database records.
    Returns summary dict with count, dimension, and status.
    """
    init_db()  # Ensure DB is created and seeded
    products = get_all_products(limit=1000)

    if not products:
        raise ValueError("No products found in database to build index.")

    documents = [format_product_document(p) for p in products]

    # Initialize and fit embedding model
    embedder = EmbeddingModel()
    embedder.fit_fallback_corpus(documents)

    # Encode all documents
    vectors = embedder.encode(documents)
    num_items, dimension = vectors.shape

    # Build FAISS inner-product (cosine) index
    index = faiss.IndexFlatIP(dimension)
    index.add(vectors)

    # Ensure saved directory exists
    SAVED_INDEX_DIR.mkdir(parents=True, exist_ok=True)

    # Write FAISS index
    index_file = str(Config.SAVED_INDEX_PATH)
    faiss.write_index(index, index_file)

    # Write metadata JSON
    metadata = {
        "total_products": num_items,
        "dimension": dimension,
        "products": products,
        "documents": documents
    }
    with open(Config.SAVED_METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    print(f"[RAG Build] FAISS index built successfully: {num_items} vectors, dim={dimension}.")
    return {
        "status": "success",
        "total_products": num_items,
        "dimension": dimension,
        "index_file": str(Config.SAVED_INDEX_PATH),
        "metadata_file": str(Config.SAVED_METADATA_PATH)
    }

if __name__ == "__main__":
    result = build_product_index()
    print("Build result:", result)

