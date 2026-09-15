import { useAppStore } from '../store';
import { Trash2, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Cart() {
  const cart = useAppStore(state => state.cart);
  const removeFromCart = useAppStore(state => state.removeFromCart);
  const currentCustomer = useAppStore(state => state.currentCustomer);
  const placeOrder = useAppStore(state => state.placeOrder);
  const navigate = useNavigate();

  const handlePlaceOrder = () => {
    if (!currentCustomer) {
      alert('Please login as a customer first!');
      return;
    }
    placeOrder();
    alert('Order placed successfully!');
    navigate('/');
  };

  if (cart.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-slate-400">Your cart is empty</h2>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-black text-white mb-6">Review Order</h2>

      <div className="bg-brand-navy-card border border-slate-700 rounded-xl overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <h3 className="font-bold text-lg">Order Items ({cart.length})</h3>
        </div>
        <div className="divide-y divide-slate-700">
          {cart.map((item, idx) => (
            <div key={idx} className="p-4 flex items-center gap-4">
              <img src={item.imageUri} alt={item.photoCode} className="w-16 h-16 rounded-md object-cover border border-slate-600" />
              <div className="flex-1">
                <div className="font-bold text-white">{item.photoCode} • Option {item.optionLetter}</div>
                <div className="text-sm text-slate-400">{item.subCategoryName}</div>
              </div>
              <div className="text-right mr-4">
                <div className="text-xs text-slate-400">Qty</div>
                <div className="font-bold text-lg">{item.quantity}</div>
              </div>
              <button onClick={() => removeFromCart(idx)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition">
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-brand-navy-card border border-slate-700 rounded-xl p-6">
        <h3 className="font-bold text-lg mb-4">Customer Details</h3>
        {currentCustomer ? (
          <div className="space-y-2 text-sm">
            <p><span className="text-slate-400">ID:</span> <span className="font-bold">{currentCustomer.customerCode}</span></p>
            <p><span className="text-slate-400">Shop:</span> <span className="font-bold">{currentCustomer.shopName}</span></p>
            <p><span className="text-slate-400">City:</span> <span className="font-bold">{currentCustomer.cityName}</span></p>
            <p><span className="text-slate-400">Mobile:</span> <span className="font-bold">{currentCustomer.mobileNumber}</span></p>
          </div>
        ) : (
          <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 p-3 rounded-lg text-sm">
            Please login from the top right menu to place an order.
          </div>
        )}

        <button 
          onClick={handlePlaceOrder}
          disabled={!currentCustomer}
          className="mt-6 w-full bg-brand-gold hover:bg-brand-gold-light text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={20} /> Submit Wholesale Order
        </button>
      </div>
    </div>
  );
}
