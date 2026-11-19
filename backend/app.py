"""
Flask REST API for Smart Supermarket & Smart Trolley System using RAG.
Provides software endpoints for RAG-driven Shopping Assistant, Virtual Smart Cart,
Live Digital Billing, In-Store Aisle Navigation, and Supermarket Admin Hub.
"""
import io
import time
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS

from backend.config import Config, PROJECT_ROOT
from backend.database import (
    init_db,
    get_all_products,
    get_product_by_id,
    search_products_sql,
    add_product,
    update_product,
    delete_product
)
from backend.rag.build_index import build_product_index
from backend.rag.retriever import ProductRetriever
from backend.rag.generator import AnswerGenerator
from backend.rag.recipe_bundle import RecipeBundlePlanner
from backend.rag.shopping_route import ShoppingRouteOptimizer
from backend.rag.cart_inspector import CartHealthInspector
from backend.cart import SmartTrolleyCart

from backend.store_map import get_store_map_data, locate_product_on_map
from backend.voice.speech_to_text import SpeechToTextService
from backend.voice.text_to_speech import TextToSpeechService

# Initialize Flask Application
app = Flask(__name__)
CORS(app)

# Initialize Database and RAG Subsystems
print("[App] Initializing Supermarket database...")
init_db()

print("[App] Initializing RAG Retriever & Grounded Generator...")
retriever = ProductRetriever()
generator = AnswerGenerator()
recipe_planner = RecipeBundlePlanner()
route_optimizer = ShoppingRouteOptimizer()
cart_inspector = CartHealthInspector()

# Active Smart Trolley Cart instance

trolley_cart = SmartTrolleyCart()

# Voice services
stt_service = SpeechToTextService()
tts_service = TextToSpeechService()

# ----------------------------------------------------------------------
# 1. System Health & Diagnostics
# ----------------------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health_check():
    """Returns backend status, RAG index metrics, and store configuration."""
    return jsonify({
        "status": "healthy",
        "service": "Smart Supermarket & Smart Trolley System using RAG",
        "version": "2.0.0",
        "timestamp": time.time(),
        "store_name": Config.STORE_NAME,
        "database": "sqlite_ready",
        "faiss_index_loaded": retriever.index is not None,
        "total_indexed_vectors": retriever.index.ntotal if retriever.index else 0,
        "llm_mode": "nexus_api" if bool(Config.NEXUS_API_KEY) else "grounded_demo_fallback",
        "llm_model": Config.NEXUS_MODEL,
        "smart_trolley_session": trolley_cart.session_id
    }), 200

# ----------------------------------------------------------------------
# 2. RAG Shopping Assistant Endpoints
# ----------------------------------------------------------------------
@app.route("/api/ask", methods=["POST"])
def ask_question():
    """
    RAG Assistant Query Endpoint:
    Accepts customer question, retrieves grounded products via FAISS & SQL,
    and returns natural language answer with cited evidence and aisle locations.
    """
    data = request.get_json(silent=True) or {}
    query = data.get("query", "").strip()

    if not query:
        return jsonify({
            "error": "Query cannot be empty.",
            "answer": "Please ask a question about our supermarket products.",
            "grounded_sources": []
        }), 400

    try:
        # Step 1: Hybrid Retrieval (FAISS Vector Similarity + SQL Exact Filter)
        retrieval_res = retriever.retrieve(query)

        # Step 2: Answer Generation (Nexus LLM or Grounded Fallback)
        generation_res = generator.generate_answer(query, retrieval_res)

        return jsonify({
            "query": query,
            "answer": generation_res["answer"],
            "mode": generation_res["mode"],
            "model": generation_res["model"],
            "is_relevant": retrieval_res["is_relevant"],
            "intent": retrieval_res["intent"],
            "search_type": retrieval_res["search_type"],
            "grounded_sources": generation_res["grounded_sources"]
        }), 200

    except Exception as e:
        print(f"[API] Error during /api/ask: {e}")
        return jsonify({
            "error": "Internal RAG processing error.",
            "details": str(e),
            "answer": "I encountered an error retrieving product information. Please ask a store assistant.",
            "grounded_sources": []
        }), 500

