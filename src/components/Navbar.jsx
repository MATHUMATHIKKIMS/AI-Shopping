import React from 'react';

export default function Navbar({ activePage, setActivePage, cartData }) {
  const pages = [
    { id: 'dashboard', label: '1. Store Dashboard' },
    { id: 'assistant', label: '2. AI Shopping Assistant' },
    { id: 'recipes', label: '3. AI Recipe Bundles' },
    { id: 'cart', label: '4. Smart Trolley & Bill' },
    { id: 'map', label: '5. Store Map & Route' },
    { id: 'admin', label: '6. Admin Inventory Hub' }
  ];

  const itemsCount = cartData?.items_count || 0;
  const grandTotal = cartData?.grand_total || 0;
  const budgetStatus = cartData?.budget_status || 'COMFORTABLE';
  const budgetPercent = cartData?.budget_percent_used || 0;

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        {/* Brand */}
        <div className="nav-brand" style={{ cursor: 'pointer' }} onClick={() => setActivePage('dashboard')}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              backgroundColor: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '22px'
            }}
          >
            🛒
          </div>
          <div>
            <div className="nav-brand-title">SmartMart &bull; Smart Trolley</div>
            <div className="nav-brand-subtitle">RAG AI Supermarket & Digital Cart Assistant</div>
          </div>
        </div>

        {/* Trolley Live Summary & Budget Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Budget status badge */}
          <span
            className={`badge ${
              budgetStatus === 'EXCEEDED'
                ? 'badge-danger'
                : budgetStatus === 'WARNING'
                ? 'badge-warning'
                : 'badge-success'
            }`}
            style={{ fontSize: '0.85rem' }}
          >
            {budgetStatus === 'EXCEEDED'
              ? '⚠️ Over Budget'
              : budgetStatus === 'WARNING'
              ? `⚡ ${budgetPercent}% Budget`
              : '✅ Within Budget'}
          </span>

          {/* Quick Cart Pill */}
          <button
            onClick={() => setActivePage('cart')}
            className="btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: '0.9rem',
              fontWeight: 700,
              borderRadius: '24px'
            }}
          >
            <span>🛒 Smart Cart:</span>
            <strong>{itemsCount} Items</strong>
            <span>&bull;</span>
            <strong>Rs. {grandTotal.toFixed(2)}</strong>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ borderTop: '1px solid var(--border)', background: '#fafbfc' }}>
        <div className="container" style={{ padding: '8px 20px' }}>
          <nav className="nav-tabs">
            {pages.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePage(p.id)}
                className={`nav-tab-btn ${activePage === p.id ? 'active' : ''}`}
              >
                {p.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
