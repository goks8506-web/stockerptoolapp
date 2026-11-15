import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../Logout';
import { API_BASE_URL } from '../../../Config';
import * as XLSX from 'xlsx';
import {
  FaDownload, FaFilePdf, FaSpinner, FaSearch, FaCheckCircle,
  FaExclamationTriangle, FaBoxes, FaRupeeSign, FaSync, FaChartLine
} from 'react-icons/fa';

export default function ProductTallyLedger() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTallyData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/product-tally-ledger`);
      if (!res.ok) throw new Error('Failed to fetch product tally ledger');
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message || 'Error loading product tally ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTallyData();
  }, []);

  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // ─── Print Big Master Tally Ledger PDF Report ─────────────────────────────────
  const printTallyPDF = () => {
    if (!data || !data.tally) return;

    const filteredList = data.tally.filter(p =>
      [p.productname, p.brand, p.godown_locations].some(s =>
        s?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    const printDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Master Product Tally Ledger & Audit Report</title>
<style>
  body { font-family: Arial, sans-serif; margin: 20px; font-size: 9pt; }
  h1 { text-align: center; font-size: 16pt; margin-bottom: 2px; color: #166534; }
  .sub { text-align: center; font-size: 9pt; color: #555; margin-bottom: 18px; }
  .summary-box { width: 100%; margin-bottom: 18px; border-collapse: collapse; }
  .summary-box td { border: 1px solid #ccc; padding: 8px; text-align: center; background: #f0fdf4; }
  .summary-box .val { font-size: 11pt; font-weight: bold; }
  table.main-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  table.main-table th, table.main-table td { border: 1px solid #000; padding: 5px 6px; text-align: center; font-size: 8.5pt; }
  table.main-table th { background: #15803d; color: white; font-weight: bold; }
  td.left { text-align: left; }
  .dr { color: #dc2626; font-weight: bold; }
  .cr { color: #16a34a; font-weight: bold; }
  .total-row { font-weight: bold; background: #dcfce7; }
  .footer { margin-top: 30px; text-align: center; font-size: 8pt; color: #666; }
  @media print { body { margin: 10px; } }
</style>
</head><body>

<h1>MASTER PRODUCT MOVEMENT &amp; INVENTORY TALLY LEDGER</h1>
<p class="sub">Comprehensive Audit Report &nbsp;|&nbsp; Printed On: ${printDate}</p>

<table class="summary-box">
  <tr>
    <td>Products Audited<br><span class="val" style="color:#166534;">${data.summary.totalProducts}</span></td>
    <td>Total Purchases (DR)<br><span class="val dr">${formatCurrency(data.summary.totalPurchasedAmount)}</span></td>
    <td>Total Sales Billed (CR)<br><span class="val cr">${formatCurrency(data.summary.totalSalesAmount)}</span></td>
    <td>Gross Margin / Net Profit<br><span class="val ${data.summary.totalNetProfit >= 0 ? 'cr' : 'dr'}">${formatCurrency(data.summary.totalNetProfit)}</span></td>
    <td>Stock In Godowns<br><span class="val" style="color:#1e40af;">${data.summary.totalGodownCases} cases</span></td>
  </tr>
</table>

<table class="main-table">
  <thead>
    <tr>
      <th style="width:4%">#</th>
      <th style="width:20%">Product Name</th>
      <th style="width:10%">Brand</th>
      <th style="width:9%">Purchased (Cases)</th>
      <th style="width:12%">Purchased Value (DR)</th>
      <th style="width:9%">Sales Billed (Cases)</th>
      <th style="width:12%">Sales Revenue (CR)</th>
      <th style="width:8%">Stock in Godown</th>
      <th style="width:10%">Net Product Margin</th>
      <th style="width:6%">Tally Status</th>
    </tr>
  </thead>
  <tbody>
    ${filteredList.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td class="left"><strong>${p.productname}</strong></td>
      <td>${p.brand || '—'}</td>
      <td>${p.purchased_cases}</td>
      <td class="dr">${formatCurrency(p.purchased_amount)}</td>
      <td>${p.sales_cases}</td>
      <td class="cr">${formatCurrency(p.sales_amount)}</td>
      <td style="font-weight:bold;color:#1e40af;">${p.current_stock_cases} cases</td>
      <td className="${p.net_margin >= 0 ? 'cr' : 'dr'}">${formatCurrency(p.net_margin)}</td>
      <td style="font-size:7.5pt;font-weight:bold;color:${p.stock_diff === 0 ? '#16a34a' : '#d97706'}">${p.status}</td>
    </tr>`).join('')}

    <tr class="total-row">
      <td colspan="3" style="text-align:right;">AUDIT TOTALS</td>
      <td>${data.summary.totalPurchasedCases}</td>
      <td class="dr">${formatCurrency(data.summary.totalPurchasedAmount)}</td>
      <td>${data.summary.totalSalesCases}</td>
      <td class="cr">${formatCurrency(data.summary.totalSalesAmount)}</td>
      <td style="color:#1e40af;">${data.summary.totalGodownCases}</td>
      <td class="${data.summary.totalNetProfit >= 0 ? 'cr' : 'dr'}">${formatCurrency(data.summary.totalNetProfit)}</td>
      <td>AUDITED</td>
    </tr>
  </tbody>
</table>

<p class="footer">
  This is an official computer-generated Product Inventory &amp; Trade Tally Audit Ledger • Subject to Sivakasi Jurisdiction
</p>