@app.route("/api/rag/rebuild-index", methods=["POST"])
def rebuild_index():
    """Rebuilds the FAISS vector index from SQLite database."""
    try:
        summary = build_product_index()
        retriever.reload()
        return jsonify({
            "message": "FAISS vector index rebuilt successfully.",
            "summary": summary
        }), 200
    except Exception as e:
        return jsonify({
            "error": "Failed to rebuild FAISS index.",
            "details": str(e)
        }), 500

@app.route("/api/rag/recipes", methods=["GET"])
def list_recipes():
    """Returns available smart meal and recipe bundles."""
    return jsonify({
        "recipes": recipe_planner.get_available_recipes()
    }), 200

@app.route("/api/rag/recipe-bundle", methods=["POST"])
def get_recipe_bundle():
    """
    RAG Recipe Bundle Planner:
    Finds all required ingredients for a dish across supermarket aisles,
    computes serving-adjusted portions (e.g. 100g instead of 500g),
    calculates bundle budget price, and sequential walking itinerary.
    """
    data = request.get_json(silent=True) or {}
    recipe_key = data.get("recipe_key") or data.get("recipe_name", "biryani")
    servings = data.get("servings")
    pricing_mode = data.get("pricing_mode", "portion")
    bundle = recipe_planner.generate_bundle(recipe_key, servings=servings, pricing_mode=pricing_mode)
    bundle["success"] = True
    return jsonify(bundle), 200

@app.route("/api/rag/recipe-bundles-dataset", methods=["GET"])
def get_recipe_bundles_dataset():
    """
    Returns complete tabular and JSON dataset for all 20 recipe bundles
    with product IDs, names, quantities, amounts, and category mappings.
    """
    dataset = recipe_planner.get_all_bundles_dataset()
    return jsonify({
        "total_records": len(dataset),
        "bundles_count": len(recipe_planner.get_available_recipes()),
        "dataset": dataset,
        "success": True
    }), 200

@app.route("/api/rag/route-optimizer", methods=["POST"])
def optimize_route():
    """
    RAG Shopping List & Path Optimizer:
    Converts unstructured grocery list to resolved products and forward walking route.
    """
    data = request.get_json(silent=True) or {}
    shopping_list = data.get("shopping_list", "")
    result = route_optimizer.parse_and_optimize(shopping_list)
    if not result.get("success", True):
        return jsonify(result), 400
    return jsonify(result), 200

@app.route("/api/rag/inspect-cart", methods=["POST"])
def inspect_cart():
    """
    RAG Autonomous Cart Health & Savings Inspector:
    Audits items in smart trolley against health constraints (Diabetic, Heart, Lactose).
    """
    data = request.get_json(silent=True) or {}
    health_profile = data.get("health_profile", "general")
    cart_summary = trolley_cart.get_cart_summary()
    inspection = cart_inspector.inspect(cart_summary["items"], health_profile=health_profile)
    inspection["success"] = True
    return jsonify(inspection), 200


# ----------------------------------------------------------------------
# 3. Smart Trolley Virtual Cart & Billing Endpoints
# ----------------------------------------------------------------------
@app.route("/api/cart", methods=["GET"])
def get_cart():
    """Returns current items in smart trolley, tax, discounts, and budget status."""
    return jsonify(trolley_cart.get_cart_summary()), 200

@app.route("/api/cart/add", methods=["POST"])
def add_to_cart():
    """
    Adds item to smart trolley by product_id (simulates barcode scan or quick-add).
    Payload: {"product_id": "PRD001", "quantity": 1}
    """
    data = request.get_json(silent=True) or {}
    product_id = data.get("product_id")
    quantity = int(data.get("quantity", 1))

    if not product_id:
        return jsonify({"error": "product_id is required"}), 400

    result = trolley_cart.add_item(product_id, quantity)
    if not result["success"]:
        return jsonify(result), 400

    return jsonify({
        "message": f"Added item to Smart Trolley.",
        "cart": result["cart"]
    }), 200

