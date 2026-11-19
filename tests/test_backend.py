"""
Unit and Integration Tests for Smart Supermarket & Smart Trolley System using RAG.
Covers:
1. Product database initialization (60 products)
2. Product retrieval by ID
3. RAG hybrid retrieval (relevant queries)
4. Irrelevant query rejection
5. Exact SQL price comparison
6. Missing product handling
7. FAISS index rebuilding
8. API health diagnostics
9. RAG Ask endpoint
10. Smart Trolley Cart: Add item, Update quantity, Remove item
11. Smart Trolley Cart: Discount & tax calculations
12. Smart Trolley Cart: Senior citizen budget tracking & alerts
13. Smart Trolley Cart: Digital self-checkout & receipt generation
14. Store Map: Floor layout & aisle geometry retrieval
15. Store Map: Product locator & step-by-step walking directions
16. Product Catalog & Search
17. Product CRUD lifecycle
"""
import pytest
import json
from backend.app import app
from backend.database import (
    init_db,
    get_all_products,
    get_product_by_id,
    compare_products_exact
)
from backend.rag.retriever import ProductRetriever
from backend.rag.generator import AnswerGenerator
from backend.rag.build_index import build_product_index
from backend.cart import SmartTrolleyCart
from backend.store_map import get_store_map_data, locate_product_on_map

@pytest.fixture(scope="module")
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        init_db()
        yield client

# -------------------------------------------------------------
# 1. Product Database & Seed Tests
# -------------------------------------------------------------
def test_database_initialization():
    products = get_all_products(limit=100)
    assert len(products) >= 50, f"Expected at least 50 products, got {len(products)}"
    categories = {p["category"] for p in products}
    assert "Grains & Staples" in categories
    assert "Cooking Oils & Ghee" in categories
    assert "Personal Care" in categories

def test_get_product_by_id():
    prod = get_product_by_id("PRD001")
    assert prod is not None
    assert "Basmati Rice" in prod["product_name"]
    assert prod["price"] > 0
    assert "Aisle 1" in prod["aisle_number"]

# -------------------------------------------------------------
# 2. RAG Retrieval & Relevance Tests
# -------------------------------------------------------------
def test_product_retriever_relevant_query():
    retriever = ProductRetriever()
    res = retriever.retrieve("Where can I find rice?")
    assert res["is_relevant"] is True
    assert len(res["results"]) > 0
    assert any("rice" in p["product_name"].lower() for p in res["results"])

def test_product_retriever_irrelevant_query():
    retriever = ProductRetriever()
    res = retriever.retrieve("What is the distance to Mars?")
    assert res["is_relevant"] is False
    assert len(res["results"]) == 0

def test_exact_price_comparison():
    retriever = ProductRetriever()
    res = retriever.retrieve("Which rice is cheaper?")
    assert res["is_relevant"] is True
    assert res["intent"] == "price_comparison"
    prices = [p["price"] for p in res["results"]]
    assert prices == sorted(prices)

def test_missing_product_handling():
    generator = AnswerGenerator()
    dummy_retrieval = {
        "results": [],
        "is_relevant": False,
        "intent": "general"
    }
    ans = generator.generate_answer("Do you have organic dragon fruit chips?", dummy_retrieval)
    ans_lower = ans["answer"].lower()
    assert any(phrase in ans_lower for phrase in ["could not find", "do not have", "not found", "not available"])


# -------------------------------------------------------------
# 3. RAG Index Rebuilding Test
# -------------------------------------------------------------
def test_faiss_rebuild_index():
    summary = build_product_index()
    assert summary["status"] == "success"
    assert summary["total_products"] >= 50
    assert summary["dimension"] > 0

# -------------------------------------------------------------
# 4. Smart Trolley Virtual Cart & Billing Tests
# -------------------------------------------------------------
def test_smart_trolley_cart_lifecycle():
    cart = SmartTrolleyCart(budget=1000.0)
    # Add product PRD001 (Rice, Rs 115, 10% OFF)
    res = cart.add_item("PRD001", quantity=2)
    assert res["success"] is True

    summary = cart.get_cart_summary()
    assert summary["items_count"] == 2
    assert summary["raw_subtotal"] == 230.0
    assert summary["total_discount_savings"] == 23.0  # 10% of 230
    assert summary["grand_total"] > 0
    assert summary["budget_status"] == "COMFORTABLE"

    # Update quantity
    cart.update_quantity("PRD001", 1)
    summary2 = cart.get_cart_summary()
    assert summary2["items_count"] == 1

    # Remove item
    cart.remove_item("PRD001")
    summary3 = cart.get_cart_summary()
    assert summary3["items_count"] == 0

def test_smart_trolley_budget_alert():
    cart = SmartTrolleyCart(budget=100.0)
    # Add expensive item exceeding Rs 100
    cart.add_item("PRD018", quantity=1)  # Olive oil Rs 490
    summary = cart.get_cart_summary()
    assert summary["budget_status"] == "EXCEEDED"
    assert "exceeded" in summary["budget_alert"].lower()

