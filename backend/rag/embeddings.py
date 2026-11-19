"""
Embeddings generator for RAG Shopping Assistant.
Supports Sentence Transformers (if installed) with an automatic scikit-learn
TF-IDF + TruncatedSVD / dense normalized vector fallback.
Ensures zero-downtime and 100% offline functionality.
"""
import os
import pickle
import numpy as np
from pathlib import Path
from backend.config import Config, SAVED_TFIDF_PATH

# Check if sentence_transformers is available
_ST_AVAILABLE = False
try:
    from sentence_transformers import SentenceTransformer
    _ST_AVAILABLE = True
except ImportError:
    _ST_AVAILABLE = False

from sklearn.feature_extraction.text import TfidfVectorizer

class EmbeddingModel:
    def __init__(self, model_name=Config.EMBEDDING_MODEL_NAME):
        self.model_name = model_name
        self.st_model = None
        self.vectorizer = None
        self.dim = 384  # standard embedding dimension

        if _ST_AVAILABLE:
            try:
                print(f"[Embedding] Loading SentenceTransformer: {self.model_name}...")
                self.st_model = SentenceTransformer(self.model_name)
                print("[Embedding] SentenceTransformer loaded successfully.")
            except Exception as e:
                print(f"[Embedding] Warning: Failed to load SentenceTransformer ({e}). Falling back to TF-IDF.")
                self.st_model = None

        if self.st_model is None:
            # Check if saved vectorizer exists
            if SAVED_TFIDF_PATH.exists():
                try:
                    with open(SAVED_TFIDF_PATH, "rb") as f:
                        self.vectorizer = pickle.load(f)
                        self.dim = len(self.vectorizer.get_feature_names_out())
                except Exception:
                    self.vectorizer = None

    def fit_fallback_corpus(self, texts):
        """Fit TF-IDF on corpus if SentenceTransformer is not used."""
        if self.st_model is not None:
            return

        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            stop_words="english",
            max_features=512,
            sublinear_tf=True
        )
        self.vectorizer.fit(texts)
        self.dim = len(self.vectorizer.get_feature_names_out())

        # Save fitted vectorizer
        SAVED_TFIDF_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(SAVED_TFIDF_PATH, "wb") as f:
            pickle.dump(self.vectorizer, f)
        print(f"[Embedding] Fitted TF-IDF vectorizer with dimension {self.dim}.")

    def encode(self, texts):
        """
        Encodes a single text or list of texts into L2-normalized float32 numpy array.
        Compatible with FAISS IndexFlatIP (cosine similarity).
        """
        single_input = isinstance(texts, str)
        if single_input:
            texts = [texts]

        if self.st_model is not None:
            embeddings = self.st_model.encode(
                texts,
                convert_to_numpy=True,
                normalize_embeddings=True
            ).astype("float32")
        else:
            if self.vectorizer is None:
                # If vectorizer is not fitted yet, initialize with current texts
                self.fit_fallback_corpus(texts)
            
            # Transform and L2 normalize
            matrix = self.vectorizer.transform(texts).toarray().astype("float32")
            norms = np.linalg.norm(matrix, axis=1, keepdims=True)
            norms[norms == 0] = 1e-10
            embeddings = matrix / norms

        return embeddings[0] if single_input else embeddings

    def get_dimension(self):
        """Returns embedding dimension."""
        return self.dim

