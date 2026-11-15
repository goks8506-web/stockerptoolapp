import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../../Config';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../../Admin/Logout';
import { FaSearch, FaSpinner, FaArrowLeft, FaLock, FaLockOpen, FaMoneyBillWave, FaUser, FaFileInvoice } from 'react-icons/fa';

export default function PendingPayments() {
  // Customer list view
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Drill-down: bills for a specific customer
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);

  // Payment modal
  const [paymentBill, setPaymentBill] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [paymentForm, setPaymentForm] = useState({
    amount_paid: '', payment_method: 'cash', bank_name: '', admin_id: '',
    transaction_date: new Date().toISOString().split('T')[0]
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const [paymentError, setPaymentError] = useState('');

  const textClass = 'text-black dark:text-white';
  const cardClass = 'bg-white dark:bg-gray-800 rounded-xl shadow-lg';

  // ── Fetch customer list ──────────────────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/customer-bills`);
      setCustomers(res.data);
      setFilteredCustomers(res.data);
    } catch {
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAdmins = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/admins`);
      setAdmins(data);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchCustomers(); fetchAdmins(); }, [fetchCustomers]);

  useEffect(() => {
    const s = searchTerm.toLowerCase();
    setFilteredCustomers(customers.filter(c =>
      c.customer_name?.toLowerCase().includes(s)
    ));
  }, [searchTerm, customers]);

  // ── Drill into customer bills ────────────────────────────────────────────────
  const openCustomer = async (cust) => {
    setSelectedCustomer(cust);
    setBillsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/customer-bills?customer=${encodeURIComponent(cust.customer_name)}`);
      setBills(res.data);
    } catch {
      setError('Failed to load bills');
    } finally {
      setBillsLoading(false);
    }
  };

  const goBack = () => {
    setSelectedCustomer(null);
    setBills([]);
    fetchCustomers();
  };

  // ── Close / Reopen bill ──────────────────────────────────────────────────────
  const toggleClose = async (bill) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/customer-close/${bill.id}`);
      const res = await axios.get(`${API_BASE_URL}/api/customer-bills?customer=${encodeURIComponent(selectedCustomer.customer_name)}`);
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
      payment_method: 'cash', bank_name: '', admin_id: '',
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
    if (!paymentForm.admin_id) {
      setPaymentError('Select admin');
      return;
    }
    setPaymentLoading(true);
    setPaymentError('');
    try {
      await axios.post(`${API_BASE_URL}/api/payment`, {
        booking_id: paymentBill.id,
        amount_paid: parseFloat(paymentForm.amount_paid),
        payment_method: paymentForm.payment_method,
        bank_name: paymentForm.payment_method === 'bank' ? paymentForm.bank_name : null,
        transaction_date: paymentForm.transaction_date,
        admin_id: paymentForm.admin_id,
      });
      setPaymentSuccess('Payment recorded!');
      const res = await axios.get(`${API_BASE_URL}/api/customer-bills?customer=${encodeURIComponent(selectedCustomer.customer_name)}`);
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
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 hundred:ml-64 p-4 md:p-8 pt-20 hundred:pt-8">
      <Sidebar />
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 pl-12 hundred:pl-0">
            {selectedCustomer && (
              <button onClick={goBack}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition">
                <FaArrowLeft size={11} /> Back
              </button>
            )}
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                {selectedCustomer ? `${selectedCustomer.customer_name} — Bills` : 'Pending Payments'}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {selectedCustomer
                  ? `${bills.length} bill(s) · Outstanding Balance: ${fmt(selectedCustomer.total_balance)}`
                  : 'Customer-wise payment tally, dues & receipts'}
              </p>
            </div>
          </div>
          <Logout />
        </div>

        {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-semibold text-center">{error}</div>}

        {/* ── CUSTOMER LIST VIEW ──────────────────────────────────────────── */}
        {!selectedCustomer && (
          <>
            <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl">
              <div className="relative max-w-md">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search customer by name..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-20"><FaSpinner className="animate-spin text-indigo-500 text-3xl" /></div>
            ) : (
              <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-950/80 border-b border-slate-800">
                        {['Customer', 'Total Bills', 'Open Bills', 'Total Billed', 'Total Paid', 'Balance Due', ''].map(h => (
                          <th key={h} className="px-4 py-3.5 text-left text-xs uppercase font-extrabold tracking-wider text-slate-400 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredCustomers.map((cust, i) => (
                        <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3.5 font-semibold text-slate-200">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"><FaUser size={12} /></span>
                              {cust.customer_name}
                            </div>
                            {cust.address && <p className="text-xs text-slate-500 mt-0.5">{cust.address}</p>}
                          </td>
                          <td className="px-4 py-3.5 text-slate-300 font-medium">{cust.total_bills}</td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${cust.open_bills > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                              {cust.open_bills} open
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-300 font-medium">{fmt(cust.total_billed)}</td>
                          <td className="px-4 py-3.5 text-emerald-400 font-semibold">{fmt(cust.total_paid)}</td>
                          <td className="px-4 py-3.5">
                            <span className={`font-bold ${cust.total_balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {fmt(cust.total_balance)}
                              {cust.total_balance > 0 && <span className="ml-1 text-[11px] font-normal text-rose-500">(Due)</span>}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => openCustomer(cust)}
                              className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ml-auto"
                            >
                              <FaFileInvoice size={11} /> View Bills
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <tr><td colSpan={7} className="text-center py-16 text-slate-500 font-medium">No customers found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── BILLS DRILL-DOWN VIEW ─────────────────────────────────────── */}
        {selectedCustomer && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              {[
                { label: 'Total Billed', value: fmt(selectedCustomer.total_billed), color: 'text-white' },
                { label: 'Total Paid', value: fmt(selectedCustomer.total_paid), color: 'text-emerald-400' },
                { label: 'Balance Due', value: fmt(selectedCustomer.total_balance), color: 'text-rose-400' },
                { label: 'Open Bills', value: selectedCustomer.open_bills, color: 'text-amber-400' },
              ].map(c => (
                <div key={c.label} className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{c.label}</p>
                  <p className={`text-xl font-extrabold ${c.color}`}>{c.value}</p>
                </div>
              ))}
            </div>

            {billsLoading ? (
              <div className="flex justify-center py-20"><FaSpinner className="animate-spin text-indigo-500 text-3xl" /></div>
            ) : (
              <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-950/80 border-b border-slate-800">
                        {['Bill No', 'Date', 'Customer Name', 'No. of Cases', 'Tax Amount', 'Total', 'Paid', 'Balance', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-3.5 py-3 text-left text-xs uppercase font-extrabold tracking-wider text-slate-400 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {bills.map((bill) => {
                        const isClosed = bill.is_closed;
                        const balance = parseFloat(bill.balance || 0);
                        return (
                          <tr key={bill.id} className={`transition-colors ${isClosed ? 'opacity-50' : 'hover:bg-slate-800/40'}`}>
                            <td className="px-3.5 py-3.5 font-bold whitespace-nowrap">
                              <span className="text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-800/50">
                                {bill.bill_number}
                              </span>
                            </td>
                            <td className="px-3.5 py-3.5 whitespace-nowrap text-xs text-slate-400">
                              {bill.bill_date ? new Date(bill.bill_date).toLocaleDateString('en-IN') : '—'}
                            </td>
                            <td className="px-3.5 py-3.5 text-slate-200 font-medium">{bill.customer_name}</td>
                            <td className="px-3.5 py-3.5 text-center text-slate-300 font-medium">{bill.total_cases}</td>
                            <td className="px-3.5 py-3.5 text-amber-400 font-medium">
                              {bill.tax_amount > 0 ? fmt(bill.tax_amount) : '—'}
                            </td>
                            <td className="px-3.5 py-3.5 font-medium text-slate-200">{fmt(bill.total)}</td>
                            <td className="px-3.5 py-3.5 text-emerald-400 font-semibold">{fmt(bill.paid)}</td>
                            <td className={`px-3.5 py-3.5 font-bold ${isClosed ? 'text-slate-500 line-through' : balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {fmt(Math.abs(balance))}
                            </td>
                            <td className="px-3.5 py-3.5">
                              {isClosed
                                ? <span className="px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-full text-xs font-semibold">Closed</span>
                                : balance > 0
                                  ? <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-xs font-semibold">Due</span>
                                  : <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">Paid</span>
                              }
                            </td>
                            <td className="px-3.5 py-3.5">
                              <div className="flex gap-1.5">
                                {!isClosed && balance > 0 && (
                                  <button
                                    onClick={() => openPayment(bill)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
                                  >
                                    <FaMoneyBillWave size={10} /> Pay
                                  </button>
                                )}
                                <button
                                  onClick={() => toggleClose(bill)}
                                  title={isClosed ? 'Reopen bill' : 'Close bill'}
                                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl transition border ${isClosed
                                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'}`}
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
                        <tr><td colSpan={10} className="text-center py-16 text-slate-500 font-medium">No bills found</td></tr>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <span className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20"><FaMoneyBillWave /></span>
                Record Payment
              </h3>
              <button onClick={() => setPaymentBill(null)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition">✕</button>
            </div>
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl">
              <p className="text-xs text-slate-400">
                <strong className="text-white text-sm block mb-0.5">{paymentBill.customer_name}</strong> Bill <span className="text-indigo-400 font-bold">#{paymentBill.bill_number}</span>
              </p>
              <p className="text-xs mt-2 text-slate-400">Balance Due: <strong className="text-rose-400 font-bold text-sm ml-1">{fmt(paymentBill.balance)}</strong></p>
            </div>
            {paymentError && <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold">{paymentError}</div>}
            {paymentSuccess && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold">{paymentSuccess}</div>}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Collector / Admin *</label>
                <select value={paymentForm.admin_id}
                  onChange={e => setPaymentForm(f => ({ ...f, admin_id: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                  <option value="">Select Collector / Admin</option>
                  {admins.map(a => (
                    <option key={a.id} value={a.id}>{a.username} {a.bank_name?.length > 0 ? `(${a.bank_name.join(', ')})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Amount Paid (₹) *</label>
                <input type="number" value={paymentForm.amount_paid}
                  onChange={e => setPaymentForm(f => ({ ...f, amount_paid: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                  placeholder="Enter amount" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Payment Method</label>
                <select value={paymentForm.payment_method}
                  onChange={e => setPaymentForm(f => ({ ...f, payment_method: e.target.value, bank_name: '' }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
              {paymentForm.payment_method === 'bank' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Bank Name / Ref</label>
                  <input type="text" value={paymentForm.bank_name}
                    onChange={e => setPaymentForm(f => ({ ...f, bank_name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Bank / Ref" />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Date</label>
                <input type="date" value={paymentForm.transaction_date}
                  onChange={e => setPaymentForm(f => ({ ...f, transaction_date: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <button onClick={handleRecordPayment} disabled={paymentLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20">
                {paymentLoading ? <><FaSpinner className="animate-spin" /> Recording...</> : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}