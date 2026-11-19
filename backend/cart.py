"""
Smart Trolley Virtual Cart & Billing Module.
Handles real-time item scanning, quantity updates, automatic discount calculations,
senior citizen budget tracking, and digital self-checkout receipt generation.
"""
import uuid
import re
from datetime import datetime
from backend.config import Config
from backend.database import get_product_by_id

class SmartTrolleyCart:
    def __init__(self, session_id=None, budget=Config.DEFAULT_BUDGET):
        self.session_id = session_id or f"TRL-{str(uuid.uuid4())[:8].upper()}"
        self.items = {}  # {product_id: {"product": dict, "quantity": int}}
        self.budget = float(budget)
        self.last_updated = datetime.now().isoformat()

    def add_item(self, product_id, quantity=1):
        """Adds a product to the smart cart by ID or increases quantity."""
        product = get_product_by_id(product_id)
        if not product:
            return {"success": False, "error": f"Product '{product_id}' not found in database."}

        if product["availability"] == "Out of Stock":
            return {"success": False, "error": f"'{product['product_name']}' is currently Out of Stock."}

        qty = max(1, int(quantity))
        if product_id in self.items:
            self.items[product_id]["quantity"] += qty
        else:
            self.items[product_id] = {
                "product": product,
                "quantity": qty
            }

        self.last_updated = datetime.now().isoformat()
        return {"success": True, "cart": self.get_cart_summary()}

    def remove_item(self, product_id):
        """Removes a product entirely from the cart."""
        if product_id in self.items:
            del self.items[product_id]
            self.last_updated = datetime.now().isoformat()
            return {"success": True, "cart": self.get_cart_summary()}
        return {"success": False, "error": f"Product '{product_id}' not in cart."}

    def update_quantity(self, product_id, quantity):
        """Sets exact quantity of a product in the cart. If <= 0, removes it."""
        qty = int(quantity)
        if qty <= 0:
            return self.remove_item(product_id)

        if product_id in self.items:
            self.items[product_id]["quantity"] = qty
            self.last_updated = datetime.now().isoformat()
            return {"success": True, "cart": self.get_cart_summary()}
        return {"success": False, "error": f"Product '{product_id}' not in cart."}

    def clear(self):
        """Clears all items from the smart cart."""
        self.items = {}
        self.last_updated = datetime.now().isoformat()
        return {"success": True, "cart": self.get_cart_summary()}

    def set_budget(self, budget_amount):
        """Sets a personal shopping budget for budget monitoring."""
        self.budget = max(100.0, float(budget_amount))
        return {"success": True, "budget": self.budget, "cart": self.get_cart_summary()}

    def _calculate_item_discount(self, product, quantity):
        """Computes promotional savings based on offer string."""
        price = float(product["price"])
        offer = str(product.get("discount_offer", "")).strip()
        discount = 0.0

        if not offer or offer == "No Offer":
            return 0.0

        # Percentage OFF e.g. "10% OFF", "15% OFF", "5% OFF"
        pct_match = re.search(r"(\d+)%\s*OFF", offer, re.IGNORECASE)
        if pct_match:
            pct = float(pct_match.group(1)) / 100.0
            discount = price * quantity * pct

        # Buy 1 Get 1 Free
        elif "buy 1 get 1 free" in offer.lower():
            free_units = quantity // 2
            discount = free_units * price

        # Save Rs. X e.g. "Save Rs 5"
        elif "save rs" in offer.lower():
            rs_match = re.search(r"save rs\s*(\d+)", offer, re.IGNORECASE)
            if rs_match:
                save_amount = float(rs_match.group(1))
                discount = save_amount * quantity

        # Buy 2 Get Rs 5 OFF
        elif "buy 2 get rs 5 off" in offer.lower():
            eligible = quantity // 2
            discount = eligible * 5.0

        return round(discount, 2)

    def _estimate_weight_grams(self, quantity_str, count):
        """Estimates item weight for simulated Smart Cart scale verification."""
        q_lower = str(quantity_str).lower()
        base_g = 500  # default 500g

        if "kg" in q_lower:
            m = re.search(r"(\d+(\.\d+)?)\s*kg", q_lower)
            if m:
                base_g = float(m.group(1)) * 1000
        elif "g" in q_lower:
            m = re.search(r"(\d+(\.\d+)?)\s*g", q_lower)
            if m:
                base_g = float(m.group(1))
        elif "l" in q_lower:
            m = re.search(r"(\d+(\.\d+)?)\s*l", q_lower)
            if m:
                base_g = float(m.group(1)) * 1000
        elif "ml" in q_lower:
            m = re.search(r"(\d+(\.\d+)?)\s*ml", q_lower)
            if m:
                base_g = float(m.group(1))

        return int(base_g * count)

    def get_cart_summary(self):
        """Computes comprehensive cart financials, savings, budget alerts, and weight checks."""
        item_list = []
        raw_subtotal = 0.0
        total_discount = 0.0
        total_weight_g = 0

        for p_id, data in self.items.items():
            prod = data["product"]
            qty = data["quantity"]
            unit_price = float(prod["price"])
            item_raw_total = unit_price * qty
            item_discount = self._calculate_item_discount(prod, qty)
            item_final_total = max(0.0, item_raw_total - item_discount)
            weight_g = self._estimate_weight_grams(prod.get("quantity", "500 g"), qty)

            raw_subtotal += item_raw_total
            total_discount += item_discount
            total_weight_g += weight_g

            item_list.append({
                "product_id": p_id,
                "product_name": prod["product_name"],
                "category": prod["category"],
                "brand": prod["brand"],
                "unit_price": unit_price,
                "quantity": qty,
                "unit_spec": prod["quantity"],
                "raw_total": round(item_raw_total, 2),
                "discount_offer": prod["discount_offer"],
                "discount_amount": item_discount,
                "final_total": round(item_final_total, 2),
                "aisle_number": prod["aisle_number"],
                "shelf_location": prod["shelf_location"],
                "estimated_weight_g": weight_g
            })

        subtotal_after_discount = max(0.0, raw_subtotal - total_discount)
        tax_amount = round(subtotal_after_discount * Config.TAX_RATE, 2)
        grand_total = round(subtotal_after_discount + tax_amount, 2)

        # Senior Budget Calculation & Alerting
        budget_percent = round((grand_total / self.budget) * 100, 1) if self.budget > 0 else 0
        if grand_total > self.budget:
            budget_status = "EXCEEDED"
            budget_alert = f"Budget alert: You have exceeded your Rs. {self.budget:.2f} limit by Rs. {grand_total - self.budget:.2f}."
        elif budget_percent >= 80:
            budget_status = "WARNING"
            budget_alert = f"Budget notice: You have utilized {budget_percent}% of your Rs. {self.budget:.2f} budget."
        else:
            budget_status = "COMFORTABLE"
            budget_alert = f"Shopping within budget. Rs. {self.budget - grand_total:.2f} remaining."

        return {
            "session_id": self.session_id,
            "items_count": sum(d["quantity"] for d in self.items.values()),
            "distinct_products": len(self.items),
            "items": item_list,
            "raw_subtotal": round(raw_subtotal, 2),
            "total_discount_savings": round(total_discount, 2),
            "taxable_subtotal": round(subtotal_after_discount, 2),
            "tax_amount": tax_amount,
            "tax_rate_pct": int(Config.TAX_RATE * 100),
            "grand_total": grand_total,
            "currency": Config.CURRENCY,
            "budget": self.budget,
            "budget_percent_used": budget_percent,
            "budget_status": budget_status,
            "budget_alert": budget_alert,
            "total_estimated_weight_kg": round(total_weight_g / 1000.0, 2),
            "smart_scale_verified": True,  # Simulates built-in trolley scale check
            "last_updated": self.last_updated
        }

    def checkout(self, payment_method="Senior Friendly Digital Pay / UPI"):
        """Generates digital self-checkout receipt and empties cart."""
        summary = self.get_cart_summary()
        if summary["items_count"] == 0:
            return {"success": False, "error": "Cannot checkout an empty trolley."}

        receipt_id = f"REC-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
        now = datetime.now()

        receipt = {
            "receipt_id": receipt_id,
            "store_name": Config.STORE_NAME,
            "date": now.strftime("%d %B %Y, %I:%M %p"),
            "trolley_session_id": self.session_id,
            "items": summary["items"],
            "total_items": summary["items_count"],
            "raw_subtotal": summary["raw_subtotal"],
            "total_savings": summary["total_discount_savings"],
            "tax_amount": summary["tax_amount"],
            "grand_total": summary["grand_total"],
            "payment_method": payment_method,
            "payment_status": "PAID & VERIFIED",
            "exit_qr_token": f"QR-AUTH-{receipt_id}",
            "message": "Thank you for shopping at SmartMart! Have a pleasant and safe day."
        }

        # Clear cart upon checkout
        self.clear()
        return {"success": True, "receipt": receipt}

