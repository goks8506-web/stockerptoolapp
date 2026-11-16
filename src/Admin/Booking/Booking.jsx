import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../../Admin/Logout';
import Select from 'react-select';
import Modal from 'react-modal';
import { API_BASE_URL } from '../../../Config';
import {
  FaPlus, FaTrash, FaFilePdf, FaSpinner, FaDownload, FaTimes,
  FaSearch, FaChevronDown, FaChevronUp, FaCheckCircle, FaBell,
  FaUser, FaPhone, FaMapMarkerAlt, FaWarehouse, FaBoxOpen,
  FaReceipt, FaExchangeAlt, FaTruck
} from 'react-icons/fa';

Modal.setAppElement("#root");

const capitalize = (str) =>
  str?.toLowerCase().split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '';

const formatCasesAndPcs = (casesVal, perCaseVal) => {
  const c = parseFloat(casesVal) || 0;
  const p = Math.max(1, parseInt(perCaseVal, 10) || 1);
  const totalPcs = Math.round(c * p);
  const fullCases = Math.floor(totalPcs / p);
  const loosePcs = totalPcs % p;

  if (fullCases > 0 && loosePcs > 0) return `${fullCases}cs ${loosePcs}pcs`;
  if (fullCases > 0) return `${fullCases}cs`;
  return `${loosePcs}pcs`;
};

