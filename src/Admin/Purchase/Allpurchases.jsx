import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../Logout';
import Modal from 'react-modal';
import { API_BASE_URL } from '../../../Config';
import {
  FaEye, FaDownload, FaTimes, FaSpinner, FaSearch, FaTrash, FaChevronDown, FaChevronUp
} from 'react-icons/fa';

Modal.setAppElement('#root');

const FloatingLabelInput = ({ value, onChange, placeholder, type = 'text', className = '', ...props }) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);
  const isActive = isFocused || (value !== undefined && value !== null && value.toString().trim() !== '');
  return (
    <div className="relative">
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`w-full rounded-lg px-4 py-2.5 border ${isActive ? 'border-green-500' : 'border-gray-300 dark:border-gray-600'}
                   bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-0 focus:border-green-500 peer placeholder-transparent ${className}`}
        placeholder=" "
        {...props}
      />
      <label
        onClick={() => inputRef.current?.focus()}
        className={`absolute left-4 transition-all duration-200 pointer-events-none
        ${isActive
          ? '-top-3 text-xs font-medium text-green-600 dark:text-green-400 bg-white dark:bg-gray-800 px-2'
          : 'top-2.5 text-gray-500 dark:text-gray-400'
        }`}
      >
        {placeholder}
      </label>
    </div>
  );
};

