import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../../Admin/Logout';
import Select from 'react-select';
import { API_BASE_URL } from '../../../Config';
import {
  FaPlus, FaTrash, FaFilePdf, FaSpinner, FaDownload, FaTimes,
  FaSearch, FaChevronDown, FaChevronUp, FaWarehouse, FaBoxOpen,
  FaCheckCircle, FaExclamationTriangle, FaTag
} from 'react-icons/fa';

// ─── Floating label input ─────────────────────────────────────────────────────
const FloatingLabelInput = ({ value, onChange, placeholder, type = 'text', className = '', ...props }) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const isActive = isFocused || (value !== undefined && value !== null && value.toString().trim() !== '');
  return (
    <div className="relative">
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`w-full rounded-lg px-4 py-2.5 border ${isActive ? 'border-green-500' : 'border-gray-300 dark:border-gray-600'}
                   bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-0 focus:border-green-500 peer placeholder-transparent ${className}`}
        placeholder=" "
        {...props}
      />
      <label
        onClick={() => inputRef.current?.focus()}
        className={`absolute left-4 transition-all duration-200 pointer-events-none
        ${isActive
            ? '-top-3 text-xs font-medium text-green-600 dark:text-green-400 bg-white dark:bg-gray-800 px-2'
            : 'top-2.5 text-gray-500 dark:text-gray-400'
          }`}
      >
        {placeholder}
      </label>
    </div>
  );
};

const emptyItem = () => ({
  productname: '', brand: '', cases: '', per_case: 1, loose_pieces: '',
  received_now: '', received_loose: '', rate_per_box: 0,
  discount_percent: 0, godown_id: null, godown_name: '', fromInventory: false,
  from_direct_godown: false, matched_history_id: null,
});

