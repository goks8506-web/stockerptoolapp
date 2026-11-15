import React, { useState, useEffect } from 'react';
import { FaTrash, FaSpinner, FaCheckCircle, FaSearch, FaChevronDown, FaChevronUp, FaDownload } from 'react-icons/fa';
import { Document, Page, Text, View, StyleSheet, PDFViewer, pdf } from '@react-pdf/renderer';
import { API_BASE_URL } from '../../../Config';
import Select from 'react-select';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../Logout';

const pdfStyles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  title: { fontSize: 24, textAlign: "center", fontWeight: "bold", color: "#0f172a", letterSpacing: 1 },
  tagline: { fontSize: 9, textAlign: "center", marginBottom: 20, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 },
  headerContainer: { flexDirection: "row", justifyBetween: "space-between", padding: 12, border: "1px solid #cbd5e1", borderRadius: 6, marginBottom: 16, backgroundColor: "#f8fafc" },
  customerInfo: { flex: 1 },
  challanInfo: { width: 180, textAlign: "right" },
  label: { fontSize: 9, color: "#64748b", textTransform: "uppercase", marginBottom: 2 },
  valueBold: { fontSize: 13, fontWeight: "bold", color: "#0f172a", marginBottom: 3 },
  value: { fontSize: 10, color: "#334155", marginBottom: 2 },
  table: { marginTop: 10, border: "1px solid #cbd5e1", borderRadius: 4 },
  row: { flexDirection: "row" },
  headerCell: { padding: 7, fontSize: 9, fontWeight: "bold", textAlign: "center", backgroundColor: "#1e293b", color: "#ffffff" },
  cell: { padding: 6, fontSize: 9, textAlign: "center", borderBottom: "1px solid #e2e8f0", color: "#334155" },
  totalBox: { marginTop: 16, padding: 10, backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 4, flexDirection: "row", justifyContent: "space-around" },
  totalText: { fontSize: 11, fontWeight: "bold", color: "#0f172a" },
  transportBox: { marginTop: 16, padding: 12, backgroundColor: "#f8fafc", borderRadius: 4, border: "1px solid #cbd5e1" },
  transportTitle: { fontSize: 11, fontWeight: "bold", marginBottom: 6, color: "#0f172a", textTransform: "uppercase" },
  transportText: { fontSize: 9, color: "#334155", marginBottom: 2 },
  signatureSection: { marginTop: 30, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  sigBlock: { textAlign: "center", width: 160 },
  sigLine: { borderTop: "1px solid #94a3b8", marginTop: 40, paddingTop: 4, fontSize: 9, color: "#475569" },
  footer: { position: "absolute", bottom: 25, left: 0, right: 0, textAlign: "center", fontSize: 8, color: "#94a3b8" },
});