export default function Booking() {
  const [godowns, setGodowns] = useState([]);
  const [selectedGodown, setSelectedGodown] = useState(null);
  const [stock, setStock] = useState([]);
  const [godownStockSearch, setGodownStockSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [globalProducts, setGlobalProducts] = useState([]);
  const [loadingGlobalSearch, setLoadingGlobalSearch] = useState(false);
  const [cart, setCart] = useState([]);
  const [fromChallan, setFromChallan] = useState(false);
  const [challanId, setChallanId] = useState(null);

  // Simplified customer form: Name, Phone, Address as primary; rest optional
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    gstin: '',
    lr_number: '',
    agent_name: 'DIRECT',
    from: 'SIVAKASI',
    to: '',
    through: 'DIRECT'
  });

  const [additionalDiscount, setAdditionalDiscount] = useState(0);
  const [packingPercent, setPackingPercent] = useState(3.0);
  const [taxableValue, setTaxableValue] = useState('');
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGodowns, setLoadingGodowns] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [applyProcessingFee, setApplyProcessingFee] = useState(true);
  const [applyCGST, setApplyCGST] = useState(false);
  const [applySGST, setApplySGST] = useState(false);
  const [applyIGST, setApplyIGST] = useState(false);
  const [pendingChallans, setPendingChallans] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [showPendingDropdown, setShowPendingDropdown] = useState(false);

  const searchInputRef = useRef(null);

  const fetchCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/customers`);
      if (!res.ok) throw new Error('Failed to fetch customers');
      const data = await res.json();
      const enriched = data.map(c => ({
        label: `${c.value.name} ${c.value.phone ? `(${c.value.phone})` : (c.value.to ? `(${c.value.to})` : '')}`,
        value: c.value
      }));
      setCustomers(enriched);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  const fetchGodowns = useCallback(async () => {
    setLoadingGodowns(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/godown`);
      const data = await res.json();
      const options = (data || []).map(g => ({
        value: Number(g.id),
        label: capitalize(g.name),
        name: capitalize(g.name)
      }));
      setGodowns(options);
    } catch (err) {
      setError('Failed to load godowns');
    } finally {
      setLoadingGodowns(false);
    }
  }, []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/challans`)
      .then(r => r.json())
      .then(data => setPendingChallans(data || []))
      .catch(() => setPendingChallans([]));
  }, [success]);

  useEffect(() => {
    fetchGodowns();
    fetchCustomers();
  }, [fetchGodowns, fetchCustomers]);

  const fetchGodownStock = useCallback((godownId) => {
    setLoadingStock(true);
    fetch(`${API_BASE_URL}/api/godown/stock/${godownId}`)
      .then(r => r.json())
      .then(data => {
        const enriched = (data || []).map(item => ({
          ...item,
          id: Number(item.id),
          rate_per_box: parseFloat(item.rate_per_box) || 0,
          per_case: item.per_case || 1,
          current_cases: item.current_cases || 0
        }));
        setStock(enriched);
      })
      .catch(() => setError('Failed to load godown stock'))
      .finally(() => setLoadingStock(false));
  }, []);

  useEffect(() => {
    if (selectedGodown) {
      fetchGodownStock(selectedGodown.value);
    } else {
      setStock([]);
    }
  }, [selectedGodown, fetchGodownStock]);

  const filteredStock = useMemo(() => {
    if (!godownStockSearch.trim()) return stock;
    const q = godownStockSearch.toLowerCase().trim();
    return stock.filter(s =>
      (s.productname || '').toLowerCase().includes(q) ||
      (s.brand || '').toLowerCase().includes(q) ||
      (s.product_type || '').toLowerCase().includes(q)
    );
  }, [stock, godownStockSearch]);

  useEffect(() => {
    if (selectedCustomer) {
      const cust = selectedCustomer.value;
      setCustomer(prev => ({
        ...prev,
        name: cust.name || '',
        phone: cust.phone || '',
        address: cust.address || '',
        gstin: cust.gstin || '',
        lr_number: cust.lr_number || '',
        agent_name: cust.agent_name || 'DIRECT',
        from: cust.from || 'SIVAKASI',
        to: cust.to || '',
        through: cust.through || 'DIRECT'
      }));
    }
  }, [selectedCustomer]);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        setLoadingGlobalSearch(true);
        fetch(`${API_BASE_URL}/api/search/global?name=${encodeURIComponent(searchQuery)}`)
          .then(r => r.json())
          .then(data => (data || []).map(p => ({
            ...p,
            id: Number(p.id),
            rate_per_box: parseFloat(p.rate_per_box) || 0,
            godown_name: capitalize(p.godown_name || 'Main Godown')
          })))
          .then(setGlobalProducts)
          .catch(() => setGlobalProducts([]))
          .finally(() => setLoadingGlobalSearch(false));
      } else {
        setGlobalProducts([]);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const addProductToCart = (item, sourceGodown) => {
    const godownName = sourceGodown || item.godown_name || selectedGodown?.label || 'Main Godown';
    const existingIdx = cart.findIndex(i => i.id === item.id);
    if (existingIdx !== -1) {
      const maxCases = fromChallan ? 999999 : (cart[existingIdx].current_cases || 999999);
      setCart(prev => prev.map((c, i) => i === existingIdx ? { ...c, cases: Math.min((parseFloat(c.cases) || 0) + 1, maxCases) } : c));
      setSuccess(`Added +1 case of ${item.productname}`);
    } else {
      setCart(prev => [...prev, {
        ...item,
        cases: 1,
        loose_pieces: 0,
        discount: 0,
        godown: godownName,
        per_case: item.per_case || 1,
        current_cases: item.current_cases || 0,
        rate_per_box: parseFloat(item.rate_per_box) || 0
      }]);
      setSuccess(`Added ${item.productname} to bill`);
    }
    setTimeout(() => setSuccess(''), 2500);
  };

  const updateCases = (idx, val) => {
    const maxCases = fromChallan ? 999999 : (cart[idx].current_cases || 999999);
    const parsed = parseFloat(val);
    const cases = isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, maxCases));
    setCart(prev => prev.map((i, i2) => i2 === idx ? { ...i, cases } : i));
  };

  const updateLoosePieces = (idx, val) => {
    const parsed = parseInt(val, 10);
    const loose = isNaN(parsed) ? 0 : Math.max(0, parsed);
    setCart(prev => prev.map((i, i2) => i2 === idx ? { ...i, loose_pieces: loose } : i));
  };

  const incrementCases = (idx) => {
    const item = cart[idx];
    const maxCases = fromChallan ? 999999 : (item.current_cases || 999999);
    setCart(prev => prev.map((c, i) => i === idx ? { ...c, cases: Math.min((parseFloat(c.cases) || 0) + 1, maxCases) } : c));
  };

  const decrementCases = (idx) => {
    setCart(prev => prev.map((c, i) => i === idx ? { ...c, cases: Math.max(0, (parseFloat(c.cases) || 0) - 1) } : c));
  };

  const updatePerCase = (idx, val) => {
    const newPer = Math.max(1, parseInt(val, 10) || 1);
    setCart(prev => prev.map((i, i2) => i2 === idx ? { ...i, per_case: newPer } : i));
  };

  const updateRate = (idx, val) => {
    const newRate = parseFloat(val) || 0;
    setCart(prev => prev.map((i, i2) => i2 === idx ? { ...i, rate_per_box: newRate } : i));
  };

  const updateDiscount = (idx, val) => {
    const discount = Math.max(0, Math.min(100, parseFloat(val) || 0));
    setCart(prev => prev.map((i, i2) => i2 === idx ? { ...i, discount } : i));
  };

  const clearCart = () => setCart([]);
  const removeFromCart = (idx) => setCart(prev => prev.filter((_, i) => i !== idx));

  const calculate = () => {
    let subtotal = 0;
    let totalCases = 0;
    let totalQty = 0;

    cart.forEach(i => {
      const cases = parseFloat(i.cases) || 0;
      const perCase = parseFloat(i.per_case) || 1;
      const loose = parseFloat(i.loose_pieces) || 0;
      const totalPcs = Math.round((cases * perCase) + loose);
      const rate = parseFloat(i.rate_per_box) || 0;
      const discount = parseFloat(i.discount || 0) / 100;
      const amount = totalPcs * rate * (1 - discount);
      subtotal += amount;
      totalCases += perCase > 0 ? (totalPcs / perCase) : cases;
      totalQty += totalPcs;
    });

    const packing = applyProcessingFee ? subtotal * (parseFloat(packingPercent) || 3) / 100 : 0;
    const extraTaxableAmt = parseFloat(taxableValue) || 0;
    const taxableAmount = subtotal + packing + extraTaxableAmt;
    const discountAmt = taxableAmount * (parseFloat(additionalDiscount) || 0) / 100;
    const netTaxable = taxableAmount - discountAmt;

    let cgst = 0, sgst = 0, igst = 0;
    if (applyIGST) {
      igst = netTaxable * 0.18;
    } else if (applyCGST && applySGST) {
      cgst = netTaxable * 0.09;
      sgst = netTaxable * 0.09;
    }

    const totalTax = cgst + sgst + igst;
    const grandTotal = Math.round(netTaxable + totalTax);

    return {
      subtotal: Number(subtotal.toFixed(2)),
      packing: Number(packing.toFixed(2)),
      discountAmt: Number(discountAmt.toFixed(2)),
      taxableAmount: Number(netTaxable.toFixed(2)),
      cgst: Number(cgst.toFixed(2)),
      sgst: Number(sgst.toFixed(2)),
      igst: Number(igst.toFixed(2)),
      extraTaxable: Number(extraTaxableAmt.toFixed(2)),
      grandTotal,
      totalCases: Number(totalCases.toFixed(2)),
      totalQty
    };
  };

  const calc = cart.length > 0 ? calculate() : {
    subtotal: 0, packing: 0, discountAmt: 0, taxableAmount: 0,
    cgst: 0, sgst: 0, igst: 0, extraTaxable: 0, grandTotal: 0, totalCases: 0, totalQty: 0
  };

  const handleLoadChallan = async (challan) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/challan/${challan.id}`);
      if (!res.ok) throw new Error('Failed to load challan');
      const fullChallan = await res.json();

      setCustomer({
        name: fullChallan.customer_name || '',
        phone: fullChallan.phone || '',
        address: fullChallan.address || '',
        gstin: fullChallan.gstin || '',
        lr_number: fullChallan.lr_number || '',
        agent_name: 'DIRECT',
        from: fullChallan.from || 'SIVAKASI',
        to: fullChallan.to || '',
        through: fullChallan.through || 'DIRECT'
      });

      const items = Array.isArray(fullChallan.items) ? fullChallan.items : [];
      const cartItems = items.map(item => ({
        ...item,
        id: item.id,
        productname: item.productname || '',
        brand: item.brand || '',
        cases: Number(item.cases) || 0,
        per_case: Number(item.per_case) || 1,
        rate_per_box: parseFloat(item.rate_per_box) || 0,
        discount: parseFloat(item.discount_percent || item.discount || 0),
        godown: item.godown || fullChallan.from || 'SIVAKASI',
        current_cases: 999999
      }));

      setCart(cartItems);
      setFromChallan(true);
      setChallanId(challan.id);

      const matchedGodown = godowns.find(g =>
        fullChallan.from?.toLowerCase().includes(g.label.toLowerCase()) ||
        g.label.toLowerCase().includes(fullChallan.from?.toLowerCase())
      );
      if (matchedGodown) setSelectedGodown(matchedGodown);

      setSuccess(`Challan ${challan.challan_number} loaded successfully!`);
      setShowPendingDropdown(false);
    } catch (err) {
      console.error('Error loading challan:', err);
      setError(err.message || 'Failed to load challan');
    }
  };

  const submitBooking = async () => {
    if (!customer.name.trim()) {
      setError('Please enter Customer / Party Name.');
      return;
    }
    if (cart.length === 0) {
      setError('Please add at least one product to the cart before generating bill.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    const username = localStorage.getItem('username') || 'Unknown';

    try {
      const payload = {
        customer_name: customer.name.trim(),
        phone: customer.phone.trim(),
        address: customer.address.trim(),
        gstin: customer.gstin.trim(),
        lr_number: customer.lr_number.trim(),
        agent_name: customer.agent_name.trim() || 'DIRECT',
        from: customer.from.trim() || 'SIVAKASI',
        to: customer.to.trim() || customer.address.trim() || customer.name.trim() || 'SIVAKASI',
        through: customer.through.trim() || 'DIRECT',
        additional_discount: parseFloat(additionalDiscount) || 0,
        packing_percent: parseFloat(packingPercent) || 3.0,
        taxable_value: taxableValue ? parseFloat(taxableValue) : null,
        stock_from: selectedGodown?.label || customer.from || 'SIVAKASI',
        apply_processing_fee: applyProcessingFee,
        apply_cgst: applyCGST,
        apply_sgst: applySGST,
        apply_igst: applyIGST,
        from_challan: fromChallan,
        challan_id: challanId,
        is_direct_bill: !fromChallan,
        performed_by: username,
        items: cart.map(i => {
          const per = parseFloat(i.per_case) || 1;
          const cases = parseFloat(i.cases) || 0;
          const loose = parseFloat(i.loose_pieces) || 0;
          const totalPcs = Math.round((cases * per) + loose);
          const effectiveCases = totalPcs > 0 && per > 0 ? Number((totalPcs / per).toFixed(4)) : cases;
          return {
            id: Number(i.id),
            productname: i.productname?.trim() || '',
            brand: i.brand?.trim() || '',
            cases: effectiveCases,
            booked_cases: cases,
            loose_pieces: loose,
            quantity: totalPcs,
            per_case: per,
            discount_percent: parseFloat(i.discount) || 0,
            godown: i.godown?.trim() || 'SIVAKASI',
            rate_per_box: parseFloat(i.rate_per_box) || 0
          };
        })
      };

      const res = await fetch(`${API_BASE_URL}/api/booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Server error: ${res.status}`);

      setSuccess(`Bill ${data.bill_number || 'Generated'} created successfully!`);

      if (data.pdfBase64) {
        setPdfBlobUrl(data.pdfBase64);
        setBillNumber(data.bill_number || 'Unknown');
        setShowPDFModal(true);
      }

      setCart([]);
      setCustomer({
        name: '',
        phone: '',
        address: '',
        gstin: '',
        lr_number: '',
        agent_name: 'DIRECT',
        from: 'SIVAKASI',
        to: '',
        through: 'DIRECT'
      });
      setSelectedCustomer(null);
      setAdditionalDiscount(0);
      setTaxableValue('');
      setFromChallan(false);
      setChallanId(null);

      // Refresh customer list and current godown stock
      fetchCustomers();
      if (selectedGodown) fetchGodownStock(selectedGodown.value);

    } catch (err) {
      console.error('Submit Error:', err);
      setError(err.message || 'Failed to create bill');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        submitBooking();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, customer, selectedGodown, additionalDiscount, packingPercent, taxableValue, applyProcessingFee, applyCGST, applySGST, applyIGST, fromChallan, challanId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 hundred:ml-64 p-4 md:p-8 pt-20 hundred:pt-8 transition-colors duration-200">
      <Sidebar />
      <Logout />

      {/* Pending Challan Floating Notification */}
      {pendingChallans.length > 0 && (
        <div className="fixed top-20 right-4 z-40">
          <div className="relative">
            <button
              onClick={() => setShowPendingDropdown(!showPendingDropdown)}
              className="relative bg-gradient-to-br from-amber-500 to-orange-600 text-white p-3.5 rounded-full shadow-2xl hover:shadow-amber-500/50 transition transform hover:scale-110 cursor-pointer"
            >
              <FaBell className="text-xl" />
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[11px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {pendingChallans.length}
              </span>
            </button>

            {showPendingDropdown && (
              <div className="absolute right-0 mt-3 w-96 max-w-[90vw] bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden z-50">
                <div className="p-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm">
                  Pending Challans ({pendingChallans.length})
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
                  {pendingChallans.map(ch => (
                    <div key={ch.id} className="p-3.5 hover:bg-slate-800/60 transition flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-white">{ch.challan_number}</p>
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                            {ch.created_by || 'Admin'}
                          </span>
                        </div>
                        <p className="font-medium text-xs text-slate-300 mt-1 truncate">{ch.customer_name}</p>
                        <p className="text-[11px] text-slate-400">
                          To: <strong>{ch.to}</strong> • {new Date(ch.created_at).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleLoadChallan(ch)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer shadow-md"
                      >
                        Bill This
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowPendingDropdown(false)}
                  className="w-full py-2 bg-slate-950 hover:bg-slate-800 text-xs font-semibold text-slate-400 transition"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 text-indigo-400">
                <FaReceipt className="text-xl" />
              </span>
              Create Sales Bill
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Select products from any warehouse, specify customer details, and generate instant GST / Estimate invoices.
            </p>
          </div>

          {fromChallan && (
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <FaCheckCircle className="text-sm" /> Converted from Challan #{challanId}
            </div>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-white"><FaTimes /></button>
          </div>
        )}
        {success && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2"><FaCheckCircle /> {success}</span>
            <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-white"><FaTimes /></button>
          </div>
        )}

        {/* SECTION 1: Customer Details (Simple: Name, Phone, Address + Optional Collapsible) */}
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <FaUser className="text-indigo-400 text-sm" /> Customer / Party Details
            </h3>

            {/* Quick Customer Search Select */}
            <div className="w-full sm:w-80">
              <Select
                options={customers}
                value={selectedCustomer}
                onChange={setSelectedCustomer}
                placeholder="Find existing customer..."
                isClearable
                isLoading={loadingCustomers}
                className="text-xs"
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                menuPosition="fixed"
                styles={{
                  control: (base, state) => ({
                    ...base,
                    padding: '2px 4px',
                    borderRadius: 12,
                    backgroundColor: '#020617',
                    borderColor: state.isFocused ? '#6366f1' : '#334155',
                    color: '#ffffff',
                    boxShadow: 'none',
                    minHeight: '34px',
                    '&:hover': {
                      borderColor: '#6366f1'
                    }
                  }),
                  menuPortal: base => ({ ...base, zIndex: 999999 }),
                  menu: base => ({
                    ...base,
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderWidth: '1px',
                    borderRadius: 14,
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7)',
                    overflow: 'hidden',
                    zIndex: 999999
                  }),
                  menuList: base => ({
                    ...base,
                    backgroundColor: '#0f172a',
                    padding: '4px',
                    maxHeight: '240px'
                  }),
                  singleValue: base => ({ ...base, color: '#ffffff' }),
                  input: base => ({ ...base, color: '#ffffff' }),
                  placeholder: base => ({ ...base, color: '#64748b' }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isSelected
                      ? '#4f46e5'
                      : state.isFocused
                        ? '#1e293b'
                        : '#0f172a',
                    color: '#ffffff',
                    borderRadius: 8,
                    margin: '2px 0',
                    padding: '8px 12px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  })
                }}
              />
            </div>
          </div>

          {/* Primary Form Fields: Name, Phone, Address */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FaUser className="text-[11px] text-indigo-400" /> Customer / Party Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Sri Murugan Stores"
                value={customer.name}
                onChange={e => setCustomer({ ...customer, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FaPhone className="text-[11px] text-emerald-400" /> Phone Number
              </label>
              <input
                type="text"
                placeholder="e.g. 9876543210"
                value={customer.phone}
                onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FaMapMarkerAlt className="text-[11px] text-amber-400" /> Address / Place
              </label>
              <input
                type="text"
                placeholder="e.g. Main Bazaar, Madurai"
                value={customer.address}
                onChange={e => setCustomer({ ...customer, address: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition shadow-inner"
              />
            </div>
          </div>

          {/* Optional Collapsible Dispatch / Tax Section */}
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowOptionalDetails(!showOptionalDetails)}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 cursor-pointer transition"
            >
              <FaTruck className="text-xs" />
              <span>{showOptionalDetails ? '▲ Hide' : '▼ Expand'} Dispatch & Tax Details (Optional: GSTIN, LR No, Agent, Route)</span>
            </button>

            {showOptionalDetails && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 33AAAAA0000A1Z5"
                    value={customer.gstin}
                    onChange={e => setCustomer({ ...customer, gstin: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">L.R. Number</label>
                  <input
                    type="text"
                    placeholder="e.g. LR-4589"
                    value={customer.lr_number}
                    onChange={e => setCustomer({ ...customer, lr_number: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Agent Name</label>
                  <input
                    type="text"
                    placeholder="DIRECT"
                    value={customer.agent_name}
                    onChange={e => setCustomer({ ...customer, agent_name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">From</label>
                  <input
                    type="text"
                    placeholder="SIVAKASI"
                    value={customer.from}
                    onChange={e => setCustomer({ ...customer, from: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">To / Destination</label>
                  <input
                    type="text"
                    placeholder="Auto from address"
                    value={customer.to}
                    onChange={e => setCustomer({ ...customer, to: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Through / Transport</label>
                  <input
                    type="text"
                    placeholder="DIRECT"
                    value={customer.through}
                    onChange={e => setCustomer({ ...customer, through: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: Fast Product Search (All Godowns) */}
        <div className="bg-slate-900/90 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <label className="font-bold text-white text-sm flex items-center gap-2 uppercase tracking-wider">
              <FaSearch className="text-indigo-400" /> Fast Product Search (All Godowns)
            </label>
            <span className="text-[11px] text-slate-400">
              Type product name or brand to search across all warehouses
            </span>
          </div>

          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search product name, brand, or godown..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && globalProducts.length > 0) {
                  e.preventDefault();
                  addProductToCart(globalProducts[0], globalProducts[0].godown_name);
                  setSearchQuery('');
                  setGlobalProducts([]);
                }
              }}
              className="w-full pl-11 pr-10 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setGlobalProducts([]); }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                <FaTimes className="text-xs" />
              </button>
            )}
          </div>

          {loadingGlobalSearch && (
            <div className="mt-3 flex items-center gap-2 text-indigo-400 text-xs font-semibold">
              <FaSpinner className="animate-spin text-xs" /> Searching products...
            </div>
          )}

          {globalProducts.length > 0 && (
            <div className="mt-3 max-h-80 overflow-y-auto divide-y divide-slate-800/80 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-2xl p-2">
              {globalProducts.map((p) => {
                const inCartItem = cart.find(c => c.id === p.id);
                const inCartCases = inCartItem ? (parseFloat(inCartItem.cases) || 0) : 0;
                return (
                  <div
                    key={p.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-slate-900 rounded-xl transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm truncate">{p.productname}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                          {capitalize(p.brand || 'General')}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                          {p.godown_name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Available: <strong className="text-emerald-400">{formatCasesAndPcs(p.current_cases, p.per_case || 1)}</strong> ({p.per_case || 1} pcs/cs)
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-emerald-400 font-extrabold text-sm block">
                          ₹{(parseFloat(p.rate_per_box) || 0).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-500">per box</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => addProductToCart(p, p.godown_name)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md ${
                          inCartCases > 0
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-95'
                        }`}
                      >
                        {inCartCases > 0 ? (
                          <>
                            <FaCheckCircle className="text-[10px]" /> In Bill ({inCartCases} cs) +1
                          </>
                        ) : (
                          <>
                            <FaPlus className="text-[10px]" /> Add
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 3: Browse by Godown (Dark Themed, High-Visibility Cards) */}
        <div className="bg-slate-900/90 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-slate-800 relative z-30">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <label className="font-bold text-white text-sm flex items-center gap-2 uppercase tracking-wider">
                <FaWarehouse className="text-indigo-400" /> Browse Stock by Godown
              </label>
              <p className="text-xs text-slate-400 mt-0.5">
                Select a godown to view all its available inventory and add items to the bill
              </p>
            </div>
            {selectedGodown && (
              <span className="text-xs px-3 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold">
                Warehouse: {selectedGodown.label}
              </span>
            )}
          </div>

          <Select
            options={godowns}
            value={selectedGodown}
            onChange={setSelectedGodown}
            placeholder="Choose Godown to view stock..."
            isClearable
            isLoading={loadingGodowns}
            className="text-xs sm:text-sm"
            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            menuPosition="fixed"
            styles={{
              control: (base, state) => ({
                ...base,
                padding: '4px 6px',
                borderRadius: 14,
                backgroundColor: '#020617',
                borderColor: state.isFocused ? '#6366f1' : '#334155',
                color: '#ffffff',
                boxShadow: 'none',
                '&:hover': {
                  borderColor: '#6366f1'
                }
              }),
              menuPortal: base => ({ ...base, zIndex: 999999 }),
              menu: base => ({
                ...base,
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderWidth: '1px',
                borderRadius: 14,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                overflow: 'hidden',
                zIndex: 999999
              }),
              menuList: base => ({
                ...base,
                backgroundColor: '#0f172a',
                padding: '6px',
                maxHeight: '260px'
              }),
              singleValue: base => ({ ...base, color: '#ffffff', fontWeight: '600' }),
              input: base => ({ ...base, color: '#ffffff' }),
              placeholder: base => ({ ...base, color: '#64748b' }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isSelected
                  ? '#4f46e5'
                  : state.isFocused
                    ? '#1e293b'
                    : '#0f172a',
                color: '#ffffff',
                borderRadius: 8,
                margin: '2px 0',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: state.isSelected ? '700' : '500',
                cursor: 'pointer'
              })
            }}
          />

          {selectedGodown && (
            <div className="mt-6 pt-6 border-t border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h4 className="font-bold text-white text-base flex items-center gap-2">
                  <FaBoxOpen className="text-emerald-400" /> Available Stock in {selectedGodown.label}
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-normal">
                    {filteredStock.length} items
                  </span>
                </h4>

                {stock.length > 0 && (
                  <div className="w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Filter products in this godown..."
                      value={godownStockSearch}
                      onChange={e => setGodownStockSearch(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              {loadingStock ? (
                <div className="text-center py-12">
                  <FaSpinner className="animate-spin text-3xl text-indigo-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Loading godown stock...</p>
                </div>
              ) : filteredStock.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredStock.map(item => {
                    const inCartItem = cart.find(c => c.id === item.id);
                    const inCartCases = inCartItem ? (parseFloat(inCartItem.cases) || 0) : 0;
                    const pCase = item.per_case || 1;
                    const isOutOfStock = (parseFloat(item.current_cases) || 0) <= 0;

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 transition shadow-lg flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="font-bold text-white text-sm leading-snug truncate" title={item.productname}>
                              {item.productname}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-semibold shrink-0">
                              {capitalize(item.brand || 'General')}
                            </span>
                          </div>

                          <div className="space-y-1 text-xs text-slate-400 mt-2">
                            <p>
                              Stock: <strong className="text-emerald-400">{formatCasesAndPcs(item.current_cases, pCase)}</strong>
                            </p>
                            <p>
                              Per Case: <strong className="text-slate-200">{pCase} pcs</strong>
                            </p>
                          </div>

                          <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-slate-800/60">
                            <span className="text-xl font-black text-emerald-400">
                              ₹{(parseFloat(item.rate_per_box) || 0).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-500">/ box</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => addProductToCart(item, selectedGodown.label)}
                          disabled={isOutOfStock}
                          className={`mt-3 w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                            isOutOfStock
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                              : inCartCases > 0
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-95'
                          }`}
                        >
                          {isOutOfStock ? (
                            'Out of Stock'
                          ) : inCartCases > 0 ? (
                            <>
                              <FaCheckCircle className="text-[10px]" /> In Bill ({inCartCases} cs) +1
                            </>
                          ) : (
                            <>
                              <FaPlus className="text-[10px]" /> Add to Bill
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800">
                  <FaBoxOpen className="text-3xl text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No stock found matching your filter in this godown.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 4: Cart / Items in Current Bill */}
        {cart.length > 0 && (
          <div className="bg-slate-900/90 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FaReceipt className="text-emerald-400" /> Bill Items ({cart.length})
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                    {calc.totalCases} cases ({calc.totalQty} pcs)
                  </span>
                </h3>
              </div>
              <button
                type="button"
                onClick={clearCart}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <FaTrash className="text-xs" /> Clear Cart
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 text-left uppercase tracking-wider text-[11px]">
                    <th className="p-3 font-semibold text-center w-12">#</th>
                    <th className="p-3 font-semibold">Product Name</th>
                    <th className="p-3 font-semibold text-center">Full Cases</th>
                    <th className="p-3 font-semibold text-center">Loose Pcs</th>
                    <th className="p-3 font-semibold text-center">Per Case</th>
                    <th className="p-3 font-semibold text-center">Total Qty</th>
                    <th className="p-3 font-semibold text-center">Rate (₹)</th>
                    <th className="p-3 font-semibold text-center">Disc %</th>
                    <th className="p-3 font-semibold text-right">Amount (₹)</th>
                    <th className="p-3 font-semibold text-center">From</th>
                    <th className="p-3 font-semibold text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {cart.map((item, idx) => {
                    const casesVal = parseFloat(item.cases) || 0;
                    const perCaseVal = parseFloat(item.per_case) || 1;
                    const looseVal = parseFloat(item.loose_pieces) || 0;
                    const qty = Math.round((casesVal * perCaseVal) + looseVal);
                    const amountBefore = qty * (parseFloat(item.rate_per_box) || 0);
                    const discountAmt = amountBefore * ((parseFloat(item.discount) || 0) / 100);
                    const finalAmt = amountBefore - discountAmt;

                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-white">
                          <span>{item.productname}</span>
                          {item.brand && (
                            <span className="block text-[11px] font-normal text-slate-400 mt-0.5">
                              {capitalize(item.brand)}
                            </span>
                          )}
                        </td>

                        {/* Cases Increment / Decrement */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => decrementCases(idx)}
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center transition cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max={item.current_cases || 999999}
                              value={item.cases !== undefined ? item.cases : 1}
                              onChange={e => updateCases(idx, e.target.value)}
                              className="w-16 py-1 px-1.5 text-center font-bold border border-slate-700 rounded-lg bg-slate-950 text-white text-xs outline-none focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => incrementCases(idx)}
                              className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center transition cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* Loose Pieces */}
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={item.loose_pieces !== undefined ? item.loose_pieces : 0}
                            onChange={e => updateLoosePieces(idx, e.target.value)}
                            className="w-16 py-1 px-1.5 text-center font-semibold border border-slate-700 rounded-lg bg-slate-950 text-white text-xs outline-none focus:border-indigo-500"
                          />
                        </td>

                        {/* Per Case */}
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.per_case || 1}
                            onChange={e => updatePerCase(idx, e.target.value)}
                            className="w-14 py-1 px-1 text-center font-medium border border-slate-700 rounded-lg bg-slate-950 text-slate-300 text-xs outline-none focus:border-indigo-500"
                          />
                        </td>

                        {/* Total Pieces */}
                        <td className="p-3 text-center font-bold text-indigo-400">
                          {qty}
                          <span className="text-[10px] block font-normal text-slate-400">
                            ({casesVal > 0 ? `${casesVal}cs` : ''}{looseVal > 0 ? ` +${looseVal}pcs` : ''})
                          </span>
                        </td>

                        {/* Rate */}
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.rate_per_box}
                            onChange={e => updateRate(idx, e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-20 py-1 px-1.5 text-center font-bold border border-slate-700 rounded-lg bg-slate-950 text-emerald-400 text-xs outline-none focus:border-indigo-500"
                          />
                        </td>

                        {/* Discount */}
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount || 0}
                            onChange={e => updateDiscount(idx, e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-14 py-1 px-1 text-center font-semibold border border-slate-700 rounded-lg bg-slate-950 text-white text-xs outline-none focus:border-indigo-500"
                          />
                        </td>

                        {/* Final Amount */}
                        <td className="p-3 text-right font-extrabold text-emerald-400">
                          ₹{finalAmt.toFixed(2)}
                        </td>

                        {/* Godown */}
                        <td className="p-3 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                            {item.godown}
                          </span>
                        </td>

                        {/* Delete */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeFromCart(idx)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                            title="Remove item"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Breakdown & GST Controls */}
            <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Adjustments: Discount, Packing, Extra Taxable */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Billing Adjustments & GST Mode
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Additional Discount (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={additionalDiscount}
                      onChange={e => setAdditionalDiscount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={applyProcessingFee}
                        onChange={e => setApplyProcessingFee(e.target.checked)}
                        className="rounded accent-indigo-500"
                      />
                      Packing ({packingPercent}%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      disabled={!applyProcessingFee}
                      value={packingPercent}
                      onChange={e => setPackingPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-40"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Extra Taxable Amt (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={taxableValue}
                      onChange={e => setTaxableValue(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* GST Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (applyCGST && applySGST) {
                        setApplyCGST(false);
                        setApplySGST(false);
                      } else {
                        setApplyCGST(true);
                        setApplySGST(true);
                        setApplyIGST(false);
                      }
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                      applyCGST && applySGST
                        ? 'border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/30'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-xs text-white">Tamil Nadu</p>
                        <p className="text-[10px] text-slate-400">CGST 9% + SGST 9%</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        applyCGST && applySGST ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                      }`}>
                        {applyCGST && applySGST && <FaCheckCircle className="text-white text-xs" />}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (applyIGST) {
                        setApplyIGST(false);
                      } else {
                        setApplyIGST(true);
                        setApplyCGST(false);
                        setApplySGST(false);
                      }
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                      applyIGST
                        ? 'border-blue-500 bg-blue-500/15 ring-2 ring-blue-500/30'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-xs text-white">Other State</p>
                        <p className="text-[10px] text-slate-400">IGST 18%</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        applyIGST ? 'bg-blue-500 border-blue-500' : 'border-slate-600'
                      }`}>
                        {applyIGST && <FaCheckCircle className="text-white text-xs" />}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Goods Value (Subtotal):</span>
                    <span className="font-bold text-white">₹{calc.subtotal.toFixed(2)}</span>
                  </div>

                  {applyProcessingFee && (
                    <div className="flex justify-between text-slate-400">
                      <span>Packing @ {packingPercent}%:</span>
                      <span className="font-bold text-white">₹{calc.packing.toFixed(2)}</span>
                    </div>
                  )}

                  {parseFloat(taxableValue) > 0 && (
                    <div className="flex justify-between text-blue-400">
                      <span>Extra Taxable Amount:</span>
                      <span className="font-bold">₹{calc.extraTaxable.toFixed(2)}</span>
                    </div>
                  )}

                  {parseFloat(calc.discountAmt) > 0 && (
                    <div className="flex justify-between text-rose-400">
                      <span>Additional Discount ({additionalDiscount}%):</span>
                      <span className="font-bold">-₹{calc.discountAmt.toFixed(2)}</span>
                    </div>
                  )}

                  {applyCGST && applySGST && (
                    <>
                      <div className="flex justify-between text-slate-400">
                        <span>CGST @ 9%:</span>
                        <span className="font-bold text-white">₹{calc.cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>SGST @ 9%:</span>
                        <span className="font-bold text-white">₹{calc.sgst.toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  {applyIGST && (
                    <div className="flex justify-between text-slate-400">
                      <span>IGST @ 18%:</span>
                      <span className="font-bold text-white">₹{calc.igst.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs uppercase font-bold text-slate-400 block">Net Payable Amount</span>
                    <span className="text-[11px] text-slate-500">
                      Total: {calc.totalCases} cases ({calc.totalQty} pcs)
                    </span>
                  </div>
                  <span className="text-3xl font-black text-emerald-400">
                    ₹{calc.grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

            </div>

            {/* Generate Bill Action Bar */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-slate-400">
                Ready to bill for <strong className="text-white">{customer.name || 'Customer'}</strong> ({cart.length} items)
              </div>

              <button
                type="button"
                onClick={submitBooking}
                disabled={loading || cart.length === 0}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/25 transition transform active:scale-95 disabled:opacity-40 flex items-center gap-3 cursor-pointer"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin text-base" /> Generating Bill & PDF...
                  </>
                ) : (
                  <>
                    <FaFilePdf className="text-base" />
                    <span>Generate Bill & PDF</span>
                    <span className="text-[10px] bg-emerald-950/70 border border-emerald-400/30 px-2 py-0.5 rounded-md font-mono">
                      Ctrl + Enter
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* PDF Viewer / Download Modal */}
      <Modal
        isOpen={showPDFModal}
        onRequestClose={() => setShowPDFModal(false)}
        className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-5xl h-[88%] w-full mx-4 my-6 outline-none overflow-hidden flex flex-col"
        overlayClassName="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <div className="flex flex-col h-full">
          <div className="bg-slate-950 border-b border-slate-800 p-4 md:p-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FaFilePdf className="text-rose-500" /> Bill Generated: {billNumber}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                The bill has been recorded and stock deducted. You can download or print the PDF invoice.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={pdfBlobUrl}
                download={`${billNumber}.pdf`}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <FaDownload /> Download PDF
              </a>
              <button
                type="button"
                onClick={() => setShowPDFModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex-1 bg-slate-950 p-2">
            <embed src={pdfBlobUrl} type="application/pdf" className="w-full h-full rounded-2xl" />
          </div>
        </div>
      </Modal>

    </div>
  );
}
