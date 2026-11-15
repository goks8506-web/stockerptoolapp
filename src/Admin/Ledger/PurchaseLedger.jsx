import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../../Config';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../../Admin/Logout';
import { FaRupeeSign, FaCalendarAlt, FaPrint, FaSearch, FaBook } from 'react-icons/fa';
import Modal from 'react-modal';

Modal.setAppElement('#root');

const PAGE_SIZE = 8;

export default function PurchaseLedger() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount_paid: '', payment_method: 'Cash', bank_name: '', transaction_date: new Date().toISOString().split('T')[0] });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    const fetchLedger = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/api/spurchase`);
        setPurchases(res.data);
        setFiltered(res.data);
      } catch (err) {
        setError('Failed to load purchase ledger');
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, []);

  useEffect(() => {
    const s = searchTerm.toLowerCase();
    const filteredData = purchases.filter(p =>
      p.purchase_number?.toLowerCase().includes(s) ||
      p.supplier_name?.toLowerCase().includes(s)
    );
    setFiltered(filteredData);
    setCurrentPage(1);
  }, [searchTerm, purchases]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const [selectedSupplierData, setSelectedSupplierData] = useState(null); // { name, bills[] }

  const openModal = (purchase) => {
    const supplierBills = purchases.filter(
      p => p.supplier_name?.toLowerCase() === purchase.supplier_name?.toLowerCase()
    ).sort((a, b) => new Date(a.purchase_date || 0) - new Date(b.purchase_date || 0));
    setSelectedSupplierData({ name: purchase.supplier_name, address: purchase.address, bills: supplierBills });
  };

  const closeModal = () => { setSelectedSupplierData(null); setSelectedPurchase(null); };

  // alias for payment modal compat
  const selectedPurchaseAlias = selectedPurchase;

  const openPaymentModal = (purchase) => {
    setSelectedPurchase(purchase);
    setShowPaymentModal(true);
    setPaymentForm({ amount_paid: '', payment_method: 'Cash', bank_name: '', paid_to: '', transaction_date: new Date().toISOString().split('T')[0] });
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
        purchase_id: selectedPurchase.id,
        amount_paid: parseFloat(paymentForm.amount_paid),
        payment_method: paymentForm.payment_method,
        bank_name: paymentForm.bank_name || null,
        paid_to: paymentForm.paid_to || null,
        transaction_date: paymentForm.transaction_date,
        admin_id: null,
      });
      setPaymentSuccess('Payment recorded successfully!');
      // Refresh list
      const res = await axios.get(`${API_BASE_URL}/api/spurchase`);
      setPurchases(res.data);
      setFiltered(res.data);
      setSelectedPurchase(null);
      setTimeout(() => { setShowPaymentModal(false); setPaymentSuccess(''); }, 1500);
    } catch (err) {
      setPaymentError('Failed to record payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getTotalCases = (purchase) => {
    const items = purchase.items || [];
    return items.reduce((s, i) => s + (parseInt(i.cases) || 0), 0);
  };

  const getTaxAmount = (purchase) => {
    const items = purchase.items || [];
    const extra = purchase.extra_charges || {};
    const subtotal = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const packing_percent = parseFloat(extra.packing_percent) || 3.0;
    const packingCharges = extra.apply_processing_fee ? subtotal * (packing_percent / 100) : 0;
    const extraTaxable = parseFloat(extra.taxable_value) || 0;
    const taxableAmount = subtotal + packingCharges + extraTaxable;
    const additional_discount = parseFloat(extra.additional_discount) || 0;
    const discountAmt = taxableAmount * (additional_discount / 100);
    const netTaxable = taxableAmount - discountAmt;
    let cgst = 0, sgst = 0, igst = 0;
    if (extra.apply_igst) igst = netTaxable * 0.18;
    else if (extra.apply_cgst && extra.apply_sgst) { cgst = netTaxable * 0.09; sgst = netTaxable * 0.09; }
    return parseFloat((cgst + sgst + igst).toFixed(2));
  };

  // ── printLedger — All bills for this supplier, NO tax section ─────────────────
  const printLedger = (supplierData) => {
    const data = supplierData || selectedSupplierData;
    if (!data) return;

    const supplierPurchases = data.bills;
    const supplierName = data.name;
    const supplierAddress = data.address || '';

    let totalPurchaseAmount = 0;
    let totalPaid = 0;
    const allDispatches = [];
    const allPayments = [];

    supplierPurchases.forEach(p => {
      totalPurchaseAmount += parseFloat(p.total) || 0;
      const payments = p.payments || [];
      totalPaid += payments.reduce((s, pay) => s + parseFloat(pay.amount_paid || 0), 0);
      allPayments.push(...payments.map(pay => ({ ...pay, purchase_number: p.purchase_number })));

      const pDate = p.purchase_date ? new Date(p.purchase_date).getTime() : (p.created_at ? new Date(p.created_at).getTime() : 0);
      const dispatches = p.dispatch_logs || [];
      const pItems = typeof p.items === 'string' ? JSON.parse(p.items || '[]') : (p.items || []);

      if (dispatches.length > 0) {
        dispatches.forEach(dl => {
          allDispatches.push({
            ...dl,
            purchase_number: p.purchase_number,
            supplier_name: p.supplier_name,
            _item: pItems.find((_, idx) => idx === dl.product_index) || {}
          });
        });
      } else if (pItems.length > 0) {
        pItems.forEach((item, idx) => {
          const c = parseFloat(item.cases) || 0;
          const per = parseFloat(item.per_case) || 1;
          const r = parseFloat(item.rate_per_box) || 0;
          const disc = parseFloat(item.discount_percent) || 0;
          allDispatches.push({
            product_name: item.productname || item.product_name || 'N/A',
            dispatched_cases: c,
            dispatched_qty: c * per,
            dispatched_at: p.purchase_date || p.created_at,
            purchase_number: p.purchase_number,
            supplier_name: p.supplier_name,
            _item: { rate_per_box: r, discount_percent: disc }
          });
        });
      }
    });

    // ── Build unified ledger rows ────────────────────────────────────────────
    const ledgerRows = [];
    let totalTaxSum = 0;

    supplierPurchases.forEach(p => {
      const pDate = p.purchase_date ? new Date(p.purchase_date).getTime() : (p.created_at ? new Date(p.created_at).getTime() : 0);
      const extra = typeof p.extra_charges === 'string' ? JSON.parse(p.extra_charges || '{}') : (p.extra_charges || {});
      const pItems = typeof p.items === 'string' ? JSON.parse(p.items || '[]') : (p.items || []);

      let subtotal = 0;
      const calculatedItems = pItems.map(item => {
        const c = parseFloat(item.cases) || 0;
        const per = parseFloat(item.per_case) || 1;
        const r = parseFloat(item.rate_per_box) || 0;
        const d = parseFloat(item.discount_percent) || 0;
        const effR = r * (1 - d / 100);
        const itemAmt = c * per * effR;
        subtotal += itemAmt;
        return {
          productname: item.productname,
          cases: c,
          qty: c * per,
          rate: effR,
          itemAmt
        };
      });

      const packingCharges = extra.apply_processing_fee ? subtotal * ((parseFloat(extra.packing_percent) || 0) / 100) : 0;
      const extraTaxable = parseFloat(extra.taxable_value) || 0;
      const taxableAmount = subtotal + packingCharges + extraTaxable;
      const discountAmt = taxableAmount * ((parseFloat(extra.additional_discount) || 0) / 100);
      const netTaxable = taxableAmount - discountAmt;

      let cgst = 0, sgst = 0, igst = 0;
      if (extra.apply_igst) igst = netTaxable * 0.18;
      else if (extra.apply_cgst && extra.apply_sgst) {
        cgst = netTaxable * 0.09;
        sgst = netTaxable * 0.09;
      }
      const totalTax = cgst + sgst + igst;
      totalTaxSum += totalTax;
      const calcGrand = Math.round(netTaxable + totalTax);
      const grandTotal = parseFloat(p.total) || calcGrand;

      let runningDebit = 0;
      calculatedItems.forEach((ci, idx) => {
        const share = subtotal > 0 ? (ci.itemAmt / subtotal) : (1 / (calculatedItems.length || 1));
        const itemTax = totalTax * share;
        const itemExtra = (packingCharges + extraTaxable - discountAmt) * share;
        let itemDebit = ci.itemAmt + itemTax + itemExtra;

        // If last item of PO, reconcile any rounding so sum matches grandTotal exactly
        if (idx === calculatedItems.length - 1) {
          itemDebit = grandTotal - runningDebit;
        } else {
          itemDebit = Math.round(itemDebit * 100) / 100;
          runningDebit += itemDebit;
        }

        let taxLabel = '—';
        if (itemTax > 0) {
          taxLabel = `₹${itemTax.toFixed(2)}`;
          if (extra.apply_igst) taxLabel += ' (18%)';
          else if (extra.apply_cgst && extra.apply_sgst) taxLabel += ' (9%+9%)';
        }

        ledgerRows.push({
          purchase_number: p.purchase_number,
          desc: ci.productname,
          cases: ci.cases || '',
          qty: ci.qty || '',
          rate: ci.rate > 0 ? ci.rate.toFixed(2) : '',
          tax: taxLabel,
          debit: itemDebit > 0 ? itemDebit.toFixed(2) : '',
          credit: '',
          date: pDate,
        });
      });
    });

    // Credit rows — payments made to supplier
    allPayments.forEach((pay) => {
      ledgerRows.push({
        purchase_number: pay.purchase_number || '',
        desc: `Payment (${pay.payment_method || 'N/A'})${pay.bank_name ? ' – ' + pay.bank_name : ''}${pay.paid_to ? ' | Paid to: ' + pay.paid_to : ''}`,
        cases: '—',
        qty: '—',
        rate: '—',
        tax: '—',
        debit: '',
        credit: parseFloat(pay.amount_paid || 0).toFixed(2),
        date: pay.payment_date ? new Date(pay.payment_date).getTime() : 0,
      });
    });
    // Sort chronologically
    ledgerRows.sort((a, b) => a.date - b.date);
    ledgerRows.forEach((r, i) => { r.slNo = i + 1; });

    const totalDebit = ledgerRows.reduce((s, r) => s + parseFloat(r.debit || 0), 0);
    const totalCredit = ledgerRows.reduce((s, r) => s + parseFloat(r.credit || 0), 0);
    const finalBalance = totalDebit - totalCredit;
    const isOutstanding = finalBalance > 0;

    const printDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    // Bill-wise summary with remaining cases calculation
    const billSummaryRows = supplierPurchases.map(p => {
      const pPaid = (p.payments || []).reduce((s, pay) => s + parseFloat(pay.amount_paid || 0), 0);
      const pCases = getTotalCases(p);
      const pRecv = (p.dispatch_logs || []).reduce((s, dl) => s + (parseFloat(dl.dispatched_cases) || 0), 0);
      const pPending = Math.max(0, Math.round((pCases - pRecv) * 100) / 100);
      const pTax = getTaxAmount(p);
      return {
        purchase_number: p.purchase_number,
        date: p.purchase_date,
        cases: pCases,
        recv: pRecv,
        pending: pPending,
        tax: pTax,
        total: parseFloat(p.total || 0),
        paid: pPaid,
        balance: parseFloat(p.total || 0) - pPaid
      };
    });

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Purchase Ledger – ${supplierName}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 20px; font-size: 10pt; }
  h2  { text-align: center; font-size: 14pt; margin-bottom: 4px; }
  h3  { margin-top: 25px; font-size: 11pt; }
  .sub { text-align: center; font-size: 9pt; color: #555; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #000; padding: 5px 7px; text-align: center; font-size: 9pt; }
  th { background: #dcdcdc; font-weight: bold; }
  td.left { text-align: left; }
  .debit  { color: #cc0000; font-weight: bold; }
  .credit { color: #007700; font-weight: bold; }
  .total  { font-weight: bold; background: #c8c8c8; }
  .balance-row td { font-size: 10pt; font-weight: bold; }
  p { margin: 4px 0; }
  @media print { body { margin: 10px; } }
</style>
</head><body>

<h2>Purchase Ledger</h2>
<p class="sub">Supplier Account Statement &nbsp;|&nbsp; Printed: ${printDate}</p>

<table style="width:auto;border:none;margin-bottom:10px;">
  <tr><td style="border:none;font-weight:bold;padding:2px 10px 2px 0;">Supplier:</td><td style="border:none;padding:2px 0;">${supplierName}</td></tr>
  ${supplierAddress ? `<tr><td style="border:none;font-weight:bold;padding:2px 10px 2px 0;">Address:</td><td style="border:none;padding:2px 0;">${supplierAddress}</td></tr>` : ''}
</table>

<!-- Bill-wise summary table -->
<h3 style="font-size:11pt;margin:10px 0 6px;">Bill / PO Summary (Cases Booked &amp; Remaining Pending)</h3>
<table>
  <thead><tr>
    <th>PO No</th><th>Date</th><th>Booked Cases</th><th>Recv Cases</th><th>Pending to Send</th><th>Total (DR)</th><th>Paid (CR)</th><th>Balance</th>
  </tr></thead>
  <tbody>
    ${billSummaryRows.map(b => `<tr>
      <td style="font-weight:bold;color:#166534">${b.purchase_number}</td>
      <td>${b.date ? new Date(b.date).toLocaleDateString('en-IN') : '—'}</td>
      <td>${b.cases}</td>
      <td>${b.recv}</td>
      <td style="font-weight:bold;color:${b.pending > 0 ? '#b45309' : '#15803d'}">${b.pending > 0 ? b.pending + ' Pending' : 'All Recv'}</td>
      <td class="debit">₹${b.total.toFixed(2)}</td>
      <td class="credit">₹${b.paid.toFixed(2)}</td>
      <td class="${b.balance > 0 ? 'debit' : 'credit'}">₹${Math.abs(b.balance).toFixed(2)} ${b.balance > 0 ? '(Due)' : '(Paid)'}</td>
    </tr>`).join('')}
    <tr class="total">
      <td colspan="5" style="text-align:right;">Total</td>
      <td class="debit">₹${totalDebit.toFixed(2)}</td>
      <td class="credit">₹${totalCredit.toFixed(2)}</td>
      <td class="${isOutstanding ? 'debit' : 'credit'}">₹${Math.abs(finalBalance).toFixed(2)} ${isOutstanding ? '(Due)' : '(Clear)'}</td>
    </tr>
  </tbody>
</table>

<h3 style="font-size:11pt;margin:16px 0 6px;">Detailed Ledger (All POs)</h3>
<table>
  <thead>
    <tr>
      <th style="width:4%">Sl.No</th>
      <th style="width:8%">PO No</th>
      <th style="width:26%">Description</th>
      <th style="width:6%">Cases</th>
      <th style="width:6%">Qty</th>
      <th style="width:8%">Rate/Box</th>
      <th style="width:9%">Date</th>
      <th style="width:13%">Tax / GST</th>
      <th style="width:13%">Total / Debit (DR)</th>
      <th style="width:13%">Credit (CR)</th>
    </tr>
  </thead>
  <tbody>
    ${ledgerRows.map(r => `
    <tr>
      <td>${r.slNo}</td>
      <td style="font-weight:bold;color:#166534">${r.purchase_number || ''}</td>
      <td class="left">${r.desc}</td>
      <td>${r.cases}</td>
      <td>${r.qty}</td>
      <td>${r.rate ? '₹' + r.rate : ''}</td>
      <td>${r.date ? new Date(r.date).toLocaleDateString('en-IN') : ''}</td>
      <td style="font-weight:600;color:#b45309;">${r.tax || '—'}</td>
      <td class="debit">${r.debit ? '₹' + r.debit : ''}</td>
      <td class="credit">${r.credit ? '₹' + r.credit : ''}</td>
    </tr>`).join('')}
    <tr class="total">
      <td colspan="7" style="text-align:right;">TOTALS</td>
      <td style="font-weight:bold;color:#b45309;">₹${totalTaxSum.toFixed(2)}</td>
      <td class="debit">₹${totalDebit.toFixed(2)}</td>
      <td class="credit">₹${totalCredit.toFixed(2)}</td>
    </tr>
    <tr class="balance-row">
      <td colspan="8" style="text-align:right;">${isOutstanding ? 'Balance Payable to Supplier' : 'Advance / Overpaid'}</td>
      <td colspan="2" class="${isOutstanding ? 'debit' : 'credit'}" style="text-align:center;">
        ₹${Math.abs(finalBalance).toFixed(2)} ${isOutstanding ? '(Outstanding)' : '(Advance)'}
      </td>
    </tr>
  </tbody>
</table>

<p style="margin-top:18px;">
  <strong>Total Purchase Value:</strong> <span class="debit">₹${totalDebit.toFixed(2)}</span>&nbsp;&nbsp;
  <strong>Total Paid:</strong> <span class="credit">₹${totalCredit.toFixed(2)}</span>&nbsp;&nbsp;
  <strong>Net Balance:</strong>
  <span class="${isOutstanding ? 'debit' : 'credit'}">
    ₹${Math.abs(finalBalance).toFixed(2)} ${isOutstanding ? '(Payable)' : '(Advance)'}
  </span>
</p>

${allPayments.length ? `
<h3>Payment Details</h3>
<table>
  <thead><tr><th>Sl.No</th><th>PO No</th><th>Date</th><th>Method</th><th>Bank</th><th>Paid To</th><th>Amount (CR)</th></tr></thead>
  <tbody>
    ${allPayments.map((p, i) => `<tr>
      <td>${i + 1}</td>
      <td style="font-weight:bold;color:#166534">${p.purchase_number || ''}</td>
      <td>${p.transaction_date ? new Date(p.transaction_date).toLocaleDateString('en-IN') : ''}</td>
      <td>${p.payment_method || ''}</td>
      <td>${p.bank_name || '—'}</td>
      <td>${p.paid_to || '—'}</td>
      <td class="credit">₹${parseFloat(p.amount_paid || 0).toFixed(2)}</td>
    </tr>`).join('')}
  </tbody>
