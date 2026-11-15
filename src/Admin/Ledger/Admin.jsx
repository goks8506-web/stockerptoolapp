import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../../Config";
import Sidebar from "../Sidebar/Sidebar";
import Logout from "../../Admin/Logout";

export default function Admin() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [newBankName, setNewBankName] = useState("");
  const [showAddBank, setShowAddBank] = useState(false);
  const [targetAdminForBank, setTargetAdminForBank] = useState(null);
  const [filterType, setFilterType] = useState("");
  const [showModal, setShowModal] = useState(false);
  const loggedIn = localStorage.getItem("username");

  const fetchAdmins = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/admins`);
      setAdmins(data);
    } catch (err) {
      setError("Failed to load admins");
    }
  };

  const createAdmin = async (e) => {
    e.preventDefault();
    if (!username) return;
    try {
      await axios.post(`${API_BASE_URL}/api/admins`, { username });
      setSuccess("Admin created!");
      setUsername("");
      fetchAdmins();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Error creating admin");
      setTimeout(() => setError(""), 3000);
    }
  };

  const selectAdmin = async (admin) => {
    setSelectedAdmin(admin);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/admins/${admin.id}/transactions`);
      setTransactions(data);

      const banks = await axios.get(`${API_BASE_URL}/api/admins/${admin.username}/bank-accounts`);
      setBankAccounts(banks.data);
    } catch (err) {
      setError("Failed to load data");
    }
    setFilterType("");
    setShowModal(true);
  };

  const openAddBank = (admin) => {
    setTargetAdminForBank(admin);
    setNewBankName("");
    setShowAddBank(true);
  };

  const addBank = async (e) => {
    e.preventDefault();
    if (!newBankName.trim()) return setError("Bank name required");

    try {
      await axios.post(`${API_BASE_URL}/api/admins/bank-accounts`, {
        username: targetAdminForBank.username,
        bank_name: newBankName.trim()
      });

      setSuccess(`Bank added to ${targetAdminForBank.username}`);
      setNewBankName("");
      setShowAddBank(false);

      if (selectedAdmin?.username === targetAdminForBank.username) {
        const { data } = await axios.get(`${API_BASE_URL}/api/admins/${targetAdminForBank.username}/bank-accounts`);
        setBankAccounts(data);
      }

      fetchAdmins();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add bank");
      setTimeout(() => setError(""), 3000);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const filtered = filterType === "cash"
    ? transactions.filter(t => t.payment_method === "cash")
    : filterType
      ? transactions.filter(t => t.bank_name === filterType)
      : transactions;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 hundred:ml-64 p-4 md:p-8 pt-20 hundred:pt-8">
      <Sidebar />
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="pl-12 hundred:pl-0">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Admin & Banking Accounts
            </h1>
            <p className="text-xs text-slate-400 mt-1">Manage collectors, banks, and transaction histories</p>
          </div>
          <Logout />
        </div>

        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-semibold text-center">
            {success}
          </div>
        )}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {/* Create Admin Form */}
        <div className="max-w-md mx-auto bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Create Collector / Admin
          </h2>
          <form onSubmit={createAdmin} className="space-y-4">
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition"
            />
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/20 transition"
            >
              Create Account
            </button>
          </form>
        </div>

        {/* Admin Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {admins.map((a) => (
            <div
              key={a.id}
              className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 shadow-xl hover:border-slate-700 transition space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                  {a.username}
                  {a.username === loggedIn && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                      You
                    </span>
                  )}
                </h3>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 font-bold border border-indigo-500/20">
                  ₹{parseFloat(a.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <p className="text-slate-400">
                  <strong className="text-slate-300">Banks:</strong>{' '}
                  {a.bank_name && a.bank_name.length > 0 ? (
                    <span className="text-slate-200">{a.bank_name.join(", ")}</span>
                  ) : (
                    <span className="text-slate-500 italic">None attached</span>
                  )}
                </p>
                <p className="text-slate-400">
                  <strong className="text-slate-300">Total Collected:</strong>{' '}
                  <span className="text-emerald-400 font-semibold">₹{parseFloat(a.total || 0).toFixed(2)}</span>
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => openAddBank(a)}
                  className="flex-1 py-2.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold rounded-xl transition"
                >
                  + Add Bank
                </button>
                <button
                  onClick={() => selectAdmin(a)}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/20"
                >
                  Transactions
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Bank Modal */}
        {showAddBank && targetAdminForBank && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-md shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-white">
                Add Bank for <span className="text-indigo-400">{targetAdminForBank.username}</span>
              </h3>
              <form onSubmit={addBank} className="space-y-4">
                <input
                  type="text"
                  placeholder="Bank Name (e.g. SBI, HDFC, ICICI)"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                  required
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddBank(false);
                      setTargetAdminForBank(null);
                    }}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
                  >
                    Save Bank
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Transaction History Modal */}
        {showModal && selectedAdmin && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900/95 border border-slate-800 p-6 rounded-3xl w-full max-w-5xl max-h-[85vh] overflow-y-auto shadow-2xl space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800 sticky top-0 bg-slate-900/90 backdrop-blur-md z-10">
                <h3 className="text-xl font-extrabold text-white">
                  Transactions: <span className="text-indigo-400">{selectedAdmin.username}</span>
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All Payment Types</option>
                  <option value="cash">Cash Only</option>
                  {bankAccounts.map((b) => (
                    <option key={b} value={b}>
                      Bank: {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3.5 text-left font-bold uppercase tracking-wider">Bill #</th>
                      <th className="p-3.5 text-left font-bold uppercase tracking-wider">Customer</th>
                      <th className="p-3.5 text-right font-bold uppercase tracking-wider">Amount</th>
                      <th className="p-3.5 text-left font-bold uppercase tracking-wider">Method</th>
                      <th className="p-3.5 text-left font-bold uppercase tracking-wider">Bank</th>
                      <th className="p-3.5 text-left font-bold uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-500 font-medium">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      filtered.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 text-indigo-400 font-bold">{t.bill_number}</td>
                          <td className="p-3 text-slate-200 font-medium">{t.customer_name}</td>
                          <td className="p-3 text-right font-bold text-emerald-400">
                            ₹{parseFloat(t.amount_paid).toFixed(2)}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                t.payment_method === "cash"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              }`}
                            >
                              {t.payment_method.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300">{t.bank_name || "—"}</td>
                          <td className="p-3 text-slate-400">
                            {new Date(t.transaction_date).toLocaleDateString("en-IN")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}