import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../Logout';
import { API_BASE_URL } from '../../../Config';
import { 
  FaWarehouse, FaEye, FaEdit, FaTrash, FaSpinner, FaSearch, 
  FaBox, FaPlus, FaTimes, FaCheck, FaBoxes, FaTruck, FaFilePdf,
  FaCalendarAlt, FaChevronDown, FaChevronUp, FaExchangeAlt, FaArrowRight
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

  const formatCasesAndPcs = (cases, perCase = 1) => {
    const pCase = Math.max(1, parseInt(perCase) || 1);
    const totalPcs = Math.round(parseFloat(cases || 0) * pCase);
    if (totalPcs <= 0) return '0cs';
    const fullCases = Math.floor(totalPcs / pCase);
    const loosePcs = totalPcs % pCase;
    if (fullCases > 0 && loosePcs > 0) return `${fullCases}cs ${loosePcs}pcs`;
    if (fullCases > 0) return `${fullCases}cs`;
    return `${loosePcs}pcs`;
  };

  // ─── Multi-Product Transfer State ─────────────────────────────────────
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [availableStocks, setAvailableStocks] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [selectedTransferItems, setSelectedTransferItems] = useState([]);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferSuccessChallans, setTransferSuccessChallans] = useState(null);
  const [showTransportDetails, setShowTransportDetails] = useState(false);
  const [transportName, setTransportName] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [deliveryPerson, setDeliveryPerson] = useState('');
  const [transferDate, setTransferDate] = useState('');

  const fetchAvailableStocks = async () => {
    setLoadingAvailable(true);
    setTransferError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/stock/available-to-transfer`);
      if (!res.ok) throw new Error('Failed to fetch available stocks');
      const data = await res.json();
      setAvailableStocks(data || []);
    } catch (err) {
      console.error(err);
      setTransferError('Could not load available stocks');
    } finally {
      setLoadingAvailable(false);
    }
  };

  const openMultiTransferModal = () => {
    setTransferModalOpen(true);
    setStockSearchQuery('');
    setSelectedTransferItems([]);
    setTransferError('');
    setTransferSuccessChallans(null);
    setShowTransportDetails(false);
    setTransportName('');
    setLrNumber('');
    setDeliveryPerson('');
    setTransferDate(new Date().toISOString().split('T')[0]);
    fetchAvailableStocks();
  };

  const handleAddStockToTransfer = (stock) => {
    const validTargets = godowns.filter(g => g.id !== stock.godown_id);
    const alreadyChosenTargets = new Set(
      selectedTransferItems
        .filter(i => i.stock_id === stock.stock_id)
        .map(i => parseInt(i.target_godown_id))
    );
    const firstUnused = validTargets.find(g => !alreadyChosenTargets.has(g.id));
    const defaultTarget = firstUnused ? firstUnused.id : (validTargets.length > 0 ? validTargets[0].id : '');

    const newRowId = `${stock.stock_id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    setSelectedTransferItems(prev => [
      ...prev,
      {
        row_id: newRowId,
        stock_id: stock.stock_id,
        productname: stock.productname,
        brand: stock.brand,
        product_type: stock.product_type,
        godown_id: stock.godown_id,
        godown_name: stock.godown_name,
        per_case: stock.per_case || 1,
        total_pieces: stock.total_pieces,
        current_cases: stock.current_cases,
        full_cases: stock.full_cases,
        loose_pieces_avail: stock.loose_pieces,
        target_godown_id: defaultTarget,
        cases_to_transfer: '',
        loose_to_transfer: ''
      }
    ]);
  };

  const handleRemoveTransferItem = (row_id) => {
    setSelectedTransferItems(prev => prev.filter(item => item.row_id !== row_id));
  };

  const handleUpdateTransferItem = (row_id, field, value) => {
    setSelectedTransferItems(prev => prev.map(item => {
      if (item.row_id === row_id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const getProductTotalAllocatedPcs = (stock_id) => {
    return selectedTransferItems
      .filter(i => i.stock_id === stock_id)
      .reduce((sum, i) => {
        const p = Math.max(1, parseInt(i.per_case) || 1);
        const c = parseFloat(i.cases_to_transfer) || 0;
        const l = parseFloat(i.loose_to_transfer) || 0;
        return sum + Math.round((c * p) + l);
      }, 0);
  };

  const filteredAvailableStocks = useMemo(() => {
    const q = stockSearchQuery.toLowerCase().trim();
    if (!q) return availableStocks.slice(0, 15);
    return availableStocks.filter(s =>
      (s.productname || '').toLowerCase().includes(q) ||
      (s.brand || '').toLowerCase().includes(q) ||
      (s.godown_name || '').toLowerCase().includes(q) ||
      (s.product_type || '').toLowerCase().includes(q)
    ).slice(0, 30);
  }, [availableStocks, stockSearchQuery]);

  const handleExecuteMultiTransfer = async () => {
    setTransferError('');
    if (selectedTransferItems.length === 0) {
      setTransferError('Please select at least one product to transfer.');
      return;
    }

    const seenRoutes = new Set();
    const productAllocatedPcs = {};

    for (const item of selectedTransferItems) {
      if (!item.target_godown_id) {
        setTransferError(`Please select a target godown for ${item.productname}.`);
        return;
      }
      if (parseInt(item.target_godown_id) === parseInt(item.godown_id)) {
        setTransferError(`Target godown cannot be the same as source godown for ${item.productname}.`);
        return;
      }

      const routeKey = `${item.stock_id}_to_${item.target_godown_id}`;
      if (seenRoutes.has(routeKey)) {
        const targetG = godowns.find(g => g.id === parseInt(item.target_godown_id));
        setTransferError(`Duplicate destination: Multiple rows for ${item.productname} sending to ${capitalize(targetG?.name || 'the same godown')}. Please combine the counts or choose a different destination.`);
        return;
      }
      seenRoutes.add(routeKey);

      const pCase = Math.max(1, parseInt(item.per_case) || 1);
      const cVal = parseFloat(item.cases_to_transfer) || 0;
      const lVal = parseFloat(item.loose_to_transfer) || 0;
      const totalPcs = Math.round((cVal * pCase) + lVal);

      if (totalPcs <= 0) {
        setTransferError(`Please enter cases or pieces to transfer for ${item.productname}.`);
        return;
      }

      productAllocatedPcs[item.stock_id] = (productAllocatedPcs[item.stock_id] || 0) + totalPcs;
      if (productAllocatedPcs[item.stock_id] > item.total_pieces) {
        setTransferError(`Total transfer quantity across destinations for ${item.productname} (${item.godown_name}) exceeds available stock (${formatCasesAndPcs(item.current_cases, pCase)}).`);
        return;
      }
    }

    const username = localStorage.getItem('username') || 'Unknown';
    setTransferring(true);

    try {
      const payload = {
        added_by: username,
        transfer_date: transferDate || new Date().toISOString().split('T')[0],
        transport_name: transportName.trim() || null,
        lr_number: lrNumber.trim() || null,
        delivery_person: deliveryPerson.trim() || null,
        transfers: selectedTransferItems.map(item => ({
          source_stock_id: item.stock_id,
          target_godown_id: parseInt(item.target_godown_id),
          cases: parseFloat(item.cases_to_transfer) || 0,
          loose_pieces_transferred: parseFloat(item.loose_to_transfer) || 0
        }))
      };

      const res = await fetch(`${API_BASE_URL}/api/stock/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Transfer failed');

      setTransferSuccessChallans(data.challans || [{ id: data.challan_id, number: data.challan_number }]);
      await fetchGodowns();
    } catch (err) {
      setTransferError(err.message || 'Failed to complete transfer');
    } finally {
      setTransferring(false);
    }
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
              <>
                <button
                  onClick={openMultiTransferModal}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  title="Search stock and transfer multiple products between godowns"
                >
                  <FaTruck className="text-xs" /> Transfer Stock
                </button>
                <button
                  onClick={() => navigate('/godown')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <FaPlus className="text-xs" /> Inward Stock
                </button>
              </>
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
                {totalDistinctProductsAll} <span className="text-sm font-normal text-slate-400">Items</span>
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
                          <span className="text-[10px] font-medium text-slate-400 block uppercase tracking-wider">Items</span>
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

        {/* Multi-Product Stock Transfer Modal */}
        {transferModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-7 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl text-slate-100 my-auto">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <FaTruck className="text-lg" />
                  </span>
                  <div>
                    <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
                      Multi-Product Stock Transfer
                    </h2>
                    <p className="text-xs text-slate-400">
                      Search godown stock, pick multiple products, configure target destinations & transfer counts.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTransferModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>

              {/* Success View */}
              {transferSuccessChallans ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                    <FaCheck className="text-2xl" />
                  </div>
                  <h3 className="text-xl font-black text-white">Stock Transferred Successfully!</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    All selected products were moved and transfer records have been committed to inventory and history.
                  </p>

                  <div className="max-w-lg mx-auto space-y-2.5 pt-2 text-left">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Generated Delivery Challan(s):</h4>
                    {transferSuccessChallans.map((ch, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-white flex items-center gap-1.5">
                            <span className="text-indigo-400 font-mono">{ch.number}</span>
                            <span className="text-xs text-slate-400">({ch.itemCount || 1} products)</span>
                          </p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <span>{capitalize(ch.source)}</span>
                            <FaArrowRight className="text-[10px] text-slate-500" />
                            <span className="text-emerald-400 font-semibold">{capitalize(ch.target)}</span>
                          </p>
                        </div>
                        {ch.id && (
                          <a
                            href={`${API_BASE_URL}/api/transfer-challans/${ch.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition"
                          >
                            <FaFilePdf className="text-xs text-red-400" /> Print PDF
                          </a>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => {
                        setTransferModalOpen(false);
                        setTransferSuccessChallans(null);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-5 pr-1">

                  {/* Step 1: Search & Pick Available Stocks */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <FaSearch className="text-indigo-400 text-xs" /> Search Available Stocks In Godowns
                      </label>
                      <span className="text-[11px] text-slate-500">
                        {loadingAvailable ? 'Loading stocks...' : `${availableStocks.length} active stocks`}
                      </span>
                    </div>

                    <div className="relative">
                      <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                      <input
                        type="text"
                        placeholder="Search by product name, brand, or godown name..."
                        value={stockSearchQuery}
                        onChange={e => setStockSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                      />
                      {stockSearchQuery && (
                        <button
                          onClick={() => setStockSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                        >
                          <FaTimes />
                        </button>
                      )}
                    </div>

                    {/* Stock results quick picker list */}
                    <div className="mt-3 max-h-44 overflow-y-auto space-y-1.5 divide-y divide-slate-800/40">
                      {loadingAvailable ? (
                        <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                          <FaSpinner className="animate-spin text-indigo-400" /> Loading available inventory...
                        </div>
                      ) : filteredAvailableStocks.length === 0 ? (
                        <div className="py-3 text-center text-xs text-slate-500">
                          No active stocks found matching "{stockSearchQuery}".
                        </div>
                      ) : (
                        filteredAvailableStocks.map(stock => {
                          const selectedCount = selectedTransferItems.filter(i => i.stock_id === stock.stock_id).length;
                          return (
                            <div
                              key={stock.stock_id}
                              className="pt-1.5 first:pt-0 flex items-center justify-between gap-3 text-xs hover:bg-slate-900/60 p-2 rounded-xl transition"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-white truncate">{stock.productname}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                                    {capitalize(stock.brand || 'General')}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                    {capitalize(stock.godown_name)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Available: <strong className="text-emerald-400">{formatCasesAndPcs(stock.current_cases, stock.per_case)}</strong> ({stock.total_pieces} pcs) · <span className="text-slate-500">{stock.per_case} pcs/cs</span>
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAddStockToTransfer(stock)}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-95"
                                title="Add to transfer list (can add multiple times for different destinations)"
                              >
                                <FaPlus className="text-[10px]" /> Add
                                {selectedCount > 0 && (
                                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-900/90 text-[10px] text-indigo-200 border border-indigo-400/30">
                                    {selectedCount} queued
                                  </span>
                                )}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Step 2: Selected Transfer Products Configuration */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <FaExchangeAlt className="text-amber-400 text-xs" /> Selected Products to Transfer ({selectedTransferItems.length})
                      </h3>
                      {selectedTransferItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedTransferItems([])}
                          className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {selectedTransferItems.length === 0 ? (
                      <div className="p-8 rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 text-center">
                        <FaBoxes className="text-3xl text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-medium">No products selected yet.</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Use the search box above and click "+ Add" to queue products for transfer.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedTransferItems.map((item, idx) => {
                          const pCase = Math.max(1, parseInt(item.per_case) || 1);
                          const cVal = parseFloat(item.cases_to_transfer) || 0;
                          const lVal = parseFloat(item.loose_to_transfer) || 0;
                          const itemTotalPcs = Math.round((cVal * pCase) + lVal);
                          const totalAllocated = getProductTotalAllocatedPcs(item.stock_id);
                          const isExceeded = totalAllocated > item.total_pieces;
                          const remainingPcs = item.total_pieces - totalAllocated;
                          const validTargets = godowns.filter(g => g.id !== item.godown_id);

                          return (
                            <div
                              key={item.row_id}
                              className={`p-3.5 rounded-2xl border transition-all ${
                                isExceeded
                                  ? 'bg-rose-950/20 border-rose-500/40'
                                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2.5">
                                <div>
                                  <span className="font-bold text-white text-sm">
                                    {idx + 1}. {item.productname}
                                  </span>
                                  <span className="text-xs text-slate-400 ml-2">
                                    ({capitalize(item.brand || 'General')})
                                  </span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                                      Source: <strong className="text-indigo-400">{capitalize(item.godown_name)}</strong>
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      Available: <strong className="text-emerald-400">{formatCasesAndPcs(item.current_cases, pCase)}</strong> ({item.total_pieces} pcs)
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleAddStockToTransfer(item)}
                                    className="px-2.5 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold border border-indigo-500/20 transition flex items-center gap-1 cursor-pointer"
                                    title="Send more of this product to another godown"
                                  >
                                    <FaPlus className="text-[9px]" /> Split Target
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTransferItem(item.row_id)}
                                    className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs transition cursor-pointer"
                                    title="Remove row"
                                  >
                                    <FaTrash className="text-xs" />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/60">
                                {/* Target Godown */}
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                    Target Godown *
                                  </label>
                                  <select
                                    value={item.target_godown_id}
                                    onChange={e => handleUpdateTransferItem(item.row_id, 'target_godown_id', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                                  >
                                    <option value="" disabled>Select target godown...</option>
                                    {validTargets.map(g => (
                                      <option key={g.id} value={g.id}>
                                        {capitalize(g.name)}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Cases */}
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                    Cases to Transfer
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="e.g. 5"
                                    value={item.cases_to_transfer}
                                    onChange={e => handleUpdateTransferItem(item.row_id, 'cases_to_transfer', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                  />
                                </div>

                                {/* Loose Pcs */}
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                    Loose Pcs (Optional)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="e.g. 10"
                                    value={item.loose_to_transfer}
                                    onChange={e => handleUpdateTransferItem(item.row_id, 'loose_to_transfer', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                              </div>

                              {/* Quantity indicator preview */}
                              {(parseFloat(item.cases_to_transfer) > 0 || parseFloat(item.loose_to_transfer) > 0) && (
                                <div className="mt-2 text-xs flex flex-wrap items-center justify-between gap-1 pt-1">
                                  <span className={`font-semibold ${isExceeded ? 'text-rose-400' : 'text-indigo-300'}`}>
                                    This route: {itemTotalPcs} pcs ({formatCasesAndPcs(itemTotalPcs / pCase, pCase)})
                                  </span>
                                  {isExceeded ? (
                                    <span className="text-rose-400 font-bold text-[11px]">
                                      ⚠️ Total across transfers ({totalAllocated} pcs) exceeds available ({item.total_pieces} pcs)!
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">
                                      Total remaining in {capitalize(item.godown_name)}: {formatCasesAndPcs(remainingPcs / pCase, pCase)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Step 3: Transport & Delivery Details - Collapsible */}
                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
                    <button
                      type="button"
                      onClick={() => setShowTransportDetails(prev => !prev)}
                      className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-slate-300 hover:bg-slate-900/60 transition"
                    >
                      <span className="flex items-center gap-2">
                        <FaTruck className="text-indigo-400" /> Transport & Delivery Details (Optional Challan Info)
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 font-normal">
                        {showTransportDetails ? <FaChevronUp /> : <FaChevronDown />}
                      </span>
                    </button>

                    {showTransportDetails && (
                      <div className="p-4 pt-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 border-t border-slate-800/80">
                        <div>
                          <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Transport / Vehicle</label>
                          <input
                            type="text"
                            placeholder="e.g. TN-67-AB-1234"
                            value={transportName}
                            onChange={e => setTransportName(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">LR / Receipt No</label>
                          <input
                            type="text"
                            placeholder="e.g. LR-98765"
                            value={lrNumber}
                            onChange={e => setLrNumber(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Delivery Person</label>
                          <input
                            type="text"
                            placeholder="e.g. Ramesh"
                            value={deliveryPerson}
                            onChange={e => setDeliveryPerson(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Transfer Date</label>
                          <input
                            type="date"
                            value={transferDate}
                            onChange={e => setTransferDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {transferError && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                      {transferError}
                    </div>
                  )}

                </div>
              )}

              {/* Modal Footer */}
              {!transferSuccessChallans && (
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800 mt-4">
                  <button
                    type="button"
                    onClick={() => setTransferModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-bold transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleExecuteMultiTransfer}
                    disabled={transferring || selectedTransferItems.length === 0}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition cursor-pointer"
                  >
                    {transferring ? (
                      <>
                        <FaSpinner className="animate-spin text-xs" /> Transferring...
                      </>
                    ) : (
                      <>
                        <FaTruck className="text-xs" /> Transfer {selectedTransferItems.length} {selectedTransferItems.length === 1 ? 'Item' : 'Items'} & Generate Challan(s)
                      </>
                    )}
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