</table>` : ''}

<p style="margin-top:30px; text-align:center; font-size:8pt; color:#555;">
  Computer-generated Purchase Ledger • Subject to Sivakasi Jurisdiction
</p>
</body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.print();
  };

  const textClass = 'text-black dark:text-white';
  const cardClass = 'bg-white dark:bg-gray-800 rounded-xl shadow-lg';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 hundred:ml-64 pt-16 hundred:pt-0">
      <Sidebar />
      <div className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="pl-12 hundred:pl-0">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Purchase Ledger</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Supplier-wise purchase tracking</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/ledger')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow"
            >
              <FaBook /> Customer Ledger
            </button>
            <Logout />
          </div>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 text-red-700 text-sm">{error}</div>}

        {/* Search */}
        <div className={`${cardClass} p-4 mb-4`}>
          <div className="relative max-w-md">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by PO number or supplier..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:border-green-500 text-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className={`${cardClass} overflow-hidden`}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    {['PO Number', 'Date', 'Supplier', 'Booked Cases', 'Recv / Pending to Send', 'Tax Amount', 'Total (DR)', 'Paid (CR)', 'Balance', 'Actions'].map(h => (
                      <th key={h} className={`px-4 py-3 text-left font-semibold ${textClass} whitespace-nowrap text-xs tracking-wider`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((purchase) => {
                    const balance = parseFloat(purchase.balance) || 0;
                    const totalCases = getTotalCases(purchase);
                    const recvCases = (purchase.dispatch_logs || []).reduce((s, dl) => s + (parseInt(dl.dispatched_cases) || 0), 0);
                    const pendingCases = Math.max(0, totalCases - recvCases);
                    const taxAmount = getTaxAmount(purchase);
                    return (
                      <tr key={purchase.id} className="border-t border-gray-100 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-emerald-500 dark:text-emerald-400">{purchase.purchase_number}</td>
                        <td className={`px-4 py-3 ${textClass} whitespace-nowrap`}>{purchase.purchase_date ? new Date(purchase.purchase_date).toLocaleDateString('en-IN') : '—'}</td>
                        <td className={`px-4 py-3 font-medium ${textClass}`}>{purchase.supplier_name}</td>
                        <td className={`px-4 py-3 text-center ${textClass} font-bold`}>{totalCases || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-xs font-semibold text-emerald-400">{recvCases} recv</span>
                            {pendingCases > 0 ? (
                              <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 whitespace-nowrap">
                                {pendingCases} pending to send
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-500">All received</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-orange-600 dark:text-orange-400">
                          {taxAmount > 0 ? `₹${taxAmount.toFixed(2)}` : '—'}
                        </td>
                        <td className={`px-4 py-3 font-bold ${textClass}`}>₹{parseFloat(purchase.total || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 font-bold text-emerald-500 dark:text-emerald-400">₹{parseFloat(purchase.paid || 0).toFixed(2)}</td>
                        <td className={`px-4 py-3 font-bold ${balance > 0 ? 'text-rose-500' : 'text-emerald-500 dark:text-emerald-400'}`}>
                          ₹{Math.abs(balance).toFixed(2)}
                          {balance > 0 ? <span className="ml-1 text-xs font-normal text-rose-400">(Due)</span> : <span className="ml-1 text-xs font-normal text-emerald-400">(Paid)</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openModal(purchase)}
                              className="px-3 py-1.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium rounded-lg hover:bg-blue-200 transition-colors"
                            >
                              View All POs
                            </button>
                            <button
                              onClick={() => openPaymentModal(purchase)}
                              className="px-3 py-1.5 text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium rounded-lg hover:bg-emerald-200 transition-colors"
                            >
                              + Pay
                            </button>
                            <button
                              onClick={() => {
                                const supplierBills = purchases.filter(p2 => p2.supplier_name?.toLowerCase() === purchase.supplier_name?.toLowerCase()).sort((a, b) => new Date(a.purchase_date || 0) - new Date(b.purchase_date || 0));
                                printLedger({ name: purchase.supplier_name, address: purchase.address, bills: supplierBills });
                              }}
                              className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              Print
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginated.length === 0 && (
                    <tr><td colSpan={10} className="text-center py-12 text-gray-400">No purchase records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Page {currentPage} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50">Prev</button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal — All POs for this supplier */}
      <Modal
        isOpen={!!selectedSupplierData && !showPaymentModal}
        onRequestClose={closeModal}
        style={{
          overlay: { backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000 },
          content: { inset: '5% 5%', borderRadius: '16px', padding: '24px', border: 'none', overflow: 'auto' }
        }}
      >
        {selectedSupplierData && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{selectedSupplierData.name} — Full Account</h3>
                <p className="text-sm text-gray-500">{selectedSupplierData.bills.length} PO(s)</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => printLedger(selectedSupplierData)} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900">
                  <FaPrint /> Print All POs
                </button>
                <button onClick={closeModal} className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300">✕</button>
              </div>
            </div>

            {/* Account summary */}
            {(() => {
              const totalBilled = selectedSupplierData.bills.reduce((s, p) => s + parseFloat(p.total || 0), 0);
              const totalPaidAll = selectedSupplierData.bills.reduce((s, p) => s + (p.payments || []).reduce((ps, pay) => ps + parseFloat(pay.amount_paid || 0), 0), 0);
              const balance = totalBilled - totalPaidAll;
              return (
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Total Purchased</p>
                    <p className="text-lg font-bold text-red-600">₹{totalBilled.toFixed(2)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Total Paid</p>
                    <p className="text-lg font-bold text-green-600">₹{totalPaidAll.toFixed(2)}</p>
                  </div>
                  <div className={`rounded-lg p-3 ${balance > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                    <p className="text-xs text-gray-500 mb-1">Net Balance</p>
                    <p className={`text-lg font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{Math.abs(balance).toFixed(2)} {balance > 0 ? '(Due)' : '(Clear)'}</p>
                  </div>
                </div>
              );
            })()}

            {/* Per-PO breakdown */}
            {selectedSupplierData.bills.map((p) => {
              const pPaid = (p.payments || []).reduce((s, pay) => s + parseFloat(pay.amount_paid || 0), 0);
              const pBalance = parseFloat(p.total || 0) - pPaid;
              const pCases = getTotalCases(p);
              const pTax = getTaxAmount(p);
              return (
                <div key={p.id} className="mb-5 border border-gray-200 rounded-xl overflow-hidden">
                  {/* PO header */}
                  <div className="bg-green-50 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-green-700 text-sm">PO #{p.purchase_number}</span>
                      <span className="text-xs text-gray-500">{p.purchase_date ? new Date(p.purchase_date).toLocaleDateString('en-IN') : '—'}</span>
                      <span className="text-xs text-gray-500">• {pCases} cases</span>
                      {pTax > 0 && <span className="text-xs text-orange-600">• Tax: ₹{pTax.toFixed(2)}</span>}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-600">Total: <strong>₹{parseFloat(p.total || 0).toFixed(2)}</strong></span>
                      <span className="text-green-600">Paid: <strong>₹{pPaid.toFixed(2)}</strong></span>
                      <span className={pBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                        Balance: <strong>₹{Math.abs(pBalance).toFixed(2)}</strong> {pBalance > 0 ? '(Due)' : '(Clear)'}
                      </span>
                    </div>
                  </div>

                  {/* Items */}
                  {(p.items || []).length > 0 && (
                    <div className="p-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Items Purchased</p>
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            {['Product', 'Cases', 'Qty', 'Rate/Box', 'Amount'].map(h => (
                              <th key={h} className="px-2 py-1.5 text-left font-semibold text-gray-600 border border-gray-200">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {p.items.map((item, i) => (
                            <tr key={i} className="border-t border-gray-200">
                              <td className="px-2 py-1">{item.productname}</td>
                              <td className="px-2 py-1 text-center">{item.cases}</td>
                              <td className="px-2 py-1 text-center">{item.quantity}</td>
                              <td className="px-2 py-1">₹{parseFloat(item.rate_per_box || 0).toFixed(2)}</td>
                              <td className="px-2 py-1 font-semibold">₹{parseFloat(item.amount || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Payments */}
                  {(p.payments || []).length > 0 && (
                    <div className="px-3 pb-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Payments</p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.payments.map((pay, i) => (
                          <div key={i} className="flex items-center gap-2 bg-green-50 rounded px-2 py-1 text-xs">
                            <span className="text-gray-500">{pay.transaction_date ? new Date(pay.transaction_date).toLocaleDateString('en-IN') : '—'}</span>
                            <span className="text-gray-600">{pay.payment_method}{pay.bank_name ? ` – ${pay.bank_name}` : ''}{pay.paid_to ? ` | ${pay.paid_to}` : ''}</span>
                            <span className="font-bold text-green-600">₹{parseFloat(pay.amount_paid).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>
      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onRequestClose={() => { setShowPaymentModal(false); setSelectedPurchase(null); }}
        style={{
          overlay: { backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000 },
          content: { inset: '25% 30%', borderRadius: '16px', padding: '24px', border: 'none' }
        }}
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Record Payment</h3>
            <button onClick={() => { setShowPaymentModal(false); setSelectedPurchase(null); }} className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300">✕</button>
          </div>
          {selectedPurchase && (
            <p className="text-sm text-gray-600 mb-4">
              Supplier: <strong>{selectedPurchase.supplier_name}</strong> | Balance: <strong className="text-red-600">₹{parseFloat(selectedPurchase.balance || 0).toFixed(2)}</strong>
            </p>
          )}
          {paymentError && <div className="mb-3 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">{paymentError}</div>}
          {paymentSuccess && <div className="mb-3 p-2 bg-green-100 border border-green-300 rounded text-green-700 text-sm">{paymentSuccess}</div>}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid *</label>
              <input
                type="number"
                value={paymentForm.amount_paid}
                onChange={e => setPaymentForm(f => ({ ...f, amount_paid: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                placeholder="Enter amount"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={paymentForm.payment_method}
                onChange={e => setPaymentForm(f => ({ ...f, payment_method: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              >
                <option>Cash</option>
                <option>Bank Transfer</option>
                <option>Cheque</option>
                <option>UPI</option>
              </select>
            </div>
            {paymentForm.payment_method !== 'Cash' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={paymentForm.bank_name}
                  onChange={e => setPaymentForm(f => ({ ...f, bank_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                  placeholder="Bank name"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paid To (Name)</label>
              <input
                type="text"
                value={paymentForm.paid_to}
                onChange={e => setPaymentForm(f => ({ ...f, paid_to: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                placeholder="Person/party name paid to"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={paymentForm.transaction_date}
                onChange={e => setPaymentForm(f => ({ ...f, transaction_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              />
            </div>
            <button
              onClick={handleRecordPayment}
              disabled={paymentLoading}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
            >
              {paymentLoading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}