import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../../Config';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../../Admin/Logout';
import Modal from 'react-modal';
import {
  FaSearch, FaTruck, FaCheckCircle, FaTimes, FaDownload, FaWarehouse
} from 'react-icons/fa';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

Modal.setAppElement('#root');

// ─── PDF Styles ────────────────────────────────────────────────────────────────
const pdfStyles = StyleSheet.create({
  page: { padding: 40, backgroundColor: '#fff' },
  mainTitle: { fontSize: 28, textAlign: 'center', marginBottom: 6, fontWeight: 'bold', color: '#16a34a' },
  tagline: { fontSize: 11, textAlign: 'center', marginBottom: 30, color: '#666', fontStyle: 'italic' },
  headerSection: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  supplierInfo: { flex: 1 },
  receiptInfo: { width: 200, textAlign: 'right' },
  label: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  valueBold: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  value: { fontSize: 11, color: '#444', marginBottom: 3 },
  bold: { fontWeight: 'bold' },
  boldGreen: { fontWeight: 'bold', color: '#16a34a' },
  table: { marginTop: 20, border: '1px solid #000' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#166534', color: 'white' },
  tableRow: { flexDirection: 'row', minHeight: 36, alignItems: 'center' },
  th: { padding: 10, fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  td: { padding: 8, fontSize: 10, textAlign: 'center', borderBottom: '0.5px solid #ccc' },
  totalBox: { marginTop: 30, padding: 16, backgroundColor: '#dcfce7', borderRadius: 10, alignItems: 'center' },
  totalText: { fontSize: 16, fontWeight: 'bold', color: '#14532d' },
  transportBox: { marginTop: 30, padding: 18, backgroundColor: '#f0fdf4', borderRadius: 10, fontSize: 12, border: '1px dashed #16a34a' },
  transportTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 10, color: '#15803d' },
  footer: { position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', fontSize: 9, color: '#666' },
});

const PurchaseReceiptPDF = ({ purchase, dispatches, dispatchDate }) => {
  const totalCases = dispatches.reduce((s, d) => s + d.cases, 0);
  const totalQty = dispatches.reduce((s, d) => s + d.qty, 0);
  const formattedDate = dispatchDate
    ? new Date(dispatchDate).toLocaleDateString('en-IN')
    : new Date().toLocaleDateString('en-IN');

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.mainTitle}>GOODS RECEIPT NOTE</Text>
        <Text style={pdfStyles.tagline}>Purchase Inward &amp; Godown Allocation Receipt</Text>

        <View style={pdfStyles.headerSection}>
          <View style={pdfStyles.supplierInfo}>
            <Text style={pdfStyles.label}>From (Supplier):</Text>
            <Text style={pdfStyles.valueBold}>{purchase.supplier_name}</Text>
            {purchase.address && <Text style={pdfStyles.value}>{purchase.address}</Text>}
            {purchase.gstin && <Text style={pdfStyles.value}>GSTIN: {purchase.gstin}</Text>}
            {purchase.agent_name && <Text style={pdfStyles.value}>Agent: {purchase.agent_name}</Text>}
          </View>
          <View style={pdfStyles.receiptInfo}>
            <Text style={{ fontSize: 13 }}>
              Date: <Text style={pdfStyles.bold}>{formattedDate}</Text>
            </Text>
            <Text style={{ fontSize: 11, marginTop: 8 }}>
              PO No: <Text style={pdfStyles.bold}>{purchase.purchase_number}</Text>
            </Text>
          </View>
        </View>

        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeaderRow}>
            <Text style={[pdfStyles.th, { width: '7%' }]}>S.No</Text>
            <Text style={[pdfStyles.th, { width: '20%' }]}>Brand</Text>
            <Text style={[pdfStyles.th, { width: '38%' }]}>Product Description</Text>
            <Text style={[pdfStyles.th, { width: '11%' }]}>Cases</Text>
            <Text style={[pdfStyles.th, { width: '11%' }]}>Per Case</Text>
            <Text style={[pdfStyles.th, { width: '11%' }]}>Qty</Text>
            <Text style={[pdfStyles.th, { width: '22%' }]}>Godown Location</Text>
          </View>

          {dispatches.map((item, i) => (
            <View style={pdfStyles.tableRow} key={i}>
              <Text style={[pdfStyles.td, { width: '7%' }]}>{i + 1}</Text>
              <Text style={[pdfStyles.td, { width: '20%' }]}>{item.brand}</Text>
              <Text style={[pdfStyles.td, { width: '38%', textAlign: 'center', paddingLeft: 10 }]}>
                {item.product_name}
              </Text>
              <Text style={[pdfStyles.td, { width: '11%' }]}>{item.cases}</Text>
              <Text style={[pdfStyles.td, { width: '11%' }]}>{item.per_case}</Text>
              <Text style={[pdfStyles.td, { width: '11%' }]}>{item.qty}</Text>
              <Text style={[pdfStyles.td, { width: '22%', color: '#16a34a', fontWeight: 'bold' }]}>
                {item.godown || 'Main Location'}
              </Text>
            </View>
          ))}
        </View>

        <View style={pdfStyles.totalBox}>
          <Text style={pdfStyles.totalText}>
            Total Cases: {totalCases}  |  Total Quantity: {totalQty}
          </Text>
        </View>

        <View style={pdfStyles.transportBox}>
          <Text style={pdfStyles.transportTitle}>Transport / Supplier Details</Text>
          <Text style={{ marginTop: 2 }}>Supplier  : {purchase.supplier_name}</Text>
          <Text style={{ marginTop: 2 }}>Invoice No: {purchase.invoice_number || '—'}</Text>
          <Text style={{ marginTop: 2 }}>Through   : <Text style={pdfStyles.boldGreen}>{purchase.through || 'Direct'}</Text></Text>
        </View>

        <Text style={pdfStyles.footer}>
          This is a computer-generated Goods Receipt Note • Subject to Sivakasi Jurisdiction
        </Text>
      </Page>
    </Document>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const PAGE_SIZE = 9;

export default function PurchaseDispatch() {
  const [purchases, setPurchases] = useState([]);
  const [tab, setTab] = useState('PENDING');
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [caseDispatches, setCaseDispatches] = useState({});
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [godownSelections, setGodownSelections] = useState({});
  const [availableGodowns, setAvailableGodowns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const capitalize = (str) => str?.toLowerCase().split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '';

  // Fetch Godowns list
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/godowns`)
      .then(res => {
        const list = (res.data || []).map(g => ({ id: g.id, name: capitalize(g.name), rawName: g.name }));
        setAvailableGodowns(list);
      })
      .catch(err => console.error('Error fetching godowns:', err));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [purchaseRes, logRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/purchase`),
          axios.get(`${API_BASE_URL}/api/purchase-dispatch-logs/all`).catch(() => ({ data: [] })),
        ]);

        const rawPurchases = Array.isArray(purchaseRes.data) ? purchaseRes.data : [];
        const rawLogs = Array.isArray(logRes.data) ? logRes.data : [];

        const dispatchedMapGlobal = {};
        rawLogs.forEach(log => {
          const key = `${log.purchase_id}-${log.product_index}`;
          dispatchedMapGlobal[key] = (parseFloat(dispatchedMapGlobal[key]) || 0) + (parseFloat(log.dispatched_cases) || 0);
        });

        const enriched = rawPurchases.map((p) => {
          const items = typeof p.items === 'string' ? JSON.parse(p.items || '[]') : p.items || [];
          const dispatchedMap = {};
          items.forEach((item, idx) => {
            const key = `${p.id}-${idx}`;
            let casesDispatched = parseFloat(dispatchedMapGlobal[key]) || 0;

            if (casesDispatched === 0 && Array.isArray(p.dispatch_logs)) {
              const matchedLogs = p.dispatch_logs.filter(dl => dl.product_index === idx || dl.product_name === item.productname);
              casesDispatched = matchedLogs.reduce((sum, dl) => sum + (parseFloat(dl.dispatched_cases) || 0), 0);
            }

            dispatchedMap[idx] = Math.round(casesDispatched * 100) / 100;
          });

          return {
            ...p,
            products: items.map((i) => ({
              ...i,
              productname: i.productname || i.product_name || 'Unknown',
              cases: parseFloat(i.cases) || 0,
              per_case: parseFloat(i.per_case) || 1,
              brand: i.brand || '',
              godown: i.godown || 'Main Location',
            })),
            dispatchedMap,
            through: p.through || 'Direct',
          };
        });

        setPurchases(enriched);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to load purchases & dispatch logs');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getTotalCases = (p) => (p.products || []).reduce((s, i) => s + (parseFloat(i.cases) || 0), 0);
  const getDispatchedCases = (p) => Object.values(p.dispatchedMap || {}).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const getPendingCases = (p) => Math.max(0, Math.round((getTotalCases(p) - getDispatchedCases(p)) * 100) / 100);
  const isPending = (p) => getPendingCases(p) > 0.001;
  const isCompleted = (p) => !isPending(p);

  const filtered = purchases
    .filter((p) => (tab === 'PENDING' ? isPending(p) : isCompleted(p)))
    .filter((p) =>
      [p.purchase_number, p.supplier_name, p.invoice_number, p.through].some((f) =>
        f?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openModal = (purchase) => {
    setSelectedPurchase(purchase);
    setCaseDispatches({});
    setDispatchDate(new Date().toISOString().split('T')[0]);
    const initialGodowns = {};
    purchase.products.forEach((p, idx) => {
      initialGodowns[idx] = p.godown || (availableGodowns[0]?.name || 'Main Location');
    });
    setGodownSelections(initialGodowns);
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedPurchase(null);
    setCaseDispatches({});
    setGodownSelections({});
    setIsModalOpen(false);
  };

  const handleDispatch = async () => {
    if (!selectedPurchase) return;

    const toDispatch = selectedPurchase.products
      .map((p, idx) => {
        const already = parseFloat(selectedPurchase.dispatchedMap[idx] || 0);
        const totalCs = parseFloat(p.cases || 0);
        const remaining = Math.max(0, totalCs - already);
        const input = parseFloat(caseDispatches[idx]) || 0;
        const cases = Math.min(input, remaining);
        if (cases <= 0) return null;
        const per = parseFloat(p.per_case || 1);
        return {
          product_index: idx,
          product_name: p.productname,
          brand: p.brand || '',
          cases,
          per_case: per,
          qty: Math.round(cases * per),
          godown: godownSelections[idx] || p.godown || 'Main Location',
        };
      })
      .filter(Boolean);

    if (toDispatch.length === 0) {
      setError('Please enter at least one case (or fraction) to receive into godown');
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post(`${API_BASE_URL}/api/purchase-dispatch`, {
        purchase_id: selectedPurchase.id,
        dispatches: toDispatch.map(d => ({
          product_index: d.product_index,
          product_name: d.product_name,
          brand: d.brand,
          dispatched_cases: d.cases,
          dispatched_qty: d.qty,
          per_case: d.per_case,
          godown: d.godown,
        })),
        through: selectedPurchase.through || 'Direct',
        lr_number: null,
        dispatch_date: dispatchDate,
        performed_by: localStorage.getItem('username') || 'Admin',
      });

      // Generate PDF receipt
      const blob = await pdf(
        <PurchaseReceiptPDF
          purchase={selectedPurchase}
          dispatches={toDispatch}
          dispatchDate={dispatchDate}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GRN_${selectedPurchase.purchase_number}_${selectedPurchase.supplier_name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      setSuccess('Dispatched & Godown Stock Automatically Filled!');
      setTimeout(() => setSuccess(''), 5000);

      // Update UI
      setPurchases(prev =>
        prev.map(p =>
          p.id === selectedPurchase.id
            ? {
                ...p,
                dispatchedMap: {
                  ...p.dispatchedMap,
                  ...Object.fromEntries(toDispatch.map(d => [d.product_index, (parseFloat(p.dispatchedMap[d.product_index]) || 0) + d.cases])),
                },
              }
            : p
        )
      );

      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Dispatch failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <Logout />

      <div className="flex-1 p-6 pt-20 md:ml-64">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-10 text-gray-800 dark:text-white flex items-center justify-center gap-3">
            <FaTruck className="text-green-600" />
            Purchase Dispatch &amp; Stock Auto-Fill
          </h1>

          {error && <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg text-center">{error}</div>}
          {success && (
            <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg text-center flex items-center justify-center gap-2">
              <FaCheckCircle /> {success}
            </div>
          )}

          <div className="flex justify-center gap-6 mb-8">
            <button
              onClick={() => { setTab('PENDING'); setCurrentPage(1); }}
              className={`px-10 py-4 rounded-xl font-bold text-lg transition-all ${tab === 'PENDING' ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700'}`}
            >
              Pending ({purchases.filter(isPending).length})
            </button>
            <button
              onClick={() => { setTab('COMPLETED'); setCurrentPage(1); }}
              className={`px-10 py-4 rounded-xl font-bold text-lg transition-all ${tab === 'COMPLETED' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700'}`}
            >
              Completed ({purchases.filter(isCompleted).length})
            </button>
          </div>

          <div className="relative max-w-2xl mx-auto mb-10">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by PO No, Supplier, Invoice No, Transport..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-12 pr-6 py-4 border-2 border-gray-300 rounded-xl focus:border-green-500 outline-none text-lg text-black dark:text-white bg-white dark:bg-gray-800"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginated.map((p) => {
              const total = getTotalCases(p);
              const done = getDispatchedCases(p);
              const left = getPendingCases(p);

              return (
                <div key={p.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-bold text-green-600">#{p.purchase_number}</h3>
                    {tab === 'COMPLETED' && <FaCheckCircle className="text-3xl text-green-600" />}
                  </div>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">{p.supplier_name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <strong>Invoice:</strong> {p.invoice_number || '—'}
                  </p>

                  <div className="grid grid-cols-3 gap-4 mt-6 text-center">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                      <p className="text-3xl font-bold text-green-700">{total}</p>
                      <p className="text-xs text-green-600">Total</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <p className="text-3xl font-bold text-blue-700">{done}</p>
                      <p className="text-xs text-blue-600">Done</p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                      <p className="text-3xl font-bold text-orange-700">{left}</p>
                      <p className="text-xs text-orange-600">Left</p>
                    </div>
                  </div>

                  {tab === 'PENDING' && left > 0 && (
                    <button
                      onClick={() => openModal(p)}
                      className="mt-6 w-full bg-gradient-to-r from-green-600 to-green-700 text-white font-bold py-4 rounded-xl hover:from-green-700 hover:to-green-800 transition-all flex items-center justify-center gap-3"
                    >
                      <FaTruck /> Receive &amp; Fill Stock
                    </button>
                  )}
                </div>
              );
            })}
            {paginated.length === 0 && (
              <div className="col-span-4 text-center py-16 text-gray-400 text-lg">
                {loading ? 'Loading...' : `No ${tab.toLowerCase()} purchases found`}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-3 mt-12">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-12 h-12 rounded-full font-bold ${currentPage === i + 1 ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dispatch & Stock Fill Modal */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-5xl w-full mx-4 my-8 outline-none overflow-y-auto max-h-screen"
        overlayClassName="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      >
        {selectedPurchase && (
          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Receive &amp; Fill Stock: #{selectedPurchase.purchase_number}
              </h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <FaTimes className="text-3xl" />
              </button>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 p-8 rounded-2xl mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{selectedPurchase.supplier_name}</p>
                  {selectedPurchase.address && <p className="text-gray-600 mt-2">{selectedPurchase.address}</p>}
                </div>
                <div className="space-y-3 text-lg">
                  <p><strong>Invoice No:</strong> <span className="font-bold text-green-700">{selectedPurchase.invoice_number || '—'}</span></p>
                  <p><strong>Through:</strong> <span className="font-bold text-green-700">{selectedPurchase.through || 'Direct'}</span></p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-800 dark:text-white mb-0.5">Sent / Arrival Date *</label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Date on which these remaining cases were sent/received from supplier</p>
              </div>
              <input
                type="date"
                value={dispatchDate}
                onChange={e => setDispatchDate(e.target.value)}
                className="px-4 py-2 border rounded-xl font-semibold text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
              <FaWarehouse className="text-green-600" /> Select Target Godown &amp; Cases to Receive
            </h3>
            <div className="space-y-6">
              {selectedPurchase.products.map((p, idx) => {
                const already = parseFloat(selectedPurchase.dispatchedMap[idx] || 0);
                const totalCases = parseFloat(p.cases || 0);
                const per = parseFloat(p.per_case || 1);
                const remaining = Math.max(0, Math.round((totalCases - already) * 100) / 100);

                return (
                  <div key={idx} className="border-2 border-gray-300 dark:border-gray-600 rounded-2xl p-6 bg-white dark:bg-gray-800 hover:border-green-500 transition-all">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-xl font-bold text-gray-800 dark:text-white">{p.productname}</p>
                        {p.brand && <p className="text-gray-600 dark:text-gray-400">Brand: {p.brand}</p>}
                        <p className="text-sm text-gray-500 dark:text-gray-400">Per Case: {per} pcs</p>
                      </div>
                      <div className="text-left md:text-right space-y-1">
                        <p className="text-sm text-gray-600 dark:text-gray-300">Total Booked: <strong className="text-green-600 dark:text-green-400">{totalCases} cs</strong> ({Math.round(totalCases * per)} pcs)</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Received So Far: <strong className="text-blue-600 dark:text-blue-400">{already} cs</strong> ({Math.round(already * per)} pcs)</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Remaining to Inward: <strong className="text-orange-600 dark:text-orange-400">{remaining} cs</strong> ({Math.round(remaining * per)} pcs)</p>
                      </div>
                    </div>

                    {remaining > 0 ? (
                      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            <FaWarehouse className="text-green-600" /> Store in Godown:
                          </label>
                          {availableGodowns.length > 0 ? (
                            <select
                              value={godownSelections[idx] || p.godown || ''}
                              onChange={(e) => setGodownSelections({ ...godownSelections, [idx]: e.target.value })}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-black dark:text-white bg-white dark:bg-gray-800 focus:border-green-500 outline-none"
                            >
                              {availableGodowns.map(g => (
                                <option key={g.id} value={g.name}>{g.name}</option>
                              ))}
                              <option value="Main Location">Main Location</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={godownSelections[idx] || p.godown || 'Main Location'}
                              onChange={(e) => setGodownSelections({ ...godownSelections, [idx]: e.target.value })}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-black dark:text-white bg-white dark:bg-gray-800"
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                          <label className="text-base font-semibold text-gray-700 dark:text-gray-300">Cases to Store (fraction/loose allowed):</label>
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            max={remaining}
                            className="w-36 px-4 py-2 border-2 border-gray-300 rounded-xl text-lg font-bold text-center focus:border-green-500 outline-none dark:bg-gray-800 dark:text-white"
                            onChange={(e) => setCaseDispatches({ ...caseDispatches, [idx]: e.target.value })}
                            placeholder={`Max: ${remaining}`}
                          />
                          {caseDispatches[idx] && (
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              = {Math.round(parseFloat(caseDispatches[idx] || 0) * per)} pcs
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-6 text-right text-xl font-bold text-green-600">Fully Received &amp; Stored</p>
                    )}
                  </div>
                );
              })}
            </div>

            {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-center">{error}</div>}

            <div className="flex justify-end gap-4 mt-12">
              <button onClick={closeModal} className="px-8 py-4 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-xl">
                Cancel
              </button>
              <button
                onClick={handleDispatch}
                disabled={loading}
                className="px-10 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-xl flex items-center gap-3 disabled:opacity-70 shadow-lg"
              >
                {loading ? 'Processing...' : <><FaDownload /> Receive Goods &amp; Auto-Fill Stock</>}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
