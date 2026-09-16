import { useState } from 'react';
import { useAppStore } from '../store';
import { Package, UserPlus } from 'lucide-react';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'orders' | 'customers'>('orders');
  
  const orders = useAppStore(state => state.orders);
  const customers = useAppStore(state => state.customers);
  const addCustomer = useAppStore(state => state.addCustomer);
  const updateOrderStatus = useAppStore(state => state.updateOrderStatus);
  const resetToDefaults = useAppStore(state => state.resetToDefaults);

  const [newCust, setNewCust] = useState({
    customerCode: `CUST-${Math.floor(Math.random() * 9000) + 1000}`,
    shopName: '',
    cityName: '',
    mobileNumber: '',
    contactPerson: '',
    address: ''
  });

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    addCustomer(newCust);
    alert(`Created ID: ${newCust.customerCode}`);
    setNewCust({
      customerCode: `CUST-${Math.floor(Math.random() * 9000) + 1000}`,
      shopName: '',
      cityName: '',
      mobileNumber: '',
      contactPerson: '',
      address: ''
    });
  };

  const renderStatusBadge = (status: string) => {
    if (status === 'DONE') return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">DONE</span>;
    if (status === 'PENDING') return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold">PENDING</span>;
    return <span className="bg-slate-700/50 text-slate-400 border border-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">N/A</span>;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-4 mb-6">
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition ${activeTab === 'orders' ? 'bg-brand-gold text-black shadow-lg shadow-amber-500/20' : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'}`}
          >
            <Package size={16} /> Live Orders & Packing
          </button>
          <button 
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition ${activeTab === 'customers' ? 'bg-brand-gold text-black shadow-lg shadow-amber-500/20' : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'}`}
          >
            <UserPlus size={16} /> Customers
          </button>
        </div>

        <button
          onClick={() => {
            if (confirm('Reset catalog and showroom to default clean data?')) {
              resetToDefaults();
              alert('Showroom data restored successfully!');
            }
          }}
          className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition"
        >
          Reset Showroom Defaults
        </button>
      </div>

      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-10 text-slate-400">No orders yet.</div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-brand-navy-card border border-slate-700 rounded-xl p-4">
                <div className="flex justify-between items-start mb-4 border-b border-slate-700 pb-3">
                  <div>
                    <h3 className="font-black text-lg text-white">{order.orderNumber}</h3>
                    <p className="text-xs text-slate-400">{order.shopName} ({order.cityName}) • {order.totalItemsCount} Items</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400">{new Date(order.createdAt).toLocaleString()}</div>
                    <div className="font-bold text-sm text-brand-gold mt-1">{order.overallStatus.replace(/_/g, ' ')}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex flex-col items-center justify-center gap-2">
                    <span className="text-xs font-bold text-slate-300">Imitation</span>
                    {renderStatusBadge(order.imitationStatus)}
                    {order.imitationStatus === 'PENDING' && (
                      <button onClick={() => updateOrderStatus(order.id, 'imitation', 'DONE')} className="mt-2 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded">Mark Done</button>
                    )}
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex flex-col items-center justify-center gap-2">
                    <span className="text-xs font-bold text-slate-300">Cosmetics</span>
                    {renderStatusBadge(order.cosmeticsStatus)}
                    {order.cosmeticsStatus === 'PENDING' && (
                      <button onClick={() => updateOrderStatus(order.id, 'cosmetics', 'DONE')} className="mt-2 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded">Mark Done</button>
                    )}
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex flex-col items-center justify-center gap-2">
                    <span className="text-xs font-bold text-slate-300">Hair Accessories</span>
                    {renderStatusBadge(order.hairStatus)}
                    {order.hairStatus === 'PENDING' && (
                      <button onClick={() => updateOrderStatus(order.id, 'hair', 'DONE')} className="mt-2 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded">Mark Done</button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-brand-navy-card border border-slate-700 rounded-xl p-6 h-fit">
            <h3 className="font-bold text-lg mb-4">Create New Customer ID</h3>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Generated ID (Give this to customer)</label>
                <input type="text" value={newCust.customerCode} readOnly className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-brand-gold font-mono font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Shop Name</label>
                <input type="text" required value={newCust.shopName} onChange={e => setNewCust({...newCust, shopName: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">City</label>
                <input type="text" required value={newCust.cityName} onChange={e => setNewCust({...newCust, cityName: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Mobile Number</label>
                <input type="tel" required value={newCust.mobileNumber} onChange={e => setNewCust({...newCust, mobileNumber: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white" />
              </div>
              <button type="submit" className="w-full bg-brand-gold hover:bg-brand-gold-light text-black font-bold py-2 rounded-lg transition">Save Customer</button>
            </form>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Existing Customers</h3>
            <div className="space-y-3">
              {customers.map(c => (
                <div key={c.customerCode} className="bg-brand-navy-card border border-slate-700 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">{c.shopName}</div>
                    <div className="text-xs text-slate-400">{c.cityName} • {c.mobileNumber}</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-xs font-mono text-brand-gold-light">
                    {c.customerCode}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
