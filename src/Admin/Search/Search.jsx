import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../Logout';
import { API_BASE_URL } from '../../../Config';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaWarehouse, FaBoxOpen, FaEye, FaFilter, FaTimes } from 'react-icons/fa';

export default function Search() {
  const [productTypes, setProductTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [searchName, setSearchName] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const capitalize = str => 
    str ? str.split(/[_\s]+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ') : '';

  const fetchProductTypes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/product-types`);
      if (!response.ok) throw new Error('Failed to fetch product types');
      const data = await response.json();
      setProductTypes(data.map(t => t.product_type).filter(Boolean));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSearch = async () => {
    if (selectedType === 'all' && !searchName.trim()) {
      setError('Please select a product type or enter a product name');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedType !== 'all') params.append('type', selectedType);
      if (searchName.trim()) params.append('name', searchName.trim());

      const url = `${API_BASE_URL}/api/search?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to search products');
      const data = await response.json();
      setResults(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-search on type change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (selectedType !== 'all') handleSearch();
    }, 250);
    return () => clearTimeout(timeoutId);
  }, [selectedType]);

  // Auto-search on name change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchName.trim() || selectedType !== 'all') handleSearch();
    }, 350);
    return () => clearTimeout(timeoutId);
  }, [searchName]);

  const handleViewGodown = (godownId) => {
    navigate(`/view-stocks/${godownId}`);
  };

  useEffect(() => {
    fetchProductTypes();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 hundred:ml-64 p-4 md:p-8 pt-20 hundred:pt-8 transition-colors duration-200">
      <Sidebar />
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-inner">
                <FaSearch className="text-xl" />
              </span>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                Search Products Across Godowns
              </h1>
              {results.length > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  {results.length} found
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Locate stocks across any godown instantly by product name, brand, or category.
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

        {/* Search Controls Card */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 md:p-5 mb-8 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            <div className="md:col-span-5 relative">
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="w-full appearance-none px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all pr-10"
              >
                <option value="all">All Product Types</option>
                {[...new Set(productTypes)].map((t, idx) => (
                  <option key={`${t}-${idx}`} value={t}>{capitalize(t)}</option>
                ))}
              </select>
              <FaFilter className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
            </div>

            <div className="md:col-span-5 relative">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text"
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
                placeholder="Type product name (e.g. 28 Chorsa)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
              />
              {searchName && (
                <button onClick={() => setSearchName('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  <FaTimes className="text-xs" />
                </button>
              )}
            </div>

            <div className="md:col-span-2">
              <button
                onClick={handleSearch}
                disabled={loading || (selectedType === 'all' && !searchName.trim())}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-sky-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </div>

        {/* Results View */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-9 w-9 border-4 border-sky-500/30 border-t-sky-500 mb-4" />
            <p className="text-slate-400 font-medium">Querying godowns...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="bg-slate-900/70 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Product Name</th>
                    <th className="px-5 py-3.5">Brand</th>
                    <th className="px-5 py-3.5">Godown Location</th>
                    <th className="px-5 py-3.5 text-center">Available Cases</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {results.map((r, index) => (
                    <tr key={index} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 font-bold text-white flex items-center gap-2.5">
                        <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                          <FaBoxOpen className="text-xs" />
                        </span>
                        {r.productname}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          {capitalize(r.brand)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-200 font-medium flex items-center gap-2">
                        <FaWarehouse className="text-amber-400 text-xs" />
                        {capitalize(r.godown_name)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-block px-3 py-1 rounded-xl text-xs font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          {r.current_cases} cs
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleViewGodown(r.godown_id)}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 border border-slate-700 transition"
                        >
                          <FaEye className="text-xs text-sky-400" /> View Godown
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/40 rounded-3xl border border-slate-800/80 p-12 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto mb-4 border border-sky-500/20">
              <FaSearch className="text-2xl" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">No products found</h3>
            <p className="text-xs text-slate-400">
              {selectedType === 'all' && !searchName.trim()
                ? 'Select a product type above or type a name to begin searching across godowns.'
                : 'No stock records matched your query. Try broadening your search.'}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
