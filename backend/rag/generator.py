"""
Generator module for Smart Supermarket & Smart Trolley RAG Assistant.
Constructs grounded responses for product searches, price comparisons, recipe ingredients,
senior dietary guidance, and in-store aisle navigation.
Strict zero-hallucination policy with verified database evidence.
"""
import os
import re
import json
import requests
from backend.config import Config

SYSTEM_PROMPT = """You are an AI Shopping Assistant for a modern Smart Supermarket with a Smart Trolley designed to assist senior citizens and shoppers.
Your principles:
1. Speak in a warm, polite, clear, and easy-to-understand tone suitable for senior citizens.
2. STRICT RULE: Rely ONLY on the provided Supermarket Knowledge Base context below.
3. NEVER invent or hallucinate product prices, discounts, availability, aisle numbers, or shelf locations.
4. If a product is out of stock or not present in the provided context, state that clearly and politely.
5. When comparing products or prices, state the exact prices in Rupees (Rs.) and highlight which is more economical.
6. Always mention the exact Aisle number and Shelf location so the shopper can easily locate items.
7. Language Rule: Respond in the exact same language as the user's question. If the user asks in English, reply in clear, polite English. If the user asks in Tamil or asks for Tamil, reply in clear Tamil with aisle details.

"""

def contains_tamil(text):
    """Checks if text contains Tamil Unicode characters."""
    return any(0x0B80 <= ord(char) <= 0x0BFF for char in text)