def test_smart_trolley_digital_checkout():
    cart = SmartTrolleyCart()
    cart.add_item("PRD006", quantity=2)  # Sugar
    checkout_res = cart.checkout(payment_method="UPI / Senior FastPay")
    assert checkout_res["success"] is True
    receipt = checkout_res["receipt"]
    assert "receipt_id" in receipt
    assert receipt["total_items"] == 2
    assert receipt["payment_status"] == "PAID & VERIFIED"
    assert "exit_qr_token" in receipt

# -------------------------------------------------------------
# 5. Store Floor Map & Navigation Tests
# -------------------------------------------------------------
def test_store_map_data():
    map_data = get_store_map_data()
    assert len(map_data["aisles"]) == 6
    assert len(map_data["landmarks"]) >= 3
    assert any(a["aisle_number"] == "Aisle 1" for a in map_data["aisles"])

def test_locate_product_navigation():
    loc = locate_product_on_map("PRD001")  # Daawat Basmati Rice in Aisle 1
    assert loc["found"] is True
    assert loc["aisle_number"] == "Aisle 1"
    assert "map_coordinates" in loc
    assert len(loc["walking_directions"]) > 0

# -------------------------------------------------------------
# 6. REST API Endpoint Tests
# -------------------------------------------------------------
def test_api_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert data["faiss_index_loaded"] is True

def test_api_ask_endpoint(client):
    res = client.post("/api/ask", json={"query": "Where can I find rice?"})
    assert res.status_code == 200
    data = res.get_json()
    assert "rice" in data["answer"].lower()
    assert len(data["grounded_sources"]) > 0

def test_api_cart_endpoints(client):
    # Add to cart via API
    add_res = client.post("/api/cart/add", json={"product_id": "PRD006", "quantity": 1})
    assert add_res.status_code == 200
    assert add_res.get_json()["cart"]["items_count"] >= 1

    # Get cart
    get_res = client.get("/api/cart")
    assert get_res.status_code == 200
    assert get_res.get_json()["grand_total"] > 0

    # Set budget
    bud_res = client.post("/api/cart/set-budget", json={"budget": 1500.0})
    assert bud_res.status_code == 200
    assert bud_res.get_json()["budget"] == 1500.0

    # Checkout
    chk_res = client.post("/api/cart/checkout", json={"payment_method": "Senior Assist Pay"})
    assert chk_res.status_code == 200
    assert chk_res.get_json()["success"] is True

def test_api_store_map_endpoints(client):
    map_res = client.get("/api/map")
    assert map_res.status_code == 200
    assert len(map_res.get_json()["aisles"]) == 6

    loc_res = client.get("/api/map/locate/PRD003")
    assert loc_res.status_code == 200
    assert loc_res.get_json()["found"] is True

def test_api_product_crud_lifecycle(client):
    test_id = "PRD_TEST_101"
    new_prod = {
        "product_id": test_id,
        "product_name": "Test Roasted Makhana",
        "category": "Snacks & Biscuits",
        "brand": "SmartSnack",
        "price": 99.0,
        "quantity": "200 g",
        "product_description": "Crunchy roasted foxnuts with pink salt.",
        "availability": "In Stock",
        "discount_offer": "10% OFF",
        "aisle_number": "Aisle 3",
        "shelf_location": "Shelf B1"
    }
    res = client.post("/api/products", json=new_prod)
    assert res.status_code == 201

    upd = client.put(f"/api/products/{test_id}", json={"price": 105.0})
    assert upd.status_code == 200
    assert upd.get_json()["product"]["price"] == 105.0

    del_res = client.delete(f"/api/products/{test_id}")
    assert del_res.status_code == 200

# -------------------------------------------------------------
# 7. Unique RAG Feature Tests
# -------------------------------------------------------------
def test_rag_recipe_bundle_endpoints(client):
    """Test Multi-Hop RAG cross-department recipe bundler."""
    list_res = client.get("/api/rag/recipes")
    assert list_res.status_code == 200
    recipes = list_res.get_json()["recipes"]
    assert len(recipes) >= 20
    recipe_ids = [r["id"] for r in recipes]
    assert "biryani" in recipe_ids
    assert "chicken_biryani" in recipe_ids
    assert "sambar" in recipe_ids
    assert "rava_kesari" in recipe_ids
    assert "senior_breakfast" in recipe_ids

    # Query bundle
    bundle_res = client.post("/api/rag/recipe-bundle", json={"recipe_key": "biryani"})
    assert bundle_res.status_code == 200
    bundle = bundle_res.get_json()
    assert bundle["success"] is True
    assert "Biryani" in bundle["recipe_title"]
    assert len(bundle["items"]) >= 10
    assert bundle["bundle_price"] > 0
    assert len(bundle["optimal_walking_itinerary"]) > 0

    # Query by bundle ID (RB002 - Chicken Biryani)
    chicken_res = client.post("/api/rag/recipe-bundle", json={"recipe_key": "RB002"})
    assert chicken_res.status_code == 200
    c_bundle = chicken_res.get_json()
    assert c_bundle["success"] is True
    assert "Chicken Biryani" in c_bundle["recipe_title"]
    assert len(c_bundle["items"]) == 18

    # Query 20 Bundles Dataset endpoint
    dataset_res = client.get("/api/rag/recipe-bundles-dataset")
    assert dataset_res.status_code == 200
    ds_data = dataset_res.get_json()
    assert ds_data["success"] is True
    assert ds_data["bundles_count"] >= 20
    assert ds_data["total_records"] > 200

