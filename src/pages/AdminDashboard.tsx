import { useState } from 'react';
import { useAppStore } from '../store';
import { 
  Package, 
  UserPlus, 
  Users, 
  Layers, 
  Smartphone, 
  Search, 
  CheckCircle2, 
  Clock, 
  Printer, 
  Plus, 
  Trash2, 
  Copy, 
  Video, 
  ShoppingBag, 
  Check, 
  MapPin,
  Phone,
  RefreshCw,
  Lock,
  Unlock,
  ShieldCheck
} from 'lucide-react';
import { MainCategory, CatalogPhoto } from '../types';

export function AdminDashboard() {
  // Admin PIN Protection (Default PIN: 1234)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('shivam_admin_auth') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === '1234') {
      sessionStorage.setItem('shivam_admin_auth', 'true');
      setIsAdminAuthenticated(true);
      setPinError(false);
      setPinInput('');
    } else {
      setPinError(true);
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('shivam_admin_auth');
    setIsAdminAuthenticated(false);
  };

  const [activeTab, setActiveTab] = useState<'orders' | 'customers' | 'catalog' | 'mobile_guide'>('orders');
  
  const orders = useAppStore(state => state.orders);
  const customers = useAppStore(state => state.customers);
  const categories = useAppStore(state => state.categories);
  const subCategories = useAppStore(state => state.subCategories);
  const photos = useAppStore(state => state.photos);

  const addCustomer = useAppStore(state => state.addCustomer);
  const updateOrderStatus = useAppStore(state => state.updateOrderStatus);
  const addPhoto = useAppStore(state => state.addPhoto);
  const updatePhoto = useAppStore(state => state.updatePhoto);
  const deletePhoto = useAppStore(state => state.deletePhoto);
  const resetToDefaults = useAppStore(state => state.resetToDefaults);

  // Search & Filters
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | 'RECEIVED' | 'PARTIALLY_PACKED' | 'READY_TO_SHIP'>('ALL');
  
  const [customerSearch, setCustomerSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>('ALL');
  const [catalogSearch, setCatalogSearch] = useState('');

  // New Customer Form State
  const [newCust, setNewCust] = useState({
    customerCode: `CUST-${Math.floor(Math.random() * 9000) + 1000}`,
    shopName: '',
    cityName: '',
    mobileNumber: '',
    contactPerson: '',
    address: ''
  });

  // Add Product Modal State
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    categoryId: MainCategory.IMITATION,
    subCategoryId: 'sub-earrings',
    photoCode: '',
    imageUri: '',
    videoUri: '',
    itemCount: 4,
    defaultQuantity: 12,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: true,
    description: ''
  });

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    addCustomer(newCust);
    alert(`Customer ID ${newCust.customerCode} for "${newCust.shopName}" has been registered successfully!`);
    setNewCust({
      customerCode: `CUST-${Math.floor(Math.random() * 9000) + 1000}`,
      shopName: '',
      cityName: '',
      mobileNumber: '',
      contactPerson: '',
      address: ''
    });
  };

  const handleCopyCustomerCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.photoCode || !newProduct.imageUri) {
      alert('Please enter Photo Code and Image URL');
      return;
    }

    const sub = subCategories.find(s => s.id === newProduct.subCategoryId);

    const created: CatalogPhoto = {
      id: `p-${Date.now()}`,
      categoryId: newProduct.categoryId,
      subCategoryId: newProduct.subCategoryId,
      subCategoryName: sub ? sub.name : '',
      photoCode: newProduct.photoCode.toUpperCase().trim(),
      imageUri: newProduct.imageUri.trim(),
      videoUri: newProduct.videoUri ? newProduct.videoUri.trim() : undefined,
      itemCount: Number(newProduct.itemCount),
      defaultQuantity: Number(newProduct.defaultQuantity),
      aAvailable: newProduct.aAvailable,
      bAvailable: newProduct.bAvailable,
      cAvailable: newProduct.cAvailable,
      dAvailable: newProduct.dAvailable,
      sortOrder: photos.length + 1,
      description: newProduct.description
    };

    addPhoto(created);
    setShowAddProductModal(false);
    alert(`Product ${created.photoCode} added to catalog!`);
    setNewProduct({
      categoryId: MainCategory.IMITATION,
      subCategoryId: 'sub-earrings',
      photoCode: '',
      imageUri: '',
      videoUri: '',
      itemCount: 4,
      defaultQuantity: 12,
      aAvailable: true,
      bAvailable: true,
      cAvailable: true,
      dAvailable: true,
      description: ''
    });
  };

  // Filtered Orders
  const filteredOrders = orders.filter(order => {
    const matchSearch = 
      order.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      order.shopName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      order.cityName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      order.customerCode.toLowerCase().includes(orderSearch.toLowerCase());

    const matchStatus = orderStatusFilter === 'ALL' || order.overallStatus === orderStatusFilter;
    return matchSearch && matchStatus;
  });

  // Filtered Customers
  const filteredCustomers = customers.filter(c => 
    c.shopName.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.cityName.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.customerCode.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.mobileNumber.includes(customerSearch)
  );

  // Filtered Photos
  const filteredPhotos = photos.filter(p => {
    const matchCat = catalogCategoryFilter === 'ALL' || p.categoryId === catalogCategoryFilter;
    const matchSearch = 
      p.photoCode.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.subCategoryName.toLowerCase().includes(catalogSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  // Metrics
  const totalOrdersCount = orders.length;
  const pendingImitation = orders.filter(o => o.imitationStatus === 'PENDING').length;
  const pendingCosmetics = orders.filter(o => o.cosmeticsStatus === 'PENDING').length;
  const pendingHair = orders.filter(o => o.hairStatus === 'PENDING').length;
  const readyToShipCount = orders.filter(o => o.overallStatus === 'READY_TO_SHIP').length;

  const renderStatusBadge = (status: string) => {
    if (status === 'DONE') {
      return (
        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-md text-xs font-black flex items-center gap-1">
          <CheckCircle2 size={12} /> PACKED
        </span>
      );
    }
    if (status === 'PENDING') {
      return (
        <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-md text-xs font-black flex items-center gap-1">
          <Clock size={12} /> PENDING
        </span>
      );
    }
    return <span className="text-slate-500 text-xs font-mono">N/A</span>;
  };

  // ---------------------------------------------------------------------------
  // ADMIN PIN LOCK SCREEN (Restricts Staff from tampering or uploading)
  // ---------------------------------------------------------------------------
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-scaleUp">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Lock size={28} />
          </div>

          <div>
            <h2 className="text-xl font-black text-white tracking-wide">
              SHIVAM Admin Portal (PC)
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              <strong>Staff Restriction:</strong> Showroom mobile app is strictly for presentation and taking orders. 
              Uploading photos, editing stock, and customer management require Admin PIN.
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Enter 4-Digit Admin PIN
              </label>
              <input
                type="password"
                maxLength={6}
                autoFocus
                placeholder="••••"
                value={pinInput}
                onChange={e => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                className="w-48 mx-auto text-center tracking-[0.5em] text-2xl font-mono font-black py-2.5 bg-slate-950 border border-slate-700 rounded-2xl text-amber-400 focus:outline-none focus:border-amber-400 shadow-inner"
              />
              {pinError && (
                <p className="text-xs font-bold text-rose-400 mt-2">
                  Incorrect PIN! Default PIN is 1234
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-sm shadow-xl transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Unlock size={16} />
              <span>Unlock Admin Portal</span>
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck size={14} className="text-amber-500" />
            <span>Master Admin Default PIN: <strong>1234</strong></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Admin Status & Lock Bar */}
      <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 px-4 py-2 rounded-xl text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <ShieldCheck size={15} className="text-emerald-400" />
          <span>Admin Portal Authenticated (PC Mode)</span>
          <span className="text-slate-500">•</span>
          <span className="text-[11px] text-slate-400">Staff access restricted on mobile</span>
        </div>
        <button
          onClick={handleAdminLogout}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 font-bold transition text-[11px]"
        >
          <Lock size={12} />
          <span>Lock Admin</span>
        </button>
      </div>

      {/* 1. TOP EXECUTIVE METRIC CARDS (PC Optimized 4-column Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Orders */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Orders</p>
            <h3 className="text-2xl font-black text-white mt-1">{totalOrdersCount}</h3>
            <p className="text-[11px] text-amber-400 font-medium mt-0.5">
              {readyToShipCount} Ready to Ship
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Package size={24} />
          </div>
        </div>

        {/* Packing Stations Status */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Packing</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                Imit: {pendingImitation}
              </span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300">
                Cosm: {pendingCosmetics}
              </span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">
                Hair: {pendingHair}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Department Stations</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Clock size={24} />
          </div>
        </div>

        {/* Registered Wholesale Customers */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">B2B Clients</p>
            <h3 className="text-2xl font-black text-white mt-1">{customers.length}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Verified Retailers</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Users size={24} />
          </div>
        </div>

        {/* Catalog Media Items */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Showroom Catalog</p>
            <h3 className="text-2xl font-black text-white mt-1">{photos.length} Photos</h3>
            <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
              {photos.filter(p => !!p.videoUri).length} HDTV Videos Active
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Video size={24} />
          </div>
        </div>

      </div>

      {/* 2. ADMIN NAVIGATION TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex flex-wrap gap-2">
          
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
              activeTab === 'orders' 
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' 
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Package size={16} /> 
            <span>Live Orders & Packing ({orders.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
              activeTab === 'customers' 
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' 
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Users size={16} /> 
            <span>Customer Master ({customers.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
              activeTab === 'catalog' 
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' 
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Layers size={16} /> 
            <span>Catalog & Stock ({photos.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('mobile_guide')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
              activeTab === 'mobile_guide' 
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' 
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Smartphone size={16} /> 
            <span>Mobile App Test / Download</span>
          </button>

        </div>

        {/* Defaults Reset Button */}
        <button
          onClick={() => {
            if (confirm('Reset catalog, showroom photos and sample orders to default state?')) {
              resetToDefaults();
              alert('Showroom data restored successfully!');
            }
          }}
          className="px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition flex items-center gap-1.5"
          title="Restore factory default catalog photos and sample orders"
        >
          <RefreshCw size={13} />
          <span>Reset Showroom Data</span>
        </button>
      </div>

      {/* -----------------------------------------------------------------------
          TAB 1: LIVE ORDERS & PACKING WORKFLOW
          ----------------------------------------------------------------------- */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          
          {/* Controls Bar: Search & Status Filters */}
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[260px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search order number, shop name, city, customer ID..."
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['ALL', 'RECEIVED', 'PARTIALLY_PACKED', 'READY_TO_SHIP'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setOrderStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    orderStatusFilter === st
                      ? 'bg-amber-500 text-black'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-2xl">
              <ShoppingBag size={48} className="mx-auto text-slate-600 mb-3" />
              <p className="text-base font-bold text-slate-300">No orders match your filter</p>
              <p className="text-xs text-slate-500 mt-1">Place an order from the Showroom app or reset filter</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map(order => (
                <div 
                  key={order.id} 
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl transition hover:border-slate-700"
                >
                  {/* Order Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-lg text-amber-400 tracking-wide">
                          {order.orderNumber}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                          order.overallStatus === 'READY_TO_SHIP'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : order.overallStatus === 'PARTIALLY_PACKED'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}>
                          {order.overallStatus.replace(/_/g, ' ')}
                        </span>
                      </div>
                      
                      <div className="text-sm font-bold text-white mt-1 flex items-center gap-2">
                        <span>{order.shopName}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400 font-normal">{order.cityName}</span>
                        <span className="text-slate-500">•</span>
                        <span className="font-mono text-xs font-bold text-brand-gold bg-black/40 px-2 py-0.5 rounded border border-slate-800">
                          {order.customerCode}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Phone size={12} className="text-slate-500" />
                          {order.mobileNumber}
                        </span>
                        <span>Total: <strong className="text-white">{order.totalItemsCount} pieces</strong></span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-2">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(order.createdAt).toLocaleString()}
                      </span>
                      
                      <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700"
                        title="Print Packing Slip"
                      >
                        <Printer size={13} />
                        <span>Print Slip</span>
                      </button>
                    </div>
                  </div>

                  {/* Department Packing Stations */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    
                    {/* Imitation Jewelry Station */}
                    <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <span>💎 Imitation Jewellery</span>
                        </span>
                        {renderStatusBadge(order.imitationStatus)}
                      </div>
                      {order.imitationStatus === 'PENDING' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'imitation', 'DONE')}
                          className="w-full py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1"
                        >
                          <Check size={12} />
                          <span>Mark Packed</span>
                        </button>
                      )}
                    </div>

                    {/* Cosmetics Station */}
                    <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                          <span>💄 Cosmetics</span>
                        </span>
                        {renderStatusBadge(order.cosmeticsStatus)}
                      </div>
                      {order.cosmeticsStatus === 'PENDING' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'cosmetics', 'DONE')}
                          className="w-full py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1"
                        >
                          <Check size={12} />
                          <span>Mark Packed</span>
                        </button>
                      )}
                    </div>

                    {/* Hair Accessories Station */}
                    <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                          <span>🎀 Hair Accessories</span>
                        </span>
                        {renderStatusBadge(order.hairStatus)}
                      </div>
                      {order.hairStatus === 'PENDING' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'hair', 'DONE')}
                          className="w-full py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1"
                        >
                          <Check size={12} />
                          <span>Mark Packed</span>
                        </button>
                      )}
                    </div>

                  </div>

                  {/* Order Itemized Photo Details */}
                  <div className="border-t border-slate-800/80 pt-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Ordered Products Breakdown ({order.items.length} items)
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {order.items.map((item, idx) => (
                        <div 
                          key={idx}
                          className="bg-slate-950 border border-slate-800/80 rounded-lg p-2 flex flex-col items-center text-center gap-1.5"
                        >
                          <div className="w-full aspect-video rounded overflow-hidden bg-black relative">
                            <img 
                              src={item.imageUri} 
                              alt={item.photoCode} 
                              className="w-full h-full object-contain" 
                            />
                            <span className="absolute top-1 left-1 bg-black/80 font-mono text-[9px] font-bold px-1 rounded text-amber-300">
                              {item.photoCode}
                            </span>
                          </div>
                          <div className="flex items-center justify-between w-full text-xs font-mono font-bold px-1">
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                              Opt: {item.optionLetter}
                            </span>
                            <span className="text-white">
                              {item.quantity} pcs
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* -----------------------------------------------------------------------
          TAB 2: CUSTOMER MASTER (B2B Accounts & Registration)
          ----------------------------------------------------------------------- */}
      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: Add Customer Form */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl h-fit">
            <h3 className="font-black text-lg text-white mb-1 flex items-center gap-2">
              <UserPlus size={18} className="text-amber-400" />
              <span>Register Wholesale Client</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Auto-generate wholesale customer code for showroom mobile login.
            </p>

            <form onSubmit={handleAddCustomer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Customer Code (Auto-generated)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCust.customerCode}
                    readOnly
                    className="flex-1 bg-black/60 border border-slate-700 rounded-xl p-2.5 text-amber-400 font-mono font-black text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setNewCust({
                      ...newCust,
                      customerCode: `CUST-${Math.floor(Math.random() * 9000) + 1000}`
                    })}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                    title="Generate New ID"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Shop / Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Beauty & Bangles"
                  value={newCust.shopName}
                  onChange={e => setNewCust({...newCust, shopName: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Surat"
                    value={newCust.cityName}
                    onChange={e => setNewCust({...newCust, cityName: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Bhai"
                    value={newCust.contactPerson}
                    onChange={e => setNewCust({...newCust, contactPerson: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Mobile / WhatsApp Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={newCust.mobileNumber}
                  onChange={e => setNewCust({...newCust, mobileNumber: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Delivery Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Shop number, market name, pin code..."
                  value={newCust.address}
                  onChange={e => setNewCust({...newCust, address: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm transition shadow-lg active:scale-95"
              >
                Save Wholesale Client
              </button>
            </form>
          </div>

          {/* RIGHT: Customer Directory & Search */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Search Bar */}
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center gap-2">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search clients by shop name, code, city, phone..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            {/* Customers Cards / Table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredCustomers.map(cust => (
                <div 
                  key={cust.customerCode}
                  className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-base truncate">{cust.shopName}</h4>
                      <span className="font-mono font-black text-xs text-amber-400 bg-black/60 px-2.5 py-1 rounded-md border border-slate-800">
                        {cust.customerCode}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 mt-2 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-slate-500 flex-shrink-0" />
                        <span className="truncate">{cust.cityName} {cust.address ? `• ${cust.address}` : ''}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone size={13} className="text-slate-500 flex-shrink-0" />
                        <span>{cust.mobileNumber} {cust.contactPerson ? `(${cust.contactPerson})` : ''}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-xs">
                    <span className="text-slate-500 text-[11px]">B2B Active</span>
                    
                    <button
                      onClick={() => handleCopyCustomerCode(cust.customerCode)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition active:scale-95"
                      title="Copy code to share on WhatsApp"
                    >
                      {copiedCode === cust.customerCode ? (
                        <>
                          <Check size={12} className="text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy ID</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>
      )}

      {/* -----------------------------------------------------------------------
          TAB 3: CATALOG & STOCK MANAGEMENT
          ----------------------------------------------------------------------- */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          
          {/* Catalog Top Controls */}
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3">
            
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search photo code (e.g. ER-101) or subcategory..."
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setCatalogCategoryFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  catalogCategoryFilter === 'ALL'
                    ? 'bg-amber-500 text-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                All ({photos.length})
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCatalogCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    catalogCategoryFilter === cat.id
                      ? 'bg-amber-500 text-black'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.accentColorHex }} />
                  <span>{cat.displayName}</span>
                </button>
              ))}
            </div>

            {/* Add Product Button */}
            <button
              onClick={() => setShowAddProductModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs transition shadow-md active:scale-95"
            >
              <Plus size={14} />
              <span>Add 16:9 Photo</span>
            </button>

          </div>

          {/* Product Photos Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPhotos.map(photo => (
              <div 
                key={photo.id}
                className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col justify-between"
              >
                {/* 16:9 Image Preview */}
                <div className="w-full aspect-video bg-black relative">
                  <img
                    src={photo.imageUri}
                    alt={photo.photoCode}
                    className="w-full h-full object-contain"
                  />
                  <span className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded font-mono font-black text-xs text-amber-400 border border-white/10">
                    {photo.photoCode}
                  </span>
                  {photo.videoUri && (
                    <span className="absolute top-2 right-2 bg-purple-600/90 text-white font-bold text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Video size={10} /> HDTV Reel
                    </span>
                  )}
                </div>

                {/* Body Details */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 truncate">{photo.subCategoryName}</span>
                    <span className="font-mono text-amber-300 font-bold bg-slate-950 px-1.5 py-0.5 rounded">
                      Pack: {photo.defaultQuantity} pcs
                    </span>
                  </div>

                  {/* Stock Toggles (A, B, C, D) */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Stock Availability:
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {(['A', 'B', 'C', 'D'] as const).slice(0, photo.itemCount).map(opt => {
                        const isAvail = photo[`${opt.toLowerCase()}Available` as keyof CatalogPhoto] as boolean;
                        return (
                          <button
                            key={opt}
                            onClick={() => {
                              const key = `${opt.toLowerCase()}Available` as keyof CatalogPhoto;
                              updatePhoto(photo.id, { [key]: !isAvail });
                            }}
                            className={`py-1 rounded text-center text-xs font-mono font-black border transition ${
                              isAvail
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 line-through'
                            }`}
                            title={`Click to toggle ${opt} In-Stock / Out-of-Stock`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Delete Action */}
                  <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-500">{photo.itemCount} items in photo</span>
                    <button
                      onClick={() => {
                        if (confirm(`Delete ${photo.photoCode} from catalog?`)) {
                          deletePhoto(photo.id);
                        }
                      }}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                      title="Delete Photo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* -----------------------------------------------------------------------
          TAB 4: MOBILE APP TEST / DOWNLOAD GUIDE
          ----------------------------------------------------------------------- */}
      {activeTab === 'mobile_guide' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl max-w-4xl mx-auto space-y-6">
          
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-black text-2xl shadow-xl mx-auto">
              S
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Microsoft Edge & Mobile App Download Guide
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
              Agar aap <strong>Microsoft Edge</strong> browser par hain, toh niche diye gaye aasaan steps follow karein. 
              (Browser preview iframe me direct install button nahi aata, isliye direct link kholna padta hai).
            </p>
          </div>

          {/* Critical Tip for Edge Users */}
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Microsoft Edge par "Install / Download" kyu nahi dikhta?</span>
            </div>
            <p className="text-[12px] text-slate-300 leading-relaxed">
              Edge browser kisi bhi <em>iframe (preview editor)</em> ke andar install icon nahi dikhata. 
              Isko install karne ke liye bas ek baar app ko <strong>New Browser Tab</strong> me kholna hota hai:
            </p>
            <div className="pt-2 flex flex-wrap gap-2.5">
              <button
                onClick={() => window.open(window.location.origin, '_blank')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center gap-2 shadow-lg transition active:scale-95"
              >
                <span>Edge New Tab me Direct Kholein</span>
                <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded font-mono">Open</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin);
                  alert('App Link copied! Edge address bar me paste karke Enter dabayein.');
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition"
              >
                <Copy size={13} />
                <span>Copy App URL</span>
              </button>
            </div>
          </div>

          {/* 2-Column Instructions: Edge on PC vs Edge on Mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            
            {/* Box 1: Edge on PC */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-xs">PC</span>
                <span>Microsoft Edge (PC / Laptop)</span>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="font-bold text-white mb-0.5">Method 1: Address Bar se</p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Edge ke URL bar ke bilkul right side me ek chhota icon aata hai: <strong>"App available. Install SHIVAM"</strong> (+ symbol). Click karke <strong>"Install"</strong> dabayein.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="font-bold text-white mb-0.5">Method 2: Edge Menu (3 Dots) se</p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Top-right <strong>3 Dots (...)</strong> &rarr; <strong>Apps (ऐप्स)</strong> &rarr; <strong>"Install this site as an app" (इस साइट को एक ऐप के रूप में इंस्टॉल करें)</strong> par click karein.
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-emerald-400 font-medium">
                ✓ Desktop icon ban jayega aur app bina kisi browser bar ke open hogi.
              </p>
            </div>

            {/* Box 2: Edge on Mobile Phone */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-xs">Ph</span>
                <span>Microsoft Edge (Mobile / Android)</span>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="font-bold text-white mb-0.5">Step 1: Phone me Link Kholein</p>
                  <p className="text-slate-400 text-[11px]">
                    Mobile ke Edge browser me URL paste karein ya WhatsApp se click karke kholein.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="font-bold text-white mb-0.5">Step 2: Niche 3 Lines Menu (☰)</p>
                  <p className="text-slate-400 text-[11px]">
                    Screen ke bottom me <strong>3 Lines / Dots</strong> menu par tap karein.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="font-bold text-white mb-0.5">Step 3: "Add to phone" / "Add to Home screen"</p>
                  <p className="text-slate-400 text-[11px]">
                    Option me se <strong>"Add to phone"</strong> select karein. App phone me download/install ho jayegi!
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Quick URL Box */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-3">
            <div className="truncate">
              <p className="text-[11px] font-bold text-slate-400 uppercase">App Link for Mobile & Edge:</p>
              <p className="text-xs font-mono text-amber-400 truncate mt-0.5">
                {window.location.origin}
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.origin);
                alert('App link copied! Send it on WhatsApp or paste in Edge address bar.');
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition active:scale-95 flex-shrink-0"
            >
              <Copy size={13} />
              <span>Copy Link</span>
            </button>
          </div>

        </div>
      )}

      {/* -----------------------------------------------------------------------
          MODAL: ADD NEW 16:9 PHOTO TO SHOWROOM
          ----------------------------------------------------------------------- */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Plus size={18} className="text-amber-400" />
                <span>Add 16:9 Product Photo</span>
              </h3>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="space-y-3">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Category *</label>
                  <select
                    value={newProduct.categoryId}
                    onChange={e => {
                      const catId = e.target.value as MainCategory;
                      const firstSub = subCategories.find(s => s.categoryId === catId);
                      setNewProduct({
                        ...newProduct,
                        categoryId: catId,
                        subCategoryId: firstSub ? firstSub.id : ''
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.displayName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Subcategory *</label>
                  <select
                    value={newProduct.subCategoryId}
                    onChange={e => setNewProduct({...newProduct, subCategoryId: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  >
                    {subCategories
                      .filter(s => s.categoryId === newProduct.categoryId)
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Photo Code (e.g. ER-104) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ER-104"
                    value={newProduct.photoCode}
                    onChange={e => setNewProduct({...newProduct, photoCode: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Default Batch Pcs</label>
                  <input
                    type="number"
                    min={1}
                    value={newProduct.defaultQuantity}
                    onChange={e => setNewProduct({...newProduct, defaultQuantity: Number(e.target.value)})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">16:9 Image URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://... (16:9 HDTV photo)"
                  value={newProduct.imageUri}
                  onChange={e => setNewProduct({...newProduct, imageUri: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">HDTV 16:9 Video URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://...mp4 (for home video slide reel)"
                  value={newProduct.videoUri}
                  onChange={e => setNewProduct({...newProduct, videoUri: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Items in Photo (ABCD)</label>
                  <select
                    value={newProduct.itemCount}
                    onChange={e => setNewProduct({...newProduct, itemCount: Number(e.target.value)})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  >
                    <option value={1}>1 Item (A only)</option>
                    <option value={2}>2 Items (A, B)</option>
                    <option value={3}>3 Items (A, B, C)</option>
                    <option value={4}>4 Items (A, B, C, D)</option>
                  </select>
                </div>

                <div className="flex items-center justify-around bg-slate-950 border border-slate-800 rounded-xl p-2 mt-5">
                  {(['A', 'B', 'C', 'D'] as const).slice(0, newProduct.itemCount).map(opt => (
                    <label key={opt} className="flex items-center gap-1 text-xs text-white cursor-pointer font-bold">
                      <input
                        type="checkbox"
                        checked={newProduct[`${opt.toLowerCase()}Available` as keyof typeof newProduct] as boolean}
                        onChange={e => {
                          const key = `${opt.toLowerCase()}Available` as keyof typeof newProduct;
                          setNewProduct({...newProduct, [key]: e.target.checked});
                        }}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition"
                >
                  Save to Catalog
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
