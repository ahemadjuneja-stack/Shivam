import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Home } from './pages/Home';
import { AdminDashboard } from './pages/AdminDashboard';
import { CategoryGallery } from './pages/CategoryGallery';
import { SubCategoryGallery } from './pages/SubCategoryGallery';
import { Cart } from './pages/Cart';
import { useAppStore } from './store';
import { ShoppingBag, UserCircle, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

function AppShell({ children }: { children: React.ReactNode }) {
  const cart = useAppStore(state => state.cart);
  const currentCustomer = useAppStore(state => state.currentCustomer);
  const customers = useAppStore(state => state.customers);
  const setCurrentCustomer = useAppStore(state => state.setCurrentCustomer);
  const [showLogin, setShowLogin] = useState(false);
  const [loginId, setLoginId] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.customerCode === loginId);
    if (cust) {
      setCurrentCustomer(cust);
      setShowLogin(false);
      setLoginId('');
    } else {
      alert('Customer not found');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-navy-dark text-slate-100 font-sans">
      <header className="bg-brand-navy-card border-b border-brand-navy-border sticky top-0 z-50 px-4 py-3 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-black text-xl shadow-lg">
              S
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wider text-white">SHIVAM</h1>
              <p className="text-[10px] text-slate-400">Cosmetics • Hair • Imitation</p>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-md">
              <ShieldAlert size={14} /> Admin
            </Link>
            
            <button 
              onClick={() => currentCustomer ? setCurrentCustomer(null) : setShowLogin(true)}
              className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-xs"
            >
              <UserCircle size={16} className="text-brand-gold" />
              {currentCustomer ? (
                <div className="text-left">
                  <div className="font-bold text-brand-gold-light">{currentCustomer.customerCode}</div>
                  <div className="truncate max-w-[100px]">{currentCustomer.shopName}</div>
                </div>
              ) : (
                <span className="font-bold">Login</span>
              )}
            </button>
            
            <Link to="/cart" className="relative p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition">
              <ShoppingBag size={20} className="text-brand-gold-light" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-gold text-black text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {cart.length}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6">
        {children}
      </main>

      {showLogin && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-brand-navy-card border border-brand-navy-border rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">Customer Login</h2>
            <form onSubmit={handleLogin}>
              <input
                type="text"
                placeholder="Enter Customer ID (e.g. CUST-101)"
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white mb-4 focus:outline-none focus:border-brand-gold"
                required
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowLogin(false)} className="px-4 py-2 rounded-lg font-bold text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg font-bold bg-brand-gold text-black">Login</button>
              </div>
            </form>
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
