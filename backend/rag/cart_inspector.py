"""
RAG Autonomous Cart Health & Savings Inspector Module.
Proactively audits items inside the Smart Trolley against the senior citizen's
personal health profile (Diabetic, Heart Health, Lactose Intolerant)
and identifies missed volume discounts or healthier in-store substitutes.
"""
from backend.database import get_product_by_id

class CartHealthInspector:
    def inspect(self, cart_items, health_profile="general"):
        """
        Audits active trolley items for health conflicts and untapped discounts.
        """
        if not cart_items:
            return {
                "health_profile": health_profile,
                "health_score": "N/A",
                "warnings": [],
                "healthy_swaps": [],
                "deal_tips": [],
                "summary": "Trolley is empty. Add items to receive personalized AI health guidance."
            }

        profile_lower = (health_profile or "general").lower()
        warnings = []
        healthy_swaps = []
        deal_tips = []
        penalty_points = 0

        for item in cart_items:
            name = item.get("product_name", "").lower()
            tags = item.get("health_tags", "").lower()
            qty = item.get("quantity", 1)
            offer = item.get("discount_offer", "")

            # 1. Diabetic Health Checks
            if "diabetic" in profile_lower:
                if "sugar" in name and "brown" not in name and "cane" not in name:
                    warnings.append(f"⚠️ High Glycemic Warning: '{item['product_name']}' contains refined crystalline sugar, not advised for diabetic management.")
                    healthy_swaps.append({
                        "original": item['product_name'],
                        "suggested": "Organic Jaggery Powder or Epigamia Almond Milk (Unsweetened)",
                        "location": "Aisle 1, Shelf B2",
                        "reason": "Unrefined traditional natural sweetener with lower glycemic spike."
                    })
                    penalty_points += 25
                elif "oreo" in name or "dark fantasy" in name:
                    warnings.append(f"⚠️ Sugar Notice: '{item['product_name']}' has high sugar cream.")
                    healthy_swaps.append({
                        "original": item['product_name'],
                        "suggested": "NutriChoice Digestive High Fibre Biscuits",
                        "location": "Aisle 3, Shelf A3",
                        "reason": "Whole wheat and fiber slow glucose absorption."
                    })
                    penalty_points += 20

            # 2. Lactose Intolerance Checks
            if "lactose" in profile_lower:
                if any(dairy in name for dairy in ["milk", "cheese", "butter", "ghee"]) and "almond" not in name:
                    warnings.append(f"⚠️ Lactose Warning: '{item['product_name']}' contains cow milk solids.")
                    healthy_swaps.append({
                        "original": item['product_name'],
                        "suggested": "Epigamia Almond Milk Unsweetened (100% Plant Based)",
                        "location": "Aisle 2, Shelf D2",
                        "reason": "Lactose-free, calcium enriched plant alternative."
                    })
                    penalty_points += 30

            # 3. Heart Health & Hypertension Checks
            if "heart" in profile_lower or "bp" in profile_lower or "hypertension" in profile_lower:
                if "butter" in name or "ghee" in name:
                    warnings.append(f"⚠️ Saturated Fat Notice: '{item['product_name']}' has high saturated dairy lipids. Consume in moderation.")
                    healthy_swaps.append({
                        "original": item['product_name'],
                        "suggested": "Saffola Gold Pro Healthy Lifestyle Oil or Borges Extra Virgin Olive Oil",
                        "location": "Aisle 2, Shelf A2 / B2",
                        "reason": "Dual-seed antioxidants & monounsaturated heart-healthy fats."
                    })
                    penalty_points += 15

            # 4. Volume Discount Opportunities
            if "buy 2" in offer.lower() and qty == 1:
                deal_tips.append(f"💡 Deal Opportunity: '{item['product_name']}' has '{offer}'. Add 1 more unit to activate discount savings!")
            elif "buy 1 get 1" in offer.lower() and qty == 1:
                deal_tips.append(f"🎉 Free Item Alert: '{item['product_name']}' has '{offer}'. Add a 2nd unit for free!")

        # Calculate Basket Health Grade
        if penalty_points == 0:
            grade = "A+ (Excellent & Balanced)"
            summary = "Your trolley contents align well with your personal health profile."
        elif penalty_points <= 20:
            grade = "A (Good / Mild Caution)"
            summary = "Mostly balanced basket with minor items to consume in moderation."
        elif penalty_points <= 40:
            grade = "B (Moderate Caution)"
            summary = "Contains some items that may contradict your selected dietary condition."
        else:
            grade = "C (Action Recommended)"
            summary = "Multiple items in your trolley conflict with your health constraints. See suggested swaps below."

        return {
            "health_profile": health_profile,
            "health_score": grade,
            "warnings": warnings,
            "healthy_swaps": healthy_swaps,
            "deal_tips": deal_tips,
            "summary": summary
        }

