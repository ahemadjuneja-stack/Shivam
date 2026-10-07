import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, Smartphone, Monitor, X, Store, Mic, MessageSquare } from 'lucide-react';
import { db, auth, firebaseConfig } from '../firebase';
import { useAppStore } from '../store';
import { WholesaleOrder } from '../types';
import { OrderTimeline } from '../components/OrderTimeline';
import { parseOrderTimestamp, groupOrderItemsForDisplay } from '../utils';

export const resolveItemImage = (item: any): string => {
  if (!item) return '';
  if (typeof item.imageUri === 'string' && item.imageUri) return item.imageUri;
  if (typeof item.image === 'string' && item.image) return item.image;
  if (typeof item.imageUrl === 'string' && item.imageUrl) return item.imageUrl;
  if (typeof item.photo === 'string' && item.photo) return item.photo;
  if (Array.isArray(item.images) && item.images.length > 0 && typeof item.images[0] === 'string') {
    return item.images[0];
  }
  return '';
};

const mapDocToOrder = (docSnap: any): WholesaleOrder => {
  const data = docSnap.data() as any;
  let raw = data.items;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { raw = []; }
  }
  let rawItems: any[] = [];
  if (Array.isArray(raw)) {
    rawItems = raw;
  } else if (Array.isArray(data.orderedItems)) {
    rawItems = data.orderedItems;
  } else if (Array.isArray(data.cartItems)) {
    rawItems = data.cartItems;
  } else if (Array.isArray(data.products)) {
    rawItems = data.products;
  } else if (Array.isArray(data.orderItems)) {
    rawItems = data.orderItems;
  } else if (Array.isArray(data.lineItems)) {
    rawItems = data.lineItems;
  } else if (raw && typeof raw === 'object') {
    rawItems = Object.values(raw);
  } else if (data.orderedItems && typeof data.orderedItems === 'object') {
    rawItems = Object.values(data.orderedItems);
  } else if (data.cartItems && typeof data.cartItems === 'object') {
    rawItems = Object.values(data.cartItems);
  } else if (data.products && typeof data.products === 'object') {
    rawItems = Object.values(data.products);
  } else if (data.item && typeof data.item === 'object') {
    rawItems = [data.item];
  }

  const normalizedItems = rawItems.map((it: any) => {
    if (!it || typeof it !== 'object') {
      return {
        photoCode: String(it || 'ITEM'),
        optionLetter: 'A',
        quantity: 1,
        imageUri: '',
        imageUrl: '',
        image: ''
      };
    }
    const img = resolveItemImage(it);
    return {
      ...it,
      photoCode: it.photoCode || it.code || it.name || it.title || 'Item',
      optionLetter: it.optionLetter || it.option || 'A',
      quantity: Number(it.quantity || it.qty || 1),
      imageUri: img || it.imageUri || it.imageUrl || it.image || '',
      imageUrl: img || it.imageUrl || it.imageUri || it.image || '',
      image: img || it.image || it.imageUri || it.imageUrl || ''
    };
  });

  const resolvedNote = data.notes || data.orderNote || data.note || data.remarks || '';
  const resolvedVoice = data.voiceNoteUrl || data.voiceNoteUri || data.voiceNote || data.audioUrl || undefined;

  return {
    id: docSnap.id,
    ...data,
    items: normalizedItems,
    shopName: data.shopName || data.customerName || data.buyerName || 'Direct Customer',
    notes: resolvedNote,
    orderNote: resolvedNote,
    voiceNoteUrl: resolvedVoice,
    voiceNote: resolvedVoice,
    overallStatus: data.overallStatus || data.status || 'PENDING',
    createdAt: parseOrderTimestamp(data.createdAt) || Date.now()
  } as WholesaleOrder;
};

let cachedOrders: WholesaleOrder[] = [];
let hasLoadedOnce = false;

