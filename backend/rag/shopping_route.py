"""
RAG In-Store Shopping List & Route Optimizer Module.
Parses natural language grocery shopping lists, matches items against
the supermarket vector knowledge base, and computes the shortest,
most comfortable forward walking path through Aisles 1 to 6.
"""
import re
from backend.rag.retriever import ProductRetriever

class ShoppingRouteOptimizer:
    def __init__(self):
        self.retriever = ProductRetriever()

    def parse_and_optimize(self, raw_input):
        """
        Takes raw string (comma-separated or newline-separated) or list of items.
        Resolves each item with RAG, deduplicates, and generates sequential route.
        """
        if isinstance(raw_input, str):
            # Split by commas, newlines, or semicolons
            tokens = re.split(r"[\n,;]+", raw_input)
        else:
            tokens = raw_input

        clean_items = [t.strip() for t in tokens if t.strip()]
        if not clean_items:
            return {"success": False, "error": "No items provided in shopping list."}

        matched_products = []
        unmatched = []
        total_estimated_cost = 0.0

        seen_ids = set()
        for item_query in clean_items:
            res = self.retriever.retrieve(item_query, top_k=1)
            if res["results"] and res["is_relevant"]:
                prod = dict(res["results"][0])
                if prod["product_id"] not in seen_ids:
                    seen_ids.add(prod["product_id"])
                    matched_products.append(prod)
                    total_estimated_cost += float(prod["price"])
            else:
                unmatched.append(item_query)

        # Sort items sequentially by physical store aisle order
        def get_aisle_number(p):
            aisle_str = str(p.get("aisle_number", "Aisle 9"))
            digits = "".join(filter(str.isdigit, aisle_str))
            return int(digits) if digits else 9

        sorted_route = sorted(matched_products, key=get_aisle_number)

        # Generate step-by-step walking sequence
        itinerary = [
            "Start: Collect your Smart Trolley at the Store Entrance / Trolley Bay."
        ]

        current_aisle = None
        for step_idx, p in enumerate(sorted_route, 1):
            aisle = p["aisle_number"]
            if aisle != current_aisle:
                current_aisle = aisle
                itinerary.append(f"Move to **{aisle}**:")
            itinerary.append(f"  • Pick **{p['product_name']}** ({p['shelf_location']}) - Rs. {p['price']:.2f}")

        itinerary.append("Finish: Proceed straight to Express Digital Self-Checkout.")

        return {
            "success": True,
            "total_items_found": len(sorted_route),
            "unmatched_items": unmatched,
            "estimated_total_cost": round(total_estimated_cost, 2),
            "resolved_products": sorted_route,
            "itinerary": itinerary
        }

