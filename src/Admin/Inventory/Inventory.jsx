import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../Logout';
import { API_BASE_URL } from '../../../Config';
import { 
  FaPlus, FaEdit, FaTrash, FaChevronDown, FaChevronUp, 
  FaBoxOpen, FaTag, FaLayerGroup, FaTimes, FaCheck, FaSearch
} from 'react-icons/fa';
import Modal from 'react-modal';

Modal.setAppElement('#root');

export default function Inventory() {
  const [productTypes, setProductTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedType, setSelectedType] = useState('');
  
  const [newProductType, setNewProductType] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newAgentName, setNewAgentName] = useState('');
  
  const [form, setForm] = useState({ productName: '', price: '0', perCase: '' });

  const [brandSearch, setBrandSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState({ id: '', name: '', agent_name: '' });

  const [isBrandSectionOpen, setIsBrandSectionOpen] = useState(false);
  const [isTypeSectionOpen, setIsTypeSectionOpen] = useState(false);

  const [typeSearch, setTypeSearch] = useState('');
  const [editTypeModalOpen, setEditTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState({ oldName: '', newName: '' });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const brandsPerPage = 12;
  const typesPerPage = 12;
  const [currentTypePage, setCurrentTypePage] = useState(1);

  const fetchData = async () => {
    try {
      const [typeRes, brandRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/product-types`),
        fetch(`${API_BASE_URL}/api/brands`)
      ]);
      const types = await typeRes.json();
      const brandData = await brandRes.json();
      
      setProductTypes([...new Set(types.map(t => t.product_type).filter(Boolean))]);
      setBrands(brandData.map(b => ({ id: b.id, name: b.name, agent_name: b.agent_name || '' })));
    } catch (err) {
      setError('Failed to load data');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateProductType = async () => {
    if (!newProductType.trim()) return setError('Product type required');
    const formatted = newProductType.toLowerCase().trim().replace(/\s+/g, '_');
    if (productTypes.includes(formatted)) return setError('Already exists');

    try {
      await fetch(`${API_BASE_URL}/api/product-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_type: formatted })
      });
      setNewProductType('');
      setSuccess('Product type created!');
      setIsTypeSectionOpen(false);
      fetchData();
    } catch (err) {
      setError('Failed to create type');
    }
  };

  const handleCreateBrand = async () => {
    if (!newBrand.trim()) return setError('Brand name required');
    const formatted = newBrand.toLowerCase().trim().replace(/\s+/g, '_');
    if (brands.some(b => b.name === formatted)) return setError('Brand exists');

    try {
      await fetch(`${API_BASE_URL}/api/brands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: formatted, agent_name: newAgentName.trim() || null })
      });
      setNewBrand(''); 
      setNewAgentName('');
      setSuccess('Brand created!');
      setIsBrandSectionOpen(false);
      fetchData();
    } catch (err) {
      setError('Failed to create brand');
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!selectedBrand || !selectedType || !form.productName || form.price === '' || form.perCase === '') {
      return setError('All fields are required');
    }

    const payload = {
      productname: form.productName.trim(),
      product_type: selectedType,
      price: parseFloat(form.price),
      per_case: parseInt(form.perCase),
      brand: selectedBrand
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save product');
      }
      setSuccess('Product saved successfully!');
      setForm({ productName: '', price: '0', perCase: '' });
      setSelectedType('');
    } catch (err) {
      setError(err.message || 'Failed to save product');
    }
  };

  const handleUpdateBrand = async () => {
    const formatted = editingBrand.name.toLowerCase().trim().replace(/\s+/g, '_');
    try {
      await fetch(`${API_BASE_URL}/api/brands/${editingBrand.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: formatted, agent_name: editingBrand.agent_name || null })
      });
      setEditModalOpen(false);
      setSuccess('Brand updated');
      fetchData();
    } catch (err) {
      setError('Update failed');
    }
  };

  const handleDeleteBrand = async (id) => {
    if (!window.confirm('Delete this brand and all products?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/brands/${id}`, { method: 'DELETE' });
      setSuccess('Brand deleted');
      fetchData();
    } catch (err) {
      setError('Delete failed');
    }
  };

  const handleUpdateProductType = async () => {
    const newRaw = editingType.newName.trim();
    if (!newRaw) return setError("Name cannot be empty");

    try {
      const res = await fetch(`${API_BASE_URL}/api/product-types/${editingType.oldName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_type: newRaw })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Update failed');
      }

      setSuccess('Product type updated');
      setEditTypeModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to update');
    }
  };

  const handleDeleteProductType = async (type) => {
    if (!window.confirm(`Delete product type "${formatDisplay(type)}" and ALL products inside it?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/product-types/${type}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error();
      setSuccess(`Product type "${formatDisplay(type)}" deleted`);
      fetchData();
    } catch {
      setError('Failed to delete product type');
    }
  };

  const formatDisplay = (str) => str
    ? str.split(/[_\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    : '';

  const filteredBrands = brands.filter(b =>
    (b.name || '').toLowerCase().includes(brandSearch.toLowerCase()) ||
    (b.agent_name && b.agent_name.toLowerCase().includes(brandSearch.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredBrands.length / brandsPerPage) || 1;
  const paginatedBrands = filteredBrands.slice((currentPage - 1) * brandsPerPage, currentPage * brandsPerPage);

  const filteredTypes = productTypes.filter(t =>
    t.toLowerCase().includes(typeSearch.toLowerCase())
  );

  const totalTypePages = Math.ceil(filteredTypes.length / typesPerPage) || 1;
  const paginatedTypes = filteredTypes.slice((currentTypePage - 1) * typesPerPage, currentTypePage * typesPerPage);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 hundred:ml-64 p-4 md:p-8 pt-20 hundred:pt-8 transition-colors duration-200">
      <Sidebar />
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
                <FaBoxOpen className="text-xl" />
              </span>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                Catalog & Inventory Management
              </h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Configure master brands, product classifications, and register new item definitions.
            </p>
          </div>
          <Logout />
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-between text-sm">
            <span>{error}</span>
            <button onClick={() => setError('')} className="p-1 hover:text-white"><FaTimes /></button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-between text-sm">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="p-1 hover:text-white"><FaTimes /></button>
          </div>
        )}

        {/* Action Collapsible Drawers (Add Brand / Add Type) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {/* Add Brand Accordion */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <button
              onClick={() => setIsBrandSectionOpen(prev => !prev)}
              className="w-full p-5 flex justify-between items-center text-left font-bold text-base bg-slate-900 hover:bg-slate-850 text-white transition border-b border-slate-800/60"
            >
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <FaTag />
                </span>
                <span>Add New Brand</span>
              </div>
              {isBrandSectionOpen ? <FaChevronUp className="text-sm text-slate-400" /> : <FaChevronDown className="text-sm text-slate-400" />}
            </button>

            {isBrandSectionOpen && (
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Brand Name *</label>
                  <input
                    type="text"
                    value={newBrand}
                    onChange={e => setNewBrand(e.target.value)}
                    placeholder="e.g. Standard, Sony, GK"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Agent / Supplier Name (Optional)</label>
                  <input
                    type="text"
                    value={newAgentName}
                    onChange={e => setNewAgentName(e.target.value)}
                    placeholder="e.g. Sivakasi Depot"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <button
                  onClick={handleCreateBrand}
                  className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-sky-500/20 transition"
                >
                  Save Brand
                </button>
              </div>
            )}
          </div>

          {/* Add Product Type Accordion */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <button
              onClick={() => setIsTypeSectionOpen(prev => !prev)}
              className="w-full p-5 flex justify-between items-center text-left font-bold text-base bg-slate-900 hover:bg-slate-850 text-white transition border-b border-slate-800/60"
            >
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <FaLayerGroup />
                </span>
                <span>Add Product Classification</span>
              </div>
              {isTypeSectionOpen ? <FaChevronUp className="text-sm text-slate-400" /> : <FaChevronDown className="text-sm text-slate-400" />}
            </button>

            {isTypeSectionOpen && (
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Classification Name *</label>
                  <input
                    type="text"
                    value={newProductType}
                    onChange={e => setNewProductType(e.target.value)}
                    placeholder="e.g. Bijili, Multi Shot, Crackers"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={handleCreateProductType}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 transition"
                >
                  Save Product Type
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2-Step Product Creator Card */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 md:p-8 mb-10 shadow-2xl">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800 mb-6">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FaPlus />
            </span>
            <h2 className="text-lg font-bold text-white">Create New Product Definition</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Step 1: Choose Brand
              </label>
              <select
                value={selectedBrand}
                onChange={e => {
                  setSelectedBrand(e.target.value);
                  setSelectedType('');
                  setForm({ productName: '', price: '0', perCase: '' });
                }}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select a brand...</option>
                {brands.map(b => (
                  <option key={b.id} value={b.name}>
                    {formatDisplay(b.name)} {b.agent_name && `(${b.agent_name})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Step 2: Choose Classification
              </label>
              <select
                disabled={!selectedBrand}
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white disabled:opacity-40 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select product type...</option>
                {productTypes.map((t, idx) => (
                  <option key={`${t}-${idx}`} value={t}>{formatDisplay(t)}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedBrand && selectedType && (
            <form onSubmit={handleSaveProduct} className="pt-6 border-t border-slate-800/80">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Product Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. 28 Chorsa, 50 Shots"
                    value={form.productName}
                    onChange={e => setForm({ ...form, productName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Price per Box (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Pieces per Case *</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={form.perCase}
                    onChange={e => setForm({ ...form, perCase: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                >
                  Save Product to {formatDisplay(selectedBrand)}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Master Catalog Columns: All Brands & All Product Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Brands Management Card */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FaTag className="text-sky-400 text-xs" /> Master Brands ({brands.length})
              </h3>
            </div>

            <div className="relative mb-5">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
              <input
                type="text"
                placeholder="Filter brands or agents..."
                value={brandSearch}
                onChange={e => { setBrandSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {paginatedBrands.map(b => (
                <div key={b.id} className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between group hover:border-slate-700 transition">
                  <div className="truncate pr-2">
                    <p className="text-sm font-bold text-white truncate">{formatDisplay(b.name)}</p>
                    {b.agent_name && (
                      <span className="text-[11px] text-slate-400 block truncate">{b.agent_name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setEditingBrand(b); setEditModalOpen(true); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition"
                      title="Edit Brand"
                    >
                      <FaEdit className="text-xs" />
                    </button>
                    <button
                      onClick={() => handleDeleteBrand(b.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                      title="Delete Brand"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-xs text-slate-400">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 disabled:opacity-40"
                >
                  Prev
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Product Types Management Card */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FaLayerGroup className="text-indigo-400 text-xs" /> Product Classifications ({productTypes.length})
              </h3>
            </div>

            <div className="relative mb-5">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
              <input
                type="text"
                placeholder="Filter classifications..."
                value={typeSearch}
                onChange={e => { setTypeSearch(e.target.value); setCurrentTypePage(1); }}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {paginatedTypes.map((type, idx) => (
                <div key={`${type}-${idx}`} className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between group hover:border-slate-700 transition">
                  <span className="text-sm font-bold text-white truncate pr-2">{formatDisplay(type)}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingType({ oldName: type, newName: formatDisplay(type) });
                        setEditTypeModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition"
                      title="Rename Type"
                    >
                      <FaEdit className="text-xs" />
                    </button>
                    <button
                      onClick={() => handleDeleteProductType(type)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                      title="Delete Type"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalTypePages > 1 && (
              <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-xs text-slate-400">
                <button
                  onClick={() => setCurrentTypePage(p => Math.max(1, p - 1))}
                  disabled={currentTypePage === 1}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 disabled:opacity-40"
                >
                  Prev
                </button>
                <span>Page {currentTypePage} of {totalTypePages}</span>
                <button
                  onClick={() => setCurrentTypePage(p => Math.min(totalTypePages, p + 1))}
                  disabled={currentTypePage === totalTypePages}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Brand Edit Modal */}
        <Modal
          isOpen={editModalOpen}
          onRequestClose={() => setEditModalOpen(false)}
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          overlayClassName="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-40"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Edit Brand Details</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Brand Name</label>
                <input
                  type="text"
                  value={formatDisplay(editingBrand.name || '')}
                  onChange={e => setEditingBrand({ ...editingBrand, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Agent / Supplier</label>
                <input
                  type="text"
                  value={editingBrand.agent_name || ''}
                  onChange={e => setEditingBrand({ ...editingBrand, agent_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditModalOpen(false)} className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition">
                Cancel
              </button>
              <button onClick={handleUpdateBrand} className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-semibold transition">
                Update Brand
              </button>
            </div>
          </div>
        </Modal>

        {/* Type Edit Modal */}
        <Modal
          isOpen={editTypeModalOpen}
          onRequestClose={() => setEditTypeModalOpen(false)}
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          overlayClassName="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-40"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Rename Classification</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Classification Name</label>
                <input
                  type="text"
                  value={editingType.newName}
                  onChange={e => setEditingType({ ...editingType, newName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditTypeModalOpen(false)} className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition">
                Cancel
              </button>
              <button onClick={handleUpdateProductType} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition">
                Update Type
              </button>
            </div>
          </div>
        </Modal>

      </div>
    </div>
  );
}
