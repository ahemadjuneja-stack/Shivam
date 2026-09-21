import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppStore } from '../store';
import { Customer } from '../types';
import { 
  Building2, 
  User, 
  Phone, 
  MapPin, 
  Lock, 
  ArrowLeft, 
  CheckCircle2, 
  Store,
  ShieldCheck
} from 'lucide-react';

export function Register() {
  const navigate = useNavigate();
  const addCustomer = useAppStore(state => state.addCustomer);
  const setCurrentCustomer = useAppStore(state => state.setCurrentCustomer);

  const [formData, setFormData] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    city: '',
    address: '',
    pin: '1111'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const shopName = formData.shopName.trim();
    const ownerName = formData.ownerName.trim();
    const phone = formData.phone.trim();
    const city = formData.city.trim();
    const address = formData.address.trim();
    const pin = formData.pin.trim() || '1111';

    if (!shopName || !ownerName || !phone || !city || !address) {
      setErrorMsg('Please fill in all mandatory fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const newCustomerId = `CUST-${Math.floor(100000 + Math.random() * 900000)}`;

      const registrationData = {
        id: newCustomerId,
        customerId: newCustomerId,
        customerCode: newCustomerId,
        shopName,
        ownerName,
        contactPerson: ownerName,
        phone,
        mobileNumber: phone,
        city,
        cityName: city,
        address,
        pin,
        role: 'User',
        status: 'PENDING',
        isVerified: false,
        allowedCategories: ['all'],
        allowedSubCategories: ['all'],
        allowedCategoryIds: ['all'],
        allowedSubCategoryIds: ['all'],
        isOnline: true,
        lastActive: Date.now(),
        createdAt: Date.now()
      };

      const payload = JSON.parse(JSON.stringify(registrationData));

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 30000)
      );

      await Promise.race([
        setDoc(doc(db, 'customers', newCustomerId), payload),
        timeoutPromise
      ]);

      const newCustomer: Customer = {
        id: newCustomerId,
        customerId: newCustomerId,
        customerCode: newCustomerId,
        shopName,
        ownerName,
        contactPerson: ownerName,
        phone,
        mobileNumber: phone,
        city,
        cityName: city,
        address,
        pin,
        role: 'User',
        status: 'Pending',
        isVerified: false,
        allowedCategoryIds: ['all'],
        allowedSubCategoryIds: ['all'],
        isOnline: true,
        lastActive: Date.now(),
        createdAt: Date.now()
      };

      addCustomer(newCustomer);
      setCurrentCustomer(newCustomer);
      setSuccess(true);

      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err: any) {
      if (err?.message === "Timeout") {
        setErrorMsg("Server is slow. Your registration may have been saved, please check before trying again.");
      } else {
        setErrorMsg(err?.message || 'Registration failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-navy-dark text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-brand-navy-card border border-brand-navy-border rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft size={16} />
            <span>Showroom</span>
          </button>
          <div className="flex items-center gap-2 text-brand-gold">
            <Store size={22} />
            <span className="font-black tracking-wider text-sm">B2B REGISTER</span>
          </div>
        </div>

        {success ? (
          <div className="text-center py-8 space-y-4 animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-xl font-black text-white">Registration Submitted!</h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Your wholesale shop account has been created and synced directly with Shivam Showroom Admin.
            </p>
            <div className="text-xs text-brand-gold font-bold animate-pulse">
              Redirecting to catalog...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center mb-4">
              <h1 className="text-xl font-black text-white tracking-wide">Register New Shop</h1>
              <p className="text-xs text-slate-400 mt-1">Create your verified B2B wholesale customer profile</p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            {/* Shop Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building2 size={14} className="text-brand-gold" />
                Shop / Business Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Momai Collection"
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-gold transition"
              />
            </div>

            {/* Owner Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User size={14} className="text-brand-gold" />
                Owner / Contact Person *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Ramesh Bhai"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-gold transition"
              />
            </div>

            {/* Mobile Number & City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Phone size={14} className="text-brand-gold" />
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g., 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-gold transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin size={14} className="text-brand-gold" />
                  City / Market *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Junagadh"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-gold transition"
                />
              </div>
            </div>

            {/* Full Address */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin size={14} className="text-brand-gold" />
                Shop Address / Road *
              </label>
              <textarea
                rows={2}
                required
                placeholder="e.g., Shop No. 12, Station Road, Main Bazaar"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-gold transition resize-none"
              />
            </div>

            {/* Security PIN */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Lock size={14} className="text-brand-gold" />
                4-Digit Security PIN (Default: 1111)
              </label>
              <input
                type="password"
                maxLength={4}
                placeholder="1111"
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-gold transition font-mono tracking-widest"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50 mt-2"
            >
              <ShieldCheck size={18} />
              <span>{isSubmitting ? 'Registering with Firestore...' : 'Register & Start Ordering'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Register;
