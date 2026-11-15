import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../Logout';
import { API_BASE_URL } from '../../../Config';
import { FaMoneyBill, FaSearch, FaSpinner, FaDownload, FaFilePdf } from 'react-icons/fa';
import * as XLSX from 'xlsx';

export default function PurchaseReport() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reports/purchase-history`)
      .then(r => r.json())
      .then(data => setPurchases(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = purchases.filter(p =>
    !search ||
    p.purchase_number?.toLowerCase().includes(search.toLowerCase()) ||
    p.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.invoice_number?.toLowerCase().includes(search.toLowerCase())
  );

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map((item, i) => ({
      'S.No': i + 1,
      'PO Number': item.purchase_number,
      'Date': item.purchase_date,
      'Supplier': item.supplier_name,
      'Invoice No': item.invoice_number,
      'Total Cases': item.total_cases,
      'Grand Total (₹)': item.total,
      'Amount Paid (₹)': item.paid,
      'Balance (₹)': item.balance,
      'Status': item.balance === 0 ? 'Fully Paid' : 'Pending'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Purchase History');
    XLSX.writeFile(wb, `Purchase_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 hundred:ml-64 p-4 md:p-6 text-black dark:text-white">
      <Sidebar />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-emerald-600/10 text-emerald-500 border border-emerald-500/20">
              <FaMoneyBill />
            </span>
            Purchase Orders & Bills Report
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Complete record of purchases, supplier payments, and outstanding balances</p>
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
            placeholder="Search PO no, supplier, or invoice no..."
            className="w-full pl-11 pr-4 py-3 border rounded-xl dark:bg-gray-800 text-sm text-black dark:text-white border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400"><FaSpinner className="animate-spin text-2xl text-emerald-500 inline mr-2" /> Loading purchase report...</div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-x-auto border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-slate-200">
              <tr>
                <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wider">#</th>
                <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wider">PO Number</th>
                <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wider">Date</th>
                <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wider">Supplier Name</th>
                <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wider">Invoice No</th>
                <th className="px-5 py-4 text-right font-bold text-xs uppercase tracking-wider">Cases</th>
                <th className="px-5 py-4 text-right font-bold text-xs uppercase tracking-wider">Total</th>
                <th className="px-5 py-4 text-right font-bold text-xs uppercase tracking-wider">Paid</th>
                <th className="px-5 py-4 text-right font-bold text-xs uppercase tracking-wider">Balance</th>
                <th className="px-5 py-4 text-center font-bold text-xs uppercase tracking-wider">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
              {filtered.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition">
                  <td className="px-5 py-3 font-medium text-xs text-gray-400">{idx + 1}</td>
                  <td className="px-5 py-3 font-extrabold text-emerald-500 dark:text-emerald-400">{item.purchase_number}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">{new Date(item.purchase_date).toLocaleDateString('en-IN')}</td>
                  <td className="px-5 py-3 font-bold">{item.supplier_name}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">{item.invoice_number || '—'}</td>
                  <td className="px-5 py-3 text-right font-bold text-indigo-400">{item.total_cases || 0}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-200">₹{item.total?.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right text-emerald-400 font-bold">₹{item.paid?.toFixed(2)}</td>
                  <td className={`px-5 py-3 text-right font-black ${item.balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    ₹{item.balance?.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={async () => {
                        const res = await fetch(`${API_BASE_URL}/api/purchase/pdf/${item.id}`);
                        const d = await res.json();
                        if (d.pdfBase64) {
                          const w = window.open();
                          w.document.write(`<iframe src="${d.pdfBase64}" width="100%" height="100%"></iframe>`);
                        }
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 rounded transition"
                      title="View PDF"
                    >
                      <FaFilePdf size={16} />
                    </button>
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