@app.route("/api/cart/item/<product_id>", methods=["PUT"])
def update_cart_item(product_id):
    """Updates quantity of an item in the trolley."""
    data = request.get_json(silent=True) or {}
    quantity = int(data.get("quantity", 1))
    result = trolley_cart.update_quantity(product_id, quantity)
    if not result["success"]:
        return jsonify(result), 400
    return jsonify(result), 200

@app.route("/api/cart/item/<product_id>", methods=["DELETE"])
def remove_from_cart(product_id):
    """Removes an item from the smart trolley."""
    result = trolley_cart.remove_item(product_id)
    if not result["success"]:
        return jsonify(result), 404
    return jsonify(result), 200

@app.route("/api/cart/clear", methods=["DELETE"])
def clear_cart():
    """Empties the smart trolley."""
    result = trolley_cart.clear()
    return jsonify(result), 200

@app.route("/api/cart/set-budget", methods=["POST"])
def set_cart_budget():
    """Sets senior citizen shopping budget target."""
    data = request.get_json(silent=True) or {}
    budget = float(data.get("budget", 2000.0))
    result = trolley_cart.set_budget(budget)
    return jsonify(result), 200

@app.route("/api/cart/checkout", methods=["POST"])
def checkout_cart():
    """Completes self-checkout and generates digital receipt."""
    data = request.get_json(silent=True) or {}
    payment_method = data.get("payment_method", "Senior Digital Express Pay")
    result = trolley_cart.checkout(payment_method=payment_method)
    if not result["success"]:
        return jsonify(result), 400
    return jsonify(result), 200

# ----------------------------------------------------------------------
# 4. Store Floor Map & In-Store Aisle Navigation Endpoints
# ----------------------------------------------------------------------
@app.route("/api/map", methods=["GET"])
def get_store_map():
    """Returns supermarket layout, aisles, landmarks, and coordinate grid."""
    return jsonify(get_store_map_data()), 200

@app.route("/api/map/locate/<product_id>", methods=["GET"])
def locate_product(product_id):
    """Returns map coordinates and walking directions for a specific product."""
    result = locate_product_on_map(product_id)
    if not result["found"]:
        return jsonify(result), 404
    return jsonify(result), 200

# ----------------------------------------------------------------------
# 5. Product Catalog & Inventory Endpoints
# ----------------------------------------------------------------------
@app.route("/api/products", methods=["GET"])
def list_products():
    """List products with pagination."""
    limit = int(request.args.get("limit", 100))
    offset = int(request.args.get("offset", 0))
    products = get_all_products(limit=limit, offset=offset)
    return jsonify({
        "total": len(products),
        "products": products
    }), 200

@app.route("/api/products/search", methods=["GET"])
def search_products():
    """Search products by keyword, category, or aisle."""
    q = request.args.get("q")
    category = request.args.get("category")
    aisle = request.args.get("aisle")
    availability = request.args.get("availability")

    results = search_products_sql(query=q, category=category, aisle=aisle, availability=availability)
    return jsonify({
        "count": len(results),
        "results": results
    }), 200

@app.route("/api/products/<product_id>", methods=["GET"])
def get_product(product_id):
    """Retrieve single product by ID."""
    prod = get_product_by_id(product_id)
    if not prod:
        return jsonify({"error": f"Product with ID '{product_id}' not found."}), 404
    return jsonify(prod), 200

@app.route("/api/products", methods=["POST"])
def create_product():
    """Add a new product to SQLite and auto-update FAISS index."""
    data = request.get_json(silent=True) or {}
    required = ["product_name", "category", "price", "aisle_number", "shelf_location"]
    missing = [f for f in required if f not in data or not str(data[f]).strip()]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    try:
        new_prod = add_product(data)
        try:
            build_product_index()
            retriever.reload()
        except Exception as idx_err:
            print(f"[API] Warning rebuilding index after add: {idx_err}")

        return jsonify({
            "message": "Product added successfully.",
            "product": new_prod
        }), 201
    except Exception as e:
        return jsonify({"error": "Failed to add product.", "details": str(e)}), 500

