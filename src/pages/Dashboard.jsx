import React, { useState } from 'react';

export default function Dashboard({ cartData, onNavigate }) {
  const [quickQuery, setQuickQuery] = useState('');

  const itemsCount = cartData?.items_count || 0;
  const grandTotal = cartData?.grand_total || 0;
  const budget = cartData?.budget || 2000;
  const budgetPercent = cartData?.budget_percent_used || 0;
  const budgetStatus = cartData?.budget_status || 'COMFORTABLE';
  const budgetAlert = cartData?.budget_alert || 'Shopping within your set budget.';

  const handleQuickSearch = (e) => {
    e.preventDefault();
    if (quickQuery.trim()) {
      onNavigate('assistant', { initialQuery: quickQuery.trim() });
    }
  };

  const departments = [
    { aisle: 'Aisle 1', name: 'Grains & Staples', desc: 'Basmati Rice, Wheat Atta, Sugar, Jaggery', icon: '🌾', color: '#e0e7ff' },
    { aisle: 'Aisle 2', name: 'Cooking Oils & Dairy', desc: 'Sunflower Oil, Pure Cow Ghee, Fresh Milk', icon: '🥛', color: '#fef3c7' },
    { aisle: 'Aisle 3', name: 'Snacks & Biscuits', desc: 'Marie Gold, Cookies, Dark Fantasy, Chips', icon: '🍪', color: '#fce7f3' },
    { aisle: 'Aisle 4', name: 'Personal Care & Hygiene', desc: 'Dettol Soap, Dove, Shampoo, Toothpaste', icon: '🧼', color: '#ccfbf1' },
    { aisle: 'Aisle 5', name: 'Fresh Fruits & Vegetables', desc: 'Apples, Bananas, Potatoes, Onions, Tomatoes', icon: '🍎', color: '#dcfce7' },
    { aisle: 'Aisle 6', name: 'Household & Cleaning', desc: 'Detergents, Surface Cleaners, Dishwash Gel', icon: '🧹', color: '#fed7aa' }
  ];

  return (
    <div style={{ padding: '32px 0' }}>
      {/* Hero Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          color: 'white',
          marginBottom: '32px',
          padding: '36px',
          borderRadius: '24px'
        }}
      >
        <div style={{ maxWidth: '900px' }}>
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'inline-block',
              marginBottom: '16px',
              letterSpacing: '0.5px'
            }}
          >
            SMART SUPERMARKET WITH SMART TROLLEY USING RAG
          </span>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, lineHeight: 1.25, marginBottom: '16px' }}>
            Welcome to SmartMart &bull; Your AI-Powered Shopping Experience
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.92, lineHeight: 1.6, marginBottom: '24px' }}>
            Ask questions with your voice, find product aisles instantly on our store map, compare prices accurately, and monitor your cart total in real time.
          </p>

          {/* Quick RAG Assistant Input Bar */}
          <form onSubmit={handleQuickSearch} style={{ display: 'flex', gap: '12px', maxWidth: '700px' }}>
            <input
              type="text"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Ask anything... 'Where can I find rice?' or 'Which rice is cheaper?'"
              style={{
                flex: 1,
                padding: '14px 20px',
                borderRadius: '14px',
                border: 'none',
                fontSize: '1.05rem',
                outline: 'none',
                background: 'white',
                color: '#0f172a'
              }}
            />
            <button
              type="submit"
              style={{
                background: '#f59e0b',
                color: '#1e3a8a',
                padding: '14px 24px',
                borderRadius: '14px',
                fontWeight: 800,
                fontSize: '1rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Ask AI ➔
            </button>
          </form>
        </div>
      </div>

      {/* Real-Time Smart Cart & Budget Telemetry */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '20px', color: 'var(--dark)' }}>
        Active Smart Trolley Session
      </h2>

      <div className="grid-3" style={{ marginBottom: '32px' }}>
        {/* Cart Spend Card */}
        <div className="card">
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 700, marginBottom: '8px' }}>
            CURRENT TROLLEY TOTAL
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '4px' }}>
            Rs. {grandTotal.toFixed(2)}
          </div>
          <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
            Contains <strong>{itemsCount} items</strong> &bull; Total Savings: <strong>Rs. {cartData?.total_discount_savings?.toFixed(2) || '0.00'}</strong>
          </p>
          <button
            onClick={() => onNavigate('cart')}
            className="btn-outline"
            style={{ marginTop: '16px', width: '100%', fontSize: '0.9rem' }}
          >
            🛒 View Virtual Cart & Bill
          </button>
        </div>

        {/* Budget Usage Card */}
        <div className="card">
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 700, marginBottom: '8px' }}>
            SENIOR CITIZEN BUDGET TRACKER
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: budgetStatus === 'EXCEEDED' ? '#dc2626' : '#1e3a8a' }}>
              {budgetPercent}% Used
            </span>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Target: Rs. {budget.toFixed(2)}
            </span>
          </div>

          <div style={{ background: '#e2e8f0', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '12px' }}>
            <div
              style={{
                width: `${Math.min(100, budgetPercent)}%`,
                height: '100%',
                background: budgetStatus === 'EXCEEDED' ? '#dc2626' : budgetPercent >= 80 ? '#d97706' : '#16a34a',
                transition: 'width 0.3s ease'
              }}
            />
          </div>

          <p style={{ fontSize: '0.85rem', color: budgetStatus === 'EXCEEDED' ? '#b91c1c' : '#475569', fontWeight: 600 }}>
            {budgetAlert}
          </p>
        </div>

        {/* Indoor Navigation Card */}
        <div className="card">
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 700, marginBottom: '8px' }}>
            INDOOR AISLE NAVIGATOR
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
            🗺️ Interactive Store Map
          </div>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '16px' }}>
            6 Store Aisles with color-coded shelf locations, accessible rest areas, and walking directions.
          </p>
          <button
            onClick={() => onNavigate('map')}
            className="btn-primary"
            style={{ width: '100%', fontSize: '0.9rem' }}
          >
            Open Store Floor Map ➔
          </button>
        </div>
      </div>

      {/* Unique RAG Innovations Showcase */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '20px', color: 'var(--dark)' }}>
        Key RAG Supermarket Innovations
      </h2>

      <div className="grid-3" style={{ marginBottom: '32px' }}>
        <div
          className="card"
          style={{
            cursor: 'pointer',
            borderTop: '5px solid #2563eb',
            background: 'white',
            transition: 'transform 0.2s ease'
          }}
          onClick={() => onNavigate('recipes')}
        >
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🍲</div>
          <strong style={{ fontSize: '1.1rem', color: '#1e3a8a', display: 'block', marginBottom: '6px' }}>
            Multi-Hop Recipe Bundler
          </strong>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '14px', lineHeight: 1.5 }}>
            Pick or ask for a recipe (Biryani, Sambar, Senior Breakfast). RAG retrieves verified ingredients across aisles with bundle discounts.
          </p>
          <span style={{ color: '#2563eb', fontWeight: 700, fontSize: '0.9rem' }}>
            Open Recipe Planner ➔
          </span>
        </div>

        <div
          className="card"
          style={{
            cursor: 'pointer',
            borderTop: '5px solid #16a34a',
            background: 'white',
            transition: 'transform 0.2s ease'
          }}
          onClick={() => onNavigate('cart')}
        >
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🩺</div>
          <strong style={{ fontSize: '1.1rem', color: '#15803d', display: 'block', marginBottom: '6px' }}>
            Cart Health & Deal Inspector
          </strong>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '14px', lineHeight: 1.5 }}>
            Audits items in your smart trolley against Senior Health profiles (Diabetic, Heart, Lactose) and recommends healthier swaps & deals.
          </p>
          <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.9rem' }}>
            Inspect Trolley Items ➔
          </span>
        </div>

        <div
          className="card"
          style={{
            cursor: 'pointer',
            borderTop: '5px solid #f59e0b',
            background: 'white',
            transition: 'transform 0.2s ease'
          }}
          onClick={() => onNavigate('map')}
        >
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🗺️</div>
          <strong style={{ fontSize: '1.1rem', color: '#b45309', display: 'block', marginBottom: '6px' }}>
            Spatial Route Optimizer
          </strong>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '14px', lineHeight: 1.5 }}>
            Paste a messy shopping list. RAG resolves items in the catalog and computes the shortest, sequential in-store walking itinerary.
          </p>
          <span style={{ color: '#b45309', fontWeight: 700, fontSize: '0.9rem' }}>
            Optimize Shopping List ➔
          </span>
        </div>
      </div>

      {/* Supermarket Department Quick Directory */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '20px', color: 'var(--dark)' }}>
        Supermarket Department Directory
      </h2>

      <div className="grid-3" style={{ marginBottom: '32px' }}>
        {departments.map((dept, idx) => (
          <div
            key={idx}
            className="card"
            style={{
              cursor: 'pointer',
              borderLeft: `6px solid #2563eb`,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onClick={() => onNavigate('map')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '2rem' }}>{dept.icon}</span>
              <div>
                <strong style={{ fontSize: '1.1rem', color: '#0f172a', display: 'block' }}>
                  {dept.name}
                </strong>
                <span className="badge badge-primary" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                  {dept.aisle}
                </span>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {dept.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
