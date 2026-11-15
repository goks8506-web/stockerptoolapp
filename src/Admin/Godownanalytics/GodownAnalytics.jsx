import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../Logout';
import { API_BASE_URL } from '../../../Config';
import { FaDownload, FaChevronLeft, FaChevronRight, FaSpinner, FaChartLine, FaWarehouse, FaBoxes } from 'react-icons/fa';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function GodownAnalytics() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('month');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/analytics/all?period=${period}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load');
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    setPage(0);
  }, [period]);

  const exportExcel = () => {
    window.location.href = `${API_BASE_URL}/api/analytics/all/export`;
  };

  const capitalize = str =>
    str ? str.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 hundred:ml-64 flex items-center justify-center p-6">
        <Sidebar />
        <Logout />
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl backdrop-blur-md">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-4 animate-spin">
            <FaSpinner />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Loading Analytics</h3>
          <p className="text-xs text-slate-400">Aggregating godown intake & dispatch data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 hundred:ml-64 flex items-center justify-center p-6">
        <Sidebar />
        <Logout />
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <p className="text-rose-400 text-sm font-semibold">{error || 'No analytics data available'}</p>
        </div>
      </div>
    );
  }

  const { chart, totals, topProducts, agentPerformance } = data;

  if (!chart || chart.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 hundred:ml-64 flex items-center justify-center p-6">
        <Sidebar />
        <Logout />
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <p className="text-slate-400 text-sm">No godowns found to analyze.</p>
        </div>
      </div>
    );
  }

  const currentGodown = chart[page];
  const totalPages = chart.length;
  const godownId = Number(currentGodown.godownId);
  const currentTotals = totals.find(t => t.godownId === godownId) || { intake: 0, outtake: 0 };

  const barData = {
    labels: currentGodown.labels,
    datasets: [
      {
        label: 'Inward (Added)',
        data: currentGodown.intake,
        backgroundColor: '#10b981',
        borderRadius: 8,
      },
      {
        label: 'Outward (Taken)',
        data: currentGodown.outtake,
        backgroundColor: '#ef4444',
        borderRadius: 8,
      },
    ],
  };

  const pieData = {
    labels: currentGodown.productNames,
    datasets: [
      {
        data: currentGodown.productIntake,
        backgroundColor: ['#10b981', '#06b6d4', '#6366f1', '#ec4899', '#f59e0b', '#8b5cf6'],
        borderWidth: 2,
        borderColor: '#0f172a',
      },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 hundred:ml-64 p-4 md:p-8 pt-20 hundred:pt-8 transition-colors duration-200">
      <Sidebar />
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-inner">
                <FaChartLine className="text-xl" />
              </span>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white capitalize">
                {currentGodown.godownName.replace(/_/g, ' ')} Analytics
              </h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Visual analytics for stock inflows, outflows, and agent distribution trends.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-500/20 transition hover:scale-[1.02]"
            >
              <FaDownload className="text-xs" /> Export Report
            </button>
            <Logout />
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex justify-center mb-8">
          <div className="p-1 bg-slate-900 border border-slate-800 rounded-2xl flex gap-1 shadow-inner">
            {['day', 'month', 'year'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                  period === p
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Total Inward</span>
            <p className="text-3xl font-black text-emerald-400">{currentTotals.intake} <span className="text-sm font-normal text-slate-400">cs</span></p>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Total Outward</span>
            <p className="text-3xl font-black text-rose-400">{currentTotals.outtake} <span className="text-sm font-normal text-slate-400">cs</span></p>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Net Stock Shift</span>
            <p className="text-3xl font-black text-sky-400">{currentTotals.intake - currentTotals.outtake} <span className="text-sm font-normal text-slate-400">cs</span></p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-4">Inflow vs Outflow Over Time</h3>
            <div className="h-64 sm:h-80">
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { labels: { color: '#94a3b8' } } },
                  scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(51,65,85,0.2)' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(51,65,85,0.2)' }, beginAtZero: true },
                  },
                }}
              />
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-4">Product Inflow Proportion</h3>
            <div className="h-64 sm:h-80 flex items-center justify-center">
              <Pie
                data={pieData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { labels: { color: '#94a3b8' }, position: 'bottom' },
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* Godown Switcher Carousel */}
        <div className="flex justify-center items-center gap-4 mb-10 bg-slate-900/60 border border-slate-800 p-3 rounded-2xl max-w-xs mx-auto">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
          >
            <FaChevronLeft className="text-xs" />
          </button>

          <div className="text-center px-4">
            <p className="text-[10px] uppercase font-bold text-slate-400">Warehouse</p>
            <p className="text-sm font-black text-white">
              {page + 1} <span className="text-slate-500">/</span> {totalPages}
            </p>
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
          >
            <FaChevronRight className="text-xs" />
          </button>
        </div>

        {/* Global Sections (Top Products & Agent Performance) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-4">Top 5 Products Dispatched</h3>
            {topProducts.length === 0 ? (
              <p className="text-slate-500 text-center py-6 text-sm">No dispatches recorded.</p>
            ) : (
              <div className="space-y-2.5">
                {topProducts.map((p, i) => (
                  <div key={i} className="flex justify-between items-center p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl">
                    <span className="font-semibold text-xs text-white truncate pr-2">{i + 1}. {p.product}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500/15 text-rose-400 border border-rose-500/25">
                      {p.cases} cs
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-4">Agent Handling Summary</h3>
            {agentPerformance.length === 0 ? (
              <p className="text-slate-500 text-center py-6 text-sm">No agent activity logged.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5">Agent</th>
                      <th className="text-center py-2.5">Added</th>
                      <th className="text-center py-2.5">Taken</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {agentPerformance.map((a, i) => (
                      <tr key={i} className="hover:bg-slate-800/30">
                        <td className="py-2.5 font-bold text-white">{a.agent}</td>
                        <td className="text-center py-2.5 text-emerald-400 font-bold">+{a.added}</td>
                        <td className="text-center py-2.5 text-rose-400 font-bold">-{a.taken}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
