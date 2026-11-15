import React, { useState, useEffect, useCallback } from 'react';
import Modal from 'react-modal';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../Logout';
import { API_BASE_URL } from '../../../Config';
import {
  FaHistory, FaTimes, FaPlus, FaDownload,
  FaSpinner, FaSearch, FaCalendarAlt, FaTruck, FaWarehouse
} from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import Select from 'react-select';

Modal.setAppElement('#root');

export default function GodownDetail() {
  const { godownId } = useParams();
  const navigate = useNavigate();

  const [godown, setGodown] = useState(null);
  const [error, setError] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const [casesTaken, setCasesTaken] = useState('');
  const [casesToAdd, setCasesToAdd] = useState('');
  const [stockHistory, setStockHistory] = useState([]);
  const [takeModalIsOpen, setTakeModalIsOpen] = useState(false);
  const [addModalIsOpen, setAddModalIsOpen] = useState(false);
  const [historyModalIsOpen, setHistoryModalIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('current');
  const [selectedProductType, setSelectedProductType] = useState('all');
  const [productTypes, setProductTypes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isTakingStock, setIsTakingStock] = useState(false);
  const cardsPerPage = 20;
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadMode, setDownloadMode] = useState('all');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [historyCache, setHistoryCache] = useState({});
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showUniqueProductsModal, setShowUniqueProductsModal] = useState(false);
  const [showTotalCasesModal, setShowTotalCasesModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [directAgentName, setDirectAgentName] = useState('');
  const [casesAdded, setCasesAdded] = useState('');
  const [addedDate, setAddedDate] = useState(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Delete feature states
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [stockToDelete, setStockToDelete] = useState(null);

  // Transfer feature states
  const [transferModalIsOpen, setTransferModalIsOpen] = useState(false);
  const [targetGodown, setTargetGodown] = useState(null);
  const [casesTransfer, setCasesTransfer] = useState('');
  const [loosePiecesTransfer, setLoosePiecesTransfer] = useState('');
  const [transferDate, setTransferDate] = useState(null);
  const [showTransferDatePicker, setShowTransferDatePicker] = useState(false);
  const [godowns, setGodowns] = useState([]);
  const [transferring, setTransferring] = useState(false);
  const [transportName, setTransportName] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [deliveryPerson, setDeliveryPerson] = useState('');
  const [fromPlace, setFromPlace] = useState('');
  const [toPlace, setToPlace] = useState('');
  const [transferSuccessChallan, setTransferSuccessChallan] = useState(null);
  const [showTransportDetails, setShowTransportDetails] = useState(false);

  // Snapshot date picker state
  const [snapshotDate, setSnapshotDate] = useState(null);
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(false);
  const [snapshotStocks, setSnapshotStocks] = useState(null);

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

  const styles = {
    input: {
      background: 'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(240,249,255,0.6))',
      backgroundDark: 'linear-gradient(135deg, rgba(55,65,81,0.8), rgba(75,85,99,0.6))',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(2,132,199,0.3)',
      borderDark: '1px solid rgba(59,130,246,0.4)',
    },
    button: {
      background: 'linear-gradient(135deg, rgba(2,132,199,0.9), rgba(14,165,233,0.95))',
      backgroundDark: 'linear-gradient(135deg, rgba(59,130,246,0.9), rgba(37,99,235,0.95))',
      backdropFilter: 'blur(15px)',
      border: '1px solid rgba(125,211,252,0.4)',
      borderDark: '1px solid rgba(147,197,253,0.4)',
      boxShadow: '0 15px 35px rgba(2,132,199,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
      boxShadowDark: '0 15px 35px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
    },
  };

  const capitalize = str =>
    str ? str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';

  // Replace your existing getISTDateString with this:
  const getDateString = (date) => {
    if (!date) {
      return new Date().toLocaleDateString('en-CA'); // "2026-02-07" (today in IST)
    }
    return date.toLocaleDateString('en-CA'); // "YYYY-MM-DD" in local timezone (IST)
  };

  // When displaying any date from backend (which is stored as IST)
  const formatIST = (dbDateString) => {
    if (!dbDateString) return 'Today (default)';
    // dbDateString is like "2025-02-01" or "2025-02-01T00:00:00"
    const d = new Date(dbDateString);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const fetchAllProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setAllProducts(data);
    } catch (err) {
      console.error('Failed to load products');
    }
  }, []);

  const fetchGodowns = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/godowns/fast`);
      if (!res.ok) throw new Error('Failed to fetch godowns');
      const data = await res.json();
      setGodowns(data);
    } catch (err) {
      console.error('Failed to load godowns:', err);
    }
  };

  const fetchGodown = async () => {
    setIsLoading(true);
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/godowns/${godownId}/stock`);
      if (!response.ok) throw new Error('Failed to fetch godown details');
      const data = await response.json();

      if (data.length === 0) {
        setGodown({ name: 'Unknown', stocks: [] });
      } else {
        setGodown({ name: data[0].godown_name, stocks: data });
        const uniqueTypes = [...new Set(data.map(s => s.product_type))];
        setProductTypes(uniqueTypes);
      }

      // Pre-fetch history
      for (const stock of data) {
        if (!historyCache[stock.id]) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/stock/${stock.id}/history`);
            if (res.ok) {
              const hist = await res.json();
              setHistoryCache(prev => ({ ...prev, [stock.id]: hist }));
            }
          } catch (e) { /* silent fail */ }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchGodown();
    fetchAllProducts();
    fetchGodowns();
  }, [godownId, fetchAllProducts]);

  const handleAddProductToGodown = async () => {
    const casesVal = parseFloat(casesAdded);
    if (!selectedProduct || isNaN(casesVal) || casesVal <= 0) {
      setError('Select product and valid cases (decimals/pieces allowed)');
      return;
    }

    const username = localStorage.getItem('username') || 'Unknown';

    setAddingProduct(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/godowns/${godownId}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          godown_id: godownId,
          product_type: selectedProduct.product_type,
          productname: selectedProduct.productname,
          brand: selectedProduct.brand?.toLowerCase().replace(/\s+/g, '_') || '',
          agent_name: directAgentName || selectedProduct.agent_name || '',
          cases_added: casesVal,
          added_by: username,
          added_date: getDateString(addedDate),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add');

      setShowAddProductModal(false);
      setSelectedProduct(null);
      setDirectAgentName('');
      setCasesAdded('');
      setAddedDate(null);
      setShowDatePicker(false);
      setError('');
      await fetchGodown();
      await fetchAllProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingProduct(false);
    }
  };

  const handleTakeStock = async () => {
    const casesVal = parseFloat(casesTaken);
    if (!selectedStock?.id || isNaN(casesVal) || casesVal <= 0) return;
    setIsTakingStock(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/godowns/stock/take`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_id: selectedStock.id, cases_taken: casesVal }),
      });
      if (!response.ok) throw new Error((await response.json()).message || 'Failed');
      setTakeModalIsOpen(false);
      setCasesTaken('');
      setSelectedStock(null);
      await fetchGodown();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsTakingStock(false);
    }
  };

  const handleAddStock = async () => {
    const casesVal = parseFloat(casesToAdd);
    if (!selectedStock?.id || isNaN(casesVal) || casesVal <= 0) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/godowns/stock/add`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_id: selectedStock.id, cases_added: casesVal }),
      });
      if (!response.ok) throw new Error((await response.json()).message || 'Failed');
      setAddModalIsOpen(false);
      setCasesToAdd('');
      setSelectedStock(null);
      await fetchGodown();
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchStockHistory = async (stockId) => {
    if (historyCache[stockId]) {
      setStockHistory(historyCache[stockId]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/stock/${stockId}/history`);
      if (!response.ok) throw new Error('Failed to fetch history');
      const data = await response.json();
      setHistoryCache(prev => ({ ...prev, [stockId]: data }));
      setStockHistory(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const openHistoryModal = (stock) => {
    setSelectedStock(stock);

    if (historyCache[stock.id]) {
      setStockHistory(historyCache[stock.id]);
      setHistoryModalIsOpen(true);
      return;
    }

    fetchStockHistory(stock.id).then(() => {
      setHistoryModalIsOpen(true);
    });
  };

  const handleDeleteStock = async () => {
    if (!stockToDelete?.id) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/godowns/${godownId}/stock/${stockToDelete.id}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete stock');
      }

      setShowDeleteConfirmModal(false);
      setStockToDelete(null);
      setError('');
      await fetchGodown();
    } catch (err) {
      setError(err.message);
    }
  };

  const openDownloadModal = () => setShowDownloadModal(true);

  const confirmDownload = () => {
    if (!godown?.stocks?.length) {
      alert('No stock data to export');
      return;
    }

    const allHistory = Object.values(historyCache).flat();
    let filtered = [];

    const toISTDate = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    };

    if (downloadMode === 'all') {
      filtered = allHistory;
    } else if (downloadMode === 'date' && selectedDate) {
      const selectedIST = toISTDate(selectedDate);
      filtered = allHistory.filter(h => toISTDate(h.date) === selectedIST);
    } else if (downloadMode === 'month' && selectedMonth) {
      const year = selectedMonth.getFullYear();
      const month = String(selectedMonth.getMonth() + 1).padStart(2, '0');
      const prefix = `${year}-${month}`;
      filtered = allHistory.filter(h => toISTDate(h.date).startsWith(prefix));
    }

    if (filtered.length === 0 && downloadMode !== 'all') {
      alert('No history found for the selected filter.');
      return;
    }

    const wb = XLSX.utils.book_new();

    // ─── Current Stock Sheet ─────────────────────────────────────────────────────
    const currentStockData = godown.stocks
      .filter(s => parseFloat(s.current_cases || 0) > 0)
      .map(s => ({
        'Product Type': capitalize(s.product_type || ''),
        'Product Name': s.productname || '',
        'Brand': capitalize(s.brand || ''),
        'Agent Name': s.agent_name || '-',
        'Current Cases': formatCasesAndPcs(s.current_cases, s.per_case),
        'Per Case': s.per_case,
        'Taken Cases': formatCasesAndPcs(s.taken_cases, s.per_case),
        'Total Items': Math.round(parseFloat(s.current_cases || 0) * (s.per_case || 1)),
        'Date Added': s.date_added ? formatIST(s.date_added) : '-',
        'Last Taken': s.last_taken_date ? formatIST(s.last_taken_date) : '-',
      }));

    if (currentStockData.length > 0) {
      const wsCurrent = XLSX.utils.json_to_sheet(currentStockData);
      XLSX.utils.book_append_sheet(wb, wsCurrent, 'Current Stock');
    }

    // ─── History Sheet – Now with customer_name & correct Performed By ───────────
    const historyByType = {};
    filtered.forEach(h => {
      const type = capitalize(h.product_type || 'Unknown');
      if (!historyByType[type]) historyByType[type] = [];

      // Performed By logic: prioritize taken_by for OUT, added_by for IN
      let performedBy = '-';
      if (h.action === 'added') {
        performedBy = h.added_by || h.taken_by || '-';
      } else if (h.action === 'taken') {
        performedBy = h.taken_by || h.added_by || '-';
      }

      const sRef = godown?.stocks?.find(st => st.productname === h.productname && st.brand === h.brand);
      const pCase = sRef?.per_case || h.per_case || (h.per_case_total && h.cases ? Math.round(h.per_case_total / h.cases) : 1);
      const caseStr = formatCasesAndPcs(h.cases, pCase);

      historyByType[type].push({
        'Date & Time': new Date(h.date).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true
        }),
        'Product': h.productname || '',
        'Brand': capitalize(h.brand || ''),
        'Action': h.action === 'added' ? 'IN (Added)' : 'OUT (Taken)',
        'Cases': h.action === 'added' ? `+${caseStr}` : `-${caseStr}`,
        'Total Qty': Math.round(parseFloat(h.per_case_total || 0)),
        'Agent Name': h.agent_name || '-',
        'Performed By': performedBy,
        'Customer / Note': h.customer_name || '-',
      });
    });

    for (const type in historyByType) {
      if (historyByType[type].length > 0) {
        const ws = XLSX.utils.json_to_sheet(historyByType[type]);
        const safeName = type.length > 31 ? type.substring(0, 31) : type;
        XLSX.utils.book_append_sheet(wb, ws, safeName);
      }
    }

    if (Object.keys(wb.Sheets).length === 0) {
      alert('No data to export.');
      return;
    }

    const suffix =
      downloadMode === 'all' ? 'all' :
        downloadMode === 'date' ? toISTDate(selectedDate) :
          `${selectedMonth?.getFullYear() || 'year'}-${String(selectedMonth?.getMonth() + 1 || '00').padStart(2, '0')}`;

    XLSX.writeFile(wb, `${godown?.name || 'godown'}_stock_${suffix}.xlsx`);

    setShowDownloadModal(false);
    setDownloadMode('all');
    setSelectedDate(null);
    setSelectedMonth(null);
  };

  const openTakeModal = stock => {
    setSelectedStock(stock);
    setCasesTaken('');
    setTakeModalIsOpen(true);
  };

  const openAddModal = stock => {
    setSelectedStock(stock);
    setCasesToAdd('');
    setAddModalIsOpen(true);
  };

  const openTransferModal = stock => {
    setSelectedStock(stock);
    setCasesTransfer('');
    setLoosePiecesTransfer('');
    setTargetGodown(null);
    setTransferDate(null);
    setShowTransferDatePicker(false);
    setTransportName('');
    setLrNumber('');
    setDeliveryPerson('');
    setFromPlace(godown?.name ? capitalize(godown.name) : '');
    setToPlace('');
    setTransferSuccessChallan(null);
    setShowTransportDetails(false);
    setTransferModalIsOpen(true);
  };

  const handleTransferStock = async () => {
    const pCase = Math.max(1, parseInt(selectedStock?.per_case) || 1);
    const cVal = parseFloat(casesTransfer) || 0;
    const lVal = parseFloat(loosePiecesTransfer) || 0;
    const totalPcsToTransfer = Math.round((cVal * pCase) + lVal);
    const availablePcs = Math.round(parseFloat(selectedStock?.current_cases || 0) * pCase);

    if (
      !targetGodown ||
      totalPcsToTransfer <= 0 ||
      totalPcsToTransfer > availablePcs
    ) {
      setError('Select target godown and enter valid quantity (cannot exceed available stock)');
      return;
    }

    const effectiveCases = Math.round((totalPcsToTransfer / pCase) * 10000) / 10000;
    const username = localStorage.getItem('username') || 'Unknown';

    setTransferring(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/stock/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_stock_id: selectedStock.id,
          target_godown_id: targetGodown.value,
          cases_transferred: effectiveCases,
          cases: cVal,
          loose_pieces_transferred: lVal,
          added_by: username,
          transfer_date: getDateString(transferDate),
          transport_name: transportName,
          lr_number: lrNumber,
          delivery_person: deliveryPerson,
          from_place: fromPlace || capitalize(godown?.name || ''),
          to_place: toPlace || targetGodown.label,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to transfer');

      if (data.challan_id) {
        setTransferSuccessChallan({
          id: data.challan_id,
          number: data.challan_number
        });
      } else {
        setTransferModalIsOpen(false);
      }
      setError('');
      await fetchGodown();
    } catch (err) {
      setError(err.message);
    } finally {
      setTransferring(false);
    }
  };

  const currentStocks = godown ? godown.stocks.filter(s => parseFloat(s.current_cases || 0) > 0) : [];
  const previousStocks = godown ? godown.stocks.filter(s => parseFloat(s.current_cases || 0) <= 0) : [];
  const stocksToDisplay = activeTab === 'current' ? currentStocks : previousStocks;

  const filteredStocks = stocksToDisplay.filter(stock => {
    const matchesSearch = !searchQuery || stock.productname?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedProductType === 'all' || stock.product_type === selectedProductType;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredStocks.length / cardsPerPage);
  const indexOfLastCard = currentPage * cardsPerPage;
  const indexOfFirstCard = indexOfLastCard - cardsPerPage;
  const currentCards = filteredStocks.slice(indexOfFirstCard, indexOfLastCard);

  // Distinct products strictly according to current stock (cases > 0)
  const uniqueProducts = godown
    ? [...new Set(currentStocks.map(s => s.productname?.trim()))].filter(Boolean).sort()
    : [];

  // Total cases and pieces available in the current godown (cases > 0)
  const totalFullCases = godown
    ? currentStocks.reduce((sum, s) => {
        const p = Math.max(1, parseInt(s.per_case) || 1);
        const tot = Math.round(parseFloat(s.current_cases || 0) * p);
        return sum + Math.floor(tot / p);
      }, 0)
    : 0;

  const totalLoosePcs = godown
    ? currentStocks.reduce((sum, s) => {
        const p = Math.max(1, parseInt(s.per_case) || 1);
        const tot = Math.round(parseFloat(s.current_cases || 0) * p);
        return sum + (tot % p);
      }, 0)
    : 0;

  const formattedTotalStock = totalLoosePcs > 0
    ? `${totalFullCases}cs ${totalLoosePcs}pcs`
    : `${totalFullCases}cs`;

  const totalCases = godown
    ? Math.round(currentStocks.reduce((sum, s) => sum + (parseFloat(s.current_cases || 0) || 0), 0) * 100) / 100
    : 0;

  const uniqueProductsData = uniqueProducts.map((name, i) => {
    const matchingStocks = currentStocks.filter(s => s.productname?.trim() === name);
    const stock = matchingStocks[0] || {};
    const pCase = stock.per_case || 1;
    const totalCasesForProduct = matchingStocks.reduce((sum, s) => sum + parseFloat(s.current_cases || 0), 0);
    return {
      no: i + 1,
      product_type: capitalize(stock.product_type || 'unknown'),
      brand: capitalize(stock.brand || '-'),
      name,
      cases: formatCasesAndPcs(totalCasesForProduct, pCase)
    };
  });

  const totalCasesData = currentStocks
    .map(s => ({
      productname: s.productname,
      brand: s.brand,
      casecount: formatCasesAndPcs(s.current_cases, s.per_case || 1),
      rawCases: parseFloat(s.current_cases || 0)
    }))
    .sort((a, b) => b.rawCases - a.rawCases);

  const productOptions = allProducts
    .filter(p => !godown?.stocks?.some(s => s.productname === p.productname && s.brand === p.brand))
    .map(p => ({
      value: p.id,
      label: `${p.productname} (${capitalize(p.brand || '')})`,
      productname: p.productname,
      brand: p.brand,
      product_type: p.product_type,
      agent_name: p.agent_name || '',
      per_case: p.per_case || 1,
    }));

  const searchOptions = godown?.stocks
    ? [...new Map(godown.stocks.map(s => [s.productname, s])).values()]
      .map(s => ({
        value: s.productname,
        label: `${s.productname} (${capitalize(s.brand || '')})`
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
    : [];

  const godownOptions = godowns
    .filter(g => g.id !== parseInt(godownId))
    .map(g => ({
      value: g.id,
      label: capitalize(g.name),
    }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 hundred:ml-64 flex items-center justify-center p-6">
        <Sidebar />
        <Logout />
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl backdrop-blur-md">
          <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping" />
            <div className="w-16 h-16 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin flex items-center justify-center">
              <FaWarehouse className="text-indigo-400 text-lg" />
            </div>
          </div>
          <h3 className="text-base font-bold text-white mb-1">Loading Godown Stocks</h3>
          <p className="text-xs text-slate-400">Fetching live inventory & transaction history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 hundred:ml-64 p-4 md:p-8 pt-20 hundred:pt-8 transition-colors duration-200">
      <Sidebar />
      <Logout />
      <div className="max-w-6xl mx-auto">
        <div className="flex mobile:flex-col mobile:gap-4 justify-between items-center mb-6 mobile:mb-4">
          <h2 className="text-2xl mobile:text-xl text-center font-bold text-gray-900 dark:text-gray-100">
            View Stocks for {godown ? capitalize(godown.name) : 'Godown'}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddProductModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg bg-emerald-600 hover:bg-emerald-500 transition shadow-emerald-600/20"
            >
              <FaPlus className="text-xs" />
              Add Product
            </button>
            <button
              onClick={openDownloadModal}
              disabled={isLoadingHistory}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition disabled:opacity-50"
            >
              <FaDownload className="text-xs text-sky-400" />
              {isLoadingHistory ? 'Loading...' : 'Download History'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-lg flex justify-between items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Distinct Products</p>
              <p className="text-2xl font-black text-white mt-1">{uniqueProducts.length} <span className="text-xs font-normal text-slate-400">SKUs</span></p>
            </div>
            <button
              onClick={() => setShowUniqueProductsModal(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/20 transition cursor-pointer"
            >
              View
            </button>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-lg flex justify-between items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Cases in Current Godown</p>
              <p className="text-2xl font-black text-amber-400 mt-1">{formattedTotalStock}</p>
            </div>
            <button
              onClick={() => setShowTotalCasesModal(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/20 transition cursor-pointer"
            >
              View
            </button>
          </div>
        </div>

        {error && <div className="mb-4 text-red-600 dark:text-red-400 text-center">{error}</div>}

        <div className="mb-6 mobile:mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search by Product Name
          </label>
          <Select
            options={[{ value: '', label: 'All Products' }, ...searchOptions]}
            onChange={option => setSearchQuery(option?.value || '')}
            placeholder="Type to search product..."
            isClearable
            isSearchable
            className="react-select-container"
            classNamePrefix="react-select"
            styles={{
              control: (base, state) => ({
                ...base,
                backgroundColor: '#1e293b',
                borderColor: state.isFocused ? '#10b981' : '#334155',
                color: '#ffffff',
                boxShadow: 'none',
                borderRadius: '0.75rem',
                padding: '2px 4px',
                fontSize: '14px',
                '&:hover': { borderColor: '#10b981' },
              }),
              singleValue: (base) => ({ ...base, color: '#ffffff' }),
              input: (base) => ({ ...base, color: '#ffffff' }),
              placeholder: (base) => ({ ...base, color: '#94a3af' }),
              menu: (base) => ({
                ...base,
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '0.75rem',
                zIndex: 9999,
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isSelected ? '#059669' : state.isFocused ? '#334155' : '#1e293b',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '13px',
              }),
            }}
          />
        </div>

        <div className="mb-6 mobile:mb-4">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              className={`px-4 py-2 mobile:px-2 mobile:py-1 text-sm mobile:text-sm font-medium transition ${activeTab === 'current' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              onClick={() => setActiveTab('current')}
            >
              Current Stock
            </button>
            <button
              className={`px-4 py-2 mobile:px-2 mobile:py-1 text-sm mobile:text-sm font-medium transition ${activeTab === 'previous' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              onClick={() => setActiveTab('previous')}
            >
              Previous Stock
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mobile:gap-4">
          {currentCards.map(s => {
            const currentCs = parseFloat(s.current_cases || 0);
            const unbilledCs = parseFloat(s.unbilled_direct_cases || 0);
            const perCase = parseInt(s.per_case || 1);
            const totalPcs = Math.round(currentCs * perCase);

            return (
              <div
                key={s.id}
                className="bg-slate-900/80 hover:bg-slate-900 rounded-2xl shadow-xl hover:shadow-2xl hover:border-slate-700 p-5 border border-slate-800 flex flex-col justify-between transition-all"
              >
                <div>
                  {/* Header: Product name & Cases pill */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-white truncate" title={s.productname}>
                        {s.productname}
                      </h3>
                      <p className="text-xs text-sky-400 font-semibold truncate">
                        {capitalize(s.brand || 'General')}
                        <span className="text-slate-400 font-normal"> · {capitalize(s.product_type || '')}</span>
                      </p>
                    </div>

                    {/* Cases Badge */}
                    <div className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-sm whitespace-nowrap shadow-sm text-center">
                      {formatCasesAndPcs(currentCs, perCase)}
                    </div>
                  </div>

                  {/* Stock specs */}
                  <div className="flex flex-wrap items-center gap-2 text-xs my-3">
                    <span className="bg-slate-950/70 text-slate-300 px-2.5 py-1 rounded-lg text-xs border border-slate-800 flex items-center gap-1.5 shadow-sm">
                      <span className="text-slate-500">Agent:</span>
                      <strong className="text-emerald-400 font-bold">{s.agent_name || '-'}</strong>
                    </span>
                    <span className="bg-slate-950/70 text-slate-300 px-2.5 py-1 rounded-lg text-xs border border-slate-800 flex items-center gap-1.5 shadow-sm">
                      <span className="text-slate-500">Per Case:</span>
                      <strong className="text-white font-bold">{perCase}</strong>
                      <span className="text-slate-400 font-medium">({totalPcs} pcs)</span>
                    </span>
                  </div>

                </div>

                {/* Action buttons footer */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => openHistoryModal(s)}
                    className="flex-1 py-2 px-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/25 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <FaHistory className="text-xs" />
                    History
                  </button>

                  <button
                    onClick={() => openTransferModal(s)}
                    className="flex-1 py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <FaTruck className="text-xs" />
                    Transfer
                  </button>

                  {localStorage.getItem('userType') === 'admin' && (
                    <button
                      onClick={() => {
                        setStockToDelete(s);
                        setShowDeleteConfirmModal(true);
                      }}
                      className="py-2 px-3 bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/25 font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition shadow-sm cursor-pointer"
                      title="Delete this stock entry and its history"
                    >
                      <FaTimes className="text-xs" />
                      Clear
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredStocks.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 mt-6 mobile:mt-4">
            No {activeTab === 'current' ? 'current' : 'previous'} stocks available.
          </p>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center items-center space-x-4">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-md ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'text-white hover:bg-indigo-700'}`}
              style={currentPage !== 1 ? { background: styles.button.background, border: styles.button.border, boxShadow: styles.button.boxShadow } : {}}
            >
              Previous
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-md ${currentPage === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'text-white hover:bg-indigo-700'}`}
              style={currentPage !== totalPages ? { background: styles.button.background, border: styles.button.border, boxShadow: styles.button.boxShadow } : {}}
            >
              Next
            </button>
          </div>
        )}
      </div>
      {/* ADD PRODUCT MODAL – with IST fix */}
      <Modal
        isOpen={showAddProductModal}
        onRequestClose={() => {
          setShowAddProductModal(false);
          setSelectedProduct(null);
          setCasesAdded('');
          setAddedDate(null);
          setShowDatePicker(false);
          setError('');
        }}
        className="fixed inset-0 flex items-center justify-center p-4"
        overlayClassName="fixed inset-0 bg-black/50"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-black dark:text-white">Add Product to Godown</h3>
            <button onClick={() => setShowAddProductModal(false)}><FaTimes /></button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-black dark:text-white">Product</label>
            <Select
              value={selectedProduct}
              onChange={opt => {
                setSelectedProduct(opt);
                if (opt?.agent_name) setDirectAgentName(opt.agent_name);
              }}
              options={productOptions}
              placeholder="Search product..."
              isSearchable
              isClearable
              className="react-select-container"
              classNamePrefix="react-select"
              noOptionsMessage={() => 'No products available'}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-black dark:text-white">Agent Name (Optional)</label>
            <input
              type="text"
              value={directAgentName}
              onChange={e => setDirectAgentName(e.target.value)}
              placeholder="e.g. SIVAKASI or Agent Name"
              className="w-full p-2 border rounded text-black dark:text-white dark:bg-gray-700 text-sm"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-black dark:text-white">Cases (fractional / loose allowed)</label>
            <input
              type="number"
              step="any"
              value={casesAdded}
              onChange={e => setCasesAdded(e.target.value)}
              placeholder="e.g. 1 or 0.5"
              min="0.01"
              className="w-full p-2 border rounded text-black dark:text-white dark:bg-gray-700"
            />
            {casesAdded && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                = {Math.round(parseFloat(casesAdded || 0) * (selectedProduct?.per_case || 1))} Pcs
              </p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-black dark:text-white">Added Date</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                title={addedDate ? formatIST(addedDate.toISOString()) : "Click to select date (defaults to today)"}
              >
                <FaCalendarAlt className="text-blue-600 text-2xl" />
              </button>

              <span className="text-sm text-gray-700 dark:text-gray-300">
                {addedDate ? formatIST(addedDate.toISOString()) : 'Today (default)'}
              </span>
            </div>

            {showDatePicker && (
              <div className="mt-3 z-50">
                <DatePicker
                  selected={addedDate}
                  onChange={(date) => {
                    setAddedDate(date);
                    setShowDatePicker(false);
                  }}
                  onClickOutside={() => setShowDatePicker(false)}
                  inline
                  maxDate={new Date()}
                />
              </div>
            )}
          </div>

          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => setShowAddProductModal(false)}
              className="flex-1 py-2 border rounded text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleAddProductToGodown}
              disabled={addingProduct || !selectedProduct || !casesAdded}
              className="flex-1 py-2 bg-green-600 text-white rounded disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {addingProduct ? <>Adding... <FaSpinner className="animate-spin" /></> : 'Add'}
            </button>
          </div>
        </div>
      </Modal>

      {/* TAKE MODAL */}
      <Modal
        isOpen={takeModalIsOpen}
        onRequestClose={() => {
          setTakeModalIsOpen(false);
          setCasesTaken('');
          setSelectedStock(null);
        }}
        className="fixed inset-0 flex items-center justify-center p-4"
        overlayClassName="fixed inset-0 bg-black/50"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-black dark:text-white">Take Cases</h2>
            <button onClick={() => setTakeModalIsOpen(false)}><FaTimes /></button>
          </div>
          <input
            type="number"
            step="any"
            value={casesTaken}
            onChange={e => setCasesTaken(e.target.value)}
            className="w-full p-2 border rounded mb-2 text-black dark:text-white dark:bg-gray-700"
            placeholder="Cases to take (e.g. 1 or 0.5)"
            min="0.01"
            max={selectedStock?.current_cases}
            disabled={isTakingStock}
          />
          {casesTaken && (
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-3">
              = {Math.round(parseFloat(casesTaken || 0) * (selectedStock?.per_case || 1))} Pcs
            </p>
          )}
          <button
            onClick={handleTakeStock}
            disabled={isTakingStock}
            className="w-full py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
          >
            {isTakingStock ? 'Submitting...' : 'Take'}
          </button>
        </div>
      </Modal>

      {/* ADD MODAL (existing stock add) */}
      <Modal
        isOpen={addModalIsOpen}
        onRequestClose={() => {
          setAddModalIsOpen(false);
          setCasesToAdd('');
          setSelectedStock(null);
        }}
        className="fixed inset-0 flex items-center justify-center p-4"
        overlayClassName="fixed inset-0 bg-black/50"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-black dark:text-white">Add Cases</h2>
            <button onClick={() => setAddModalIsOpen(false)}><FaTimes /></button>
          </div>
          <input
            type="number"
            step="any"
            value={casesToAdd}
            onChange={e => setCasesToAdd(e.target.value)}
            className="w-full p-2 border rounded mb-2 text-black dark:text-white dark:bg-gray-700"
            placeholder="Cases to add (e.g. 1 or 0.5)"
            min="0.01"
          />
          {casesToAdd && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-3">
              = {Math.round(parseFloat(casesToAdd || 0) * (selectedStock?.per_case || 1))} Pcs
            </p>
          )}
          <button
            onClick={handleAddStock}
            className="w-full py-2 bg-indigo-600 text-white rounded"
          >
            Add
          </button>
        </div>
      </Modal>

      {/* HISTORY MODAL */}
      <Modal
        isOpen={historyModalIsOpen}
        onRequestClose={() => {
          setHistoryModalIsOpen(false);
          setStockHistory([]);
        }}
        className="fixed inset-0 flex items-center justify-center p-4 z-50"
        overlayClassName="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-40"
      >
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-4xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
          <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center flex-wrap gap-2">
                <span>Stock History – {selectedStock?.productname || 'Unknown Product'}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 font-medium">
                  {capitalize(selectedStock?.product_type || 'Unknown')}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/20 text-sky-300 font-medium">
                  {capitalize(selectedStock?.brand || '')}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Current Stock Available in Godown: <strong className="text-emerald-400 font-bold">{formatCasesAndPcs(selectedStock?.current_cases, selectedStock?.per_case)}</strong> ({Math.round(parseFloat(selectedStock?.current_cases || 0) * (selectedStock?.per_case || 1))} pcs)
              </p>
            </div>
            <button
              className="text-slate-400 hover:text-white cursor-pointer p-1"
              onClick={() => setHistoryModalIsOpen(false)}
            >
              <FaTimes size={20} />
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-950 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">No</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Cases</th>
                  <th className="px-4 py-3 text-left">Total Qty</th>
                  <th className="px-4 py-3 text-left">Agent Name</th>
                  <th className="px-4 py-3 text-left">Performed By</th>
                  <th className="px-4 py-3 text-left">Customer / Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                {stockHistory.length > 0 ? (
                  stockHistory
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((h, i) => (
                      <tr
                        key={i}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 text-slate-300 text-xs">
                          {new Date(h.date).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${h.action === 'added' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                            }`}>
                            {h.action === 'added' ? 'IN' : 'OUT'}
                          </span>
                        </td>
                        <td className={`px-4 py-3 font-bold text-xs ${h.action === 'added' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {h.action === 'added' ? '+' : '-'}{formatCasesAndPcs(h.cases, selectedStock?.per_case || 1)}
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-xs">{Math.round(parseFloat(h.per_case_total || 0))} pcs</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{h.agent_name || '-'}</td>
                        <td className="px-4 py-3 text-sky-400 font-medium text-xs">
                          {h.added_by || h.taken_by || h.performed_by || '-'}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium">
                          {h.customer_name ? (
                            <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-semibold ${h.customer_name === 'DIRECT GODOWN INWARD'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                              : 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
                              }`}>
                              {h.customer_name}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      No stock transaction history available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {stockHistory.length > 0 && (
            <div className="mt-6 flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900"></div>
                <span className="text-gray-700 dark:text-gray-300">IN (Added)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900"></div>
                <span className="text-gray-700 dark:text-gray-300">OUT (Taken)</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* DOWNLOAD MODAL */}
      <Modal
        isOpen={showDownloadModal}
        onRequestClose={() => setShowDownloadModal(false)}
        className="fixed inset-0 flex items-center justify-center p-4"
        overlayClassName="fixed inset-0 bg-black/50"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-bold mb-4 text-black dark:text-white">Download Stock History</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                value="all"
                checked={downloadMode === 'all'}
                onChange={e => setDownloadMode(e.target.value)}
                className="text-black dark:text-white"
              />
              <span className="text-black dark:text-white">All History</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                value="date"
                checked={downloadMode === 'date'}
                onChange={e => setDownloadMode(e.target.value)}
              />
              <span className="text-black dark:text-white">Specific Date</span>
            </label>
            {downloadMode === 'date' && (
              <DatePicker
                selected={selectedDate}
                onChange={d => setSelectedDate(d)}
                className="w-full p-2 border rounded dark:bg-gray-700 text-black dark:text-white"
                placeholderText="Select date"
                dateFormat="yyyy-MM-dd"
              />
            )}
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                value="month"
                checked={downloadMode === 'month'}
                onChange={e => setDownloadMode(e.target.value)}
              />
              <span className="text-black dark:text-white">Specific Month</span>
            </label>
            {downloadMode === 'month' && (
              <DatePicker
                selected={selectedMonth}
                onChange={d => setSelectedMonth(d)}
                showMonthYearPicker
                dateFormat="MM/yyyy"
                className="w-full p-2 border rounded dark:bg-gray-700 text-black dark:text-white"
                placeholderText="Select month"
              />
            )}
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={() => setShowDownloadModal(false)}
              className="px-4 py-2 text-black dark:text-white"
            >
              Cancel
            </button>
            <button
              onClick={confirmDownload}
              disabled={
                isLoadingHistory ||
                (downloadMode === 'date' && !selectedDate) ||
                (downloadMode === 'month' && !selectedMonth)
              }
              className="px-4 py-2 bg-blue-600 rounded disabled:opacity-50 text-white"
            >
              {isLoadingHistory ? 'Loading...' : 'Download'}
            </button>
          </div>
        </div>
      </Modal>

      {/* UNIQUE PRODUCTS MODAL */}
      <Modal
        isOpen={showUniqueProductsModal}
        onRequestClose={() => setShowUniqueProductsModal(false)}
        className="fixed inset-0 flex items-center justify-center p-4 z-50"
        overlayClassName="fixed inset-0 bg-black/50 backdrop-blur-sm"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-black dark:text-white">Distinct Products (Current Stock)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {uniqueProducts.length} distinct product{uniqueProducts.length !== 1 ? 's' : ''} available in current stock
              </p>
            </div>
            <button onClick={() => setShowUniqueProductsModal(false)} className="text-gray-500 hover:text-red-500 cursor-pointer">
              <FaTimes />
            </button>
          </div>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">No</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Brand</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Available Cases</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {uniqueProductsData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    No active stock available in this godown.
                  </td>
                </tr>
              ) : (
                uniqueProductsData.map(p => (
                  <tr key={p.no} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-2 text-sm text-black dark:text-white">{p.no}</td>
                    <td className="px-4 py-2 text-sm font-semibold text-black dark:text-white">{p.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{p.brand}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{p.product_type}</td>
                    <td className="px-4 py-2 text-sm text-right font-bold text-emerald-600 dark:text-emerald-400">{p.cases}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* TOTAL CASES MODAL */}
      <Modal
        isOpen={showTotalCasesModal}
        onRequestClose={() => setShowTotalCasesModal(false)}
        className="fixed inset-0 flex items-center justify-center p-4 z-50"
        overlayClassName="fixed inset-0 bg-black/50 backdrop-blur-sm"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-black dark:text-white">Total Cases in Current Godown</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Total: <strong>{formattedTotalStock}</strong> across {totalCasesData.length} stock allocations
              </p>
            </div>
            <button onClick={() => setShowTotalCasesModal(false)} className="text-gray-500 hover:text-red-500 cursor-pointer">
              <FaTimes />
            </button>
          </div>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Brand</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Case Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {totalCasesData.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    No active stock in this godown.
                  </td>
                </tr>
              ) : (
                totalCasesData.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-2 text-sm font-semibold text-black dark:text-white">{c.productname}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{capitalize(c.brand || '-')}</td>
                    <td className="px-4 py-2 text-sm text-right font-bold text-emerald-600 dark:text-emerald-400">{c.casecount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={showDeleteConfirmModal}
        onRequestClose={() => {
          setShowDeleteConfirmModal(false);
          setStockToDelete(null);
        }}
        className="fixed inset-0 flex items-center justify-center p-4 z-50"
        overlayClassName="fixed inset-0 bg-black/60 backdrop-blur-sm"
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full border border-red-200 dark:border-red-900/40 shadow-2xl">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400">
              Clear Stock Entry
            </h3>
            <button
              onClick={() => {
                setShowDeleteConfirmModal(false);
                setStockToDelete(null);
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FaTimes size={20} />
            </button>
          </div>

          <p className="text-gray-700 dark:text-gray-300 mb-6">
            Are you sure you want to <strong>permanently delete</strong> this stock entry?
            <br /><br />
            <span className="font-semibold block">
              {stockToDelete?.productname} ({capitalize(stockToDelete?.brand || '')})
            </span>
            <br />
            <span className="text-sm text-red-600 dark:text-red-400 font-medium block">
              • All associated history records will also be deleted<br />
              • This action cannot be undone
            </span>
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowDeleteConfirmModal(false);
                setStockToDelete(null);
              }}
              className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteStock}
              className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium shadow-sm"
            >
              Yes, Continue
            </button>
          </div>
        </div>
      </Modal>

      {/* TRANSFER MODAL */}
      <Modal
        isOpen={transferModalIsOpen}
        onRequestClose={() => {
          setTransferModalIsOpen(false);
          setTargetGodown(null);
          setCasesTransfer('');
          setLoosePiecesTransfer('');
          setTransferDate(null);
          setShowTransferDatePicker(false);
          setTransferSuccessChallan(null);
          setError('');
        }}
        className="fixed inset-0 flex items-center justify-center p-4 z-50 outline-none"
        overlayClassName="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center"
      >
        <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-800 shadow-2xl text-slate-100">
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-800">
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2.5">
              <span className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20"><FaTruck /></span>
              Transfer Stock & Challan
            </h3>
            <button onClick={() => setTransferModalIsOpen(false)} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition">
              <FaTimes size={18} />
            </button>
          </div>

          {transferSuccessChallan ? (
            <div className="py-4 text-center space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl text-green-800 dark:text-green-300">
                <p className="font-bold text-lg mb-1">Transfer Completed Successfully!</p>
                <p className="text-sm">Challan Number: <strong>{transferSuccessChallan.number}</strong></p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href={`${API_BASE_URL}/api/transfer-challans/${transferSuccessChallan.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow-md transition"
                >
                  <FaDownload /> Download Challan Copy (PDF)
                </a>
                <button
                  onClick={() => {
                    setTransferModalIsOpen(false);
                    setTransferSuccessChallan(null);
                  }}
                  className="px-5 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 transition"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Product Info Banner */}
              <div className="p-3.5 mb-5 bg-indigo-950/30 border border-indigo-500/20 rounded-2xl text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-sm">{selectedStock?.productname}</span>
                  <span className="text-slate-400 ml-2">({capitalize(selectedStock?.brand || '')})</span>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold text-xs border border-indigo-500/30">
                  {formatCasesAndPcs(selectedStock?.current_cases, selectedStock?.per_case)} available
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-300">Target Godown *</label>
                  <Select
                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                    menuPosition="fixed"
                    value={targetGodown}
                    onChange={(opt) => {
                      setTargetGodown(opt);
                      if (opt?.label) {
                        setToPlace(opt.label);
                      }
                    }}
                    options={godownOptions}
                    placeholder="Select godown..."
                    isSearchable
                    isClearable
                    styles={{
                      control: (b, s) => ({
                        ...b,
                        minHeight: '42px',
                        fontSize: '13px',
                        borderRadius: '12px',
                        backgroundColor: '#020617',
                        borderColor: s.isFocused ? '#6366f1' : '#334155',
                        color: '#ffffff',
                        boxShadow: 'none',
                      }),
                      menu: (b) => ({ ...b, zIndex: 99999, backgroundColor: '#0f172a', borderColor: '#334155' }),
                      menuPortal: (b) => ({ ...b, zIndex: 99999 }),
                      option: (b, s) => ({
                        ...b,
                        fontSize: '13px',
                        backgroundColor: s.isFocused ? '#1e293b' : '#0f172a',
                        color: '#ffffff',
                        cursor: 'pointer',
                      }),
                      singleValue: (b) => ({ ...b, color: '#ffffff' }),
                      input: (b) => ({ ...b, color: '#ffffff' }),
                      placeholder: (b) => ({ ...b, color: '#64748b' }),
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-300">Cases to Transfer</label>
                  <input
                    type="number"
                    value={casesTransfer}
                    onChange={e => setCasesTransfer(e.target.value)}
                    placeholder="e.g. 5"
                    min="0"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-300">Loose Pcs (Optional)</label>
                  <input
                    type="number"
                    value={loosePiecesTransfer}
                    onChange={e => setLoosePiecesTransfer(e.target.value)}
                    placeholder="e.g. 10"
                    min="0"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Real-time breakdown preview for Transfer */}
              {(parseFloat(casesTransfer) > 0 || parseFloat(loosePiecesTransfer) > 0) && (
                <div className="mb-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs flex items-center justify-between text-indigo-300">
                  <span className="font-medium">Total Quantity to Transfer:</span>
                  <span className="font-bold text-white text-sm">
                    {Math.round(((parseFloat(casesTransfer) || 0) * (selectedStock?.per_case || 1)) + (parseFloat(loosePiecesTransfer) || 0))} pcs
                    <span className="text-slate-400 font-normal ml-1.5">
                      ({formatCasesAndPcs((((parseFloat(casesTransfer) || 0) * (selectedStock?.per_case || 1)) + (parseFloat(loosePiecesTransfer) || 0)) / (selectedStock?.per_case || 1), selectedStock?.per_case || 1)})
                    </span>
                  </span>
                </div>
              )}

              {/* Transport & Delivery Details - Collapsible (Initially Minimized) */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setShowTransportDetails(prev => !prev)}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-slate-300 transition shadow-inner"
                >
                  <span className="flex items-center gap-2">
                    <FaTruck className="text-amber-400" />
                    Transport & Delivery Info (Optional)
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                    {showTransportDetails ? '▲ Hide Details' : '▼ Expand to Fill'}
                  </span>
                </button>

                {showTransportDetails && (
                  <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-2xl mt-2.5 space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Transport / Vehicle</label>
                        <input
                          type="text"
                          value={transportName}
                          onChange={e => setTransportName(e.target.value)}
                          placeholder="e.g. VRL Logistics / TN-67-A-1234"
                          className="w-full px-3 py-2 border rounded-xl text-xs text-white bg-slate-900 border-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">LR / Receipt No.</label>
                        <input
                          type="text"
                          value={lrNumber}
                          onChange={e => setLrNumber(e.target.value)}
                          placeholder="e.g. LR-98765"
                          className="w-full px-3 py-2 border rounded-xl text-xs text-white bg-slate-900 border-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Delivery Person (Optional)</label>
                        <input
                          type="text"
                          value={deliveryPerson}
                          onChange={e => setDeliveryPerson(e.target.value)}
                          placeholder="Typed driver/delivery person"
                          className="w-full px-3 py-2 border rounded-xl text-xs text-white bg-slate-900 border-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Performed By (Logged in)</label>
                        <input
                          type="text"
                          value={localStorage.getItem('username') || 'Admin'}
                          disabled
                          className="w-full px-3 py-2 border rounded-xl text-xs text-slate-400 bg-slate-900/50 border-slate-800 font-semibold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">From Place</label>
                        <input
                          type="text"
                          value={fromPlace}
                          onChange={e => setFromPlace(e.target.value)}
                          placeholder="Source place"
                          className="w-full px-3 py-2 border rounded-xl text-xs text-white bg-slate-900 border-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">To Place (Destination)</label>
                          {targetGodown?.label && toPlace !== targetGodown.label && (
                            <button
                              type="button"
                              onClick={() => setToPlace(targetGodown.label)}
                              className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                            >
                              Use {targetGodown.label}
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          list="godown-to-places"
                          value={toPlace}
                          onChange={e => setToPlace(e.target.value)}
                          placeholder="Destination place"
                          className="w-full px-3 py-2 border rounded-xl text-xs text-white bg-slate-900 border-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                        <datalist id="godown-to-places">
                          {godownOptions.map(g => (
                            <option key={g.value} value={g.label} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Date */}
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-300">Transfer Date</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowTransferDatePicker(!showTransferDatePicker)}
                    className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl hover:border-slate-700 text-xs flex items-center gap-2 text-indigo-400 font-medium transition"
                  >
                    <FaCalendarAlt />
                    <span>{transferDate ? formatIST(transferDate.toISOString()) : 'Today (default)'}</span>
                  </button>
                </div>
                {showTransferDatePicker && (
                  <div className="mt-2 z-50">
                    <DatePicker
                      selected={transferDate}
                      onChange={(date) => { setTransferDate(date); setShowTransferDatePicker(false); }}
                      onClickOutside={() => setShowTransferDatePicker(false)}
                      inline
                      maxDate={new Date()}
                    />
                  </div>
                )}
              </div>

              {error && <p className="text-rose-400 text-xs mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl font-semibold">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={() => setTransferModalIsOpen(false)}
                  className="flex-1 py-3 border border-slate-800 rounded-xl text-xs text-slate-300 hover:bg-slate-800 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransferStock}
                  disabled={transferring || !targetGodown || (!casesTransfer && !loosePiecesTransfer) || (parseFloat(casesTransfer || 0) <= 0 && parseFloat(loosePiecesTransfer || 0) <= 0)}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition text-xs"
                >
                  {transferring ? <>Transferring... <FaSpinner className="animate-spin" /></> : 'Confirm Transfer & Generate Challan'}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <style>{`
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        [style*="backgroundDark"] { background: var(--bg, ${styles.input.background}); }
        [style*="backgroundDark"][data-dark] { --bg: ${styles.input.backgroundDark}; }
        [style*="borderDark"] { border: var(--border, ${styles.input.border}); }
        [style*="borderDark"][data-dark] { --border: ${styles.input.borderDark}; }
        [style*="boxShadowDark"] { box-shadow: var(--shadow, ${styles.button.boxShadow}); }
        [style*="boxShadowDark"][data-dark] { --shadow: ${styles.button.boxShadowDark}; }
      `}</style>
    </div>
  );
}