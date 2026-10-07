import React, { useMemo } from 'react';
import { Customer, WholesaleOrder } from '../types';
import { 
  ArrowLeft, 
  Smartphone, 
  Clock, 
  ShoppingBag, 
  BarChart3, 
  ShoppingCart, 
  History, 
  Lock, 
  Unlock, 
  Store, 
  MapPin, 
  Phone, 
  Calendar, 
  Package, 
  CheckCircle2, 
  ShieldCheck, 
  Info 
} from 'lucide-react';

const getGoogleMapsUrl = (lat?: number | string, lon?: number | string): string | null => {
  if (lat !== undefined && lat !== null && String(lat).trim() !== '' &&
      lon !== undefined && lon !== null && String(lon).trim() !== '') {
    return `https://www.google.com/maps?q=${encodeURIComponent(String(lat).trim())},${encodeURIComponent(String(lon).trim())}`;
  }
  return null;
};

const formatTimestampRelative = (val?: any): string => {
  if (!val) return 'No time';
  let ms: number | null = null;
  if (typeof val === 'number') ms = val;
  else if (typeof val === 'object' && val?.seconds) ms = val.seconds * 1000;
  else if (typeof val === 'string') ms = Date.parse(val);
  
  if (!ms || isNaN(ms)) return 'No time';
  const diff = Date.now() - ms;
  if (diff < 0) return 'Just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

interface CustomerProfilePageProps {
  customer: Customer;
  orders: WholesaleOrder[];
  onClose: () => void;
  onVerifyCustomer?: (customer: Customer) => void;
}

export const CustomerProfilePage: React.FC<CustomerProfilePageProps> = ({
  customer,
  orders,
  onClose,
  onVerifyCustomer
}) => {
  // Format date helper
  const formatDate = (val?: number | any): string => {
    if (!val) return 'N/A';
    let ms = typeof val === 'number' ? val : (val?.seconds ? val.seconds * 1000 : null);
    if (!ms && typeof val === 'string') ms = Date.parse(val);
    if (!ms) return 'N/A';
    
    return new Date(ms).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format relative time helper
  const getRelativeTime = (val?: number | any): string => {
    if (!val) return 'Never';
    let ms = typeof val === 'number' ? val : (val?.seconds ? val.seconds * 1000 : null);
    if (!ms && typeof val === 'string') ms = Date.parse(val);
    if (!ms) return 'Never';

    const diffMs = Date.now() - ms;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatDate(val);
  };

  // Online status (check if active within 5 minutes or explicitly online)
  const isOnline = useMemo(() => {
    if (customer.isOnline) return true;
    if (!customer.lastActive) return false;
    let ms = typeof customer.lastActive === 'number' ? customer.lastActive : (customer.lastActive as any)?.seconds ? (customer.lastActive as any).seconds * 1000 : 0;
    return (Date.now() - ms) < 5 * 60 * 1000;
  }, [customer]);

  // Compute Customer Order Stats
  const customerOrders = useMemo(() => {
    const code = (customer.customerCode || '').toLowerCase();
    const name = (customer.shopName || '').toLowerCase();
    return orders.filter(o => {
      const oCode = (o.customerCode || '').toLowerCase();
      const oName = (o.shopName || '').toLowerCase();
      return (code && oCode === code) || (name && oName === name);
    }).sort((a: any, b: any) => {
      const tA = typeof a.createdAt === 'number' ? a.createdAt : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
      const tB = typeof b.createdAt === 'number' ? b.createdAt : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
      return tB - tA;
    });
  }, [orders, customer]);

  const thisMonthOrdersCount = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return customerOrders.filter((o: any) => {
      let t = typeof o.createdAt === 'number' ? o.createdAt : (o.createdAt?.seconds ? o.createdAt.seconds * 1000 : 0);
      return t >= startOfMonth;
    }).length;
  }, [customerOrders]);

  const firstOrderDate = useMemo(() => {
    if (customerOrders.length === 0) return 'No orders';
    const last = customerOrders[customerOrders.length - 1];
    return formatDate(last.createdAt);
  }, [customerOrders]);

  const lastOrderDate = useMemo(() => {
    if (customerOrders.length === 0) return 'No orders';
    const first = customerOrders[0];
    return formatDate(first.createdAt);
  }, [customerOrders]);

  // Section Engagement Bar max calculation
  const sectionViews = customer.sectionViews || {};
  const sectionKeys = Object.keys(sectionViews);
  const maxViews = useMemo(() => {
    const values = Object.values(sectionViews);
    return values.length > 0 ? Math.max(...values, 1) : 1;
  }, [sectionViews]);

  // Section Label Formatter (English law)
  const getSectionLabel = (rawKey: string): string => {
    const k = rawKey.toUpperCase().replace(/[-_]/g, ' ');
    if (k.includes('NEW')) return 'NEW STOCK';
    if (k.includes('OFFER')) return 'OFFERS';
    if (k.includes('BEST') || k.includes('SELLER')) return 'BEST SELLERS';
    if (k.includes('FESTIVAL')) return 'FESTIVAL';
    if (k.includes('RATE') || k.includes('DROP')) return 'RATE DROP';
    if (k.includes('SHOWCASE')) return 'SHOWCASE';
    if (k.includes('BRAND')) return 'BRAND VIEW';
    return k;
  };

  // Login History (Last 20)
  const historyList = useMemo(() => {
    const list = Array.isArray(customer.loginHistory) ? customer.loginHistory : [];
    return [...list].sort((a, b) => {
      let tA = typeof a.ts === 'number' ? a.ts : (a.ts?.seconds ? a.ts.seconds * 1000 : 0);
      let tB = typeof b.ts === 'number' ? b.ts : (b.ts?.seconds ? b.ts.seconds * 1000 : 0);
      return tB - tA;
    }).slice(0, 20);
  }, [customer.loginHistory]);

  const deviceInfo = customer.deviceInfo;
  const cartAbandon = customer.cartAbandon;

  return (
    <div className="fixed inset-0 z-[110] bg-[#02050f]/95 backdrop-blur-md flex flex-col h-full w-full overflow-hidden select-none animate-in fade-in duration-200 text-slate-100 font-sans">
      
      {/* ------------------------------------------------------------- */}
      {/* HEADER BAR */}
      {/* ------------------------------------------------------------- */}
      <header className="bg-[#0B1120] border-b border-[#334155]/60 px-4 py-3.5 flex items-center justify-between flex-shrink-0 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white transition flex items-center gap-2 text-xs font-bold border border-slate-700 active:scale-95"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-lg">
              <Store size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-wide text-white uppercase truncate max-w-[280px] sm:max-w-md">
                  {(customer.shopName || 'Wholesale Client').toUpperCase()}
                </h1>
                {/* Online status pill */}
                {isOnline ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                    </span>
                    <span>Online</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold">
                    Offline ({getRelativeTime(customer.lastActive)})
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 font-medium">
                <span className="flex items-center gap-1 text-cyan-400 font-bold">
                  <MapPin size={12} />
                  <span>{(customer.cityName || 'HQ').toUpperCase()}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono text-slate-300">
                  <Phone size={12} />
                  <span>{customer.mobileNumber || 'N/A'}</span>
                </span>
                <span>•</span>
                <span className="font-mono text-blue-400 font-bold">
                  ID: {customer.customerCode}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(!customer.isVerified && customer.status !== 'Verified') && onVerifyCustomer && (
            <button
              type="button"
              onClick={() => onVerifyCustomer(customer)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition"
            >
              <CheckCircle2 size={16} />
              <span>Approve & Verify</span>
            </button>
          )}
          {customer.customerCode === 'AJ78692' && (
            <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5">
              <span>👑</span>
              <span>ADMIN ID</span>
            </span>
          )}
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* MAIN SCROLLABLE CONTENT */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">

        {/* TOP ROW: KEY ORDER STATS CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#0F172A] border border-[#334155]/60 flex items-center gap-3.5 shadow-lg">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
              <ShoppingBag size={22} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Orders</span>
              <span className="text-xl font-black text-white font-mono">{customerOrders.length}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F172A] border border-[#334155]/60 flex items-center gap-3.5 shadow-lg">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Calendar size={22} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">This Month Orders</span>
              <span className="text-xl font-black text-emerald-400 font-mono">{thisMonthOrdersCount}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F172A] border border-[#334155]/60 flex items-center gap-3.5 shadow-lg">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock size={22} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Last Order</span>
              <span className="text-xs font-bold text-slate-200 mt-0.5 block">{lastOrderDate}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F172A] border border-[#334155]/60 flex items-center gap-3.5 shadow-lg">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
              <History size={22} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">First Order</span>
              <span className="text-xs font-bold text-slate-200 mt-0.5 block">{firstOrderDate}</span>
            </div>
          </div>
        </div>

        {/* MIDDLE GRID: DEVICE INFO, LOCATION, SECTION ENGAGEMENT, CART ABANDON */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* CARD 1: DEVICE & SYSTEM HARDWARE */}
          <div className="p-5 rounded-2xl bg-[#0F172A] border border-[#334155]/60 space-y-4 shadow-lg flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-xs font-bold font-mono text-blue-400 uppercase tracking-wider flex items-center gap-2 border-b border-[#334155]/50 pb-2">
                <Smartphone size={16} />
                <span>Device & App Info</span>
              </h3>

              {deviceInfo ? (
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-[#334155]/30">
                    <span className="text-slate-400 font-medium">Device Model</span>
                    <span className="font-mono font-bold text-white">{deviceInfo.model || 'Unknown Model'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[#334155]/30">
                    <span className="text-slate-400 font-medium">OS Version</span>
                    <span className="font-mono font-bold text-slate-200">{deviceInfo.osVersion || 'Android'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[#334155]/30">
                    <span className="text-slate-400 font-medium">App Version</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono font-bold text-[11px] border border-blue-500/30">
                      {deviceInfo.appVersion ? `v${deviceInfo.appVersion}` : 'Latest'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[#334155]/30">
                    <span className="text-slate-400 font-medium">Device Lock Status</span>
                    {customer.activeDeviceId ? (
                      <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                        <Lock size={10} />
                        <span>Bound</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                        <Unlock size={10} />
                        <span>Unbound</span>
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400 font-medium">Last Device Sync</span>
                    <span className="font-mono text-slate-300">{formatDate(deviceInfo.updatedAt || customer.lastActive)}</span>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 space-y-2">
                  <Info size={28} className="mx-auto text-slate-600" />
                  <p className="text-xs font-medium">No device data logged yet</p>
                  <p className="text-[10px] text-slate-600">Tracking starts with new client app updates</p>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-400 flex-shrink-0" />
              <span>Security PIN: <strong className="text-white font-mono">{customer.pin || '1111'}</strong></span>
            </div>
          </div>

          {/* CARD 2: LIVE GPS LOCATION */}
          {(() => {
            const loc = (customer as any).location;
            const lat = loc?.latitude;
            const lon = loc?.longitude;
            const mapUrl = getGoogleMapsUrl(lat, lon);

            const locCity = (loc?.city || '').trim().toUpperCase();
            const locTaluka = (loc?.taluka || '').trim().toUpperCase();
            const primaryLoc = locCity && locTaluka && locCity !== locTaluka 
              ? `${locCity}, ${locTaluka}` 
              : (locCity || locTaluka);

            const relativeTime = formatTimestampRelative(loc?.timestamp);

            return (
              <div 
                onClick={() => {
                  if (mapUrl) {
                    window.open(mapUrl, '_blank');
                  }
                }}
                className={`p-5 rounded-2xl bg-[#0F172A] border border-[#334155]/60 space-y-4 shadow-lg flex flex-col justify-between transition ${
                  mapUrl ? 'hover:border-cyan-500/60 cursor-pointer group' : 'cursor-default'
                }`}
              >
                <div className="space-y-3">
                  <h3 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center justify-between border-b border-[#334155]/50 pb-2">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} />
                      <span>LOCATION</span>
                    </div>
                    {mapUrl && (
                      <span className="text-[10px] text-cyan-400 font-sans font-bold flex items-center gap-1 group-hover:underline">
                        <span>Google Maps</span>
                        <span>↗</span>
                      </span>
                    )}
                  </h3>

                  {primaryLoc || mapUrl ? (
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-slate-400 text-[11px] font-medium block">City / Taluka</span>
                        <span className="text-sm font-black text-white uppercase tracking-wide block mt-0.5">
                          📍 {primaryLoc || customer.cityName || 'Unknown Region'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-[#334155]/30">
                        <span className="text-slate-400 font-medium">GPS Coords</span>
                        {mapUrl ? (
                          <span className="font-mono font-bold text-cyan-300 text-[11px]">
                            {lat}, {lon}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">No Coords</span>
                        )}
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-[#334155]/30">
                        <span className="text-slate-400 font-medium">Freshness</span>
                        <span className="font-mono font-bold text-emerald-400 text-[11px]">
                          {relativeTime}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-500 space-y-2">
                      <MapPin size={28} className="mx-auto text-slate-600" />
                      <p className="text-xs font-medium text-slate-400">No GPS data</p>
                      <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto truncate">
                        {customer.address || customer.cityName || 'No address logged'}
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-slate-500 italic">
                  {mapUrl ? 'Click card to view live location on Google Maps.' : 'Live GPS is logged automatically by client app.'}
                </p>
              </div>
            );
          })()}

          {/* CARD 2: SECTION ENGAGEMENT */}
          <div className="p-5 rounded-2xl bg-[#0F172A] border border-[#334155]/60 space-y-4 shadow-lg flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-[#334155]/50 pb-2">
                <BarChart3 size={16} />
                <span>Section Engagement</span>
              </h3>

              {sectionKeys.length > 0 ? (
                <div className="space-y-3 pt-1">
                  {sectionKeys.map((key) => {
                    const count = sectionViews[key] || 0;
                    const pct = Math.min(Math.round((count / maxViews) * 100), 100);
                    const label = getSectionLabel(key);

                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-300 tracking-wide">{label}</span>
                          <span className="text-amber-400 font-mono">{count} views</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
                            style={{ width: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-slate-500 space-y-2">
                  <BarChart3 size={28} className="mx-auto text-slate-600" />
                  <p className="text-xs font-medium">No section views logged yet</p>
                  <p className="text-[10px] text-slate-600">Client app will log clicks on New, Offers & Banners</p>
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-500 italic">Engagement tracking is updated in real-time on section clicks.</p>
          </div>

          {/* CARD 3: CART ABANDONMENT */}
          <div className="p-5 rounded-2xl bg-[#0F172A] border border-[#334155]/60 space-y-4 shadow-lg flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-xs font-bold font-mono text-rose-400 uppercase tracking-wider flex items-center gap-2 border-b border-[#334155]/50 pb-2">
                <ShoppingCart size={16} />
                <span>Cart Abandonment</span>
              </h3>

              {cartAbandon && (cartAbandon.count || 0) > 0 ? (
                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center space-y-1">
                    <span className="text-2xl font-black text-rose-400 font-mono block">{cartAbandon.count}</span>
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">Abandoned Carts</span>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center py-1 border-b border-[#334155]/30">
                      <span className="text-slate-400 font-medium">Last Cart Items</span>
                      <span className="font-mono font-bold text-white">{cartAbandon.lastItems || 0} items</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-[#334155]/30">
                      <span className="text-slate-400 font-medium">Last Abandon Time</span>
                      <span className="font-mono text-slate-300">{getRelativeTime(cartAbandon.lastAt)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-slate-500 space-y-2">
                  <CheckCircle2 size={28} className="mx-auto text-emerald-500/60" />
                  <p className="text-xs font-medium text-emerald-400">No abandoned carts</p>
                  <p className="text-[10px] text-slate-600">Client completes orders or cart is clear</p>
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-500 italic">Unplaced items left in wholesale cart are tracked here.</p>
          </div>

        </div>

        {/* BOTTOM GRID: LOGIN HISTORY & RECENT ORDERS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LOGIN HISTORY CARD */}
          <div className="p-5 rounded-2xl bg-[#0F172A] border border-[#334155]/60 space-y-4 shadow-lg">
            <h3 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-2 border-b border-[#334155]/50 pb-2">
              <History size={16} />
              <span>Login Session History (Last 20)</span>
            </h3>

            {historyList.length > 0 ? (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar text-xs">
                {historyList.map((h, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="font-mono font-bold text-slate-200 block">{h.model || 'Mobile App'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {h.osVersion || 'Android'} {h.appVersion ? `• v${h.appVersion}` : ''}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-cyan-400 font-bold">
                      {formatDate(h.ts)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <History size={28} className="mx-auto text-slate-600" />
                <p className="text-xs font-medium">No login history logged yet</p>
                <p className="text-[10px] text-slate-600">Logins will record device model & timestamp</p>
              </div>
            )}
          </div>

          {/* RECENT ORDERS CARD */}
          <div className="p-5 rounded-2xl bg-[#0F172A] border border-[#334155]/60 space-y-4 shadow-lg">
            <h3 className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-2 border-b border-[#334155]/50 pb-2">
              <Package size={16} />
              <span>Recent Orders (Last 10)</span>
            </h3>

            {customerOrders.length > 0 ? (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar text-xs">
                {(customerOrders as any[]).slice(0, 10).map((o: any) => {
                  const itemCount = Array.isArray(o.items) ? o.items.length : (o.orderItems?.length || 0);
                  const statusUpper = (o.status || o.orderStatus || 'PENDING').toUpperCase();

                  let statusColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                  if (statusUpper.includes('DISPATCH') || statusUpper.includes('DELIVER') || statusUpper.includes('ACCEPTED')) {
                    statusColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                  } else if (statusUpper.includes('CANCEL') || statusUpper.includes('REJECT')) {
                    statusColor = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
                  }

                  return (
                    <div key={o.id || o.orderNumber} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-white">{o.orderNumber || o.id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${statusColor}`}>
                            {statusUpper}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {formatDate(o.createdAt)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono font-bold text-xs">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <Package size={28} className="mx-auto text-slate-600" />
                <p className="text-xs font-medium">No order history found</p>
                <p className="text-[10px] text-slate-600">Orders placed by this customer will show here</p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
