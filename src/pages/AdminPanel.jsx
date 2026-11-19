import React, { useState, useEffect } from 'react';
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  rebuildIndex
} from '../services/api';

export default function AdminPanel() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    product_name: '',
    category: 'Grains & Staples',
    brand: '',
    price: '',
    quantity: '1 kg',
    product_description: '',
    availability: 'In Stock',
    discount_offer: 'No Offer',
    aisle_number: 'Aisle 1',
    shelf_location: 'Shelf A1',
    stock_units: 50
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts(100);
      setProducts(data.products || []);
    } catch (err) {
      console.error(err);
      setStatusMessage('Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  const handleRebuildIndex = async () => {
    setRebuilding(true);
    setStatusMessage('Rebuilding FAISS vector index with latest SQLite records...');
    try {
      const res = await rebuildIndex();
      setStatusMessage(`✅ FAISS Index rebuilt successfully! (${res.summary.total_products} items indexed, dim=${res.summary.dimension})`);
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (err) {
      setStatusMessage(`❌ Error rebuilding index: ${err.message}`);
    } finally {
      setRebuilding(false);
    }
  };

  const handleStartEdit = (prod) => {
    setEditingId(prod.product_id);
    setEditFormData({
      price: prod.price,
      availability: prod.availability,
      discount_offer: prod.discount_offer,
      aisle_number: prod.aisle_number,
      shelf_location: prod.shelf_location,
      stock_units: prod.stock_units || 50
    });
  };

  const handleSaveEdit = async (productId) => {
    try {
      await updateProduct(productId, editFormData);
      setStatusMessage(`✅ Updated product ${productId} successfully.`);
      setEditingId(null);
      await loadProducts();
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (err) {
      alert(`Error updating: ${err.message}`);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm(`Are you sure you want to delete product ${productId}?`)) return;
    try {
      await deleteProduct(productId);
      setStatusMessage(`Product ${productId} deleted.`);
      await loadProducts();
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (err) {
      alert(`Error deleting: ${err.message}`);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await addProduct(newProduct);
      setShowAddModal(false);
      setStatusMessage(`✅ Added product: ${newProduct.product_name}`);
      setNewProduct({
        product_name: '',
        category: 'Grains & Staples',
        brand: '',
        price: '',
        quantity: '1 kg',
        product_description: '',
        availability: 'In Stock',
        discount_offer: 'No Offer',
        aisle_number: 'Aisle 1',
        shelf_location: 'Shelf A1',
        stock_units: 50
      });
      await loadProducts();
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (err) {
      alert(`Error adding product: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Title & Top Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--dark)' }}>
            Supermarket Admin & Vector Database Manager
          </h2>
          <p style={{ fontSize: '1rem', color: '#64748b' }}>
            Manage supermarket inventory records, modify prices, update aisle assignments, and rebuild the FAISS vector index.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
            style={{ padding: '12px 20px' }}
          >
            ➕ Add New Product
          </button>
          <button
            onClick={handleRebuildIndex}
            className="btn-success"
            disabled={rebuilding}
            style={{ padding: '12px 20px' }}
          >
            {rebuilding ? '🔄 Rebuilding FAISS Index...' : '⚡ Rebuild Vector Index'}
          </button>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          style={{
            padding: '12px 20px',
            borderRadius: '10px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1e40af',
            marginBottom: '20px',
            fontWeight: 600
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'white',
              padding: '28px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Add New Supermarket Product</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', fontSize: '1.4rem', border: 'none', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={newProduct.product_name}
                  onChange={(e) => setNewProduct({ ...newProduct, product_name: e.target.value })}
                  placeholder="e.g. Organic Jasmine Rice"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
              </div>

              <div className="grid-2">
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Category *
                  </label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
                  >
                    <option value="Grains & Staples">Grains & Staples</option>
                    <option value="Cooking Oils & Ghee">Cooking Oils & Ghee</option>
                    <option value="Dairy & Eggs">Dairy & Eggs</option>
                    <option value="Snacks & Biscuits">Snacks & Biscuits</option>
                    <option value="Personal Care">Personal Care</option>
                    <option value="Fruits & Vegetables">Fruits & Vegetables</option>
                    <option value="Household & Cleaning">Household & Cleaning</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Brand
                  </label>
                  <input
                    type="text"
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                    placeholder="e.g. Heritage"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Price (Rs.) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    placeholder="e.g. 120.00"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Quantity Unit
                  </label>
                  <input
                    type="text"
                    value={newProduct.quantity}
                    onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                    placeholder="e.g. 1 kg, 500 ml"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Aisle Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProduct.aisle_number}
                    onChange={(e) => setNewProduct({ ...newProduct, aisle_number: e.target.value })}
                    placeholder="e.g. Aisle 1"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Shelf Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProduct.shelf_location}
                    onChange={(e) => setNewProduct({ ...newProduct, shelf_location: e.target.value })}
                    placeholder="e.g. Shelf A1"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Discount / Promotional Offer
                </label>
                <input
                  type="text"
                  value={newProduct.discount_offer}
                  onChange={(e) => setNewProduct({ ...newProduct, discount_offer: e.target.value })}
                  placeholder="e.g. 10% OFF or No Offer"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Product Description
                </label>
                <textarea
                  rows="3"
                  value={newProduct.product_description}
                  onChange={(e) => setNewProduct({ ...newProduct, product_description: e.target.value })}
                  placeholder="Detailed description for rich semantic embedding search..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save & Index Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Products Management Table */}
      <div className="card" style={{ padding: '0px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.92rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '14px 16px' }}>ID</th>
              <th style={{ padding: '14px 16px' }}>Product</th>
              <th style={{ padding: '14px 16px' }}>Category</th>
              <th style={{ padding: '14px 16px' }}>Price (Rs.)</th>
              <th style={{ padding: '14px 16px' }}>Availability</th>
              <th style={{ padding: '14px 16px' }}>Offer</th>
              <th style={{ padding: '14px 16px' }}>Location</th>
              <th style={{ padding: '14px 16px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '32px' }}>Loading products...</td>
              </tr>
            ) : products.map((p) => {
              const isEditing = editingId === p.product_id;
              return (
                <tr key={p.product_id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--muted)' }}>
                    {p.product_id}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <strong style={{ color: 'var(--dark)' }}>{p.product_name}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.brand} ({p.quantity})</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{p.category}</td>

                  {/* Price */}
                  <td style={{ padding: '12px 16px' }}>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.5"
                        value={editFormData.price}
                        onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                        style={{ width: '80px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}
                      />
                    ) : (
                      <strong style={{ color: '#1e3a8a' }}>Rs. {Number(p.price).toFixed(2)}</strong>
                    )}
                  </td>

                  {/* Availability */}
                  <td style={{ padding: '12px 16px' }}>
                    {isEditing ? (
                      <select
                        value={editFormData.availability}
                        onChange={(e) => setEditFormData({ ...editFormData, availability: e.target.value })}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}
                      >
                        <option value="In Stock">In Stock</option>
                        <option value="Low Stock">Low Stock</option>
                        <option value="Out of Stock">Out of Stock</option>
                      </select>
                    ) : (
                      <span
                        className={`badge ${p.availability === 'In Stock' ? 'badge-success' : p.availability === 'Low Stock' ? 'badge-warning' : 'badge-danger'}`}
                        style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                      >
                        {p.availability}
                      </span>
                    )}
                  </td>

                  {/* Offer */}
                  <td style={{ padding: '12px 16px' }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.discount_offer}
                        onChange={(e) => setEditFormData({ ...editFormData, discount_offer: e.target.value })}
                        style={{ width: '120px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}
                      />
                    ) : (
                      <span style={{ fontSize: '0.85rem' }}>{p.discount_offer}</span>
                    )}
                  </td>

                  {/* Location */}
                  <td style={{ padding: '12px 16px' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          type="text"
                          value={editFormData.aisle_number}
                          onChange={(e) => setEditFormData({ ...editFormData, aisle_number: e.target.value })}
                          style={{ width: '70px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border)' }}
                        />
                        <input
                          type="text"
                          value={editFormData.shelf_location}
                          onChange={(e) => setEditFormData({ ...editFormData, shelf_location: e.target.value })}
                          style={{ width: '70px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border)' }}
                        />
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.85rem' }}>{p.aisle_number}, {p.shelf_location}</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(p.product_id)}
                          className="btn-success"
                          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="btn-outline"
                          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(p)}
                          className="btn-outline"
                          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.product_id)}
                          className="btn-danger"
                          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

