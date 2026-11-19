/**
 * API service for communicating with Flask backend.
 * Provides endpoints for RAG Shopping Assistant, Smart Trolley Cart,
 * In-Store Navigation, and Admin Inventory.
 */

const BASE_URL = '/api';

// System Health
export async function getHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  return res.json();
}

// RAG Shopping Assistant
export async function askQuestion(query) {
  const res = await fetch(`${BASE_URL}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.details || err.error || 'Failed to get answer');
  }
  return res.json();
}

export async function rebuildIndex() {
  const res = await fetch(`${BASE_URL}/rag/rebuild-index`, {
    method: 'POST'
  });
  return res.json();
}

// Unique Advanced RAG Features
export async function getRecipes() {
  const res = await fetch(`${BASE_URL}/rag/recipes`);
  return res.json();
}

export async function getRecipeBundle(recipeKey, servings = 4, pricingMode = 'portion') {
  const res = await fetch(`${BASE_URL}/rag/recipe-bundle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipe_key: recipeKey,
      servings: Number(servings) || 4,
      pricing_mode: pricingMode
    })
  });
  return res.json();
}

export async function getRecipeBundlesDataset() {
  const res = await fetch(`${BASE_URL}/rag/recipe-bundles-dataset`);
  return res.json();
}

export async function optimizeShoppingRoute(shoppingList) {
  const res = await fetch(`${BASE_URL}/rag/route-optimizer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shopping_list: shoppingList })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to optimize route');
  }
  return res.json();
}

export async function inspectCart(healthProfile = 'general') {
  const res = await fetch(`${BASE_URL}/rag/inspect-cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ health_profile: healthProfile })
  });
  return res.json();
}

export function getSpeechAudioUrl(text, lang = 'auto') {
  return `${BASE_URL}/voice/speak?text=${encodeURIComponent(text)}&lang=${encodeURIComponent(lang)}`;
}


// Product Catalog
export async function getProducts(limit = 100, offset = 0) {
  const res = await fetch(`${BASE_URL}/products?limit=${limit}&offset=${offset}`);
  return res.json();
}

export async function searchProducts(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/products/search?${query}`);
  return res.json();
}

export async function getProductById(id) {
  const res = await fetch(`${BASE_URL}/products/${id}`);
  return res.json();
}

export async function addProduct(productData) {
  const res = await fetch(`${BASE_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.details || err.error || 'Failed to add product');
  }
  return res.json();
}

export async function updateProduct(id, productData) {
  const res = await fetch(`${BASE_URL}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.details || err.error || 'Failed to update product');
  }
  return res.json();
}

export async function deleteProduct(id) {
  const res = await fetch(`${BASE_URL}/products/${id}`, {
    method: 'DELETE'
  });
  return res.json();
}

// Smart Trolley Virtual Cart & Billing
export async function getCart() {
  const res = await fetch(`${BASE_URL}/cart`);
  return res.json();
}

export async function addToCart(productId, quantity = 1) {
  const res = await fetch(`${BASE_URL}/cart/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: productId, quantity })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to add item to trolley');
  }
  return res.json();
}

export async function updateCartItem(productId, quantity) {
  const res = await fetch(`${BASE_URL}/cart/item/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity })
  });
  return res.json();
}

export async function removeFromCart(productId) {
  const res = await fetch(`${BASE_URL}/cart/item/${productId}`, {
    method: 'DELETE'
  });
  return res.json();
}

export async function clearCart() {
  const res = await fetch(`${BASE_URL}/cart/clear`, {
    method: 'DELETE'
  });
  return res.json();
}

export async function setCartBudget(budget) {
  const res = await fetch(`${BASE_URL}/cart/set-budget`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ budget })
  });
  return res.json();
}

export async function checkoutCart(paymentMethod = "Senior Friendly Digital Pay") {
  const res = await fetch(`${BASE_URL}/cart/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payment_method: paymentMethod })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Checkout failed');
  }
  return res.json();
}

// Store Floor Map & Navigation
export async function getStoreMap() {
  const res = await fetch(`${BASE_URL}/map`);
  return res.json();
}

export async function locateProduct(productId) {
  const res = await fetch(`${BASE_URL}/map/locate/${productId}`);
  return res.json();
}
