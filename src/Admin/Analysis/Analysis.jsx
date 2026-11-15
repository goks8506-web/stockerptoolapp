import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../Logout';
import { API_BASE_URL } from '../../../Config';
import * as XLSX from 'xlsx';
import { 
  FaDownload, FaExclamationTriangle, FaEye, FaSpinner, 
  FaBoxes, FaWarehouse, FaLayerGroup, FaTimes, FaChartPie, FaChartBar
} from 'react-icons/fa';
import Modal from 'react-modal';

Modal.setAppElement('#root');

export default function StockAnalysis() {
  const [data, setData] = useState({
    allRows: [],
    lowStock: [],
    godownSummary: [],
    productSummary: [],
    grandTotal: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lowStockModal, setLowStockModal] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/stock-analysis`)
      .then(r => r.ok ? r.json() : Promise.reject('Failed to fetch stock analysis'))
      .then(setData)
      .catch(e => setError(e.message || e))
      .finally(() => setLoading(false));
  }, []);

  const capitalize = (s) => {
    if (!s || typeof s !== 'string') return '';
    return s
      .split(/[_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const downloadExcel = () => {
    const wb = XLSX.utils.book_new();

    const currentWS = XLSX.utils.json_to_sheet(
      data.allRows.map((r, i) => ({
        '#': i + 1,
        Godown: capitalize(r.godown_name),
        Type: capitalize(r.product_type),
        Product: r.productname,
        Brand: capitalize(r.brand),
        Agent: r.agent_name,
        Cases: r.cases,
        'Per Case': r.per_case,
        'Total Qty': r.total_qty,
      }))
    );
    XLSX.utils.book_append_sheet(wb, currentWS, 'Current Stock');

    const lowWS = XLSX.utils.json_to_sheet(
      data.lowStock.map((r, i) => ({
        '#': i + 1,
        Type: capitalize(r.product_type),
        Product: r.productname,
        Brand: capitalize(r.brand),
        Agent: r.agent_name,
        'Total Cases': r.total_cases,
      }))
    );
    XLSX.utils.book_append_sheet(wb, lowWS, 'Low Stock');

    const godownWS = XLSX.utils.json_to_sheet(
      data.godownSummary.map((r, i) => ({
        '#': i + 1,
        Godown: capitalize(r.godown_name),
        'Total Cases': r.total_cases,
      }))
    );
    XLSX.utils.book_append_sheet(wb, godownWS, 'Godown Totals');

    const productWS = XLSX.utils.json_to_sheet(
      data.productSummary.map((r, i) => ({
        '#': i + 1,
        Type: capitalize(r.product_type),
        Product: r.productname,
        Brand: capitalize(r.brand),
        Agent: r.agent_name,
        'Total Cases': r.total_cases,
        'Total Qty': r.total_qty,
      }))
    );
    XLSX.utils.book_append_sheet(wb, productWS, 'Product Totals');

    XLSX.writeFile(wb, `Stock_Analysis_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 hundred:ml-64 p-4 md:p-8 pt-20 hundred:pt-8 transition-colors duration-200">
      <Sidebar />
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
                <FaChartBar className="text-xl" />
              </span>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                Overall Stock Analysis
              </h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Consolidated inventory metrics, low-stock warnings, and godown distribution.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={downloadExcel}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <FaDownload className="text-xs" /> Export Excel
            </button>
            <Logout />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-between text-sm">
            <span>{error}</span>
            <button onClick={() => setError('')} className="p-1 hover:text-white"><FaTimes /></button>
          </div>
        )}

        {/* Low Stock Warning Banner */}
        {data.lowStock && data.lowStock.length > 0 && (
          <div className="mb-8 p-4 md:p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5">
            <div className="flex items-center gap-3.5">
              <span className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <FaExclamationTriangle className="text-lg" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Low Stock Alert ({data.lowStock.length} items)
                </h3>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  Products currently having fewer than 3 cases across all godowns combined.
                </p>
              </div>
            </div>
            <button
              onClick={() => setLowStockModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/30 flex items-center gap-1.5 transition"
            >
              <FaEye className="text-xs" /> View Items
            </button>
          </div>
        )}

        {/* 3 KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Unique SKUs</p>
              <p className="text-3xl font-black text-white mt-1">
                {data.grandTotal?.unique_products || 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">Registered product lines</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FaLayerGroup className="text-2xl" />
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Cases</p>
              <p className="text-3xl font-black text-emerald-400 mt-1">
                {data.grandTotal?.total_cases || 0} <span className="text-sm font-normal text-slate-400">cs</span>
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">Across all godowns</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FaBoxes className="text-2xl" />
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Quantity</p>
              <p className="text-3xl font-black text-sky-400 mt-1">
                {data.grandTotal?.total_quantity || 0} <span className="text-sm font-normal text-slate-400">pcs</span>
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">Individual units in stock</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <FaChartPie className="text-2xl" />
            </div>
          </div>
        </div>

        {/* Godown Totals Table */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FaWarehouse className="text-amber-400" /> Total Cases per Godown
            </h2>
          </div>

          <div className="bg-slate-900/70 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="px-5 py-3.5 w-16">#</th>
                    <th className="px-5 py-3.5">Godown Name</th>
                    <th className="px-5 py-3.5 text-right">Total Cases</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan="3" className="py-12 text-center text-slate-400">
                        <FaSpinner className="animate-spin inline mr-2 text-indigo-400" /> Loading summary...
                      </td>
                    </tr>
                  ) : data.godownSummary.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="py-10 text-center text-slate-400">No godown records found.</td>
                    </tr>
                  ) : (
                    data.godownSummary.map((g, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4 text-slate-400 text-xs">{idx + 1}</td>
                        <td className="px-5 py-4 font-bold text-white flex items-center gap-2">
                          <FaWarehouse className="text-amber-400 text-xs" />
                          {capitalize(g.godown_name)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="inline-block px-3 py-1 rounded-xl text-xs font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            {g.total_cases} cs
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Low Stock Modal */}
        <Modal
          isOpen={lowStockModal}
          onRequestClose={() => setLowStockModal(false)}
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          overlayClassName="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-40"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-3xl w-full shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                  <FaExclamationTriangle />
                </span>
                <h2 className="text-lg font-bold text-white">Low Stock Items ({data.lowStock?.length || 0})</h2>
              </div>
              <button onClick={() => setLowStockModal(false)} className="text-slate-400 hover:text-white p-1">
                <FaTimes />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Brand</th>
                    <th className="px-4 py-3 text-right">Total Cases</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.lowStock.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-white">{item.productname}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{capitalize(item.product_type)}</td>
                      <td className="px-4 py-3 text-sky-400 text-xs">{capitalize(item.brand)}</td>
                      <td className="px-4 py-3 text-right font-black text-rose-400">{item.total_cases} cs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-slate-800 mt-6 flex justify-end">
              <button
                onClick={() => setLowStockModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>

      </div>
    </div>
  );
}
