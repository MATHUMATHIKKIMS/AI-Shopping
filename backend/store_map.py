"""
Supermarket Interactive Store Map & In-Store Aisle Navigation Module.
Provides aisle layout geometry, department landmarks, product shelf coordinates,
and step-by-step indoor walking directions for elderly shoppers.
"""
from backend.database import get_product_by_id

# Supermarket Floor Layout Definition
STORE_LAYOUT = {
    "store_name": "SmartMart Supermarket",
    "dimensions": {"width": 800, "height": 550},
    "landmarks": [
        {"id": "ENTRANCE", "name": "Store Entrance / Trolley Bay", "x": 400, "y": 510, "icon": "🚪"},
        {"id": "CHECKOUT", "name": "Express Digital Self-Checkout", "x": 150, "y": 510, "icon": "💳"},
        {"id": "HELP_DESK", "name": "Senior Assistance & Help Desk", "x": 650, "y": 510, "icon": "🦽"},
        {"id": "REST_AREA", "name": "Senior Rest & Seating Area", "x": 400, "y": 275, "icon": "🪑"}
    ],
    "aisles": [
        {
            "aisle_number": "Aisle 1",
            "name": "Grains, Flours & Sweeteners",
            "category": "Grains & Staples",
            "bounds": {"x": 100, "y": 100, "w": 180, "h": 70},
            "color": "#e0e7ff",
            "borderColor": "#6366f1",
            "shelves": ["Shelf A1", "Shelf A2", "Shelf A3", "Shelf B1", "Shelf B2", "Shelf C1", "Shelf C2", "Shelf C3"]
        },
        {
            "aisle_number": "Aisle 2",
            "name": "Cooking Oils, Ghee & Dairy",
            "category": "Cooking Oils & Ghee, Dairy & Eggs",
            "bounds": {"x": 310, "y": 100, "w": 180, "h": 70},
            "color": "#fef3c7",
            "borderColor": "#f59e0b",
            "shelves": ["Shelf A1", "Shelf A2", "Shelf A3", "Shelf B1", "Shelf B2", "Shelf C1", "Shelf D1", "Shelf D2", "Shelf D3", "Shelf D4"]
        },
        {
            "aisle_number": "Aisle 3",
            "name": "Snacks, Biscuits & Cookies",
            "category": "Snacks & Biscuits",
            "bounds": {"x": 520, "y": 100, "w": 180, "h": 70},
            "color": "#fce7f3",
            "borderColor": "#ec4899",
            "shelves": ["Shelf A1", "Shelf A2", "Shelf A3", "Shelf B1", "Shelf B2"]
        },
        {
            "aisle_number": "Aisle 4",
            "name": "Personal Care, Soaps & Shampoos",
            "category": "Personal Care",
            "bounds": {"x": 100, "y": 350, "w": 180, "h": 70},
            "color": "#ccfbf1",
            "borderColor": "#14b8a6",
            "shelves": ["Shelf A1", "Shelf A2", "Shelf B1", "Shelf B2", "Shelf C1"]
        },
        {
            "aisle_number": "Aisle 5",
            "name": "Fresh Fruits & Farm Vegetables",
            "category": "Fruits & Vegetables",
            "bounds": {"x": 310, "y": 350, "w": 180, "h": 70},
            "color": "#dcfce7",
            "borderColor": "#22c55e",
            "shelves": ["Shelf A1", "Shelf A2", "Shelf A3", "Shelf B1", "Shelf B2"]
        },
        {
            "aisle_number": "Aisle 6",
            "name": "Household & Laundry Cleaners",
            "category": "Household & Cleaning",
            "bounds": {"x": 520, "y": 350, "w": 180, "h": 70},
            "color": "#fed7aa",
            "borderColor": "#f97316",
            "shelves": ["Shelf A1", "Shelf A2", "Shelf B1", "Shelf B2", "Shelf C1", "Shelf C2"]
        }
    ]
}

def get_store_map_data():
    """Returns complete store floor map layout and aisle geometry."""
    return STORE_LAYOUT

def locate_product_on_map(product_id):
    """
    Finds product coordinates, exact shelf pin, and walking directions from entrance.
    """
    prod = get_product_by_id(product_id)
    if not prod:
        return {"found": False, "error": f"Product '{product_id}' not found."}

    aisle_num = prod["aisle_number"]
    shelf_loc = prod["shelf_location"]

    matched_aisle = None
    for a in STORE_LAYOUT["aisles"]:
        if a["aisle_number"].lower() == aisle_num.lower():
            matched_aisle = a
            break

    if not matched_aisle:
        # Fallback coordinates
        coords = {"x": 400, "y": 200}
    else:
        # Calculate coordinate within aisle based on shelf
        b = matched_aisle["bounds"]
        coords = {
            "x": b["x"] + b["w"] // 2,
            "y": b["y"] + b["h"] // 2
        }

    # Generate step-by-step directions from entrance
    entrance = STORE_LAYOUT["landmarks"][0]
    directions = [
        f"Start with your Smart Trolley at the {entrance['name']}.",
        f"Proceed along the main central walkway toward {aisle_num}.",
        f"Turn into {aisle_num} ({matched_aisle['name'] if matched_aisle else 'Main Wing'}).",
        f"Locate **{prod['product_name']}** displayed on **{shelf_loc}**."
    ]

    return {
        "found": True,
        "product_id": prod["product_id"],
        "product_name": prod["product_name"],
        "category": prod["category"],
        "brand": prod["brand"],
        "price": prod["price"],
        "availability": prod["availability"],
        "aisle_number": aisle_num,
        "shelf_location": shelf_loc,
        "map_coordinates": coords,
        "aisle_info": matched_aisle,
        "walking_directions": directions
    }

