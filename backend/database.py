"""
Database management module for the Supermarket Knowledge Base using SQLite.
Creates normalized relational tables (Products, Categories, Offers, Inventory, Aisles)
and seeds initial records from CSV.
"""
import sqlite3
import pandas as pd
from datetime import datetime
from backend.config import Config, DB_PATH, CSV_PATH

def get_connection():
    """Returns a SQLite connection with dictionary-like row factory and foreign keys enabled."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    return conn


def init_db(force_reseed=False):
    """
    Initializes SQLite tables and seeds sample data from CSV if table is empty.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Enable Foreign Keys
    cursor.execute("PRAGMA foreign_keys = ON;")

    if force_reseed:
        cursor.execute("DROP TABLE IF EXISTS inventory;")
        cursor.execute("DROP TABLE IF EXISTS products;")
        cursor.execute("DROP TABLE IF EXISTS categories;")
        cursor.execute("DROP TABLE IF EXISTS aisles;")
        cursor.execute("DROP TABLE IF EXISTS offers;")
        conn.commit()

    # 1. Categories Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS categories (

        category_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT
    );
    """)

    # 2. Aisles Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS aisles (
        aisle_id INTEGER PRIMARY KEY AUTOINCREMENT,
        aisle_number TEXT NOT NULL,
        shelf_location TEXT NOT NULL,
        description TEXT,
        UNIQUE(aisle_number, shelf_location)
    );
    """)

    # 3. Offers Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS offers (
        offer_id INTEGER PRIMARY KEY AUTOINCREMENT,
        offer_title TEXT UNIQUE NOT NULL,
        discount_percentage REAL DEFAULT 0.0,
        description TEXT
    );
    """)

    # 4. Products Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        product_id TEXT PRIMARY KEY,
        product_name TEXT NOT NULL,
        category TEXT NOT NULL,
        brand TEXT NOT NULL,
        price REAL NOT NULL,
        quantity TEXT NOT NULL,
        product_description TEXT NOT NULL,
        availability TEXT NOT NULL DEFAULT 'In Stock',
        discount_offer TEXT DEFAULT 'No Offer',
        aisle_number TEXT NOT NULL,
        shelf_location TEXT NOT NULL,
        health_tags TEXT DEFAULT 'General',
        allergens TEXT DEFAULT 'None',
        nutritional_summary TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)


    # 5. Inventory Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inventory (
        inventory_id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT UNIQUE NOT NULL,
        stock_units INTEGER DEFAULT 50,
        last_updated TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
    );
    """)

    conn.commit()

    # Check if products already exist
    cursor.execute("SELECT COUNT(*) AS count FROM products;")
    count = cursor.fetchone()["count"]

    if count == 0 or force_reseed:
        if force_reseed and count > 0:
            cursor.execute("DELETE FROM inventory;")
            cursor.execute("DELETE FROM products;")
            cursor.execute("DELETE FROM categories;")
            cursor.execute("DELETE FROM aisles;")
            cursor.execute("DELETE FROM offers;")
            conn.commit()

        if CSV_PATH.exists():
            df = pd.read_csv(CSV_PATH)
            now = datetime.now().isoformat()
            
            for _, row in df.iterrows():
                # Insert Category
                cat = str(row["category"]).strip()
                cursor.execute("INSERT OR IGNORE INTO categories (name) VALUES (?);", (cat,))

                # Insert Aisle
                aisle = str(row["aisle_number"]).strip()
                shelf = str(row["shelf_location"]).strip()
                cursor.execute(
                    "INSERT OR IGNORE INTO aisles (aisle_number, shelf_location) VALUES (?, ?);",
                    (aisle, shelf)
                )

                # Insert Offer
                offer = str(row["discount_offer"]).strip()
                cursor.execute("INSERT OR IGNORE INTO offers (offer_title) VALUES (?);", (offer,))

                # Insert Product
                p_id = str(row["product_id"]).strip()
                p_name = str(row["product_name"]).strip()
                brand = str(row["brand"]).strip()
                price = float(row["price"])
                qty = str(row["quantity"]).strip()
                desc = str(row["product_description"]).strip()
                avail = str(row["availability"]).strip()

                health = str(row.get("health_tags", "General Grocery")).strip()
                allergens = str(row.get("allergens", "None")).strip()
                nutrition = str(row.get("nutritional_summary", "")).strip()

                cursor.execute("""
                INSERT OR REPLACE INTO products (
                    product_id, product_name, category, brand, price, quantity,
                    product_description, availability, discount_offer, aisle_number,
                    shelf_location, health_tags, allergens, nutritional_summary,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (p_id, p_name, cat, brand, price, qty, desc, avail, offer, aisle, shelf, health, allergens, nutrition, now, now))


                # Insert Inventory
                stock_count = 60 if avail == "In Stock" else (10 if avail == "Low Stock" else 0)
                cursor.execute("""
                INSERT OR REPLACE INTO inventory (product_id, stock_units, last_updated)
                VALUES (?, ?, ?);
                """, (p_id, stock_count, now))

            conn.commit()
            print(f"[DB] Initialized database with {len(df)} products from CSV.")

    conn.close()

# -------------------------------------------------------------
# CRUD & Query Operations
# -------------------------------------------------------------

def get_all_products(limit=100, offset=0):
    """Retrieve all products with inventory status."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT p.*, i.stock_units
        FROM products p
        LEFT JOIN inventory i ON p.product_id = i.product_id
        ORDER BY p.product_id ASC
        LIMIT ? OFFSET ?;
    """, (limit, offset))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def get_product_by_id(product_id):
    """Retrieve a single product by its unique product_id."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT p.*, i.stock_units
        FROM products p
        LEFT JOIN inventory i ON p.product_id = i.product_id
        WHERE p.product_id = ?;
    """, (product_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def search_products_sql(query=None, category=None, aisle=None, availability=None):
    """Filter products using SQL for precise criteria."""
    conn = get_connection()
    cursor = conn.cursor()
    sql = "SELECT p.*, i.stock_units FROM products p LEFT JOIN inventory i ON p.product_id = i.product_id WHERE 1=1"
    params = []

    if query:
        pattern = f"%{query}%"
        sql += " AND (p.product_name LIKE ? OR p.brand LIKE ? OR p.product_description LIKE ? OR p.category LIKE ?)"
        params.extend([pattern, pattern, pattern, pattern])

    if category:
        sql += " AND p.category = ?"
        params.append(category)

    if aisle:
        sql += " AND p.aisle_number = ?"
        params.append(aisle)

    if availability:
        sql += " AND p.availability = ?"
        params.append(availability)

    sql += " ORDER BY p.price ASC"
    cursor.execute(sql, params)
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def compare_products_exact(category_or_keyword):
    """
    Execute SQL query for exact price comparison and ranking.
    Used by RAG pipeline when questions like 'Which rice is cheaper?' are asked.
    """
    conn = get_connection()
    cursor = conn.cursor()
    pattern = f"%{category_or_keyword}%"
    cursor.execute("""
        SELECT product_id, product_name, brand, price, quantity, availability, discount_offer, aisle_number, shelf_location
        FROM products
        WHERE category LIKE ? OR product_name LIKE ? OR product_description LIKE ?
        ORDER BY price ASC;
    """, (pattern, pattern, pattern))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def get_products_by_aisle_exact(aisle_number):
    """Fetch all products situated in a specific aisle."""
    conn = get_connection()
    cursor = conn.cursor()
    pattern = f"%{aisle_number}%"
    cursor.execute("""
        SELECT product_id, product_name, category, price, quantity, availability, discount_offer, aisle_number, shelf_location
        FROM products
        WHERE aisle_number LIKE ?
        ORDER BY shelf_location ASC;
    """, (pattern,))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def add_product(data):
    """Add a new product record and inventory entry."""
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    
    p_id = data.get("product_id") or f"PRD{int(datetime.now().timestamp()):03d}"
    cursor.execute("""
        INSERT INTO products (
            product_id, product_name, category, brand, price, quantity,
            product_description, availability, discount_offer, aisle_number,
            shelf_location, health_tags, allergens, nutritional_summary,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        p_id,
        data.get("product_name"),
        data.get("category"),
        data.get("brand"),
        float(data.get("price", 0.0)),
        data.get("quantity"),
        data.get("product_description", ""),
        data.get("availability", "In Stock"),
        data.get("discount_offer", "No Offer"),
        data.get("aisle_number"),
        data.get("shelf_location"),
        data.get("health_tags", "General Grocery"),
        data.get("allergens", "None"),
        data.get("nutritional_summary", ""),
        now, now
    ))


    # Add inventory
    stock = int(data.get("stock_units", 50))
    cursor.execute("""
        INSERT OR REPLACE INTO inventory (product_id, stock_units, last_updated)
        VALUES (?, ?, ?);
    """, (p_id, stock, now))


    # Add category and aisle references if missing
    cursor.execute("INSERT OR IGNORE INTO categories (name) VALUES (?);", (data.get("category"),))
    cursor.execute("INSERT OR IGNORE INTO aisles (aisle_number, shelf_location) VALUES (?, ?);", 
                   (data.get("aisle_number"), data.get("shelf_location")))
    cursor.execute("INSERT OR IGNORE INTO offers (offer_title) VALUES (?);", (data.get("discount_offer"),))

    conn.commit()
    conn.close()
    return get_product_by_id(p_id)

