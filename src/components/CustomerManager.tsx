import { useState } from 'react';
import { 
  Users, 
  Trash2, 
  Search, 
  Store, 
  MapPin, 
  Phone, 
  ShoppingBag, 
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useAppStore } from '../store';
import { Customer } from '../types';
import { deleteCustomerWithCascade } from '../firebase';

export function CustomerManager() {
  const customers = useAppStore(state => state.customers);
  const orders = useAppStore(state => state.orders);
  const deleteCustomerInStore = useAppStore(state => state.deleteCustomer);

  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const sName = (c.shopName || '').toLowerCase();
    const oName = (c.ownerName || c.contactPerson || '').toLowerCase();
    const city = (c.city || c.cityName || '').toLowerCase();
    const phone = (c.phone || c.mobileNumber || '').toLowerCase();
    const cid = (c.customerId || c.customerCode || '').toLowerCase();
    return sName.includes(q) || oName.includes(q) || city.includes(q) || phone.includes(q) || cid.includes(q);
  });

  const getCustomerOrderCount = (customerKey: string) => {
    return orders.filter(o => o.customerId === customerKey || o.customerCode === customerKey).length;
  };

  const handleDelete = async (customer: Customer) => {
    const cid = customer.customerId || customer.customerCode;
    if (!cid) return;

    const orderCount = getCustomerOrderCount(cid);
    const confirmed = window.confirm(
      `PERMANENT CASCADING DELETION\n\n` +
      `Are you sure you want to permanently delete customer:\n` +
      `• Shop: "${customer.shopName}"\n` +
      `• Customer ID: ${cid}\n\n` +
      `This will permanently delete:\n` +
      `1. All (${orderCount}) linked orders in Firestore\n` +
      `2. All active shopping carts in 'carts' and 'cart'\n` +
      `3. All chat messages, conversations, and community posts\n` +
      `4. All voice recordings & audio in Firebase Storage (voiceNotes/, orders/)\n` +
      `5. The customer account record itself.\n\n` +
      `This action CANNOT be undone. Proceed?`
    );

    if (!confirmed) return;

    setIsDeleting(cid);
    setFeedback(null);

    try {
      const result = await deleteCustomerWithCascade(cid);
      deleteCustomerInStore(cid);

      setFeedback({
        type: 'success',
        message: `Successfully deleted "${customer.shopName}" (${cid}). Cleaned ${result.deletedOrdersCount} orders, ${result.deletedCartsCount} carts, ${result.deletedMessagesCount} messages & audio storage.`
      });
    } catch (err: any) {
      console.error('Cascading deletion error:', err);
      setFeedback({
        type: 'error',
        message: `Error during deletion: ${err?.message || 'Failed to complete cascading deletion.'}`
      });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 p-4 sm:p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Users className="text-brand-gold" size={20} />
            Customer Directory & Cascading Deletion
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage wholesale customers. Deleting a profile automatically cascades to all linked orders, carts, and storage assets.
          </p>
        </div>

        <div className="text-xs bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 font-bold">
          Total Customers: <span className="text-brand-gold">{customers.length}</span>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`mt-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="my-4 relative">
        <Search className="absolute left-3.5 top-3 text-slate-500" size={16} />
        <input
          type="text"
          placeholder="Search customers by Shop Name, Owner, City, Phone, or ID (e.g. CUST-765)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-gold transition"
        />
      </div>

      {/* Customers List */}
      <div className="space-y-3 flex-1 pb-8">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-900/40 border border-slate-800/60 rounded-2xl">
            <Users size={36} className="mx-auto mb-2 text-slate-600" />
            <p className="text-sm font-bold text-slate-400">No customers found matching your criteria</p>
            <p className="text-xs text-slate-500 mt-1">Try clearing or adjusting your search term</p>
          </div>
        ) : (
          filteredCustomers.map((cust) => {
            const cid = cust.customerId || cust.customerCode || 'UNKNOWN';
            const orderCount = getCustomerOrderCount(cid);
            const isTargetDeleting = isDeleting === cid;

            return (
              <div
                key={cid}
                className="bg-brand-navy-card/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:border-slate-700 shadow-sm"
              >
                {/* Info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-sm text-white flex items-center gap-2">
                      <Store size={15} className="text-brand-gold" />
                      {cust.shopName}
                    </h3>
                    <span className="font-mono text-xs font-bold text-brand-gold bg-black/60 px-2 py-0.5 rounded border border-slate-800">
                      {cid}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      cust.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {cust.status || 'Active'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                    <span>Owner: <strong className="text-slate-200">{cust.ownerName || cust.contactPerson || 'N/A'}</strong></span>
                    {(cust.city || cust.cityName) && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-slate-500" />
                        {cust.city || cust.cityName}
                      </span>
                    )}
                    {(cust.phone || cust.mobileNumber) && (
                      <span className="flex items-center gap-1 font-mono">
                        <Phone size={12} className="text-slate-500" />
                        {cust.phone || cust.mobileNumber}
                      </span>
                    )}
                  </div>

                  {cust.address && (
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {cust.address}
                    </p>
                  )}
                </div>

                {/* Badges & Actions */}
                <div className="flex items-center gap-3 self-end md:self-auto">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs">
                    <ShoppingBag size={13} className="text-purple-400" />
                    <span className="font-bold text-slate-300">{orderCount}</span>
                    <span className="text-slate-500 text-[10px]">orders</span>
                  </div>

                  <button
                    onClick={() => handleDelete(cust)}
                    disabled={isTargetDeleting}
                    className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 px-3 py-2 rounded-xl text-xs font-black transition disabled:opacity-50"
                    title="Permanently delete this customer and all linked orders, carts, and audio notes"
                  >
                    <Trash2 size={14} className={isTargetDeleting ? 'animate-spin' : ''} />
                    <span>{isTargetDeleting ? 'Deleting All...' : 'Delete Customer'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
