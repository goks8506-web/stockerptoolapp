// src/Components/Godown/List.jsx
import React, { useState, useEffect, useMemo } from 'react';
import Modal from 'react-modal';
import Sidebar from '../Sidebar/Sidebar';
import '../../App.css';
import { API_BASE_URL } from '../../../Config';
import { 
  FaEye, FaEdit, FaTrash, FaPlus, FaSearch, FaFilter, 
  FaChevronLeft, FaChevronRight, FaTimes, FaBoxOpen, FaLayerGroup, FaTag
} from 'react-icons/fa';
import Logout from '../Logout';

Modal.setAppElement('#root');

export default function List() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterBrand, setFilterBrand] = useState('all');
  const [productTypes, setProductTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [editModalIsOpen, setEditModalIsOpen] = useState(false);
  const [addModalIsOpen, setAddModalIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    productname: '',
    price: '0',
    per_case: '',
    brand: '',
    product_type: '',
  });

  const productsPerPage = 12;

  const capitalize = str => {
    if (!str || typeof str !== 'string') return '';
    return str
      .split(/[_\s]+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [typesRes, brandsRes, prodsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/product-types`),
        fetch(`${API_BASE_URL}/api/brands`),
        fetch(`${API_BASE_URL}/api/products`)
      ]);

      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setProductTypes([...new Set(typesData.map(item => item.product_type).filter(Boolean))]);
      }
      if (brandsRes.ok) {
        const brandsData = await brandsRes.json();
        setBrands([...new Set(brandsData.map(item => item.name).filter(Boolean))]);
      }
      if (prodsRes.ok) {
        const prodsData = await prodsRes.json();
        setProducts(prodsData || []);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredProducts = useMemo(() => {
    let list = products || [];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(p => 
        (p.productname || '').toLowerCase().includes(term) ||
        (p.brand || '').toLowerCase().includes(term) ||
        (p.product_type || '').toLowerCase().includes(term)
      );
    }

    if (filterType !== 'all') {
      const cleanType = filterType.toLowerCase().replace(/[_\s]+/g, ' ').trim();
      list = list.filter(p => 
        (p.product_type || '').toLowerCase().replace(/[_\s]+/g, ' ').trim() === cleanType
      );
    }

    if (filterBrand !== 'all') {
      const cleanBrand = filterBrand.toLowerCase().replace(/[_\s]+/g, ' ').trim();
      list = list.filter(p => 
        (p.brand || '').toLowerCase().replace(/[_\s]+/g, ' ').trim() === cleanBrand
      );
    }

    return list;
  }, [products, searchTerm, filterType, filterBrand]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterBrand]);

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage) || 1;
  const currentProducts = useMemo(() => {
    const start = (currentPage - 1) * productsPerPage;
    return filteredProducts.slice(start, start + productsPerPage);
  }, [filteredProducts, currentPage, productsPerPage]);

  const handleSubmit = async (e, isEdit) => {
    e.preventDefault();
    if (!formData.productname || formData.price === '' || formData.per_case === '' || !formData.brand || (!isEdit && !formData.product_type)) {
      setError('Please fill in all required fields');
      return;
    }
    const url = isEdit
      ? `${API_BASE_URL}/api/products/${selectedProduct.product_type.toLowerCase().replace(/\s+/g, '_')}/${selectedProduct.id}`
      : `${API_BASE_URL}/api/products`;
    const payload = {
      productname: formData.productname.trim(),
      price: parseFloat(formData.price),
      per_case: parseInt(formData.per_case, 10),
      brand: formData.brand.trim(),
      ...(isEdit ? {} : { product_type: formData.product_type.trim() })
    };
    try {
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || `Failed to ${isEdit ? 'update' : 'add'} product`);
      fetchData();
      closeModal();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.productname}"?`)) return;
    try {
      await fetch(`${API_BASE_URL}/api/products/${product.product_type.toLowerCase().replace(/\s+/g, '_')}/${product.id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      setError('Failed to delete product');
    }
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setEditModalIsOpen(false);
    setAddModalIsOpen(false);
    setSelectedProduct(null);
    setError('');
    setFormData({ productname: '', price: '0', per_case: '', brand: '', product_type: '' });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterBrand('all');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 hundred:ml-64 p-4 md:p-8 pt-20 hundred:pt-8 transition-colors duration-200">
      <Sidebar />
      <div className="max-w-7xl mx-auto">
        
        {/* Top Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
                <FaBoxOpen className="text-xl" />
              </span>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                Product Inventory
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                {filteredProducts.length} items
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Browse, filter, and manage your master product catalog with live case prices.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAddModalIsOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <FaPlus className="text-xs" /> Add Product
            </button>
            <Logout />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-between text-sm">
            <span>{error}</span>
            <button onClick={() => setError('')} className="p-1 hover:text-white"><FaTimes /></button>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 md:p-5 mb-8 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Search Input */}
            <div className="md:col-span-5 relative">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Search products, brands, or types..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  <FaTimes className="text-xs" />
                </button>
              )}
            </div>

            {/* Product Type Filter */}
            <div className="md:col-span-3">
              <div className="relative">
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all pr-8"
                >
                  <option value="all">All Product Types</option>
                  {[...new Set(productTypes)].map((type, idx) => (
                    <option key={`${type}-${idx}`} value={type}>{capitalize(type)}</option>
                  ))}
                </select>
                <FaFilter className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
              </div>
            </div>

            {/* Brand Filter */}
            <div className="md:col-span-3">
              <div className="relative">
                <select
                  value={filterBrand}
                  onChange={e => setFilterBrand(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all pr-8"
                >
                  <option value="all">All Brands</option>
                  {[...new Set(brands)].map((brand, idx) => (
                    <option key={`${brand}-${idx}`} value={brand}>{capitalize(brand)}</option>
                  ))}
                </select>
                <FaTag className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
              </div>
            </div>

            {/* Reset Filter Button */}
            <div className="md:col-span-1 flex items-center justify-end">
              {(searchTerm || filterType !== 'all' || filterBrand !== 'all') ? (
                <button
                  onClick={clearFilters}
                  title="Clear all filters"
                  className="w-full md:w-auto p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs font-medium flex items-center justify-center gap-1.5"
                >
                  <FaTimes /> Reset
                </button>
              ) : (
                <span className="text-xs text-slate-500 hidden md:block text-center w-full">Ready</span>
              )}
            </div>
          </div>
        </div>

        {/* Products Grid or Empty State */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-500/30 border-t-indigo-500 mb-4" />
            <p className="text-slate-400 font-medium">Loading products catalog...</p>
          </div>
        ) : currentProducts.length === 0 ? (
          <div className="bg-slate-900/50 rounded-3xl border border-slate-800 p-12 text-center max-w-xl mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
              <FaBoxOpen className="text-3xl" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No products found</h3>
            <p className="text-sm text-slate-400 mb-6">
              We couldn't find any products matching your current filters. Try tweaking your search query or reset filters.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition"
              >
                Clear Filters
              </button>
              <button
                onClick={() => setAddModalIsOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition"
              >
                + Add Product
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {currentProducts.map((product, idx) => {
              const productKey = `${product.product_type}-${product.id}-${idx}`;
              return (
                <div
                  key={productKey}
                  className="group relative bg-slate-900/70 hover:bg-slate-900/90 rounded-2xl border border-slate-800/80 hover:border-slate-700 p-5 shadow-lg hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 truncate max-w-[140px]">
                        {capitalize(product.product_type)}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/20 truncate max-w-[120px]">
                        {capitalize(product.brand)}
                      </span>
                    </div>

                    {/* Product Name */}
                    <h3 className="text-base font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors line-clamp-2 mb-4">
                      {product.productname}
                    </h3>

                    {/* Pricing & Case Meta */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 mb-5">
                      <div>
                        <span className="text-[10px] font-medium text-slate-400 block uppercase tracking-wider">Price / Box</span>
                        <span className="text-base font-black text-emerald-400">
                          ₹{parseFloat(product.price || 0).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-medium text-slate-400 block uppercase tracking-wider">Per Case</span>
                        <span className="text-sm font-bold text-slate-200">
                          {product.per_case || 1} <span className="text-[11px] font-normal text-slate-400">pcs</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                    <button
                      onClick={() => { setSelectedProduct(product); setModalIsOpen(true); }}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      title="View Details"
                    >
                      <FaEye className="text-xs text-slate-400" /> View
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProduct(product);
                        setFormData({
                          productname: product.productname,
                          price: product.price,
                          per_case: product.per_case,
                          brand: product.brand,
                          product_type: product.product_type
                        });
                        setEditModalIsOpen(true);
                      }}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      title="Edit Product"
                    >
                      <FaEdit className="text-xs" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 border border-rose-500/20 text-xs transition"
                      title="Delete Product"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 rounded-2xl border border-slate-800 p-4">
            <span className="text-xs text-slate-400">
              Showing <span className="font-semibold text-slate-200">{(currentPage - 1) * productsPerPage + 1}</span> to{' '}
              <span className="font-semibold text-slate-200">{Math.min(currentPage * productsPerPage, filteredProducts.length)}</span> of{' '}
              <span className="font-semibold text-slate-200">{filteredProducts.length}</span> products
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={currentPage === 1}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <FaChevronLeft className="text-xs" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                  Math.max(0, currentPage - 3),
                  Math.min(totalPages, currentPage + 2)
                ).map(page => (
                  <button
                    key={page}
                    onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                      currentPage === page
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <FaChevronRight className="text-xs" />
              </button>
            </div>
          </div>
        )}

        {/* View Details Modal */}
        <Modal
          isOpen={modalIsOpen}
          onRequestClose={closeModal}
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          overlayClassName="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-40"
        >
          {selectedProduct && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
                    <FaBoxOpen />
                  </span>
                  <h2 className="text-lg font-bold text-white">Product Overview</h2>
                </div>
                <button onClick={closeModal} className="text-slate-400 hover:text-white p-1">
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
                  <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1">Product Title</span>
                  <p className="text-base font-bold text-white">{selectedProduct.productname}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1">Brand</span>
                    <p className="text-sm font-semibold text-sky-400">{capitalize(selectedProduct.brand)}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1">Category / Type</span>
                    <p className="text-sm font-semibold text-indigo-400">{capitalize(selectedProduct.product_type)}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1">Box Price</span>
                    <p className="text-lg font-black text-emerald-400">₹{parseFloat(selectedProduct.price || 0).toFixed(2)}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1">Pieces / Case</span>
                    <p className="text-base font-bold text-slate-200">{selectedProduct.per_case || 1} pcs</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Add / Edit Product Modal */}
        <Modal
          isOpen={addModalIsOpen || editModalIsOpen}
          onRequestClose={closeModal}
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          overlayClassName="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-40"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
                  {editModalIsOpen ? <FaEdit /> : <FaPlus />}
                </span>
                <h2 className="text-lg font-bold text-white">
                  {editModalIsOpen ? 'Edit Product Details' : 'Add New Product'}
                </h2>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-white p-1">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={e => handleSubmit(e, editModalIsOpen)} className="space-y-4">
              {!editModalIsOpen && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Product Category / Type *
                  </label>
                  <input
                    type="text"
                    name="product_type"
                    placeholder="e.g. Bijili, Crackers, Multi Shot"
                    value={formData.product_type}
                    onChange={e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Brand Name *
                </label>
                <input
                  type="text"
                  name="brand"
                  placeholder="e.g. Standard, GK, Sony"
                  value={formData.brand}
                  onChange={e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="productname"
                  placeholder="e.g. 28 Chorsa, 50 Shots"
                  value={formData.productname}
                  onChange={e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Price per Box (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="price"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Pieces / Case *
                  </label>
                  <input
                    type="number"
                    name="per_case"
                    placeholder="100"
                    value={formData.per_case}
                    onChange={e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 transition"
                >
                  {editModalIsOpen ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </Modal>

      </div>
    </div>
  );
}
