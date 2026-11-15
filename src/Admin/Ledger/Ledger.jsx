import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../../../Config";
import Sidebar from "../Sidebar/Sidebar";
import Logout from "../../Admin/Logout";
import { FaTruck, FaRupeeSign, FaPrint, FaSearch, FaShoppingCart } from "react-icons/fa";
import Modal from "react-modal";

Modal.setAppElement("#root");

const PAGE_SIZE = 12;

export default function Ledger() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLedger = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/api/sbooking`);
        setBookings(res.data);
        setFiltered(res.data);
      } catch (err) {
        setError("Failed to load ledger");
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, []);

  useEffect(() => {
    const s = searchTerm.toLowerCase();
    const filteredData = bookings.filter(b =>
      b.bill_number?.toLowerCase().includes(s) ||
      b.customer_name?.toLowerCase().includes(s)
    );
    setFiltered(filteredData);
    setCurrentPage(1);
  }, [searchTerm, bookings]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const [selectedCustomer, setSelectedCustomer] = useState(null); // { name, bills[] }

  const openModal = (booking) => {
    const customerBills = bookings.filter(
      b => b.customer_name?.toLowerCase() === booking.customer_name?.toLowerCase()
    ).sort((a, b) => {
      const da = new Date(a.bill_date || a.created_at || 0);
      const db = new Date(b.bill_date || b.created_at || 0);
      return da - db;
    });
    setSelectedCustomer({ name: booking.customer_name, bills: customerBills });
  };

  const closeModal = () => setSelectedCustomer(null);

  // ── Helper: compute total cases from items ────────────────────────────────
  const getTotalCases = (booking) => {
    const items = booking.items || [];
    return items.reduce((s, i) => s + (parseInt(i.cases) || 0), 0);
  };

  const [stockMap, setStockMap] = useState({});

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reports/godown-stock`)
      .then(r => r.json())
      .then(data => {
        const map = {};
        (data || []).forEach(s => {
          if (s.productname && s.product_type) {
            const pKey = `${s.productname.toLowerCase().trim()}_${(s.brand || '').toLowerCase().trim()}`;
            map[pKey] = s.product_type;
            map[s.productname.toLowerCase().trim()] = s.product_type;
          }
        });
        setStockMap(map);
      })
      .catch(console.error);
  }, []);

  // ── Helper: compute Dealer Abstract (categories & brands breakdown) ──────
  const computeDealerAbstract = (customerBills) => {
    let grandTotalCases = 0;
    let grandTotalQty = 0;
    let grandTotalAmount = 0;
    const categoriesMap = {};

    customerBills.forEach(bill => {
      const items = Array.isArray(bill.items)
        ? bill.items
        : (typeof bill.items === 'string' ? JSON.parse(bill.items || '[]') : bill.items || []);

      items.forEach(item => {
        const pName = (item.productname || 'Unknown Product').trim();
        const bName = (item.brand || 'General').trim();
        const pNameLower = pName.toLowerCase();
        const bNameLower = bName.toLowerCase();

        let rawType = item.product_type || stockMap[`${pNameLower}_${bNameLower}`] || stockMap[pNameLower] || 'General Category';
        let pType = rawType.replace(/_/g, ' ').toUpperCase();

        const cases = parseInt(item.cases) || 0;
        const perCase = parseInt(item.per_case) || 1;
        const qty = parseInt(item.quantity) || (cases * perCase);
        const amount = parseFloat(item.amount) || (qty * (parseFloat(item.rate_per_box) || 0));

        grandTotalCases += cases;
        grandTotalQty += qty;
        grandTotalAmount += amount;

        if (!categoriesMap[pType]) {
          categoriesMap[pType] = { categoryName: pType, totalCases: 0, totalQty: 0, totalAmount: 0, brands: {} };
        }

        const catObj = categoriesMap[pType];
        catObj.totalCases += cases;
        catObj.totalQty += qty;
        catObj.totalAmount += amount;

        if (!catObj.brands[bName]) {
          catObj.brands[bName] = { brandName: bName, totalCases: 0, totalQty: 0, totalAmount: 0, products: {} };
        }

        const brandObj = catObj.brands[bName];
        brandObj.totalCases += cases;
        brandObj.totalQty += qty;
        brandObj.totalAmount += amount;

        if (!brandObj.products[pName]) {
          brandObj.products[pName] = { productName: pName, brandName: bName, perCase, cases: 0, totalQty: 0, totalAmount: 0 };
        }

        const prodObj = brandObj.products[pName];
        prodObj.cases += cases;
        prodObj.totalQty += qty;
        prodObj.totalAmount += amount;
      });
    });

    const categories = Object.values(categoriesMap).map(cat => ({
      ...cat,
      brands: Object.values(cat.brands).map(br => ({
        ...br,
        products: Object.values(br.products)
      }))
    }));

    return { grandTotalCases, grandTotalQty, grandTotalAmount, categories };
  };

  // ── Print ledger — ALL bills for this customer + Dealer Abstract ───────────
  const printLedger = (customerData) => {
    const data = customerData || selectedCustomer;
    if (!data) return;

    const customerBills = data.bills;
    const customerName = data.name;
    const abstract = computeDealerAbstract(customerBills);

    let totalInvoiceAmount = 0;
    let totalPaid = 0;
    const allDispatches = [];
    const allPayments = [];

    customerBills.forEach(b => {
      totalInvoiceAmount += parseFloat(b.total) || 0;
      const payments = b.payments || [];
      totalPaid += payments.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);
      allPayments.push(...payments.map(p => ({ ...p, bill_number: b.bill_number })));

      const bDate = b.bill_date ? new Date(b.bill_date).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
      const dispatches = b.dispatch_logs || [];
      const bItems = typeof b.items === "string" ? JSON.parse(b.items || "[]") : (b.items || []);

      if (dispatches.length > 0) {
        dispatches.forEach(dl => {
          allDispatches.push({
            ...dl,
            bill_number: b.bill_number,
            bill_date: b.bill_date || b.created_at,
          });
        });
      } else if (bItems.length > 0) {
        // If not dispatched yet, include booked items so goods DR appears
        bItems.forEach(item => {
          const c = parseFloat(item.cases) || 0;
          const p = parseFloat(item.per_case) || 1;
          const r = parseFloat(item.rate_per_box) || 0;
          const d = parseFloat(item.discount_percent) || 0;
          const lineAmt = c * p * r * (1 - d / 100);
          allDispatches.push({
            product_name: item.productname || item.product_name || "N/A",
            dispatched_cases: c,
            dispatched_qty: c * p,
            price_per_box: r,
            discount_percent: d,
            dispatched_at: b.bill_date || b.created_at,
            bill_number: b.bill_number,
          });
        });
      }
    });

    const ledgerRows = [];
    let totalTaxSum = 0;

    customerBills.forEach(b => {
      const bDate = b.bill_date ? new Date(b.bill_date).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
      const extra = typeof b.extra_charges === "string" ? JSON.parse(b.extra_charges || "{}") : (b.extra_charges || {});
      const bItems = typeof b.items === "string" ? JSON.parse(b.items || "[]") : (b.items || []);

      let subtotal = 0;
      const calculatedItems = bItems.map(item => {
        const c = parseFloat(item.cases) || 0;
        const p = parseFloat(item.per_case) || 1;
        const r = parseFloat(item.rate_per_box) || 0;
        const d = parseFloat(item.discount_percent) || 0;
        const effR = r * (1 - d / 100);
        const itemAmt = c * p * effR;
        subtotal += itemAmt;
        return {
          productname: item.productname,
          cases: c,
          qty: c * p,
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
      const grandTotal = parseFloat(b.total) || calcGrand;

      let runningDebit = 0;
      calculatedItems.forEach((ci, idx) => {
        const share = subtotal > 0 ? (ci.itemAmt / subtotal) : (1 / (calculatedItems.length || 1));
        const itemTax = totalTax * share;
        const itemExtra = (packingCharges + extraTaxable - discountAmt) * share;
        let itemDebit = ci.itemAmt + itemTax + itemExtra;

        // If last item of bill, reconcile any rounding so sum matches grandTotal exactly
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
          bill_number: b.bill_number,
          desc: ci.productname,
          cases: ci.cases || '',
          qty: ci.qty || '',
          rate: ci.rate > 0 ? ci.rate.toFixed(2) : '',
          tax: taxLabel,
          debit: itemDebit > 0 ? itemDebit.toFixed(2) : '',
          credit: '',
          date: bDate,
        });
      });
    });

    allPayments.forEach((pay) => {
      ledgerRows.push({
        bill_number: pay.bill_number || "",
        desc: `Payment (${pay.payment_method || "N/A"})${pay.bank_name ? " – " + pay.bank_name : ""}`,
        cases: "—",
        qty: "—",
        rate: "—",
        tax: "—",
        debit: "",
        credit: parseFloat(pay.amount_paid || 0).toFixed(2),
        date: pay.transaction_date ? new Date(pay.transaction_date).getTime() : 0,
      });
    });

    ledgerRows.sort((a, b) => a.date - b.date);
    ledgerRows.forEach((r, i) => { r.slNo = i + 1; });

    const totalDebit = ledgerRows.reduce((s, r) => s + parseFloat(r.debit || 0), 0);
    const totalCredit = ledgerRows.reduce((s, r) => s + parseFloat(r.credit || 0), 0);
    const finalBalance = totalDebit - totalCredit;
    const isOutstanding = finalBalance > 0;
    const printDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    // Bill-wise summary
    const billSummaryRows = customerBills.map(b => {
      const bPaid = (b.payments || []).reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);
      const bCases = getTotalCases(b);
      return { bill_number: b.bill_number, date: b.bill_date || b.created_at, cases: bCases, total: parseFloat(b.total || 0), paid: bPaid, balance: (parseFloat(b.total || 0) - bPaid) };
    });

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Customer Ledger – ${customerName}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 20px; font-size: 10pt; }
  h2  { text-align: center; font-size: 14pt; margin-bottom: 4px; }
  .sub { text-align: center; font-size: 9pt; color: #555; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1px solid #000; padding: 5px 7px; text-align: center; font-size: 9pt; }
  th { background: #dcdcdc; font-weight: bold; }
  td.left { text-align: left; }
  .debit  { color: #cc0000; font-weight: bold; }
  .credit { color: #007700; font-weight: bold; }
  .total  { font-weight: bold; background: #c8c8c8; }
  .section-title { font-size: 11pt; font-weight: bold; margin: 16px 0 6px; color: #1e3a8a; }
  @media print { body { margin: 10px; } }
</style>
</head><body>
<h2>Customer Ledger & Dealer Abstract</h2>
<p class="sub">Account Statement & Products Purchased &nbsp;|&nbsp; Printed: ${printDate}</p>

<table style="width:auto;border:none;margin-bottom:10px;">
  <tr><td style="border:none;font-weight:bold;padding:2px 10px 2px 0;">Customer:</td><td style="border:none;padding:2px 0;">${customerName}</td></tr>
</table>

<!-- Bill-wise summary table -->
<h3 class="section-title">1. Bill Summary</h3>
<table>
  <thead><tr>
    <th>Bill No</th><th>Date</th><th>Cases</th><th>Total (DR)</th><th>Paid (CR)</th><th>Balance</th>
  </tr></thead>
  <tbody>
    ${billSummaryRows.map(b => `<tr>
      <td style="font-weight:bold;color:#1d4ed8">${b.bill_number}</td>
      <td>${b.date ? new Date(b.date).toLocaleDateString('en-IN') : '—'}</td>
      <td>${b.cases}</td>
      <td class="debit">₹${b.total.toFixed(2)}</td>
      <td class="credit">₹${b.paid.toFixed(2)}</td>
      <td class="${b.balance > 0 ? 'debit' : 'credit'}">₹${Math.abs(b.balance).toFixed(2)} ${b.balance > 0 ? '(Due)' : '(Paid)'}</td>
    </tr>`).join('')}
    <tr class="total">
      <td colspan="3" style="text-align:right;">Total</td>
      <td class="debit">₹${totalInvoiceAmount.toFixed(2)}</td>
      <td class="credit">₹${totalPaid.toFixed(2)}</td>
      <td class="${isOutstanding ? 'debit' : 'credit'}">₹${Math.abs(finalBalance).toFixed(2)} ${isOutstanding ? '(Due)' : '(Clear)'}</td>
    </tr>
  </tbody>
</table>

<!-- Combined ledger -->
<h3 style="font-size:11pt;margin:16px 0 6px;">2. Detailed Ledger (All Bills)</h3>
<table>
  <thead>
    <tr>
      <th style="width:4%">Sl.No</th>
      <th style="width:8%">Bill No</th>
      <th style="width:26%">Description</th>
      <th style="width:6%">Cases</th>
      <th style="width:6%">Qty</th>
      <th style="width:8%">Rate/Box</th>
      <th style="width:9%">Date</th>
      <th style="width:13%">Tax / GST</th>
      <th style="width:13%">Debit (DR)</th>
      <th style="width:13%">Credit (CR)</th>
    </tr>
  </thead>
  <tbody>
    ${ledgerRows.map(r => `
    <tr>
      <td>${r.slNo}</td>
      <td style="font-weight:bold;color:#1d4ed8">${r.bill_number || ''}</td>
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
      <td colspan="8" style="text-align:right;">${isOutstanding ? 'Balance Receivable' : 'Advance / Overpaid'}</td>
      <td colspan="2" class="${isOutstanding ? 'debit' : 'credit'}" style="text-align:center;">
        ₹${Math.abs(finalBalance).toFixed(2)} ${isOutstanding ? '(Outstanding)' : '(Advance)'}
      </td>
    </tr>
  </tbody>
</table>

<p style="margin-top:18px;">
  <strong>Total Invoice Value:</strong> <span class="debit">₹${totalDebit.toFixed(2)}</span>&nbsp;&nbsp;
  <strong>Total Paid:</strong> <span class="credit">₹${totalCredit.toFixed(2)}</span>&nbsp;&nbsp;
  <strong>Net Balance:</strong>
  <span class="${isOutstanding ? 'debit' : 'credit'}">
    ₹${Math.abs(finalBalance).toFixed(2)} ${isOutstanding ? '(Receivable)' : '(Advance)'}
  </span>
</p>

${allPayments.length ? `
<h3 style="margin-top:25px;font-size:11pt;">Payment Details</h3>
<table>
  <thead><tr><th>Sl.No</th><th>Bill No</th><th>Date</th><th>Method</th><th>Bank</th><th>Amount (CR)</th></tr></thead>
  <tbody>
    ${allPayments.map((p, i) => `<tr>
      <td>${i + 1}</td>
      <td style="font-weight:bold;color:#1d4ed8">${p.bill_number || ''}</td>
      <td>${p.transaction_date ? new Date(p.transaction_date).toLocaleDateString('en-IN') : ''}</td>
      <td>${p.payment_method || ''}</td>
      <td>${p.bank_name || '—'}</td>
      <td class="credit">₹${parseFloat(p.amount_paid || 0).toFixed(2)}</td>
    </tr>`).join('')}
  </tbody>
</table>` : ''}

<!-- Dealer Abstract (Products Purchased Summary Table) — AT THE VERY LAST -->
<h3 class="section-title" style="margin-top:24px;">3. Dealer Abstract (Products Purchased Statement)</h3>
<table>
  <thead>
    <tr>
      <th style="width:22%;">Category / Product Type</th>
      <th style="width:18%;">Brand</th>
      <th style="width:30%;">Product Name</th>
      <th style="width:8%;">Pcs/Case</th>
      <th style="width:10%;">Cases</th>
      <th style="width:12%;">Total Pcs</th>
    </tr>
  </thead>
  <tbody>
    ${abstract.categories.flatMap(cat =>
      cat.brands.flatMap(br =>
        br.products.map(p => `<tr>
          <td class="left" style="font-weight:bold;">${cat.categoryName}</td>
          <td class="left">${br.brandName}</td>
          <td class="left">${p.productName}</td>
          <td>${p.perCase}</td>
          <td style="font-weight:bold;color:#1d4ed8">${p.cases}</td>
          <td style="font-weight:bold;color:#047857">${p.totalQty}</td>
        </tr>`)
      )
    ).join('')}
    <tr class="total">
      <td colspan="4" style="text-align:right;">Altogether Grand Total</td>
      <td style="color:#1d4ed8">${abstract.grandTotalCases} Cases</td>
      <td style="color:#047857">${abstract.grandTotalQty} Pcs</td>
    </tr>
  </tbody>
</table>

<p style="margin-top:30px;text-align:center;font-size:8pt;color:#555;">
  Computer-generated Customer Ledger • Subject to Sivakasi Jurisdiction
</p>
</body></html>`;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.print();
  };

  const textClass = "text-black dark:text-white";
  const cardClass = "bg-white dark:bg-gray-800 rounded-xl shadow-lg";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 hundred:ml-64 p-4 md:p-8 pt-20 hundred:pt-8">
      <Sidebar />
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="pl-12 hundred:pl-0">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Customer Ledger
            </h1>
            <p className="text-xs text-slate-400 mt-1">Customer-wise billing, receivables & payment tracking</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/purchaseledger')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/20"
            >
              <FaShoppingCart /> Purchase Ledger
            </button>
            <Logout />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-semibold text-center">{error}</div>
        )}

        {/* Search */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl">
          <div className="relative max-w-md">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search bill number or customer..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800">
                    {['Bill No', 'Date', 'Customer Name', 'No. of Cases', 'Total', 'Paid', 'Balance', 'Dispatch', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3.5 text-left text-xs uppercase font-extrabold tracking-wider text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginated.map(b => {
                    const totalCases = getTotalCases(b);
                    const balance = parseFloat(b.total || 0) - parseFloat(b.paid || 0);
                    const isClosed = b.is_closed;
                    return (
                      <tr key={b.id} className={`transition-colors ${isClosed ? 'opacity-50' : 'hover:bg-slate-800/40'}`}>
                        <td className="px-4 py-3.5 font-bold">
                          <span className="text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-800/50">
                            {b.bill_number}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                          {b.bill_date ? new Date(b.bill_date).toLocaleDateString('en-IN') : b.created_at ? new Date(b.created_at).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-200">{b.customer_name}</td>
                        <td className="px-4 py-3.5 text-center text-slate-300 font-medium">{totalCases || '—'}</td>
                        <td className="px-4 py-3.5 text-slate-300 font-medium">₹{parseFloat(b.total || 0).toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-emerald-400 font-semibold">₹{parseFloat(b.paid || 0).toFixed(2)}</td>
                        <td className="px-4 py-3.5">
                          <span className={`font-bold ${balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            ₹{Math.abs(balance).toFixed(2)}
                            <span className="ml-1 text-[11px] font-normal">{balance > 0 ? '(Due)' : '(Paid)'}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {(b.dispatch_logs || []).length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                              <FaTruck size={10} /> {b.dispatch_logs.length}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openModal(b)}
                              className="px-3 py-1.5 text-xs bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl transition font-semibold"
                            >
                              View All Bills
                            </button>
                            <button
                              onClick={() => {
                                const customerBills = bookings.filter(x => x.customer_name?.toLowerCase() === b.customer_name?.toLowerCase()).sort((a, b) => new Date(a.bill_date || a.created_at || 0) - new Date(b.bill_date || b.created_at || 0));
                                printLedger({ name: b.customer_name, bills: customerBills });
                              }}
                              className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition flex items-center gap-1 font-semibold"
                            >
                              <FaPrint size={10} /> Print
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginated.length === 0 && (
                    <tr><td colSpan={9} className="text-center py-16 text-slate-500 font-medium">No ledger entries found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/40">
              <span className="text-xs text-slate-400">Page {currentPage} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-300 hover:border-slate-700 disabled:opacity-40 transition">Prev</button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-300 hover:border-slate-700 disabled:opacity-40 transition">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal — All bills for this customer */}
      <Modal
        isOpen={!!selectedCustomer}
        onRequestClose={closeModal}
        className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full mx-4 my-4 outline-none overflow-hidden text-slate-100"
        overlayClassName="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
      >
        {selectedCustomer && (
          <div className="p-6 md:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-2xl font-extrabold text-white">
                  {selectedCustomer.name}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{selectedCustomer.bills.length} bill(s) recorded in total</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => navigate(`/reports/dealer-abstract?customer=${encodeURIComponent(selectedCustomer.name)}`)}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl flex items-center gap-2 text-xs font-bold shadow-lg shadow-indigo-600/20 transition"
                >
                  <FaShoppingCart /> Dealer Abstract
                </button>
                <button
                  onClick={() => printLedger(selectedCustomer)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center gap-2 text-xs font-bold transition border border-slate-700"
                >
                  <FaPrint /> Print All Bills
                </button>
                <button onClick={closeModal} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition text-lg">✕</button>
              </div>
            </div>

            {/* Account summary */}
            {(() => {
              const totalBilled = selectedCustomer.bills.reduce((s, b) => s + parseFloat(b.total || 0), 0);
              const totalPaidAll = selectedCustomer.bills.reduce((s, b) => s + (b.payments || []).reduce((ps, p) => ps + parseFloat(p.amount_paid || 0), 0), 0);
              const balance = totalBilled - totalPaidAll;
              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Billed</p>
                    <p className="text-xl font-extrabold text-white">₹{totalBilled.toFixed(2)}</p>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Paid</p>
                    <p className="text-xl font-extrabold text-emerald-400">₹{totalPaidAll.toFixed(2)}</p>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Net Balance</p>
                    <p className={`text-xl font-extrabold ${balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      ₹{Math.abs(balance).toFixed(2)} {balance > 0 ? '(Due)' : '(Clear)'}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Per-bill breakdown */}
            {selectedCustomer.bills.map((b, bi) => {
              const bPaid = (b.payments || []).reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);
              const bBalance = parseFloat(b.total || 0) - bPaid;
              return (
                <div key={b.id} className="mb-6 bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                  {/* Bill header */}
                  <div className="bg-slate-900/90 px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-indigo-400 text-sm bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-800/40">
                        Bill #{b.bill_number}
                      </span>
                      <span className="text-xs text-slate-400">{b.bill_date ? new Date(b.bill_date).toLocaleDateString('en-IN') : b.created_at ? new Date(b.created_at).toLocaleDateString('en-IN') : '—'}</span>
                      <span className="text-xs text-slate-400 font-semibold">• {getTotalCases(b)} cases</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <span className="text-slate-300">Total: <strong className="text-white">₹{parseFloat(b.total || 0).toFixed(2)}</strong></span>
                      <span className="text-emerald-400">Paid: <strong>₹{bPaid.toFixed(2)}</strong></span>
                      <span className={bBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                        Balance: <strong>₹{Math.abs(bBalance).toFixed(2)}</strong> {bBalance > 0 ? '(Due)' : '(Clear)'}
                      </span>
                    </div>
                  </div>

                  {/* Items */}
                  {(b.items || []).length > 0 && (
                    <div className="p-4">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Items Booked</p>
                      <div className="overflow-x-auto rounded-xl border border-slate-800/70">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                              {['Product', 'Cases', 'Qty', 'Rate/Box', 'Amount'].map(h => (
                                <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {b.items.map((item, i) => (
                              <tr key={i} className="hover:bg-slate-900/50">
                                <td className="px-3 py-2 text-slate-200 font-medium">{item.productname}</td>
                                <td className="px-3 py-2 text-center text-slate-300">{item.cases}</td>
                                <td className="px-3 py-2 text-center text-slate-300">{item.quantity}</td>
                                <td className="px-3 py-2 text-slate-300">₹{parseFloat(item.rate_per_box || 0).toFixed(2)}</td>
                                <td className="px-3 py-2 font-bold text-indigo-400">₹{parseFloat(item.amount || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Dispatches */}
                  {(b.dispatch_logs || []).length > 0 && (
                    <div className="px-4 pb-3">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Dispatches</p>
                      <div className="flex flex-wrap gap-2">
                        {b.dispatch_logs.map((d, i) => {
                          const amt = (parseFloat(d.price_per_box) || 0) * (parseFloat(d.dispatched_qty) || 0) * (1 - (parseFloat(d.discount_percent) || 0) / 100);
                          return (
                            <div key={i} className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                              <span className="font-semibold text-indigo-400">{d.product_name}</span>
                              <span className="text-slate-400">{d.dispatched_cases}c/{d.dispatched_qty}pcs</span>
                              <span className="text-emerald-400 font-bold">₹{amt.toFixed(2)}</span>
                              <span className="text-slate-500">{d.dispatched_at ? new Date(d.dispatched_at).toLocaleDateString('en-IN') : ''}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Payments */}
                  {(b.payments || []).length > 0 && (
                    <div className="px-4 pb-4">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Payments</p>
                      <div className="flex flex-wrap gap-2">
                        {b.payments.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                            <span className="text-slate-400">{p.transaction_date ? new Date(p.transaction_date).toLocaleDateString('en-IN') : '—'}</span>
                            <span className="text-slate-300 font-medium">{p.payment_method}{p.bank_name ? ` – ${p.bank_name}` : ''}</span>
                            <span className="font-bold text-emerald-400">₹{parseFloat(p.amount_paid).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Dealer Abstract Section (Products Purchased) */}
            {(() => {
              const abstract = computeDealerAbstract(selectedCustomer.bills);
              return (
                <div className="mt-8 bg-slate-950/90 text-white rounded-2xl p-5 border border-indigo-900/60 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
                    <h3 className="font-bold text-base flex items-center gap-2 text-indigo-400">
                      <FaShoppingCart /> Dealer Abstract — Products Purchased Statement
                    </h3>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="bg-indigo-950 px-3 py-1 rounded-lg text-indigo-300 border border-indigo-800/40">Total Cases: <strong>{abstract.grandTotalCases}</strong></span>
                      <span className="bg-emerald-950 px-3 py-1 rounded-lg text-emerald-300 border border-emerald-800/40">Total Pcs: <strong>{abstract.grandTotalQty}</strong></span>
                      <span className="bg-amber-950 px-3 py-1 rounded-lg text-amber-300 font-bold border border-amber-800/40">Value: ₹{abstract.grandTotalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                    {abstract.categories.length === 0 ? (
                      <p className="text-center text-slate-400 text-xs py-4">No product item records found.</p>
                    ) : (
                      abstract.categories.map((cat, ci) => (
                        <div key={ci} className="bg-slate-900 rounded-xl p-3.5 border border-slate-800">
                          <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-800 text-xs">
                            <span className="font-extrabold text-indigo-400 uppercase tracking-wider">{cat.categoryName}</span>
                            <span className="text-slate-400 font-medium">Subtotal: <strong>{cat.totalCases} cases</strong> ({cat.totalQty} pcs)</span>
                          </div>
                          {cat.brands.map((br, bi) => (
                            <div key={bi} className="mb-3 last:mb-0">
                              <p className="text-[11px] font-bold text-amber-400 mb-1.5">Brand: {br.brandName}</p>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-slate-500 border-b border-slate-800">
                                    <th className="text-left py-1">Product</th>
                                    <th className="text-center py-1">Pcs/Case</th>
                                    <th className="text-right py-1">Cases Bought</th>
                                    <th className="text-right py-1">Total Pcs</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                  {br.products.map((p, pi) => (
                                    <tr key={pi} className="hover:bg-slate-800/50">
                                      <td className="py-1.5 text-slate-200 font-medium">{p.productName}</td>
                                      <td className="py-1.5 text-center text-slate-400">{p.perCase}</td>
                                      <td className="py-1.5 text-right font-bold text-indigo-400">{p.cases}</td>
                                      <td className="py-1.5 text-right font-semibold text-emerald-400">{p.totalQty}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
}