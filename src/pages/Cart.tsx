import { useAppStore } from '../store';
import { Trash2, Send, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Cart() {
  const cart = useAppStore(state => state.cart);
  const removeFromCart = useAppStore(state => state.removeFromCart);
  const updateCartItemQuantity = useAppStore(state => state.updateCartItemQuantity);
  const currentCustomer = useAppStore(state => state.currentCustomer);
  const placeOrder = useAppStore(state => state.placeOrder);
  const navigate = useNavigate();

  const handlePlaceOrder = () => {
    if (!currentCustomer) {
      alert('Please login as a customer shop first!');
      return;
    }
    placeOrder();
    alert('Order placed and synced to Firestore successfully!');
    navigate('/');
  };

  if (cart.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
        <ShoppingBag size={48} className="text-slate-600 mb-3" />
        <h2 className="text-xl font-bold text-slate-400">Your order slip is empty</h2>
        <p className="text-xs text-slate-500 mt-1">Browse categories to add jewelry items to your order.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full py-2 overflow-y-auto pr-1 scrollbar-thin">
      <h2 className="text-xl sm:text-2xl font-black text-white mb-4">Review Order Slip</h2>

      <div className="bg-brand-navy-card border border-slate-700 rounded-xl overflow-hidden mb-5 shadow-lg">
        <div className="p-3 sm:p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
          <h3 className="font-bold text-sm sm:text-base text-white">Selected Items ({cart.length})</h3>
          <span className="text-xs font-mono text-amber-300 font-bold">
            Total Qty: {cart.reduce((s, i) => s + i.quantity, 0)} pcs
          </span>
        </div>
        <div className="divide-y divide-slate-700">
          {cart.map((item, idx) => (
            <div key={idx} className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
              <img src={item.imageUri} alt={item.photoCode} className="w-16 h-16 rounded-lg object-cover border border-slate-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-xs sm:text-sm truncate">
                  {item.photoCode} • Option {item.optionLetter}
                </div>
                <div className="text-xs text-slate-400 truncate">{item.subCategoryName}</div>
              </div>
              <div className="flex items-center bg-slate-950 border border-slate-700/80 rounded-xl overflow-hidden p-0.5">
                <button 
                  onClick={() => {
                    const step = item.quantity >= 12 ? 6 : 1;
                    updateCartItemQuantity(idx, item.quantity - step);
                  }}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 active:scale-90 rounded-lg transition"
                  title="Decrease"
                >
                  <Minus size={15} strokeWidth={2.5} />
                </button>
                <div className="w-10 sm:w-12 text-center">
                  <span className="font-mono font-black text-sm sm:text-base text-brand-gold">{item.quantity}</span>
                  <span className="block text-[9px] text-slate-400">pcs</span>
                </div>
                <button 
                  onClick={() => {
                    const step = item.quantity >= 12 ? 6 : 1;
                    updateCartItemQuantity(idx, item.quantity + step);
                  }}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-amber-500 hover:bg-amber-400 text-black font-black active:scale-90 rounded-lg transition"
                  title="Increase"
                >
                  <Plus size={15} strokeWidth={2.5} />
                </button>
              </div>
              <button onClick={() => removeFromCart(idx)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition flex-shrink-0">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-brand-navy-card border border-slate-700 rounded-xl p-4 sm:p-5 shadow-lg">
        <h3 className="font-bold text-sm sm:text-base mb-3 text-white">Wholesale Customer Shop</h3>
        {currentCustomer ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-slate-400">Shop Name:</span>
              <span className="font-black text-white text-sm">{currentCustomer.shopName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Customer ID:</span>
              <span className="font-mono font-bold text-amber-400">{currentCustomer.customerId || currentCustomer.customerCode}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Owner / Contact:</span>
              <span className="font-medium text-slate-200">{currentCustomer.ownerName || currentCustomer.contactPerson}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">City / Phone:</span>
              <span className="font-medium text-slate-300">
                {currentCustomer.city || currentCustomer.cityName} • {currentCustomer.phone || currentCustomer.mobileNumber}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 p-3 rounded-lg text-xs">
            Please login or register your shop before submitting an order.
          </div>
        )}

        <button 
          onClick={handlePlaceOrder}
          disabled={!currentCustomer}
          className="mt-5 w-full bg-brand-gold hover:bg-brand-gold-light text-black font-black py-3.5 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          <Send size={18} /> Submit Wholesale Order
        </button>
      </div>
    </div>
  );
}
