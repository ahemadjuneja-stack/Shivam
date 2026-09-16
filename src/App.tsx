import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home } from './pages/Home';
import { AdminDashboard } from './pages/AdminDashboard';
import { CategoryGallery } from './pages/CategoryGallery';
import { SubCategoryGallery } from './pages/SubCategoryGallery';
import { Cart } from './pages/Cart';
import { useAppStore } from './store';
import { 
  ShoppingBag, 
  UserCircle, 
  ShieldAlert, 
  X, 
  Trash2, 
  Send, 
  CheckCircle2,
  Phone,
  MapPin,
  Store,
  Minus,
  Plus
} from 'lucide-react';
import { useState, useEffect } from 'react';

function AppShell({ children }: { children: React.ReactNode }) {
  // Try to lock orientation to landscape
  useEffect(() => {
    const lockOrientation = async () => {
      try {
        if (screen.orientation && screen.orientation.lock) {
          // @ts-ignore
          await screen.orientation.lock('landscape');
        }
      } catch (error) {
        // Orientation lock usually fails unless the app is in fullscreen mode or installed as a PWA
        console.debug('Orientation lock failed:', error);
      }
    };
    lockOrientation();
  }, []);
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  const cart = useAppStore(state => state.cart);
  const removeFromCart = useAppStore(state => state.removeFromCart);
  const updateCartItemQuantity = useAppStore(state => state.updateCartItemQuantity);
  const clearCart = useAppStore(state => state.clearCart);
  const placeOrder = useAppStore(state => state.placeOrder);
  
  const currentCustomer = useAppStore(state => state.currentCustomer);
  const customers = useAppStore(state => state.customers);
  const setCurrentCustomer = useAppStore(state => state.setCurrentCustomer);
  
  const isCartOpen = useAppStore(state => state.isCartOpen);
  const setIsCartOpen = useAppStore(state => state.setIsCartOpen);
  const showroomScreenMode = useAppStore(state => state.showroomScreenMode);

  const [showLogin, setShowLogin] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.customerCode.toLowerCase() === loginId.trim().toLowerCase());
    if (cust) {
      setCurrentCustomer(cust);
      setShowLogin(false);
      setLoginId('');
    } else {
      alert('Customer Code not found. Try CUST-101, CUST-102, or CUST-103.');
    }
  };

  const handleQuickPlaceOrder = () => {
    if (!currentCustomer) {
      setShowLogin(true);
      return;
    }
    placeOrder();
    setOrderSuccessMsg(`Wholesale order dispatched successfully for ${currentCustomer.shopName}!`);
    setTimeout(() => {
      setOrderSuccessMsg(null);
    }, 4000);
  };

  const totalPieces = cart.reduce((sum, item) => sum + item.quantity, 0);

  // ---------------------------------------------------------------------------
  // 1. PC WEB ADMIN DASHBOARD LAYOUT (Full Screen, Desktop Friendly)
  // ---------------------------------------------------------------------------
  if (isAdminRoute) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 font-sans antialiased flex flex-col pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        {/* PC Top Navigation Bar */}
        <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-6 py-3 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 group">
              <img src="/icon.svg" alt="SHIVAM" className="w-8 h-8 rounded-lg shadow-md group-hover:scale-105 transition-transform" />
              <div>
                <h1 className="text-base font-black tracking-wider text-white flex items-center gap-2">
                  <span>SHIVAM</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold uppercase tracking-widest font-mono">
                    Admin Portal (Web PC)
                  </span>
                </h1>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* Direct Switch to Mobile Showroom */}
            <Link
              to="/"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition shadow-lg active:scale-95"
              title="Open Mobile Showroom App"
            >
              <Store size={15} />
              <span>Go to Showroom App</span>
            </Link>
          </div>
        </header>

        {/* PC Admin Content Container */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. SHOWROOM APP CONTAINER (Mobile Full Screen, No 90 rotate button)
  // ---------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 w-full h-full bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden select-none pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      
      {/* MOBILE SHOWROOM CONTAINER */}
      <div className="w-full h-full flex flex-col bg-brand-navy-dark overflow-hidden">
        
        {/* APP ACTION BAR (Shown on Home only, hidden in subcategories) */}
        {showroomScreenMode === 'home' && (
          <header className="bg-brand-navy-card/95 backdrop-blur-md border-b border-brand-navy-border px-3 py-1.5 flex items-center justify-between gap-3 flex-shrink-0 z-20">
            {/* Brand Logo & Name */}
            <Link to="/" className="flex items-center gap-2 group">
              <img src="/icon.svg" alt="SHIVAM" className="w-7 h-7 rounded-lg shadow-md group-hover:scale-105 transition-transform" />
              <h1 className="text-sm font-black tracking-wider text-white">SHIVAM</h1>
            </Link>

            {/* Right Header Utilities: Admin Web Link, Install App, Customer ID, Order Slip Button */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              
              {/* Web Admin Dashboard Link */}
              <Link 
                to="/admin" 
                className="text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1 bg-slate-900 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-lg transition"
                title="Open Web Admin Portal"
              >
                <ShieldAlert size={13} className="text-amber-400" />
                <span>Admin</span>
              </Link>

              {/* Customer Switcher / Login */}
              <button 
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-1 bg-slate-900 border border-slate-700 hover:border-brand-gold px-2.5 py-1 rounded-lg text-[11px] transition"
              >
                <UserCircle size={14} className="text-brand-gold" />
                {currentCustomer ? (
                  <span className="font-mono font-bold text-brand-gold-light truncate max-w-[85px]">
                    {currentCustomer.customerCode}
                  </span>
                ) : (
                  <span className="font-bold text-white">Login</span>
                )}
              </button>

              {/* Top Order Slip / Cart Button */}
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black px-2.5 py-1 rounded-lg font-black text-xs transition shadow-md active:scale-95"
              >
                <ShoppingBag size={13} />
                <span>{totalPieces} pcs</span>
              </button>
            </div>
          </header>
        )}

        {/* MAIN SHOWROOM CONTENT AREA */}
        <main className="flex-1 w-full p-2 overflow-hidden flex flex-col">
          {children}
        </main>

        {/* ANDROID BOTTOM GESTURE PILL BAR */}
        <div className="h-3 bg-slate-950 flex items-center justify-center flex-shrink-0 z-20">
          <div className="w-20 h-1 bg-slate-700 rounded-full" />
        </div>

      </div>

      {/* Slide-over Cart / Order Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative w-full max-w-md bg-brand-navy-card border-l border-brand-navy-border h-full flex flex-col shadow-2xl z-10 animate-slideLeft">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2">
                <ShoppingBag className="text-brand-gold" size={20} />
                <div>
                  <h3 className="font-black text-base text-white">Wholesale Order Slip</h3>
                  <p className="text-[11px] text-slate-400">
                    {cart.length} items • {totalPieces} total pieces
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Customer Information Card */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Billing / Dispatch Customer</span>
                <button 
                  onClick={() => setShowLogin(true)}
                  className="text-brand-gold hover:underline text-[10px]"
                >
                  Change Customer
                </button>
              </div>

              {currentCustomer ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{currentCustomer.shopName}</span>
                    <span className="font-mono text-brand-gold font-bold bg-black/40 px-2 py-0.5 rounded border border-slate-800">
                      {currentCustomer.customerCode}
                    </span>
                  </div>
                  <div className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <MapPin size={12} className="text-slate-500" />
                    <span>{currentCustomer.cityName} • {currentCustomer.address}</span>
                  </div>
                  <div className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <Phone size={12} className="text-slate-500" />
                    <span>{currentCustomer.mobileNumber} ({currentCustomer.contactPerson})</span>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3 rounded-xl text-xs flex items-center justify-between">
                  <span>No customer selected</span>
                  <button 
                    onClick={() => setShowLogin(true)}
                    className="font-bold underline text-amber-400"
                  >
                    Login
                  </button>
                </div>
              )}
            </div>

            {/* Order Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {cart.length === 0 ? (
                <div className="text-center py-24 text-slate-400">
                  <ShoppingBag size={40} className="mx-auto text-slate-600 mb-2" />
                  <p className="font-bold text-sm text-slate-300">Your order slip is empty</p>
                  <p className="text-xs text-slate-500 mt-1">Select items from the 16:9 showroom to build your order.</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center gap-3 shadow-sm hover:border-slate-700 transition"
                  >
                    <img 
                      src={item.imageUri} 
                      alt={item.photoCode} 
                      className="w-14 h-14 rounded-lg object-cover border border-slate-700 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-white">{item.photoCode}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-gold/20 text-brand-gold">
                          Option {item.optionLetter}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.subCategoryName}</p>
                    </div>

                    {/* Big Finger-Friendly Stepper in Cart */}
                    <div className="flex items-center bg-slate-950 border border-slate-700/80 rounded-xl overflow-hidden p-0.5">
                      <button
                        onClick={() => {
                          const step = item.quantity >= 12 ? 6 : 1;
                          updateCartItemQuantity(idx, item.quantity - step);
                        }}
                        className="w-9 h-9 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 active:scale-90 rounded-lg transition"
                        title="Decrease"
                      >
                        <Minus size={15} strokeWidth={2.5} />
                      </button>
                      <span className="w-11 text-center font-mono font-black text-xs sm:text-sm text-amber-300 select-none">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => {
                          const step = item.quantity >= 12 ? 6 : 1;
                          updateCartItemQuantity(idx, item.quantity + step);
                        }}
                        className="w-9 h-9 flex items-center justify-center bg-amber-500 hover:bg-amber-400 text-black active:scale-90 rounded-lg transition font-black"
                        title="Increase"
                      >
                        <Plus size={15} strokeWidth={2.5} />
                      </button>
                    </div>

                    <button 
                      onClick={() => removeFromCart(idx)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title="Remove Item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer / Submit Order */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-800 bg-slate-900/80 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Total Order Lines:</span>
                  <span className="font-mono font-bold text-white">{cart.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold text-white border-b border-slate-800 pb-2">
                  <span>Total Wholesale Pieces:</span>
                  <span className="font-mono text-brand-gold text-base">{totalPieces} pcs</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={clearCart}
                    className="px-3 py-3 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 text-xs font-bold transition"
                  >
                    Clear
                  </button>

                  <button
                    onClick={handleQuickPlaceOrder}
                    disabled={!currentCustomer}
                    className="flex-1 py-3 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={16} />
                    <span>Confirm & Dispatch Order</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Login / Selection Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
          <div className="bg-brand-navy-card border border-brand-navy-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h2 className="text-lg font-black text-white">Select / Enter Customer</h2>
              <button onClick={() => setShowLogin(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Fast Quick Select from Existing Accounts */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Quick Select Registered Shop:
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                {customers.map(c => (
                  <button
                    key={c.customerCode}
                    type="button"
                    onClick={() => {
                      setCurrentCustomer(c);
                      setShowLogin(false);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left border flex items-center justify-between transition ${
                      currentCustomer?.customerCode === c.customerCode
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">{c.shopName}</div>
                      <div className="text-[11px] text-slate-400">{c.cityName} • {c.mobileNumber}</div>
                    </div>
                    <span className="font-mono text-xs font-bold text-brand-gold bg-black/40 px-2 py-0.5 rounded">
                      {c.customerCode}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-500">
                <span className="bg-brand-navy-card px-2">Or enter ID manually</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Enter Customer Code (e.g. CUST-101)"
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-brand-gold text-sm"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowLogin(false)} 
                  className="px-4 py-2 rounded-xl font-bold text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 rounded-xl font-black text-xs bg-brand-gold text-black hover:bg-brand-gold-light transition"
                >
                  Confirm Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Success Toast Notification */}
      {orderSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-[120] bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400/30 animate-slideUp">
          <CheckCircle2 size={22} className="text-white" />
          <div>
            <div className="font-black text-sm">Order Placed Successfully!</div>
            <div className="text-xs text-emerald-100">{orderSuccessMsg}</div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/category/:id" element={<CategoryGallery />} />
          <Route path="/subcategory/:id" element={<SubCategoryGallery />} />
          <Route path="/cart" element={<Cart />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
