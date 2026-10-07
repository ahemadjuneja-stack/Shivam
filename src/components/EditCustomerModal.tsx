import { useState, useEffect } from 'react';
import { Customer } from '../types';
import { X, Save, Building2 } from 'lucide-react';

interface EditCustomerModalProps {
  customer: Customer | null;
  onClose: () => void;
  onSave: (customerCode: string, data: Partial<Customer>) => void;
}

export function EditCustomerModal({ customer, onClose, onSave }: EditCustomerModalProps) {
  const [formData, setFormData] = useState<Customer>({
    customerCode: '',
    shopName: '',
    cityName: '',
    mobileNumber: '',
    contactPerson: '',
    address: ''
  });

  useEffect(() => {
    if (customer) {
      setFormData(customer);
    }
  }, [customer]);

  if (!customer) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(customer.customerCode, {
      shopName: formData.shopName.trim(),
      cityName: formData.cityName.trim(),
      mobileNumber: formData.mobileNumber.trim(),
      contactPerson: formData.contactPerson.trim(),
      address: formData.address.trim()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Building2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Edit Wholesale Client</h3>
              <p className="text-[11px] font-mono text-amber-400 font-bold">{customer.customerCode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              Shop / Retail Business Name *
            </label>
            <input
              type="text"
              required
              value={formData.shopName}
              onChange={e => setFormData({ ...formData, shopName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                City *
              </label>
              <input
                type="text"
                required
                value={formData.cityName}
                onChange={e => setFormData({ ...formData, cityName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
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
              value={formData.mobileNumber}
              onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              Market / Delivery Address
            </label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition shadow-lg"
            >
              <Save size={14} />
              <span>Save Changes</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
