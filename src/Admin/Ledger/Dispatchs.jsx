import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../../Config";
import Sidebar from "../Sidebar/Sidebar";
import Logout from "../../Admin/Logout";
import Modal from "react-modal";
import {
  FaSearch,
  FaTruck,
  FaCheckCircle,
  FaTimes,
  FaDownload,
} from "react-icons/fa";

import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

Modal.setAppElement("#root");

const pdfStyles = StyleSheet.create({
  page: { padding: 40, backgroundColor: "#fff" },
  mainTitle: { fontSize: 36, textAlign: "center", marginBottom: 6, fontWeight: "bold", color: "#b91c1c" },
  tagline: { fontSize: 11, textAlign: "center", marginBottom: 30, color: "#666", fontStyle: "italic" },

  headerSection: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  customerInfo: { flex: 1 },
  challanInfo: { width: 200, textAlign: "right" },

  label: { fontSize: 12, fontWeight: "bold", marginBottom: 4 },
  valueBold: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  value: { fontSize: 11, color: "#444", marginBottom: 3 },

  bold: { fontWeight: "bold" },
  boldRed: { fontWeight: "bold", color: "#dc2626" },

  table: { marginTop: 20, border: "1px solid #000" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#1e3a8a", color: "white" },
  tableRow: { flexDirection: "row", minHeight: 38, alignItems: "center" },
  th: { padding: 10, fontSize: 10, fontWeight: "bold", textAlign: "center" },
  td: { padding: 8, fontSize: 10, textAlign: "center", borderBottom: "0.5px solid #ccc" },

  totalBox: { marginTop: 30, padding: 16, backgroundColor: "#fef3c7", borderRadius: 10, alignItems: "center" },
  totalText: { fontSize: 16, fontWeight: "bold", color: "#92400e" },

  transportBox: { marginTop: 35, padding: 18, backgroundColor: "#f0f9ff", borderRadius: 10, fontSize: 12, border: "1px dashed #3b82f6" },
  transportTitle: { fontSize: 15, fontWeight: "bold", marginBottom: 10, color: "#1e40af" },

  footer: { position: "absolute", bottom: 40, left: 0, right: 0, textAlign: "center", fontSize: 9, color: "#666" },
});

const DeliveryChallanPDF = ({ booking, dispatches, dispatchDate }) => {
  const totalCases = dispatches.reduce((s, d) => s + d.cases, 0);
  const totalQty = dispatches.reduce((s, d) => s + d.qty, 0);

  const formattedDate = dispatchDate
    ? new Date(dispatchDate).toLocaleDateString("en-IN")
    : new Date().toLocaleDateString("en-IN");

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.mainTitle}>DELIVERY CHALLAN</Text>
        <Text style={pdfStyles.tagline}>Goods Once Sold Will Not Be Taken Back or Exchanged</Text>

        <View style={pdfStyles.headerSection}>
          <View style={pdfStyles.customerInfo}>
            <Text style={pdfStyles.label}>To:</Text>
            <Text style={pdfStyles.valueBold}>{booking.customer_name}</Text>
            {booking.address && <Text style={pdfStyles.value}>{booking.address}</Text>}
            {booking.gstin && <Text style={pdfStyles.value}>GSTIN: {booking.gstin || 'N/A'}</Text>}
          </View>

          <View style={pdfStyles.challanInfo}>
            <Text style={{ fontSize: 13 }}>
              Date: <Text style={pdfStyles.bold}>{formattedDate}</Text>
            </Text>
            <Text style={{ fontSize: 11, marginTop: 8 }}>
              Challan No: <Text style={pdfStyles.bold}>DC-{booking.bill_number}</Text>
            </Text>
          </View>
        </View>

        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeaderRow}>
            <Text style={[pdfStyles.th, { width: "7%" }]}>S.No</Text>
            <Text style={[pdfStyles.th, { width: "20%" }]}>Brand</Text>
            <Text style={[pdfStyles.th, { width: "38%" }]}>Product Description</Text>
            <Text style={[pdfStyles.th, { width: "11%" }]}>Cases</Text>
            <Text style={[pdfStyles.th, { width: "11%" }]}>Per Case</Text>
            <Text style={[pdfStyles.th, { width: "11%" }]}>Qty</Text>
            <Text style={[pdfStyles.th, { width: "22%" }]}>From Godown</Text>
          </View>

          {dispatches.map((item, i) => (
            <View style={pdfStyles.tableRow} key={i}>
              <Text style={[pdfStyles.td, { width: "7%" }]}>{i + 1}</Text>
              <Text style={[pdfStyles.td, { width: "20%" }]}>{item.brand}</Text>
              <Text style={[pdfStyles.td, { width: "38%", textAlign: "center", paddingLeft: 10 }]}>
                {item.product_name}
              </Text>
              <Text style={[pdfStyles.td, { width: "11%" }]}>{item.cases}</Text>
              <Text style={[pdfStyles.td, { width: "11%" }]}>{item.per_case}</Text>
              <Text style={[pdfStyles.td, { width: "11%" }]}>{item.qty}</Text>
              <Text style={[pdfStyles.td, { width: "22%", color: "#dc2626", fontWeight: "bold" }]}>
                {item.godown || "Main Godown"}
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
          <Text style={pdfStyles.transportTitle}>Transport Details</Text>
          <Text style={{ marginTop: 2 }}>From      : {booking.from || "SIVAKASI"}</Text>
          <Text style={{ marginTop: 2 }}>To        : {booking.to || "N/A"}</Text>
          <Text style={{ marginTop: 2 }}>Through   : <Text style={pdfStyles.boldRed}>{booking.through || "Own Transport"}</Text></Text>
          {booking.lr_number && (
            <Text style={{ marginTop: 2 }}>LR Number : <Text style={pdfStyles.boldRed}>{booking.lr_number || 'N/A'}</Text></Text>
          )}
        </View>

        <Text style={pdfStyles.footer}>
          This is a computer-generated Delivery Challan • Subject to Sivakasi Jurisdiction
        </Text>
      </Page>
    </Document>
  );
};

const PAGE_SIZE = 9;

export default function Dispatch() {
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState("PENDING");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [caseDispatches, setCaseDispatches] = useState({});
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [bookRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/booking`),
        ]);

        const logRes = await axios.get(`${API_BASE_URL}/api/dispatch_logs/all`);

        const dispatchedMapGlobal = {};

        logRes.data.forEach(log => {
          const key = `${log.booking_id}-${log.product_index}`;
          dispatchedMapGlobal[key] = (dispatchedMapGlobal[key] || 0) + (log.dispatched_cases || 0);
        });

        const enriched = bookRes.data.map((b) => {
          const items = typeof b.items === "string" ? JSON.parse(b.items || "[]") : b.items || [];

          const dispatchedMap = {};
          items.forEach((p, idx) => {
            const key = `${b.id}-${idx}`;
            dispatchedMap[idx] = dispatchedMapGlobal[key] || 0;
          });

          return {
            ...b,
            products: items.map((p, idx) => ({
              ...p,
              productname: p.productname || p.product_name || "Unknown",
              cases: parseInt(p.cases) || 0,
              per_case: parseInt(p.per_case) || 1,
              rate_per_box: parseFloat(p.rate_per_box) || 0,
              discount_percent: parseFloat(p.discount_percent) || 0,
              brand: p.brand || "",
              godown: p.godown || "Main Godown",
            })),
            dispatchedMap,
            through: b.through || "Own Transport",
            lr_number: b.lr_number || null,
            from: b.from || "SIVAKASI",
            to: b.to || "",
          };
        });

        setBookings(enriched);
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load bookings & dispatch logs");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getTotalCases = (b) => b.products.reduce((s, p) => s + (parseInt(p.cases) || 0), 0);
  const getDispatchedCases = (b) => Object.values(b.dispatchedMap).reduce((s, v) => s + v, 0);
  const isPending = (b) => getDispatchedCases(b) < getTotalCases(b);
  const isCompleted = (b) => getDispatchedCases(b) >= getTotalCases(b);

  const filtered = bookings
    .filter((b) => (tab === "PENDING" ? isPending(b) : isCompleted(b)))
    .filter((b) =>
      [b.bill_number, b.customer_name, b.through, b.lr_number].some((f) =>
        f?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openModal = (booking) => {
    setSelectedBooking(booking);
    setCaseDispatches({});
    setDispatchDate(new Date().toISOString().split("T")[0]);
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedBooking(null);
    setCaseDispatches({});
    setIsModalOpen(false);
  };

  const handleDispatch = async () => {
    if (!selectedBooking) return;
    setError("");

    const toDispatch = selectedBooking.products
      .map((p, idx) => {
        const already = parseFloat(selectedBooking.dispatchedMap[idx] || 0);
        const totalCs = parseFloat(p.cases || 0);
        const remaining = Math.max(0, totalCs - already);
        const input = parseFloat(caseDispatches[idx]) || 0;
        const cases = Math.min(input, remaining);
        if (cases <= 0) return null;

        const per = parseFloat(p.per_case || 1);
        return {
          product_index: idx,
          product_name: p.productname,
          brand: p.brand || "",
          cases,
          per_case: per,
          qty: Math.round(cases * per),
          rate_per_box: parseFloat(p.rate_per_box) || 0,
          discount_percent: parseFloat(p.discount_percent) || 0,
          godown: p.godown || "Main Godown",
        };
      })
      .filter(Boolean);

    if (toDispatch.length === 0) {
      setError("Please enter at least one case (or piece fraction) to dispatch");
      return;
    }

    try {
      setLoading(true);

      await axios.post(`${API_BASE_URL}/api/dispatch`, {
        booking_id: selectedBooking.id,
        dispatches: toDispatch.map(d => ({
          product_index: d.product_index,
          product_name: d.product_name,
          brand: d.brand,
          dispatched_cases: d.cases,
          dispatched_qty: d.qty,
          rate_per_box: d.rate_per_box,
          discount_percent: d.discount_percent,
          godown: d.godown,
        })),
        through: selectedBooking.through || "Own Transport",
        lr_number: selectedBooking.lr_number || null,
        dispatch_date: dispatchDate,
      });

      const blob = await pdf(
        <DeliveryChallanPDF
          booking={{
            ...selectedBooking,
            through: selectedBooking.through || "Own Transport",
            lr_number: selectedBooking.lr_number || "Not Specified",
          }}
          dispatches={toDispatch}
          dispatchDate={dispatchDate}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `DC_${selectedBooking.bill_number}_${selectedBooking.customer_name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      setSuccess("Dispatched & Challan Generated!");
      setTimeout(() => setSuccess(""), 5000);

      // Update UI
      setBookings(prev =>
        prev.map(b =>
          b.id === selectedBooking.id
            ? {
              ...b,
              dispatchedMap: {
                ...b.dispatchedMap,
                ...Object.fromEntries(toDispatch.map(d => [d.product_index, (b.dispatchedMap[d.product_index] || 0) + d.cases])),
              },
            }
            : b
        )
      );

      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || "Dispatch failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 hundred:ml-64 p-4 md:p-8 pt-20 hundred:pt-8">
      <Sidebar />
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="pl-12 hundred:pl-0">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
              <span className="p-2 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20"><FaTruck /></span>
              Dispatch Management
            </h1>
            <p className="text-xs text-slate-400 mt-1">Track pending orders, dispatches, and delivery challans</p>
          </div>
          <Logout />
        </div>

        {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-semibold text-center">{error}</div>}
        {success && <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-semibold text-center flex items-center justify-center gap-2"><FaCheckCircle /> {success}</div>}

        {/* Tab Switcher & Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center p-1.5 bg-slate-900 border border-slate-800 rounded-2xl">
            <button
              onClick={() => { setTab("PENDING"); setCurrentPage(1); }}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${tab === "PENDING"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-slate-400 hover:text-white"
                }`}
            >
              Pending ({bookings.filter(isPending).length})
            </button>
            <button
              onClick={() => { setTab("COMPLETED"); setCurrentPage(1); }}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${tab === "COMPLETED"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20"
                  : "text-slate-400 hover:text-white"
                }`}
            >
              Completed ({bookings.filter(isCompleted).length})
            </button>
          </div>

          <div className="relative w-full md:w-96">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by Bill No, Customer, LR..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs transition"
            />
          </div>
        </div>

        {/* Dispatch Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {paginated.map((b) => {
            const total = getTotalCases(b);
            const done = getDispatchedCases(b);
            const left = total - done;

            return (
              <div
                key={b.id}
                className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-5 shadow-xl hover:border-slate-700 transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-extrabold text-indigo-400 bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-800/40 text-sm">
                      #{b.bill_number}
                    </span>
                    {tab === "COMPLETED" && (
                      <span className="p-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <FaCheckCircle size={16} />
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">{b.customer_name}</h3>
                  <p className="text-xs text-slate-400">
                    <span className="text-slate-500">Via:</span> {b.through || "Own"} &nbsp;|&nbsp; <span className="text-slate-500">LR:</span> {b.lr_number || "—"}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800/60">
                  <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/50">
                    <p className="text-xl font-extrabold text-white">{total}</p>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total</p>
                  </div>
                  <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/50">
                    <p className="text-xl font-extrabold text-emerald-400">{done}</p>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Done</p>
                  </div>
                  <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/50">
                    <p className="text-xl font-extrabold text-amber-400">{left}</p>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Left</p>
                  </div>
                </div>

                {tab === "PENDING" && left > 0 && (
                  <button
                    onClick={() => openModal(b)}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    <FaTruck /> Dispatch Now
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-6">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-9 h-9 rounded-xl font-bold text-xs transition ${currentPage === i + 1
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full mx-4 my-6 outline-none overflow-y-auto max-h-[90vh] text-slate-100"
        overlayClassName="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
      >
        {selectedBooking && (
          <div className="p-6 md:p-8 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h2 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
                <span className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20"><FaTruck /></span>
                Dispatch Order: #{selectedBooking.bill_number}
              </h2>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition">
                <FaTimes size={18} />
              </button>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-6 rounded-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xl font-bold text-white">{selectedBooking.customer_name}</p>
                  {selectedBooking.address && <p className="text-xs text-slate-400 mt-1">{selectedBooking.address}</p>}
                  {selectedBooking.gstin && <p className="text-xs text-slate-500 mt-0.5">GSTIN: {selectedBooking.gstin}</p>}
                </div>
                <div className="space-y-1.5 text-xs">
                  <p><strong className="text-slate-400">Through:</strong> <span className="font-bold text-indigo-400">{selectedBooking.through || "Own Transport"}</span></p>
                  <p><strong className="text-slate-400">LR No:</strong> <span className="font-bold text-rose-400">{selectedBooking.lr_number || "Not Specified"}</span></p>
                  <p className="text-slate-400">
                    From: <span className="text-slate-200">{selectedBooking.from || "SIVAKASI"}</span> → To: <span className="text-slate-200">{selectedBooking.to || "-"}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white mb-0.5">Dispatch Date *</label>
                <p className="text-[11px] text-slate-400">Select the date on which these cases are dispatched</p>
              </div>
              <input
                type="date"
                value={dispatchDate}
                onChange={e => setDispatchDate(e.target.value)}
                className="px-4 py-2 border rounded-xl font-semibold text-xs bg-slate-900 text-white border-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <h3 className="text-base font-bold text-white uppercase tracking-wider">Select Cases to Dispatch</h3>
            <div className="space-y-4">
              {selectedBooking.products.map((p, idx) => {
                const already = parseFloat(selectedBooking.dispatchedMap[idx] || 0);
                const totalCases = parseFloat(p.cases || 0);
                const per = parseFloat(p.per_case || 1);
                const remaining = Math.max(0, Math.round((totalCases - already) * 100) / 100);

                return (
                  <div key={idx} className="border border-slate-800 rounded-2xl p-5 bg-slate-950/60 hover:border-slate-700 transition">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-base font-bold text-white">{p.productname}</p>
                        {p.brand && <p className="text-xs text-slate-400">Brand: {p.brand}</p>}
                        <p className="text-xs text-slate-500">Per Case: {per} pcs</p>
                      </div>
                      <div className="text-left md:text-right space-y-1 text-xs">
                        <p className="text-slate-400">Total: <strong className="text-indigo-400">{totalCases} cs</strong> ({Math.round(totalCases * per)} pcs)</p>
                        <p className="text-slate-400">Dispatched: <strong className="text-emerald-400">{already} cs</strong> ({Math.round(already * per)} pcs)</p>
                        <p className="text-slate-400">Remaining: <strong className="text-amber-400">{remaining} cs</strong> ({Math.round(remaining * per)} pcs)</p>
                      </div>
                    </div>

                    {remaining > 0 ? (
                      <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-end gap-3 text-xs">
                        <label className="text-slate-400 font-medium">Cases to Dispatch (fraction/pieces allowed):</label>
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          max={remaining}
                          className="w-32 px-3 py-1.5 border border-slate-800 rounded-xl text-sm font-bold text-center bg-slate-900 text-white focus:outline-none focus:border-indigo-500"
                          onChange={(e) => setCaseDispatches({ ...caseDispatches, [idx]: e.target.value })}
                          placeholder={`Max: ${remaining}`}
                        />
                        {caseDispatches[idx] && (
                          <span className="text-xs font-semibold text-indigo-400">
                            = {Math.round(parseFloat(caseDispatches[idx] || 0) * per)} pcs
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 pt-3 border-t border-slate-800/60 text-right text-xs font-bold text-emerald-400">Fully Dispatched</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={closeModal} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition">
                Cancel
              </button>
              <button
                onClick={handleDispatch}
                disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-600/20 transition"
              >
                {loading ? "Processing..." : <><FaDownload /> Generate Challan</>}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}