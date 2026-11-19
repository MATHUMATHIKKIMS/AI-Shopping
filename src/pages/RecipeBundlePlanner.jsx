import React, { useState, useEffect, useMemo } from 'react';
import { getRecipes, getRecipeBundle, addToCart, getRecipeBundlesDataset } from '../services/api';

export default function RecipeBundlePlanner({ onAddToCartSuccess, onLocateProduct }) {
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipeKey, setSelectedRecipeKey] = useState('biryani');
  const [bundleData, setBundleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingAll, setAddingAll] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Recipe Servings & Portion Budget States
  const [servings, setServings] = useState(4);
  const [pricingMode, setPricingMode] = useState('portion'); // 'portion' (100g adjusted) or 'retail' (full pack)
  
  // Selected product IDs in current bundle for customized shopping
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());
  const [showDatasetModal, setShowDatasetModal] = useState(false);
  const [datasetRecords, setDatasetRecords] = useState([]);
  const [datasetLoading, setDatasetLoading] = useState(false);

  // Category Metadata & Palette
  const CATEGORY_META = {
    'All':            { icon: '🍽️', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    'Vegetarian':     { icon: '🥬', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    'Non-Vegetarian': { icon: '🍗', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    'Breakfast':      { icon: '☀️', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    'Side Dish':      { icon: '🥥', color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' },
    'Dessert / Sweet':{ icon: '🍮', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
    'Breakfast & Wellness': { icon: '🥛', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
    'Special Dietary Care': { icon: '🥗', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' }
  };

  useEffect(() => {
    async function init() {
      try {
        const res = await getRecipes();
        setRecipes(res.recipes || []);
        loadBundle('biryani', 4, 'portion');
      } catch (e) {
        console.error('Error fetching recipes:', e);
      }
    }
    init();
  }, []);

  const loadBundle = async (key, targetServings = servings, mode = pricingMode) => {
    setSelectedRecipeKey(key);
    setLoading(true);
    try {
      const data = await getRecipeBundle(key, targetServings, mode);
      setBundleData(data);
      // Select all products by default when a bundle is loaded
      if (data && data.items) {
        setSelectedProductIds(new Set(data.items.map(it => it.product_id)));
      }
    } catch (e) {
      console.error('Error loading bundle:', e);
    } finally {
      setLoading(false);
    }
  };

  // Adjust servings dynamically
  const handleServingsChange = (newServings) => {
    const clamped = Math.min(12, Math.max(1, Number(newServings) || 4));
    setServings(clamped);
    loadBundle(selectedRecipeKey, clamped, pricingMode);
  };

  // Toggle pricing mode (portion budget vs full store pack)
  const handlePricingModeChange = (newMode) => {
    setPricingMode(newMode);
    loadBundle(selectedRecipeKey, servings, newMode);
  };

  // Toggle individual product selection
  const toggleProductSelection = (productId) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // Select all / Deselect all
  const selectAllProducts = () => {
    if (bundleData && bundleData.items) {
      setSelectedProductIds(new Set(bundleData.items.map(it => it.product_id)));
    }
  };

  const deselectAllProducts = () => {
    setSelectedProductIds(new Set());
  };

  // Copy selected products list to clipboard
  const handleCopySelected = () => {
    if (!bundleData || !bundleData.items) return;
    const selectedItems = bundleData.items.filter(it => selectedProductIds.has(it.product_id));
    if (selectedItems.length === 0) {
      alert('Please select at least one product to copy.');
      return;
    }
    const textList = selectedItems
      .map(it => `• ${it.product_name} (${pricingMode === 'portion' ? (it.portion_qty || it.quantity) : (it.store_package_qty || it.quantity)}) - ₹${Number(it.price).toFixed(2)} [${it.aisle_number}, ${it.shelf_location}]${it.is_portion_adjusted && pricingMode === 'portion' ? ` (Adjusted from ${it.store_package_qty})` : ''}`)
      .join('\n');
    const header = `${bundleData.recipe_title} (${bundleData.recipe_title_tamil || ''}) - ${servings} Servings Grocery Budget Checklist (Total: ₹${selectedCalculation.finalPrice.toFixed(2)}, ~₹${selectedCalculation.costPerServing.toFixed(2)}/serving):\n`;
    navigator.clipboard.writeText(header + textList)
      .then(() => {
        setActionNotice(`📋 Copied ${selectedItems.length} selected products to clipboard!`);
        setTimeout(() => setActionNotice(''), 3500);
      })
      .catch(() => alert('Failed to copy to clipboard.'));
  };

  // Add only selected products to trolley cart
  const handleAddSelectedToCart = async () => {
    if (!bundleData || !bundleData.items) return;
    const itemsToAdd = bundleData.items.filter(it => selectedProductIds.has(it.product_id));
    if (itemsToAdd.length === 0) {
      alert('Please select at least one product to add to your trolley.');
      return;
    }
    setAddingAll(true);
    try {
      for (const item of itemsToAdd) {
        await addToCart(item.product_id, 1);
      }
      setActionNotice(`🎉 Successfully added ${itemsToAdd.length} items for "${bundleData.recipe_title}" to your Smart Trolley!`);
      if (onAddToCartSuccess) onAddToCartSuccess();
      setTimeout(() => setActionNotice(''), 4500);
    } catch (err) {
      alert(`Error adding items to trolley: ${err.message}`);
    } finally {
      setAddingAll(false);
    }
  };

  // Download complete 20 Recipe Bundles dataset as JSON
  const handleDownloadDataset = async () => {
    setDatasetLoading(true);
    try {
      const res = await getRecipeBundlesDataset();
      const jsonStr = JSON.stringify(res.dataset || [], null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tamil_recipe_bundles_dataset_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setActionNotice('📥 Downloaded 20 Tamil Recipe Bundles Dataset JSON successfully!');
      setTimeout(() => setActionNotice(''), 4000);
    } catch (err) {
      console.error('Error downloading dataset:', err);
      alert('Failed to download dataset.');
    } finally {
      setDatasetLoading(false);
    }
  };

  // View dataset modal
  const handleViewDatasetModal = async () => {
    setShowDatasetModal(true);
    if (datasetRecords.length === 0) {
      setDatasetLoading(true);
      try {
        const res = await getRecipeBundlesDataset();
        setDatasetRecords(res.dataset || []);
      } catch (err) {
        console.error('Error fetching dataset records:', err);
      } finally {
        setDatasetLoading(false);
      }
    }
  };

  // Filtered recipe list
  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      const matchesCat = selectedCategory === 'All' || r.category === selectedCategory;
      const matchesQuery = !searchQuery.trim() ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.title_tamil && r.title_tamil.includes(searchQuery)) ||
        (r.bundle_id && r.bundle_id.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesQuery;
    });
  }, [recipes, selectedCategory, searchQuery]);

  // Unique categories for pills
  const availableCategories = useMemo(() => {
    const cats = ['All'];
    recipes.forEach(r => {
      if (r.category && !cats.includes(r.category)) {
        cats.push(r.category);
      }
    });
    return cats;
  }, [recipes]);

  // Dynamic pricing based on only selected products, servings & pricing mode
  const selectedCalculation = useMemo(() => {
    if (!bundleData || !bundleData.items) {
      return { count: 0, rawTotal: 0, savings: 0, finalPrice: 0, costPerServing: 0, budgetSaved: 0, retailTotal: 0 };
    }
    const selected = bundleData.items.filter(it => selectedProductIds.has(it.product_id));
    let rawTotal = 0;
    let savings = 0;
    let retailTotal = 0;

    for (const it of selected) {
      const price = Number(it.price) || 0;
      const storePrice = Number(it.store_package_price || it.price) || 0;
      rawTotal += price;
      retailTotal += storePrice;

      const offer = String(it.discount_offer || '');
      for (const [pct, frac] of [['15%', 0.15], ['12%', 0.12], ['10%', 0.10], ['8%', 0.08], ['5%', 0.05]]) {
        if (offer.includes(pct)) {
          savings += price * frac;
          break;
        }
      }
    }

    const finalPrice = Math.max(0, Math.round((rawTotal - savings) * 100) / 100);
    const currentServings = bundleData.servings || servings || 4;
    const costPerServing = currentServings > 0 ? Math.round((finalPrice / currentServings) * 100) / 100 : 0;
    const budgetSaved = Math.max(0, Math.round((retailTotal - finalPrice) * 100) / 100);

    return {
      count: selected.length,
      rawTotal: Math.round(rawTotal * 100) / 100,
      savings: Math.round(savings * 100) / 100,
      finalPrice,
      costPerServing,
      budgetSaved,
      retailTotal: Math.round(retailTotal * 100) / 100
    };
  }, [bundleData, selectedProductIds, servings]);

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)',
        color: 'white',
        padding: '28px',
        borderRadius: '16px',
        marginBottom: '28px',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '10px' }}>
              🌟 20 Authentic Tamil Nadu Recipe Bundles Linked to Supermarket Catalog
            </div>
            <h2 style={{ fontSize: '1.9rem', fontWeight: 800, margin: '0 0 8px 0' }}>
              🍲 RAG Smart Recipe & Meal Bundle Planner
            </h2>
            <p style={{ fontSize: '0.98rem', opacity: 0.95, maxWidth: '780px', margin: 0, lineHeight: 1.5 }}>
              Select any traditional Tamil Nadu recipe to retrieve all required grocery items from across supermarket aisles. Check off what you need, review discounted bundle savings, and add items directly to your Smart Trolley with unified product linking!
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleDownloadDataset}
              disabled={datasetLoading}
              style={{
                background: 'white',
                color: '#1e3a8a',
                padding: '10px 16px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              📥 Download 20 Bundles JSON
            </button>
            <button
              onClick={handleViewDatasetModal}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                padding: '10px 16px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: '1px solid rgba(255,255,255,0.4)'
              }}
            >
              📊 View Database Table
            </button>
          </div>
        </div>
      </div>

      {actionNotice && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#15803d',
          padding: '12px 18px',
          borderRadius: '12px',
          fontWeight: 700,
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '14px',
        marginBottom: '20px'
      }}>
        {/* Category Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {availableCategories.map(cat => {
            const isSelected = selectedCategory === cat;
            const meta = CATEGORY_META[cat] || { icon: '🍽️', color: '#2563eb' };
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  background: isSelected ? meta.color : 'white',
                  color: isSelected ? 'white' : '#334155',
                  border: isSelected ? `2px solid ${meta.color}` : '1px solid var(--border)',
                  padding: '8px 14px',
                  borderRadius: '24px',
                  fontSize: '0.86rem',
                  fontWeight: isSelected ? 800 : 600,
                  boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.15)' : 'none'
                }}
              >
                <span>{meta.icon}</span>
                <span>{cat}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{ minWidth: '240px', flex: '1 1 240px', maxWidth: '360px' }}>
          <input
            type="text"
            placeholder="🔍 Search recipe name or Tamil name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              fontSize: '0.9rem',
              background: 'white'
            }}
          />
        </div>
      </div>

      {/* 20 Recipes Horizontal/Grid Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '14px',
        marginBottom: '32px'
      }}>
        {filteredRecipes.map((r) => {
          const isSelected = selectedRecipeKey === r.id;
          const meta = CATEGORY_META[r.category] || { color: '#2563eb', bg: '#eff6ff' };
          return (
            <div
              key={r.id}
              onClick={() => loadBundle(r.id, servings, pricingMode)}
              className="card"
              style={{
                cursor: 'pointer',
                borderColor: isSelected ? meta.color : 'var(--border)',
                background: isSelected ? meta.bg : 'white',
                transform: isSelected ? 'scale(1.02)' : 'none',
                transition: 'all 0.2s ease',
                padding: '12px',
                boxShadow: isSelected ? `0 0 0 2px ${meta.color}` : 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Image thumbnail with fallback */}
              <div style={{
                width: '100%',
                height: '100px',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#f1f5f9',
                marginBottom: '10px',
                position: 'relative'
              }}>
                {r.image_url ? (
                  <img
                    src={r.image_url}
                    alt={r.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div style={{
                  display: r.image_url ? 'none' : 'flex',
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.5rem',
                  background: '#f8fafc'
                }}>
                  {r.icon || '🍲'}
                </div>

                {/* Bundle ID Badge on top-left of image */}
                <div style={{
                  position: 'absolute',
                  top: '6px',
                  left: '6px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 800
                }}>
                  {r.bundle_id || 'RB001'}
                </div>
              </div>

              <div>
                <strong style={{
                  fontSize: '0.92rem',
                  color: isSelected ? meta.color : '#0f172a',
                  display: 'block',
                  marginBottom: '2px',
                  lineHeight: 1.3
                }}>
                  {r.title}
                </strong>

                {r.title_tamil && (
                  <div style={{
                    fontSize: '0.82rem',
                    color: meta.color,
                    fontWeight: 700,
                    fontFamily: '"Noto Sans Tamil", serif',
                    marginBottom: '6px'
                  }}>
                    {r.title_tamil}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: meta.bg,
                  color: meta.color,
                  fontWeight: 700
                }}>
                  {r.items_count} items
                </span>
                {r.est_price > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#16a34a' }}>
                      ₹{r.est_price}
                    </div>
                    <div style={{ fontSize: '0.64rem', color: '#64748b' }}>
                      4 Servings (~₹{Math.round(r.est_price / 4)}/ea)
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Bundle Details Section */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px', color: '#64748b' }}>
          <div className="pulse-active" style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🍳</div>
          <div style={{ fontWeight: 600 }}>Retrieving grounded ingredients from supermarket catalog...</div>
        </div>
      ) : bundleData && (
        <div className="grid-3" style={{ gap: '24px', alignItems: 'flex-start' }}>
          
          {/* Left 2 Columns: Recipe Overview, Instructions & Checkable Ingredients */}
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Overview & Hero Image Card */}
            <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                
                {/* Hero Image */}
                <div style={{
                  flex: '1 1 260px',
                  minHeight: '220px',
                  background: '#f1f5f9',
                  position: 'relative'
                }}>
                  {bundleData.image_url ? (
                    <img
                      src={bundleData.image_url}
                      alt={bundleData.recipe_title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div style={{
                    display: bundleData.image_url ? 'none' : 'flex',
                    width: '100%',
                    height: '100%',
                    minHeight: '220px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '4.5rem',
                    background: '#f8fafc'
                  }}>
                    {bundleData.icon || '🍲'}
                  </div>

                  <span style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: '#0f172a',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 800
                  }}>
                    {bundleData.bundle_id}
                  </span>
                </div>

                {/* Details on Right */}
                <div style={{ flex: '2 1 300px', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                        {bundleData.recipe_title}
                      </h3>
                      {bundleData.recipe_title_tamil && (
                        <div style={{
                          fontSize: '1.15rem',
                          color: '#dc2626',
                          fontWeight: 700,
                          fontFamily: '"Noto Sans Tamil", serif',
                          marginBottom: '8px'
                        }}>
                          {bundleData.recipe_title_tamil}
                        </div>
                      )}
                    </div>
                    <span className="badge badge-primary" style={{ fontSize: '0.78rem' }}>
                      {bundleData.category}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.92rem', color: '#475569', marginBottom: '14px', lineHeight: 1.5 }}>
                    {bundleData.description}
                  </p>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: '#64748b', fontWeight: 600, flexWrap: 'wrap' }}>
                    <span>⏱️ Prep: {bundleData.prep_time}</span>
                    <span>👥 Serves: {servings} {servings === 1 ? 'Person' : 'People'}</span>
                    <span>📦 Products: {bundleData.bundle_items_count}</span>
                    <span style={{ color: pricingMode === 'portion' ? '#16a34a' : '#2563eb', fontWeight: 700 }}>
                      {pricingMode === 'portion' ? '🌿 100g Recipe Portion Budget' : '📦 Full Store Packs'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cooking Instructions Accordion/Box */}
              <div style={{ background: '#f8fafc', padding: '18px 24px', borderTop: '1px solid var(--border)' }}>
                <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block', marginBottom: '10px' }}>
                  👩‍🍳 Senior-Friendly Cooking Steps:
                </strong>
                <ol style={{ paddingLeft: '20px', fontSize: '0.88rem', color: '#334155', lineHeight: 1.6, margin: 0 }}>
                  {bundleData.instructions?.map((step, i) => (
                    <li key={i} style={{ marginBottom: '6px' }}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Servings & Recipe Budget Adjuster Controls */}
            <div className="card" style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              border: '2px solid #3b82f6',
              padding: '18px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.25rem' }}>⚖️</span>
                    <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                      Recipe Servings & Portion Budget Optimizer
                    </strong>
                    <span style={{
                      background: '#dbeafe',
                      color: '#1e40af',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 800
                    }}>
                      100g Smart Scaling
                    </span>
                  </div>
                  <p style={{ fontSize: '0.83rem', color: '#64748b', margin: '4px 0 0 0' }}>
                    Prices scale to the exact amount needed for your meal. Bulky store packages (e.g. 500g carrots) are adjusted down to recipe portions (e.g. 100g) so you only budget what you cook!
                  </p>
                </div>

                {/* Mode Toggle Buttons */}
                <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: '10px', padding: '3px' }}>
                  <button
                    type="button"
                    onClick={() => handlePricingModeChange('portion')}
                    style={{
                      background: pricingMode === 'portion' ? '#16a34a' : 'transparent',
                      color: pricingMode === 'portion' ? 'white' : '#475569',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: pricingMode === 'portion' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>🌿 Recipe Portion Budget</span>
                    <span style={{ fontSize: '0.7rem', background: pricingMode === 'portion' ? 'rgba(255,255,255,0.25)' : '#cbd5e1', padding: '1px 5px', borderRadius: '4px' }}>
                      Low Cost
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePricingModeChange('retail')}
                    style={{
                      background: pricingMode === 'retail' ? '#1e3a8a' : 'transparent',
                      color: pricingMode === 'retail' ? 'white' : '#475569',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: pricingMode === 'retail' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>📦 Full Store Packages</span>
                    <span style={{ fontSize: '0.7rem', background: pricingMode === 'retail' ? 'rgba(255,255,255,0.25)' : '#cbd5e1', padding: '1px 5px', borderRadius: '4px' }}>
                      Pantry Bulk
                    </span>
                  </button>
                </div>
              </div>

              {/* Servings Stepper & Fast Presets */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                paddingTop: '10px',
                borderTop: '1px dashed #cbd5e1'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>
                    👥 Adjust Servings:
                  </span>

                  <div style={{ display: 'inline-flex', alignItems: 'center', background: 'white', border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => handleServingsChange(servings - 1)}
                      disabled={servings <= 1}
                      style={{
                        width: '36px',
                        height: '36px',
                        background: servings <= 1 ? '#f8fafc' : '#f1f5f9',
                        color: servings <= 1 ? '#cbd5e1' : '#0f172a',
                        border: 'none',
                        fontSize: '1.2rem',
                        fontWeight: 800,
                        cursor: servings <= 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      −
                    </button>
                    <span style={{ minWidth: '105px', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem', color: '#1e3a8a' }}>
                      {servings} {servings === 1 ? 'Person' : 'Servings'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleServingsChange(servings + 1)}
                      disabled={servings >= 12}
                      style={{
                        width: '36px',
                        height: '36px',
                        background: servings >= 12 ? '#f8fafc' : '#f1f5f9',
                        color: servings >= 12 ? '#cbd5e1' : '#0f172a',
                        border: 'none',
                        fontSize: '1.2rem',
                        fontWeight: 800,
                        cursor: servings >= 12 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      +
                    </button>
                  </div>

                  {/* Quick Presets */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[2, 4, 6, 8].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleServingsChange(s)}
                        style={{
                          background: servings === s ? '#2563eb' : 'white',
                          color: servings === s ? 'white' : '#475569',
                          border: servings === s ? '1px solid #2563eb' : '1px solid #cbd5e1',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {s} {s === 4 ? '(Family)' : 'P'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Serving Cost Callout */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Estimated Per Person</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16a34a' }}>
                      ₹{selectedCalculation.costPerServing.toFixed(2)} / serving
                    </div>
                  </div>
                  {pricingMode === 'portion' && selectedCalculation.budgetSaved > 0 && (
                    <div style={{
                      background: '#dcfce7',
                      border: '1px solid #86efac',
                      color: '#15803d',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}>
                      🎉 Saves ₹{selectedCalculation.budgetSaved.toFixed(2)} vs store packs!
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Checkable Required Products Table */}
            <div className="card" style={{ padding: '0px', overflowX: 'auto' }}>
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                background: '#fafbfc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <strong style={{ fontSize: '1.1rem', color: '#0f172a', display: 'block' }}>
                    🛒 Required Products ({selectedCalculation.count}/{bundleData.bundle_items_count} selected)
                  </strong>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Uncheck any product you already have at home to customize your shopping bill.
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={selectAllProducts}
                    style={{
                      background: '#f1f5f9',
                      color: '#0f172a',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllProducts}
                    style={{
                      background: '#f1f5f9',
                      color: '#64748b',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}
                  >
                    Deselect All
                  </button>
                  <button
                    type="button"
                    onClick={handleCopySelected}
                    style={{
                      background: '#2563eb',
                      color: 'white',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}
                  >
                    📋 Copy Selected
                  </button>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.92rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '12px 16px', width: '40px', textAlign: 'center' }}>✓</th>
                    <th style={{ padding: '12px 16px' }}>Product & Brand</th>
                    <th style={{ padding: '12px 16px' }}>Supermarket Location</th>
                    <th style={{ padding: '12px 16px' }}>Recipe Portion / Size</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {bundleData.items?.map((item) => {
                    const isChecked = selectedProductIds.has(item.product_id);
                    return (
                      <tr
                        key={item.product_id}
                        onClick={() => toggleProductSelection(item.product_id)}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          background: isChecked ? 'white' : '#f8fafc',
                          opacity: isChecked ? 1 : 0.6,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by row onClick
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ color: '#0f172a' }}>{item.product_name}</strong>
                            <span style={{
                              fontSize: '0.7rem',
                              background: '#e2e8f0',
                              color: '#334155',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: 700
                            }}>
                              {item.product_id}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            {item.brand} &bull; {item.category}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ color: '#2563eb', fontWeight: 700 }}>
                            📍 {item.aisle_number}
                          </span>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{item.shelf_location}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                            {item.quantity}
                          </div>
                          {item.is_portion_adjusted && pricingMode === 'portion' ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                              <span style={{
                                fontSize: '0.7rem',
                                color: '#047857',
                                background: '#d1fae5',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 700
                              }}>
                                ⚡ Adjusted from {item.store_package_qty} pack
                              </span>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              Store pack: {item.store_package_qty || item.quantity}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <strong style={{ color: '#1e3a8a', fontSize: '0.98rem' }}>
                            ₹{Number(item.price).toFixed(2)}
                          </strong>
                          {item.is_portion_adjusted && pricingMode === 'portion' && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b', textDecoration: 'line-through' }}>
                              Pack: ₹{Number(item.store_package_price).toFixed(2)}
                            </div>
                          )}
                          {item.discount_offer && item.discount_offer !== 'No Offer' && (
                            <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>
                              {item.discount_offer}
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

          {/* Right 1 Column: Summary, Total Price & Aisle Walking Route */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Price & Checkout Card */}
            <div className="card" style={{ borderTop: '4px solid #16a34a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="badge badge-success">
                  {pricingMode === 'portion' ? '🌿 RECIPE PORTION BUDGET' : '📦 FULL STORE PACKS'}
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
                  {selectedCalculation.count} Products Selected
                </span>
              </div>

              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                Meal Budget Breakdown
              </h3>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '14px' }}>
                Serving {servings} {servings === 1 ? 'Person' : 'People'} ({pricingMode === 'portion' ? '100g Adjusted Portions' : 'Store Packaging'})
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.95rem', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Ingredients Total:</span>
                  <span>₹{selectedCalculation.rawTotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 700 }}>
                  <span>Promotional Discounts:</span>
                  <span>-₹{selectedCalculation.savings.toFixed(2)}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: '#1e3a8a',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border)'
                }}>
                  <span>Final Meal Budget:</span>
                  <span>₹{selectedCalculation.finalPrice.toFixed(2)}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: '#16a34a',
                  background: '#f0fdf4',
                  padding: '6px 10px',
                  borderRadius: '6px'
                }}>
                  <span>Cost per Serving:</span>
                  <span>₹{selectedCalculation.costPerServing.toFixed(2)} / person</span>
                </div>
              </div>

              {pricingMode === 'portion' && selectedCalculation.budgetSaved > 0 && (
                <div style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '0.82rem',
                  color: '#065f46',
                  fontWeight: 600,
                  marginBottom: '16px'
                }}>
                  🎉 <strong>Budget Saver:</strong> You save <strong>₹{selectedCalculation.budgetSaved.toFixed(2)}</strong> by purchasing exact recipe portions (e.g., 100g portions) instead of full store packages!
                </div>
              )}

              {pricingMode === 'retail' && (
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '0.8rem',
                  color: '#92400e',
                  marginBottom: '16px'
                }}>
                  📦 <strong>Full Store Packs:</strong> Whole sealed containers (500g / 1kg) will be purchased for your pantry. Switch to "Recipe Portion Budget" above to reduce your bill!
                </div>
              )}

              <button
                type="button"
                onClick={handleAddSelectedToCart}
                disabled={addingAll || selectedCalculation.count === 0}
                className="btn-success"
                style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 800 }}
              >
                {addingAll ? 'Adding to Trolley...' : `🛒 Add ${selectedCalculation.count} Selected to Trolley`}
              </button>
            </div>

            {/* Optimal Walking Itinerary Card */}
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                🚶 Optimal In-Store Walking Path
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '12px' }}>
                RAG sorts selected ingredients in supermarket aisle order for single forward-pass trolley navigation:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {bundleData.optimal_walking_itinerary?.map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: '#f8fafc',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      fontSize: '0.83rem'
                    }}
                  >
                    <span style={{
                      background: '#2563eb',
                      color: 'white',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      flexShrink: 0
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Info Card: Universal Product Linking */}
            <div className="card" style={{ background: '#f8fafc', border: '1px dashed var(--border)' }}>
              <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                💡 Smart Trolley Deduplication
              </strong>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Shared ingredients (like Onions, Tomatoes, Cooking Oil) are linked via canonical product IDs across all 20 bundles so you never buy unwanted duplicates!
              </p>
            </div>

          </div>
        </div>
      )}

      {/* Dataset Modal for 20 Bundles */}
      {showDatasetModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '960px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fafbfc'
            }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  📊 20 Tamil Recipe Bundles — Database Records ({datasetRecords.length} items)
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Normalized database linking: Product IDs, Quantities, Unit Amounts & Categories
                </span>
              </div>
              <button
                onClick={() => setShowDatasetModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {datasetLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Loading database records...
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px' }}>Bundle ID</th>
                      <th style={{ padding: '8px 12px' }}>Bundle Name</th>
                      <th style={{ padding: '8px 12px' }}>Category</th>
                      <th style={{ padding: '8px 12px' }}>Product ID</th>
                      <th style={{ padding: '8px 12px' }}>Product Name</th>
                      <th style={{ padding: '8px 12px' }}>Quantity</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Price (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datasetRecords.map((rec, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#2563eb' }}>{rec.bundle_id}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{rec.bundle_name}</td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{rec.category}</td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700 }}>{rec.product_id}</td>
                        <td style={{ padding: '8px 12px' }}>{rec.product_name}</td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>{rec.quantity}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#1e3a8a' }}>
                          ₹{Number(rec.product_price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              background: '#fafbfc'
            }}>
              <button
                type="button"
                onClick={handleDownloadDataset}
                style={{
                  background: '#2563eb',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 700
                }}
              >
                📥 Download as JSON
              </button>
              <button
                type="button"
                onClick={() => setShowDatasetModal(false)}
                style={{
                  background: '#e2e8f0',
                  color: '#334155',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 700
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
