import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../Logout';
import { API_BASE_URL } from '../../../Config';
import { FaTruck, FaSearch, FaSpinner, FaDownload, FaFilePdf } from 'react-icons/fa';
import * as XLSX from 'xlsx';

export default function TransferLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reports/transfer-log`)
      .then(r => r.json())
      .then(data => setLogs(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l =>
    !search ||
    l.challan_number?.toLowerCase().includes(search.toLowerCase()) ||
    l.source_godown_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.target_godown_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.delivery_person?.toLowerCase().includes(search.toLowerCase())
  );

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map((item, i) => ({
      'S.No': i + 1,
      'Challan No': item.challan_number,
      'Date': item.transfer_date,
      'From Godown': item.source_godown_name,
      'From Place': item.from_place || '—',
      'To Godown': item.target_godown_name,
      'To Place': item.to_place || '—',
      'Transport': item.transport_name || '—',
      'LR No': item.lr_number || '—',
      'Delivery Person': item.delivery_person || '—',
      'Performed By': item.performed_by || '—'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transfer Log');
    XLSX.writeFile(wb, `Transfer_Log_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 hundred:ml-64 p-4 md:p-6 text-black dark:text-white">
      <Sidebar />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-600/10 text-indigo-500 border border-indigo-500/20">
              <FaTruck />
            </span>
            Stock Transfer Log Report
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Complete audit log of all godown stock transfers and delivery details</p>
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
            placeholder="Search challan, godown, driver..."
            className="w-full pl-11 pr-4 py-3 border rounded-xl dark:bg-gray-800 text-sm text-black dark:text-white border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400"><FaSpinner className="animate-spin text-2xl text-indigo-500 inline mr-2" /> Loading transfer logs...</div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-x-auto border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-slate-200">
              <tr>
                <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wider">#</th>
                <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wider">Challan No</th>
                <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wider">Date</th>
                <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wider">From Godown</th>
                <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wider">To Godown</th>
                <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wider">Transport / Vehicle</th>
                <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wider">Delivery Person</th>
                <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wider">Performed By</th>
                <th className="px-5 py-4 text-center font-bold text-xs uppercase tracking-wider">Challan PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
              {filtered.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition">
                  <td className="px-5 py-3 font-medium text-xs text-gray-400">{idx + 1}</td>
                  <td className="px-5 py-3 font-extrabold text-indigo-400">{item.challan_number || '—'}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">{new Date(item.transfer_date).toLocaleDateString('en-IN')}</td>
                  <td className="px-5 py-3 font-bold">{item.source_godown_name?.toUpperCase()}</td>
                  <td className="px-5 py-3 font-extrabold text-emerald-400">{item.target_godown_name?.toUpperCase()}</td>
                  <td className="px-5 py-3 text-xs">{item.transport_name || '—'} {item.lr_number ? `(${item.lr_number})` : ''}</td>
                  <td className="px-5 py-3 font-bold text-purple-400">{item.delivery_person || '—'}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">{item.performed_by || 'Admin'}</td>
                  <td className="px-5 py-3 text-center">
                    <a
                      href={`${API_BASE_URL}/api/transfer-challans/${item.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded transition inline-block"
                      title="Download PDF"
                    >
                      <FaFilePdf size={16} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