export default function AllPurchases() {
  const [purchases, setPurchases] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState('');
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState({});
  const itemsPerPage = 16;

  const textClass = 'text-black dark:text-white';
  const cardClass = 'bg-white dark:bg-gray-800 rounded-xl shadow-lg';

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/purchase`)
      .then(res => res.json())
      .then(data => {
        const sorted = data.sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date));
        setPurchases(sorted);
        setFilteredPurchases(sorted);
      })
      .catch(err => console.error('Error fetching purchases:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    setFilteredPurchases(
      purchases.filter(p =>
        p.purchase_number?.toLowerCase().includes(q) ||
        p.supplier_name?.toLowerCase().includes(q) ||
        p.invoice_number?.toLowerCase().includes(q)
      )
    );
    setCurrentPage(1);
  }, [searchQuery, purchases]);

  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
  const paginated = filteredPurchases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleView = async (purchase) => {
    setSelectedPurchase(purchase);
    setShowViewModal(true);
    setLoadingPDF(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/purchase/pdf/${purchase.id}`);
      const data = await res.json();
      if (data.pdfBase64) {
        const byteChars = atob(data.pdfBase64.split(',')[1]);
        const bytes = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'application/pdf' });
        setPdfBlobUrl(URL.createObjectURL(blob));
      }
    } catch (err) {
      console.error('Error loading PDF:', err);
    } finally {
      setLoadingPDF(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this purchase record?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/purchase/${id}`, { method: 'DELETE' });
      setPurchases(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting purchase:', err);
    }
  };

  const toggleRow = (id) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 hundred:ml-64">
      <Sidebar />
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">All Purchases</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{filteredPurchases.length} purchase records</p>
          </div>
          <Logout />
        </div>

        {/* Search */}
        <div className={`${cardClass} p-4 mb-4`}>
          <div className="relative max-w-md">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by PO number, supplier or invoice..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:border-green-500 text-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className={`${cardClass} overflow-hidden`}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <FaSpinner className="animate-spin text-3xl text-green-500" />
            </div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">No purchases found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    {['PO Number', 'Date', 'Supplier', 'Invoice No.', 'Total', 'Paid', 'Balance', 'Actions'].map(h => (
                      <th key={h} className={`px-4 py-3 text-left font-semibold ${textClass}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((purchase) => (
                    <React.Fragment key={purchase.id}>
                      <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => toggleRow(purchase.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                              {expandedRows[purchase.id] ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                            </button>
                            <span className="font-semibold text-green-600 dark:text-green-400">{purchase.purchase_number}</span>
                          </div>
                        </td>
                        <td className={`px-4 py-3 ${textClass}`}>{formatDate(purchase.purchase_date)}</td>
                        <td className={`px-4 py-3 font-medium ${textClass}`}>{purchase.supplier_name}</td>
                        <td className={`px-4 py-3 ${textClass}`}>{purchase.invoice_number || '—'}</td>
                        <td className={`px-4 py-3 font-semibold ${textClass}`}>₹{parseFloat(purchase.total || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">₹{parseFloat(purchase.paid || 0).toFixed(2)}</td>
                        <td className={`px-4 py-3 font-medium ${parseFloat(purchase.balance) > 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                          ₹{parseFloat(purchase.balance || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleView(purchase)}
                              className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                              title="View PDF"
                            >
                              <FaEye />
                            </button>
                            <button
                              onClick={() => handleDelete(purchase.id)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedRows[purchase.id] && (
                        <tr>
                          <td colSpan={8} className="bg-gray-50 dark:bg-gray-900/90 px-6 py-4">
                            <div className="text-sm">
                              <p className={`mb-2 font-medium ${textClass}`}>Items:</p>
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr className="bg-gray-200 dark:bg-gray-600">
                                    {['#', 'Product', 'Cases', 'Per', 'Qty', 'Rate', 'Disc%', 'Amount'].map(h => (
                                      <th key={h} className={`px-3 py-1.5 text-left text-xs font-semibold ${textClass}`}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {(purchase.items || []).map((item, i) => (
                                    <tr key={i} className="border-t border-gray-200 dark:border-gray-600">
                                      <td className={`px-3 py-1 text-xs ${textClass}`}>{item.s_no}</td>
                                      <td className={`px-3 py-1 text-xs ${textClass}`}>{item.productname}</td>
                                      <td className={`px-3 py-1 text-xs ${textClass}`}>{item.cases}</td>
                                      <td className={`px-3 py-1 text-xs ${textClass}`}>{item.per_case}</td>
                                      <td className={`px-3 py-1 text-xs ${textClass}`}>{item.quantity}</td>
                                      <td className={`px-3 py-1 text-xs ${textClass}`}>₹{parseFloat(item.rate_per_box).toFixed(2)}</td>
                                      <td className={`px-3 py-1 text-xs ${textClass}`}>{item.discount_percent}%</td>
                                      <td className={`px-3 py-1 text-xs font-semibold ${textClass}`}>₹{parseFloat(item.amount).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {(purchase.payments || []).length > 0 && (
                                <div className="mt-3">
                                  <p className={`mb-1 font-medium ${textClass}`}>Payments:</p>
                                  {purchase.payments.map((p, i) => (
                                    <div key={i} className="text-xs text-gray-600 dark:text-gray-400">
                                      {formatDate(p.transaction_date)} — ₹{parseFloat(p.amount_paid).toFixed(2)} via {p.payment_method}
                                      {p.bank_name ? ` (${p.bank_name})` : ''}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Prev
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View PDF Modal */}
      <Modal
        isOpen={showViewModal}
        onRequestClose={() => { setShowViewModal(false); setPdfBlobUrl(''); setSelectedPurchase(null); }}
        style={{
          overlay: { backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000 },
          content: { inset: '5%', borderRadius: '16px', padding: 0, border: 'none', background: 'white' }
        }}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-bold text-gray-800">
              {selectedPurchase?.purchase_number} — {selectedPurchase?.supplier_name}
            </h3>
            <div className="flex gap-2">
              {pdfBlobUrl && (
                <a
                  href={pdfBlobUrl}
                  download={`${selectedPurchase?.purchase_number}.pdf`}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                >
                  <FaDownload /> Download
                </a>
              )}
              <button
                onClick={() => { setShowViewModal(false); setPdfBlobUrl(''); setSelectedPurchase(null); }}
                className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300"
              >
                <FaTimes className="text-gray-700" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {loadingPDF ? (
              <div className="flex items-center justify-center h-full">
                <FaSpinner className="animate-spin text-3xl text-green-500" />
              </div>
            ) : pdfBlobUrl ? (
              <iframe src={pdfBlobUrl} className="w-full h-full" title="Purchase PDF" />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">Could not load PDF</div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
