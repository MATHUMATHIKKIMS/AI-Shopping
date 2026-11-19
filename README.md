# Smart Supermarket with Smart Trolley System using RAG

[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![Flask 3.0](https://img.shields.io/badge/Flask-3.0.3-green.svg)](https://palletsprojects.com/p/flask/)
[![React 18](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![FAISS](https://img.shields.io/badge/Vector_DB-FAISS-purple.svg)](https://github.com/facebookresearch/faiss)
[![SQLite](https://img.shields.io/badge/Database-SQLite3-lightgrey.svg)](https://www.sqlite.org/)
[![Tests](https://img.shields.io/badge/Tests-20%20Passed-brightgreen.svg)]()

> **Final Year College Project (Software Suite)**: An intelligent retail and digital cart solution designed for senior citizens and supermarket shoppers. Combines **Retrieval-Augmented Generation (RAG)**, **natural-language voice assistance**, **real-time on-cart digital billing**, **spatial indoor aisle navigation**, **multi-hop recipe bundle planning**, and **autonomous cart health audits** without any physical hardware dependencies.

---

## 1. Project Overview & Key Features

Pushing heavy shopping trolleys, searching through crowded supermarket aisles, reading small shelf tags, calculating totals manually, and waiting in long billing queues create significant physical fatigue for elderly shoppers.

This project delivers a complete software-based **Smart Supermarket with an on-cart Smart Trolley digital terminal**, powered by genuine **Retrieval-Augmented Generation (RAG)**:

### 🌟 3 Novel RAG-First Supermarket Innovations

1. **Multi-Hop Recipe & Meal Bundle Planner (20 Authentic Tamil Nadu Bundles — RB001 to RB020)**:
   - When a customer selects any traditional recipe (e.g., *Vegetable Biryani*, *Chicken Biryani*, *Kalyana Veetu Sambar*, *Tomato Rice*, *Curd Rice*, *Paneer Butter Masala*, *Chicken 65*, *Fish Fry*, *Rava Kesari*, etc.), traditional vector search only finds a single keyword match.
   - Our Multi-Hop RAG engine performs **cross-department multi-entity retrieval**, querying across **Aisles 1 to 6** simultaneously across the 123-product catalog to retrieve all in-stock ingredients.
   - **Unified Product Linking & Deduplication**: Shared items (e.g., Onions, Tomatoes, Cooking Oil, Salt) are linked via canonical product IDs across all recipes so customers never buy unwanted duplicates in their trolley.
   - **Interactive Grocery Checklist**: Customers can check/uncheck individual ingredients (e.g. uncheck Salt or Oil if already at home), copy the list, and review auto-calculated bundle prices with live discount savings.
   - Organizes ingredients into an **optimal sequential aisle walking itinerary** (Aisle 1 ➔ Aisle 6) so seniors never have to backtrack through aisles.
   - Provides a full JSON / Excel database dataset export of all 20 bundles for supermarket administration.

2. **Spatial RAG Shopping List to Route Optimizer**:
   - Shoppers can paste an unstructured, messy shopping list (e.g., *"rice, milk, toothpaste, carrot, vim gel"*).
   - Semantic RAG resolves each item against the supermarket's 60+ product catalog, confirms live stock availability, and sorts them into the **shortest forward walking itinerary** through the store (Aisle 1 ➔ Aisle 2 ➔ ... ➔ Aisle 6).
   - Allows adding all resolved items into the Smart Trolley with a single click.

3. **Autonomous Trolley Health & Deal Inspector**:
   - Audits items currently inside the Smart Trolley against personalized **Senior Health Profiles** (*Diabetic Friendly*, *Heart Healthy*, *Lactose Intolerant*).
   - Proactively flags health risks (e.g., high-glycemic white sugar, saturated trans fats, dairy solids) and uses RAG to suggest **in-store healthier substitutes** along with their exact aisle and shelf locations (e.g., Organic Jaggery Powder in Aisle 1, Epigamia Almond Milk in Aisle 2).
   - Flags missed promotional opportunities (e.g., *"Buy 2 Get Rs 5 OFF: Add 1 more unit to activate savings"*).

---

### Core System Features

1. **RAG-Powered AI Shopping Assistant**:
   - Voice and text question-answering with Web Speech Recognition and senior-paced audio playback (0.88x speed).
   - Grounded vector search via **FAISS** paired with exact **SQLite** queries for zero-hallucination price comparisons, inventory status, and aisle lookups.
   - Direct action buttons on every answer: **"🛒 Add to Trolley"** and **"📍 Locate on Map"**.
   - English and Tamil bilingual query support (*"அரிசி எங்கே உள்ளது?"*).
   - Connected to NavigateLabs Nexus API (`nova-micro`) with an automatic grounded heuristic fallback engine when offline.

2. **Smart Trolley Virtual Cart & Real-Time Billing Terminal**:
   - Simulates the tablet screen mounted on smart carts (like Amazon Dash Cart and Caper Smart Cart).
   - Barcode item scanner simulation: quickly scan or enter product IDs (`PRD001`, `PRD006`, `PRD014`, etc.).
   - Live quantity controls (`+` / `-`), automated promotional deal calculations (`10% OFF`, `Buy 1 Get 1 Free`, `Save Rs. 5`).
   - **Senior Citizen Budget Tracker**: sets personal shopping limits with visual & audio alerts when approaching or exceeding budget.
   - Built-in trolley scale weight verification check (simulates cart anti-theft security).

3. **Interactive Supermarket Floor Map & Indoor Aisle Navigator**:
   - 2D interactive store floor plan displaying 6 supermarket departments/aisles, Entrance, Customer Service, and Express Checkout.
   - Search or select any product to highlight its exact aisle and drop a location pin `📍` on its shelf with step-by-step indoor walking directions from the entrance.

4. **Express Digital Self-Checkout**:
   - Instant digital billing with 5% GST tax calculation and total savings recap.
   - Generates digital receipts with a **Verified Exit Pass QR Token** to skip checkout queues.

5. **Store Admin & Inventory Hub**:
   - Add/edit products, manage stock levels, update deals, and rebuild the FAISS vector index with a single click.

---

## 2. System Architecture

```
                       +-------------------------------------------------+
                       |          SMART TROLLEY TABLET INTERFACE         |
                       |       (React 18 + Vite Accessible Senior UI)    |
                       +------------------------+------------------------+
                                                |
                                    REST API / HTTP JSON (/api/*)
                                                |
    ================================= FLASK BACKEND =================================
    |                                                                               |
    |  [ MODULE 1: RAG KNOWLEDGE ENGINE ]      [ MODULE 2: SMART CART & BILLING ]   |
    |                                                                               |
    |  User Query (Voice / Text)               Item Scanner / Barcode Simulator     |
    |        |                                        |                             |
    |        v                                        v                             |
    |  Intent Classifier                       Virtual Trolley Cart (backend/cart.py)|
    |        |                                        |                             |
    |  +-----+-------------------+                    +---> Automated Discount Calc |
    |  |                         |                    +---> Senior Budget Tracker   |
    |  v                         v                    +---> Weight Verification     |
    |  Exact SQL Queries   Vector Embedding           +---> Digital Self-Checkout   |
    |  (Price Comp/Aisle)  (Dense 512-dim)            |                             |
    |  |                         |                    v                             |
    |  v                         v             Itemized Bill & Exit QR Pass Receipt |
    |  SQLite Database     FAISS Similarity                                         |
    |  (60+ Products)      (IndexFlatIP Top-K)                                      |
    |  |                         |             [ MODULE 3: RAG INNOVATIONS ]        |
    |  +------------+------------+                    |                             |
    |               |                                 +---> Multi-Hop Recipe Bundler|
    |               v                                 +---> Spatial Route Optimizer |
    |     Grounded Product Evidence                   +---> Cart Health & Deals     |
    |               |                                       Inspector               |
    |               v                                                               |
    |      Nexus LLM / Fallback                [ MODULE 4: STORE MAP & ROUTE ]      |
    |  (Zero Hallucination Generation)                |                             |
    |               |                                 v                             |
    |               v                          Aisle Geometry & Walking Directions  |
    |   Natural Language & Voice Output                                             |
    |                                                                               |
    =================================================================================
```

---

## 3. Technology Stack

- **Backend**: Python 3.12, Flask 3.0.3, Flask-CORS, SQLite3, Pandas.
- **RAG & Vector Search**: FAISS (faiss-cpu), scikit-learn TF-IDF & dense normalized cosine projections (SentenceTransformers compatible).
- **LLM Integration**: NavigateLabs Nexus API (`nova-micro`, OpenAI-compatible) with zero-hallucination fallback engine.
- **Frontend**: React 18, Vite 5.4, Web Speech Recognition API & Web Speech Synthesis API.
- **Testing**: Pytest 9.2 (20 automated unit and integration tests, 100% passing).

---

## 4. Project Folder Structure

```
RAG/
├── backend/
│   ├── app.py                      # Flask REST API server with all endpoints & dual-mode UI serving
│   ├── config.py                   # Centralized configuration, store parameters & environment loader
│   ├── database.py                 # SQLite relational database schema, CRUD operations & exact queries
│   ├── cart.py                     # Smart trolley virtual cart, billing, discounts & budget tracker
│   ├── store_map.py                # Supermarket floor plan layout, aisle geometry & route navigator
│   ├── rag/
│   │   ├── embeddings.py           # Dense vector embedding model (SentenceTransformer & TF-IDF fallback)
│   │   ├── retriever.py            # Hybrid FAISS vector similarity & SQL price/aisle retriever
│   │   ├── generator.py            # Grounded answer generation using Nexus LLM or fallback engine
│   │   ├── build_index.py          # Encodes products into FAISS IndexFlatIP & metadata JSON
│   │   ├── recipe_bundle.py        # Multi-Hop RAG cross-department meal bundle planner
│   │   ├── shopping_route.py       # Spatial RAG shopping list to sequential aisle route optimizer
│   │   └── cart_inspector.py       # Autonomous trolley health & volume discount inspector
│   ├── voice/
│   │   ├── speech_to_text.py       # Speech recognition helper service and audio transcription
│   │   └── text_to_speech.py       # Senior-friendly voice playback configurations & language mapping
│   ├── data/
│   │   └── products.csv            # 60 realistic supermarket products across 7 departments
│   └── saved_index/
│       ├── products.index          # Serialized FAISS vector index (60 items, dim=512)
│       ├── metadata.json           # Product metadata associated with indexed vector IDs
│       └── vectorizer.pkl          # Serialized feature extraction model
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Header with live cart spend, budget alert pill & navigation
│   │   │   └── ProductCard.jsx     # Product card with price, aisle locator & 'Add to Trolley'
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # Page 1: Store overview, active cart summary & RAG innovations
│   │   │   ├── ShoppingAssistant.jsx # Page 2: AI Voice/RAG chat with mic, speaker & direct cart actions
│   │   │   ├── RecipeBundlePlanner.jsx # Page 3: Multi-hop RAG recipe ingredient bundle planner
│   │   │   ├── SmartTrolleyCart.jsx  # Page 4: Virtual cart terminal, item scanner, bill & self-checkout
│   │   │   ├── StoreMap.jsx        # Page 5: Interactive 2D floor map & spatial route optimizer
│   │   │   └── AdminPanel.jsx      # Page 6: Product CRUD, price editor & one-click FAISS index rebuilder
│   │   ├── services/
│   │   │   └── api.js              # Frontend REST API client
│   │   ├── App.jsx                 # Application container with background status polling
│   │   ├── index.css               # Accessible senior-friendly styling & high contrast theme
│   │   └── main.jsx                # React DOM root entry
│   ├── dist/                       # Pre-compiled production bundle ready to serve
│   └── vite.config.js              # Vite bundler with API reverse-proxy configuration
│
├── tests/
│   └── test_backend.py             # 20 Automated unit & integration tests (100% passing)
│
├── .env.example                    # Template environment variables
├── .gitignore                      # Security rules (ignores .env, DBs, cache, node_modules)
├── requirements.txt                # Python backend dependencies
└── README.md                       # Complete documentation & College review demonstration manual
```

---

## 5. How to Run the Project

### Prerequisites
- **Python**: Version 3.12+
- **Node.js**: Version 18+ or 20+

### Step 1: Install Python Dependencies
Open PowerShell or Command Prompt in `f:\RAG`:
```powershell
python -m pip install -r requirements.txt
```

### Step 2: Configure Environment
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```
*(Your Nexus API key is pre-configured in `.env`. If offline, the system falls back to Grounded Heuristic Demo Mode automatically).*

### Step 3: Run Automated Test Suite
Run the 20 unit and integration tests:
```powershell
python -m pytest tests/test_backend.py -v
```

### Step 4: Launch the Application

#### Single-Command Launch (Recommended for Demonstration)
The Flask backend automatically serves both the API and the compiled React frontend:
```powershell
python -m backend.app
```
Open your browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

#### Dual Development Mode (With Hot-Reloading)
**Terminal 1 (Backend API):**
```powershell
python -m backend.app
```
**Terminal 2 (Frontend Dev Server):**
```powershell
cd frontend
npm.cmd run dev
```
Open your browser at:
👉 **[http://127.0.0.1:5173](http://127.0.0.1:5173)**

---

## 6. College Review Demonstration Script

Follow this structured order when presenting to evaluators:

### Step 1: Store Dashboard (Page 1)
- Open `http://127.0.0.1:5000`.
- Introduce the project: a pure software, RAG-powered Smart Supermarket with an on-cart Smart Trolley assistant designed to assist senior citizens.
- Show the **Active Smart Trolley Session**, **Senior Budget Tracker**, and **Key RAG Supermarket Innovations** showcase.

### Step 2: AI Shopping Assistant (Page 2)
- Navigate to **"2. AI Shopping Assistant"**.
- Ask: **"Where can I find rice?"**
  - Show the grounded answer citing *Ponni Boiled Rice in Aisle 1, Shelf A2 at Rs. 62.00*.
  - Show the **"🛒 Add to Trolley"** button inside the chat: click it to add the product directly to your cart!
  - Click **"📍 Locate on Map"** to instantly jump to the store floor map showing the shelf location.
  - Click **"🔊 Read Aloud (Voice)"** to demonstrate senior-friendly audio pacing (0.88x speed).
- Ask: **"Which rice is cheaper?"**
  - Demonstrate exact SQL ranking: Ponni Boiled Rice (Rs. 62) vs Sona Masoori (Rs. 74) vs Basmati (Rs. 115).
- Ask in Tamil: **"அரிசி எங்கே உள்ளது?"**
  - Show bilingual query translation and grounded Tamil response.
- Try an irrelevant query: **"What is the capital of France?"**
  - Show that the system politely rejects out-of-domain queries without hallucinating.

### Step 3: Multi-Hop Recipe Bundle Planner (Page 3)
- Navigate to **"3. AI Recipe Bundles"**.
- Select **"Healthy Vegetable Biryani"** or **"Senior Vitality High-Calcium Breakfast"**.
- Point out to evaluators:
  - Multi-hop RAG retrieved 6 ingredients across **Aisle 1**, **Aisle 2**, and **Aisle 5**.
  - Automatically calculates total bundle price and promotional savings.
  - Generates the sequential aisle walking path.
  - Click **"🛒 Add All Ingredients to Trolley"** to add the whole bundle at once.

### Step 4: Smart Trolley & Real-Time Health Inspector (Page 4)
- Navigate to **"4. Smart Trolley & Bill"**.
- Show the **Item Scanner Simulator**: scan or click quick add items.
- Point out the **AI Cart Health & Deal Inspector**:
  - Switch Health Profile to **"Diabetic Friendly"**: observe the real-time warning for White Sugar and the suggested swap (*Organic Jaggery Powder in Aisle 1*).
  - Switch to **"Lactose Intolerant"**: observe the alert for cow milk and the recommended plant substitute (*Epigamia Almond Milk in Aisle 2*).
- Show the **Senior Citizen Budget Monitoring**: edit the budget to Rs. 300 and watch the alert trigger when over budget.
- Complete **Express Self-Checkout**:
  - Click **"💳 Express Self-Checkout ➔"**.
  - Show the generated **Digital Receipt** with an invoice ID, savings recap, and a **Verified Exit Pass QR Token**.

### Step 5: Interactive Store Map & Route Optimizer (Page 5)
- Navigate to **"5. Store Map & Route"**.
- Select any product from the dropdown (e.g. *Borges Extra Virgin Olive Oil*).
- Observe the 2D floor plan highlighting **Aisle 2**, dropping a pulsing location pin `📍` at Shelf B2, and displaying step-by-step walking directions.
- In the **RAG Shopping List to Optimal Walking Route** box:
  - Input: `rice, milk, toothpaste, carrot, vim gel`
  - Click **"Plan Optimal Route ➔"**: show how RAG resolves each item and outputs the forward walking route from Aisle 1 to Aisle 6.

### Step 6: Admin Inventory Hub (Page 6)
- Navigate to **"6. Admin Inventory Hub"**.
- Show the 60 pre-seeded supermarket items across all 6 aisles.
- Edit an item's price or add a new product.
- Click **"⚡ Rebuild Vector Index"** to re-encode the SQLite database into the FAISS index with one click.

---

## 7. License
This project is open-source under the MIT License.