@app.route("/api/products/<product_id>", methods=["PUT"])
def edit_product(product_id):
    """Update existing product details and rebuild index."""
    data = request.get_json(silent=True) or {}
    existing = get_product_by_id(product_id)
    if not existing:
        return jsonify({"error": f"Product '{product_id}' not found."}), 404

    try:
        updated = update_product(product_id, data)
        try:
            build_product_index()
            retriever.reload()
        except Exception as idx_err:
            print(f"[API] Warning rebuilding index after update: {idx_err}")

        return jsonify({
            "message": "Product updated successfully.",
            "product": updated
        }), 200
    except Exception as e:
        return jsonify({"error": "Failed to update product.", "details": str(e)}), 500

@app.route("/api/products/<product_id>", methods=["DELETE"])
def remove_product(product_id):
    """Delete a product from database."""
    existing = get_product_by_id(product_id)
    if not existing:
        return jsonify({"error": f"Product '{product_id}' not found."}), 404

    delete_product(product_id)
    try:
        build_product_index()
        retriever.reload()
    except Exception as idx_err:
        print(f"[API] Warning rebuilding index after delete: {idx_err}")

    return jsonify({"message": f"Product '{product_id}' deleted successfully."}), 200

# ----------------------------------------------------------------------
# 6. Voice Assistant Config & Audio Fallback
# ----------------------------------------------------------------------
@app.route("/api/voice/config", methods=["GET"])
def voice_config():
    """Returns recommended TTS speech parameters for senior citizens."""
    lang = request.args.get("lang", "en")
    return jsonify(tts_service.get_speech_config(language=lang)), 200

@app.route("/api/voice/speak", methods=["GET", "POST"])
def voice_speak():
    """
    Streams synthesized speech audio (MP3).
    Supports crystal-clear native Tamil (ta) and English (en) with senior-friendly cadence.
    """
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        text = data.get("text", "")
        lang = data.get("lang", "auto")
    else:
        text = request.args.get("text", "")
        lang = request.args.get("lang", "auto")

    if not text.strip():
        return jsonify({"error": "No text provided for speech synthesis."}), 400

    try:
        audio_stream = tts_service.synthesize_audio(text, lang=lang)
        return send_file(
            audio_stream,
            mimetype="audio/mpeg",
            as_attachment=False,
            download_name="speech.mp3"
        )
    except Exception as e:
        print(f"[API] TTS synthesis error: {e}")
        return jsonify({"error": "Failed to synthesize speech audio.", "details": str(e)}), 500

@app.route("/api/voice/transcribe", methods=["POST"])
def voice_transcribe():
    """Backend STT fallback endpoint."""
    data = request.get_json(silent=True) or {}
    lang = data.get("language", "en-IN")
    result = stt_service.transcribe_audio_payload(audio_bytes=b"sample", language=lang)
    return jsonify(result), 200

# ----------------------------------------------------------------------
# 7. Frontend Static Files Serving (Dual-Mode)
# ----------------------------------------------------------------------
DIST_DIR = PROJECT_ROOT / "frontend" / "dist"

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    """Serves compiled React frontend if frontend/dist exists."""
    if path != "" and (DIST_DIR / path).exists():
        return send_from_directory(str(DIST_DIR), path)
    if (DIST_DIR / "index.html").exists():
        return send_from_directory(str(DIST_DIR), "index.html")
    return jsonify({
        "message": "Smart Supermarket & Smart Trolley Backend API is active.",
        "frontend": "Run 'npm run dev' inside 'frontend' folder or build with 'npm run build'."
    }), 200

# ----------------------------------------------------------------------
# Entry Point
# ----------------------------------------------------------------------
if __name__ == "__main__":
    print(f"Starting Smart Supermarket RAG & Smart Trolley System on http://{Config.HOST}:{Config.PORT}")
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