export default function Purchase() {
  const [supplier, setSupplier] = useState({
    name: '', address: '', gstin: '', invoice_number: '', agent_name: '', from: 'SIVAKASI', to: 'SIVAKASI', through: ''
  });

  const [knownSuppliers, setKnownSuppliers] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [cart, setCart] = useState([emptyItem()]);
  const [additionalDiscount, setAdditionalDiscount] = useState(0);
  const [packingPercent, setPackingPercent] = useState(3.0);
  const [taxableValue, setTaxableValue] = useState('');
  const [applyProcessingFee, setApplyProcessingFee] = useState(false);
  const [applyCGST, setApplyCGST] = useState(false);
  const [applySGST, setApplySGST] = useState(false);
  const [applyIGST, setApplyIGST] = useState(false);
  const [isSupplierOpen, setIsSupplierOpen] = useState(true);

  // Unbilled Direct Godown Stock Entries
  const [unbilledGodownStocks, setUnbilledGodownStocks] = useState([]);
  const [showUnbilledDropdown, setShowUnbilledDropdown] = useState(false);
  const [loadingUnbilled, setLoadingUnbilled] = useState(false);

  // Inventory search
  const [searchQuery, setSearchQuery] = useState('');
  const [inventoryResults, setInventoryResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [activeSearchIdx, setActiveSearchIdx] = useState(null);

  // Godowns
  const [godowns, setGodowns] = useState([]);

  // Loading / status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState('');
  const [purchaseNumber, setPurchaseNumber] = useState('');
  const [allocationSummary, setAllocationSummary] = useState([]);

  // New product modal (for products not found in inventory)
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProductItems, setNewProductItems] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [addingToInventory, setAddingToInventory] = useState(false);
  const [inventoryAddResult, setInventoryAddResult] = useState(null);

  const cardClass = 'bg-white dark:bg-gray-800 rounded-xl shadow-lg';
  const textClass = 'text-black dark:text-white';
  const inputClass = 'w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:border-green-500';

  const capitalize = str => str?.toLowerCase().split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '';

  const fetchUnbilledStocks = async () => {
    try {
      setLoadingUnbilled(true);
      const r = await fetch(`${API_BASE_URL}/api/purchase/unbilled-godown-stocks`);
      if (r.ok) {
        const data = await r.json();
        setUnbilledGodownStocks(data || []);
      }
    } catch (_) { }
    finally { setLoadingUnbilled(false); }
  };

  useEffect(() => {
    fetchUnbilledStocks();
  }, []);

  const matchDirectGodownStock = (entry) => {
    const newItem = {
      productname: entry.productname,
      brand: entry.brand || '',
      cases: entry.cases || 1,
      loose_pieces: '',
      received_now: entry.cases || 1,
      received_loose: '',
      per_case: entry.per_case || 1,
      rate_per_box: parseFloat(entry.rate_per_box || 0),
      discount_percent: 0,
      godown_id: entry.godown_id,
      godown_name: entry.godown_name,
      fromInventory: true,
      from_direct_godown: true,
      matched_history_id: entry.history_id,
    };

    setCart(prev => {
      if (prev.length === 1 && !prev[0].productname.trim()) return [newItem];
      return [...prev, newItem];
    });

    setUnbilledGodownStocks(prev => prev.filter(e => e.history_id !== entry.history_id));
    setSuccess(`Matched "${entry.productname}" (${entry.cases} cs in ${entry.godown_name}) to purchase bill!`);
    setTimeout(() => setSuccess(''), 4000);
  };

  const matchAllDirectGodownStocks = () => {
    if (!unbilledGodownStocks.length) return;
    const newItems = unbilledGodownStocks.map(entry => ({
      productname: entry.productname,
      brand: entry.brand || '',
      cases: entry.cases || 1,
      loose_pieces: '',
      received_now: entry.cases || 1,
      received_loose: '',
      per_case: entry.per_case || 1,
      rate_per_box: parseFloat(entry.rate_per_box || 0),
      discount_percent: 0,
      godown_id: entry.godown_id,
      godown_name: entry.godown_name,
      fromInventory: true,
      from_direct_godown: true,
      matched_history_id: entry.history_id,
    }));

    setCart(prev => {
      const filtered = prev.filter(i => i.productname.trim());
      return [...filtered, ...newItems];
    });

    setUnbilledGodownStocks([]);
    setShowUnbilledDropdown(false);
    setSuccess(`Matched all ${newItems.length} direct godown entries to purchase bill!`);
    setTimeout(() => setSuccess(''), 4000);
  };

  // ── Fetch Godowns ──
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/godowns`)
      .then(r => r.json())
      .then(data => {
        setGodowns((data || []).map(g => ({
          value: Number(g.id),
          label: capitalize(g.name),
          name: g.name
        })));
      })
      .catch(() => { });
  }, []);

  // ── Fetch Known Suppliers ──
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/purchase-suppliers`)
      .then(r => r.json())
      .then(data => setKnownSuppliers((data || []).map(s => ({
        value: s.supplier_name, label: s.supplier_name, data: s,
      }))))
      .catch(() => { });
  }, []);

  // ── Fetch Product Types for new product modal ──
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/binvent/product-types`)
      .then(r => r.json())
      .then(data => setProductTypes((data || []).map(t => ({ value: t, label: capitalize(t) }))))
      .catch(() => { });
  }, []);

  const handleSelectParty = (option) => {
    setSelectedParty(option);
    if (option) {
      const s = option.data;
      setSupplier(prev => ({
        ...prev,
        name: s.supplier_name || '',
        address: s.address || '',
        gstin: s.gstin || '',
        agent_name: s.agent_name || '',
        from: s.from || 'SIVAKASI',
        to: s.to || 'SIVAKASI',
        through: s.through || '',
      }));
    }
  };

  // ── Inventory Search (from tproductssstable) ──
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setInventoryResults([]);
      return;
    }
    const delay = setTimeout(() => {
      setLoadingSearch(true);
      fetch(`${API_BASE_URL}/api/binvent/tproducts/search?name=${encodeURIComponent(searchQuery)}`)
        .then(r => r.json())
        .then(data => setInventoryResults(data || []))
        .catch(() => setInventoryResults([]))
        .finally(() => setLoadingSearch(false));
    }, 350);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  // ── Add inventory product to a specific row ──
  const addInventoryProductToRow = (p, idx) => {
    setCart(prev => prev.map((item, i) => i === idx ? {
      ...item,
      productname: p.productname,
      brand: p.brand || '',
      per_case: p.per_case || 1,
      rate_per_box: parseFloat(p.rate_per_box || 0),
      fromInventory: true,
    } : item));
    setSearchQuery('');
    setInventoryResults([]);
    setActiveSearchIdx(null);
  };

  // ── Add product from global search (to new row or replace empty first row) ──
  const addInventoryProductToCart = (p) => {
    const newItem = {
      productname: p.productname,
      brand: p.brand || '',
      cases: '',
      loose_pieces: '',
      received_now: '',
      received_loose: '',
      per_case: p.per_case || 1,
      rate_per_box: parseFloat(p.rate_per_box || 0),
      discount_percent: 0,
      godown_id: null,
      godown_name: '',
      fromInventory: true,
    };
    setCart(prev => {
      if (prev.length === 1 && !prev[0].productname.trim()) return [newItem];
      return [...prev, newItem];
    });
    setSearchQuery('');
    setInventoryResults([]);
  };

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const addItem = () => setCart(c => [...c, emptyItem()]);
  const removeItem = (idx) => setCart(c => c.filter((_, i) => i !== idx));
  const updateItem = (idx, field, value) => setCart(c => c.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  // ── Calculations ─────────────────────────────────────────────────────────
  const computeTotals = () => {
    let subtotal = 0, totalCases = 0, totalPieces = 0;
    cart.forEach(item => {
      const cases = parseFloat(item.cases) || 0;
      const loose = parseFloat(item.loose_pieces) || 0;
      const per = parseFloat(item.per_case) || 1;
      const rate = parseFloat(item.rate_per_box) || 0;
      const disc = parseFloat(item.discount_percent) || 0;
      const totalPcs = Math.round((cases * per) + loose);
      const effectiveCases = per > 0 ? (totalPcs / per) : cases;
      const amt = totalPcs * rate;
      subtotal += amt - amt * (disc / 100);
      totalCases += effectiveCases;
      totalPieces += totalPcs;
    });
    totalCases = Math.round(totalCases * 100) / 100;
    const packingCharges = applyProcessingFee ? subtotal * (packingPercent / 100) : 0;
    const extraTaxable = parseFloat(taxableValue) || 0;
    const taxableAmount = subtotal + packingCharges + extraTaxable;
    const discountAmtTotal = taxableAmount * (additionalDiscount / 100);
    const netTaxable = taxableAmount - discountAmtTotal;
    let cgst = 0, sgst = 0, igst = 0;
    if (applyIGST) igst = netTaxable * 0.18;
    else if (applyCGST && applySGST) { cgst = netTaxable * 0.09; sgst = netTaxable * 0.09; }
    const totalTax = cgst + sgst + igst;
    const grandTotal = Math.round(netTaxable + totalTax);
    const roundOff = grandTotal - (netTaxable + totalTax);
    return { subtotal, packingCharges, taxableAmount, discountAmtTotal, netTaxable, cgst, sgst, igst, totalTax, grandTotal, roundOff, totalCases, totalPieces };
  };

  const totals = computeTotals();

  // ── Check which cart items are new (not in inventory) ──────────────────
  const checkNewProducts = async (validItems) => {
    const newOnes = [];
    for (const item of validItems) {
      if (item.fromInventory) continue; // already in inventory
      try {
        const r = await fetch(
          `${API_BASE_URL}/api/binvent/tproducts/check?productname=${encodeURIComponent(item.productname)}&brand=${encodeURIComponent(item.brand || '')}`
        );
        const d = await r.json();
        if (!d.exists) {
          newOnes.push({
            productname: item.productname,
            brand: item.brand || '',
            rate_per_box: item.rate_per_box,
            per_case: item.per_case,
            product_type: null,
          });
        }
      } catch { }
    }
    return newOnes;
  };

  // ── Submit Purchase Order ──────────────────────────────────────────────
  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (!supplier.name.trim()) return setError('Supplier name is required');
    const validItems = cart.filter(i => i.productname && ((parseFloat(i.cases) || 0) > 0 || (parseFloat(i.loose_pieces) || 0) > 0) && (parseFloat(i.per_case) || 0) > 0);
    if (!validItems.length) return setError('Add at least one valid item with cases or pieces');

    setLoading(true);
    try {
      const payload = {
        supplier_name: supplier.name,
        address: supplier.address,
        gstin: supplier.gstin,
        invoice_number: supplier.invoice_number,
        agent_name: supplier.agent_name || 'DIRECT',
        from: supplier.from || 'SIVAKASI',
        to: supplier.to || 'SIVAKASI',
        through: supplier.through,
        additional_discount: parseFloat(additionalDiscount) || 0,
        packing_percent: parseFloat(packingPercent) || 3.0,
        taxable_value: parseFloat(taxableValue) || 0,
        apply_processing_fee: applyProcessingFee,
        apply_cgst: applyCGST,
        apply_sgst: applySGST,
        apply_igst: applyIGST,
        performed_by: localStorage.getItem('username') || 'Unknown',
        items: validItems.map(i => {
          const casesNum = parseFloat(i.cases) || 0;
          const perCaseNum = parseFloat(i.per_case) || 1;
          const looseNum = parseFloat(i.loose_pieces) || 0;
          const totalPcs = Math.round((casesNum * perCaseNum) + looseNum);
          const effectiveCases = perCaseNum > 0 ? (Math.round((totalPcs / perCaseNum) * 100) / 100) : casesNum;

          const recvCasesNum = (i.received_now !== undefined && i.received_now !== '') ? (parseFloat(i.received_now) || 0) : casesNum;
          const recvLooseNum = (i.received_loose !== undefined && i.received_loose !== '') ? (parseFloat(i.received_loose) || 0) : looseNum;
          const recvTotalPcs = Math.round((recvCasesNum * perCaseNum) + recvLooseNum);
          const recvEffectiveCases = perCaseNum > 0 ? (Math.round((recvTotalPcs / perCaseNum) * 100) / 100) : recvCasesNum;

          return {
            productname: i.productname,
            brand: i.brand || '',
            cases: effectiveCases,
            booked_cases: casesNum,
            booked_loose_pieces: looseNum,
            quantity: totalPcs,
            received_now: recvEffectiveCases,
            received_loose: recvLooseNum,
            per_case: perCaseNum,
            rate_per_box: parseFloat(i.rate_per_box) || 0,
            discount_percent: parseFloat(i.discount_percent) || 0,
            godown: i.godown_name || supplier.from || 'SIVAKASI',
            product_type: 'general',
            from_direct_godown: !!i.from_direct_godown,
            matched_history_id: i.matched_history_id || null,
          };
        }),
      };

      const res = await fetch(`${API_BASE_URL}/api/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to create purchase');

      setPurchaseNumber(data.purchase_number);
      setAllocationSummary(data.allocationSummary || []);
      setSuccess(`Purchase Order ${data.purchase_number} created! Total: ₹${data.grandTotal}`);
      fetchUnbilledStocks();

      if (data.pdfBase64) {
        const byteChars = atob(data.pdfBase64.split(',')[1]);
        const bytes = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'application/pdf' });
        setPdfBlobUrl(URL.createObjectURL(blob));
        setShowPDFModal(true);
      }

      // Check for new products to add to inventory
      const newOnes = await checkNewProducts(validItems);
      if (newOnes.length > 0) {
        setNewProductItems(newOnes);
        setShowNewProductModal(true);
      }

      // Reset
      setCart([emptyItem()]);
      setSupplier({ name: '', address: '', gstin: '', invoice_number: '', agent_name: '', from: 'SIVAKASI', to: 'SIVAKASI', through: '' });
      setAdditionalDiscount(0); setPackingPercent(3.0); setTaxableValue('');
      setApplyProcessingFee(false); setApplyCGST(false); setApplySGST(false); setApplyIGST(false);
      setSelectedParty(null);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // ── Add new products to inventory ────────────────────────────────────────
  const handleAddToInventory = async () => {
    const missing = newProductItems.filter(p => !p.product_type);
    if (missing.length > 0) {
      return setInventoryAddResult({ type: 'error', message: `Please select a product type for: ${missing.map(p => p.productname).join(', ')}` });
    }
    setAddingToInventory(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/binvent/tproducts/add-from-purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: newProductItems }),
      });
      const data = await res.json();
      if (data.success) {
        setInventoryAddResult({ type: 'success', message: `${data.added.length} product(s) added to inventory!` });
        setTimeout(() => { setShowNewProductModal(false); setInventoryAddResult(null); setNewProductItems([]); }, 2000);
      } else {
        setInventoryAddResult({ type: 'error', message: data.message || 'Failed' });
      }
    } catch (err) {
      setInventoryAddResult({ type: 'error', message: err.message });
    } finally {
      setAddingToInventory(false);
    }
  };

  const selectStyles = {
    control: (b, s) => ({
      ...b,
      minHeight: '36px',
      fontSize: '12px',
      borderRadius: '8px',
      backgroundColor: '#1e293b',
      borderColor: s.isFocused ? '#10b981' : '#334155',
      color: '#ffffff',
      boxShadow: 'none',
      '&:hover': { borderColor: '#10b981' },
    }),
    valueContainer: (b) => ({
      ...b,
      padding: '2px 8px',
    }),
    singleValue: (b) => ({
      ...b,
      color: '#ffffff',
      fontWeight: '600',
    }),
    input: (b) => ({
      ...b,
      color: '#ffffff',
    }),
    placeholder: (b) => ({
      ...b,
      color: '#94a3af',
    }),
    menu: (b) => ({
      ...b,
      zIndex: 99999,
      fontSize: '12px',
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '8px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
      overflow: 'hidden',
    }),
    menuPortal: (b) => ({ ...b, zIndex: 99999 }),
    option: (b, s) => ({
      ...b,
      fontSize: '12px',
      backgroundColor: s.isSelected ? '#059669' : s.isFocused ? '#334155' : '#1e293b',
      color: '#ffffff',
      cursor: 'pointer',
    }),
    clearIndicator: (b) => ({
      ...b,
      color: '#94a3af',
      padding: '4px',
      '&:hover': { color: '#ef4444' }
    }),
    dropdownIndicator: (b) => ({
      ...b,
      color: '#94a3af',
      padding: '4px',
      '&:hover': { color: '#10b981' }
    }),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 hundred:ml-64">
      <Sidebar />
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">New Purchase Order</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Products selected from Inventory — stock is auto-allocated to Godown on save</p>
          </div>
          <Logout />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
            <FaTimes /> {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-300 text-green-700 dark:text-green-300 text-sm flex items-center gap-2">
            <FaCheckCircle /> {success}
          </div>
        )}

        {/* Allocation Summary (after successful save) */}
        {allocationSummary.length > 0 && (
          <div className="mb-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
            <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
              <FaWarehouse /> Godown Allocation Summary (last order)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {allocationSummary.map((a, i) => (
                <div key={i} className="text-xs bg-white dark:bg-gray-800 rounded-lg p-2 border border-blue-100 dark:border-blue-800 flex justify-between">
                  <span className="font-medium text-gray-800 dark:text-gray-200">{a.product}</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{a.godown} · {a.cases} cases</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Supplier Details */}
        <div className={`${cardClass} p-5 mb-4`}>
          <button className="w-full flex items-center justify-between text-left mb-4" onClick={() => setIsSupplierOpen(o => !o)}>
            <h2 className={`text-lg font-semibold ${textClass}`}>Supplier Details</h2>
            {isSupplierOpen ? <FaChevronUp className="text-gray-500" /> : <FaChevronDown className="text-gray-500" />}
          </button>

          {/* Select Party */}
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Select Party (Auto-fill from history)</p>
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <Select
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  menuPosition="fixed"
                  options={knownSuppliers}
                  value={selectedParty}
                  onChange={handleSelectParty}
                  placeholder="Search & select a previous supplier..."
                  isClearable
                  styles={selectStyles}
                />
              </div>
              {selectedParty && (
                <button
                  onClick={() => { setSelectedParty(null); setSupplier({ name: '', address: '', gstin: '', invoice_number: '', agent_name: '', from: 'SIVAKASI', to: 'SIVAKASI', through: '' }); }}
                  className="text-xs px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors whitespace-nowrap"
                >Clear</button>
              )}
            </div>
          </div>

          {isSupplierOpen && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FloatingLabelInput value={supplier.name} onChange={e => setSupplier(s => ({ ...s, name: e.target.value }))} placeholder="Supplier Name *" />
              <FloatingLabelInput value={supplier.address} onChange={e => setSupplier(s => ({ ...s, address: e.target.value }))} placeholder="Address" />
              <FloatingLabelInput value={supplier.gstin} onChange={e => setSupplier(s => ({ ...s, gstin: e.target.value }))} placeholder="GSTIN" />
              <FloatingLabelInput value={supplier.invoice_number} onChange={e => setSupplier(s => ({ ...s, invoice_number: e.target.value }))} placeholder="Supplier Invoice No." />
              <FloatingLabelInput value={supplier.agent_name} onChange={e => setSupplier(s => ({ ...s, agent_name: e.target.value }))} placeholder="Agent Name" />
              <FloatingLabelInput value={supplier.from} onChange={e => setSupplier(s => ({ ...s, from: e.target.value }))} placeholder="From" />
              <FloatingLabelInput value={supplier.to} onChange={e => setSupplier(s => ({ ...s, to: e.target.value }))} placeholder="To" />
              <FloatingLabelInput value={supplier.through} onChange={e => setSupplier(s => ({ ...s, through: e.target.value }))} placeholder="Through (Transport)" />
            </div>
          )}
        </div>

        {/* Inventory Search Bar */}
        <div className={`${cardClass} p-5 mb-4 border border-green-200 dark:border-green-800/40`}>
          <div className="flex items-center gap-2 mb-3">
            <FaBoxOpen className="text-green-600 dark:text-green-400 text-lg" />
            <div>
              <h2 className={`text-base font-bold ${textClass}`}>Search & Add from Inventory</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Searches your master inventory list — click a result to add a new row</p>
            </div>
          </div>
          <div className="relative">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setActiveSearchIdx(null); }}
              placeholder="Type product name or brand to search inventory..."
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-black dark:text-white text-sm focus:outline-none focus:border-green-500"
            />
            {loadingSearch && <FaSpinner className="animate-spin absolute right-3.5 top-1/2 -translate-y-1/2 text-green-500" />}

            {inventoryResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-40 max-h-60 overflow-y-auto">
                {inventoryResults.map((p, idx) => (
                  <div
                    key={idx}
                    onClick={() => addInventoryProductToCart(p)}
                    className="p-3 hover:bg-green-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700/50 flex justify-between items-center text-xs transition-colors"
                  >
                    <div>
                      <span className="font-bold text-gray-900 dark:text-white text-sm">{p.productname}</span>
                      <div className="text-gray-500 dark:text-gray-400 flex gap-3 mt-0.5">
                        <span>Brand: <strong>{p.brand || '—'}</strong></span>
                        <span>Per Case: <strong>{p.per_case}</strong></span>
                        <span>Rate: <strong>₹{p.rate_per_box}</strong></span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 font-semibold rounded-lg">+ Add Row</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className={`${cardClass} p-5 mb-4`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`text-lg font-semibold ${textClass}`}>Purchase Items</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total cases will be billed. Use 'Recv Now' if only partial cases arrived initially.</p>
            </div>
            <button onClick={addItem} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
              <FaPlus /> Add Item Row
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[950px]">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                  {['#', 'Product Name', 'Brand', 'Full Cases Booked', 'Per Case (Qty)', 'Loose / Extra Pcs', 'Total Booked Pcs', 'Recv Cases', 'Recv Loose', 'Rate/Box', 'Disc%', 'Amount', 'Target Godown', ''].map(h => (
                    <th key={h} className={`px-2 py-2.5 text-left font-semibold text-xs tracking-wider ${textClass}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cart.map((item, idx) => {
                  const cases = parseFloat(item.cases) || 0;
                  const per = parseFloat(item.per_case) || 1;
                  const loose = parseFloat(item.loose_pieces) || 0;
                  const totalBookedPcs = Math.round((cases * per) + loose);
                  const effectiveCases = per > 0 ? (Math.round((totalBookedPcs / per) * 100) / 100) : cases;

                  const recvCases = (item.received_now !== undefined && item.received_now !== '') ? (parseFloat(item.received_now) || 0) : cases;
                  const recvLoose = (item.received_loose !== undefined && item.received_loose !== '') ? (parseFloat(item.received_loose) || 0) : loose;
                  const totalRecvPcs = Math.round((recvCases * per) + recvLoose);

                  const rate = parseFloat(item.rate_per_box) || 0;
                  const disc = parseFloat(item.discount_percent) || 0;
                  const amt = totalBookedPcs * rate * (1 - disc / 100);
                  const isPartial = totalBookedPcs > 0 && totalRecvPcs < totalBookedPcs;

                  return (
                    <tr key={idx} className={`border-t border-gray-200 dark:border-gray-700/60 transition-colors ${item.fromInventory ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30'}`}>
                      <td className={`px-2 py-2 font-medium ${textClass} text-xs`}>
                        {idx + 1}
                        {item.fromInventory && <span title="From Master Inventory" className="ml-1 text-emerald-500 font-bold">✓</span>}
                      </td>
                      <td className="px-2 py-1.5 relative">
                        <input
                          type="text"
                          value={item.productname}
                          onChange={e => updateItem(idx, 'productname', e.target.value)}
                          onFocus={() => setActiveSearchIdx(idx)}
                          className={`${inputClass} w-32 sm:w-36`}
                          placeholder="Product name"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={item.brand}
                          onChange={e => updateItem(idx, 'brand', e.target.value)}
                          className={`${inputClass} w-20`}
                          placeholder="Brand"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          step="any"
                          value={item.cases}
                          onChange={e => {
                            const val = e.target.value;
                            updateItem(idx, 'cases', val);
                            if (item.received_now === undefined || item.received_now === '' || item.received_now === item.cases) {
                              updateItem(idx, 'received_now', val);
                            }
                          }}
                          className={`${inputClass} w-16 font-semibold`}
                          min="0"
                          placeholder="Cases"
                          title="Full cases booked (e.g. 1, 2, or 0 if only loose pieces)"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={item.per_case}
                          onChange={e => updateItem(idx, 'per_case', e.target.value)}
                          className={`${inputClass} w-16`}
                          min="1"
                          title="Fixed quantity per 1 full case"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          step="any"
                          value={item.loose_pieces}
                          onChange={e => {
                            const val = e.target.value;
                            updateItem(idx, 'loose_pieces', val);
                            if (item.received_loose === undefined || item.received_loose === '' || item.received_loose === item.loose_pieces) {
                              updateItem(idx, 'received_loose', val);
                            }
                          }}
                          className={`${inputClass} w-20 text-indigo-400 font-semibold`}
                          min="0"
                          placeholder="Extra pcs"
                          title="Count of extra/loose pieces (e.g. 20, or 25 for half case)"
                        />
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className={`font-bold text-xs ${textClass}`}>{totalBookedPcs} pcs</span>
                          <span className="text-[10px] text-gray-400">
                            {effectiveCases === 0.5 ? '½ Case' : `${effectiveCases} cs`}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          step="any"
                          value={item.received_now !== undefined ? item.received_now : item.cases}
                          onChange={e => updateItem(idx, 'received_now', e.target.value)}
                          className={`${inputClass} w-16 border-emerald-500/50 text-emerald-400 font-bold`}
                          min="0"
                          placeholder="Recv cs"
                          title="Full cases received now"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex flex-col">
                          <input
                            type="number"
                            step="any"
                            value={item.received_loose !== undefined ? item.received_loose : item.loose_pieces}
                            onChange={e => updateItem(idx, 'received_loose', e.target.value)}
                            className={`${inputClass} w-16 border-emerald-500/50 text-emerald-400 font-bold`}
                            min="0"
                            placeholder="Recv pcs"
                            title="Loose pieces received now"
                          />
                          {isPartial && (
                            <span className="text-[10px] text-amber-400 font-medium whitespace-nowrap mt-0.5">
                              {totalBookedPcs - totalRecvPcs} pcs pending
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          step="0.01"
                          value={item.rate_per_box}
                          onChange={e => updateItem(idx, 'rate_per_box', e.target.value)}
                          className={`${inputClass} w-20`}
                          min="0"
                          title="Rate per piece / box"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={item.discount_percent}
                          onChange={e => updateItem(idx, 'discount_percent', e.target.value)}
                          className={`${inputClass} w-14`}
                          min="0"
                          max="100"
                        />
                      </td>
                      <td className={`px-2 py-2 font-bold text-xs ${textClass} whitespace-nowrap`}>
                        ₹{amt.toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5" style={{ minWidth: '150px' }}>
                        <Select
                          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                          menuPosition="fixed"
                          menuPlacement="auto"
                          menuShouldScrollIntoView={false}
                          closeMenuOnScroll={false}
                          options={godowns}
                          value={godowns.find(g => g.value === item.godown_id) || null}
                          onChange={opt => {
                            updateItem(idx, 'godown_id', opt?.value || null);
                            updateItem(idx, 'godown_name', opt?.label || opt?.name || '');
                          }}
                          placeholder="Select Godown..."
                          isClearable
                          styles={selectStyles}
                        />
                        {item.godown_name && (
                          <span className="text-[10px] text-emerald-400 font-semibold block truncate mt-0.5">
                            ✓ {item.godown_name}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {cart.length > 1 && (
                          <button onClick={() => removeItem(idx)} className="text-rose-500 hover:text-rose-700 transition-colors p-1" title="Remove row">
                            <FaTrash size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {cart.some(i => !i.godown_id) && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
              <FaExclamationTriangle /> Items without a godown selected will not be auto-allocated to stock.
            </p>
          )}
        </div>

        {/* Charges & Taxes */}
        <div className={`${cardClass} p-5 mb-4`}>
          <h2 className={`text-lg font-semibold ${textClass} mb-4`}>Charges & Taxes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input type="checkbox" checked={applyProcessingFee} onChange={e => setApplyProcessingFee(e.target.checked)} className="accent-green-500" />
                <span className={`text-sm font-medium ${textClass}`}>Packing Charges</span>
              </label>
              {applyProcessingFee && (
                <FloatingLabelInput type="number" value={packingPercent} onChange={e => setPackingPercent(e.target.value)} placeholder="Packing %" />
              )}
            </div>
            <FloatingLabelInput type="number" value={additionalDiscount} onChange={e => setAdditionalDiscount(e.target.value)} placeholder="Additional Discount %" />
            <FloatingLabelInput type="number" value={taxableValue} onChange={e => setTaxableValue(e.target.value)} placeholder="Extra Taxable Value" />
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={applyCGST} onChange={e => { setApplyCGST(e.target.checked); setApplyIGST(false); }} className="accent-green-500" />
                <span className={`text-sm ${textClass}`}>CGST @ 9%</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={applySGST} onChange={e => { setApplySGST(e.target.checked); setApplyIGST(false); }} className="accent-green-500" />
                <span className={`text-sm ${textClass}`}>SGST @ 9%</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={applyIGST} onChange={e => { setApplyIGST(e.target.checked); setApplyCGST(false); setApplySGST(false); }} className="accent-green-500" />
                <span className={`text-sm ${textClass}`}>IGST @ 18%</span>
              </label>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className={`${cardClass} p-5 mb-4`}>
          <h2 className={`text-lg font-semibold ${textClass} mb-4`}>Order Summary</h2>
          <div className="max-w-sm ml-auto space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Total Cases:</span><span className={textClass}>{totals.totalCases}</span></div>
            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Goods Value:</span><span className={textClass}>₹{totals.subtotal.toFixed(2)}</span></div>
            {totals.packingCharges > 0 && <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Packing @ {packingPercent}%:</span><span className={textClass}>₹{totals.packingCharges.toFixed(2)}</span></div>}
            {totals.discountAmtTotal > 0 && <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Discount:</span><span className="text-red-500">-₹{totals.discountAmtTotal.toFixed(2)}</span></div>}
            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Taxable Value:</span><span className={textClass}>₹{totals.netTaxable.toFixed(2)}</span></div>
            {totals.cgst > 0 && <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">CGST @ 9%:</span><span className={textClass}>₹{totals.cgst.toFixed(2)}</span></div>}
            {totals.sgst > 0 && <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">SGST @ 9%:</span><span className={textClass}>₹{totals.sgst.toFixed(2)}</span></div>}
            {totals.igst > 0 && <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">IGST @ 18%:</span><span className={textClass}>₹{totals.igst.toFixed(2)}</span></div>}
            <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
              <span className={`font-bold text-base ${textClass}`}>Grand Total:</span>
              <span className="font-bold text-base text-green-600 dark:text-green-400">₹{totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition-all"
            >
              {loading ? <FaSpinner className="animate-spin" /> : <FaFilePdf />}
              {loading ? 'Creating...' : 'Create Purchase Order'}
            </button>
          </div>
        </div>
      </div>

      {/* PDF Modal */}
      {showPDFModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Purchase Order – {purchaseNumber}</h3>
              <div className="flex gap-2">
                <a href={pdfBlobUrl} download={`${purchaseNumber}.pdf`}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors">
                  <FaDownload /> Download
                </a>
                <button onClick={() => { setShowPDFModal(false); setPdfBlobUrl(''); }}
                  className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                  <FaTimes className="text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            </div>
            {allocationSummary.length > 0 && (
              <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 text-xs">
                <span className="font-bold text-blue-700 dark:text-blue-300">📦 Stock Auto-Allocated: </span>
                {allocationSummary.map((a, i) => (
                  <span key={i} className="mr-3 text-blue-600 dark:text-blue-400">{a.product} → <strong>{a.godown}</strong> ({a.cases} cases)</span>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <iframe src={pdfBlobUrl} className="w-full h-full rounded-b-2xl" title="Purchase Order PDF" />
            </div>
          </div>
        </div>
      )}

      {/* New Products Modal — Ask for Product Type */}
      {showNewProductModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <FaExclamationTriangle className="text-amber-500" /> New Products Detected
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                These products are not in your Inventory master. Select a product type to add them.
              </p>
            </div>
            <div className="p-5 space-y-4 max-h-96 overflow-y-auto">
              {newProductItems.map((p, i) => (
                <div key={i} className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-gray-800 dark:text-white">{p.productname}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Brand: {p.brand || '—'} · Rate: ₹{p.rate_per_box} · Per Case: {p.per_case}</p>
                    </div>
                    <FaTag className="text-amber-500 mt-1" />
                  </div>
                  <Select
                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                    menuPosition="fixed"
                    options={productTypes}
                    value={productTypes.find(t => t.value === p.product_type) || null}
                    onChange={opt => {
                      setNewProductItems(prev => prev.map((x, xi) => xi === i ? { ...x, product_type: opt?.value || null } : x));
                    }}
                    placeholder="Select Product Type..."
                    styles={selectStyles}
                  />
                </div>
              ))}
            </div>

            {inventoryAddResult && (
              <div className={`mx-5 mb-3 p-3 rounded-lg text-sm ${inventoryAddResult.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                {inventoryAddResult.message}
              </div>
            )}

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
              <button
                onClick={() => { setShowNewProductModal(false); setNewProductItems([]); setInventoryAddResult(null); }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >Skip (Don't add to Inventory)</button>
              <button
                onClick={handleAddToInventory}
                disabled={addingToInventory}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {addingToInventory ? <FaSpinner className="animate-spin" /> : <FaPlus />}
                Add to Inventory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
