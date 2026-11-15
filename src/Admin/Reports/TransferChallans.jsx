import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../Logout';
import { API_BASE_URL } from '../../../Config';
import { FaTruck, FaDownload, FaSpinner, FaSearch, FaWarehouse, FaCalendarAlt, FaUser } from 'react-icons/fa';

export default function TransferChallans() {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/transfer-challans`)
      .then(r => r.json())
      .then(data => setChallans(data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = challans.filter(c => 
    !search ||
    c.challan_number?.toLowerCase().includes(search.toLowerCase()) ||
    c.source_godown_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.target_godown_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.delivery_person?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 hundred:ml-64 p-4 md:p-6">
      <Sidebar />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FaTruck className="text-blue-600" /> Transfer Delivery Challans
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">View and download all generated godown stock transfer challans</p>
        </div>
        <Logout />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6">
        <div className="relative max-w-md">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by challan no, godown, driver..."
            className="w-full pl-9 pr-4 py-2 border rounded-lg dark:bg-gray-700 text-sm text-black dark:text-white border-gray-300 dark:border-gray-600"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 flex items-center justify-center gap-2">
          <FaSpinner className="animate-spin text-xl text-blue-600" /> Loading challans...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <p className="text-gray-500 dark:text-gray-400 text-sm">No transfer challans found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-5 flex flex-col justify-between hover:shadow-lg transition">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-bold px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-md">
                      {c.challan_number}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1">
                      <FaCalendarAlt /> {new Date(c.transfer_date).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <a
                    href={`${API_BASE_URL}/api/transfer-challans/${c.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-gray-700 rounded-lg transition"
                    title="Download PDF"
                  >
                    <FaDownload size={18} />
                  </a>
                </div>

                <div className="my-3 p-3 bg-gray-50 dark:bg-gray-900/90 rounded-lg border border-gray-100 dark:border-gray-700 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">From:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{c.source_godown_name?.toUpperCase()} ({c.from_place || '—'})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">To:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{c.target_godown_name?.toUpperCase()} ({c.to_place || '—'})</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1">
                    <span className="text-gray-500">Transport:</span>
                    <span className="font-medium">{c.transport_name || 'Direct'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">LR No:</span>
                    <span className="font-medium">{c.lr_number || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Delivery Person:</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{c.delivery_person || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Performed By:</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{c.performed_by || 'Admin'}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="text-xs">
                  <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">Products Transferred:</p>
                  {(c.product_details || []).map((p, pi) => (
                    <div key={pi} className="flex justify-between text-gray-600 dark:text-gray-400 py-0.5">
                      <span>• {p.productname} ({p.brand})</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{p.cases} cases</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                <a
                  href={`${API_BASE_URL}/api/transfer-challans/${c.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
                >
                  <FaDownload /> Print / Save PDF
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