export const Orders: React.FC = () => {
  const { orders, setOrders } = useAppStore();
  const [isLoading, setIsLoading] = useState(!hasLoadedOnce);
  const [rawSnapshotCount, setRawSnapshotCount] = useState<number | null>(null);
  const getDocsCount: number | null = null;
  const [lastFirestoreError, setLastFirestoreError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<string>(
    auth.currentUser ? auth.currentUser.uid : 'NOT LOGGED IN / GUEST'
  );
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY'>('ALL');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedOrder, setSelectedOrder] = useState<WholesaleOrder | null>(null);

  // Hydrated Order opener ensuring items are never shallow or missing
  const handleOpenOrderModal = (order: WholesaleOrder) => {
    const fullOrder = orders.find(o => o.id === order.id) || order;
    let items = fullOrder.items;
    if (!items || (Array.isArray(items) && items.length === 0) || (typeof items === 'object' && Object.keys(items).length === 0)) {
      items = (order.items && (Array.isArray(order.items) ? order.items.length > 0 : Object.keys(order.items).length > 0))
        ? order.items
        : (fullOrder as any).products || (fullOrder as any).orderItems || (fullOrder as any).cartItems || (fullOrder as any).orderedItems || [];
    }

    setSelectedOrder({
      ...fullOrder,
      ...order,
      items: items || []
    });
  };

  // Sync selectedOrder with latest Firestore updates to prevent stale or missing items
  useEffect(() => {
    if (selectedOrder) {
      const refreshed = orders.find(o => o.id === selectedOrder.id);
      if (refreshed && refreshed.items) {
        setSelectedOrder(prev => {
          if (!prev || prev.id !== refreshed.id) return prev;
          return {
            ...prev,
            ...refreshed,
            items: (refreshed.items && (Array.isArray(refreshed.items) ? refreshed.items.length > 0 : Object.keys(refreshed.items).length > 0))
              ? refreshed.items
              : prev.items
          };
        });
      }
    }
  }, [orders]);

  // Track Firebase Auth state
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setAuthStatus(user ? user.uid : 'NOT LOGGED IN / GUEST');
    });
    return () => unsubAuth();
  }, []);

  // Real-time onSnapshot Listener with In-Memory Caching (Instant Revisits)
  useEffect(() => {
    // Initialize the list from cachedOrders (so reopening shows orders instantly)
    if (hasLoadedOnce && cachedOrders.length > 0 && orders.length === 0) {
      setOrders(cachedOrders);
    }

    const ordersQuery = query(collection(db, 'orders'));

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      console.log("Firestore Orders Snapshot Count:", snapshot.docs.length);
      setRawSnapshotCount(snapshot.docs.length);
      setLastFirestoreError(null);

      const fetched = snapshot.docs.map(mapDocToOrder);
      console.log("Fetched Orders Data:", fetched);
      
      // Descending order (newest first)
      fetched.sort((a, b) => (Number(b.createdAt || 0) - Number(a.createdAt || 0)));

      // Update cachedOrders on every snapshot
      cachedOrders = fetched;
      hasLoadedOnce = true;

      setOrders(fetched);
      setIsLoading(false);
    }, (error) => {
      console.warn("Firestore Orders Listener Notice:", error);
      const errMsg = error instanceof Error ? error.message : String(error);
      setLastFirestoreError(errMsg);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [setOrders]);

  // Diagnostic Banner rendered across all views
  const renderDiagnosticBanner = () => (
    <div className="bg-[#0B1120] border-b border-amber-500/30 px-3 sm:px-4 py-2 text-[11px] font-mono text-slate-300 z-50 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
          <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px] bg-amber-400/10 border border-amber-400/30 px-1.5 py-0.5 rounded">
            Firebase Diagnostic
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-300">
          <span>Config Project ID: <strong className="text-emerald-400">{firebaseConfig.projectId || (db.app.options as any)?.projectId || 'Unknown'}</strong></span>
          <span>Collection Path: <strong className="text-cyan-400">orders</strong></span>
          <span>Auth Status: <strong className="text-purple-300">{authStatus}</strong></span>
          <span>Raw Snapshot Count: <strong className={rawSnapshotCount && rawSnapshotCount > 0 ? "text-emerald-400 font-bold" : "text-amber-400"}>{rawSnapshotCount !== null ? rawSnapshotCount : 'Connecting...'}</strong></span>
          <span>getDocs Count: <strong className={getDocsCount && getDocsCount > 0 ? "text-emerald-400 font-bold" : "text-amber-400"}>{getDocsCount !== null ? getDocsCount : 'Testing...'}</strong></span>
          <span>Error Details: <strong className={lastFirestoreError ? "text-red-400 font-bold" : "text-slate-400"}>{lastFirestoreError || 'None'}</strong></span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#040812] text-white flex flex-col">
      {renderDiagnosticBanner()}

      {/* Top Navigation Bar */}
      <header className="h-14 bg-[#0B1120] border-b border-slate-800 px-4 flex items-center justify-between flex-shrink-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl transition"
          >
            <ArrowLeft size={14} />
            <span>Admin</span>
          </Link>
          <div className="h-4 w-[1px] bg-slate-800" />
          <h1 className="text-sm font-black tracking-wider uppercase text-slate-200">
            Order Line Dashboard & Mobile APK
          </h1>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2">
          {/* Quick Date Filters */}
          <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
            {(['ALL', 'TODAY', 'YESTERDAY'] as const).map(filter => (
              <button
                key={filter}
                type="button"
                onClick={() => setDateFilter(filter)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  dateFilter === filter ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'desktop' ? 'mobile' : 'desktop')}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
              viewMode === 'mobile'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            {viewMode === 'mobile' ? <Monitor size={14} /> : <Smartphone size={14} />}
            <span>{viewMode === 'mobile' ? 'Switch to Desktop' : 'Switch to Mobile APK'}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 overflow-hidden flex justify-center p-3 sm:p-6">
        {viewMode === 'desktop' ? (
          <div className="w-full max-w-6xl h-full bg-[#0B1120] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <OrderTimeline 
              mode="dashboard" 
              dateFilter={dateFilter} 
              onResetDateFilter={() => setDateFilter('ALL')} 
              onSelectOrder={handleOpenOrderModal}
              selectedOrderId={selectedOrder?.id}
              isLoading={isLoading}
            />
          </div>
        ) : (
          <div className="w-full max-w-[420px] h-[820px] bg-black rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 overflow-hidden relative flex flex-col">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-slate-800 rounded-full z-40" />
            <div className="w-full h-full bg-[#040812] rounded-[34px] overflow-hidden flex flex-col">
              <OrderTimeline 
                mode="mobile" 
                dateFilter={dateFilter} 
                onResetDateFilter={() => setDateFilter('ALL')} 
                onSelectOrder={handleOpenOrderModal}
                selectedOrderId={selectedOrder?.id}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}
      </main>

      {/* Customer Mobile Order Modal (Modal View) */}
      {selectedOrder && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedOrder(null)}
        >
          <div 
            className="w-full max-w-2xl bg-[#040812] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0B1120]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Store size={18} />
                </div>
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <span>{selectedOrder.shopName || selectedOrder.displayTitle || 'Order Details'}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      #{selectedOrder.orderNumber || selectedOrder.id.slice(-6)}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    {selectedOrder.cityName || 'Direct Order'} {selectedOrder.mobileNumber ? `• ${selectedOrder.mobileNumber}` : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
                title="Close Modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              {/* Status & Timing Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Time</span>
                  <span className="text-slate-200 font-mono font-semibold">
                    {new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Date</span>
                  <span className="text-slate-200 font-mono font-semibold">
                    {new Date(selectedOrder.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Master Status</span>
                  <span className={`inline-block font-bold text-[10px] uppercase px-2 py-0.5 rounded-full border mt-0.5 ${
                    selectedOrder.overallStatus === 'DONE'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  }`}>
                    {selectedOrder.overallStatus || 'PENDING'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Source</span>
                  <span className="text-slate-200 font-semibold truncate block">
                    {selectedOrder.source === 'SALESMAN' ? `Salesman (${selectedOrder.salesmanName || 'RAMIZ'})` : 'Customer Mobile'}
                  </span>
                </div>
              </div>

              {/* Order Note / Remarks */}
              <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-xl space-y-1.5">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-blue-400" />
                  <span>Order Note / Instructions</span>
                </span>
                <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 italic">
                  {selectedOrder.notes || (selectedOrder as any).orderNote || (selectedOrder as any).note || (selectedOrder as any).remarks || 'No Note entered for this order.'}
                </p>
              </div>

              {/* Customer Voice Note */}
              <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-xl space-y-1.5">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <Mic size={13} className="text-emerald-400" />
                  <span>Customer Voice Note</span>
                </span>
                {(() => {
                  const voiceSrc = selectedOrder.voiceNoteUrl || (selectedOrder as any).voiceUrl || (selectedOrder as any).audioUrl || (selectedOrder as any).voiceNote || (selectedOrder as any).voiceNoteUri;
                  return voiceSrc ? (
                    <audio controls src={voiceSrc} className="w-full mt-2" />
                  ) : (
                    <div className="w-full bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 text-center">
                      <span className="text-xs text-slate-500 italic">No voice note</span>
                    </div>
                  );
                })()}
              </div>

              {/* ORDERED ITEMS */}
              {(() => {
                const { groupedProducts, totalDesigns, totalPieces } = groupOrderItemsForDisplay(selectedOrder?.items);

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Ordered Items ({totalDesigns} designs, {totalPieces} pieces)
                      </h3>
                    </div>

                    {(() => {
                      if (groupedProducts.length === 0) {
                        return <p className="text-sm text-slate-400 py-3 text-center">No item entries attached to this order.</p>;
                      }

                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto mt-2 pr-1">
                          {groupedProducts.map((product, idx) => {
                            return (
                              <div key={product.key || idx} className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex flex-col justify-between">
                                <div className="w-full h-24 bg-black rounded overflow-hidden flex items-center justify-center mb-1">
                                  {product.imageUri ? (
                                    <img 
                                      src={product.imageUri} 
                                      alt={product.photoCode || 'Item'} 
                                      className="w-full h-full object-cover"
                                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/100x100?text=No+Img'; }}
                                    />
                                  ) : (
                                    <span className="text-xs text-slate-500">No Image</span>
                                  )}
                                </div>
                                <div className="text-xs">
                                  <p className="font-semibold text-white truncate">{product.photoCode}</p>
                                  {product.shadesText && (
                                    <p className="text-[11px] text-slate-300 font-mono truncate">{product.shadesText}</p>
                                  )}
                                  <p className="text-amber-400 font-bold">{product.totalQuantity} pcs</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-[#0B1120] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