const ChallanPDF = ({ data }) => {
  const totalCases = data.items.reduce((s, i) => s + i.cases, 0);
  const totalQty = data.items.reduce((s, i) => s + i.cases * i.per_case, 0);

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>DELIVERY CHALLAN</Text>
        <Text style={pdfStyles.tagline}>Goods Once Sold Will Not Be Taken Back or Exchanged</Text>

        <View style={pdfStyles.headerContainer}>
          <View style={pdfStyles.customerInfo}>
            <Text style={pdfStyles.label}>Consignee / Customer Details</Text>
            <Text style={pdfStyles.valueBold}>{data.name}</Text>
            {data.address && <Text style={pdfStyles.value}>{data.address}</Text>}
            {data.gstin && <Text style={pdfStyles.value}>GSTIN: {data.gstin}</Text>}
            <Text style={pdfStyles.value}>Prepared By: {data.created_by}</Text>
          </View>
          <View style={pdfStyles.challanInfo}>
            <Text style={pdfStyles.label}>Challan Info</Text>
            <Text style={{ fontSize: 11, fontWeight: "bold", color: "#0f172a" }}>No: {data.challan_number}</Text>
            <Text style={{ fontSize: 10, color: "#334155", marginTop: 4 }}>Date: {new Date().toLocaleDateString("en-IN")}</Text>
          </View>
        </View>

        <View style={pdfStyles.table}>
          <View style={pdfStyles.row}>
            <Text style={[pdfStyles.headerCell, { width: "7%" }]}>#</Text>
            <Text style={[pdfStyles.headerCell, { width: "22%" }]}>Brand</Text>
            <Text style={[pdfStyles.headerCell, { width: "36%" }]}>Product Description</Text>
            <Text style={[pdfStyles.headerCell, { width: "10%" }]}>Cases</Text>
            <Text style={[pdfStyles.headerCell, { width: "10%" }]}>Pcs/Case</Text>
            <Text style={[pdfStyles.headerCell, { width: "15%" }]}>Total Qty</Text>
          </View>
          {data.items.map((item, i) => (
            <View style={pdfStyles.row} key={i}>
              <Text style={[pdfStyles.cell, { width: "7%" }]}>{i + 1}</Text>
              <Text style={[pdfStyles.cell, { width: "22%", textAlign: "left", paddingLeft: 6 }]}>{item.brand || '—'}</Text>
              <Text style={[pdfStyles.cell, { width: "36%", textAlign: "left", paddingLeft: 6, fontWeight: "bold" }]}>{item.productname}</Text>
              <Text style={[pdfStyles.cell, { width: "10%", fontWeight: "bold" }]}>{item.cases}</Text>
              <Text style={[pdfStyles.cell, { width: "10%" }]}>{item.per_case}</Text>
              <Text style={[pdfStyles.cell, { width: "15%", fontWeight: "bold" }]}>{item.cases * item.per_case}</Text>
            </View>
          ))}
        </View>

        <View style={pdfStyles.totalBox}>
          <Text style={pdfStyles.totalText}>Total Line Items: {data.items.length}</Text>
          <Text style={pdfStyles.totalText}>Total Cases: {totalCases}</Text>
          <Text style={pdfStyles.totalText}>Total Quantity: {totalQty} pcs</Text>
        </View>

        <View style={pdfStyles.transportBox}>
          <Text style={pdfStyles.transportTitle}>Dispatch & Transport Information</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={pdfStyles.transportText}>From: {data.from || 'SIVAKASI'}</Text>
            <Text style={pdfStyles.transportText}>To: {data.to || '—'}</Text>
            <Text style={pdfStyles.transportText}>Carrier: {data.through || '—'}</Text>
            {data.lr_number && <Text style={pdfStyles.transportText}>LR No: {data.lr_number}</Text>}
          </View>
        </View>

        <View style={pdfStyles.signatureSection}>
          <View style={pdfStyles.sigBlock}>
            <Text style={pdfStyles.sigLine}>Receiver's Signature</Text>
          </View>
          <View style={pdfStyles.sigBlock}>
            <Text style={pdfStyles.sigLine}>Authorised Signatory</Text>
          </View>
        </View>

        <Text style={pdfStyles.footer}>
          This is a computer-generated Delivery Challan • Subject to Sivakasi Jurisdiction
        </Text>
      </Page>
    </Document>
  );
};

