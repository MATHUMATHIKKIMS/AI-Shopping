import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import ShoppingAssistant from './pages/ShoppingAssistant';
import SmartTrolleyCart from './pages/SmartTrolleyCart';
import StoreMap from './pages/StoreMap';
import RecipeBundlePlanner from './pages/RecipeBundlePlanner';
import AdminPanel from './pages/AdminPanel';
import { getCart, getHealth } from './services/api';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [cartData, setCartData] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [targetProductId, setTargetProductId] = useState('PRD001');
  const [initialAssistantQuery, setInitialAssistantQuery] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const [cart, health] = await Promise.all([
        getCart().catch(() => null),
        getHealth().catch(() => null)
      ]);
      if (cart) setCartData(cart);
      if (health) setHealthData(health);
    } catch (e) {
      console.warn('Status poll warning:', e);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleNavigate = (page, params = {}) => {
    if (params.initialQuery) {
      setInitialAssistantQuery(params.initialQuery);
    }
    if (params.targetProductId) {
      setTargetProductId(params.targetProductId);
    }
    setActivePage(page);
  };

  const handleLocateProduct = (productId) => {
    setTargetProductId(productId);
    setActivePage('map');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        cartData={cartData}
      />

      <main className="container" style={{ flex: 1, paddingBottom: '48px' }}>
        {activePage === 'dashboard' && (
          <Dashboard
            cartData={cartData}
            healthData={healthData}
            onNavigate={handleNavigate}
          />
        )}

        {activePage === 'assistant' && (
          <ShoppingAssistant
            initialQuery={initialAssistantQuery}
            onAddToCartSuccess={fetchStatus}
            onLocateProduct={handleLocateProduct}
          />
        )}

        {activePage === 'recipes' && (
          <RecipeBundlePlanner
            onAddToCartSuccess={fetchStatus}
            onLocateProduct={handleLocateProduct}
          />
        )}

        {activePage === 'cart' && (
          <SmartTrolleyCart
            cartData={cartData}
            onRefresh={fetchStatus}
            onLocateProduct={handleLocateProduct}
          />
        )}

        {activePage === 'map' && (
          <StoreMap
            targetProductId={targetProductId}
            onAddToCartSuccess={fetchStatus}
          />
        )}

        {activePage === 'admin' && (
          <AdminPanel />
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          background: 'white',
          padding: '20px 0',
          fontSize: '0.88rem',
          color: '#64748b',
          textAlign: 'center'
        }}
      >
        <div className="container">
          <strong>SmartMart Supermarket & Smart Trolley AI Suite</strong> &bull; RAG-Based Shopping Assistance & Digital Cart
          <div style={{ marginTop: '4px', fontSize: '0.8rem' }}>
            Powered by Python Flask, SQLite, FAISS Vector Engine, Nexus LLM Grounded Generation, Web Speech API & Interactive Aisle Navigation.
          </div>
        </div>
      </footer>
    </div>
  );
}
