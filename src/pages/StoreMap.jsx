import React, { useState, useEffect } from 'react';
import { getStoreMap, locateProduct, getProducts, addToCart, optimizeShoppingRoute } from '../services/api';

export default function StoreMap({ targetProductId, onAddToCartSuccess }) {
  const [mapData, setMapData] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(targetProductId || 'PRD001');
  const [activeLocation, setActiveLocation] = useState(null);
  const [actionNotice, setActionNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [shoppingListInput, setShoppingListInput] = useState('rice, milk, toothpaste, carrot, vim gel');
  const [routeResult, setRouteResult] = useState(null);
  const [optimizing, setOptimizing] = useState(false);


  useEffect(() => {
    async function loadData() {
      try {
        const [mapRes, prodsRes] = await Promise.all([
          getStoreMap(),
          getProducts(100)
        ]);
        setMapData(mapRes);
        setProducts(prodsRes.products || []);

        const initialId = targetProductId || 'PRD001';
        const locRes = await locateProduct(initialId);
        setActiveLocation(locRes);
      } catch (e) {
        console.error('Failed to load map data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [targetProductId]);

  const handleSelectProduct = async (pid) => {
    setSelectedProductId(pid);
    try {
      const loc = await locateProduct(pid);
      setActiveLocation(loc);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddDirect = async (productId, productName) => {
    try {
      await addToCart(productId, 1);
      setActionNotice(`✅ Added "${productName}" to your Smart Trolley!`);
      if (onAddToCartSuccess) onAddToCartSuccess();
      setTimeout(() => setActionNotice(''), 3000);
    } catch (err) {
      alert(`Could not add to trolley: ${err.message}`);
    }
  };

  if (loading || !mapData) {
    return (
      <div style={{ textAlign: 'center', padding: '64px', color: '#64748b' }}>
        <div className="pulse-active" style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🗺️</div>
        <div>Loading interactive supermarket floor map...</div>
      </div>
    );
  }

  const { width, height } = mapData.dimensions;
  const pinCoords = activeLocation?.map_coordinates || { x: 400, y: 510 };

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--dark)' }}>
            Supermarket Floor Map & In-Store Aisle Navigator
          </h2>
          <p style={{ fontSize: '1rem', color: '#64748b' }}>
            Interactive indoor store navigation: locate any product shelf and follow clear walking paths.
          </p>
        </div>

        {/* Product Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
            Find Product:
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => handleSelectProduct(e.target.value)}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: '2px solid var(--border)',
              fontSize: '0.95rem',
              fontWeight: 600,
              background: 'white'
            }}
          >
            {products.map((p) => (
              <option key={p.product_id} value={p.product_id}>
                {p.product_name} ({p.aisle_number})
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionNotice && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            padding: '10px 16px',
            borderRadius: '10px',
            fontWeight: 700,
            marginBottom: '16px'
          }}
        >
          {actionNotice}
        </div>
      )}

      {/* Main Grid: Interactive Map & Step-by-Step Directions */}
      <div className="grid-3" style={{ gap: '24px', alignItems: 'flex-start' }}>
        {/* Left 2 Cols: Interactive Floor Map SVG */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <strong style={{ color: '#1e3a8a', fontSize: '1.05rem' }}>
                📍 Supermarket Store Floor Plan
              </strong>
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: '#64748b' }}>
                <span>🚪 Entrance</span>
                <span>🪑 Senior Rest Area</span>
                <span>💳 Checkout</span>
              </div>
            </div>

            {/* SVG Visual Map */}
            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '12px', border: '2px solid var(--border)', overflowX: 'auto' }}>
              <svg
                viewBox={`0 0 ${width} ${height}`}
                style={{ width: '100%', height: 'auto', minWidth: '600px', display: 'block' }}
              >
                {/* Store Floor Boundary */}
                <rect x="20" y="20" width={width - 40} height={height - 40} rx="16" fill="#ffffff" stroke="#cbd5e1" strokeWidth="3" />

                {/* Central Walkway Corridor Guide */}
                <line x1="400" y1="500" x2="400" y2="60" stroke="#e2e8f0" strokeWidth="40" strokeLinecap="round" />
                <line x1="50" y1="275" x2="750" y2="275" stroke="#e2e8f0" strokeWidth="40" strokeLinecap="round" />

                {/* Walking Route Guide from Entrance to Target */}
                {activeLocation && (
                  <path
                    d={`M 400 500 L 400 ${pinCoords.y} L ${pinCoords.x} ${pinCoords.y}`}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="4"
                    strokeDasharray="8 6"
                  />
                )}

                {/* Aisles Blocks */}
                {mapData.aisles.map((a, idx) => {
                  const b = a.bounds;
                  const isTargetAisle = activeLocation?.aisle_number?.toLowerCase() === a.aisle_number?.toLowerCase();
                  return (
                    <g key={idx} onClick={() => {}} style={{ cursor: 'pointer' }}>
                      <rect
                        x={b.x}
                        y={b.y}
                        width={b.w}
                        height={b.h}
                        rx="10"
                        fill={isTargetAisle ? '#dbeafe' : a.color}
                        stroke={isTargetAisle ? '#2563eb' : a.borderColor}
                        strokeWidth={isTargetAisle ? 4 : 2}
                      />
                      <text
                        x={b.x + b.w / 2}
                        y={b.y + 28}
                        textAnchor="middle"
                        fontSize="13"
                        fontWeight="800"
                        fill="#0f172a"
                      >
                        {a.aisle_number}
                      </text>
                      <text
                        x={b.x + b.w / 2}
                        y={b.y + 48}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="600"
                        fill="#475569"
                      >
                        {a.name}
                      </text>
                    </g>
                  );
                })}

                {/* Landmarks */}
                {mapData.landmarks.map((l, idx) => (
                  <g key={idx}>
                    <circle cx={l.x} cy={l.y} r="18" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />
                    <text x={l.x} y={l.y + 6} textAnchor="middle" fontSize="16">{l.icon}</text>
                    <text x={l.x} y={l.y + 26} textAnchor="middle" fontSize="9" fontWeight="700" fill="#475569">
                      {l.name}
                    </text>
                  </g>
                ))}

                {/* Pulsing Target Location Pin */}
                {activeLocation && (
                  <g transform={`translate(${pinCoords.x}, ${pinCoords.y})`}>
                    <circle cx="0" cy="0" r="22" fill="rgba(239, 68, 68, 0.25)" className="pulse-active" />
                    <circle cx="0" cy="0" r="10" fill="#ef4444" stroke="#ffffff" strokeWidth="3" />
                    <text x="0" y="-16" textAnchor="middle" fontSize="11" fontWeight="800" fill="#b91c1c">
                      📍 {activeLocation.shelf_location}
                    </text>
                  </g>
                )}

                {/* Smart Trolley Start Position Icon */}
                <g transform="translate(400, 500)">
                  <circle cx="0" cy="0" r="14" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                  <text x="0" y="4" textAnchor="middle" fontSize="11" fill="white">🛒</text>
                </g>
              </svg>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Product Details & Walking Directions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {activeLocation ? (
            <div className="card" style={{ borderLeft: '6px solid #2563eb' }}>
              <span className="badge badge-primary" style={{ marginBottom: '8px' }}>
                📍 TARGET PRODUCT LOCATION
              </span>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                {activeLocation.product_name}
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '14px' }}>
                Category: <strong>{activeLocation.category}</strong> ({activeLocation.brand})
              </p>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', marginBottom: '16px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Store Location:</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e3a8a' }}>
                  {activeLocation.aisle_number} &bull; {activeLocation.shelf_location}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a', marginTop: '6px' }}>
                  Rs. {Number(activeLocation.price).toFixed(2)}
                </div>
              </div>

              {/* Step-by-Step Walking Directions */}
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block', marginBottom: '8px' }}>
                  🚶 Senior Walking Directions:
                </strong>
                <ol style={{ paddingLeft: '18px', fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 }}>
                  {activeLocation.walking_directions?.map((step, idx) => (
                    <li key={idx} style={{ marginBottom: '6px' }}>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Direct Add to Trolley Button */}
              <button
                type="button"
                onClick={() => handleAddDirect(activeLocation.product_id, activeLocation.product_name)}
                className="btn-primary"
                style={{ width: '100%', padding: '12px' }}
              >
                🛒 Add this Item to Trolley
              </button>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
              Select a product from the list to view its indoor navigation path.
            </div>
          )}
        </div>
      </div>

      {/* RAG Shopping List to Optimal Aisle Path Planner */}
      <div className="card" style={{ marginTop: '28px', border: '2px solid #3b82f6', background: '#f8fbff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <strong style={{ color: '#1e3a8a', fontSize: '1.2rem' }}>
              🚀 RAG Shopping List to Optimal Walking Route
            </strong>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Paste your raw grocery list. RAG resolves every item in stock and calculates the shortest forward walking itinerary through Aisles 1 to 6.
            </p>
          </div>
          <span className="badge badge-primary">SPATIAL RAG NAVIGATOR</span>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <input
            type="text"
            value={shoppingListInput}
            onChange={(e) => setShoppingListInput(e.target.value)}
            placeholder="e.g. rice, milk, toothpaste, carrot, vim gel..."
            style={{ flex: 1, padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', background: 'white' }}
          />
          <button
            type="button"
            onClick={async () => {
              if (!shoppingListInput.trim()) return;
              setOptimizing(true);
              try {
                const res = await optimizeShoppingRoute(shoppingListInput);
                setRouteResult(res);
              } catch (e) {
                alert(`Error: ${e.message}`);
              } finally {
                setOptimizing(false);
              }
            }}
            disabled={optimizing}
            className="btn-primary"
            style={{ padding: '12px 24px', fontSize: '0.95rem' }}
          >
            {optimizing ? 'Calculating Path...' : 'Plan Optimal Route ➔'}
          </button>
        </div>

        {routeResult && routeResult.success && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <strong style={{ color: '#0f172a', fontSize: '1.05rem' }}>
                  Optimal Walking Itinerary ({routeResult.total_items_found} items mapped in store)
                </strong>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Estimated Grocery Total: <strong>Rs. {routeResult.estimated_total_cost.toFixed(2)}</strong>
                </div>
              </div>

              {/* Add All Listed Button */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    for (const p of routeResult.resolved_products) {
                      await addToCart(p.product_id, 1);
                    }
                    setActionNotice(`🎉 Added all ${routeResult.resolved_products.length} listed items into your Smart Trolley!`);
                    if (onAddToCartSuccess) onAddToCartSuccess();
                    setTimeout(() => setActionNotice(''), 4000);
                  } catch (e) {
                    alert(`Could not add items: ${e.message}`);
                  }
                }}
                className="btn-success"
                style={{ padding: '8px 16px', fontSize: '0.88rem' }}
              >
                🛒 Add All Listed Items to Trolley
              </button>
            </div>

            {/* Step by step itinerary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {routeResult.itinerary?.map((step, idx) => (
                <div key={idx} style={{ fontSize: '0.9rem', color: '#334155', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px' }}>
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


