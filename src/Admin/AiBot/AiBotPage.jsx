import React from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Logout from '../Logout';
import AiBotWidget from '../../Component/AiBot/AiBotWidget';
import { FaRobot, FaMagic, FaExchangeAlt, FaBox, FaWarehouse, FaLightbulb } from 'react-icons/fa';

export default function AiBotPage() {
  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Sidebar />
      <Logout />

      <div className="flex-1 p-6 md:p-8 pt-16 hundred:ml-64 overflow-auto">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-black flex items-center gap-3">
              <span className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                <FaRobot />
              </span>
              AI ERP Assistant
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Simply type commands in plain English to automatically transfer stock between godowns, create new products and brands, and allocate stock into godowns.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-2.5 w-fit rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mb-3 text-lg">
                <FaExchangeAlt />
              </div>
              <h3 className="font-bold text-base mb-1">Transfer Stock</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                Transfers cases from one godown to another, updates source & destination stocks, and auto-generates official transfer challans.
              </p>
              <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-[11px] font-mono text-gray-600 dark:text-gray-300">
                "Transfer 10 cases of 28 Chorsa from Main Godown to Branch Godown"
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-2.5 w-fit rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 mb-3 text-lg">
                <FaBox />
              </div>
              <h3 className="font-bold text-base mb-1">Add Product & Godown Stock</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                Registers new products, auto-creates brands if missing, and immediately allocates initial stock cases to any godown.
              </p>
              <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-[11px] font-mono text-gray-600 dark:text-gray-300">
                "Add new product 50 Shots on brand Standard type Crackers price 450 per case 20 and add 15 cases to Main Godown"
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-2.5 w-fit rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 mb-3 text-lg">
                <FaWarehouse />
              </div>
              <h3 className="font-bold text-base mb-1">Stock Queries</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                Checks live available cases, total quantities, and distinct products in any godown in real time.
              </p>
              <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-[11px] font-mono text-gray-600 dark:text-gray-300">
                "Check stock in Main Godown"
              </div>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-3xl text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-black mb-1 flex items-center gap-2">
                <FaMagic className="text-amber-300" />
                Copilot is Ready!
              </h3>
              <p className="text-xs text-blue-100 max-w-lg">
                Use the floating button at the bottom-right on any page to open the AI Assistant anytime.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
