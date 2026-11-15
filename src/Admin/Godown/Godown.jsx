import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../Logout';
import { API_BASE_URL } from '../../../Config';
import { FaPlus, FaSpinner, FaTrash, FaCalendarAlt, FaWarehouse, FaBoxes, FaTimes } from 'react-icons/fa';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

export default function Godown() {
  const [godowns, setGodowns] = useState([]);
  const [brands, setBrands] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  const [rows, setRows] = useState([
    { id: Date.now(), godown: null, brand: null, productType: null, product: null, cases: '', addedDate: null, showPicker: false }
  ]);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [newGodownName, setNewGodownName] = useState('');

  const capitalize = (str) =>
    str ? str.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

  const getDateString = (date) => {
    if (!date) return new Date().toLocaleDateString('en-CA');
    return date.toLocaleDateString('en-CA');
  };

  const formatIST = (dbDateString) => {
    if (!dbDateString) return 'Today (default)';
    const d = new Date(dbDateString);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCasesAndPcs = (cases, perCase = 1) => {
    const pCase = Math.max(1, parseInt(perCase) || 1);
    const totalPcs = Math.round(parseFloat(cases || 0) * pCase);
    if (totalPcs <= 0) return '0cs';
    const fullCases = Math.floor(totalPcs / pCase);
    const loosePcs = totalPcs % pCase;
    if (fullCases > 0 && loosePcs > 0) {
      return `${fullCases}cs ${loosePcs}pcs`;
    }
    if (fullCases > 0) {
      return `${fullCases}cs`;
    }
    return `${loosePcs}pcs`;
  };

  const fetchGodowns = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/godowns`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setGodowns(data.map(g => ({ value: g.id, label: capitalize(g.name) })));
    } catch { setError('Failed to load godowns'); }
  }, []);

  const fetchBrands = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/brands`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setBrands(data.map(b => ({ value: b.name, label: capitalize(b.name) })));
    } catch { setError('Failed to load brands'); }
  }, []);

  const fetchAllProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setAllProducts(data.map(p => ({
        value: p.id,
        label: `${p.productname} (${capitalize(p.brand || '')})`,
        productname: p.productname,
        brand: p.brand,
        per_case: p.per_case,
        product_type: p.product_type,
      })));
    } catch { setError('Failed to load products'); }
  }, []);

  useEffect(() => {
    fetchGodowns();
    fetchBrands();
    fetchAllProducts();
  }, [fetchGodowns, fetchBrands, fetchAllProducts]);

  const addRow = () => {
    setRows(prev => [
      ...prev,
      { id: Date.now(), godown: null, brand: null, productType: null, product: null, cases: '', loose_pieces: '', addedDate: null, showPicker: false }
    ]);
  };

  const removeRow = (id) => {
    if (rows.length === 1) return;
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (field === 'brand') {
        updated.productType = null;
        updated.product = null;
      }
      if (field === 'productType') {
        updated.product = null;
      }
      return updated;
    }));
  };

  const getProductTypesForBrand = (brandName) => {
    const types = allProducts
      .filter(p => p.brand?.toLowerCase() === brandName.toLowerCase())
      .map(p => p.product_type);
    return [...new Set(types)].map(t => ({ value: t, label: capitalize(t) }));
  };

  const getProductsForBrandAndType = (brandName, typeName) => {
    return allProducts
      .filter(p =>
        p.brand?.toLowerCase() === brandName.toLowerCase() &&
        p.product_type?.toLowerCase() === typeName.toLowerCase()
      )
      .map(p => ({
        value: p.value,
        label: p.productname,
        per_case: p.per_case,
      }));
  };

  const handleCreateGodown = async () => {
    if (!newGodownName.trim()) { setError('Enter godown name'); return; }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/godowns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGodownName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to create godown');
      setSuccess('Godown created successfully!');
      setNewGodownName('');
      fetchGodowns();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleSubmitAll = async () => {
    setError(''); setSuccess('');
    const validRows = rows.filter(r =>
      r.godown && r.brand && r.productType && r.product &&
      (parseFloat(r.cases) > 0 || parseFloat(r.loose_pieces) > 0)
    );
    if (!validRows.length) {
      setError('Fill in all required fields and enter cases or loose pieces for at least one allocation');
      return;
    }

    const payload = validRows.map(r => {
      const pCase = parseFloat(r.product.per_case) || 1;
      const cVal = parseFloat(r.cases) || 0;
      const lVal = parseFloat(r.loose_pieces) || 0;
      const totalPieces = Math.round((cVal * pCase) + lVal);
      const effectiveCases = Math.round((totalPieces / pCase) * 10000) / 10000;
      return {
        godown_id: r.godown.value,
        product_type: r.productType.value,
        productname: r.product.label,
        brand: r.brand.value,
        per_case: pCase,
        cases: cVal,
        cases_added: effectiveCases,
        loose_pieces: lVal,
        added_date: getDateString(r.addedDate),
        added_by: localStorage.getItem('username') || 'Unknown',
      };
    });

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/stock/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message ?? 'Failed to allocate stock');
      setSuccess(`Successfully added stock to ${validRows.length} allocation(s)!`);
      setRows([{ id: Date.now(), godown: null, brand: null, productType: null, product: null, cases: '', loose_pieces: '', addedDate: null, showPicker: false }]);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: '#020617',
      borderColor: state.isFocused ? '#6366f1' : '#1e293b',
      borderRadius: '0.75rem',
      padding: '2px 4px',
      fontSize: '0.875rem',
      color: '#ffffff',
      boxShadow: state.isFocused ? '0 0 0 1px #6366f1' : 'none',
      '&:hover': {
        borderColor: '#334155',
      },
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: '#0f172a',
      borderColor: '#1e293b',
      borderWidth: '1px',
      borderRadius: '0.75rem',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
      zIndex: 99999,
    }),
    menuPortal: (base) => ({ ...base, zIndex: 99999 }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? '#4f46e5' : state.isFocused ? '#1e293b' : 'transparent',
      color: '#ffffff',
      fontSize: '0.875rem',
      cursor: 'pointer',
      padding: '8px 12px',
    }),
    singleValue: (base) => ({ ...base, color: '#f8fafc' }),
    input: (base) => ({ ...base, color: '#ffffff' }),
    placeholder: (base) => ({ ...base, color: '#64748b' }),
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 hundred:ml-64 p-4 md:p-8 pt-20 hundred:pt-8 transition-colors duration-200">
      <Sidebar />
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
                <FaWarehouse className="text-xl" />
              </span>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                Godown Stock Allocation
              </h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Create new warehouse locations and allocate inventory cases into specific godowns.
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

        {/* Section 1: Create New Godown */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 md:p-7 mb-8 shadow-xl">
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <FaWarehouse className="text-amber-400 text-sm" /> Create New Godown
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newGodownName}
              onChange={e => setNewGodownName(e.target.value)}
              placeholder="Enter godown name (e.g. Form House, Main Godown)..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
              disabled={loading}
            />
            <button
              onClick={handleCreateGodown}
              disabled={loading || !newGodownName.trim()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-sm font-semibold shadow-lg shadow-amber-500/20 disabled:opacity-40 transition flex items-center justify-center gap-2"
            >
              {loading ? <FaSpinner className="animate-spin text-sm" /> : <FaPlus className="text-xs" />} Save Godown
            </button>
          </div>
        </div>

        {/* Section 2: Inward Stock Allocations */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FaBoxes className="text-indigo-400" /> Stock Inward Allocations
            </h2>
            <button
              onClick={addRow}
              className="px-4 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-xs font-bold border border-indigo-500/30 flex items-center gap-1.5 transition"
            >
              <FaPlus className="text-xs" /> Add Another Row
            </button>
          </div>

          {rows.map((row, idx) => (
            <div
              key={row.id}
              className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 shadow-xl relative"
            >
              {rows.length > 1 && (
                <button
                  onClick={() => removeRow(row.id)}
                  className="absolute top-5 right-5 p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs transition border border-rose-500/20"
                  title="Remove this allocation row"
                >
                  <FaTrash />
                </button>
              )}

              <div className="mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                  Allocation #{idx + 1}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                {/* Godown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Godown *</label>
                  <Select
                    value={row.godown}
                    onChange={val => updateRow(row.id, 'godown', val)}
                    options={godowns}
                    placeholder="Select godown..."
                    isSearchable
                    styles={customSelectStyles}
                    menuPortalTarget={document.body}
                  />
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Brand *</label>
                  <Select
                    value={row.brand}
                    onChange={val => updateRow(row.id, 'brand', val)}
                    options={brands}
                    placeholder="Select brand..."
                    isSearchable
                    styles={customSelectStyles}
                    menuPortalTarget={document.body}
                  />
                </div>

                {/* Product Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Product Type *</label>
                  <Select
                    value={row.productType}
                    onChange={val => updateRow(row.id, 'productType', val)}
                    options={row.brand ? getProductTypesForBrand(row.brand.value) : []}
                    placeholder={row.brand ? "Select type..." : "First select brand"}
                    isDisabled={!row.brand}
                    isSearchable
                    styles={customSelectStyles}
                    menuPortalTarget={document.body}
                  />
                </div>

                {/* Product */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Product Title *</label>
                  <Select
                    value={row.product}
                    onChange={val => updateRow(row.id, 'product', val)}
                    options={row.brand && row.productType ? getProductsForBrandAndType(row.brand.value, row.productType.value) : []}
                    placeholder={!row.brand ? "Select brand" : !row.productType ? "Select type" : "Select product..."}
                    isDisabled={!row.brand || !row.productType}
                    isSearchable
                    styles={customSelectStyles}
                    menuPortalTarget={document.body}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-800/80">
                {/* Cases */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Cases</label>
                  <input
                    type="number"
                    min="0"
                    value={row.cases}
                    onChange={e => updateRow(row.id, 'cases', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    placeholder="e.g. 5"
                  />
                </div>

                {/* Loose Pieces */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Loose Pcs (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    value={row.loose_pieces}
                    onChange={e => updateRow(row.id, 'loose_pieces', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    placeholder="e.g. 20"
                  />
                </div>

                {/* Total Units Preview */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Total Quantity</label>
                  <div className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs text-emerald-400 font-bold flex items-center min-h-[42px]">
                    {row.product && (parseFloat(row.cases) > 0 || parseFloat(row.loose_pieces) > 0) ? (
                      (() => {
                        const pCase = parseFloat(row.product.per_case) || 1;
                        const cVal = parseFloat(row.cases) || 0;
                        const lVal = parseFloat(row.loose_pieces) || 0;
                        const tot = Math.round((cVal * pCase) + lVal);
                        const effectiveCs = tot / pCase;
                        return (
                          <span>
                            <strong>{tot} pcs</strong>
                            <span className="text-slate-400 font-normal ml-1">· {formatCasesAndPcs(effectiveCs, pCase)}</span>
                          </span>
                        );
                      })()
                    ) : (
                      <span className="text-slate-500 font-normal">—</span>
                    )}
                  </div>
                </div>

                {/* Added Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Inward Date</label>
                  <button
                    type="button"
                    onClick={() => updateRow(row.id, 'showPicker', !row.showPicker)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-sky-400 font-medium flex items-center justify-between hover:border-slate-700 transition"
                  >
                    <span className="flex items-center gap-2">
                      <FaCalendarAlt />
                      {row.addedDate ? formatIST(row.addedDate.toISOString()) : 'Today (default)'}
                    </span>
                    <span className="text-slate-500 text-[10px]">Change</span>
                  </button>

                  {row.showPicker && (
                    <div className="mt-2 relative z-50">
                      <DatePicker
                        selected={row.addedDate}
                        onChange={date => {
                          updateRow(row.id, 'addedDate', date);
                          updateRow(row.id, 'showPicker', false);
                        }}
                        inline
                        maxDate={new Date()}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
            <button
              onClick={addRow}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center justify-center gap-2"
            >
              <FaPlus className="text-xs" /> Add Another Allocation Row
            </button>

            <button
              onClick={handleSubmitAll}
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white text-sm font-bold shadow-xl shadow-indigo-500/25 disabled:opacity-40 transition-all hover:scale-[1.02]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <FaSpinner className="animate-spin text-sm" /> Saving Allocations...
                </span>
              ) : (
                'Add All Stock Allocations'
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
