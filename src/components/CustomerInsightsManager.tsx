import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Customer, WholesaleOrder } from '../types';
import { 
  ArrowLeft, 
  BarChart3, 
  Search, 
  Users, 
  AlertTriangle, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Package, 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  Info,
  Store
} from 'lucide-react';

interface CustomerInsightsManagerProps {
  orders: WholesaleOrder[];
  onClose: () => void;
}

type TabType = 'TOP_20' | 'LOW_ORDER' | 'INACTIVE' | 'ALL_ANALYSIS';

const formatRelativeTime = (val?: number | any): string => {
  if (!val) return 'Never';
  let ms = typeof val === 'number' ? val : (val?.seconds ? val.seconds * 1000 : null);
  if (!ms && typeof val === 'string') ms = Date.parse(val);
  if (!ms || isNaN(ms)) return 'Never';

  const diffMs = Date.now() - ms;
  if (diffMs < 0) return 'Just now';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(ms).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateStandard = (val?: number | any): string => {
  if (!val) return 'No Orders Yet';
  let ms = typeof val === 'number' ? val : (val?.seconds ? val.seconds * 1000 : null);
  if (!ms && typeof val === 'string') ms = Date.parse(val);
  if (!ms || isNaN(ms)) return 'No Orders Yet';
  
  return new Date(ms).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const CustomerInsightsManager: React.FC<CustomerInsightsManagerProps> = ({
  orders,
  onClose
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('TOP_20');
  
  // Top 20 Sort Toggle
  const [topSortBy, setTopSortBy] = useState<'ORDERS' | 'ACTIVITY'>('ORDERS');
  
  // Tab 3 Inactive Expand states
  const [expandedInactiveBucket, setExpandedInactiveBucket] = useState<'30' | '60' | '90' | 'NEVER' | null>('30');
  
  // Tab 4 All Analysis search & expanded customer
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);

  // Subscribe to customers collection
  useEffect(() => {
    const q = query(collection(db, 'customers'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(list);
      setIsLoading(false);
    }, (err) => {
      console.warn("Customers snapshot error:", err);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  // Compute enriched customer data with orders & activity metrics
  const enrichedCustomers = useMemo(() => {
    return customers.map(cust => {
      const code = (cust.customerCode || '').toLowerCase();
      const shop = (cust.shopName || '').toLowerCase();

      // Matched orders for this customer
      const custOrders = orders.filter(o => {
        const oCode = (o.customerCode || '').toLowerCase();
        const oShop = (o.shopName || '').toLowerCase();
        return (code && oCode === code) || (shop && oShop === shop);
      });

      // Total orders
      const orderCount = custOrders.length;

      // Last Order Date
      let maxOrderTime: number | null = null;
      custOrders.forEach(o => {
        const createdAtVal: any = o.createdAt;
        const t = typeof createdAtVal === 'number' ? createdAtVal : (createdAtVal?.seconds ? createdAtVal.seconds * 1000 : 0);
        if (t && (!maxOrderTime || t > maxOrderTime)) {
          maxOrderTime = t;
        }
      });

      // App Activity (Views + Logins)
      const sectionViews = cust.sectionViews || {};
      const totalViews = Object.values(sectionViews).reduce((a, b) => a + Number(b || 0), 0);
      const totalLogins = Array.isArray(cust.loginHistory) ? cust.loginHistory.length : 0;
      const activityScore = totalViews + totalLogins;

      // Category / Subcategory / Product analysis
      const categoryCounts: Record<string, number> = {};
      const subCategoryCounts: Record<string, number> = {};
      const productCounts: Record<string, number> = {};

      custOrders.forEach(o => {
        const items = Array.isArray(o.items) ? o.items : [];
        items.forEach((it: any) => {
          const qty = Number(it.quantity || 1);
          const cat = (it.categoryId || it.category || '').toUpperCase() || 'GENERAL';
          categoryCounts[cat] = (categoryCounts[cat] || 0) + qty;

          const sub = (it.subCategoryName || it.subCategoryId || '').toUpperCase();
          if (sub) {
            subCategoryCounts[sub] = (subCategoryCounts[sub] || 0) + qty;
          }

          const prod = (it.photoCode || it.name || '').toUpperCase();
          if (prod) {
            productCounts[prod] = (productCounts[prod] || 0) + qty;
          }
        });
      });

      // Days since last order
      const daysSinceLastOrder = maxOrderTime 
        ? Math.floor((Date.now() - maxOrderTime) / (1000 * 60 * 60 * 24))
        : null;

      return {
        customer: cust,
        custOrders,
        orderCount,
        lastOrderTime: maxOrderTime,
        daysSinceLastOrder,
        totalViews,
        totalLogins,
        activityScore,
        categoryCounts,
        subCategoryCounts,
        productCounts
      };
    });
  }, [customers, orders]);

  // Tab 1: Top 20 Active Customers
  const top20Customers = useMemo(() => {
    const sorted = [...enrichedCustomers].sort((a, b) => {
      if (topSortBy === 'ORDERS') {
        if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
        return b.activityScore - a.activityScore;
      } else {
        if (b.activityScore !== a.activityScore) return b.activityScore - a.activityScore;
        return b.orderCount - a.orderCount;
      }
    });
    return sorted.slice(0, 20);
  }, [enrichedCustomers, topSortBy]);

  // Tab 2: Low Order Customers (0 orders first, ascending)
  const lowOrderCustomers = useMemo(() => {
    const sorted = [...enrichedCustomers].sort((a, b) => {
      if (a.orderCount !== b.orderCount) return a.orderCount - b.orderCount;
      return (a.lastOrderTime || 0) - (b.lastOrderTime || 0);
    });
    return sorted.slice(0, 20);
  }, [enrichedCustomers]);

  // Tab 3: Inactive Buckets
  const inactiveBuckets = useMemo(() => {
    const bucket30: typeof enrichedCustomers = [];
    const bucket60: typeof enrichedCustomers = [];
    const bucket90: typeof enrichedCustomers = [];
    const bucketNever: typeof enrichedCustomers = [];

    enrichedCustomers.forEach(item => {
      if (item.daysSinceLastOrder === null || item.orderCount === 0) {
        bucketNever.push(item);
      } else if (item.daysSinceLastOrder >= 90) {
        bucket90.push(item);
      } else if (item.daysSinceLastOrder >= 60) {
        bucket60.push(item);
      } else if (item.daysSinceLastOrder >= 30) {
        bucket30.push(item);
      }
    });

    return {
      '30': bucket30.sort((a, b) => (b.daysSinceLastOrder || 0) - (a.daysSinceLastOrder || 0)),
      '60': bucket60.sort((a, b) => (b.daysSinceLastOrder || 0) - (a.daysSinceLastOrder || 0)),
      '90': bucket90.sort((a, b) => (b.daysSinceLastOrder || 0) - (a.daysSinceLastOrder || 0)),
      'NEVER': bucketNever
    };
  }, [enrichedCustomers]);

  // Tab 4: All Analysis Filtered
  const filteredAnalysisCustomers = useMemo(() => {
    if (!searchQuery.trim()) return enrichedCustomers;
    const q = searchQuery.toLowerCase();
    return enrichedCustomers.filter(item => {
      const c = item.customer;
      return (
        (c.shopName || '').toLowerCase().includes(q) ||
        (c.cityName || '').toLowerCase().includes(q) ||
        (c.customerCode || '').toLowerCase().includes(q) ||
        (c.mobileNumber || '').includes(q)
      );
    });
  }, [enrichedCustomers, searchQuery]);

  // All known categories platform-wide
  const allPlatformCategories = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => {
      (o.items || []).forEach(it => {
        const cat = (it.categoryId || it.category || '').toUpperCase();
        if (cat) set.add(cat);
      });
    });
    if (set.size === 0) {
      set.add('IMITATION');
      set.add('COSMETICS');
      set.add('HAIR_ACCESSORIES');
    }
    return Array.from(set);
  }, [orders]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1120] flex flex-col h-full w-full overflow-hidden text-slate-100 font-sans select-none animate-in fade-in duration-150">
      
      {/* ------------------------------------------------------------------- */}
      {/* HEADER BAR */}
      {/* ------------------------------------------------------------------- */}
      <header className="bg-[#0F172A] border-b border-[#334155]/60 px-4 py-3.5 flex items-center justify-between flex-shrink-0 shadow-lg">
        <div className="flex items-center gap-3 sm:gap-5">
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-slate-200 hover:text-white transition flex items-center gap-2 text-xs font-bold border border-[#334155] active:scale-95"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <BarChart3 size={22} />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-wide text-white uppercase flex items-center gap-2">
                <span>Customer Insights</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#1E293B] text-slate-400 text-[10px] font-mono font-bold border border-[#334155]/60">
                  {customers.length} Clients
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">Top active buyers, inactivity alerts & taste interest analytics</p>
            </div>
          </div>
        </div>

        {/* TAB CHIPS NAVIGATION */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('TOP_20')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              activeTab === 'TOP_20'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                : 'bg-[#1E293B] text-slate-400 border-[#334155]/60 hover:text-white'
            }`}
          >
            <TrendingUp size={14} />
            <span>TOP-20</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LOW_ORDER')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              activeTab === 'LOW_ORDER'
                ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                : 'bg-[#1E293B] text-slate-400 border-[#334155]/60 hover:text-white'
            }`}
          >
            <TrendingDown size={14} />
            <span>LOW ORDER</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('INACTIVE')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              activeTab === 'INACTIVE'
                ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                : 'bg-[#1E293B] text-slate-400 border-[#334155]/60 hover:text-white'
            }`}
          >
            <AlertTriangle size={14} />
            <span>INACTIVE</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ALL_ANALYSIS')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              activeTab === 'ALL_ANALYSIS'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                : 'bg-[#1E293B] text-slate-400 border-[#334155]/60 hover:text-white'
            }`}
          >
            <Layers size={14} />
            <span>ALL ANALYSIS</span>
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------------- */}
      {/* MAIN CONTENT AREA */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-[#0F172A]/40">
        
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-semibold">Loading customer insights...</p>
          </div>
        ) : (
          <>
            {/* =============================================================== */}
            {/* TAB 1: TOP 20 ACTIVE CUSTOMERS */}
            {/* =============================================================== */}
            {activeTab === 'TOP_20' && (
              <div className="space-y-4">
                
                {/* Controls Bar */}
                <div className="flex items-center justify-between gap-4 flex-wrap bg-[#0F172A] p-4 rounded-2xl border border-[#334155]/60 shadow-md">
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Top 20 Active Buyers</h2>
                    <p className="text-xs text-slate-400">Clients with highest engagement and order volume</p>
                  </div>

                  <div className="flex items-center gap-2 bg-[#1E293B] p-1 rounded-xl border border-[#334155]/60">
                    <button
                      type="button"
                      onClick={() => setTopSortBy('ORDERS')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        topSortBy === 'ORDERS'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      By Orders
                    </button>
                    <button
                      type="button"
                      onClick={() => setTopSortBy('ACTIVITY')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        topSortBy === 'ACTIVITY'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      By App-Activity
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-2xl border border-[#334155]/60 shadow-xl bg-[#0F172A]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1E293B] text-slate-400 uppercase font-mono font-bold text-[10px] tracking-wider border-b border-[#334155]/60">
                      <tr>
                        <th className="py-3.5 px-4 w-12 text-center">#</th>
                        <th className="py-3.5 px-4">Client / Shop Name</th>
                        <th className="py-3.5 px-4 text-center">Orders</th>
                        <th className="py-3.5 px-4 text-center">App Views</th>
                        <th className="py-3.5 px-4 text-center">Logins</th>
                        <th className="py-3.5 px-4 text-right">Last Seen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#334155]/40">
                      {top20Customers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-500">
                            No registered clients found.
                          </td>
                        </tr>
                      ) : (
                        top20Customers.map((item, idx) => {
                          const c = item.customer;
                          return (
                            <tr key={c.customerCode || idx} className="hover:bg-[#1E293B]/60 transition">
                              <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                                {idx < 3 ? (
                                  <span className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-black ${
                                    idx === 0 ? 'bg-amber-500 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : 'bg-amber-700 text-white'
                                  }`}>
                                    {idx + 1}
                                  </span>
                                ) : (
                                  idx + 1
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-white uppercase text-sm">{c.shopName}</div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span className="text-cyan-400 font-bold">{c.cityName || 'HQ'}</span>
                                  <span>•</span>
                                  <span className="font-mono text-slate-300">{c.mobileNumber}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 font-mono font-bold border border-blue-500/20 text-xs">
                                  {item.orderCount} Orders
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                                {item.totalViews} views
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                                {item.totalLogins} logins
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono text-slate-400 text-[11px]">
                                {formatRelativeTime(c.lastActive)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 2: LOW ORDER CUSTOMERS */}
            {/* =============================================================== */}
            {activeTab === 'LOW_ORDER' && (
              <div className="space-y-4">
                
                <div className="bg-[#0F172A] p-4 rounded-2xl border border-[#334155]/60 shadow-md flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Low Order & Zero Order Clients</h2>
                    <p className="text-xs text-slate-400">Registered buyers needing re-engagement or follow-up calls</p>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold">
                    Bottom 20
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[#334155]/60 shadow-xl bg-[#0F172A]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1E293B] text-slate-400 uppercase font-mono font-bold text-[10px] tracking-wider border-b border-[#334155]/60">
                      <tr>
                        <th className="py-3.5 px-4 w-12 text-center">#</th>
                        <th className="py-3.5 px-4">Client / Shop Name</th>
                        <th className="py-3.5 px-4 text-center">Total Orders</th>
                        <th className="py-3.5 px-4 text-center">Last Order Date</th>
                        <th className="py-3.5 px-4 text-center">App Logins</th>
                        <th className="py-3.5 px-4 text-right">Mobile Contact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#334155]/40">
                      {lowOrderCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-500">
                            No clients logged.
                          </td>
                        </tr>
                      ) : (
                        lowOrderCustomers.map((item, idx) => {
                          const c = item.customer;
                          const isZero = item.orderCount === 0;

                          return (
                            <tr key={c.customerCode || idx} className={`transition ${isZero ? 'bg-rose-950/20 hover:bg-rose-950/30' : 'hover:bg-[#1E293B]/60'}`}>
                              <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                                {idx + 1}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-white uppercase text-sm flex items-center gap-2">
                                  <span>{c.shopName}</span>
                                  {isZero && (
                                    <span className="px-2 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold">
                                      Zero Orders
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  <span className="text-cyan-400 font-bold">{c.cityName || 'HQ'}</span>
                                  <span className="mx-1">•</span>
                                  <span>{c.contactPerson || 'Proprietor'}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono font-bold">
                                <span className={`px-2.5 py-1 rounded-lg border text-xs ${
                                  isZero ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'
                                }`}>
                                  {item.orderCount} Orders
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono text-slate-300 text-[11px]">
                                {formatDateStandard(item.lastOrderTime)}
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                                {item.totalLogins} logins
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono text-amber-400 font-bold">
                                {c.mobileNumber}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 3: INACTIVE CLIENTS BUCKETS */}
            {/* =============================================================== */}
            {activeTab === 'INACTIVE' && (
              <div className="space-y-6">
                
                {/* 4 Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* 30+ Days */}
                  <div 
                    onClick={() => setExpandedInactiveBucket('30')}
                    className={`p-5 rounded-2xl border transition cursor-pointer shadow-lg flex flex-col justify-between ${
                      expandedInactiveBucket === '30' 
                        ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30' 
                        : 'bg-[#0F172A] border-[#334155]/60 hover:border-amber-500/50'
                    }`}
                  >
                    <div>
                      <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider block">Inactive 30+ Days</span>
                      <span className="text-3xl font-black text-white font-mono mt-1 block">{inactiveBuckets['30'].length}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-3">No orders placed in last 30 to 59 days</p>
                  </div>

                  {/* 60+ Days */}
                  <div 
                    onClick={() => setExpandedInactiveBucket('60')}
                    className={`p-5 rounded-2xl border transition cursor-pointer shadow-lg flex flex-col justify-between ${
                      expandedInactiveBucket === '60' 
                        ? 'bg-orange-950/40 border-orange-500 ring-2 ring-orange-500/30' 
                        : 'bg-[#0F172A] border-[#334155]/60 hover:border-orange-500/50'
                    }`}
                  >
                    <div>
                      <span className="text-[11px] font-mono font-bold text-orange-400 uppercase tracking-wider block">Inactive 60+ Days</span>
                      <span className="text-3xl font-black text-white font-mono mt-1 block">{inactiveBuckets['60'].length}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-3">No orders placed in last 60 to 89 days</p>
                  </div>

                  {/* 90+ Days */}
                  <div 
                    onClick={() => setExpandedInactiveBucket('90')}
                    className={`p-5 rounded-2xl border transition cursor-pointer shadow-lg flex flex-col justify-between ${
                      expandedInactiveBucket === '90' 
                        ? 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/30' 
                        : 'bg-[#0F172A] border-[#334155]/60 hover:border-rose-500/50'
                    }`}
                  >
                    <div>
                      <span className="text-[11px] font-mono font-bold text-rose-400 uppercase tracking-wider block">Inactive 90+ Days</span>
                      <span className="text-3xl font-black text-white font-mono mt-1 block">{inactiveBuckets['90'].length}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-3">High risk of customer attrition (90+ days)</p>
                  </div>

                  {/* Never Ordered */}
                  <div 
                    onClick={() => setExpandedInactiveBucket('NEVER')}
                    className={`p-5 rounded-2xl border transition cursor-pointer shadow-lg flex flex-col justify-between ${
                      expandedInactiveBucket === 'NEVER' 
                        ? 'bg-slate-800/80 border-slate-400 ring-2 ring-slate-400/30' 
                        : 'bg-[#0F172A] border-[#334155]/60 hover:border-slate-400/50'
                    }`}
                  >
                    <div>
                      <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider block">Never Ordered</span>
                      <span className="text-3xl font-black text-white font-mono mt-1 block">{inactiveBuckets['NEVER'].length}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-3">Registered clients with zero order history</p>
                  </div>

                </div>

                {/* Expanded Customer List */}
                {expandedInactiveBucket && (
                  <div className="bg-[#0F172A] border border-[#334155]/60 rounded-2xl p-5 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-[#334155]/40 pb-3">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Users size={16} className="text-amber-400" />
                        <span>
                          {expandedInactiveBucket === 'NEVER' 
                            ? 'Never Ordered Clients List' 
                            : `Inactive ${expandedInactiveBucket}+ Days Clients List`}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#1E293B] text-slate-300 text-xs font-mono font-bold">
                          {inactiveBuckets[expandedInactiveBucket].length}
                        </span>
                      </h3>

                      <span className="text-xs text-slate-400 italic">Click card on top to switch view</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {inactiveBuckets[expandedInactiveBucket].length === 0 ? (
                        <div className="col-span-full py-8 text-center text-slate-500">
                          No clients in this inactivity bucket.
                        </div>
                      ) : (
                        inactiveBuckets[expandedInactiveBucket].map(item => {
                          const c = item.customer;
                          return (
                            <div key={c.customerCode} className="p-3.5 rounded-xl bg-[#1E293B]/70 border border-[#334155]/50 space-y-2 shadow-sm">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="font-bold text-white uppercase text-xs block">{c.shopName}</span>
                                  <span className="text-[11px] text-cyan-400 font-bold">{c.cityName || 'HQ'}</span>
                                </div>
                                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#0B1120] text-slate-300 border border-[#334155]">
                                  {c.customerCode}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-400 space-y-1 font-mono pt-1 border-t border-[#334155]/30">
                                <div className="flex justify-between">
                                  <span>Last Order:</span>
                                  <strong className="text-slate-200">{formatDateStandard(item.lastOrderTime)}</strong>
                                </div>
                                <div className="flex justify-between">
                                  <span>Mobile:</span>
                                  <strong className="text-amber-400">{c.mobileNumber}</strong>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 4: ALL ANALYSIS (TASTE, FREQUENCY, CATEGORIES) */}
            {/* =============================================================== */}
            {activeTab === 'ALL_ANALYSIS' && (
              <div className="space-y-4">
                
                {/* Search Bar */}
                <div className="bg-[#0F172A] p-4 rounded-2xl border border-[#334155]/60 shadow-md flex items-center gap-3">
                  <Search size={18} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search client analysis by shop name, city or mobile..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs sm:text-sm text-white placeholder-slate-400 w-full"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} className="p-1 text-slate-400 hover:text-white">
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* List of Customers with Inline Expand Analysis */}
                <div className="space-y-3">
                  {filteredAnalysisCustomers.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 bg-[#0F172A] rounded-2xl border border-[#334155]/60">
                      No matching clients for analysis.
                    </div>
                  ) : (
                    filteredAnalysisCustomers.map(item => {
                      const c = item.customer;
                      const isExpanded = expandedCustomerId === c.customerCode;

                      // Top 5 Subcategories
                      const topSubCategories = Object.entries(item.subCategoryCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5);

                      // Top 3 Products
                      const topProducts = Object.entries(item.productCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3);

                      // Never ordered categories
                      const boughtCategories = new Set(Object.keys(item.categoryCounts));
                      const neverOrderedCategories = allPlatformCategories.filter(cat => !boughtCategories.has(cat));

                      // Lowest Section Views
                      const sectionViews = c.sectionViews || {};
                      const lowestSections = Object.entries(sectionViews)
                        .sort((a, b) => Number(a[1]) - Number(b[1]))
                        .slice(0, 3);

                      const maxCategoryQty = Math.max(...Object.values(item.categoryCounts), 1);

                      return (
                        <div 
                          key={c.customerCode} 
                          className="bg-[#0F172A] border border-[#334155]/60 rounded-2xl overflow-hidden shadow-lg transition"
                        >
                          {/* Item Header Row */}
                          <div 
                            onClick={() => setExpandedCustomerId(isExpanded ? null : c.customerCode)}
                            className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#1E293B]/60 transition"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
                                <Store size={18} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-sm font-bold text-white uppercase">{c.shopName}</h3>
                                  <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                                    {c.customerCode}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span className="text-amber-400 font-bold">{c.cityName || 'HQ'}</span>
                                  <span>•</span>
                                  <span className="font-mono text-slate-300">{c.mobileNumber}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="hidden sm:flex items-center gap-3 text-xs font-mono">
                                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                                  {item.orderCount} Orders
                                </span>
                                <span className="text-slate-400">
                                  Last: {formatDateStandard(item.lastOrderTime)}
                                </span>
                              </div>

                              <button type="button" className="p-1.5 rounded-lg bg-[#1E293B] text-slate-300">
                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              </button>
                            </div>
                          </div>

                          {/* INLINE EXPANDED TASTE & INTEREST SECTION */}
                          {isExpanded && (
                            <div className="p-5 bg-[#0B1120] border-t border-[#334155]/60 space-y-6 text-xs animate-in fade-in duration-150">
                              
                              {/* Overview Metrics Bar */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[#0F172A] border border-[#334155]/50">
                                <div>
                                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Total Orders</span>
                                  <strong className="text-sm font-mono text-white font-black">{item.orderCount}</strong>
                                </div>
                                <div>
                                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Last Order</span>
                                  <strong className="text-xs font-mono text-slate-200">{formatDateStandard(item.lastOrderTime)}</strong>
                                </div>
                                <div>
                                  <span className="text-[10px] font-mono text-slate-400 block uppercase">App Views</span>
                                  <strong className="text-xs font-mono text-amber-400">{item.totalViews} views</strong>
                                </div>
                                <div>
                                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Session Logins</span>
                                  <strong className="text-xs font-mono text-emerald-400">{item.totalLogins} logins</strong>
                                </div>
                              </div>

                              {/* Category & Subcategory Interest Bars */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                
                                {/* CATEGORY ORDER BARS */}
                                <div className="space-y-3 p-4 rounded-xl bg-[#0F172A] border border-[#334155]/50">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 border-b border-[#334155]/40 pb-2">
                                    <Layers size={14} />
                                    <span>Category Wise Order Volume</span>
                                  </h4>

                                  {Object.keys(item.categoryCounts).length === 0 ? (
                                    <p className="text-slate-500 text-[11px] italic py-2">Category data not available for this client yet.</p>
                                  ) : (
                                    Object.entries(item.categoryCounts).map(([cat, qty]) => {
                                      const pct = Math.min(Math.round((qty / maxCategoryQty) * 100), 100);
                                      return (
                                        <div key={cat} className="space-y-1">
                                          <div className="flex justify-between font-mono font-bold text-[11px]">
                                            <span className="text-slate-200">{cat}</span>
                                            <span className="text-cyan-400">{qty} Pcs</span>
                                          </div>
                                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                                            <div 
                                              className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                                              style={{ width: `${Math.max(pct, 6)}%` }}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>

                                {/* TOP 5 SUBCATEGORY BARS */}
                                <div className="space-y-3 p-4 rounded-xl bg-[#0F172A] border border-[#334155]/50">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b border-[#334155]/40 pb-2">
                                    <Package size={14} />
                                    <span>Top 5 Subcategory Preferences</span>
                                  </h4>

                                  {topSubCategories.length === 0 ? (
                                    <p className="text-slate-500 text-[11px] italic py-2">No subcategory preferences recorded yet.</p>
                                  ) : (
                                    topSubCategories.map(([sub, qty]) => (
                                      <div key={sub} className="flex items-center justify-between p-2 rounded-lg bg-[#1E293B]/60 font-mono">
                                        <span className="font-bold text-slate-200">{sub}</span>
                                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[11px] font-bold border border-amber-500/20">
                                          {qty} Pcs
                                        </span>
                                      </div>
                                    ))
                                  )}
                                </div>

                              </div>

                              {/* TASTE & BEHAVIORAL DETAILS */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                
                                {/* Most Ordered Products */}
                                <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#334155]/50 space-y-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Sabse Zyada Order Products</span>
                                  {topProducts.length === 0 ? (
                                    <p className="text-[11px] text-slate-500 italic">No products ordered yet</p>
                                  ) : (
                                    <ul className="space-y-1 font-mono text-[11px]">
                                      {topProducts.map(([p, qty]) => (
                                        <li key={p} className="flex justify-between text-slate-200">
                                          <span className="truncate">{p}</span>
                                          <span className="text-emerald-400 font-bold ml-2">{qty} Pcs</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>

                                {/* Never Bought Categories */}
                                <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#334155]/50 space-y-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">Kabhi Nahi Liya Categories</span>
                                  {neverOrderedCategories.length === 0 ? (
                                    <p className="text-[11px] text-emerald-400 font-medium">Buys from all available categories!</p>
                                  ) : (
                                    <div className="flex flex-wrap gap-1">
                                      {neverOrderedCategories.map(cat => (
                                        <span key={cat} className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[10px] font-mono font-bold uppercase">
                                          {cat}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Lowest Viewed Sections */}
                                <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#334155]/50 space-y-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Sabse KAM Dekhta Hai (Views)</span>
                                  {lowestSections.length === 0 ? (
                                    <p className="text-[11px] text-slate-500 italic">No section view logs recorded</p>
                                  ) : (
                                    <ul className="space-y-1 font-mono text-[11px]">
                                      {lowestSections.map(([sec, count]) => (
                                        <li key={sec} className="flex justify-between text-slate-300">
                                          <span className="truncate uppercase">{sec}</span>
                                          <span className="text-slate-400">{count} views</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>

                              </div>

                              {/* Festival Orders & Live GPS Location Footer */}
                              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#1E293B]/80 border border-[#334155]/60 text-[11px]">
                                <div className="flex items-center gap-2 text-slate-400">
                                  <Info size={14} className="text-amber-400" />
                                  <span>Festival Session Orders: <strong className="text-slate-300">Festival data nahi</strong></span>
                                </div>

                                <div className="flex items-center gap-2 text-slate-300">
                                  <MapPin size={14} className="text-cyan-400" />
                                  <span>
                                    GPS Location: <strong className="text-white uppercase">{(c as any).location?.city || c.cityName || 'N/A'}</strong> 
                                    {(c as any).location?.taluka ? `, ${(c as any).location.taluka}` : ''}
                                  </span>
                                </div>

                                <span className="text-slate-500 text-[10px] italic">
                                  Full details & device locks available in Customers Directory.
                                </span>
                              </div>

                            </div>
                          )}

                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};
