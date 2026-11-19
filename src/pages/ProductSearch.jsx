import React, { useState, useEffect } from 'react';
import { getProducts, searchProducts } from '../services/api';
import ProductCard from '../components/ProductCard';

export default function ProductSearch() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  const categories = [
    'All',
    'Grains & Staples',
    'Cooking Oils & Ghee',
    'Dairy & Eggs',
    'Snacks & Biscuits',
    'Personal Care',
    'Fruits & Vegetables',
    'Household & Cleaning'
  ];

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      if (selectedCategory === 'All' && !searchQuery.trim()) {
        const data = await getProducts(100);
        setProducts(data.products || []);
      } else {
        const params = {};
        if (selectedCategory !== 'All') params.category = selectedCategory;
        if (searchQuery.trim()) params.q = searchQuery.trim();
        const data = await searchProducts(params);
        setProducts(data.results || []);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Title */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--dark)' }}>
          Supermarket Product Catalog & Inventory
        </h2>
        <p style={{ fontSize: '1rem', color: '#64748b' }}>
          Explore our real-time inventory of 60+ verified items with active discounts, prices, and exact shelf locations.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="card" style={{ marginBottom: '28px', padding: '20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name, brand, or aisle (e.g. 'oil', 'basmati', 'Aisle 2')..."
            style={{
              flex: 1,
              padding: '14px 18px',
              borderRadius: '12px',
              border: '2px solid var(--border)',
              fontSize: '1rem',
              outline: 'none'
            }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '14px 24px' }}>
            🔍 Search
          </button>
        </form>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={selectedCategory === cat ? 'btn-primary' : 'btn-outline'}
              style={{
                fontSize: '0.85rem',
                padding: '6px 14px',
                borderRadius: '20px',
                fontWeight: 700
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 600 }}>
          Showing <strong>{products.length}</strong> items in database
        </span>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
          <div className="pulse-active" style={{ fontSize: '2rem', marginBottom: '12px' }}>🛒</div>
          <div>Loading inventory database...</div>
        </div>
      ) : products.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</div>
          <h3>No products found</h3>
          <p>Try searching for a different keyword or select "All" categories.</p>
        </div>
      ) : (
        <div className="grid-3">
          {products.map((p) => (
            <ProductCard key={p.product_id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

