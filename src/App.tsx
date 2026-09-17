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
  X, 
  Trash2, 
  Send, 
  CheckCircle2,
  Store,
  Minus,
  Plus,
  Mic,
  Square,
  MessageCircle
} from 'lucide-react';
import { useState, useRef } from 'react';
import { ChatModal } from './components/ChatModal';


function VoiceRecorder() {
  const { orderVoiceNote, setOrderVoiceNote } = useAppStore();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    setMicNotice(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicNotice("Microphone recording is not supported in this browser. Please use text notes.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setOrderVoiceNote(reader.result as string);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 119) { // 2 minutes max
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      if (err?.name === 'NotFoundError' || err?.message?.includes('Requested device not found') || err?.message?.includes('not found')) {
        setMicNotice("No microphone found on this device. You can type instructions in the Order Note box above.");
      } else if (err?.name === 'NotAllowedError' || err?.message?.includes('sandboxed') || err?.message?.includes('Permission denied') || err?.name === 'SecurityError') {
        setMicNotice("Microphone access is blocked. Please allow mic permission in your browser or type in Order Note.");
      } else {
        setMicNotice("Microphone unavailable. Please write instructions in the Order Note box above.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const deleteRecording = () => {
    setOrderVoiceNote(null);
    setRecordingTime(0);
  };

  if (orderVoiceNote) {
    return (
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 p-2 rounded-lg mt-1">
        <audio controls src={orderVoiceNote} className="h-8 flex-1 max-w-[200px]" />
        <button 
          onClick={deleteRecording} 
          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-1">
      <div className="flex items-center gap-2">
        {isRecording ? (
          <button
            onClick={stopRecording}
            className="flex-1 flex items-center justify-center gap-2 bg-red-500/20 text-red-400 border border-red-500/30 p-2 rounded-lg font-bold text-xs animate-pulse"
          >
            <Square size={14} fill="currentColor" />
            <span>Stop ({Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}/2:00)</span>
          </button>
        ) : (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-lg text-xs font-bold transition border border-slate-700"
          >
            <Mic size={14} />
            <span>Add Voice Note (Max 2m)</span>
          </button>
        )}
      </div>
      {micNotice && (
        <div className="text-[11px] text-amber-300/90 bg-amber-950/40 border border-amber-500/30 px-2.5 py-1.5 rounded-lg leading-tight">
          {micNotice}
        </div>
      )}
    </div>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  const cart = useAppStore(state => state.cart);
  const removeFromCart = useAppStore(state => state.removeFromCart);
  const updateCartItemQuantity = useAppStore(state => state.updateCartItemQuantity);
  const placeOrder = useAppStore(state => state.placeOrder);
  
  const currentCustomer = useAppStore(state => state.currentCustomer);
  const customers = useAppStore(state => state.customers);
  const setCurrentCustomer = useAppStore(state => state.setCurrentCustomer);
  
  const isCartOpen = useAppStore(state => state.isCartOpen);
  const setIsCartOpen = useAppStore(state => state.setIsCartOpen);
  const showroomScreenMode = useAppStore(state => state.showroomScreenMode);
  
  const orderNote = useAppStore(state => state.orderNote);
  const setOrderNote = useAppStore(state => state.setOrderNote);

  const [showLogin, setShowLogin] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
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
  // 2. SHOWROOM APP CONTAINER (Mobile Full Screen, with CSS rotation)
  // ---------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 w-full h-full bg-brand-navy-dark text-slate-100 font-sans antialiased overflow-hidden select-none pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] flex items-center justify-center">
      
      

      {/* MOBILE SHOWROOM CONTAINER */}
      <div 
        className="relative bg-brand-navy-dark overflow-hidden flex flex-col transition-all duration-300 shadow-2xl w-full h-full"
      >
        
        {/* APP ACTION BAR (Shown on Home only, hidden in subcategories) */}
        {showroomScreenMode === 'home' && (
          <header className="bg-brand-navy-card/95 backdrop-blur-md border-b border-brand-navy-border px-3 py-1.5 flex items-center justify-between gap-3 flex-shrink-0 z-20">
            {/* Brand Logo & Name */}
            <Link to="/" className="flex items-center gap-2 group">
              <img src="/icon.svg" alt="SHIVAM" className="w-7 h-7 rounded-lg shadow-md group-hover:scale-105 transition-transform" />
              <h1 className="text-sm font-black tracking-wider text-white">SHIVAM</h1>
            </Link>

            {/* Right Header Utilities: Install App, Customer ID, Order Slip Button */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              
              {/* Communicate / Chat Button */}
              {currentCustomer && (
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="flex items-center gap-1 bg-brand-gold/10 border border-brand-gold/50 hover:bg-brand-gold hover:text-black text-brand-gold px-2.5 py-1 rounded-lg text-[11px] transition font-bold"
                >
                  <MessageCircle size={14} />
                  <span className="hidden sm:inline">Communicate</span>
                </button>
              )}

              {/* Customer Switcher / Login */}
              <button 
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-1 bg-slate-900 border border-slate-700 hover:border-brand-gold px-2.5 py-1 rounded-lg text-[11px] transition"
              >
                <UserCircle size={14} className="text-brand-gold" />
                {currentCustomer ? (
                  <span className="font-bold text-brand-gold-light">Profile</span>
                ) : (
                  <span className="font-bold text-white">Login</span>
                )}
              </button>

              {/* Top Order Slip / Cart Button */}
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center justify-center bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black w-7 h-7 rounded-lg transition shadow-md active:scale-95"
              >
                <ShoppingBag size={16} />
              </button>
            </div>
          </header>
        )}

        {/* MAIN SHOWROOM CONTENT AREA */}
        <main className="flex-1 w-full p-2 overflow-hidden flex flex-col">
          {children}
        </main>

        {/* ANDROID BOTTOM GESTURE PILL BAR */}
        <div className="h-3 bg-brand-navy-dark flex items-center justify-center flex-shrink-0 z-20">
          <div className="w-20 h-1 bg-slate-700 rounded-full" />
        </div>

      </div>

      {/* Full-Screen Cart / Order Slip */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col landscape:flex-row animate-fadeIn overflow-hidden">
          
          {/* Main Area: Scrollable Large Images (Left in landscape, Top in portrait) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin flex flex-col h-full bg-slate-950">
            <div className="flex items-center gap-3 mb-2 flex-shrink-0">
               <button 
                onClick={() => setIsCartOpen(false)}
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 border border-slate-700 transition"
              >
                <X size={24} />
              </button>
              <h3 className="font-black text-xl text-white flex items-center gap-2">
                <ShoppingBag className="text-brand-gold" size={24} /> 
                Wholesale Order Slip
              </h3>
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
                <ShoppingBag size={48} className="mx-auto text-slate-600 mb-4" />
                <p className="font-bold text-lg text-slate-300">Your order slip is empty</p>
                <p className="text-sm text-slate-500 mt-2">Select items from the showroom to build your order.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-[env(safe-area-inset-bottom)]">
                {cart.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="bg-brand-navy-card border border-brand-navy-border p-3 rounded-2xl flex flex-col gap-3 shadow-lg"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-800">
                      <img 
                        src={item.imageUri} 
                        alt={item.photoCode} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-black bg-white px-2 py-0.5 rounded shadow">
                          {item.photoCode}
                        </span>
                        <span className="font-black text-sm text-black bg-brand-gold px-2 py-0.5 rounded shadow">
                          Option {item.optionLetter}
                        </span>
                      </div>
                      <button 
                        onClick={() => removeFromCart(idx)}
                        className="absolute top-2 right-2 p-2 bg-black/60 text-slate-300 hover:text-red-400 hover:bg-red-500/20 backdrop-blur-md rounded-lg transition"
                        title="Remove Item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Big Finger-Friendly Stepper in Cart */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl overflow-hidden p-1 flex-1">
                        <button
                          onClick={() => {
                            const step = item.quantity >= 12 ? 6 : 1;
                            updateCartItemQuantity(idx, item.quantity - step);
                          }}
                          className="flex-1 py-3 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 active:scale-95 rounded-lg transition"
                        >
                          <Minus size={20} strokeWidth={2.5} />
                        </button>
                        <span className="w-16 text-center font-mono font-black text-lg text-amber-300 select-none">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => {
                            const step = item.quantity >= 12 ? 6 : 1;
                            updateCartItemQuantity(idx, item.quantity + step);
                          }}
                          className="flex-1 py-3 flex items-center justify-center bg-amber-500 hover:bg-amber-400 text-black active:scale-95 rounded-lg transition font-black"
                        >
                          <Plus size={20} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right/Bottom Side Panel: Customer, Notes, and Dispatch */}
          <div className="w-full landscape:w-[350px] md:landscape:w-[400px] bg-slate-900 border-t landscape:border-t-0 landscape:border-l border-slate-800 flex flex-col shadow-2xl flex-shrink-0 h-auto landscape:h-full z-10 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            
            {/* Notes Section - Can expand flex-1 in landscape */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Order Note</label>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Type any specific instructions for this order here..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-gold min-h-[80px] landscape:min-h-[120px] resize-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Voice Recording</label>
                <VoiceRecorder />
              </div>
            </div>

            {/* Submit Order Bottom Box */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex-shrink-0">
              <div className="flex gap-2">
                <button 
                  disabled={cart.length === 0}
                  onClick={() => {
                    if (!currentCustomer) {
                      setShowLogin(true);
                      return;
                    }
                    placeOrder();
                    setOrderSuccessMsg('Order dispatched successfully to admin!');
                    setTimeout(() => setOrderSuccessMsg(null), 3000);
                  }}
                  className="flex-1 py-4 px-4 rounded-xl font-black text-base bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                  <span>Dispatch Order</span>
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}

      {/* Customer Login / Profile Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
          <div className="bg-brand-navy-card border border-brand-navy-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h2 className="text-lg font-black text-white">{currentCustomer ? 'Customer Profile' : 'Select / Enter Customer'}</h2>
              <button onClick={() => setShowLogin(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {currentCustomer ? (
              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500">Shop Name</label>
                    <div className="font-bold text-white text-base">{currentCustomer.shopName}</div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500">Customer Name</label>
                    <div className="font-medium text-slate-300">{currentCustomer.contactPerson}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500">Mobile Number</label>
                      <div className="font-medium text-slate-300">{currentCustomer.mobileNumber}</div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500">Code</label>
                      <div className="font-mono font-bold text-brand-gold bg-black/40 px-2 py-0.5 rounded border border-slate-800">{currentCustomer.customerCode}</div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500">Address</label>
                    <div className="font-medium text-slate-300">{currentCustomer.address}, {currentCustomer.cityName}</div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowLogin(false)} 
                    className="px-4 py-2 rounded-xl font-bold text-xs text-slate-400 hover:text-white"
                  >
                    Close
                  </button>
                  <button 
                    onClick={() => {
                      setCurrentCustomer(null);
                      setShowLogin(false);
                    }}
                    className="px-5 py-2 rounded-xl font-black text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                        className={`w-full p-2.5 rounded-xl text-left border flex items-center justify-between transition bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-200`}
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
              </>
            )}
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

      {/* CHAT MODAL */}
      <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
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