</body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.print();
  };

  // ─── Export Excel Sheet ──────────────────────────────────────────────────────
  const exportExcel = () => {
    if (!data || !data.tally) return;
    const wb = XLSX.utils.book_new();

    const rows = data.tally.map((p, i) => ({
      '#': i + 1,
      'Product Name': p.productname,
      'Brand': p.brand || 'General',
      'Purchased Cases': p.purchased_cases,
      'Purchased Quantity': p.purchased_qty,
      'Purchased Cost (DR)': p.purchased_amount,
      'Received into Godown (Cases)': p.purchase_received_cases,
      'Sales Billed Cases': p.sales_cases,
      'Sales Billed Quantity': p.sales_qty,
      'Sales Revenue (CR)': p.sales_amount,
      'Sales Dispatched (Cases)': p.sales_dispatched_cases,
      'Current Stock in Godown (Cases)': p.current_stock_cases,
      'Godown Locations': p.godown_locations,
      'Net Profit / Margin': p.net_margin,
      'Tally Audit Status': p.status,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Product Tally Ledger');
    XLSX.writeFile(wb, `Master_Product_Tally_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 hundred:ml-64">
        <Sidebar />
        <Logout />
        <div className="flex-1 flex items-center justify-center py-32">
          <div className="text-center">
            <FaSpinner className="animate-spin text-4xl text-green-600 dark:text-green-400 mb-3 mx-auto" />
            <p className="text-gray-600 dark:text-gray-300 font-medium">Generating Master Product Tally Ledger...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 hundred:ml-64">
        <Sidebar />
        <Logout />
        <div className="flex-1 p-6 text-center py-20">
          <div className="max-w-md mx-auto bg-red-50 dark:bg-red-900/30 p-6 rounded-xl border border-red-200">
            <p className="text-red-700 font-semibold mb-3">{error}</p>
            <button onClick={fetchTallyData} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  const { summary, tally } = data;

  const filteredList = (tally || []).filter(p =>
    [p.productname, p.brand, p.godown_locations].some(s =>
      s?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 hundred:ml-64 transition-colors">
      <Sidebar />
      <div className="p-4 md:p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="p-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl shadow-md">
                <FaBoxes />
              </span>
              Master Product Tally Ledger
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Complete inventory &amp; product trade accounting tally: Purchases (DR), Sales Billed (CR), Dispatches &amp; Godown Stock
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={fetchTallyData}
              className="flex items-center gap-2 px-3.5 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <FaSync className="text-xs" /> Refresh
            </button>
            <button
              onClick={printTallyPDF}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold shadow transition-all"
            >
              <FaFilePdf /> Print Tally PDF
            </button>
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow transition-all"
            >
              <FaDownload /> Export Excel
            </button>
            <Logout />
          </div>
        </div>

        {/* ── KPI Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/60">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Products Audited</p>
            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">{summary.totalProducts}</h3>
            <p className="text-xs text-gray-400 mt-1">Tracked across inventory</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/60">
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Total Purchases (DR)</p>
            <h3 className="text-2xl font-extrabold text-red-600 dark:text-red-400 mt-1">{formatCurrency(summary.totalPurchasedAmount)}</h3>
            <p className="text-xs text-gray-500 mt-1 font-medium">{summary.totalPurchasedCases} total cases</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/60">
            <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">Total Sales Billed (CR)</p>
            <h3 className="text-2xl font-extrabold text-green-600 dark:text-green-400 mt-1">{formatCurrency(summary.totalSalesAmount)}</h3>
            <p className="text-xs text-gray-500 mt-1 font-medium">{summary.totalSalesCases} total cases</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/60">
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Gross Profit / Margin</p>
            <h3 className={`text-2xl font-extrabold mt-1 ${summary.totalNetProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
              {formatCurrency(summary.totalNetProfit)}
            </h3>
            <p className="text-xs text-gray-400 mt-1 font-medium">Sales – Purchase Value</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/60">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Stock In Godowns</p>
            <h3 className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{summary.totalGodownCases} <span className="text-sm font-normal">cases</span></h3>
            <p className="text-xs text-gray-400 mt-1 font-medium">Available for sales</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md mb-6">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search product, brand, godown location..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-black dark:text-white text-sm focus:outline-none focus:border-green-500"
          />
        </div>

        {/* Main Audit Tally Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-green-700 text-white border-b border-gray-200 dark:border-gray-600 font-semibold">
                  <th className="p-3">#</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Brand</th>
                  <th className="p-3 text-center">Purchased (Cases)</th>
                  <th className="p-3 text-right">Purchased Cost (DR)</th>
                  <th className="p-3 text-center">Sales Billed (Cases)</th>
                  <th className="p-3 text-right">Sales Revenue (CR)</th>
                  <th className="p-3 text-center">Godown Stock (Cases)</th>
                  <th className="p-3 text-right">Net Margin</th>
                  <th className="p-3 text-center">Tally Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filteredList.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors">
                    <td className="p-3 font-medium text-gray-500">{i + 1}</td>
                    <td className="p-3 font-bold text-gray-900 dark:text-white">{p.productname}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{p.brand || '—'}</td>
                    <td className="p-3 text-center font-semibold text-red-600">{p.purchased_cases}</td>
                    <td className="p-3 text-right font-bold text-red-600">{formatCurrency(p.purchased_amount)}</td>
                    <td className="p-3 text-center font-semibold text-green-600">{p.sales_cases}</td>
                    <td className="p-3 text-right font-bold text-green-600">{formatCurrency(p.sales_amount)}</td>
                    <td className="p-3 text-center font-bold text-blue-600">{p.current_stock_cases}</td>
                    <td className={`p-3 text-right font-extrabold ${p.net_margin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {formatCurrency(p.net_margin)}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                        p.stock_diff === 0
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}>
                        {p.stock_diff === 0 ? <FaCheckCircle className="text-green-600" /> : <FaExclamationTriangle className="text-amber-600" />}
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredList.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-400">No matching product tally records found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
