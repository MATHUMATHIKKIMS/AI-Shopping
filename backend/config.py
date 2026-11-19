"""
Configuration settings for Smart Supermarket & Smart Trolley System using RAG.
Pure software architecture: RAG Knowledge Engine, Smart Cart Billing & Indoor Navigation.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Base paths
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
DATA_DIR = BACKEND_DIR / "data"
SAVED_INDEX_DIR = BACKEND_DIR / "saved_index"
DB_PATH = BACKEND_DIR / "supermarket.db"
CSV_PATH = DATA_DIR / "products.csv"

# Load .env from project root if it exists
load_dotenv(PROJECT_ROOT / ".env")

# File paths
SAVED_INDEX_PATH = SAVED_INDEX_DIR / "products.index"
SAVED_METADATA_PATH = SAVED_INDEX_DIR / "metadata.json"
SAVED_TFIDF_PATH = SAVED_INDEX_DIR / "vectorizer.pkl"

class Config:
    # Server
    PORT = int(os.getenv("PORT", 5000))
    HOST = os.getenv("HOST", "127.0.0.1")
    DEBUG = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")

    # Store Settings
    STORE_NAME = os.getenv("STORE_NAME", "SmartMart Supermarket")
    CURRENCY = "Rs."
    TAX_RATE = 0.05  # 5% GST on applicable goods
    DEFAULT_BUDGET = float(os.getenv("DEFAULT_BUDGET", 2000.0))

    # LLM / Nexus Provider
    NEXUS_API_KEY = os.getenv("NEXUS_API_KEY", "").strip()
    NEXUS_BASE_URL = os.getenv("NEXUS_BASE_URL", "").strip()
    NEXUS_MODEL = os.getenv("NEXUS_MODEL", "nexus-chat-v1").strip()
    USE_DEMO_FALLBACK = not bool(NEXUS_API_KEY)

    # RAG Settings
    EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    RELEVANCE_THRESHOLD = float(os.getenv("RELEVANCE_THRESHOLD", 0.20))
    TOP_K = int(os.getenv("TOP_K", 4))

    # File paths
    SAVED_INDEX_PATH = SAVED_INDEX_PATH
    SAVED_METADATA_PATH = SAVED_METADATA_PATH
    SAVED_TFIDF_PATH = SAVED_TFIDF_PATH
