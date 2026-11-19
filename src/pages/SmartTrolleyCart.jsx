import React, { useState } from 'react';
import {
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  setCartBudget,
  checkoutCart,
  inspectCart
} from '../services/api';

export default function SmartTrolleyCart({ cartData, onRefresh, onLocateProduct }) {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [budgetInput, setBudgetInput] = useState(cartData?.budget || 2000);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [auditProfile, setAuditProfile] = useState('diabetic');
  const [auditResult, setAuditResult] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);


  const items = cartData?.items || [];
  const itemsCount = cartData?.items_count || 0;
  const grandTotal = cartData?.grand_total || 0;
  const rawSubtotal = cartData?.raw_subtotal || 0;
  const totalSavings = cartData?.total_discount_savings || 0;
  const taxAmount = cartData?.tax_amount || 0;
  const budget = cartData?.budget || 2000;
  const budgetPercent = cartData?.budget_percent_used || 0;
  const budgetStatus = cartData?.budget_status || 'COMFORTABLE';
  const budgetAlert = cartData?.budget_alert || '';
  const totalWeightKg = cartData?.total_estimated_weight_kg || 0;

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    const pid = barcodeInput.trim().toUpperCase();
    if (!pid) return;

    try {
      await addToCart(pid, 1);
      setScanMessage(`✅ Scanned & added product ${pid} to your Smart Trolley!`);
      setBarcodeInput('');
      if (onRefresh) onRefresh();
      setTimeout(() => setScanMessage(''), 4000);
    } catch (err) {
      alert(`Scan error: ${err.message}`);
    }
  };

  const handleUpdateQty = async (productId, newQty) => {
    try {
      await updateCartItem(productId, newQty);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Could not update quantity: ${err.message}`);
    }
  };

  const handleRemove = async (productId) => {
    try {
      await removeFromCart(productId);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Could not remove product: ${err.message}`);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to empty the entire trolley?')) return;
    try {
      await clearCart();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleSaveBudget = async () => {
    try {
      await setCartBudget(parseFloat(budgetInput));
      setIsEditingBudget(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Invalid budget: ${err.message}`);
    }
  };

  const handleCheckout = async () => {
    if (itemsCount === 0) {
      alert('Your trolley is empty. Scan items or ask the AI assistant to add products.');
      return;
    }
    setCheckoutLoading(true);
    try {
      const res = await checkoutCart('Senior Friendly Express UPI / Card');
      setReceipt(res.receipt);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Checkout failed: ${err.message}`);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleRunAudit = async () => {
    if (itemsCount === 0) {
      alert('Add at least one item to your trolley before running the AI audit.');
      return;
    }
    setAuditLoading(true);
    try {
      const res = await inspectCart(auditProfile);
      setAuditResult(res);
    } catch (err) {
      alert(`Audit failed: ${err.message}`);
    } finally {
      setAuditLoading(false);
    }
  };


  const quickScanItems = [
    { id: 'PRD001', name: 'Basmati Rice' },
    { id: 'PRD006', name: 'White Sugar' },
    { id: 'PRD013', name: 'Sunflower Oil' },
    { id: 'PRD020', name: 'Toned Milk' },
    { id: 'PRD026', name: 'Marie Gold' },
    { id: 'PRD034', name: 'Dettol Soap' },
    { id: 'PRD043', name: 'Fresh Potatoes' }
  ];

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--dark)' }}>
            Smart Trolley Digital Terminal & Live Bill
          </h2>
          <p style={{ fontSize: '1rem', color: '#64748b' }}>
            Simulates the on-cart digital tablet: barcode scanning, automated discounts, scale weight checks, and self-checkout.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span className="badge badge-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
            SESSION: <strong>{cartData?.session_id || 'TRL-ACTIVE'}</strong>
          </span>
          {itemsCount > 0 && (
            <button onClick={handleClear} className="btn-outline" style={{ fontSize: '0.85rem', color: '#dc2626' }}>
              🗑️ Clear Cart
            </button>
          )}
        </div>
      </div>

      {/* Barcode Quick Scanner Box */}
      <div className="card" style={{ marginBottom: '24px', background: '#f8fbff', border: '2px solid #bfdbfe' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <strong style={{ color: '#1e3a8a', fontSize: '1.1rem' }}>
            📷 Trolley Item Scanner Simulator
          </strong>
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Enter product ID or click sample barcode to simulate placing an item in the trolley
          </span>
        </div>

        <form onSubmit={handleScanSubmit} style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
          <input
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            placeholder="Scan / Type Product ID e.g. PRD001, PRD006, PRD013..."
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '10px',
              border: '2px solid #cbd5e1',
              fontSize: '1rem',
              outline: 'none',
              background: 'white'
            }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '12px 24px' }}>
            ⚡ Scan & Add
          </button>
        </form>

        {/* Quick sample barcode buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Quick Scan:</span>
          {quickScanItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={async () => {
                await addToCart(item.id, 1);
                setScanMessage(`✅ Scanned "${item.name}" into trolley!`);
                if (onRefresh) onRefresh();
                setTimeout(() => setScanMessage(''), 3000);
              }}
              className="btn-outline"
              style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: '16px' }}
            >
              + {item.name} ({item.id})
            </button>
          ))}
        </div>

        {scanMessage && (
          <div style={{ marginTop: '10px', fontSize: '0.88rem', color: '#16a34a', fontWeight: 700 }}>
            {scanMessage}
          </div>
        )}
      </div>

      {/* Main Grid: Itemized Bill & Financial Breakdown */}
      <div className="grid-3" style={{ gap: '24px', alignItems: 'flex-start' }}>
        {/* Left 2 Cols: Cart Table */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="card" style={{ padding: '0px', overflowX: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: '#fafbfc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--dark)' }}>
                Trolley Items ({itemsCount} units)
              </h3>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Scale Check: <strong>{totalWeightKg} kg</strong> (Verified ✅)
              </span>
            </div>

            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🛒</div>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  Your Smart Trolley is currently empty
                </h4>
                <p style={{ fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
                  Use the quick scan buttons above or ask the AI Shopping Assistant to find products and add them directly!
                </p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.92rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '12px 16px' }}>Item</th>
                    <th style={{ padding: '12px 16px' }}>Unit Price</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Quantity</th>
                    <th style={{ padding: '12px 16px' }}>Savings</th>
                    <th style={{ padding: '12px 16px' }}>Total</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.product_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      {/* Product Name & Location */}
                      <td style={{ padding: '14px 16px' }}>
                        <strong style={{ color: '#0f172a' }}>{item.product_name}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {item.brand} &bull; {item.unit_spec}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#2563eb', marginTop: '2px' }}>
                          📍 {item.aisle_number} &bull; {item.shelf_location}
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                        Rs. {item.unit_price.toFixed(2)}
                      </td>

                      {/* Quantity Modifier */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.product_id, item.quantity - 1)}
                            style={{ padding: '6px 10px', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontWeight: 800 }}
                          >
                            -
                          </button>
                          <span style={{ padding: '6px 14px', fontWeight: 700, minWidth: '32px', textAlign: 'center' }}>
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.product_id, item.quantity + 1)}
                            style={{ padding: '6px 10px', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontWeight: 800 }}
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Savings */}
                      <td style={{ padding: '14px 16px' }}>
                        {item.discount_amount > 0 ? (
                          <div>
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>
                              -Rs. {item.discount_amount.toFixed(2)}
                            </span>
                            <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>
                              🏷️ {item.discount_offer}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>No discount</span>
                        )}
                      </td>

                      {/* Total */}
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#1e3a8a', fontSize: '1rem' }}>
                        Rs. {item.final_total.toFixed(2)}
                      </td>

                      {/* Remove Button */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemove(item.product_id)}
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1.1rem' }}
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right 1 Col: Billing Summary & Budget Control */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Senior Budget Controller Card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--dark)' }}>
                🎯 Budget Tracker
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingBudget(!isEditingBudget)}
                style={{ fontSize: '0.8rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
              >
                {isEditingBudget ? 'Cancel' : 'Edit Limit'}
              </button>
            </div>

            {isEditingBudget ? (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <input
                  type="number"
                  step="50"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
                <button type="button" onClick={handleSaveBudget} className="btn-success" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                  Save
                </button>
              </div>
            ) : (
              <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '12px' }}>
                Target Limit: <strong style={{ color: '#0f172a' }}>Rs. {budget.toFixed(2)}</strong>
              </div>
            )}

            {/* Gauge */}
            <div style={{ background: '#e2e8f0', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '8px' }}>
              <div
                style={{
                  width: `${Math.min(100, budgetPercent)}%`,
                  height: '100%',
                  background: budgetStatus === 'EXCEEDED' ? '#dc2626' : budgetPercent >= 80 ? '#d97706' : '#16a34a',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>

            <div style={{ fontSize: '0.85rem', color: budgetStatus === 'EXCEEDED' ? '#b91c1c' : '#475569', fontWeight: 600 }}>
              {budgetAlert}
            </div>
          </div>

          {/* Checkout & Bill Summary Card */}
          <div className="card" style={{ borderTop: '4px solid #2563eb' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--dark)', marginBottom: '16px' }}>
              🧾 Digital Bill Summary
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.95rem', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Items Subtotal:</span>
                <span>Rs. {rawSubtotal.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 600 }}>
                <span>Promotional Savings:</span>
                <span>-Rs. {totalSavings.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Estimated GST (5%):</span>
                <span>Rs. {taxAmount.toFixed(2)}</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '12px',
                  borderTop: '2px dashed var(--border)',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: '#1e3a8a'
                }}
              >
                <span>Grand Total:</span>
                <span>Rs. {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={itemsCount === 0 || checkoutLoading}
              className="btn-success"
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '1.1rem',
                fontWeight: 800,
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
              }}
            >
              {checkoutLoading ? 'Processing Checkout...' : '💳 Express Self-Checkout ➔'}
            </button>

            <div style={{ marginTop: '14px', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
              Smart Cart automatically applies best active deals and generates your verified exit pass.
            </div>
          </div>

          {/* AI Autonomous Cart Health & Deals Inspector Card */}
          <div className="card" style={{ border: '2px solid #6366f1', background: '#faf5ff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong style={{ color: '#4338ca', fontSize: '1.05rem' }}>
                🧠 AI Cart Health & Deal Inspector
              </strong>
              <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>RAG AUDITOR</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '12px' }}>
              Audits items in your trolley against senior dietary restrictions and identifies missed deals.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <select
                value={auditProfile}
                onChange={(e) => setAuditProfile(e.target.value)}
                style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
              >
                <option value="diabetic">🩸 Diabetic Friendly Check</option>
                <option value="heart">🫀 Heart & BP Health Check</option>
                <option value="lactose">🥛 Lactose Intolerance Check</option>
                <option value="general">🛒 General Balance & Deals</option>
              </select>

              <button
                type="button"
                onClick={handleRunAudit}
                disabled={auditLoading}
                className="btn-primary"
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                {auditLoading ? 'Auditing...' : 'Run Audit'}
              </button>
            </div>

            {auditResult && (
              <div style={{ background: 'white', padding: '14px', borderRadius: '10px', border: '1px solid #e9d5ff', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Basket Grade:</span>
                  <strong style={{ color: '#4338ca' }}>{auditResult.health_score}</strong>
                </div>

                {auditResult.warnings?.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    {auditResult.warnings.map((w, idx) => (
                      <div key={idx} style={{ color: '#b91c1c', fontSize: '0.8rem', marginBottom: '4px' }}>
                        {w}
                      </div>
                    ))}
                  </div>
                )}

                {auditResult.healthy_swaps?.length > 0 && (
                  <div style={{ background: '#f0fdf4', padding: '8px', borderRadius: '6px', border: '1px solid #bbf7d0', marginBottom: '8px' }}>
                    <strong style={{ color: '#16a34a', display: 'block', marginBottom: '2px', fontSize: '0.78rem' }}>
                      💡 Recommended In-Store Healthy Swap:
                    </strong>
                    {auditResult.healthy_swaps.map((s, idx) => (
                      <div key={idx} style={{ fontSize: '0.78rem', color: '#14532d' }}>
                        Swap <em>{s.original}</em> for <strong>{s.suggested}</strong> at <strong>{s.location}</strong>.
                      </div>
                    ))}
                  </div>
                )}

                {auditResult.deal_tips?.length > 0 && (
                  <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    {auditResult.deal_tips.map((d, idx) => (
                      <div key={idx} style={{ fontSize: '0.78rem', color: '#1e40af' }}>
                        {d}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Digital Receipt Modal */}
      {receipt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '520px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#ffffff',
              padding: '32px',
              borderRadius: '20px'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '6px' }}>🛒</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{receipt.store_name}</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Digital Self-Checkout Receipt & Verified Exit Pass</p>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                Invoice: <strong>{receipt.receipt_id}</strong> &bull; {receipt.date}
              </div>
            </div>

            {/* Itemized List */}
            <div style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '14px 0', marginBottom: '16px' }}>
              {receipt.items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '6px' }}>
                  <span>{it.product_name} x {it.quantity}</span>
                  <strong>Rs. {it.final_total.toFixed(2)}</strong>
                </div>
              ))}
            </div>

            {/* Total recap */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.92rem', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Subtotal:</span>
                <span>Rs. {receipt.raw_subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 600 }}>
                <span>Promotional Discounts:</span>
                <span>-Rs. {receipt.total_savings.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Tax (GST 5%):</span>
                <span>Rs. {receipt.tax_amount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: 800, color: '#1e3a8a', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                <span>Total Paid:</span>
                <span>Rs. {receipt.grand_total.toFixed(2)}</span>
              </div>
            </div>

            {/* Exit QR Code Token Box */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>
                VERIFIED EXIT PASS
              </div>
              <div style={{ background: 'white', display: 'inline-block', padding: '12px', borderRadius: '8px', border: '2px solid #0f172a' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '2px' }}>
                  [ {receipt.exit_qr_token} ]
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700, marginTop: '8px' }}>
                ✅ Scan at express exit barrier to leave without waiting in line!
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-outline"
                style={{ flex: 1, padding: '12px' }}
              >
                🖨️ Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="btn-primary"
                style={{ flex: 1, padding: '12px' }}
              >
                Done / New Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

