import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaRobot, FaMagic, FaPaperPlane, FaTimes, FaSpinner,
  FaArrowRight, FaBox, FaWarehouse, FaCheckCircle,
  FaExclamationCircle, FaTrashAlt, FaChevronDown, FaExchangeAlt
} from 'react-icons/fa';
import { API_BASE_URL } from '../../../Config';

export default function AiBotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastProduct, setLastProduct] = useState(null);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: `👋 **Hello! I am your AI ERP Copilot.**\n\nI can execute real-time actions directly in your system as you type:\n\n• 🔄 **Transfer Stock:** *"Transfer 5 cases of 28 Chorsa from Main Godown to Branch Godown"*\n• 📦 **Add Product & Stock:** *"add new brand called gk, product type - bijili , product name - vari 100 bijili, price -30 , percase-100 qty"*\n• ✏️ **Edit / Update Product:** *"make it edit to brand GK"* or *"change price to 40"*\n• 📥 **Add Cases to Godown:** *"Add 20 cases of 28 Chorsa to Main Godown"*\n• 📊 **Check Stock:** *"Check stock in Main Godown"*\n\nJust type your request below!`,
      details: null,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  const quickPrompts = [
    { label: '🔄 Transfer Stock', text: 'Transfer 5 cases of from Main Godown to Branch Godown' },
    { label: '📦 New Product + Stock', text: 'Add new product 50 Shots on brand Standard type Crackers price 450 per case 20 and add 15 cases to Main Godown' },
    { label: '📥 Add Cases', text: 'Add 10 cases of to Main Godown' },
    { label: '📊 Check Godown Stock', text: 'Check stock in Main Godown' }
  ];

  const handleSend = async (textToSend) => {
    const query = (textToSend || prompt).trim();
    if (!query || loading) return;

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { sender: 'user', text: query, time: userTime }]);
    setPrompt('');
    setLoading(true);

    try {
      const username = localStorage.getItem('username') || 'Admin';
      const res = await fetch(`${API_BASE_URL}/api/ai/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query, username, lastProduct })
      });

      const data = await res.json();
      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (data.details?.productname) {
        setLastProduct(data.details);
      }

      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: data.message || 'Action processed.',
          details: data.details || null,
          action: data.action,
          success: data.success,
          time: botTime
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: `⚠️ **Server Connection Error:** Could not reach the ERP backend at \`${API_BASE_URL}\` (${err.message}).\n\n**To fix this:**\n1. Make sure your backend server is running in terminal:\n   \`cd b\`\n   \`node server.js\` (or \`npm start\`)\n2. If using Vercel, check that \`Config.jsx\` points to your active backend URL.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          success: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        sender: 'bot',
        text: `Chat cleared! What would you like to do next?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Render markdown bold and bullets simply
  const renderFormattedText = (txt) => {
    if (!txt) return null;
    const lines = txt.split('\n');
    return lines.map((line, idx) => {
      let content = line;
      // Replace **text** with <strong>text</strong>
      const parts = content.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={idx} className={line.startsWith('•') ? 'ml-2 my-0.5' : 'my-1'}>
          {parts.map((p, pIdx) => {
            if (p.startsWith('**') && p.endsWith('**')) {
              return <strong key={pIdx} className="font-bold text-slate-900 dark:text-white">{p.slice(2, -2)}</strong>;
            }
            if (p.startsWith('*') && p.endsWith('*')) {
              return <em key={pIdx} className="italic text-slate-700 dark:text-slate-300">{p.slice(1, -1)}</em>;
            }
            return <span key={pIdx}>{p}</span>;
          })}
        </p>
      );
    });
  };

  return (
    <>
      {/* ─── FLOATING ACTION BUTTON ─── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20 hover:shadow-indigo-500/50 cursor-pointer"
            title="Open AI ERP Assistant"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
            </span>
            <FaMagic className="text-lg text-amber-300 animate-pulse" />
            <span className="font-bold text-sm tracking-wide">AI Assistant</span>
          </button>
        )}
      </div>

      {/* ─── SLIDE-OVER AI DRAWER ─── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in">
          <div className="w-full sm:w-[480px] h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-hidden">
            
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
                  <FaRobot className="text-2xl text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-wide flex items-center gap-2">
                    ERP AI Assistant
                    <span className="text-[10px] bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full font-bold">
                      ACTIVE
                    </span>
                  </h3>
                  <p className="text-xs text-blue-100">Type what you want, I'll execute the actions</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition text-xs"
                  title="Clear Chat"
                >
                  <FaTrashAlt />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition text-sm"
                  title="Close Assistant"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            {/* Quick Action Chips */}
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                Shortcuts:
              </span>
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setPrompt(qp.text);
                    inputRef.current?.focus();
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium bg-white dark:bg-slate-700/80 hover:bg-indigo-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-full transition whitespace-nowrap shrink-0 shadow-2xs"
                >
                  {qp.label}
                </button>
              ))}
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-sm">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl p-3.5 shadow-sm ${
                      m.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-xs'
                    }`}
                  >
                    <div className="leading-relaxed text-[13px]">
                      {renderFormattedText(m.text)}
                    </div>

                    {/* Detailed Result Card if action occurred */}
                    {m.details && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
                        {m.details.productname && (
                          <div className="flex items-center justify-between">
                            <span>Product:</span>
                            <strong className="text-slate-900 dark:text-white">{m.details.productname}</strong>
                          </div>
                        )}
                        {m.details.brand && (
                          <div className="flex items-center justify-between">
                            <span>Brand:</span>
                            <strong className="text-purple-600 dark:text-purple-400">{m.details.brand}</strong>
                          </div>
                        )}
                        {m.details.type && (
                          <div className="flex items-center justify-between">
                            <span>Category:</span>
                            <strong className="text-slate-700 dark:text-slate-300">{m.details.type}</strong>
                          </div>
                        )}
                        {m.details.price !== undefined && (
                          <div className="flex items-center justify-between">
                            <span>Price / Box:</span>
                            <strong className="text-emerald-600 dark:text-emerald-400">₹{m.details.price} ({m.details.per_case} pcs/cs)</strong>
                          </div>
                        )}
                        {m.details.challan_number && (
                          <div className="flex items-center justify-between font-semibold">
                            <span>Challan Number:</span>
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded font-mono">
                              {m.details.challan_number}
                            </span>
                          </div>
                        )}
                        {m.details.source_godown && (
                          <div className="flex items-center justify-between">
                            <span>From Godown:</span>
                            <strong className="text-slate-900 dark:text-white">{m.details.source_godown}</strong>
                          </div>
                        )}
                        {m.details.target_godown && (
                          <div className="flex items-center justify-between">
                            <span>To Godown:</span>
                            <strong className="text-emerald-600 dark:text-emerald-400">{m.details.target_godown}</strong>
                          </div>
                        )}
                        {m.details.cases && (
                          <div className="flex items-center justify-between">
                            <span>Cases Transferred:</span>
                            <strong className="text-blue-600 dark:text-blue-400">{m.details.cases} cs</strong>
                          </div>
                        )}
                        {m.details.cases_added && (
                          <div className="flex items-center justify-between">
                            <span>Cases Added:</span>
                            <strong className="text-emerald-600 dark:text-emerald-400">+{m.details.cases_added} cs</strong>
                          </div>
                        )}
                        {m.details.total_cases !== undefined && (
                          <div className="flex items-center justify-between">
                            <span>Current Available Cases:</span>
                            <strong className="text-indigo-600 dark:text-indigo-400">{m.details.total_cases} cs</strong>
                          </div>
                        )}

                        {/* Quick View Links */}
                        <div className="pt-2 flex gap-2">
                          <button
                            onClick={() => {
                              navigate('/viewstock');
                              setIsOpen(false);
                            }}
                            className="flex-1 py-1 text-center bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800 font-semibold transition"
                          >
                            View Stocks
                          </button>
                          <button
                            onClick={() => {
                              navigate('/inventory');
                              setIsOpen(false);
                            }}
                            className="flex-1 py-1 text-center bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded font-semibold transition"
                          >
                            View Inventory
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1">
                    {m.time}
                  </span>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 p-2">
                  <FaSpinner className="animate-spin text-blue-600 text-sm" />
                  <span>Processing your command and updating database...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Box Footer */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. transfer 10 cases of 28 Chorsa from Main to Branch..."
                  disabled={loading}
                  className="w-full pl-3.5 pr-12 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !prompt.trim()}
                  className="absolute right-1.5 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
                  title="Send (Enter)"
                >
                  {loading ? <FaSpinner className="animate-spin text-xs" /> : <FaPaperPlane className="text-xs" />}
                </button>
              </div>
              <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-1.5">
                Press <strong>Enter</strong> to execute actions automatically.
              </p>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
