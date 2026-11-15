import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../../Config';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../../Admin/Logout';
import { FaSearch, FaSpinner, FaArrowLeft, FaLock, FaLockOpen, FaMoneyBillWave, FaBuilding, FaFileInvoice } from 'react-icons/fa';

export default function PurchasePendingpayments() {
  // Supplier list view
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Drill-down: bills for a specific supplier
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);

  // Payment modal
  const [paymentBill, setPaymentBill] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount_paid: '', payment_method: 'Cash', bank_name: '', paid_to: '', transaction_date: new Date().toISOString().split('T')[0]
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const [paymentError, setPaymentError] = useState('');

  const textClass = 'text-black dark:text-white';
  const cardClass = 'bg-white dark:bg-gray-800 rounded-xl shadow-lg';

  // ── Fetch supplier list ──────────────────────────────────────────────────────
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/purchase-supplier-bills`);
      setSuppliers(res.data);
      setFilteredSuppliers(res.data);
    } catch {
      setError('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  useEffect(() => {
    const s = searchTerm.toLowerCase();
    setFilteredSuppliers(suppliers.filter(sup =>
      sup.supplier_name?.toLowerCase().includes(s)
    ));
  }, [searchTerm, suppliers]);

  // ── Drill into supplier bills ────────────────────────────────────────────────
  const openSupplier = async (sup) => {
    setSelectedSupplier(sup);
    setBillsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/purchase-supplier-bills?supplier=${encodeURIComponent(sup.supplier_name)}`);
      setBills(res.data);
    } catch {
      setError('Failed to load bills');
    } finally {
      setBillsLoading(false);
    }
  };

  const goBack = () => {
    setSelectedSupplier(null);
    setBills([]);
    fetchSuppliers();
  };

  // ── Close / Reopen bill ──────────────────────────────────────────────────────
  const toggleClose = async (bill) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/purchase-close/${bill.id}`);
      // refresh bills
      const res = await axios.get(`${API_BASE_URL}/api/purchase-supplier-bills?supplier=${encodeURIComponent(selectedSupplier.supplier_name)}`);
      setBills(res.data);
    } catch {
      setError('Failed to update bill status');
    }
  };

  // ── Payment handlers ─────────────────────────────────────────────────────────
  const openPayment = (bill) => {
    setPaymentBill(bill);
    setPaymentForm({
      amount_paid: parseFloat(bill.balance || 0).toFixed(2),
      payment_method: 'Cash', bank_name: '', paid_to: '',
      transaction_date: new Date().toISOString().split('T')[0]
    });
    setPaymentSuccess('');
    setPaymentError('');
  };

  const handleRecordPayment = async () => {
    if (!paymentForm.amount_paid || isNaN(parseFloat(paymentForm.amount_paid))) {
      setPaymentError('Enter a valid amount');
      return;
    }
    setPaymentLoading(true);
    setPaymentError('');
    try {
      await axios.post(`${API_BASE_URL}/api/purchase-payment`, {
        purchase_id: paymentBill.id,
        amount_paid: parseFloat(paymentForm.amount_paid),
        payment_method: paymentForm.payment_method,
        bank_name: paymentForm.bank_name || null,
        paid_to: paymentForm.paid_to || null,
        transaction_date: paymentForm.transaction_date,
        admin_id: null,
      });
      setPaymentSuccess('Payment recorded!');
      const res = await axios.get(`${API_BASE_URL}/api/purchase-supplier-bills?supplier=${encodeURIComponent(selectedSupplier.supplier_name)}`);
      setBills(res.data);
      setTimeout(() => { setPaymentBill(null); setPaymentSuccess(''); }, 1400);
    } catch {
      setPaymentError('Failed to record payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const fmt = (n) => `₹${parseFloat(n || 0).toFixed(2)}`;

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 hundred:ml-64 pt-16 hundred:pt-0">
      <Sidebar />
      <div className="p-4 md:p-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 pl-12 hundred:pl-0">
            {selectedSupplier && (
              <button onClick={goBack}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-300 transition-colors">
                <FaArrowLeft size={12} /> Back
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                {selectedSupplier ? `${selectedSupplier.supplier_name} — Bills` : 'Purchase Payments'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedSupplier
                  ? `${bills.length} bill(s) · Balance: ${fmt(selectedSupplier.total_balance)}`
                  : 'Supplier-wise purchase payment tally'}
              </p>
            </div>
          </div>
          <Logout />
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm">{error}</div>}

        {/* ── SUPPLIER LIST VIEW ─────────────────────────────────────────── */}
        {!selectedSupplier && (
          <>
            {/* Search */}
            <div className={`${cardClass} p-4 mb-4`}>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search supplier..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:border-green-500 text-sm"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-20"><FaSpinner className="animate-spin text-green-500 text-3xl" /></div>
            ) : (
              <div className={`${cardClass} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        {['Supplier', 'Total Bills', 'Open Bills', 'Pending Cases to Send', 'Total Billed', 'Total Paid', 'Balance Due', ''].map(h => (
                          <th key={h} className={`px-4 py-3 text-left font-semibold ${textClass}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSuppliers.map((sup, i) => (
                        <tr key={i} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className={`px-4 py-3 font-semibold ${textClass}`}>
                            <div className="flex items-center gap-2">
                              <FaBuilding className="text-green-500" />
                              {sup.supplier_name}
                            </div>
                            {sup.address && <p className="text-xs text-gray-400 mt-0.5">{sup.address}</p>}
                          </td>
                          <td className={`px-4 py-3 ${textClass}`}>{sup.total_bills}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sup.open_bills > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                              {sup.open_bills} open
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {sup.total_pending_cases > 0 ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
                                📦 {sup.total_pending_cases} cases pending
                              </span>
                            ) : (
                              <span className="text-xs text-green-600 dark:text-green-400">All received</span>
                            )}
                          </td>
                          <td className={`px-4 py-3 ${textClass}`}>{fmt(sup.total_billed)}</td>
                          <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">{fmt(sup.total_paid)}</td>
                          <td className={`px-4 py-3 font-bold ${sup.total_balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                            {fmt(sup.total_balance)}
                            {sup.total_balance > 0 && <span className="ml-1 text-xs font-normal">(Due)</span>}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => openSupplier(sup)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                            >
                              <FaFileInvoice size={11} /> View Bills
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredSuppliers.length === 0 && (
                        <tr><td colSpan={8} className="text-center py-12 text-gray-400">No suppliers found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── BILLS DRILL-DOWN VIEW ─────────────────────────────────────── */}
        {selectedSupplier && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              {[
                { label: 'Total Billed', value: fmt(selectedSupplier.total_billed), color: 'blue' },
                { label: 'Total Paid', value: fmt(selectedSupplier.total_paid), color: 'green' },
                { label: 'Balance Due', value: fmt(selectedSupplier.total_balance), color: 'red' },
                { label: 'Open Bills', value: selectedSupplier.open_bills, color: 'orange' },
              ].map(c => (
                <div key={c.label} className={`${cardClass} p-4`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{c.label}</p>
                  <p className={`text-xl font-bold text-${c.color}-600 dark:text-${c.color}-400`}>{c.value}</p>
                </div>
              ))}
            </div>

            {billsLoading ? (
              <div className="flex justify-center py-20"><FaSpinner className="animate-spin text-green-500 text-3xl" /></div>
            ) : (
              <div className={`${cardClass} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        {['Bill No', 'Date', 'Supplier Name', 'Booked Cases', 'Pending to Send', 'Tax Amount', 'Total', 'Paid', 'Balance', 'Status', 'Actions'].map(h => (
                          <th key={h} className={`px-3 py-3 text-left font-semibold ${textClass} whitespace-nowrap`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map((bill) => {
                        const isClosed = bill.is_closed;
                        const balance = parseFloat(bill.balance || 0);
                        return (
                          <tr key={bill.id} className={`border-t border-gray-100 dark:border-gray-700 transition-colors ${isClosed ? 'opacity-60' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'}`}>
                            <td className="px-3 py-3 font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                              {bill.purchase_number}
                            </td>
                            <td className={`px-3 py-3 whitespace-nowrap ${textClass}`}>
                              {bill.purchase_date ? new Date(bill.purchase_date).toLocaleDateString('en-IN') : '—'}
                            </td>
                            <td className={`px-3 py-3 ${textClass}`}>{bill.supplier_name}</td>
                            <td className={`px-3 py-3 text-center ${textClass} font-semibold`}>{bill.total_cases}</td>
                            <td className="px-3 py-3 text-center">
                              {bill.pending_cases > 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
                                  {bill.pending_cases} cases pending
                                </span>
                              ) : (
                                <span className="text-xs text-green-600 dark:text-green-400 font-medium">All Recv ({bill.received_cases || bill.total_cases})</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-orange-600 dark:text-orange-400">
                              {bill.tax_amount > 0 ? fmt(bill.tax_amount) : '—'}
                            </td>
                            <td className={`px-3 py-3 font-medium ${textClass}`}>{fmt(bill.total)}</td>
                            <td className="px-3 py-3 text-green-600 dark:text-green-400">{fmt(bill.paid)}</td>
                            <td className={`px-3 py-3 font-bold ${isClosed ? 'text-gray-400 line-through' : balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                              {fmt(Math.abs(balance))}
                            </td>
                            <td className="px-3 py-3">
                              {isClosed
                                ? <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs font-semibold">Closed</span>
                                : balance > 0
                                  ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Due</span>
                                  : <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Paid</span>
                              }
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex gap-1.5">
                                {!isClosed && balance > 0 && (
                                  <button
                                    onClick={() => openPayment(bill)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors"
                                  >
                                    <FaMoneyBillWave size={10} /> Pay
                                  </button>
                                )}
                                <button
                                  onClick={() => toggleClose(bill)}
                                  title={isClosed ? 'Reopen bill' : 'Close bill'}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${isClosed
                                    ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                                >
                                  {isClosed ? <FaLockOpen size={10} /> : <FaLock size={10} />}
                                  {isClosed ? 'Reopen' : 'Close'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {bills.length === 0 && (
                        <tr><td colSpan={11} className="text-center py-12 text-gray-400">No bills found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Payment Modal ──────────────────────────────────────────────────── */}
      {paymentBill && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Record Payment</h3>
              <button onClick={() => setPaymentBill(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>{paymentBill.supplier_name}</strong> — Bill <strong>{paymentBill.purchase_number}</strong>
              </p>
              <p className="text-sm mt-1">
                Balance: <strong className="text-red-600">{fmt(paymentBill.balance)}</strong>
              </p>
            </div>
            {paymentError && <div className="mb-3 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">{paymentError}</div>}
            {paymentSuccess && <div className="mb-3 p-2 bg-green-100 border border-green-300 rounded text-green-700 text-sm">{paymentSuccess}</div>}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount Paid *</label>
                <input type="number" value={paymentForm.amount_paid}
                  onChange={e => setPaymentForm(f => ({ ...f, amount_paid: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-black dark:text-white focus:outline-none focus:border-green-500"
                  placeholder="Enter amount" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                <select value={paymentForm.payment_method}
                  onChange={e => setPaymentForm(f => ({ ...f, payment_method: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-black dark:text-white focus:outline-none focus:border-green-500">
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>Cheque</option>
                  <option>UPI</option>
                </select>
              </div>
              {paymentForm.payment_method !== 'Cash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Name</label>
                  <input type="text" value={paymentForm.bank_name}
                    onChange={e => setPaymentForm(f => ({ ...f, bank_name: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-black dark:text-white focus:outline-none focus:border-green-500"
                    placeholder="Bank name" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paid To (Name)</label>
                <input type="text" value={paymentForm.paid_to}
                  onChange={e => setPaymentForm(f => ({ ...f, paid_to: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-black dark:text-white focus:outline-none focus:border-green-500"
                  placeholder="Person / party name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <input type="date" value={paymentForm.transaction_date}
                  onChange={e => setPaymentForm(f => ({ ...f, transaction_date: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-black dark:text-white focus:outline-none focus:border-green-500" />
              </div>
              <button onClick={handleRecordPayment} disabled={paymentLoading}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                {paymentLoading ? <><FaSpinner className="animate-spin" /> Recording...</> : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
