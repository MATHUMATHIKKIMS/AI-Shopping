import React, { useState } from 'react';

export default function ProductCard({ product, onAddToCart, onLocateOnMap }) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const isOutOfStock = product.availability === 'Out of Stock';
  const isLowStock = product.availability === 'Low Stock';

  const handleAdd = async () => {
    if (isOutOfStock || adding) return;
    setAdding(true);
    try {
      if (onAddToCart) {
        await onAddToCart(product.product_id);
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
      }
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        opacity: isOutOfStock ? 0.75 : 1,
        borderLeft: isOutOfStock ? '4px solid #ef4444' : '4px solid #2563eb'
      }}
    >
      <div>
        {/* Top Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 700 }}>
            {product.category}
          </span>
          <span
            className={`badge ${isOutOfStock ? 'badge-danger' : isLowStock ? 'badge-warning' : 'badge-success'}`}
            style={{ fontSize: '0.75rem', padding: '3px 8px' }}
          >
            {product.availability}
          </span>
        </div>

        {/* Product Title */}
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--dark)', marginBottom: '4px' }}>
          {product.product_name}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '12px' }}>
          Brand: <strong style={{ color: 'var(--slate)' }}>{product.brand}</strong> ({product.quantity})
        </p>

        {/* Price & Offer */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '12px' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e3a8a' }}>
            Rs. {Number(product.price).toFixed(2)}
          </span>
          {product.discount_offer && product.discount_offer !== 'No Offer' && (
            <span
              style={{
                background: '#fee2e2',
                color: '#dc2626',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700
              }}
            >
              🏷️ {product.discount_offer}
            </span>
          )}
        </div>

        {/* Description snippet */}
        <p style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '16px', lineHeight: 1.4 }}>
          {product.product_description}
        </p>
      </div>

      <div>
        {/* Aisle & Shelf Location Badge */}
        <div
          style={{
            background: '#f1f5f9',
            padding: '10px 14px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px'
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', fontWeight: 600 }}>
              LOCATION IN STORE:
            </span>
            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
              📍 {product.aisle_number} &bull; {product.shelf_location}
            </strong>
          </div>
          {product.similarity_score && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#2563eb',
                background: '#dbeafe',
                padding: '3px 8px',
                borderRadius: '4px'
              }}
            >
              Score: {Math.round(product.similarity_score * 100)}%
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleAdd}
            disabled={isOutOfStock || adding}
            className={added ? 'btn-success' : 'btn-primary'}
            style={{ flex: 1, padding: '10px 14px', fontSize: '0.88rem' }}
          >
            {added ? '✓ Added to Cart!' : adding ? 'Adding...' : '🛒 Add to Trolley'}
          </button>

          {onLocateOnMap && (
            <button
              onClick={() => onLocateOnMap(product.product_id)}
              className="btn-outline"
              style={{ padding: '10px 14px', fontSize: '0.88rem' }}
              title="Show exact location on store floor map"
            >
              🗺️ Map
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
