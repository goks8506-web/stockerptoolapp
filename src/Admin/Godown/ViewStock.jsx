import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../Logout';
import { API_BASE_URL } from '../../../Config';
import { 
  FaWarehouse, FaEye, FaEdit, FaTrash, FaSpinner, FaSearch, 
  FaBox, FaPlus, FaTimes, FaCheck, FaBoxes
} from 'react-icons/fa';

export default function ViewStock() {
  const [godowns, setGodowns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const navigate = useNavigate();

  const userType = (localStorage.getItem('userType') || 'worker').toLowerCase();
  const isWorkerOrAgent = ['worker', 'agent'].includes(userType);
  const isAdmin = userType === 'admin';

  const capitalize = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str
      .toLowerCase()
      .split(/[_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const fetchGodowns = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/godowns/fast`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setGodowns(data || []);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load godowns. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGodowns();
  }, []);

  const filteredGodowns = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return godowns;
    return godowns.filter(g => (g.name || '').toLowerCase().includes(query));
  }, [godowns, searchQuery]);

  const totalPages = Math.ceil(filteredGodowns.length / itemsPerPage) || 1;
  const paginatedGodowns = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGodowns.slice(start, start + itemsPerPage);
  }, [filteredGodowns, currentPage, itemsPerPage]);

  const handleView = (id) => navigate(`/view-stocks/${id}`);

  const startEdit = (id, currentName) => {
    setEditingId(id);
    setEditName(capitalize(currentName));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEdit = async (id) => {
    if (!editName.trim()) return;
    try {
      const formattedName = editName.trim().toLowerCase().replace(/\s+/g, '_');
      const res = await fetch(`${API_BASE_URL}/api/godowns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formattedName }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update godown');
      }
      setEditingId(null);
      fetchGodowns();
    } catch (err) {
      alert(err.message);
    }
  };

  const openDeleteModal = (id, name) => {
    setDeleteModal({ open: true, id, name });
  };

  const confirmDelete = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/godowns/${deleteModal.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to delete godown');
      }
      setDeleteModal({ open: false, id: null, name: '' });
      fetchGodowns();
    } catch (err) {
      alert(err.message);
    }
  };

  const formatStockTotal = (fullCases = 0, loosePcs = 0) => {
    const f = parseInt(fullCases) || 0;
    const l = parseInt(loosePcs) || 0;
    if (f > 0 && l > 0) return `${f}cs ${l}pcs`;
    if (f > 0) return `${f}cs`;
    if (l > 0) return `${l}pcs`;
    return '0cs';
  };

  const totalFullCasesAll = useMemo(() => {
    return filteredGodowns.reduce((sum, g) => {
      if (g.total_full_cases !== undefined) return sum + (parseInt(g.total_full_cases) || 0);
      return sum + Math.floor(parseFloat(g.total_cases || 0));
    }, 0);
  }, [filteredGodowns]);

  const totalLoosePcsAll = useMemo(() => {
    return filteredGodowns.reduce((sum, g) => {
      if (g.total_loose_pcs !== undefined) return sum + (parseInt(g.total_loose_pcs) || 0);
      return sum;
    }, 0);
  }, [filteredGodowns]);

  const totalCasesAll = useMemo(() => {
    return Math.round(filteredGodowns.reduce((sum, g) => sum + parseFloat(g.total_cases || 0), 0) * 100) / 100;
  }, [filteredGodowns]);

  const totalDistinctProductsAll = useMemo(() => {
    return filteredGodowns.reduce((sum, g) => sum + parseInt(g.distinct_products || g.stock_items || 0), 0);
  }, [filteredGodowns]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 hundred:ml-64 p-4 md:p-8 pt-20 hundred:pt-8 transition-colors duration-200">
      <Sidebar />
      <div className="max-w-7xl mx-auto">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
                <FaWarehouse className="text-xl" />
              </span>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                {isWorkerOrAgent ? 'My Godowns' : 'Godown Stock Overview'}
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {filteredGodowns.length} warehouses
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Real-time multi-godown stock distribution, case metrics, and inventory transfers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={() => navigate('/godown')}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <FaPlus className="text-xs" /> Inward Stock
              </button>
            )}
            <Logout />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-between text-sm">
            <span>{error}</span>
            <button onClick={() => setError('')} className="p-1 hover:text-white"><FaTimes /></button>
          </div>
        )}

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Cases Across Warehouses</p>
              <p className="text-3xl font-black text-white mt-1">
                {formatStockTotal(totalFullCasesAll, totalLoosePcsAll)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FaBoxes className="text-2xl" />
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Distinct Product Lines In Stock</p>
              <p className="text-3xl font-black text-white mt-1">
                {totalDistinctProductsAll} <span className="text-sm font-normal text-slate-400">SKUs</span>
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FaBox className="text-2xl" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 mb-8 shadow-xl">
          <div className="relative max-w-md">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Filter by godown name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                <FaTimes className="text-xs" />
              </button>
            )}
          </div>
        </div>

        {/* Godown Cards Grid */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-amber-500/30 border-t-amber-500 mb-4" />
            <p className="text-slate-400 font-medium">Loading godowns data...</p>
          </div>
        ) : paginatedGodowns.length === 0 ? (
          <div className="bg-slate-900/40 rounded-3xl border border-slate-800/80 p-12 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
              <FaWarehouse className="text-2xl" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">No godowns match your search</h3>
            <p className="text-xs text-slate-400">Try adjusting your search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {paginatedGodowns.map(g => (
              <div
                key={g.id}
                className="group relative bg-slate-900/70 hover:bg-slate-900/90 rounded-2xl border border-slate-800/80 hover:border-slate-700 p-5 shadow-lg hover:shadow-2xl hover:shadow-amber-500/5 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {editingId === g.id ? (
                    <div className="space-y-3 mb-4">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveEdit(g.id)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(g.id)}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1 transition"
                        >
                          <FaCheck className="text-xs" /> Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <FaWarehouse className="text-sm" />
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          ID: #{g.id}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white tracking-tight group-hover:text-amber-400 transition-colors truncate mb-4">
                        {capitalize(g.name)}
                      </h3>

                      <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 mb-5">
                        <div>
                          <span className="text-[10px] font-medium text-slate-400 block uppercase tracking-wider">Total Stock</span>
                          <span className="text-base font-black text-amber-400">
                            {formatStockTotal(g.total_full_cases !== undefined ? g.total_full_cases : Math.floor(parseFloat(g.total_cases || 0)), g.total_loose_pcs || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-medium text-slate-400 block uppercase tracking-wider">SKUs</span>
                          <span className="text-sm font-bold text-slate-200">
                            {g.distinct_products ?? g.stock_items ?? 0}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {editingId !== g.id && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                    <button
                      onClick={() => handleView(g.id)}
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <FaEye className="text-xs" /> View Stock
                    </button>

                    {isAdmin && (
                      <>
                        <button
                          onClick={() => startEdit(g.id, g.name)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition"
                          title="Rename Godown"
                        >
                          <FaEdit className="text-xs" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(g.id, g.name)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 border border-rose-500/20 text-xs transition"
                          title="Delete Godown"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                <FaTrash className="text-lg" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Delete Godown</h3>
              <p className="text-xs text-slate-400 mb-6">
                Are you sure you want to delete <span className="font-semibold text-white">{capitalize(deleteModal.name)}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModal({ open: false, id: null, name: '' })}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition shadow-lg shadow-rose-600/20"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
