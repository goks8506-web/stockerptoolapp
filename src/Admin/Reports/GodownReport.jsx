import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../Logout';
import { API_BASE_URL } from '../../../Config';
import { FaWarehouse, FaSearch, FaSpinner, FaDownload } from 'react-icons/fa';
import * as XLSX from 'xlsx';

export default function GodownReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reports/godown-stock`)
      .then(r => r.json())
      .then(res => setData(res || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = data.filter(d =>
    !search ||
    d.godown_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.productname?.toLowerCase().includes(search.toLowerCase()) ||
    d.brand?.toLowerCase().includes(search.toLowerCase())
  );

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map((item, i) => ({
      'S.No': i + 1,
      'Godown': item.godown_name,
      'Product Name': item.productname,
      'Brand': item.brand,
      'Type': item.product_type,
      'Current Cases': item.current_cases,
      'Per Case': item.per_case,
      'Total Quantity': item.total_quantity,
      'Last Stock In': item.date_added ? new Date(item.date_added).toLocaleDateString() : '—'
    })));
    if (ws['!ref']) ws['!autofilter'] = { ref: ws['!ref'] };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Godown Stock Report');
    XLSX.writeFile(wb, `Godown_Stock_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 hundred:ml-64 p-4 md:p-6 text-black dark:text-white">
      <Sidebar />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-600/10 text-amber-500 border border-amber-500/20">
              <FaWarehouse />
            </span>
            Godown Stock Report
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Detailed real-time stock availability across all godowns</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportExcel} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg transition">
            <FaDownload /> Export Excel
          </button>
          <Logout />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-5 mb-6 border border-gray-200 dark:border-gray-800">
        <div className="relative max-w-md">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search godown name, product, or brand..."
            className="w-full pl-11 pr-4 py-3 border rounded-xl dark:bg-gray-800 text-sm text-black dark:text-white border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400"><FaSpinner className="animate-spin text-2xl text-amber-500 inline mr-2" /> Loading godown stock report...</div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-x-auto border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-slate-200">
              <tr>
                <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wider">#</th>
                <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wider">Godown</th>
                <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wider">Product Name</th>
                <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wider">Brand</th>
                <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wider">Type</th>
                <th className="px-5 py-4 text-right font-bold text-xs uppercase tracking-wider">Cases</th>
                <th className="px-5 py-4 text-right font-bold text-xs uppercase tracking-wider">Per Case</th>
                <th className="px-5 py-4 text-right font-bold text-xs uppercase tracking-wider">Total Quantity</th>
                <th className="px-5 py-4 text-center font-bold text-xs uppercase tracking-wider">Last Stock In</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
              {filtered.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition">
                  <td className="px-5 py-3 font-medium text-xs text-gray-400">{idx + 1}</td>
                  <td className="px-5 py-3 font-extrabold text-amber-500 dark:text-amber-400">{item.godown_name?.toUpperCase()}</td>
                  <td className="px-5 py-3 font-bold">{item.productname || '—'}</td>
                  <td className="px-5 py-3 font-semibold text-indigo-400">{item.brand || '—'}</td>
                  <td className="px-5 py-3 capitalize text-xs text-gray-400">{item.product_type || '—'}</td>
                  <td className="px-5 py-3 text-right font-black text-emerald-500 dark:text-emerald-400">{item.current_cases || 0}</td>
                  <td className="px-5 py-3 text-right text-gray-400 text-xs">{item.per_case || 1}</td>
                  <td className="px-5 py-3 text-right font-bold text-indigo-300">{item.total_quantity || 0}</td>
                  <td className="px-5 py-3 text-center text-xs text-gray-400">{item.date_added ? new Date(item.date_added).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