def test_rag_serving_adjusted_portions_and_100g_scaling(client):
    """Test dynamic serving scaling, 100g adjustments for 500g bulk packs, and budget reduction."""
    # Test 4 servings portion budget for Vegetable Biryani (RB001)
    res_4 = client.post("/api/rag/recipe-bundle", json={
        "recipe_key": "biryani",
        "servings": 4,
        "pricing_mode": "portion"
    })
    assert res_4.status_code == 200
    data_4 = res_4.get_json()
    assert data_4["servings"] == 4
    assert data_4["pricing_mode"] == "portion"
    assert data_4["bundle_price"] < 250.0  # Reduced significantly from ~₹818 down to ~₹166
    assert data_4["cost_per_serving"] > 0
    assert data_4["budget_saved_vs_retail"] > 500.0

    # Verify 100g adjustment on Carrot (PRD046: 500 g @ ₹45.00 -> 100g @ ₹9.00)
    carrot_item = next((it for it in data_4["items"] if it["product_id"] == "PRD046"), None)
    assert carrot_item is not None
    assert carrot_item["is_portion_adjusted"] is True
    assert "500" in carrot_item["store_package_qty"]
    assert carrot_item["portion_qty"] == "100g"
    assert carrot_item["portion_price"] == 9.0
    assert carrot_item["price"] == 9.0

    # Test scaling to 2 servings
    res_2 = client.post("/api/rag/recipe-bundle", json={
        "recipe_key": "biryani",
        "servings": 2,
        "pricing_mode": "portion"
    })
    assert res_2.status_code == 200
    data_2 = res_2.get_json()
    assert data_2["servings"] == 2
    assert data_2["bundle_price"] < data_4["bundle_price"]

    # Test retail packaging mode
    res_retail = client.post("/api/rag/recipe-bundle", json={
        "recipe_key": "biryani",
        "servings": 4,
        "pricing_mode": "retail"
    })
    assert res_retail.status_code == 200
    data_retail = res_retail.get_json()
    assert data_retail["pricing_mode"] == "retail"
    assert data_retail["bundle_price"] > 600.0

def test_rag_shopping_route_optimizer(client):
    """Test Spatial RAG shopping list to sequential in-store walking path."""
    res = client.post(
        "/api/rag/route-optimizer",
        json={"shopping_list": "basmati rice, sunflower oil, colgate toothpaste, apple"}
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["total_items_found"] >= 3
    assert data["estimated_total_cost"] > 0
    assert len(data["itinerary"]) >= 3

    # Check that aisle sequence is monotonically non-decreasing
    aisle_numbers = [p["aisle_number"] for p in data["resolved_products"]]
    aisle_ints = [int(a.replace("Aisle ", "")) for a in aisle_numbers if "Aisle" in a]
    assert aisle_ints == sorted(aisle_ints), "Products must be sequenced by store aisle traversal order"

def test_rag_cart_health_deals_inspector(client):
    """Test Autonomous Cart Health & Deals Inspector."""
    # Reset cart and add Sugar + Whole Milk
    client.post("/api/cart/checkout", json={"payment_method": "Reset"})
    client.post("/api/cart/add", json={"product_id": "PRD006", "quantity": 1})  # White Sugar
    client.post("/api/cart/add", json={"product_id": "PRD020", "quantity": 1})  # Amul Taaza Toned Milk

    # Test Diabetic Audit
    dia_res = client.post("/api/rag/inspect-cart", json={"health_profile": "diabetic"})
    assert dia_res.status_code == 200
    dia_data = dia_res.get_json()
    assert dia_data["success"] is True
    assert len(dia_data["warnings"]) > 0
    assert any("sugar" in w.lower() or "glycemic" in w.lower() for w in dia_data["warnings"])
    assert len(dia_data["healthy_swaps"]) > 0

    # Test Lactose Intolerant Audit
    lac_res = client.post("/api/rag/inspect-cart", json={"health_profile": "lactose_intolerant"})
    assert lac_res.status_code == 200
    lac_data = lac_res.get_json()
    assert lac_data["success"] is True
    assert any("dairy" in w.lower() or "lactose" in w.lower() for w in lac_data["warnings"])