class AnswerGenerator:
    def __init__(self):
        self.api_key = Config.NEXUS_API_KEY
        self.base_url = Config.NEXUS_BASE_URL.rstrip("/")
        self.model = Config.NEXUS_MODEL

    def _build_context_text(self, products):
        """Builds a structured fact string from retrieved products."""
        if not products:
            return "No matching products found in the database."

        context_lines = []
        for i, p in enumerate(products, 1):
            line = (
                f"{i}. Product ID: {p.get('product_id')} | Name: {p.get('product_name')} | "
                f"Brand: {p.get('brand')} | Category: {p.get('category')} | "
                f"Price: Rs. {p.get('price'):.2f} ({p.get('quantity')}) | "
                f"Location: {p.get('aisle_number')}, {p.get('shelf_location')} | "
                f"Stock Status: {p.get('availability')} | "
                f"Offer: {p.get('discount_offer')} | "
                f"Description: {p.get('product_description')}"
            )
            context_lines.append(line)
        return "\n".join(context_lines)

    def _generate_fallback_answer(self, query, products, is_relevant, intent):
        """
        Grounded, deterministic fallback answer generator when LLM API is unavailable.
        Zero hallucination: uses exact retrieved product records.
        """
        is_tamil = contains_tamil(query) or "tamil" in query.lower()

        if not is_relevant or not products:
            if is_tamil:
                return (
                    "மன்னிக்கவும், எங்கள் பல்பொருள் அங்காடி தரவுத்தளத்தில் நீங்கள் கேட்ட பொருள் கிடைக்கவில்லை. "
                    "தயவுசெய்து ஊழியர்களை அணுகவும் அல்லது வேறு பொருளைத் தேடவும்."
                )
            return (
                "I apologize, but I could not find any matching products in our supermarket database. "
                "Please verify the product name or check our Customer Service desk for assistance."
            )

        q_lower = query.lower()

        # 1. Offers & Deals query
        if intent == "active_offers" or "offer" in q_lower or "discount" in q_lower or "deal" in q_lower or "சலுகை" in q_lower or "தள்ளுபடி" in q_lower:
            if is_tamil:
                offers_list = "\n".join([
                    f"- **{p['product_name']}**: {p['discount_offer']} (விலை: **ரூ. {p['price']:.2f}**, **{p['aisle_number']}**)"
                    for p in products[:5]
                ])
                return f"இன்றைய சிறப்பான சலுகைகள் மற்றும் தள்ளுபடிகள்:\n{offers_list}\n\nஇவற்றை உங்கள் ஸ்மார்ட் டிராலியில் நேரடியாகச் சேர்க்கலாம்!"

            offers_list = "\n".join([
                f"- **{p['product_name']}**: {p['discount_offer']} (Now **Rs. {p['price']:.2f}** at **{p['aisle_number']}**)"
                for p in products[:5]
            ])
            return f"Here are today's featured supermarket discounts and offers:\n{offers_list}\n\nYou can add any of these directly to your Smart Trolley!"

        # 2. Price comparison
        if intent == "price_comparison" or any(w in q_lower for w in ["cheap", "cheaper", "cheapest", "compare", "difference", "விலை குறைவு", "குறைந்த விலை"]):
            sorted_prods = sorted(products, key=lambda x: x["price"])
            cheapest = sorted_prods[0]
            
            if is_tamil:
                details = f"மிகவும் குறைந்த விலையுடையது: **{cheapest['product_name']}** (விலை: ரூ. {cheapest['price']:.2f}, {cheapest['quantity']}). இது **{cheapest['aisle_number']}**, {cheapest['shelf_location']}-ல் உள்ளது."
                other_opts = ", ".join([f"{p['product_name']} - ரூ. {p['price']:.2f}" for p in sorted_prods[1:3]])
                return f"{details}\nபிற விருப்பங்கள்: {other_opts}."

            comparison_summary = (
                f"The most economical option is **{cheapest['product_name']}** priced at **Rs. {cheapest['price']:.2f}** "
                f"for {cheapest['quantity']} (Located at **{cheapest['aisle_number']}**, {cheapest['shelf_location']})."
            )
            if len(sorted_prods) > 1:
                other_items = "\n".join([
                    f"- **{p['product_name']}**: Rs. {p['price']:.2f} ({p['quantity']}) at {p['aisle_number']}, {p['shelf_location']}"
                    for p in sorted_prods[1:4]
                ])
                comparison_summary += f"\n\nOther available options for comparison:\n{other_items}"
            
            return comparison_summary

        # 3. Location / Aisle query
        if "where" in q_lower or "aisle" in q_lower or "find" in q_lower or "locate" in q_lower or intent == "aisle_lookup" or "எங்கே" in q_lower or "எங்கு" in q_lower:
            p = products[0]
            if is_tamil:
                return (
                    f"**{p['product_name']}** **{p['aisle_number']}**, {p['shelf_location']}-ல் உள்ளது. "
                    f"விலை: ரூ. {p['price']:.2f} ({p['quantity']}). இருப்பு நிலை: {p['availability']}."
                )
            
            ans = f"You can find **{p['product_name']}** in **{p['aisle_number']}**, on **{p['shelf_location']}**."
            ans += f" The current price is **Rs. {p['price']:.2f}** for {p['quantity']}."
            
            if p.get("discount_offer") and p["discount_offer"] != "No Offer":
                ans += f" Special deal: **{p['discount_offer']}**!"
            
            if len(products) > 1:
                ans += f"\n\nWe also have **{products[1]['product_name']}** located in **{products[1]['aisle_number']}** at Rs. {products[1]['price']:.2f}."
            
            ans += "\n\n💡 *Tip: Click '📍 Locate on Map' to see the exact walking route on the store floor plan!*"
            return ans

        # 4. Availability check
        if "available" in q_lower or "is there" in q_lower or "in stock" in q_lower or "இருக்கா" in q_lower or "உள்ளதா" in q_lower or "கிடைக்குமா" in q_lower:
            p = products[0]
            status = p["availability"]
            if is_tamil:
                tamil_status = "இருப்பில் உள்ளது" if status == "In Stock" else "குறைந்த அளவே உள்ளது" if status == "Low Stock" else "தற்போது இருப்பு இல்லை"
                return (
                    f"ஆம், **{p['product_name']}** தற்போது **{tamil_status}**. "
                    f"இது **{p['aisle_number']}**, {p['shelf_location']}-ல் உள்ளது. "
                    f"விலை: ரூ. {p['price']:.2f} ({p['quantity']}). சலுகை: {p['discount_offer']}."
                )

            if status == "In Stock":
                status_text = f"Yes, **{p['product_name']}** is currently **In Stock**"
            elif status == "Low Stock":
                status_text = f"Yes, **{p['product_name']}** is available, but currently running on **Low Stock**"
            else:
                status_text = f"Sorry, **{p['product_name']}** is currently **Out of Stock**"

            return (
                f"{status_text} in **{p['aisle_number']}**, {p['shelf_location']}. "
                f"Price: Rs. {p['price']:.2f} for {p['quantity']}. Offer: {p['discount_offer']}."
            )

        # 5. General Inquiry
        top = products[0]
        if is_tamil:
            return (
                f"**{top['product_name']}** ({top['brand']}) **{top['aisle_number']}** ({top['shelf_location']})-ல் உள்ளது. "
                f"விலை: **ரூ. {top['price']:.2f}** ({top['quantity']}). "
                f"இருப்பு நிலை: {top['availability']}. "
                f"சலுகை: {top['discount_offer']}."
            )

        return (
            f"**{top['product_name']}** by {top['brand']} is available in **{top['aisle_number']}** ({top['shelf_location']}). "
            f"Price: **Rs. {top['price']:.2f}** for {top['quantity']}. "
            f"Stock status: {top['availability']}. "
            f"Offer: {top['discount_offer']}."
        )

    def generate_answer(self, query, retrieval_result):
        """
        Coordinates generating response using Nexus LLM or Grounded Demo fallback.
        """
        products = retrieval_result.get("results", [])
        is_relevant = retrieval_result.get("is_relevant", False)
        intent = retrieval_result.get("intent", "general")
        context_text = self._build_context_text(products)

        # Try Live LLM if API Key and Base URL are configured
        if self.api_key and self.base_url:
            base = self.base_url.rstrip("/")
            if not base.endswith("/v1"):
                base = f"{base}/v1"
            endpoint = f"{base}/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            tamil_instruction = ""
            if contains_tamil(query) or "tamil" in query.lower():
                tamil_instruction = "\n\nCRITICAL INSTRUCTION: The customer asked in Tamil. You MUST answer entirely in clear, polite Tamil (தமிழ்) with exact aisle numbers and prices in Rupees (ரூ.)."

            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": f"Supermarket Knowledge Base Context:\n{context_text}\n\nCustomer Question: {query}{tamil_instruction}"
                    }
                ],
                "temperature": 0.2,
                "max_tokens": 600
            }


            try:
                response = requests.post(endpoint, headers=headers, json=payload, timeout=15)
                if response.status_code == 200:

                    data = response.json()
                    answer_text = data["choices"][0]["message"]["content"].strip()
                    return {
                        "answer": answer_text,
                        "mode": "nexus_llm",
                        "model": self.model,
                        "grounded_sources": products,
                        "is_relevant": is_relevant
                    }
                else:
                    print(f"[Generator] Nexus API returned status {response.status_code}: {response.text}")
            except Exception as e:
                print(f"[Generator] Nexus API call failed ({e}). Proceeding with verified fallback.")

        # Grounded Fallback Demo Mode (Zero Hallucination)
        fallback_answer = self._generate_fallback_answer(query, products, is_relevant, intent)
        return {
            "answer": fallback_answer,
            "mode": "demo_fallback",
            "model": "Grounded-Heuristic-Engine (Verified Database Context)",
            "grounded_sources": products,
            "is_relevant": is_relevant
        }
