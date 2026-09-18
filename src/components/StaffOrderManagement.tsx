import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  CheckCircle, 
  Volume2, 
  Mic, 
  Square, 
  Paperclip, 
  Send, 
  ClipboardList, 
  Filter, 
  Clock, 
  MapPin, 
  Phone, 
  MessageCircle, 
  FileText, 
  Store,
  FolderOpen
} from 'lucide-react';
import { useAppStore } from '../store';
import { WholesaleOrder, ChatMessage } from '../types';
import { AudioMessagePlayer } from './AudioMessagePlayer';
import { doc, updateDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';

export function StaffOrderManagement() {
  const currentCustomer = useAppStore(state => state.currentCustomer);
  const orders = useAppStore(state => state.orders) as WholesaleOrder[];
  const messages = useAppStore(state => state.messages) as ChatMessage[];
  const addMessage = useAppStore(state => state.addMessage);

  // Default the staff department to currentCustomer's department or 'imitation'
  const defaultStaffDept = ((currentCustomer as any)?.department?.toLowerCase() || 'imitation') as 'imitation' | 'cosmetics' | 'hair';
  const [staffDept, setStaffDept] = useState<'imitation' | 'cosmetics' | 'hair'>(defaultStaffDept);

  // Category filter dropdown selection (Defaults to the staff's assigned department)
  const [deptFilter, setDeptFilter] = useState<string>(defaultStaffDept);

  // Active order selection
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');

  // Photo detail modal state
  const [selectedPhotoDetail, setSelectedPhotoDetail] = useState<{
    imageUri: string;
    photoCode: string;
    variant: string;
    quantity: number;
    subCategoryName: string;
  } | null>(null);

  // Quick Message state
  const [msgText, setMsgText] = useState('');
  
  // Voice Recording state for Quick Message
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Helper to find present departments based on item category IDs
  const getPresentDepartments = (order: WholesaleOrder): ('imitation' | 'cosmetics' | 'hair')[] => {
    const depts: Set<'imitation' | 'cosmetics' | 'hair'> = new Set();
    if (!order.items || order.items.length === 0) {
      return ['imitation', 'cosmetics', 'hair'];
    }
    
    order.items.forEach((item: any) => {
      const cat = (item.categoryId || '').toLowerCase();
      if (cat === 'imitation' || cat === 'imitation_jewelry') {
        depts.add('imitation');
      } else if (cat === 'cosmetics') {
        depts.add('cosmetics');
      } else if (cat === 'hair_accessories' || cat === 'hair') {
        depts.add('hair');
      } else {
        // Fallback by name
        const subName = (item.subCategoryName || '').toLowerCase();
        if (subName.includes('earring') || subName.includes('jhumka') || subName.includes('jewelry')) {
          depts.add('imitation');
        } else if (subName.includes('cosmetic') || subName.includes('makeup') || subName.includes('lipstick')) {
          depts.add('cosmetics');
        } else if (subName.includes('hair') || subName.includes('clip') || subName.includes('band')) {
          depts.add('hair');
        }
      }
    });

    // Default to existing non-empty statuses if still empty
    if (depts.size === 0) {
      if (order.imitationStatus && order.imitationStatus !== 'NOT_APPLICABLE') depts.add('imitation');
      if (order.cosmeticsStatus && order.cosmeticsStatus !== 'NOT_APPLICABLE') depts.add('cosmetics');
      if (order.hairStatus && order.hairStatus !== 'NOT_APPLICABLE') depts.add('hair');
    }

    if (depts.size === 0) {
      return ['imitation', 'cosmetics', 'hair'];
    }
    return Array.from(depts);
  };

  // Safe item conversion helper
  const getSafeItems = (order: WholesaleOrder) => {
    return (order.items || []).map((item: any) => {
      const imageUri = item.imageUri || item.imageUrl || '';
      const photoCode = item.photoCode || item.code || '';
      const variant = item.variant || item.optionLetter || 'A';
      const quantity = item.quantity || 0;
      const subCategoryName = item.subCategoryName || '';
      let categoryId = item.categoryId || '';
      
      // Normalize category id
      if (categoryId === 'imitation_jewelry') categoryId = 'imitation';
      if (categoryId === 'hair_accessories') categoryId = 'hair';
      
      return { imageUri, photoCode, variant, quantity, subCategoryName, categoryId };
    });
  };

  // Filter orders matching the selected department filter
  const filteredOrders = orders.filter(order => {
    if (deptFilter === 'all') return true;
    
    // Check if the department has items in this order
    const presentDepts = getPresentDepartments(order);
    return presentDepts.includes(deptFilter as 'imitation' | 'cosmetics' | 'hair');
  });

  // Ensure selected order ID is valid
  useEffect(() => {
    if (filteredOrders.length > 0) {
      const exists = filteredOrders.some(o => o.orderId === selectedOrderId || o.id === selectedOrderId);
      if (!exists) {
        setSelectedOrderId(filteredOrders[0].orderId || filteredOrders[0].id);
      }
    } else {
      setSelectedOrderId('');
    }
  }, [filteredOrders, selectedOrderId]);

  // Find active selected order
  const activeOrder = orders.find(o => o.orderId === selectedOrderId || o.id === selectedOrderId);

  // Items in active order that match the selected department filter
  const filteredOrderItems = activeOrder ? getSafeItems(activeOrder).filter(item => {
    if (deptFilter === 'all') return true;
    
    // Check if the item belongs to the selected department
    if (deptFilter === 'imitation') {
      return item.categoryId === 'imitation' || (!item.categoryId && (item.subCategoryName.toLowerCase().includes('earring') || item.subCategoryName.toLowerCase().includes('jhumka') || item.subCategoryName.toLowerCase().includes('jewelry')));
    }
    if (deptFilter === 'cosmetics') {
      return item.categoryId === 'cosmetics' || (!item.categoryId && (item.subCategoryName.toLowerCase().includes('cosmetic') || item.subCategoryName.toLowerCase().includes('makeup')));
    }
    if (deptFilter === 'hair') {
      return item.categoryId === 'hair' || item.categoryId === 'hair_accessories' || (!item.categoryId && (item.subCategoryName.toLowerCase().includes('hair') || item.subCategoryName.toLowerCase().includes('clip') || item.subCategoryName.toLowerCase().includes('band')));
    }
    return true;
  }) : [];

  // Chat messages between this order's customer and staff
  const customerChatMessages = messages.filter(m => {
    if (!activeOrder) return false;
    const cid = activeOrder.customerId;
    return m.customerId === cid || m.customerCode === cid;
  });

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [customerChatMessages.length]);

  // Quick Chat actions
  const handleSendTextMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!msgText.trim() || !activeOrder) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      messageId: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      customerId: activeOrder.customerId,
      customerCode: activeOrder.customerId,
      shopName: activeOrder.shopName,
      sender: 'admin',
      type: 'text',
      text: msgText.trim(),
      isRead: false,
      isReadByCustomer: false,
      timestamp: Date.now(),
      createdAt: Date.now()
    };

    addMessage(newMsg);
    setMsgText('');
  };

  const handleImageAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeOrder) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const newMsg: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          messageId: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          customerId: activeOrder.customerId,
          customerCode: activeOrder.customerId,
          shopName: activeOrder.shopName,
          sender: 'admin',
          type: 'image',
          mediaUrl: base64,
          imageUri: base64,
          isRead: false,
          isReadByCustomer: false,
          timestamp: Date.now(),
          createdAt: Date.now()
        };
        addMessage(newMsg);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const startVoiceRecording = async () => {
    setMicNotice(null);
    setRecordingSeconds(0);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicNotice("Microphone recording is not supported in this environment.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        if (audioChunks.current.length === 0 || !activeOrder) return;
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const audioBase64 = reader.result as string;
          const newMsg: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            messageId: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            customerId: activeOrder.customerId,
            customerCode: activeOrder.customerId,
            shopName: activeOrder.shopName,
            sender: 'admin',
            type: 'voice',
            mediaUrl: audioBase64,
            audioUri: audioBase64,
            isRead: false,
            isReadByCustomer: false,
            timestamp: Date.now(),
            createdAt: Date.now()
          };
          addMessage(newMsg);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start(100);
      setIsRecording(true);
      recordingTimer.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      setMicNotice("Microphone permission denied or unavailable.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
    setIsRecording(false);
    if (recordingTimer.current) clearInterval(recordingTimer.current);
  };

  // Real-time Department level status update
  const handleMarkDepartmentDone = async (order: WholesaleOrder, dept: 'imitation' | 'cosmetics' | 'hair') => {
    try {
      const orderRef = doc(db, COLLECTIONS.ORDERS, order.orderId || order.id);
      
      const currentDeptStatus = (order as any).departmentStatus || {};
      const updatedDeptStatus = {
        ...currentDeptStatus,
        [dept]: {
          status: 'Done',
          updatedBy: currentCustomer?.ownerName || 'Staff',
          updatedAt: Date.now()
        }
      };

      let updatedImitationStatus = order.imitationStatus || 'PENDING';
      let updatedCosmeticsStatus = order.cosmeticsStatus || 'PENDING';
      let updatedHairStatus = order.hairStatus || 'PENDING';

      if (dept === 'imitation') updatedImitationStatus = 'DONE';
      if (dept === 'cosmetics') updatedCosmeticsStatus = 'DONE';
      if (dept === 'hair') updatedHairStatus = 'DONE';

      // Check if all present departments are done
      const presentDepts = getPresentDepartments(order);
      const allDone = presentDepts.every(d => {
        if (d === dept) return true;
        if (d === 'imitation') return updatedImitationStatus === 'DONE';
        if (d === 'cosmetics') return updatedCosmeticsStatus === 'DONE';
        if (d === 'hair') return updatedHairStatus === 'DONE';
        return true;
      });

      const overallStatus = allDone ? 'Fully Packed' : 'PARTIALLY_PACKED';
      const statusStr = allDone ? 'Fully Packed' : 'Processing';

      await updateDoc(orderRef, {
        imitationStatus: updatedImitationStatus,
        cosmeticsStatus: updatedCosmeticsStatus,
        hairStatus: updatedHairStatus,
        departmentStatus: updatedDeptStatus,
        overallStatus,
        status: statusStr,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error("Error updating department status:", error);
    }
  };

  return (
    <div className="flex-grow flex flex-col overflow-hidden h-full bg-brand-navy-dark select-none text-slate-100">
      
      {/* STAFF PACKING WORKSPACE TOP HEADER */}
      <div className="bg-brand-navy-card/90 backdrop-blur-md border-b border-brand-navy-border p-3 sm:p-4 flex flex-col gap-3 flex-shrink-0 z-10">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Active staff role badge */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <ClipboardList size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black tracking-wider text-white uppercase">Staff Order Packing</h2>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border border-purple-500/20">
                  Staff: {staffDept.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Manage packing lists & dispatch items in real-time</p>
            </div>
          </div>

          {/* Quick Staff Department selection (Foolproof override if database field not set) */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Switch Duty:</span>
            <select
              value={staffDept}
              onChange={(e) => {
                const val = e.target.value as 'imitation' | 'cosmetics' | 'hair';
                setStaffDept(val);
                setDeptFilter(val);
              }}
              className="bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white px-2 py-1 font-bold focus:outline-none focus:border-purple-500 transition cursor-pointer"
            >
              <option value="imitation">Imitation Duty</option>
              <option value="cosmetics">Cosmetics Duty</option>
              <option value="hair">Hair Accessories Duty</option>
            </select>
          </div>
        </div>

        {/* Filters and Active Order Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-800/60">
          
          {/* Department Filter Selector */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <Filter size={14} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs font-bold text-slate-400 tracking-wider whitespace-nowrap">Filter Dept:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="flex-1 bg-transparent text-xs text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="imitation">Imitation Jewelry Items</option>
              <option value="cosmetics">Cosmetics Items</option>
              <option value="hair">Hair Accessories Items</option>
              <option value="all">All Items (Full Visibility)</option>
            </select>
          </div>

          {/* Active Orders Dropdown */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <Clock size={14} className="text-amber-400 flex-shrink-0 animate-pulse" />
            <span className="text-xs font-bold text-slate-400 tracking-wider whitespace-nowrap">Select Order:</span>
            {filteredOrders.length === 0 ? (
              <span className="text-xs font-bold text-slate-500">No active orders</span>
            ) : (
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="flex-1 bg-transparent text-xs text-brand-gold font-bold focus:outline-none cursor-pointer"
              >
                {filteredOrders.map((o) => {
                  const number = o.orderNumber || `#${o.orderId.substring(0, 6).toUpperCase()}`;
                  return (
                    <option key={o.orderId || o.id} value={o.orderId || o.id} className="text-white">
                      {number} • {o.shopName} ({o.cityName || 'N/A'}) • {o.totalItemsCount} items
                    </option>
                  );
                })}
              </select>
            )}
          </div>

        </div>

      </div>

      {/* TWO-COLUMN PACKING WORKSPACE BODY */}
      {!activeOrder ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
          <FolderOpen size={48} className="text-slate-600 mb-3" />
          <h3 className="font-bold text-base text-slate-300">No Orders Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            There are currently no wholesale orders matching your selected filter department. Try switching the filter.
          </p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* LEFT SIDE: ORDER PHOTO GALLERY (lg:col-span-7) */}
          <div className="lg:col-span-7 flex flex-col overflow-hidden border-b lg:border-b-0 lg:border-r border-brand-navy-border h-1/2 lg:h-full p-3 sm:p-4 bg-slate-950/40">
            <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
              <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <Store size={14} className="text-purple-400" />
                Items to Pack ({filteredOrderItems.length})
              </h3>
              <span className="text-[10px] text-slate-400">Tap photo to verify full resolution</span>
            </div>

            {filteredOrderItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-600">
                <FolderOpen size={36} className="text-slate-700 mb-2" />
                <p className="text-xs font-bold">No matching items in this order</p>
                <p className="text-[10px] text-slate-500">This order contains items from other departments only.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 pr-1 scrollbar-thin">
                {filteredOrderItems.map((item, idx) => (
                  <div 
                    key={idx}
                    className="bg-brand-navy-card border border-slate-800 rounded-xl overflow-hidden flex flex-col hover:border-slate-700 transition"
                  >
                    {/* Item Image (Tap to open full modal) */}
                    <div 
                      onClick={() => setSelectedPhotoDetail(item)}
                      className="relative aspect-video bg-black cursor-pointer overflow-hidden group border-b border-slate-900"
                    >
                      <img 
                        src={item.imageUri} 
                        alt={item.photoCode} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                      />
                      <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                        <span className="text-[9px] font-mono font-bold text-black bg-white px-1.5 py-0.5 rounded shadow">
                          {item.photoCode}
                        </span>
                        <span className="text-[9px] font-bold text-black bg-brand-gold px-1.5 py-0.5 rounded shadow">
                          Opt {item.variant}
                        </span>
                      </div>
                    </div>

                    {/* Metadata & Pack Count */}
                    <div className="p-2 flex flex-col justify-between flex-1 gap-1">
                      <div className="text-[10px] text-slate-400 truncate leading-tight font-medium">
                        {item.subCategoryName || 'General Item'}
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-800/60 pt-1.5">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Pack Qty:</span>
                        <span className="text-xs font-black text-amber-300 font-mono bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/20">
                          {item.quantity} pcs
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT SIDE: DISPATCH BOX & QUICK CHAT (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col overflow-hidden h-1/2 lg:h-full bg-brand-navy-card">
            
            {/* Customer Contact Card */}
            <div className="p-3 bg-slate-900 border-b border-brand-navy-border flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-purple-400 uppercase font-black tracking-wider mb-0.5">Customer Dispatch Info</div>
                  <h4 className="text-sm font-black text-white">{activeOrder.shopName}</h4>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-slate-400 text-xs mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="text-slate-500" />
                      {activeOrder.cityName || 'No City'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone size={12} className="text-slate-500" />
                      {activeOrder.mobileNumber || 'No Phone'}
                    </span>
                  </div>
                </div>
                
                {/* Active overall status indicator */}
                <div className="text-right">
                  <span className="text-[9px] uppercase font-black text-slate-500 block">Status</span>
                  <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg border ${
                    activeOrder.overallStatus === 'Fully Packed' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}>
                    {activeOrder.overallStatus || 'Pending'}
                  </span>
                </div>
              </div>

              {/* Order Note text */}
              {activeOrder.orderNote && (
                <div className="mt-2.5 bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    <FileText size={11} className="text-slate-500" />
                    <span>Customer Instructions:</span>
                  </div>
                  <p className="italic leading-relaxed">"{activeOrder.orderNote}"</p>
                </div>
              )}

              {/* Order Voice Note player */}
              {(activeOrder.voiceNoteUrl || activeOrder.voiceNoteUri) && (
                <div className="mt-2 bg-slate-950 border border-slate-800 p-2 rounded-lg">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    <Volume2 size={11} className="text-slate-500" />
                    <span>Customer Voice Instructions:</span>
                  </div>
                  <AudioMessagePlayer src={activeOrder.voiceNoteUrl || activeOrder.voiceNoteUri || ''} isMe={false} />
                </div>
              )}
            </div>

            {/* Department Level Order Packing Status Grid */}
            <div className="p-3 border-b border-brand-navy-border bg-slate-900/40 flex-shrink-0">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Department Progress Matrix</div>
              <div className="grid grid-cols-3 gap-2">
                
                {/* Imitation Box */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-wider">Imitation</span>
                  {activeOrder.imitationStatus === 'DONE' ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 shadow-sm">
                      <CheckCircle size={10} />
                      <span>Done</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleMarkDepartmentDone(activeOrder, 'imitation')}
                      disabled={staffDept !== 'imitation'}
                      className={`text-[10px] font-extrabold py-1.5 rounded-lg border text-center transition ${
                        staffDept === 'imitation'
                          ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400/40 cursor-pointer active:scale-95'
                          : 'bg-slate-900/60 text-slate-500 border-slate-800 cursor-not-allowed'
                      }`}
                      title={staffDept !== 'imitation' ? 'Only Imitation Duty can update this section' : 'Mark section done'}
                    >
                      {staffDept === 'imitation' ? 'Pack Done' : 'Pending'}
                    </button>
                  )}
                </div>

                {/* Cosmetics Box */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-wider">Cosmetics</span>
                  {activeOrder.cosmeticsStatus === 'DONE' ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 shadow-sm">
                      <CheckCircle size={10} />
                      <span>Done</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleMarkDepartmentDone(activeOrder, 'cosmetics')}
                      disabled={staffDept !== 'cosmetics'}
                      className={`text-[10px] font-extrabold py-1.5 rounded-lg border text-center transition ${
                        staffDept === 'cosmetics'
                          ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400/40 cursor-pointer active:scale-95'
                          : 'bg-slate-900/60 text-slate-500 border-slate-800 cursor-not-allowed'
                      }`}
                      title={staffDept !== 'cosmetics' ? 'Only Cosmetics Duty can update this section' : 'Mark section done'}
                    >
                      {staffDept === 'cosmetics' ? 'Pack Done' : 'Pending'}
                    </button>
                  )}
                </div>

                {/* Hair Accessories Box */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-wider">Hair Acc</span>
                  {activeOrder.hairStatus === 'DONE' ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 shadow-sm">
                      <CheckCircle size={10} />
                      <span>Done</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleMarkDepartmentDone(activeOrder, 'hair')}
                      disabled={staffDept !== 'hair'}
                      className={`text-[10px] font-extrabold py-1.5 rounded-lg border text-center transition ${
                        staffDept === 'hair'
                          ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400/40 cursor-pointer active:scale-95'
                          : 'bg-slate-900/60 text-slate-500 border-slate-800 cursor-not-allowed'
                      }`}
                      title={staffDept !== 'hair' ? 'Only Hair Accessories Duty can update this section' : 'Mark section done'}
                    >
                      {staffDept === 'hair' ? 'Pack Done' : 'Pending'}
                    </button>
                  )}
                </div>

              </div>
            </div>

            {/* QUICK CHAT COMPACT HISTORY PANEL */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-950/60 flex flex-col scrollbar-thin">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5 flex-shrink-0">
                Quick Dispatch Chat
              </div>

              {customerChatMessages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-[11px]">
                  <MessageCircle size={20} className="text-slate-700 mb-1" />
                  <span>No conversation history found</span>
                  <span>Send a message below to coordinate packing</span>
                </div>
              ) : (
                <div className="space-y-2 flex-1">
                  {customerChatMessages.map((msg) => {
                    const isMe = msg.sender === 'admin';
                    return (
                      <div 
                        key={msg.id} 
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className={`max-w-[85%] rounded-xl px-3 py-1.5 text-xs ${
                          isMe 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-slate-800 text-slate-100 border border-slate-700'
                        }`}>
                          {msg.type === 'image' && (msg.mediaUrl || msg.imageUri) && (
                            <img 
                              src={msg.mediaUrl || msg.imageUri} 
                              alt="attached" 
                              referrerPolicy="no-referrer"
                              className="max-w-full rounded mb-1 max-h-40 object-cover" 
                            />
                          )}
                          {msg.type === 'voice' && (msg.mediaUrl || msg.audioUri) && (
                            <AudioMessagePlayer src={msg.mediaUrl || msg.audioUri || ''} isMe={isMe} />
                          )}
                          {msg.text && <p className="leading-relaxed break-words">{msg.text}</p>}
                        </div>
                        <span className="text-[9px] text-slate-500 mt-0.5 font-medium">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* QUICK MESSAGING STATION CONTROL BAR */}
            <div className="p-3 bg-slate-900 border-t border-brand-navy-border flex-shrink-0">
              
              {/* Mic permission/notice area */}
              {micNotice && (
                <div className="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2 py-1 rounded mb-2 flex items-center justify-between">
                  <span>{micNotice}</span>
                  <button onClick={() => setMicNotice(null)} className="hover:text-white font-bold">✕</button>
                </div>
              )}

              <form onSubmit={handleSendTextMessage} className="flex items-center gap-2">
                
                {/* Paperclip file input */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="Attach Photo"
                >
                  <Paperclip size={18} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageAttachment}
                  accept="image/*"
                  className="hidden" 
                />

                {/* Main message text input */}
                <input
                  type="text"
                  placeholder="Type packing query or update..."
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                />

                {/* Microphone hold/record button */}
                {isRecording ? (
                  <button
                    type="button"
                    onClick={stopVoiceRecording}
                    className="p-2.5 bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition animate-pulse border border-red-500/30 flex items-center gap-1.5"
                    title="Stop recording"
                  >
                    <Square size={14} fill="currentColor" />
                    <span className="text-[10px] font-bold font-mono">0:{(recordingSeconds).toString().padStart(2, '0')}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    className="p-2.5 bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 rounded-xl transition"
                    title="Record voice note"
                  >
                    <Mic size={14} />
                  </button>
                )}

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!msgText.trim()}
                  className="p-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send size={14} />
                </button>

              </form>
            </div>

          </div>

        </div>
      )}

      {/* STAFF ORDER VERIFICATION DETAIL PHOTO MODAL */}
      {selectedPhotoDetail && (
        <div className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-brand-navy-card border border-purple-500/40 rounded-2xl p-4 sm:p-5 w-full max-w-lg shadow-2xl relative flex flex-col">
            
            {/* Header / Accent Badge */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
                <h4 className="text-xs font-black uppercase tracking-widest text-purple-400">Staff Order Verification View</h4>
              </div>
              <button 
                onClick={() => setSelectedPhotoDetail(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* High-Resolution Photo */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
              <img 
                src={selectedPhotoDetail.imageUri} 
                alt={selectedPhotoDetail.photoCode} 
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="font-mono font-black text-xs text-black bg-white px-2.5 py-1 rounded shadow">
                  Code: {selectedPhotoDetail.photoCode}
                </span>
                <span className="font-black text-xs text-black bg-brand-gold px-2.5 py-1 rounded shadow">
                  Option: {selectedPhotoDetail.variant}
                </span>
              </div>
            </div>

            {/* Product Details & Count */}
            <div className="mt-4 bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-black leading-none">Category & Type</div>
                <div className="text-sm font-bold text-white mt-1">{selectedPhotoDetail.subCategoryName || 'General Item'}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 uppercase font-black leading-none">Target Packing Quantity</div>
                <div className="text-lg font-black text-amber-300 font-mono mt-1 bg-amber-950/30 border border-amber-500/25 px-3 py-1 rounded-lg inline-block">
                  {selectedPhotoDetail.quantity} pcs
                </div>
              </div>
            </div>

            {/* Footer Control */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedPhotoDetail(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition"
              >
                Close Verification
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