def update_product(product_id, data):
    """Update fields of an existing product."""
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()

    # Allowed fields
    allowed = ["product_name", "category", "brand", "price", "quantity", 
               "product_description", "availability", "discount_offer", 
               "aisle_number", "shelf_location", "health_tags", "allergens", "nutritional_summary"]

    
    updates = []
    values = []
    for k in allowed:
        if k in data:
            updates.append(f"{k} = ?")
            val = float(data[k]) if k == "price" else data[k]
            values.append(val)

    if not updates and "stock_units" not in data:
        conn.close()
        return get_product_by_id(product_id)

    if updates:
        updates.append("updated_at = ?")
        values.append(now)
        values.append(product_id)
        sql = f"UPDATE products SET {', '.join(updates)} WHERE product_id = ?"
        cursor.execute(sql, values)

    if "stock_units" in data:
        cursor.execute("""
            UPDATE inventory SET stock_units = ?, last_updated = ? WHERE product_id = ?;
        """, (int(data["stock_units"]), now, product_id))

    conn.commit()
    conn.close()
    return get_product_by_id(product_id)

def delete_product(product_id):
    """Delete a product by ID and cascade to inventory."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM inventory WHERE product_id = ?;", (product_id,))
    cursor.execute("DELETE FROM products WHERE product_id = ?;", (product_id,))
    conn.commit()
    conn.close()
    return True

