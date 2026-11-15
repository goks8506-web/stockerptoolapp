import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../Logout';
import { API_BASE_URL } from '../../../Config';
import Select from 'react-select';
import {
  FaUserTag, FaSearch, FaSpinner, FaDownload, FaPrint,
  FaBoxes, FaLayerGroup, FaTags, FaCalculator, FaCheckCircle
} from 'react-icons/fa';
import * as XLSX from 'xlsx';

export default function DealerAbstract() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [abstractData, setAbstractData] = useState(null);
  const [error, setError] = useState('');

  // Fetch unique customer list & check URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramCustomer = params.get('customer');

    fetch(`${API_BASE_URL}/api/reports/customers`)
      .then(r => r.json())
      .then(data => {
        const options = (data || []).map(c => ({
          value: c.customer_name,
          label: c.customer_name + (c.address ? ` (${c.address})` : ''),
          raw: c
        }));
        setCustomers(options);

        if (paramCustomer) {
          const match = options.find(o => o.value.toLowerCase() === paramCustomer.toLowerCase()) || { value: paramCustomer, label: paramCustomer };
          setSelectedCustomer(match);
          handleFetchAbstract(match);
        }
      })
      .catch(console.error);
  }, []);

  const handleFetchAbstract = (custOpt = selectedCustomer) => {
    if (!custOpt) {
      setError('Please select a customer / dealer');
      return;
    }
    setError('');
    setLoading(true);

    let url = `${API_BASE_URL}/api/reports/dealer-abstract?customer=${encodeURIComponent(custOpt.value)}`;
    if (startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setAbstractData(data);
      })
      .catch(err => setError(err.message || 'Failed to fetch abstract'))
      .finally(() => setLoading(false));
  };

  const handleCustomerChange = (opt) => {
    setSelectedCustomer(opt);
    if (opt) {
      handleFetchAbstract(opt);
    } else {
      setAbstractData(null);
    }
  };

  const exportExcel = () => {
    if (!abstractData || !abstractData.categories.length) return;

    const rows = [];
    abstractData.categories.forEach(cat => {
      rows.push({
        'Category / Product Type': `=== ${cat.categoryName} ===`,
        'Brand': '',
        'Product Name': '',
        'Per Case': '',
        'Cases Bought': `Cat Total Cases: ${cat.categoryTotalCases}`,
        'Total Quantity': `Cat Total Qty: ${cat.categoryTotalQty}`,
        'Total Value (₹)': cat.categoryTotalAmount.toFixed(2)
      });

      cat.brands.forEach(b => {
        b.products.forEach(p => {
          rows.push({
            'Category / Product Type': cat.categoryName,
            'Brand': b.brandName,
            'Product Name': p.productName,
            'Per Case': p.perCase,
            'Cases Bought': p.cases,
            'Total Quantity': p.totalQty,
            'Total Value (₹)': p.totalAmount.toFixed(2)
          });
        });

        // Brand Subtotal row
        rows.push({
          'Category / Product Type': '',
          'Brand': `Subtotal (${b.brandName})`,
          'Product Name': '',
          'Per Case': '',
          'Cases Bought': b.brandTotalCases,
          'Total Quantity': b.brandTotalQty,
          'Total Value (₹)': b.brandTotalAmount.toFixed(2)
        });
      });
    });

    // Grand Total Row
    rows.push({
      'Category / Product Type': '*** GRAND TOTAL ALTOGETHER ***',
      'Brand': '',
      'Product Name': '',
      'Per Case': '',
      'Cases Bought': abstractData.grandTotalCases,
      'Total Quantity': abstractData.grandTotalQty,
      'Total Value (₹)': abstractData.grandTotalAmount.toFixed(2)
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dealer Abstract');
    XLSX.writeFile(wb, `Dealer_Abstract_${abstractData.customer_name.replace(/\s+/g, '_')}.xlsx`);
  };

  const selectStyles = {
    control: (b, s) => ({
      ...b,
      minHeight: '40px',
      fontSize: '13px',
      borderRadius: '8px',
      backgroundColor: '#1f2937',
      borderColor: s.isFocused ? '#6366f1' : '#374151',
      color: '#ffffff',
      boxShadow: 'none',
    }),
    menu: (b) => ({ ...b, zIndex: 9999, backgroundColor: '#1f2937', borderColor: '#374151' }),
    option: (b, s) => ({
      ...b,
      fontSize: '13px',
      backgroundColor: s.isFocused ? '#374151' : '#1f2937',
      color: '#ffffff',
      cursor: 'pointer',
    }),
    singleValue: (b) => ({ ...b, color: '#ffffff' }),
    input: (b) => ({ ...b, color: '#ffffff' }),
    placeholder: (b) => ({ ...b, color: '#9ca3af' }),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 hundred:ml-64 p-4 md:p-6 print:ml-0 print:p-0 print:bg-white text-black dark:text-white">
      <Sidebar />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-600/10 text-indigo-500 border border-indigo-500/20">
              <FaUserTag />
            </span>
            Dealer Abstract Statement
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Statement of product categories, brands, cases & pcs bought by customer</p>
        </div>
        <div className="flex items-center gap-3">
          {abstractData && (
            <>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg transition">
                <FaPrint /> Print / Save PDF
              </button>
              <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg transition">
                <FaDownload /> Export Excel
              </button>
            </>
          )}
          <Logout />
        </div>
      </div>

      {/* Customer Selection & Date Filter Bar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 mb-6 border border-gray-200 dark:border-gray-800 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Select Customer / Dealer *</label>
            <Select
              options={customers}
              value={selectedCustomer}
              onChange={handleCustomerChange}
              placeholder="Search customer name or address..."
              isClearable
              styles={selectStyles}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-xl text-sm dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-xl text-sm dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => handleFetchAbstract()}
            disabled={loading || !selectedCustomer}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-xl transition transform hover:scale-105"
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaCalculator />}
            Generate Abstract Statement
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

      {/* ABSTRACT STATEMENT VIEW */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <FaSpinner className="animate-spin text-2xl text-indigo-600 inline mr-2" />
          Calculating product type breakdown...
        </div>
      ) : abstractData ? (
        <div className="space-y-6">
          {/* Statement Header Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-indigo-100 dark:border-indigo-950 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Dealer Purchase Abstract</span>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{abstractData.customer_name}</h2>
                <p className="text-xs text-gray-500 mt-1">Total Bills Processed: <strong>{abstractData.total_bills}</strong></p>
              </div>
              <div className="flex gap-4">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800 text-center min-w-[110px]">
                  <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">Total Cases</p>
                  <p className="text-xl font-black text-indigo-900 dark:text-indigo-200">{abstractData.grandTotalCases}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800 text-center min-w-[110px]">
                  <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Total Quantity</p>
                  <p className="text-xl font-black text-emerald-900 dark:text-emerald-200">{abstractData.grandTotalQty}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/30 p-3 rounded-xl border border-amber-100 dark:border-amber-800 text-center min-w-[130px]">
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Grand Total Value</p>
                  <p className="text-xl font-black text-amber-900 dark:text-amber-200">₹{abstractData.grandTotalAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="mt-6 space-y-6">
              {abstractData.categories.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No purchase item records found for this customer.</p>
              ) : (
                abstractData.categories.map((cat, ci) => (
                  <div key={ci} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                    {/* Category Header */}
                    <div className="bg-slate-800 text-white px-5 py-3 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <FaLayerGroup className="text-indigo-400" />
                        <h3 className="font-bold text-base tracking-wide">{cat.categoryName}</h3>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span className="bg-slate-700 px-3 py-1 rounded-full">Cases: <strong>{cat.categoryTotalCases}</strong></span>
                        <span className="bg-slate-700 px-3 py-1 rounded-full">Qty: <strong>{cat.categoryTotalQty}</strong></span>
                        <span className="bg-emerald-600 px-3 py-1 rounded-full font-bold">₹{cat.categoryTotalAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Brands within Category */}
                    <div className="p-4 space-y-4 bg-gray-50 dark:bg-gray-900/90">
                      {cat.brands.map((br, bi) => (
                        <div key={bi} className="bg-white dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200 dark:border-gray-700/80">
                          <div className="flex justify-between items-center mb-2 pb-1 border-b border-gray-200 dark:border-gray-600">
                            <span className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                              <FaTags className="text-amber-500" /> Brand: {br.brandName}
                            </span>
                            <span className="text-xs text-gray-500 font-medium">
                              Subtotal: <strong>{br.brandTotalCases} cases</strong> ({br.brandTotalQty} pcs) · ₹{br.brandTotalAmount.toFixed(2)}
                            </span>
                          </div>

                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-1 px-2 font-semibold">#</th>
                                <th className="text-left py-1 px-2 font-semibold">Product Name</th>
                                <th className="text-center py-1 px-2 font-semibold">Pcs/Case</th>
                                <th className="text-right py-1 px-2 font-semibold">Cases Bought</th>
                                <th className="text-right py-1 px-2 font-semibold">Total Pcs</th>
                                <th className="text-right py-1 px-2 font-semibold">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                              {br.products.map((p, pi) => (
                                <tr key={pi} className="hover:bg-gray-100 dark:hover:bg-gray-700/60">
                                  <td className="py-1.5 px-2 text-gray-400">{pi + 1}</td>
                                  <td className="py-1.5 px-2 font-medium text-gray-900 dark:text-white">{p.productName}</td>
                                  <td className="py-1.5 px-2 text-center text-gray-500">{p.perCase}</td>
                                  <td className="py-1.5 px-2 text-right font-bold text-indigo-600 dark:text-indigo-400">{p.cases}</td>
                                  <td className="py-1.5 px-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">{p.totalQty}</td>
                                  <td className="py-1.5 px-2 text-right font-bold text-gray-800 dark:text-gray-200">₹{p.totalAmount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Altogether Summary Card */}
            <div className="mt-8 p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
                  <FaCheckCircle className="text-emerald-400" /> Altogether Dealer Purchase Summary
                </h3>
                <p className="text-xs text-slate-300 mt-1">Aggregated calculation across all product categories and brands for {abstractData.customer_name}</p>
              </div>
              <div className="flex gap-6 text-right">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Total Cases</p>
                  <p className="text-2xl font-black text-indigo-300">{abstractData.grandTotalCases}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Total Quantity</p>
                  <p className="text-2xl font-black text-emerald-300">{abstractData.grandTotalQty}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Net Total Value</p>
                  <p className="text-2xl font-black text-amber-300">₹{abstractData.grandTotalAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
          <FaBoxes className="text-4xl text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Select a customer above to view the Dealer Abstract category statement.</p>
        </div>
      )}
    </div>
  );
}
