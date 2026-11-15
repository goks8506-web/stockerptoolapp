import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../Logout';
import { API_BASE_URL } from '../../../Config';
import { FaBook, FaSearch, FaSpinner, FaDownload } from 'react-icons/fa';
import * as XLSX from 'xlsx';

export default function SupplierOutstanding() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reports/supplier-outstanding`)
      .then(r => r.json())
      .then(res => setData(res || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = data.filter(d =>
    !search ||
    d.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.gstin?.toLowerCase().includes(search.toLowerCase())
  );

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map((item, i) => ({
      'S.No': i + 1,
      'Supplier Name': item.supplier_name,
      'GSTIN': item.gstin || '—',
      'Total Bills': parseInt(item.total_bills),
      'Pending Bills': parseInt(item.pending_bills),
      'Total Purchased (₹)': parseFloat(item.total_purchased_amount || 0),
      'Total Paid (₹)': parseFloat(item.total_paid_amount || 0),
      'Net Outstanding Balance (₹)': parseFloat(item.net_outstanding_balance || 0)
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Supplier Outstanding');
    XLSX.writeFile(wb, `Supplier_Outstanding_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 hundred:ml-64 p-4 md:p-6 text-black dark:text-white">
      <Sidebar />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-purple-600/10 text-purple-500 border border-purple-500/20">
              <FaBook />
            </span>
            Supplier Outstanding Ledger Report
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Supplier-wise summary of billed amounts, total payments, and balance due</p>
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
            placeholder="Search supplier name or GSTIN..."
            className="w-full pl-11 pr-4 py-3 border rounded-xl dark:bg-gray-800 text-sm text-black dark:text-white border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400"><FaSpinner className="animate-spin text-2xl text-purple-500 inline mr-2" /> Loading supplier report...</div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-x-auto border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-slate-200">
              <tr>
                <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wider">#</th>
                <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wider">Supplier Name</th>
                <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wider">GSTIN</th>
                <th className="px-5 py-4 text-center font-bold text-xs uppercase tracking-wider">Total Bills</th>
                <th className="px-5 py-4 text-center font-bold text-xs uppercase tracking-wider">Pending Bills</th>
                <th className="px-5 py-4 text-right font-bold text-xs uppercase tracking-wider">Total Purchased</th>
                <th className="px-5 py-4 text-right font-bold text-xs uppercase tracking-wider">Total Paid</th>
                <th className="px-5 py-4 text-right font-bold text-xs uppercase tracking-wider">Outstanding Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
              {filtered.map((item, idx) => {
                const purchased = parseFloat(item.total_purchased_amount) || 0;
                const paid = parseFloat(item.total_paid_amount) || 0;
                const balance = parseFloat(item.net_outstanding_balance) || 0;
                return (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition">
                    <td className="px-5 py-3 font-medium text-xs text-gray-400">{idx + 1}</td>
                    <td className="px-5 py-3 font-extrabold text-white">{item.supplier_name}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">{item.gstin || '—'}</td>
                    <td className="px-5 py-3 text-center font-bold">{item.total_bills}</td>
                    <td className="px-5 py-3 text-center font-bold text-amber-400">{item.pending_bills}</td>
                    <td className="px-5 py-3 text-right font-bold text-slate-200">₹{purchased.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right text-emerald-400 font-bold">₹{paid.toFixed(2)}</td>
                    <td className={`px-5 py-3 text-right font-black ${balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      ₹{balance.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
