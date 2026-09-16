import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
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
  MapPin
} from 'lucide-react';
import { useState, useEffect } from 'react';

function AppShell({ children }: { children: React.ReactNode }) {
  const cart = useAppStore(state => state.cart);
  const removeFromCart = useAppStore(state => state.removeFromCart);
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
  
  // Track device/screen orientation
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight > window.innerWidth;
    }
    return false;
  });
  const [forceRotateLandscape, setForceRotateLandscape] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return (
    <div 
      className={`fixed inset-0 bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden select-none ${
        forceRotateLandscape
          ? 'origin-top-left'
          : ''
      }`}
      style={forceRotateLandscape ? {
        width: '100vh',
        height: '100vw',
        transform: 'rotate(90deg) translateY(-100%)',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 50
      } : {
        width: '100vw',
        height: '100vh'
      }}
    >
      
      {/* Landscape Helper Notice when in Portrait Mode */}
      {isPortrait && !forceRotateLandscape && (
        <div className="bg-amber-500/90 text-black px-3 py-1 text-xs font-bold flex items-center justify-between z-50 flex-shrink-0 animate-fadeIn">
          <div className="flex items-center gap-1.5">
            <span>📱 Turn phone sideways for full Landscape Showroom</span>
          </div>
          <button
            onClick={() => setForceRotateLandscape(true)}
            className="bg-black text-amber-400 px-2.5 py-0.5 rounded text-[11px] font-black hover:bg-slate-900 transition flex items-center gap-1 active:scale-95"
          >
            <span>Rotate App 90° 🔄</span>
          </button>
        </div>
      )}

      {/* ANDROID LANDSCAPE MOBILE CONTAINER */}
      <div className="w-full h-full flex flex-col bg-brand-navy-dark overflow-hidden">
        
        {/* ANDROID TOP STATUS BAR (Shown on Home only) */}
        {showroomScreenMode === 'home' && (
          <div className="h-6 bg-slate-950/95 px-4 flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-white/5 flex-shrink-0 z-30">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-200">10:24</span>
              <span className="text-[10px] text-amber-400/90 font-bold tracking-wider">LANDSCAPE SHOWROOM</span>
            </div>

            {/* Front Camera Punch-hole indicator */}
            <div className="w-3 h-3 rounded-full bg-black border border-slate-800 shadow-inner flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-slate-800" />
            </div>

            <div className="flex items-center gap-2.5 text-slate-300">
              <span className="text-[10px] font-black text-amber-400">5G</span>
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4z"/></svg>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold">92%</span>
                <div className="w-4 h-2 rounded-[2px] border border-slate-400 p-[1px] flex">
                  <div className="h-full w-[85%] bg-emerald-400 rounded-[1px]" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ANDROID APP ACTION BAR (Shown on Home only, hidden in subcategories) */}
        {showroomScreenMode === 'home' && (
          <header className="bg-brand-navy-card/95 backdrop-blur-md border-b border-brand-navy-border px-3 py-1.5 flex items-center justify-between gap-3 flex-shrink-0 z-20">
            {/* Brand Logo & Name */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-black text-sm shadow-md group-hover:scale-105 transition-transform">
                S
              </div>
              <h1 className="text-sm font-black tracking-wider text-white">SHIVAM</h1>
            </Link>

            {/* Right Header Utilities: Rotate toggle, Admin, Customer ID, Order Slip Button */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              
              {/* Instant Landscape Rotate 90deg Toggle */}
              <button
                onClick={() => setForceRotateLandscape(!forceRotateLandscape)}
                className="text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1 bg-slate-900 border border-slate-800 hover:border-brand-gold px-2 py-1 rounded-lg transition"
                title="Rotate screen 90 degrees"
              >
                <span>🔄 {forceRotateLandscape ? 'Normal' : 'Rotate 90°'}</span>
              </button>

              {/* Admin Dashboard */}
              <Link 
                to="/admin" 
                className="text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1 bg-slate-900 border border-slate-800 hover:border-slate-700 px-2 py-1 rounded-lg transition"
              >
                <ShieldAlert size={13} className="text-amber-400" />
                <span className="hidden sm:inline">Admin</span>
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

        {/* MAIN HORIZONTAL LANDSCAPE CONTENT AREA */}
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
                      <div className="text-xs font-mono font-bold text-amber-300 mt-1">
                        Quantity: <span className="text-white text-sm">{item.quantity} pcs</span>
                      </div>
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
