import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../Logout';
import { API_BASE_URL } from '../../../Config';
import * as XLSX from 'xlsx';
import {
  FaDownload,
  FaSpinner,
  FaArrowUp,
  FaShoppingBag,
  FaShoppingCart,
  FaRupeeSign,
  FaExchangeAlt,
  FaTruck,
  FaUsers,
  FaBuilding,
  FaBoxOpen,
  FaSync,
  FaExclamationCircle,
  FaRocket,
  FaHourglassHalf,
  FaPercentage,
  FaTags,
  FaChartPie
} from 'react-icons/fa';

export default function Performance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // OVERVIEW, PRODUCTS, BRANDS, PARTNERS
  const [productFilter, setProductFilter] = useState('ALL'); // ALL, FAST, SLOW, PROFIT
  const [productSearch, setProductSearch] = useState('');

  const fetchPerformanceData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/performance-analysis`);
      if (!res.ok) throw new Error('Failed to load performance metrics');
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Error loading performance analysis:', err);
      setError(err.message || 'Error fetching analysis data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const exportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    // 1. Overall Summary Sheet
    const summaryRows = [
      { Metric: 'Total Sales Revenue (Bookings)', Value: data.summary.salesTotal },
      { Metric: 'Total Sales Orders', Value: data.summary.salesCount },
      { Metric: 'Sales Amount Collected', Value: data.summary.salesCollected },
      { Metric: 'Sales Receivables (Outstanding)', Value: data.summary.salesOutstanding },
      { Metric: 'Total Purchase Expense', Value: data.summary.purchaseTotal },
      { Metric: 'Total Purchase Orders', Value: data.summary.purchaseCount },
      { Metric: 'Purchases Paid', Value: data.summary.purchasePaid },
      { Metric: 'Purchase Payables (Outstanding)', Value: data.summary.purchasePayable },
      { Metric: 'Gross Trade Margin', Value: data.summary.grossMargin },
      { Metric: 'Margin Percentage (%)', Value: `${data.summary.marginPercentage}%` },
      { Metric: 'Net Cash Flow', Value: data.summary.netCashFlow },
      { Metric: 'Sales Dispatched Cases', Value: data.dispatches.salesDispatchedCases },
      { Metric: 'Sales Fulfillment Rate (%)', Value: `${data.dispatches.salesFulfillmentRate}%` },
      { Metric: 'Purchase Received Cases', Value: data.dispatches.purchaseReceivedCases },
      { Metric: 'Purchase Fulfillment Rate (%)', Value: `${data.dispatches.purchaseFulfillmentRate}%` },
    ];
    const summaryWS = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Executive Summary');

    // 2. Product Performance Matrix
    const productRows = (data.topProducts || []).map((p, i) => ({
      '#': i + 1,
      'Product Name': p.productname,
      'Brand': p.brand || '-',
      'Velocity': p.velocity,
      'Sold Cases': p.sold_cases,
      'Sold Amount': p.sold_amount,
      'Avg Sell Rate (₹/pc)': p.avg_sell_rate,
      'Purchased Cases': p.purchased_cases,
      'Purchased Amount': p.purchased_amount,
      'Avg Buy Rate (₹/pc)': p.avg_buy_rate,
      'Sell-Through Rate (%)': `${p.sell_through_percent}%`,
      'Net Product Margin': p.net_margin,
    }));
    const productWS = XLSX.utils.json_to_sheet(productRows);
    XLSX.utils.book_append_sheet(wb, productWS, 'Product Performance Matrix');

    // 3. Brand Performance Sheet
    const brandRows = (data.brandPerformance || []).map((b, i) => ({
      '#': i + 1,
      'Brand Name': b.brand,
      'Sales Revenue': b.sales,
      'Sold Cases': b.sold_cases,
      'Purchase Spend': b.purchases,
      'Purchased Cases': b.purchased_cases,
      'Net Margin': b.net_margin,
    }));
    const brandWS = XLSX.utils.json_to_sheet(brandRows);
    XLSX.utils.book_append_sheet(wb, brandWS, 'Brand Performance');

    // 4. Top Customers Sheet
    const customerRows = (data.topCustomers || []).map((c, i) => ({
      '#': i + 1,
      'Customer Name': c.customer_name,
      'Orders': c.order_count,
      'Total Revenue': parseFloat(c.total_spent || 0),
      'Amount Paid': parseFloat(c.amount_paid || 0),
      'Outstanding Balance': parseFloat(c.balance_due || 0),
    }));
    const customerWS = XLSX.utils.json_to_sheet(customerRows);
    XLSX.utils.book_append_sheet(wb, customerWS, 'Top Customers');

    // 5. Top Suppliers Sheet
    const supplierRows = (data.topSuppliers || []).map((s, i) => ({
      '#': i + 1,
      'Supplier Name': s.supplier_name,
      'POs': s.po_count,
      'Total Purchased': parseFloat(s.total_purchased || 0),
      'Amount Paid': parseFloat(s.amount_paid || 0),
      'Payable Balance': parseFloat(s.balance_payable || 0),
    }));
    const supplierWS = XLSX.utils.json_to_sheet(supplierRows);
    XLSX.utils.book_append_sheet(wb, supplierWS, 'Top Suppliers');

    XLSX.writeFile(wb, `Detailed_Performance_Analytics_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 hundred:ml-64">
        <Sidebar />
        <Logout />
        <div className="flex-1 flex items-center justify-center py-32">
          <div className="text-center">
            <FaSpinner className="animate-spin text-4xl text-blue-600 dark:text-blue-400 mb-3 mx-auto" />
            <p className="text-gray-600 dark:text-gray-300 font-medium">Computing Business Performance &amp; Product Velocity...</p>
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
        <div className="flex-1 p-6">
          <div className="max-w-md mx-auto mt-20 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
            <FaExclamationCircle className="text-3xl text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-red-800 dark:text-red-300 mb-1">Failed to Load Performance Analysis</h3>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchPerformanceData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { summary, dispatches, topCustomers, topSuppliers, monthlyTrends, topProducts, fastMovers, slowMovers, brandPerformance, stockHealth } = data;

  const maxMonthlyVal = Math.max(
    1,
    ...(monthlyTrends || []).flatMap(m => [m.sales, m.purchases])
  );

  // Product filtering logic
  const filteredProducts = (topProducts || []).filter(p => {
    const matchesSearch = [p.productname, p.brand].some(s => s?.toLowerCase().includes(productSearch.toLowerCase()));
    if (!matchesSearch) return false;
    if (productFilter === 'FAST') return p.velocity === 'FAST MOVER';
    if (productFilter === 'SLOW') return p.velocity === 'SLOW MOVER';
    if (productFilter === 'PROFIT') return p.net_margin > 0;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 hundred:ml-64 transition-colors">
      <Sidebar />
      <div className="p-4 md:p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-md">
                <FaExchangeAlt />
              </span>
              Overall Business Performance &amp; Analytics
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Detailed intelligence on Sales, Purchases, Cash Flow, Product Velocity &amp; Brand Profitability
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => window.location.href = '/product-tally'}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-semibold rounded-lg shadow hover:from-green-700 hover:to-emerald-700 transition-all"
            >
              <FaBoxOpen /> Master Product Tally
            </button>
            <button
              onClick={fetchPerformanceData}
              className="flex items-center gap-2 px-3.5 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Refresh Data"
            >
              <FaSync className="text-xs" /> Refresh
            </button>
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-sm font-semibold shadow transition-all"
            >
              <FaDownload /> Export Analytics
            </button>
            <Logout />
          </div>
        </div>

        {/* ── Navigation Tabs ── */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 gap-2 overflow-x-auto">
          {[
            { key: 'OVERVIEW', label: 'Executive Overview', icon: <FaChartPie /> },
            { key: 'PRODUCTS', label: `Product Velocity Matrix (${topProducts?.length || 0})`, icon: <FaBoxOpen /> },
            { key: 'BRANDS', label: `Brand Performance (${brandPerformance?.length || 0})`, icon: <FaTags /> },
            { key: 'PARTNERS', label: 'Customers & Suppliers', icon: <FaUsers /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB 1: EXECUTIVE OVERVIEW ── */}
        {activeTab === 'OVERVIEW' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/60 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10 text-blue-600"><FaShoppingBag size={48} /></div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Total Sales</p>
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mt-1">{formatCurrency(summary.salesTotal)}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">{summary.salesCount} Bookings</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/60 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10 text-purple-600"><FaShoppingCart size={48} /></div>
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">Total Purchases</p>
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mt-1">{formatCurrency(summary.purchaseTotal)}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">{summary.purchaseCount} POs</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/60 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10 text-green-600"><FaArrowUp size={48} /></div>
                <p className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">Gross Margin</p>
                <h3 className={`text-xl font-extrabold mt-1 ${summary.grossMargin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600'}`}>
                  {formatCurrency(summary.grossMargin)}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">Margin: <span className="font-bold text-gray-700 dark:text-gray-300">{summary.marginPercentage}%</span></p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/60 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10 text-teal-600"><FaRupeeSign size={48} /></div>
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">Net Cash Flow</p>
                <h3 className={`text-xl font-extrabold mt-1 ${summary.netCashFlow >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600'}`}>
                  {formatCurrency(summary.netCashFlow)}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">In: {formatCurrency(summary.salesCollected)}</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/60 relative overflow-hidden">
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">Customer Dues</p>
                <h3 className="text-xl font-extrabold text-orange-600 dark:text-orange-400 mt-1">{formatCurrency(summary.salesOutstanding)}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">Due from customers</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/60 relative overflow-hidden">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Supplier Dues</p>
                <h3 className="text-xl font-extrabold text-red-600 dark:text-red-400 mt-1">{formatCurrency(summary.purchasePayable)}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">Owed to suppliers</p>
              </div>
            </div>

            {/* Comparison Cards & Fulfillment Meters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/60">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FaShoppingBag className="text-blue-500" /> Sales vs Purchase Financial Comparison
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1 font-medium">
                      <span className="text-gray-600 dark:text-gray-400">Sales Revenue</span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold">{formatCurrency(summary.salesTotal)}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: summary.salesTotal > 0 ? '100%' : '0%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1 font-medium">
                      <span className="text-gray-600 dark:text-gray-400">Purchase Expense</span>
                      <span className="text-purple-600 dark:text-purple-400 font-bold">{formatCurrency(summary.purchaseTotal)}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-purple-600 h-full rounded-full"
                        style={{ width: summary.salesTotal > 0 ? `${Math.min(100, (summary.purchaseTotal / summary.salesTotal) * 100)}%` : '0%' }}
                      ></div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Collected from Sales</p>
                      <p className="text-base font-bold text-blue-700 dark:text-blue-300">{formatCurrency(summary.salesCollected)}</p>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Paid to Suppliers</p>
                      <p className="text-base font-bold text-purple-700 dark:text-purple-300">{formatCurrency(summary.purchasePaid)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fulfillment Rates */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/60">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FaTruck className="text-green-500" /> Dispatch &amp; Fulfillment Efficiency
                </h3>

                <div className="space-y-4 mb-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-semibold">
                      <span className="text-gray-700 dark:text-gray-300">Sales Order Fulfillment Rate (Dispatched / Booked)</span>
                      <span className="text-green-600 font-bold">{dispatches.salesFulfillmentRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div className="bg-green-600 h-full rounded-full transition-all duration-500" style={{ width: `${dispatches.salesFulfillmentRate}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1 font-semibold">
                      <span className="text-gray-700 dark:text-gray-300">Purchase Inward Fulfillment Rate (Received / Purchased)</span>
                      <span className="text-teal-600 font-bold">{dispatches.purchaseFulfillmentRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div className="bg-teal-600 h-full rounded-full transition-all duration-500" style={{ width: `${dispatches.purchaseFulfillmentRate}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100">
                    <p className="text-xs text-green-700 dark:text-green-300 font-semibold">Sales Dispatched</p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-300">{dispatches.salesDispatchedCases} cases</p>
                  </div>
                  <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100">
                    <p className="text-xs text-teal-700 dark:text-teal-300 font-semibold">Purchases Received</p>
                    <p className="text-lg font-bold text-teal-700 dark:text-teal-300">{dispatches.purchaseReceivedCases} cases</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Trend Bars */}
            {monthlyTrends.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/60 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Monthly Sales vs Purchase Trends</h3>
                  <div className="flex items-center gap-4 text-xs font-medium">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span> Sales</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-600 inline-block"></span> Purchase</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {monthlyTrends.map((m) => {
                    const salesPct = (m.sales / maxMonthlyVal) * 100;
                    const purPct = (m.purchases / maxMonthlyVal) * 100;
                    return (
                      <div key={m.month_key} className="p-3.5 bg-gray-100 dark:bg-gray-900/90 rounded-xl border border-gray-200 dark:border-gray-700/80">
                        <div className="flex justify-between items-center text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          <span>{m.month_label}</span>
                          <div className="flex gap-4">
                            <span className="text-blue-600 dark:text-blue-400 font-bold">Sales: {formatCurrency(m.sales)}</span>
                            <span className="text-purple-600 dark:text-purple-400 font-bold">Purchase: {formatCurrency(m.purchases)}</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1 overflow-hidden">
                          <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${salesPct}%` }}></div>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div className="bg-purple-600 h-full rounded-full transition-all duration-500" style={{ width: `${purPct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── TAB 2: PRODUCT VELOCITY MATRIX ── */}
        {activeTab === 'PRODUCTS' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/60 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FaBoxOpen className="text-indigo-600" /> Detailed Product Performance &amp; Velocity Matrix
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Analyze Sell-Through Rates, Fast/Slow Moving inventory &amp; Profit Yield</p>
              </div>

              {/* Filter Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { key: 'ALL', label: 'All Products', icon: null },
                  { key: 'FAST', label: `🚀 Fast Movers (${fastMovers?.length || 0})`, icon: <FaRocket /> },
                  { key: 'SLOW', label: `🐢 Slow / Stagnant (${slowMovers?.length || 0})`, icon: <FaHourglassHalf /> },
                  { key: 'PROFIT', label: '💰 Profit Winners', icon: null },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setProductFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      productFilter === f.key
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="mb-4 max-w-sm">
              <input
                type="text"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                placeholder="Search by product name or brand..."
                className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-black dark:text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                    <th className="p-3">#</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Brand</th>
                    <th className="p-3 text-center">Velocity Tag</th>
                    <th className="p-3 text-center">Sell-Through Rate (%)</th>
                    <th className="p-3 text-center">Sold Cases / Amt</th>
                    <th className="p-3 text-center">Purchased Cases / Cost</th>
                    <th className="p-3 text-center">Buy / Sell Rates (₹/box)</th>
                    <th className="p-3 text-right">Net Profit / Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {filteredProducts.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors">
                      <td className="p-3 font-medium text-gray-500">{i + 1}</td>
                      <td className="p-3 font-bold text-gray-900 dark:text-white">{p.productname}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">{p.brand || '—'}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 ${
                          p.velocity === 'FAST MOVER'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                            : p.velocity === 'SLOW MOVER'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {p.velocity === 'FAST MOVER' && <FaRocket className="text-green-600" />}
                          {p.velocity === 'SLOW MOVER' && <FaHourglassHalf className="text-amber-600" />}
                          {p.velocity}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="font-bold text-indigo-600 dark:text-indigo-400">{p.sell_through_percent}%</div>
                        <div className="w-16 mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${p.sell_through_percent}%` }}></div>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-semibold text-blue-600">{p.sold_cases} cs</span>
                        <div className="font-bold text-blue-600">{formatCurrency(p.sold_amount)}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-semibold text-purple-600">{p.purchased_cases} cs</span>
                        <div className="font-bold text-purple-600">{formatCurrency(p.purchased_amount)}</div>
                      </td>
                      <td className="p-3 text-center text-[11px]">
                        <div>Buy: <strong>₹{p.avg_buy_rate}</strong></div>
                        <div>Sell: <strong>₹{p.avg_sell_rate}</strong></div>
                      </td>
                      <td className={`p-3 text-right font-extrabold text-sm ${p.net_margin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                        {formatCurrency(p.net_margin)}
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-400">No products matching the selected filter criteria</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 3: BRAND PERFORMANCE ── */}
        {activeTab === 'BRANDS' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/60 mb-6">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FaTags className="text-purple-600" /> Brand-wise Sales, Purchase &amp; Profit Yield
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                    <th className="p-3">#</th>
                    <th className="p-3">Brand Name</th>
                    <th className="p-3 text-center">Sold Cases</th>
                    <th className="p-3 text-right">Sales Revenue</th>
                    <th className="p-3 text-center">Purchased Cases</th>
                    <th className="p-3 text-right">Purchase Spend</th>
                    <th className="p-3 text-right">Net Brand Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {(brandPerformance || []).map((b, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors">
                      <td className="p-3 font-medium text-gray-500">{i + 1}</td>
                      <td className="p-3 font-bold text-gray-900 dark:text-white">{b.brand}</td>
                      <td className="p-3 text-center font-semibold text-blue-600">{b.sold_cases}</td>
                      <td className="p-3 text-right font-bold text-blue-600">{formatCurrency(b.sales)}</td>
                      <td className="p-3 text-center font-semibold text-purple-600">{b.purchased_cases}</td>
                      <td className="p-3 text-right font-bold text-purple-600">{formatCurrency(b.purchases)}</td>
                      <td className={`p-3 text-right font-extrabold ${b.net_margin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatCurrency(b.net_margin)}
                      </td>
                    </tr>
                  ))}
                  {(!brandPerformance || brandPerformance.length === 0) && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">No brand entries recorded yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 4: CUSTOMERS & SUPPLIERS ── */}
        {activeTab === 'PARTNERS' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top Customers */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/60 overflow-hidden">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FaUsers className="text-blue-600" /> Top Customers (Sales Revenue)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Customer Name</th>
                      <th className="p-2.5 text-center">Orders</th>
                      <th className="p-2.5 text-right">Revenue</th>
                      <th className="p-2.5 text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {(topCustomers || []).map((c, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors">
                        <td className="p-2.5 font-medium text-gray-500">{i + 1}</td>
                        <td className="p-2.5 font-semibold text-gray-800 dark:text-gray-200">{c.customer_name}</td>
                        <td className="p-2.5 text-center font-medium text-gray-600 dark:text-gray-400">{c.order_count}</td>
                        <td className="p-2.5 text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(c.total_spent)}</td>
                        <td className={`p-2.5 text-right font-semibold ${parseFloat(c.balance_due) > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                          {formatCurrency(c.balance_due)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Suppliers */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/60 overflow-hidden">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FaBuilding className="text-purple-600" /> Top Suppliers (Purchase Spend)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Supplier Name</th>
                      <th className="p-2.5 text-center">POs</th>
                      <th className="p-2.5 text-right">Purchased</th>
                      <th className="p-2.5 text-right">Payable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {(topSuppliers || []).map((s, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors">
                        <td className="p-2.5 font-medium text-gray-500">{i + 1}</td>
                        <td className="p-2.5 font-semibold text-gray-800 dark:text-gray-200">{s.supplier_name}</td>
                        <td className="p-2.5 text-center font-medium text-gray-600 dark:text-gray-400">{s.po_count}</td>
                        <td className="p-2.5 text-right font-bold text-purple-600 dark:text-purple-400">{formatCurrency(s.total_purchased)}</td>
                        <td className={`p-2.5 text-right font-semibold ${parseFloat(s.balance_payable) > 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {formatCurrency(s.balance_payable)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
