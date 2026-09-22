import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  CheckCircle, 
  Volume2, 
  Mic, 
  Square, 
  Paperclip, 
  Send, 
  MapPin, 
  Phone, 
  MessageCircle, 
  FileText, 
  Store,
  FolderOpen,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { useAppStore } from '../store';
import { WholesaleOrder, ChatMessage } from '../types';
import { AudioMessagePlayer } from './AudioMessagePlayer';
import { DisplayOrderManager } from './DisplayOrderManager';
import { CustomerManager } from './CustomerManager';
import { DatabaseCleanManager } from './DatabaseCleanManager';
import { doc, updateDoc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { generateMessageId } from '../lib/idGenerator';
import { db, COLLECTIONS } from '../firebase';
import { uploadMediaToStorage } from '../services/storageService';

// Module-level cached orders and load flag outside the component for instant re-visits
let cachedOrders: WholesaleOrder[] = [];
let hasLoadedOnce = false;

export function StaffOrderManagement() {
  const currentCustomer = useAppStore(state => state.currentCustomer);
  const [localOrders, setLocalOrders] = useState<WholesaleOrder[]>(cachedOrders);
  const [isLoading, setIsLoading] = useState(!hasLoadedOnce);
  const orders = localOrders;
  const messages = useAppStore(state => state.messages) as ChatMessage[];
  const addMessage = useAppStore(state => state.addMessage);

  // Subscribe to real-time orders updates using onSnapshot
  useEffect(() => {
    const ordersCol = collection(db, COLLECTIONS.ORDERS);
    const q = query(ordersCol, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: WholesaleOrder[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          fetched.push({
            id: docSnap.id,
            ...data
          } as WholesaleOrder);
        });
        cachedOrders = fetched;
        hasLoadedOnce = true;
        setLocalOrders(fetched);
        setIsLoading(false);
        // Sync to global store so other components have up-to-date orders
        useAppStore.setState({ orders: fetched });
      },
      (error) => {
        console.error('Error listening to orders snapshot:', error);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const [workspaceMode, setWorkspaceMode] = useState<'manageOrders' | 'packing' | 'displayOrder' | 'customers' | 'databaseCleaner'>('manageOrders');
  const [manageStatusFilter, setManageStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'done'>('pending');

  // Default the staff department category filter from currentCustomer's assigned department
  const getDefaultCategoryFilter = (): 'all' | 'cosmetics' | 'imitation' | 'hair' => {
    if (currentCustomer?.role === 'admin') return 'all';
    const dept = (
      (currentCustomer as any)?.department || 
      (currentCustomer as any)?.staffCategory || 
      (currentCustomer as any)?.departmentAssigned || 
      ''
    ).toLowerCase();
    if (dept.includes('cosmetic')) return 'cosmetics';
    if (dept.includes('imitation')) return 'imitation';
    if (dept.includes('hair')) return 'hair';
    return 'all';
  };

  const [manageCategoryFilter, setManageCategoryFilter] = useState<'all' | 'cosmetics' | 'imitation' | 'hair'>(getDefaultCategoryFilter);

  // Sync deptFilter with manageCategoryFilter for packing view item filtering
  const deptFilter = manageCategoryFilter;

  // Helper to determine if a department is done for an order
  const isDepartmentDone = (order: WholesaleOrder, deptKey: 'imitation' | 'cosmetics' | 'hair'): boolean => {
    // 1. Check flat field (imitationStatus, cosmeticsStatus, hairStatus)
    const flatVal = deptKey === 'imitation' ? order.imitationStatus :
                    deptKey === 'cosmetics' ? order.cosmeticsStatus :
                    order.hairStatus;
    if (flatVal) {
      const norm = String(flatVal).toUpperCase();
      if (norm === 'DONE' || norm === 'PACKED' || norm === 'COMPLETED') return true;
    }

    // 2. Check nested object field (departmentStatus.imitation.status)
    const deptObj = (order as any).departmentStatus?.[deptKey];
    if (deptObj) {
      const statusVal = typeof deptObj === 'string' ? deptObj : (deptObj.status || '');
      const norm = String(statusVal).toUpperCase();
      if (norm === 'DONE' || norm === 'PACKED' || norm === 'COMPLETED') return true;
    }

    return false;
  };

  // Helper to extract unique categories/departments from order items
  const getPresentDepartmentsFromItems = (order: WholesaleOrder): ('imitation' | 'cosmetics' | 'hair')[] => {
    const deptsSet = new Set<'imitation' | 'cosmetics' | 'hair'>();
    
    (order.items || []).forEach((item: any) => {
      const cat = (item.categoryId || item.category || '').toLowerCase();
      if (cat === 'imitation' || cat === 'imitation_jewelry' || cat.includes('imitation')) {
        deptsSet.add('imitation');
      } else if (cat === 'cosmetics' || cat.includes('cosmetic')) {
        deptsSet.add('cosmetics');
      } else if (cat === 'hair' || cat === 'hair_accessories' || cat.includes('hair')) {
        deptsSet.add('hair');
      } else {
        const subName = (item.subCategoryName || item.name || '').toLowerCase();
        if (subName.includes('earring') || subName.includes('jhumka') || subName.includes('jewelry')) {
          deptsSet.add('imitation');
        } else if (subName.includes('cosmetic') || subName.includes('makeup') || subName.includes('lipstick')) {
          deptsSet.add('cosmetics');
        } else if (subName.includes('hair') || subName.includes('clip') || subName.includes('band')) {
          deptsSet.add('hair');
        }
      }
    });

    // Fixed order: Imitation Jewelry, Cosmetics, Hair Accessories
    return (['imitation', 'cosmetics', 'hair'] as const).filter(d => deptsSet.has(d));
  };

  // Helper to determine dynamic overall order status state
  const getOrderStatusState = (order: WholesaleOrder): 'DONE' | 'IN_PROGRESS' | 'PENDING' => {
    const presentDepts = getPresentDepartmentsFromItems(order);
    if (presentDepts.length === 0) return 'PENDING';

    const completedCount = presentDepts.filter(d => isDepartmentDone(order, d)).length;

    if (completedCount === presentDepts.length) {
      return 'DONE';
    } else if (completedCount > 0) {
      return 'IN_PROGRESS';
    } else {
      return 'PENDING';
    }
  };

  // Filtered and sorted orders list for Manage Orders screen
  const displayedManageOrders = orders
    .filter(order => {
      const presentDepts = getPresentDepartmentsFromItems(order);

      if (manageCategoryFilter !== 'all') {
        // Order must contain items of the selected department
        if (!presentDepts.includes(manageCategoryFilter)) {
          return false;
        }

        const isDeptDone = isDepartmentDone(order, manageCategoryFilter);
        const overallStatus = getOrderStatusState(order);

        // Status filter applies to the selected department's own status
        if (manageStatusFilter === 'pending') {
          return !isDeptDone;
        } else if (manageStatusFilter === 'in_progress') {
          return !isDeptDone && overallStatus === 'IN_PROGRESS';
        } else if (manageStatusFilter === 'done') {
          return isDeptDone;
        }
        return true; // 'all'
      } else {
        // With 'All Categories', use overall order status
        const overallStatus = getOrderStatusState(order);

        if (manageStatusFilter === 'pending') {
          return overallStatus === 'PENDING' || overallStatus === 'IN_PROGRESS';
        } else if (manageStatusFilter === 'in_progress') {
          return overallStatus === 'IN_PROGRESS';
        } else if (manageStatusFilter === 'done') {
          return overallStatus === 'DONE';
        }
        return true; // 'all'
      }
    })
    .sort((a, b) => {
      const statusA = getOrderStatusState(a);
      const statusB = getOrderStatusState(b);

      // Prioritize IN_PROGRESS orders at the top so staff notice active orders
      if (statusA === 'IN_PROGRESS' && statusB !== 'IN_PROGRESS') return -1;
      if (statusA !== 'IN_PROGRESS' && statusB === 'IN_PROGRESS') return 1;

      // PENDING before DONE when viewing all
      if (statusA === 'PENDING' && statusB === 'DONE') return -1;
      if (statusA === 'DONE' && statusB === 'PENDING') return 1;

      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

  // Active order selection & packing split-view selection
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedOrderForPacking, setSelectedOrderForPacking] = useState<WholesaleOrder | null>(null);

  // Helper to determine item department
  const getItemDepartment = (item: any): 'imitation' | 'cosmetics' | 'hair' | 'other' => {
    const cat = (item.categoryId || item.category || '').toLowerCase();
    if (cat === 'imitation' || cat === 'imitation_jewelry' || cat.includes('imitation')) {
      return 'imitation';
    } else if (cat === 'cosmetics' || cat.includes('cosmetic')) {
      return 'cosmetics';
    } else if (cat === 'hair' || cat === 'hair_accessories' || cat.includes('hair')) {
      return 'hair';
    } else {
      const subName = (item.subCategoryName || item.name || '').toLowerCase();
      if (subName.includes('earring') || subName.includes('jhumka') || subName.includes('jewelry')) {
        return 'imitation';
      } else if (subName.includes('cosmetic') || subName.includes('makeup') || subName.includes('lipstick')) {
        return 'cosmetics';
      } else if (subName.includes('hair') || subName.includes('clip') || subName.includes('band')) {
        return 'hair';
      }
    }
    return 'other';
  };

  // Helper to filter order items based on active category filter
  const getFilteredOrderItems = (order: WholesaleOrder) => {
    const items = order.items || [];
    if (manageCategoryFilter === 'all') return items;
    return items.filter(item => getItemDepartment(item) === manageCategoryFilter);
  };

  // Photo detail modal state
  const [selectedPhotoDetail, setSelectedPhotoDetail] = useState<{
    imageUri: string;
    photoCode: string;
    variant: string;
    quantity: number;
    subCategoryName: string;
  } | null>(null);

  // Quick Message ref & text state
  const msgInputRef = useRef<HTMLInputElement>(null);
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
      const imageUri = 
        item.imageUri || 
        item.imageUrl || 
        item.image || 
        item.photo || 
        (Array.isArray(item.images) && item.images[0]) || 
        '';
      const photoCode = item.photoCode || item.code || item.name || 'SKU';
      const variant = item.variant || item.optionLetter || 'A';
      const quantity = item.quantity || 0;
      const subCategoryName = item.subCategoryName || '';
      let categoryId = item.categoryId || '';
      
      // Normalize category id
      if (categoryId === 'imitation_jewelry') categoryId = 'imitation';
      if (categoryId === 'hair_accessories') categoryId = 'hair';
      
      return { 
        ...item,
        imageUri, 
        imageUrl: imageUri,
        photoCode, 
        variant, 
        quantity, 
        subCategoryName, 
        categoryId 
      };
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

  // Group items by product (key = photoId, fallback photoCode) for display
  const groupedOrderProducts = (() => {
    const map = new Map<string, {
      photoId: string;
      photoCode: string;
      imageUri: string;
      subCategoryName: string;
      variants: { variant: string; quantity: number }[];
      totalPcs: number;
      shadesLine: string;
    }>();

    filteredOrderItems.forEach(item => {
      const key = item.photoId || item.photoCode || 'SKU';
      const variant = item.variant || item.optionLetter || 'A';
      const qty = Number(item.quantity) || 0;

      if (!map.has(key)) {
        map.set(key, {
          photoId: key,
          photoCode: item.photoCode || 'SKU',
          imageUri: item.imageUri || '',
          subCategoryName: item.subCategoryName || '',
          variants: [],
          totalPcs: 0,
          shadesLine: ''
        });
      }

      const group = map.get(key)!;
      group.variants.push({ variant, quantity: qty });
      group.totalPcs += qty;
    });

    return Array.from(map.values()).map(group => {
      const shadesLine = group.variants
        .map(v => `${v.variant}: ${v.quantity}`)
        .join(' · ');
      return {
        ...group,
        shadesLine
      };
    });
  })();

  const designsCount = groupedOrderProducts.length;
  const totalPieces = groupedOrderProducts.reduce((sum, p) => sum + p.totalPcs, 0);

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
    const textVal = (msgText || (msgInputRef.current ? msgInputRef.current.value : '')).trim();
    if (!textVal || !activeOrder) return;
    setMsgText('');
    if (msgInputRef.current) msgInputRef.current.value = '';

    const msgId = generateMessageId();
    const newMsg: ChatMessage = {
      id: msgId,
      messageId: msgId,
      customerId: activeOrder.customerId,
      customerCode: activeOrder.customerId,
      shopName: activeOrder.shopName,
      sender: 'admin',
      type: 'text',
      text: textVal,
      isRead: false,
      isReadByCustomer: false,
      timestamp: Date.now(),
      createdAt: Date.now()
    };

    addMessage(newMsg);
  };

  const handleImageAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeOrder) {
      const msgId = generateMessageId();
      let cloudImageUrl = '';
      try {
        cloudImageUrl = await uploadMediaToStorage(file, 'communication', 'staff_img');
      } catch (err) {
        console.warn('Failed to upload staff image to Cloud Storage:', err);
      }

      const newMsg: ChatMessage = {
        id: msgId,
        messageId: msgId,
        customerId: activeOrder.customerId,
        customerCode: activeOrder.customerId,
        shopName: activeOrder.shopName,
        sender: 'admin',
        type: 'image',
        mediaUrl: cloudImageUrl,
        imageUri: cloudImageUrl,
        imageUrl: cloudImageUrl,
        isRead: false,
        isReadByCustomer: false,
        timestamp: Date.now(),
        createdAt: Date.now()
      };
      addMessage(newMsg);
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

      mediaRecorder.current.onstop = async () => {
        if (audioChunks.current.length === 0 || !activeOrder) return;
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const msgId = generateMessageId();

        let cloudAudioUrl = '';
        try {
          cloudAudioUrl = await uploadMediaToStorage(audioBlob, 'voice_notes', 'staff_voice');
        } catch (err) {
          console.warn('Failed to upload staff voice note to Cloud Storage:', err);
        }

        const newMsg: ChatMessage = {
          id: msgId,
          messageId: msgId,
          customerId: activeOrder.customerId,
          customerCode: activeOrder.customerId,
          shopName: activeOrder.shopName,
          sender: 'admin',
          type: 'voice',
          mediaUrl: cloudAudioUrl,
          audioUri: cloudAudioUrl,
          audioUrl: cloudAudioUrl,
          isRead: false,
          isReadByCustomer: false,
          timestamp: Date.now(),
          createdAt: Date.now()
        };
        addMessage(newMsg);
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
      const presentDepts = getPresentDepartmentsFromItems(order);
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

  // Real-time Department level status update - In Progress
  const handleMarkDepartmentInProgress = async (order: WholesaleOrder, dept: 'imitation' | 'cosmetics' | 'hair') => {
    try {
      const orderRef = doc(db, COLLECTIONS.ORDERS, order.orderId || order.id);
      
      const currentDeptStatus = (order as any).departmentStatus || {};
      const updatedDeptStatus = {
        ...currentDeptStatus,
        [dept]: {
          status: 'In Progress',
          updatedBy: currentCustomer?.ownerName || 'Staff',
          updatedAt: Date.now()
        }
      };

      let updatedImitationStatus = order.imitationStatus || 'PENDING';
      let updatedCosmeticsStatus = order.cosmeticsStatus || 'PENDING';
      let updatedHairStatus = order.hairStatus || 'PENDING';

      if (dept === 'imitation' && updatedImitationStatus !== 'DONE') updatedImitationStatus = 'IN_PROGRESS';
      if (dept === 'cosmetics' && updatedCosmeticsStatus !== 'DONE') updatedCosmeticsStatus = 'IN_PROGRESS';
      if (dept === 'hair' && updatedHairStatus !== 'DONE') updatedHairStatus = 'IN_PROGRESS';

      await updateDoc(orderRef, {
        imitationStatus: updatedImitationStatus,
        cosmeticsStatus: updatedCosmeticsStatus,
        hairStatus: updatedHairStatus,
        departmentStatus: updatedDeptStatus,
        overallStatus: 'IN_PROGRESS',
        status: 'Processing',
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error("Error updating department in progress status:", error);
    }
  };

  const handleMarkInProgressForSelectedOrder = async () => {
    if (!selectedOrderForPacking) return;

    const presentDepts = getPresentDepartmentsFromItems(selectedOrderForPacking);

    if (manageCategoryFilter !== 'all') {
      await handleMarkDepartmentInProgress(selectedOrderForPacking, manageCategoryFilter);
    } else {
      for (const dept of presentDepts) {
        await handleMarkDepartmentInProgress(selectedOrderForPacking, dept);
      }
    }
  };

  // Handler for MARK DONE button in selected order split-view
  const handleMarkDoneForSelectedOrder = async () => {
    if (!selectedOrderForPacking) return;

    const presentDepts = getPresentDepartmentsFromItems(selectedOrderForPacking);

    if (manageCategoryFilter !== 'all') {
      await handleMarkDepartmentDone(selectedOrderForPacking, manageCategoryFilter);
    } else {
      for (const dept of presentDepts) {
        await handleMarkDepartmentDone(selectedOrderForPacking, dept);
      }
    }

    setSelectedOrderForPacking(null);
  };

  return (
    <div className="flex-grow flex flex-col overflow-hidden h-full bg-brand-navy-dark select-none text-slate-100">
      
      {/* SPLIT-VIEW ORDER PACKING SCREEN */}
      {selectedOrderForPacking ? (
        <div className="flex-grow flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-950 text-slate-100 select-none">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedOrderForPacking(null)}
                className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-extrabold px-3.5 py-1.5 rounded-full text-xs uppercase tracking-wider transition cursor-pointer shadow-md"
              >
                &lt; BACK
              </button>
              <span className="text-slate-400 font-extrabold text-xs uppercase tracking-wider">
                MANAGE ORDERS / <span className="text-slate-200">{(selectedOrderForPacking as any).customerName || selectedOrderForPacking.shopName || (selectedOrderForPacking as any).ownerName || 'Customer'}</span>
              </span>
            </div>
            <div className="text-amber-400 text-xs font-black font-mono tracking-wide">
              {(selectedOrderForPacking as any).customerName || selectedOrderForPacking.shopName || (selectedOrderForPacking as any).ownerName || 'Customer'}
            </div>
          </div>

          {/* Two-Column Split Body */}
          <div className="flex flex-row flex-1 overflow-hidden gap-4 p-4">
            {/* Left Column (Product Thumbnails Grid - 65% to 70% Width) */}
            <div className="flex-1 h-full overflow-y-auto pr-2 scrollbar-thin">
              {getFilteredOrderItems(selectedOrderForPacking).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-2">
                  <FolderOpen size={40} className="text-slate-600" />
                  <p className="text-xs font-bold">No items found for this department in this order.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {getFilteredOrderItems(selectedOrderForPacking).map((item: any, idx: number) => {
                    const itemImg = item.imageUrl || item.imageUri || item.photoUrl || item.image || item.photoUri || '';
                    const itemName = item.subCategoryName || item.name || item.photoCode || item.code || `Item #${idx + 1}`;
                    const itemQty = item.quantity || item.qty || 1;

                    return (
                      <div
                        key={idx}
                        className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between relative shadow-md hover:border-slate-700 transition"
                      >
                        {/* Item Image */}
                        <div className="w-full aspect-[4/3] bg-black/40 rounded-lg overflow-hidden flex items-center justify-center mb-2 relative border border-slate-800/60">
                          {itemImg ? (
                            <img src={itemImg} alt={itemName} className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-slate-500 font-mono text-xs">Image Missing</span>
                          )}
                        </div>

                        {/* Title & Pcs Row */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/40">
                          <span className="font-extrabold text-xs text-white line-clamp-1 truncate" title={itemName}>
                            {itemName}
                          </span>
                          <span className="text-amber-400 font-bold text-xs whitespace-nowrap shrink-0">
                            · {itemQty} pcs
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column (Fixed Control Sidebar - 30% to 35% Width) */}
            <div className="w-80 md:w-96 shrink-0 h-full flex flex-col justify-between bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl">
              {/* Top Section (Customer Notes & Voice) */}
              <div className="flex flex-col gap-3">
                {/* NOTE: */}
                <div>
                  <span className="text-xs font-black tracking-wider text-gray-400 uppercase mb-1 block">NOTE:</span>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-gray-200 min-h-[90px] max-h-[140px] overflow-y-auto font-medium leading-relaxed">
                    {(selectedOrderForPacking as any).note || selectedOrderForPacking.notes || (selectedOrderForPacking as any).customerNote || 'No note provided.'}
                  </div>
                </div>

                {/* VOICE NOTE: */}
                <div>
                  <span className="text-xs font-black tracking-wider text-gray-400 uppercase mb-1 block">VOICE NOTE:</span>
                  {selectedOrderForPacking.voiceNoteUrl || (selectedOrderForPacking as any).voiceUrl || (selectedOrderForPacking as any).audioNoteUrl ? (
                    <audio
                      src={selectedOrderForPacking.voiceNoteUrl || (selectedOrderForPacking as any).voiceUrl || (selectedOrderForPacking as any).audioNoteUrl}
                      controls
                      className="w-full h-10 mt-1"
                    />
                  ) : (
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-gray-500 font-semibold text-center">
                      No voice note.
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-800/60 mt-auto">
                <button
                  onClick={handleMarkInProgressForSelectedOrder}
                  className="bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black py-3.5 px-4 rounded-xl text-sm flex-1 shadow-lg shadow-amber-500/20 transition cursor-pointer uppercase tracking-wider text-center"
                >
                  IN PROGRESS
                </button>
                <button
                  onClick={handleMarkDoneForSelectedOrder}
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black py-3.5 px-4 rounded-xl text-sm flex-1 shadow-lg shadow-emerald-600/20 transition cursor-pointer uppercase tracking-wider text-center"
                >
                  DONE
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : workspaceMode === 'manageOrders' ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 p-4 sm:p-6 text-slate-100">
          {/* Combined Header & Modern Horizontal Scrollable Filter Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80 flex-shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-wide">Manage Orders</h2>
            </div>

            {/* Two Dropdown Controls (Pill Style) */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Department Dropdown Pill */}
              <div className="relative inline-flex items-center">
                <select
                  value={manageCategoryFilter}
                  onChange={(e) => setManageCategoryFilter(e.target.value as 'all' | 'cosmetics' | 'imitation' | 'hair')}
                  className="appearance-none bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs rounded-full px-4 py-1.5 pr-8 cursor-pointer shadow-md shadow-amber-500/20 focus:outline-none transition-all duration-200"
                >
                  <option value="all" className="bg-slate-900 text-white font-semibold">All Categories</option>
                  <option value="cosmetics" className="bg-slate-900 text-white font-semibold">Cosmetics</option>
                  <option value="imitation" className="bg-slate-900 text-white font-semibold">Imitation Jewelry</option>
                  <option value="hair" className="bg-slate-900 text-white font-semibold">Hair Accessories</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 text-slate-950 pointer-events-none" />
              </div>

              {/* Status Dropdown Pill */}
              <div className="relative inline-flex items-center">
                <select
                  value={manageStatusFilter}
                  onChange={(e) => setManageStatusFilter(e.target.value as 'all' | 'pending' | 'in_progress' | 'done')}
                  className={`appearance-none font-bold text-xs rounded-full px-4 py-1.5 pr-8 cursor-pointer shadow-md focus:outline-none transition-all duration-200 ${
                    manageStatusFilter === 'pending'
                      ? 'bg-purple-600 text-white shadow-purple-600/30'
                      : manageStatusFilter === 'in_progress'
                      ? 'bg-amber-500 text-slate-950 shadow-amber-500/30'
                      : manageStatusFilter === 'done'
                      ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                      : 'bg-indigo-600 text-white shadow-indigo-600/30'
                  }`}
                >
                  <option value="pending" className="bg-slate-900 text-white font-semibold">Pending</option>
                  <option value="in_progress" className="bg-slate-900 text-white font-semibold">In Progress</option>
                  <option value="done" className="bg-slate-900 text-white font-semibold">Done</option>
                  <option value="all" className="bg-slate-900 text-white font-semibold">All</option>
                </select>
                <ChevronDown size={14} className={`absolute right-2.5 pointer-events-none ${manageStatusFilter === 'in_progress' ? 'text-slate-950' : 'text-white'}`} />
              </div>
            </div>
          </div>

          {/* Scrollable Order Row Cards List */}
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-220px)] pr-1 scrollbar-thin">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
                <div className="w-8 h-8 border-4 border-slate-800 border-t-amber-500 rounded-full animate-spin" />
                <p className="text-xs font-bold text-slate-400">Loading orders...</p>
              </div>
            ) : displayedManageOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
                <FolderOpen size={36} className="text-slate-600" />
                <p className="text-xs font-bold">No orders found matching the selected filters.</p>
              </div>
            ) : (
              displayedManageOrders.map((order) => {
                const presentDepts = getPresentDepartmentsFromItems(order);
                const statusState = getOrderStatusState(order);
                const itemCount = order.totalItemsCount || order.items?.length || 0;
                const city = order.cityName || 'N/A';
                const shopName = order.shopName || 'Unknown Shop';
                const orderNum = order.orderNumber || `#${(order.orderId || order.id || '').substring(0, 6).toUpperCase()}`;

                return (
                  <div
                    key={order.orderId || order.id}
                    onClick={() => {
                      setSelectedOrderId(order.orderId || order.id);
                      setSelectedOrderForPacking(order);
                    }}
                    className="bg-brand-navy-card border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer transition shadow-md group hover:bg-slate-900/60"
                  >
                    {/* Customer/Shop Info */}
                    <div className="flex items-center gap-3 min-w-[240px]">
                      <span className="text-[11px] font-black text-slate-300 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md uppercase tracking-wider">
                        {city}
                      </span>
                      <div>
                        <h4 className="font-extrabold text-sm sm:text-base text-white group-hover:text-amber-400 transition">
                          {shopName}
                        </h4>
                        <div className="text-xs font-semibold text-slate-400 mt-0.5">
                          {orderNum} • {itemCount} items
                        </div>
                      </div>
                    </div>

                    {/* Department Strips */}
                    <div className="flex flex-wrap items-center gap-2">
                      {presentDepts.map((deptKey) => {
                        const deptDone = isDepartmentDone(order, deptKey);
                        const label = deptKey === 'imitation' ? 'Imitation Jewelry' :
                                      deptKey === 'cosmetics' ? 'Cosmetics' : 'Hair Accessories';
                        return (
                          <span
                            key={deptKey}
                            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${
                              deptDone
                                ? 'bg-emerald-600 text-white shadow-sm border border-emerald-500'
                                : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
                            }`}
                          >
                            {deptDone && <CheckCircle size={12} className="text-white" />}
                            {label}
                          </span>
                        );
                      })}
                    </div>

                    {/* Order Status Badge & Chevron */}
                    <div className="flex items-center gap-3 self-end md:self-center">
                      <span
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider ${
                          statusState === 'DONE'
                            ? 'bg-emerald-500 text-slate-950 shadow'
                            : statusState === 'IN_PROGRESS'
                            ? 'bg-amber-500 text-slate-950 font-black shadow animate-pulse'
                            : 'bg-slate-900 border border-slate-800 text-slate-400'
                        }`}
                      >
                        {statusState === 'IN_PROGRESS' ? 'IN PROGRESS' : statusState}
                      </span>
                      <ChevronRight size={18} className="text-slate-600 group-hover:text-amber-400 transition" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : workspaceMode === 'displayOrder' ? (
        <div className="flex-1 overflow-hidden">
          <DisplayOrderManager />
        </div>
      ) : workspaceMode === 'customers' ? (
        <div className="flex-1 overflow-hidden">
          <CustomerManager />
        </div>
      ) : workspaceMode === 'databaseCleaner' ? (
        <div className="flex-1 overflow-hidden">
          <DatabaseCleanManager />
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
          <div className="w-8 h-8 border-4 border-slate-800 border-t-amber-500 rounded-full animate-spin mb-3" />
          <h3 className="font-bold text-base text-slate-300">Loading Orders...</h3>
          <p className="text-xs text-slate-500 mt-1">Synchronizing with Firestore database...</p>
        </div>
      ) : !activeOrder ? (
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWorkspaceMode('manageOrders')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition"
                >
                  ← Back to Orders List
                </button>
                <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Store size={14} className="text-purple-400" />
                  Items to Pack ({designsCount} Designs · {totalPieces} Pcs)
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">Tap photo to verify full resolution</span>
            </div>

            {groupedOrderProducts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-600">
                <FolderOpen size={36} className="text-slate-700 mb-2" />
                <p className="text-xs font-bold">No matching items in this order</p>
                <p className="text-[10px] text-slate-500">This order contains items from other departments only.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 pr-1 scrollbar-thin">
                {groupedOrderProducts.map((item, idx) => (
                  <div 
                    key={idx}
                    className="bg-brand-navy-card border border-slate-800 rounded-xl overflow-hidden flex flex-col hover:border-slate-700 transition"
                  >
                    {/* Item Image (Tap to open full modal) */}
                    <div 
                      onClick={() => setSelectedPhotoDetail({
                        imageUri: item.imageUri,
                        photoCode: item.photoCode,
                        variant: item.shadesLine,
                        quantity: item.totalPcs,
                        subCategoryName: item.subCategoryName
                      })}
                      className="relative aspect-video bg-black cursor-pointer overflow-hidden group border-b border-slate-900"
                    >
                      <img 
                        src={item.imageUri} 
                        alt={item.photoCode} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                      />
                      <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 max-w-[90%]">
                        <span className="text-[9px] font-mono font-bold text-black bg-white px-1.5 py-0.5 rounded shadow w-fit">
                          {item.photoCode}
                        </span>
                        <span className="text-[9px] font-bold text-black bg-brand-gold px-1.5 py-0.5 rounded shadow truncate">
                          {item.shadesLine}
                        </span>
                      </div>
                    </div>

                    {/* Metadata & Pack Count */}
                    <div className="p-2 flex flex-col justify-between flex-1 gap-1">
                      <div className="text-[10px] text-slate-400 truncate leading-tight font-medium">
                        {item.subCategoryName || 'General Item'}
                      </div>
                      <div className="text-[10px] text-amber-200 font-mono font-bold truncate">
                        {item.shadesLine}
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-800/60 pt-1.5">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Total Pcs:</span>
                        <span className="text-xs font-black text-amber-300 font-mono bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/20">
                          {item.totalPcs} pcs
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
                      disabled={deptFilter !== 'all' && deptFilter !== 'imitation'}
                      className={`text-[10px] font-extrabold py-1.5 rounded-lg border text-center transition ${
                        deptFilter === 'all' || deptFilter === 'imitation'
                          ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400/40 cursor-pointer active:scale-95'
                          : 'bg-slate-900/60 text-slate-500 border-slate-800 cursor-not-allowed'
                      }`}
                      title={deptFilter !== 'all' && deptFilter !== 'imitation' ? 'Filter Dept to Imitation to pack' : 'Mark section done'}
                    >
                      Pack Done
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
                      disabled={deptFilter !== 'all' && deptFilter !== 'cosmetics'}
                      className={`text-[10px] font-extrabold py-1.5 rounded-lg border text-center transition ${
                        deptFilter === 'all' || deptFilter === 'cosmetics'
                          ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400/40 cursor-pointer active:scale-95'
                          : 'bg-slate-900/60 text-slate-500 border-slate-800 cursor-not-allowed'
                      }`}
                      title={deptFilter !== 'all' && deptFilter !== 'cosmetics' ? 'Filter Dept to Cosmetics to pack' : 'Mark section done'}
                    >
                      Pack Done
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
                      disabled={deptFilter !== 'all' && deptFilter !== 'hair'}
                      className={`text-[10px] font-extrabold py-1.5 rounded-lg border text-center transition ${
                        deptFilter === 'all' || deptFilter === 'hair'
                          ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400/40 cursor-pointer active:scale-95'
                          : 'bg-slate-900/60 text-slate-500 border-slate-800 cursor-not-allowed'
                      }`}
                      title={deptFilter !== 'all' && deptFilter !== 'hair' ? 'Filter Dept to Hair Acc to pack' : 'Mark section done'}
                    >
                      Pack Done
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
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="max-w-full rounded mb-1 max-h-40 object-cover" 
                            />
                          )}
                          {msg.type === 'voice' && (msg.mediaUrl || msg.audioUri) && (
                            <AudioMessagePlayer src={msg.mediaUrl || msg.audioUri || ''} isMe={isMe} />
                          )}
                          {msg.text && (
                            <p dir="ltr" className="leading-relaxed break-words text-left" style={{ direction: 'ltr', textAlign: 'left' }}>
                              <span>{msg.text}</span>
                            </p>
                          )}
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
                  ref={msgInputRef}
                  type="text"
                  placeholder="Type packing query or update..."
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  dir="ltr"
                  style={{ direction: 'ltr', textAlign: 'left' }}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition text-left"
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
