import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { syncNotificationToFirebase } from '../services/firebaseSync';
import { BrandLogo } from './BrandLogo';
import { 
  X, 
  Megaphone, 
  Send, 
  MapPin, 
  Truck, 
  Image as ImageIcon, 
  Search, 
  CheckCircle, 
  Building, 
  Hash, 
  Layers, 
  BellRing,
  Sparkles
} from 'lucide-react';

interface NotificationHubProps {
  onClose: () => void;
}

export const NotificationHub: React.FC<NotificationHubProps> = ({ onClose }) => {
  const { customers, photos } = useAppStore();
  const [activeTab, setActiveTab] = useState<'BROADCAST' | 'DIRECT'>('BROADCAST');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // TAB A: Targeted Broadcast State
  const [targetCity, setTargetCity] = useState('All Cities');
  const [notificationType, setNotificationType] = useState('Trending Stock Alert');
  const [headline, setHeadline] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [attachedImageUrl, setAttachedImageUrl] = useState('');
  const [photoSearchQuery, setPhotoSearchQuery] = useState('');
  const [showPhotoSelector, setShowPhotoSelector] = useState(false);

  // TAB B: Direct Customer Dispatch State
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<typeof customers[0] | null>(null);
  const [transportName, setTransportName] = useState('');
  const [biltyNumber, setBiltyNumber] = useState('');
  const [parcelsCount, setParcelsCount] = useState<number | string>('');
  const [biltyPhotoUrl, setBiltyPhotoUrl] = useState('');

  // Status for sending
  const [isSending, setIsSending] = useState(false);

  // Helper to trigger inside-drawer toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Get unique cities from customer list
  const uniqueCities = useMemo(() => {
    const list = customers.map(c => c.cityName?.trim()).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [customers]);

  // 2. Filter photos for selection
  const filteredPhotos = useMemo(() => {
    if (!photoSearchQuery.trim()) return photos.slice(0, 8);
    return photos.filter(p => 
      p.photoCode?.toLowerCase().includes(photoSearchQuery.toLowerCase()) ||
      p.subCategoryName?.toLowerCase().includes(photoSearchQuery.toLowerCase())
    ).slice(0, 12);
  }, [photos, photoSearchQuery]);

  // 3. Search customers for Direct Dispatch
  const searchedCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return [];
    const q = customerSearchQuery.toLowerCase();
    return customers.filter(c => 
      c.shopName?.toLowerCase().includes(q) ||
      c.mobileNumber?.toLowerCase().includes(q) ||
      c.customerCode?.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [customers, customerSearchQuery]);

  // 4. Submit Tab A: Targeted Broadcast
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headline.trim() || !customMessage.trim()) {
      triggerToast('⚠️ Please enter both a headline and custom message.');
      return;
    }

    setIsSending(true);

    try {
      // Find matching customers
      const targetList = targetCity === 'All Cities'
        ? customers
        : customers.filter(c => c.cityName?.trim().toLowerCase() === targetCity.toLowerCase());

      const notificationPayload = {
        id: `broadcast-${Date.now()}`,
        title: headline,
        message: customMessage,
        type: notificationType,
        cityTarget: targetCity,
        imageUrl: attachedImageUrl || undefined,
        timestamp: Date.now(),
        targetCount: targetList.length
      };

      await syncNotificationToFirebase(notificationPayload);

      triggerToast(`📢 Broadcast sent! Pushed successfully to ${targetList.length} customers in ${targetCity}.`);
      
      // Clear form
      setHeadline('');
      setCustomMessage('');
      setAttachedImageUrl('');
    } catch (err) {
      console.error(err);
      triggerToast('❌ Error sending broadcast notification.');
    } finally {
      setIsSending(false);
    }
  };

  // 5. Submit Tab B: Direct Dispatch Notice
  const handleSendDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      triggerToast('⚠️ Please select a customer first.');
      return;
    }
    if (!transportName.trim() || !biltyNumber.trim() || !parcelsCount) {
      triggerToast('⚠️ Please fill out all transport details.');
      return;
    }

    setIsSending(true);

    try {
      const alertMsg = `📦 Parcel Dispatched! Transporter: ${transportName}, Bilty No: ${biltyNumber}, Parcels: ${parcelsCount}.`;

      const notificationPayload = {
        id: `dispatch-${Date.now()}`,
        title: '📦 Parcel Dispatched!',
        message: alertMsg,
        type: 'Parcel Dispatch',
        targetCustomerCode: selectedCustomer.customerCode,
        targetMobileNumber: selectedCustomer.mobileNumber,
        transportName,
        biltyNumber,
        parcelsCount: Number(parcelsCount),
        biltyPhotoUrl: biltyPhotoUrl || undefined,
        timestamp: Date.now()
      };

      await syncNotificationToFirebase(notificationPayload);

      triggerToast(`📦 Dispatch notification sent successfully to ${selectedCustomer.shopName}!`);
      
      // Clear form
      setSelectedCustomer(null);
      setCustomerSearchQuery('');
      setTransportName('');
      setBiltyNumber('');
      setParcelsCount('');
      setBiltyPhotoUrl('');
    } catch (err) {
      console.error(err);
      triggerToast('❌ Error sending dispatch alert.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity" 
      />

      {/* Slide-out Drawer Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#1E293B] border-l border-[#334155]/60 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="px-5 py-4 bg-[#0B1120] border-b border-[#334155]/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#3B82F6]/10 text-[#3B82F6]">
              <Megaphone size={18} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#F1F5F9] uppercase tracking-wider">Push Notification Control Hub</h2>
              <p className="text-[10px] text-[#64748B] font-semibold">Live Broadcasts & Dispatch Alerts</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-4.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 font-bold text-sm flex items-center gap-2 shadow-md border border-slate-700/80 transition"
              title="Close"
            >
              <X size={18} />
              <span>Close</span>
            </button>
            <BrandLogo size="sm" />
          </div>
        </div>

        {/* Custom Toast Indicator */}
        {toastMessage && (
          <div className="absolute top-16 left-4 right-4 z-55 bg-[#064E3B] border border-[#059669]/50 text-[#A7F3D0] px-4 py-2.5 rounded-xl text-xs font-black shadow-xl animate-in fade-in duration-300 flex items-center gap-2">
            <CheckCircle size={14} className="flex-shrink-0 text-[#34D399]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Tabs Switcher */}
        <div className="flex border-b border-[#334155]/40 bg-[#0F172A] p-1 gap-1">
          <button
            onClick={() => setActiveTab('BROADCAST')}
            className={`flex-1 py-2 rounded-lg font-extrabold text-[11px] tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'BROADCAST'
                ? 'bg-[#1E293B] text-[#F1F5F9] shadow-sm border border-[#334155]/50'
                : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            <Layers size={13} />
            <span>Targeted Broadcast</span>
          </button>
          <button
            onClick={() => setActiveTab('DIRECT')}
            className={`flex-1 py-2 rounded-lg font-extrabold text-[11px] tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'DIRECT'
                ? 'bg-[#1E293B] text-[#F1F5F9] shadow-sm border border-[#334155]/50'
                : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            <Truck size={13} />
            <span>Direct Dispatch Alert</span>
          </button>
        </div>

        {/* Drawer Body (Scrollable Form area) */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-4">

          {activeTab === 'BROADCAST' ? (
            /* TAB A FORM: TARGETED BROADCAST */
            <form onSubmit={handleSendBroadcast} className="space-y-4">
              
              {/* City Targeting dropdown */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1">
                  <MapPin size={11} className="text-[#3B82F6]" />
                  <span>City-Wise Targeting</span>
                </label>
                <select
                  value={targetCity}
                  onChange={(e) => setTargetCity(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-xl text-xs font-bold text-[#F8FAFC] focus:border-[#3B82F6] outline-none cursor-pointer"
                >
                  <option value="All Cities">All Cities (Entire Customer Base)</option>
                  {uniqueCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Broadcast Type */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={11} className="text-[#F59E0B]" />
                  <span>Notification Type</span>
                </label>
                <select
                  value={notificationType}
                  onChange={(e) => setNotificationType(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-xl text-xs font-bold text-[#F8FAFC] focus:border-[#3B82F6] outline-none cursor-pointer"
                >
                  <option value="Trending Stock Alert">Trending Stock Alert 🔥</option>
                  <option value="Showroom Video Update">Showroom Video Update 🎬</option>
                  <option value="Custom Broadcast">Custom Broadcast 📢</option>
                </select>
              </div>

              {/* Title & Headline */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Headline / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. New Korean Design Claw Clips"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  dir="ltr"
                  style={{ direction: 'ltr', textAlign: 'left', unicodeBidi: 'plaintext' }}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-xl text-xs text-white text-left focus:border-[#3B82F6] outline-none"
                />
              </div>

              {/* Description Message */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Notification Custom Message</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Type the message detail that customers will see..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  dir="ltr"
                  style={{ direction: 'ltr', textAlign: 'left', unicodeBidi: 'plaintext' }}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-xl text-xs text-white text-left focus:border-[#3B82F6] outline-none resize-none custom-scrollbar"
                />
              </div>

              {/* Rich Visual Media Attachment */}
              <div className="space-y-1 bg-[#0F172A]/40 p-3 rounded-xl border border-[#334155]/20">
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <ImageIcon size={11} className="text-[#3B82F6]" />
                    <span>Rich Media Image Attachment</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPhotoSelector(!showPhotoSelector)}
                    className="text-[10px] text-[#3B82F6] font-extrabold hover:underline"
                  >
                    {showPhotoSelector ? 'Hide Selector' : 'Select Product Photo'}
                  </button>
                </label>
                <input
                  type="text"
                  placeholder="Paste external image URL or choose below..."
                  value={attachedImageUrl}
                  onChange={(e) => setAttachedImageUrl(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-xl text-[11px] text-white focus:border-[#3B82F6] outline-none"
                />

                {attachedImageUrl && (
                  <div className="mt-2 flex items-center gap-3 bg-[#1E293B]/60 p-2 rounded-lg border border-[#334155]/30">
                    <img 
                      src={attachedImageUrl} 
                      alt="Attachment Preview" 
                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-[#A7F3D0] font-bold">Image Attached!</p>
                      <button 
                        type="button"
                        onClick={() => setAttachedImageUrl('')}
                        className="text-[9px] text-red-400 font-bold hover:underline"
                      >
                        Remove Attachment
                      </button>
                    </div>
                  </div>
                )}

                {/* Instant Selection Grid */}
                {showPhotoSelector && (
                  <div className="mt-3 p-3 bg-[#0F172A] border border-[#334155] rounded-xl space-y-2 animate-in slide-in-from-top duration-150">
                    <div className="relative">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search designs by design code..."
                        value={photoSearchQuery}
                        onChange={(e) => setPhotoSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 bg-[#1E293B] border border-[#334155] rounded-lg text-[10px] text-white focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 max-h-[140px] overflow-y-auto custom-scrollbar">
                      {filteredPhotos.map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setAttachedImageUrl(p.imageUri || '');
                            setShowPhotoSelector(false);
                          }}
                          className="group relative h-12 rounded overflow-hidden bg-slate-800 border border-slate-700 hover:border-[#3B82F6] cursor-pointer"
                        >
                          <img 
                            src={p.imageUri} 
                            alt={p.photoCode} 
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-end justify-center">
                            <span className="text-[8px] font-mono text-white tracking-tight pb-0.5">{p.photoCode}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Trigger */}
              <button
                type="submit"
                disabled={isSending}
                className="w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-700 text-white font-extrabold text-xs transition shadow-lg shadow-blue-500/10 flex items-center justify-center gap-1.5 uppercase tracking-wider"
              >
                <Send size={13} />
                <span>{isSending ? 'Sending Live Alerts...' : 'Broadcast Push Notification'}</span>
              </button>

            </form>
          ) : (
            /* TAB B FORM: DIRECT DISPATCH ALERT */
            <form onSubmit={handleSendDispatch} className="space-y-4">
              
              {/* Customer Search Panel */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Search Target Customer</label>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search by Shop Name, Mobile, or ID..."
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      if (selectedCustomer) setSelectedCustomer(null);
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-[#0F172A] border border-[#334155] rounded-xl text-xs text-white focus:border-[#3B82F6] outline-none"
                  />
                </div>

                {/* Autocomplete list */}
                {searchedCustomers.length > 0 && !selectedCustomer && (
                  <div className="mt-1 bg-[#0F172A] border border-[#334155] rounded-xl divide-y divide-[#334155]/40 overflow-hidden shadow-lg animate-in fade-in duration-100">
                    {searchedCustomers.map(c => (
                      <div
                        key={c.customerCode}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerSearchQuery(c.shopName);
                        }}
                        className="p-2.5 hover:bg-[#1E293B] cursor-pointer text-left transition"
                      >
                        <p className="text-xs font-extrabold text-white">{c.shopName}</p>
                        <p className="text-[10px] text-slate-500">
                          {c.cityName} • {c.mobileNumber} • Code: {c.customerCode}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Customer Card */}
              {selectedCustomer && (
                <div className="p-3.5 bg-[#0D1525] border border-emerald-500/20 rounded-xl flex items-center justify-between animate-in zoom-in-95 duration-150">
                  <div>
                    <span className="text-[9px] bg-[#064E3B] text-[#A7F3D0] px-2 py-0.5 rounded-full font-black uppercase tracking-wider block w-max mb-1">
                      Target Selected
                    </span>
                    <h4 className="text-xs font-black text-white">{selectedCustomer.shopName}</h4>
                    <p className="text-[10px] text-[#94A3B8] font-bold mt-0.5">
                      {selectedCustomer.cityName} • {selectedCustomer.mobileNumber} • {selectedCustomer.customerCode}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Dispatch form details */}
              <div className="space-y-3 bg-[#0F172A]/30 p-4 rounded-xl border border-[#334155]/20">
                <h3 className="text-[10px] font-black text-[#D97706] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#334155]/30 pb-2 mb-2">
                  <Truck size={12} />
                  <span>Bilty & Parcel Dispatch Information</span>
                </h3>

                {/* Transport Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1">
                    <Building size={10} className="text-slate-500" />
                    <span>Transporter / Courier Name</span>
                  </label>
                  <input
                    type="text"
                    required={!!selectedCustomer}
                    placeholder="e.g. Shrinath Transport"
                    value={transportName}
                    onChange={(e) => setTransportName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#0F172A] border border-[#334155] rounded-xl text-xs text-white focus:border-[#3B82F6] outline-none"
                  />
                </div>

                {/* Bilty LR Number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1">
                    <Hash size={10} className="text-slate-500" />
                    <span>Bilty / LR Number</span>
                  </label>
                  <input
                    type="text"
                    required={!!selectedCustomer}
                    placeholder="e.g. Bil-8894"
                    value={biltyNumber}
                    onChange={(e) => setBiltyNumber(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#0F172A] border border-[#334155] rounded-xl text-xs text-white focus:border-[#3B82F6] outline-none"
                  />
                </div>

                {/* Parcel Count */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1">
                    <Hash size={10} className="text-slate-500" />
                    <span>Number of Parcels / Cartons</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required={!!selectedCustomer}
                    placeholder="e.g. 3"
                    value={parcelsCount}
                    onChange={(e) => setParcelsCount(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#0F172A] border border-[#334155] rounded-xl text-xs text-white focus:border-[#3B82F6] outline-none"
                  />
                </div>

                {/* Bilty Photo / Image URL */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <ImageIcon size={10} className="text-slate-500" />
                      <span>Bilty Photo (Optional URL)</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="Paste bilty photo / image receipt URL..."
                    value={biltyPhotoUrl}
                    onChange={(e) => setBiltyPhotoUrl(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#0F172A] border border-[#334155] rounded-xl text-xs text-white focus:border-[#3B82F6] outline-none"
                  />
                  {biltyPhotoUrl && (
                    <div className="mt-2 flex items-center gap-2 bg-[#1E293B] p-1.5 rounded-lg border border-[#334155]/60">
                      <img 
                        src={biltyPhotoUrl} 
                        alt="Bilty Preview" 
                        className="w-10 h-10 object-cover rounded"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[9px] text-emerald-400 font-bold">Photo Linked!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={isSending || !selectedCustomer}
                className="w-full py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] disabled:bg-slate-700 text-white font-extrabold text-xs transition shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5 uppercase tracking-wider"
              >
                <BellRing size={13} className="animate-bounce" />
                <span>{isSending ? 'Sending Parcel Alert...' : 'Send Dispatch Push Alert'}</span>
              </button>

            </form>
          )}

        </div>
      </div>
    </>
  );
};
