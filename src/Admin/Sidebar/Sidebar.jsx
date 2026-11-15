// src/components/Sidebar/Sidebar.jsx
import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  FaBox, FaList, FaChartBar, FaSearch, FaChartLine, FaBars, FaTimes,
  FaPlus, FaWarehouse, FaAngleDown, FaAngleUp, FaUser, FaMoneyBill,
  FaMoneyBillAlt, FaBook, FaTruck, FaCreditCard, FaAddressBook, FaEye,
  FaIndustry, FaFileAlt, FaClipboardList, FaLayerGroup, FaShieldAlt
} from "react-icons/fa";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [openSections, setOpenSections] = useState({});
  const location = useLocation();

  const userType = localStorage.getItem("userType") || "worker";
  const userName = localStorage.getItem("username") || "User";

  const can = {
    inventory: userType === "admin",
    godown: userType === "admin",
    billing: userType === "admin",
    salesAccounts: ["admin", "worker"].includes(userType),
    godownReports: userType === "admin",
    delivery: ["admin", "agent", "worker"].includes(userType),
    analysis: userType === "admin",
    search: ["admin", "agent", "worker"].includes(userType),
    analytics: userType === "admin",
    profile: userType === "admin",
  };

  const navItems = [
    {
      name: "Inventory",
      allowed: can.inventory,
      icon: <FaBox className="text-indigo-400" />,
      subItems: [
        { name: "Add Product", path: "/inventory", icon: <FaPlus className="text-xs" /> },
        { name: "Listing", path: "/listing", icon: <FaList className="text-xs" /> },
      ],
    },
    {
      name: "Godown",
      allowed: can.godown,
      icon: <FaWarehouse className="text-amber-400" />,
      subItems: [
        { name: "Add Stock", path: "/godown", icon: <FaPlus className="text-xs" /> },
        { name: "View Stocks", path: "/viewstock", icon: <FaList className="text-xs" /> },
      ],
    },
    {
      name: "Billing",
      allowed: can.billing,
      icon: <FaMoneyBillAlt className="text-emerald-400" />,
      subItems: [
        { name: "Create Bill", path: "/book", icon: <FaMoneyBill className="text-xs" /> },
        { name: "Overall Billings", path: "/allbookings", icon: <FaList className="text-xs" /> },
      ],
    },
    {
      name: "Sales Accounts",
      allowed: can.salesAccounts,
      icon: <FaBook className="text-blue-400" />,
      subItems: [
        { name: "Admin Accounts", path: "/adm", icon: <FaBook className="text-xs" /> },
        { name: "Customer Ledger", path: "/ledger", icon: <FaBook className="text-xs" /> },
        { name: "Dispatch", path: "/dispatch", icon: <FaTruck className="text-xs" /> },
        { name: "Payments", path: "/payments", icon: <FaCreditCard className="text-xs" /> },
      ],
    },
    { name: "Godown Reports", path: "/reports/godown", icon: <FaWarehouse className="text-amber-400" />, allowed: can.godownReports },
    { name: "Delivery Challan", path: "/delivery", icon: <FaTruck className="text-teal-400" />, allowed: can.delivery },
    { name: "Overall Stocks", path: "/analysis", icon: <FaChartBar className="text-emerald-400" />, allowed: can.analysis },
    { name: "Search Products", path: "/search", icon: <FaSearch className="text-sky-400" />, allowed: can.search },
    { name: "Analytics", path: "/analytics", icon: <FaChartLine className="text-purple-400" />, allowed: can.analytics },
    { name: "Profile", path: "/profile", icon: <FaUser className="text-rose-400" />, allowed: can.profile },
  ];

  // Auto-expand active section based on location.pathname
  useEffect(() => {
    const activeSection = navItems.find(item =>
      item.subItems && item.subItems.some(sub => location.pathname === sub.path)
    );
    if (activeSection) {
      setOpenSections(prev => ({ ...prev, [activeSection.name]: true }));
    }
  }, [location.pathname]);

  const toggleSection = (name) => setOpenSections(prev => ({ ...prev, [name]: !prev[name] }));

  return (
    <>
      {!isOpen && (
        <button
          className="hundred:hidden fixed top-4 left-4 z-50 text-white bg-slate-900/90 backdrop-blur-md border border-slate-700 p-3 rounded-2xl shadow-2xl hover:scale-105 transition"
          onClick={() => setIsOpen(true)}
        >
          <FaBars size={20} />
        </button>
      )}

      <div
        className={`fixed top-0 left-0 h-screen bg-slate-950/95 backdrop-blur-xl text-slate-100 flex flex-col transition-all duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"
          } hundred:translate-x-0 w-64 z-40 border-r border-slate-800 shadow-2xl`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 bg-gradient-to-r from-indigo-950/50 via-slate-900 to-purple-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 font-black text-xl">
              E
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                ERP STOCK
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-semibold text-emerald-400 tracking-wide uppercase">{userType}</span>
              </div>
            </div>
          </div>
          <button className="hundred:hidden text-slate-400 hover:text-white p-2" onClick={() => setIsOpen(false)}>
            <FaTimes size={20} />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
          {navItems.map((item) => {
            if (!item.allowed) return null;
            const sectionOpen = openSections[item.name] || false;
            const isSubActive = item.subItems?.some(sub => location.pathname === sub.path);

            return (
              <div key={item.name} className="mb-1">
                {item.subItems ? (
                  <div>
                    <button
                      type="button"
                      className={`w-full py-2.5 px-3 text-xs font-bold uppercase tracking-wider flex items-center justify-between rounded-xl transition-all ${isSubActive
                        ? "text-indigo-400 bg-indigo-950/40 border border-indigo-800/50"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                        }`}
                      onClick={() => toggleSection(item.name)}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-sm">{item.icon}</span>
                        {item.name}
                      </span>
                      {sectionOpen ? <FaAngleUp className="text-xs" /> : <FaAngleDown className="text-xs" />}
                    </button>

                    <div
                      className={`pl-2 mt-1 space-y-1 overflow-hidden transition-all duration-300 ${sectionOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                        }`}
                    >
                      {item.subItems.map((sub) => (
                        <NavLink
                          key={sub.name}
                          to={sub.path}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 py-2 px-3 text-xs font-medium rounded-lg transition-all relative ${isActive
                              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-md shadow-indigo-500/20"
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/80"
                            }`
                          }
                          onClick={() => setIsOpen(false)}
                        >
                          <span className="opacity-70">{sub.icon}</span>
                          {sub.name}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ) : (
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 py-2.5 px-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${isActive
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-md shadow-indigo-500/20"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/80"
                      }`
                    }
                    onClick={() => setIsOpen(false)}
                  >
                    <span className="text-sm">{item.icon}</span>
                    {item.name}
                  </NavLink>
                )}
              </div>
            );
          })}
        </nav>

        {/* Profile Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/80">
          <div className="flex items-center gap-3 p-2 bg-slate-900/80 rounded-xl border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-indigo-900/60 border border-indigo-700/50 flex items-center justify-center text-indigo-300 font-bold text-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate capitalize">{userName}</p>
              <p className="text-[10px] text-slate-500 truncate capitalize">{userType} account</p>
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="hundred:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-30" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
}