export default function Delivery() {
  const [godowns, setGodowns] = useState([]);
  const [selectedGodown, setSelectedGodown] = useState(null);
  const [stock, setStock] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [globalProducts, setGlobalProducts] = useState([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showPDF, setShowPDF] = useState(false);
  const [pdfData, setPdfData] = useState(null);
  const [isCustomerOpen, setIsCustomerOpen] = useState(true);

  const [customer, setCustomer] = useState({
    name: '', address: '', gstin: '', lr_number: '', from: 'SIVAKASI', to: '', through: ''
  });

  const usernameFromStorage = localStorage.getItem('username');
  const created_by = (() => {
    if (!usernameFromStorage) return 'Admin';
    try {
      const parsed = JSON.parse(usernameFromStorage);
      return (typeof parsed === 'object' && parsed.name) ? parsed.name : parsed;
    } catch {
      return usernameFromStorage.trim() || 'Admin';
    }
  })();

  const shortenGodownName = (name) => 
    name?.replace(/_/g, ' ').trim().split(/\s+/).map(w => /^\d+$/.test(w) ? w : w.charAt(0).toUpperCase()).join('') || '';

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/godown`)
      .then(r => r.json())
      .then(d => setGodowns(d.map(g => ({ value: g.id, label: g.name, shortName:  shortenGodownName(g.name) }))));
  }, []);

  useEffect(() => {
    if (selectedGodown) {
      setStockLoading(true);
      fetch(`${API_BASE_URL}/api/godown/stock/${selectedGodown.value}`)
        .then(r => r.json())
        .then(data => {
          const filtered = data.filter(item => item.current_cases > 0);
          setStock(filtered.map(i => ({ ...i, id: Number(i.id) })));
        })
        .catch(() => setStock([]))
        .finally(() => setStockLoading(false));
    } else {
      setStock([]);
      setStockLoading(false);
    }
  }, [selectedGodown]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchQuery.length >= 2) {
        setGlobalLoading(true);
        fetch(`${API_BASE_URL}/api/search/global?name=${searchQuery}`)
          .then(r => r.json())
          .then(data => data.map(p => ({ 
            ...p, 
            shortGodown: shortenGodownName(p.godown_name),
            product_type: (p.product_type || '').toLowerCase().trim().replace(/\s+/g, '_')
          })))
          .then(setGlobalProducts)
          .catch(() => setGlobalProducts([]))
          .finally(() => setGlobalLoading(false));
      } else {
        setGlobalProducts([]);
        setGlobalLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const addToCart = (item) => {
    const godownName = selectedGodown?.shortName || shortenGodownName(item.godown_name) || item.godown_name;
    const safeProductType = (item.product_type || '')
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_') || 'unknown';

    const existingIdx = cart.findIndex(i => i.id === item.id);
    if (existingIdx !== -1) {
      const maxCases = item.current_cases || 999999;
      setCart(prev => prev.map((cItem, idx) => idx === existingIdx ? { ...cItem, cases: Math.min(cItem.cases + 1, maxCases) } : cItem));
    } else {
      setCart(prev => [...prev, {
        ...item,
        cases: 1,
        godown: godownName,
        product_type: safeProductType
      }]);
    }
  };

  const updateCases = (idx, val) => {
    const cases = Math.max(1, Math.min(val, cart[idx].current_cases || 999));
    setCart(prev => prev.map((i, i2) => i2 === idx ? { ...i, cases } : i));
  };

  const removeFromCart = (idx) => setCart(prev => prev.filter((_, i) => i !== idx));

  const generateChallan = async () => {
    if (!customer.name?.trim()) return setError('Party Name required');
    if (!customer.to?.trim()) return setError('Destination required');
    if (!customer.through?.trim()) return setError('Transport required');
    if (cart.length === 0) return setError('Add items to cart');

    setLoading(true);
    setError('');
    setSuccess('');

    const payload = {
      ...customer,
      items: cart.map(i => ({
        id: i.id,
        productname: i.productname,
        brand: i.brand || '',
        cases: i.cases,
        per_case: Math.max(1, i.per_case || 1),
        godown: i.godown,
        product_type: i.product_type
      })),
      created_by
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/challan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create challan');

      const fullData = { ...payload, challan_number: data.challan_number };
      setPdfData(fullData);
      setShowPDF(true);
      setSuccess(`Challan ${data.challan_number} created successfully!`);

      const blob = await pdf(<ChallanPDF data={fullData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Challan_${data.challan_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setCart([]);
      setCustomer({ name: '', address: '', gstin: '', lr_number: '', from: 'SIVAKASI', to: '', through: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const manualDownload = async () => {
    if (!pdfData) return;
    try {
      const blob = await pdf(<ChallanPDF data={pdfData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Challan_${pdfData.challan_number}.pdf`;
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Download failed. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <Logout />

      <div className="flex-1 pt-20 px-4 mobile:px-3">
        <div className="max-w-7xl mx-auto">

          <h1 className="text-5xl hundred:text-4xl mobile:text-2xl font-extrabold text-center mb-10 text-black dark:text-white">
            Delivery Challan
          </h1>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-5 rounded-xl mb-6 text-lg hundred:text-xl mobile:text-base">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-5 rounded-xl mb-6 flex items-center gap-3 text-lg hundred:text-xl mobile:text-base">
              <FaCheckCircle className="text-3xl" /> {success}
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden mb-20">
            <button
              onClick={() => setIsCustomerOpen(!isCustomerOpen)}
              className="w-full p-6 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-purple-700 text-white font-bold text-2xl hundred:text-3xl mobile:text-xl rounded-t-2xl hover:from-indigo-700 hover:to-purple-800 transition"
            >
              Customer & Transport Details
              {isCustomerOpen ? <FaChevronUp /> : <FaChevronDown />}
            </button>
            {isCustomerOpen && (
              <div className="p-8 mobile:p-5 grid hundred:grid-cols-4 mobile:grid-cols-1 gap-4">
                {[
                  { ph: "Party Name *", key: "name" },
                  { ph: "Address", key: "address" },
                  { ph: "GSTIN", key: "gstin" },
                  { ph: "L.R. Number", key: "lr_number" },
                  { ph: "From (default: SIVAKASI)", key: "from" },
                  { ph: "To *", key: "to" },
                  { ph: "Through *", key: "through" },
                ].map(field => (
                  <input
                    key={field.key}
                    type="text"
                    placeholder={field.ph}
                    value={customer[field.key]}
                    onChange={e => setCustomer({ ...customer, [field.key]: e.target.value })}
                    className="px-6 py-5 hundred:py-6 mobile:py-4 text-lg hundred:text-xl mobile:text-base border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-700 outline-none transition text-black dark:text-white"
                  />
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 mobile:p-5 mb-10 border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center mb-6 pb-4 border-b dark:border-gray-700">
                <h3 className="text-3xl mobile:text-2xl font-black text-black dark:text-white flex items-center gap-3">
                  Cart
                  <span className="bg-indigo-600 text-white text-sm px-3 py-1 rounded-full">{cart.length} item(s)</span>
                </h3>
                <button
                  onClick={() => setCart([])}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 rounded-xl text-sm font-bold transition flex items-center gap-2"
                >
                  <FaTrash /> Clear Cart
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-indigo-700 to-purple-800 text-white">
                    <tr>
                      {["S.No", "Brand", "Product", "Cases (+/-)", "Per", "Qty", "Godown", "Remove"].map(h => (
                        <th key={h} className="px-6 py-4 text-center font-bold text-lg hundred:text-xl mobile:text-base">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700/60 transition text-black dark:text-white">
                        <td className="px-6 py-5 text-center text-lg hundred:text-xl mobile:text-base">{i + 1}</td>
                        <td className="px-6 py-5 text-center text-lg hundred:text-xl mobile:text-base">{item.brand || '-'}</td>
                        <td className="px-6 py-5 text-center font-semibold text-lg hundred:text-xl mobile:text-base">{item.productname}</td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateCases(i, Math.max(1, item.cases - 1))}
                              className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-black dark:text-white font-bold text-xl flex items-center justify-center transition"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={item.current_cases}
                              value={item.cases}
                              onChange={e => updateCases(i, parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-2 text-center border-2 rounded-xl font-bold text-lg dark:bg-gray-900 text-black dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => updateCases(i, item.cases + 1)}
                              className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xl flex items-center justify-center transition"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center text-lg hundred:text-xl mobile:text-base">{item.per_case || 1}</td>
                        <td className="px-6 py-5 text-center font-bold text-green-600 dark:text-green-400 text-xl hundred:text-2xl mobile:text-lg">
                          {item.cases * (item.per_case || 1)}
                        </td>
                        <td className="px-6 py-5 text-center font-bold text-red-600 dark:text-red-400 text-xl hundred:text-2xl mobile:text-lg">{item.godown}</td>
                        <td className="px-6 py-5 text-center">
                          <button onClick={() => removeFromCart(i)} className="text-red-500 hover:text-red-700 text-2xl">
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 mobile:p-5 mb-10 border border-gray-100 dark:border-gray-700">
            <div className="relative">
              <FaSearch className="absolute left-6 top-6 text-gray-500 text-2xl" />
              <input
                type="text"
                placeholder="Search products across all godowns & press Enter..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && globalProducts.length > 0) {
                    e.preventDefault();
                    addToCart(globalProducts[0]);
                    setSearchQuery('');
                    setGlobalProducts([]);
                  }
                }}
                className="w-full pl-16 pr-8 py-6 text-xl hundred:text-2xl mobile:text-lg border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-indigo-400 outline-none transition text-black dark:text-white dark:bg-gray-900"
              />
              {globalLoading && <FaSpinner className="absolute right-6 top-7 animate-spin text-indigo-600 text-2xl" />}
            </div>

            {globalProducts.length > 0 && (
              <div className="mt-6 max-h-96 overflow-y-auto border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900">
                {globalProducts.map(p => (
                  <div
                    key={p.id}
                    onClick={() => { addToCart(p); setSearchQuery(''); setGlobalProducts([]); }}
                    className="p-6 border-b dark:border-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer transition"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <strong className="text-2xl hundred:text-3xl mobile:text-xl text-black dark:text-white">{p.productname}</strong>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold ml-4 text-lg hundred:text-xl mobile:text-base">({p.brand})</span>
                      </div>
                      <div className="text-right">
                        <div className="text-red-600 dark:text-red-400 font-bold text-2xl hundred:text-3xl mobile:text-xl">{p.shortGodown}</div>
                        <div className="text-gray-600 dark:text-gray-400 text-base hundred:text-lg mobile:text-sm">
                          {p.current_cases} cases • ₹{p.rate_per_box}/box
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-10">
            <Select
              options={godowns}
              value={selectedGodown}
              onChange={setSelectedGodown}
              placeholder="Select Godown to view stock"
              className="text-lg hundred:text-xl mobile:text-base"
              styles={{
                control: base => ({
                  ...base,
                  padding: 8,
                  borderRadius: 16,
                  backgroundColor: '#1f2937',
                  borderColor: '#374151',
                  color: '#ffffff'
                }),
                menu: base => ({ ...base, backgroundColor: '#1f2937', zIndex: 9999 }),
                singleValue: base => ({ ...base, color: '#ffffff' }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isFocused ? '#374151' : '#1f2937',
                  color: '#ffffff'
                })
              }}
            />
          </div>

          {selectedGodown && (
            <div className="mb-16">
              {stockLoading ? (
                <div className="text-center py-20">
                  <FaSpinner className="mx-auto text-6xl text-indigo-600 animate-spin" />
                  <p className="mt-6 text-2xl text-black dark:text-white">Loading stock...</p>
                </div>
              ) : stock.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
                  {stock.map(item => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 hover:shadow-2xl border border-gray-100 dark:border-gray-700 transform hover:-translate-y-2 transition duration-300"
                    >
                      <h4 className="font-bold text-xl hundred:text-2xl mobile:text-lg text-black dark:text-white truncate">
                        {item.productname}
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 mt-3 text-lg hundred:text-xl mobile:text-base">
                        Brand: <span className="font-bold text-indigo-600 dark:text-indigo-400">{item.brand || 'N/A'}</span>
                      </p>
                      <p className="text-gray-600 dark:text-gray-400 text-lg hundred:text-xl mobile:text-base">
                        Cases: <span className="font-bold text-green-600 dark:text-green-400">{item.current_cases}</span>
                      </p>
                      <button
                        onClick={() => addToCart(item)}
                        className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-bold py-4 rounded-xl text-lg hundred:text-xl mobile:text-base transition transform hover:scale-105 shadow-lg"
                      >
                        Add to Cart
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                  <p className="text-3xl font-bold text-gray-500 dark:text-gray-400">
                    No products found in this godown
                  </p>
                  <p className="mt-4 text-xl text-gray-400">Try selecting another godown</p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-center mt-12 mobile:mt-8 mb-10">
            <button
              onClick={generateChallan}
              disabled={loading || cart.length === 0}
              className="px-12 py-5 mobile:px-8 mobile:py-4 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-black text-xl hundred:text-2xl mobile:text-lg rounded-2xl shadow-2xl transition transform hover:scale-105 disabled:scale-100"
            >
              {loading ? (
                <>Generating... <FaSpinner className="inline ml-3 animate-spin" /></>
              ) : (
                "Generate Delivery Challan"
              )}
            </button>
          </div>
        </div>
      </div>

      {showPDF && pdfData && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 mobile:p-2">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-5xl mobile:max-w-full mobile:mx-2 h-5/6 mobile:h-full flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white p-6 mobile:p-4 flex justify-between items-center">
              <h3 className="text-4xl mobile:text-2xl font-bold">Challan: {pdfData.challan_number}</h3>
              <button onClick={() => setShowPDF(false)} className="text-6xl mobile:text-5xl hover:text-red-300">×</button>
            </div>

            <PDFViewer width="100%" height="100%" className="flex-1">
              <ChallanPDF data={pdfData} />
            </PDFViewer>

            <div className="p-6 mobile:p-4 bg-gray-100 dark:bg-gray-800 text-center">
              <button
                onClick={manualDownload}
                className="bg-green-600 hover:bg-green-700 text-white px-12 py-4 rounded-2xl font-bold text-xl shadow-lg transition flex items-center gap-3 mx-auto"
              >
                <FaDownload className="text-2xl" /> Download PDF Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}