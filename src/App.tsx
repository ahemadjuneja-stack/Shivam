import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Home } from './pages/Home';
import { CategoryGallery } from './pages/CategoryGallery';
import { SubCategoryGallery } from './pages/SubCategoryGallery';
import { Cart } from './pages/Cart';
import { Register } from './pages/Register';
import { useAppStore } from './store';
import { 
  ShoppingBag, 
  UserCircle, 
  X, 
  Trash2, 
  Send, 
  CheckCircle2,
  Minus,
  Plus,
  Mic,
  Square,
  MessageCircle,
  Edit3,
  UserPlus,
  Store,
  ClipboardList
} from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { doc, setDoc, updateDoc, getDoc, getDocs, collection, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS, messaging, deleteCustomerWithCascade } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { ChatModal } from './components/ChatModal';
import { StaffOrderManagement } from './components/StaffOrderManagement';
import { useFirebaseSync } from './useFirebaseSync';
import { Customer, ChatMessage } from './types';

function VoiceRecorder() {
  const { orderVoiceNote, setOrderVoiceNote, setIsRecordingVoice, setStopVoiceRecordingFn } = useAppStore();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setStopVoiceRecordingFn(() => {
      stopRecording();
    });
    return () => {
      setStopVoiceRecordingFn(null);
    };
  }, []);

  const startRecording = async () => {
    setMicNotice(null);
    setOrderVoiceNote(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicNotice("Microphone recording is not supported in this browser. Please use text notes.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        if (audioChunks.current.length > 0) {
          const recMime = mediaRecorder.current?.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunks.current, { type: recMime });
          if (audioBlob.size > 0) {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
              setOrderVoiceNote(reader.result as string);
              setIsRecordingVoice(false);
            };
          } else {
            setOrderVoiceNote(null);
            setIsRecordingVoice(false);
          }
        } else {
          setOrderVoiceNote(null);
          setIsRecordingVoice(false);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setIsRecordingVoice(true);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 119) { // 2 minutes max
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setIsRecordingVoice(false);
      if (err?.name === 'NotFoundError' || err?.message?.includes('Requested device not found') || err?.message?.includes('not found')) {
        setMicNotice("No microphone found on this device. You can type instructions in the Order Note box above.");
      } else if (err?.name === 'NotAllowedError' || err?.message?.includes('sandboxed') || err?.message?.includes('Permission denied') || err?.name === 'SecurityError') {
        setMicNotice("Microphone access is blocked. Please allow mic permission in your browser or type in Order Note.");
      } else {
        setMicNotice("Microphone unavailable. Please write instructions in the Order Note box above.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const deleteRecording = () => {
    setOrderVoiceNote(null);
    setRecordingTime(0);
  };

  if (orderVoiceNote) {
    return (
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 p-2 rounded-lg mt-1">
        <audio controls src={orderVoiceNote} className="h-8 flex-1 max-w-[200px]" />
        <button 
          onClick={deleteRecording} 
          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-1">
      <div className="flex items-center gap-2">
        {isRecording ? (
          <button
            onClick={stopRecording}
            className="flex-1 flex items-center justify-center gap-2 bg-red-500/20 text-red-400 border border-red-500/30 p-2 rounded-lg font-bold text-xs animate-pulse"
          >
            <Square size={14} fill="currentColor" />
            <span>Stop ({Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}/2:00)</span>
          </button>
        ) : (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-lg text-xs font-bold transition border border-slate-700"
          >
            <Mic size={14} />
            <span>Add Voice Note (Max 2m)</span>
          </button>
        )}
      </div>
      {micNotice && (
        <div className="text-[11px] text-amber-300/90 bg-amber-950/40 border border-amber-500/30 px-2.5 py-1.5 rounded-lg leading-tight">
          {micNotice}
        </div>
      )}
    </div>
  );
}

async function reverseGeocode(latitude: number, longitude: number) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'ShivamApp/1.0'
      }
    });
    if (res.ok) {
      const data = await res.json();
      const address = data.address || {};
      const city = address.city || address.town || address.village || address.suburb || '';
      const taluka = address.county || address.state_district || address.city_district || '';
      return { city, taluka };
    }
  } catch (e) {
    console.error('Reverse geocode error:', e);
  }
  return { city: '', taluka: '' };
}

function AppShell({ children }: { children: React.ReactNode }) {
  // Activate real-time multi-device cloud synchronization via Firebase Firestore
  useFirebaseSync();

  const cart = useAppStore(state => state.cart);
  const removeFromCart = useAppStore(state => state.removeFromCart);
  const updateCartItemQuantity = useAppStore(state => state.updateCartItemQuantity);
  const placeOrder = useAppStore(state => state.placeOrder);
  
  const currentCustomer = useAppStore(state => state.currentCustomer);
  const customers = useAppStore(state => state.customers);
  const setCurrentCustomer = useAppStore(state => state.setCurrentCustomer);
  const addCustomer = useAppStore(state => state.addCustomer);
  const updateCustomer = useAppStore(state => state.updateCustomer);
  const deleteCustomer = useAppStore(state => state.deleteCustomer);
  
  const isCartOpen = useAppStore(state => state.isCartOpen);
  const setIsCartOpen = useAppStore(state => state.setIsCartOpen);
  const showroomScreenMode = useAppStore(state => state.showroomScreenMode);
  
  const orderNote = useAppStore(state => state.orderNote);
  const setOrderNote = useAppStore(state => state.setOrderNote);

  const messages = useAppStore(state => state.messages);
  const broadcastMessages = useAppStore(state => state.broadcastMessages);
  const markMessagesAsRead = useAppStore(state => state.markMessagesAsRead);

  const currentCustId = currentCustomer?.customerId || currentCustomer?.customerCode || 'CUST-GENERAL';
  
  // Real-time unread count: admin messages for this specific customer + unread broadcasts
  const unreadAdminCount = messages.filter(m => {
    const isThisCustomer = (currentCustomer?.customerId && (m.customerId === currentCustomer.customerId || m.customerCode === currentCustomer.customerId)) ||
      (currentCustomer?.customerCode && (m.customerId === currentCustomer.customerCode || m.customerCode === currentCustomer.customerCode)) ||
      (m.customerId === currentCustId || m.customerCode === currentCustId);
    return isThisCustomer && m.sender === 'admin' && !m.isRead;
  }).length;

  const unreadBroadcastCount = (broadcastMessages || []).filter(b => !b.isReadByCustomer).length;
  const totalUnreadCount = unreadAdminCount + unreadBroadcastCount;

  const [showLogin, setShowLogin] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isStaffOrderManagementActive, setIsStaffOrderManagementActive] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authViewMode, setAuthViewMode] = useState<'login' | 'register'>('login');
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);
  const [fcmAlert, setFcmAlert] = useState<{ title: string; body: string } | null>(null);
  const [networkOnline, setNetworkOnline] = useState(typeof window !== 'undefined' ? window.navigator.onLine : true);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const categories = useAppStore(state => state.categories);
  const [isInitializing, setIsInitializing] = useState(true);

  const isApprovedStatus = (status?: string) => {
    const s = (status || '').toLowerCase().trim();
    return s === 'approved' || s === 'verified';
  };

  const customerDocUnsubRef = useRef<(() => void) | null>(null);

  const subscribeCustomerDoc = useCallback((docId: string) => {
    if (customerDocUnsubRef.current) {
      customerDocUnsubRef.current();
      customerDocUnsubRef.current = null;
    }
    if (!docId) return;

    try {
      const custRef = doc(db, 'customers', docId);
      customerDocUnsubRef.current = onSnapshot(
        custRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as any;
            const updatedCust: Customer = {
              id: snapshot.id,
              customerId: data.customerId || data.customerCode || snapshot.id,
              customerCode: data.customerCode || data.customerId || snapshot.id,
              shopName: data.shopName || '',
              ownerName: data.ownerName || data.contactPerson || '',
              phone: data.phone || data.mobileNumber || '',
              city: data.city || data.cityName || '',
              address: data.address || '',
              contactPerson: data.ownerName || data.contactPerson || '',
              mobileNumber: data.phone || data.mobileNumber || '',
              cityName: data.city || data.cityName || '',
              createdAt: data.createdAt || 0,
              pin: data.pin || '1111',
              status: data.status || 'Approved',
              role: data.role || 'User',
              allowedCategoryIds: data.allowedCategoryIds || ['all'],
              allowedSubCategoryIds: data.allowedSubCategoryIds || ['all'],
              isOnline: data.isOnline || false,
              lastActive: data.lastActive || null,
              location: data.location || null
            };
            setCurrentCustomer(updatedCust);
          }
        },
        (err) => {
          console.warn('[CustomerDoc] Listener error:', err);
        }
      );
    } catch (err) {
      console.warn('[CustomerDoc] Failed to subscribe:', err);
    }
  }, [setCurrentCustomer]);

  useEffect(() => {
    if (currentCustomer && !customerDocUnsubRef.current) {
      const docId = currentCustomer.id || currentCustomer.customerId || currentCustomer.customerCode;
      if (docId) {
        subscribeCustomerDoc(docId);
      }
    }
    return () => {
      if (customerDocUnsubRef.current) {
        customerDocUnsubRef.current();
        customerDocUnsubRef.current = null;
      }
    };
  }, [currentCustomer?.id, currentCustomer?.customerId, currentCustomer?.customerCode, subscribeCustomerDoc]);

  useEffect(() => {
    const custId = currentCustomer?.customerId || currentCustomer?.customerCode;
    if (!custId) return;

    let cancelled = false;
    const normalizeMsg = (id: string, data: any): ChatMessage => {
      const img = data.mediaUrl || data.imageUri || data.imageUrl || data.image || '';
      const audio = data.audioUri || data.audioUrl || data.mediaUrl || '';
      let created = 0;
      const rawTime = data.createdAt ?? data.timestamp ?? 0;
      if (typeof rawTime === 'number') created = rawTime;
      else if (rawTime && typeof rawTime.toMillis === 'function') created = rawTime.toMillis();
      else if (typeof rawTime === 'string') created = new Date(rawTime).getTime() || 0;
      const text = data.text || data.message || data.content || '';
      let type = (data.type || '').toLowerCase();
      if (type !== 'image' && type !== 'voice' && type !== 'text') {
        type = img ? 'image' : (audio && !img ? 'voice' : 'text');
      }
      return {
        id, messageId: id,
        customerId: data.customerId || data.customerCode || id,
        customerCode: data.customerCode || data.customerId || id,
        shopName: data.shopName || '',
        sender: data.sender || 'customer',
        type, text,
        mediaUrl: type === 'image' ? img : (type === 'voice' ? audio : ''),
        imageUri: type === 'image' ? img : undefined,
        imageUrl: type === 'image' ? img : undefined,
        audioUri: type === 'voice' ? audio : undefined,
        isRead: !!data.isRead,
        createdAt: created,
      } as ChatMessage;
    };

    const mergeAndSet = (a: any[], b: any[]) => {
      if (cancelled) return;
      const map = new Map<string, ChatMessage>();
      [...a, ...b].forEach(d => {
        const m = normalizeMsg(d.id, d.data());
        if (m.id) {
          map.set(m.id, m); // Firestore doc id dedupes customerId/customerCode overlap
        }
      });
      const sorted = Array.from(map.values())
        .filter(m => m.customerCode === custId || m.customerId === custId)
        .sort((x, y) => (x.createdAt || 0) - (y.createdAt || 0));
      // Merge with locally-echoed messages not yet in Firestore (dedupe by id/messageId)
      const local = useAppStore.getState().messages;
      const fireIds = new Set(sorted.map(m => m.id || m.messageId || '').filter(Boolean));
      const extra = local.filter(m => !fireIds.has(m.id || '') && !fireIds.has(m.messageId || ''));
      useAppStore.getState().setMessages([...sorted, ...extra]);
    };

    const col = collection(db, 'chat_messages');
    const q1 = query(col, where('customerId', '==', custId));
    const q2 = query(col, where('customerCode', '==', custId));
    let snapA: any[] = []; let snapB: any[] = [];
    const unsub1 = onSnapshot(q1, (s) => { snapA = s.docs; mergeAndSet(snapA, snapB); }, 
      (err) => console.warn('[ChatSync] q1 error:', err));
    const unsub2 = onSnapshot(q2, (s) => { snapB = s.docs; mergeAndSet(snapA, snapB); }, 
      (err) => console.warn('[ChatSync] q2 error:', err));

    return () => { cancelled = true; unsub1(); unsub2(); };
  }, [currentCustomer?.customerId, currentCustomer?.customerCode]);

  const handleLogoutOrSwitch = useCallback(() => {
    if (customerDocUnsubRef.current) {
      customerDocUnsubRef.current();
      customerDocUnsubRef.current = null;
    }
    setCurrentCustomer(null);
    useAppStore.getState().setMessages([]);
    try {
      const raw = localStorage.getItem('shivam-wholesale-session-v9');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.state) {
          parsed.state.currentCustomer = null;
          parsed.state.messages = [];
          localStorage.setItem('shivam-wholesale-session-v9', JSON.stringify(parsed));
        }
      }
    } catch (e) {
      console.warn('[handleLogoutOrSwitch] localStorage clear error:', e);
    }
    setFormData(initialRegistrationFormData);
    setLoginId('');
    setLoginPin('');
    setAuthError(null);
    setAuthViewMode('login');
    setModalMode('login');
    setShowLogin(false);
  }, [setCurrentCustomer]);

  useEffect(() => {
    if (categories.length > 0) {
      const timer = setTimeout(() => {
        setIsInitializing(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [categories.length]);

  useEffect(() => {
    const handleOnline = () => setNetworkOnline(true);
    const handleOffline = () => setNetworkOnline(false);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  // Firebase Cloud Messaging Push Notification Activation & Foreground Message Handler
  useEffect(() => {
    if (!messaging || !currentCustomer) return;

    // 1. FCM Push Token Registration (Only for Shivam Staff)
    if (currentCustomer.role === 'Shivam Staff') {
      const registerFCM = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const VAPID_KEY = "BLnLJ6x7M5Or12uYfBnMZrQ8bFIq0XR3CKGRyc2VDwfewVpUs8UXMBJzuO5cx7ssa-jFGEXXgGHXH2xR9d_EnE4";
            const token = await getToken(messaging, { vapidKey: VAPID_KEY });
            if (token) {
              console.log('FCM Device Token obtained:', token);
              const customerId = currentCustomer.customerId || currentCustomer.customerCode;
              if (customerId) {
                const custRef = doc(db, COLLECTIONS.CUSTOMERS, customerId);
                await updateDoc(custRef, {
                  fcmToken: token,
                  lastTokenUpdate: serverTimestamp()
                });
                console.log('FCM token stored in Firestore for customer:', customerId);
              }
            }
          }
        } catch (err) {
          console.warn('FCM registration or database sync failed:', err);
        }
      };

      registerFCM();
    }

    // 2. Foreground Message Listener & Beep Chime Ringtone Handler
    const playAlertChime = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playTone = (freq: number, start: number, duration: number) => {
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);
          gainNode.gain.setValueAtTime(0.15, start);
          gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          osc.start(start);
          osc.stop(start + duration);
        };
        const now = audioCtx.currentTime;
        playTone(523.25, now, 0.2); // C5
        playTone(659.25, now + 0.15, 0.35); // E5
      } catch (err) {
        console.warn('Web Audio API notification chime error:', err);
      }
    };

    const unsubscribeOnMessage = onMessage(messaging, (payload) => {
      console.log('FCM Foreground message received in-app:', payload);
      
      const staffDept = (currentCustomer.department || '').toLowerCase();
      const msgDept = (payload.data?.department || payload.data?.category || '').toLowerCase();

      // Alert if matching the staff's department/category duty or if general/broadcast
      if (!msgDept || !staffDept || msgDept === staffDept || msgDept === 'all') {
        playAlertChime();
        setFcmAlert({
          title: payload.notification?.title || payload.data?.title || '🚨 New Order Received!',
          body: payload.notification?.body || payload.data?.body || 'New wholesale order pending verification.'
        });
      }
    });

    return () => {
      if (unsubscribeOnMessage) {
        unsubscribeOnMessage();
      }
    };
  }, [currentCustomer]);

  // Profile Edit / Register Form states
  const initialRegistrationFormData = {
    shopName: '',
    ownerName: '',
    mobileNumber: '',
    city: '',
    address: '',
    pin: '',
    phone: ''
  };

  const [modalMode, setModalMode] = useState<'view' | 'login' | 'register' | 'edit'>('login');
  const [formData, setFormData] = useState(initialRegistrationFormData);

  // Real-time tracking and presence heartbeat for verified customers
  useEffect(() => {
    if (!currentCustomer || currentCustomer.status === 'Pending') return;
    
    const custId = currentCustomer.customerId || currentCustomer.customerCode;
    if (!custId) return;

    // Set online: true, lastActive: serverTimestamp()
    const setOnlineStatus = async (online: boolean) => {
      try {
        const custRef = doc(db, COLLECTIONS.CUSTOMERS, custId);
        await updateDoc(custRef, {
          isOnline: online,
          lastActive: serverTimestamp()
        });
      } catch (err) {
        console.error("Error setting online status:", err);
      }
    };

    // Immediate heartbeat on mount
    setOnlineStatus(true);

    // Update lastActive every 60 seconds
    const heartbeatInterval = setInterval(() => {
      setOnlineStatus(true);
    }, 60000);

    // Track on visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setOnlineStatus(true);
      } else {
        setOnlineStatus(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic GPS tracking
    const trackLocation = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const { city, taluka } = await reverseGeocode(latitude, longitude);
          try {
            const custRef = doc(db, COLLECTIONS.CUSTOMERS, custId);
            await updateDoc(custRef, {
              location: {
                city,
                taluka,
                latitude,
                longitude,
                timestamp: Date.now()
              },
              lastActive: serverTimestamp()
            });
          } catch (err) {
            console.error("Error updating location:", err);
          }
        },
        (err) => {
          console.warn("Location permission or tracking failed:", err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    // Initial GPS poll
    trackLocation();

    // Refresh every 5 minutes (5 * 60 * 1000 ms)
    const locationInterval = setInterval(trackLocation, 300000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(locationInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Attempt to clean up and set offline
      setOnlineStatus(false);
    };
  }, [currentCustomer?.customerId, currentCustomer?.status]);

  useEffect(() => {
    if (!currentCustomer || currentCustomer.role !== 'Shivam Staff') {
      setIsStaffOrderManagementActive(false);
    }
  }, [currentCustomer]);

  const openProfileModal = () => {
    if (currentCustomer) {
      setModalMode('view');
      setFormData({
        shopName: currentCustomer.shopName || '',
        ownerName: currentCustomer.ownerName || currentCustomer.contactPerson || '',
        phone: currentCustomer.phone || currentCustomer.mobileNumber || '',
        mobileNumber: currentCustomer.mobileNumber || currentCustomer.phone || '',
        city: currentCustomer.city || currentCustomer.cityName || '',
        address: currentCustomer.address || '',
        pin: currentCustomer.pin || ''
      });
    } else {
      setModalMode('login');
      setFormData(initialRegistrationFormData);
    }
    setShowLogin(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawId = loginId.trim();
    if (!rawId) {
      setAuthError('Please enter your Customer User ID.');
      return;
    }

    const isModalLogin = showLogin;
    const pin = loginPin.trim();
    if (!isModalLogin && !pin) {
      setAuthError('Please enter your Security PIN.');
      return;
    }

    setAuthError(null);
    setIsLoggingIn(true);

    try {
      // CHANGE A: Robust Firestore lookup directly in Firestore
      // 1. Try getDoc(doc(db, 'customers', enteredId.trim()))
      // 2. ALSO run getDocs on query(collection(db,'customers'), where('customerId','==',id)) and where('customerCode','==',id)
      // 3. Merge all results. If ANY doc matches -> login succeeds using that doc's data.
      let matchedDocSnap: any = null;

      // 1. Direct document ID lookup
      try {
        const directDoc = await getDoc(doc(db, 'customers', rawId));
        if (directDoc.exists()) {
          matchedDocSnap = directDoc;
        }
      } catch (err) {
        console.warn('[handleLogin] Direct doc lookup failed:', err);
      }

      // 2. Query customerId == rawId
      if (!matchedDocSnap) {
        try {
          const qId = query(collection(db, 'customers'), where('customerId', '==', rawId));
          const snapId = await getDocs(qId);
          if (!snapId.empty) {
            matchedDocSnap = snapId.docs[0];
          }
        } catch (err) {
          console.warn('[handleLogin] customerId query failed:', err);
        }
      }

      // 3. Query customerCode == rawId
      if (!matchedDocSnap) {
        try {
          const qCode = query(collection(db, 'customers'), where('customerCode', '==', rawId));
          const snapCode = await getDocs(qCode);
          if (!snapCode.empty) {
            matchedDocSnap = snapCode.docs[0];
          }
        } catch (err) {
          console.warn('[handleLogin] customerCode query failed:', err);
        }
      }

      // 4. Case-insensitive uppercase / lowercase fallback check if different from rawId
      if (!matchedDocSnap && rawId.toUpperCase() !== rawId) {
        const upper = rawId.toUpperCase();
        try {
          const directUpper = await getDoc(doc(db, 'customers', upper));
          if (directUpper.exists()) {
            matchedDocSnap = directUpper;
          } else {
            const qIdUpper = query(collection(db, 'customers'), where('customerId', '==', upper));
            const snapIdUpper = await getDocs(qIdUpper);
            if (!snapIdUpper.empty) {
              matchedDocSnap = snapIdUpper.docs[0];
            } else {
              const qCodeUpper = query(collection(db, 'customers'), where('customerCode', '==', upper));
              const snapCodeUpper = await getDocs(qCodeUpper);
              if (!snapCodeUpper.empty) {
                matchedDocSnap = snapCodeUpper.docs[0];
              }
            }
          }
        } catch (err) {
          console.warn('[handleLogin] Case insensitive lookup failed:', err);
        }
      }

      // 5. Offline fallback check from local store customers
      if (!matchedDocSnap) {
        const localMatch = customers.find(c => 
          c?.customerId?.toLowerCase() === rawId.toLowerCase() || 
          c?.customerCode?.toLowerCase() === rawId.toLowerCase() ||
          c?.id?.toLowerCase() === rawId.toLowerCase()
        );
        if (localMatch) {
          if (pin) {
            const expectedPin = localMatch.pin || '1111';
            if (expectedPin !== pin) {
              setAuthError('Invalid Security PIN. Default PIN is 1111.');
              return;
            }
          }

          if (!isApprovedStatus(localMatch.status)) {
            setAuthError('Aapka account approval ke liye pending hai');
            return;
          }

          setCurrentCustomer(localMatch);
          subscribeCustomerDoc(localMatch.id || localMatch.customerId || localMatch.customerCode);
          setAuthError(null);
          setLoginId('');
          setLoginPin('');
          setShowLogin(false);
          return;
        }
      }

      if (!matchedDocSnap || !matchedDocSnap.exists()) {
        setAuthError('Customer User ID not found. Register your shop below.');
        return;
      }

      const customerData = matchedDocSnap.data() as any;
      const docId = matchedDocSnap.id;

      // Validate PIN if provided
      if (pin) {
        const expectedPin = customerData.pin || '1111';
        if (expectedPin !== pin) {
          setAuthError('Invalid Security PIN. Default PIN is 1111.');
          return;
        }
      }

      // CHANGE B: Status normalization
      // Accept customers whose status is any of: 'Approved', 'approved', 'VERIFIED', 'Verified', 'verified'
      // If status is 'PENDING' (or missing): show "Aapka account approval ke liye pending hai"
      // Do not require isVerified === true if status is VERIFIED/Approved.
      if (!isApprovedStatus(customerData.status)) {
        setAuthError('Aapka account approval ke liye pending hai');
        return;
      }

      const cust: Customer = {
        id: docId,
        customerId: customerData.customerId || customerData.customerCode || docId,
        customerCode: customerData.customerCode || customerData.customerId || docId,
        shopName: customerData.shopName || '',
        ownerName: customerData.ownerName || customerData.contactPerson || '',
        phone: customerData.phone || customerData.mobileNumber || '',
        city: customerData.city || customerData.cityName || '',
        address: customerData.address || '',
        contactPerson: customerData.ownerName || customerData.contactPerson || '',
        mobileNumber: customerData.phone || customerData.mobileNumber || '',
        cityName: customerData.city || customerData.cityName || '',
        createdAt: customerData.createdAt || 0,
        pin: customerData.pin || '1111',
        status: customerData.status || 'Approved',
        role: customerData.role || 'User',
        allowedCategoryIds: customerData.allowedCategoryIds || ['all'],
        allowedSubCategoryIds: customerData.allowedSubCategoryIds || ['all'],
        isOnline: customerData.isOnline || false,
        lastActive: customerData.lastActive || null,
        location: customerData.location || null
      };

      setCurrentCustomer(cust);
      subscribeCustomerDoc(docId); // CHANGE C: re-subscribe with correct Firestore doc ID
      setAuthError(null);
      setLoginId('');
      setLoginPin('');
      setShowLogin(false);
    } catch (err: any) {
      // CHANGE D: Error visibility
      console.error('[handleLogin] Firestore lookup failed:', err);
      setAuthError('Login nahi ho paya — internet check karo');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneVal = formData.mobileNumber?.trim() || formData.phone?.trim() || '';
    const shopName = formData.shopName.trim();
    const ownerName = formData.ownerName.trim();
    const city = formData.city.trim();
    const address = formData.address.trim();
    const pin = formData.pin?.trim() || '1111';

    if (!shopName || !ownerName || !phoneVal || !city || !address) {
      setAuthError("Please fill in all fields");
      return;
    }

    setIsRegistering(true);

    try {
      const newCustomerId = `CUST-${Math.floor(100000 + Math.random() * 900000)}`;

      const customerFirestorePayload = {
        id: newCustomerId,
        customerId: newCustomerId,
        customerCode: newCustomerId,
        shopName,
        ownerName,
        contactPerson: ownerName,
        phone: phoneVal,
        mobileNumber: phoneVal,
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

      const sanitizedCustomer = JSON.parse(JSON.stringify(customerFirestorePayload));

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 30000)
      );

      await Promise.race([
        setDoc(doc(db, 'customers', newCustomerId), sanitizedCustomer),
        timeoutPromise
      ]);

      const newCust: Customer = {
        id: newCustomerId,
        customerId: newCustomerId,
        customerCode: newCustomerId,
        shopName,
        ownerName,
        contactPerson: ownerName,
        phone: phoneVal,
        mobileNumber: phoneVal,
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

      addCustomer(newCust);
      setCurrentCustomer(newCust);
      setAuthError(null);
      setFormData(initialRegistrationFormData);
      setShowLogin(false);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg === "Timeout") {
        setAuthError("Server is slow. Your registration may have been saved, please check before trying again.");
      } else {
        setAuthError("Registration failed: " + msg);
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer) return;

    const phoneVal = formData.mobileNumber?.trim() || formData.phone?.trim() || '';
    const custId = currentCustomer.customerId || currentCustomer.customerCode;
    const updatedData: Partial<Customer> = {
      shopName: formData.shopName.trim(),
      ownerName: formData.ownerName.trim(),
      phone: phoneVal,
      city: formData.city.trim(),
      address: formData.address.trim(),
      contactPerson: formData.ownerName.trim(),
      mobileNumber: phoneVal,
      cityName: formData.city.trim(),
      pin: formData.pin?.trim() || currentCustomer.pin || '1111'
    };

    updateCustomer(custId, updatedData);
    setModalMode('view');
    alert('Shop Profile updated successfully!');
  };

  if (isInitializing) {
    return (
      <div className="fixed inset-0 w-full h-full bg-[#0b0f19] flex flex-col items-center justify-center p-6 z-[9999] transition-opacity duration-500 ease-out">
        <style>{`
          @keyframes wavePulse {
            0%, 100% {
              opacity: 0.45;
              transform: scale(0.93);
              border-color: rgba(212, 163, 89, 0.2);
              background-color: rgba(212, 163, 89, 0.02);
            }
            50% {
              opacity: 1;
              transform: scale(1.07);
              border-color: rgba(212, 163, 89, 0.8);
              background-color: rgba(212, 163, 89, 0.15);
            }
          }
          .animate-wave-1 { animation: wavePulse 1.8s infinite ease-in-out; }
          .animate-wave-2 { animation: wavePulse 1.8s infinite ease-in-out; animation-delay: 0.3s; }
          .animate-wave-3 { animation: wavePulse 1.8s infinite ease-in-out; animation-delay: 0.6s; }
        `}</style>
        
        <div className="text-center space-y-10 max-w-sm flex flex-col items-center">
          {/* Brand Typography Hierarchy */}
          <div className="flex flex-col items-center">
            {/* TOP: Stylish capital letter "S" */}
            <div className="text-8xl sm:text-9xl font-serif font-black text-brand-gold select-none leading-none mb-1 tracking-normal animate-pulse">
              S
            </div>
            
            {/* MIDDLE: "SHIVAM" */}
            <h1 className="text-2xl sm:text-3xl font-black tracking-[0.3em] text-white select-none uppercase">
              SHIVAM
            </h1>
            
            {/* BOTTOM: "EVERYTHING AT ONCE" */}
            <p className="text-[10px] sm:text-[11px] font-bold text-brand-gold tracking-[0.35em] uppercase mt-2.5 opacity-95 select-none">
              EVERYTHING AT ONCE
            </p>
          </div>

          {/* Sequential Wave Category Icons */}
          <div className="flex items-center justify-center gap-6 pt-2">
            {/* 1. Cosmetics */}
            <div className="flex flex-col items-center gap-2">
              <div className="animate-wave-1 w-12 h-12 rounded-full border border-brand-gold/30 bg-brand-gold/5 flex items-center justify-center text-brand-gold transition-all duration-300">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="8" y="12" width="8" height="10" rx="1.5" />
                  <path d="M10 12V6.5l4-2.5v8" fill="currentColor" fillOpacity="0.15" />
                  <line x1="8" y1="16" x2="16" y2="16" />
                </svg>
              </div>
              <span className="text-[10px] font-semibold tracking-wide text-slate-400 select-none">Cosmetics</span>
            </div>

            {/* 2. Imitations */}
            <div className="flex flex-col items-center gap-2">
              <div className="animate-wave-2 w-12 h-12 rounded-full border border-brand-gold/30 bg-brand-gold/5 flex items-center justify-center text-brand-gold transition-all duration-300">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3 3h-6z" fill="currentColor" fillOpacity="0.2" />
                  <circle cx="12" cy="13" r="6" />
                  <path d="M9 5c0 0 3 2 3 2s3-2 3-2" />
                </svg>
              </div>
              <span className="text-[10px] font-semibold tracking-wide text-slate-400 select-none">Imitations</span>
            </div>

            {/* 3. Hair Accessories */}
            <div className="flex flex-col items-center gap-2">
              <div className="animate-wave-3 w-12 h-12 rounded-full border border-brand-gold/30 bg-brand-gold/5 flex items-center justify-center text-brand-gold transition-all duration-300">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 12L5.5 8.8C4.4 8.2 3.5 8.9 3.5 10.1v3.8c0 1.2.9 1.9 2 1.3L11 12z" />
                  <path d="M13 12l5.5-3.2c1.1-.6 2 .1 2 1.3v3.8c0 1.2-.9 1.9-2 1.3L13 12z" />
                  <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
                </svg>
              </div>
              <span className="text-[10px] font-semibold tracking-wide text-slate-400 select-none whitespace-nowrap">Hair Accessories</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCustomer) {
    return (
      <div className="fixed inset-0 w-full h-full bg-brand-navy-dark text-slate-100 font-sans antialiased overflow-y-auto flex flex-col justify-center items-center p-4 z-[999]">
        <div className="w-full max-w-md bg-brand-navy-card border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 my-auto">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-gold/10 text-brand-gold border border-brand-gold/20 mb-2">
              <Store size={32} />
            </div>
            <h1 className="text-2xl font-black tracking-wide text-white">SHIVAM</h1>
            <p className="text-brand-gold font-bold tracking-widest text-xs uppercase">
              Everything at once
            </p>
          </div>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs font-semibold leading-relaxed">
              {authError}
            </div>
          )}

          {authViewMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Side-by-Side Credentials Row */}
              <div className="flex flex-row gap-3">
                <div className="flex-1 space-y-1.5 min-w-0">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">User ID</label>
                  <input
                    type="text"
                    placeholder="User ID"
                    value={loginId}
                    onChange={(e) => {
                      setLoginId(e.target.value);
                      setAuthError(null);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-gold transition uppercase font-mono"
                    required
                  />
                </div>

                <div className="flex-1 space-y-1.5 min-w-0">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                    value={loginPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setLoginPin(val);
                      setAuthError(null);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-gold transition font-mono text-center tracking-widest"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-brand-gold hover:bg-brand-gold/90 text-black font-black text-sm py-3.5 rounded-xl shadow-md transition-all duration-200 active:scale-[0.98] mt-2"
              >
                Sign In
              </button>

              {/* New Registration converted to a clean secondary styled action button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(initialRegistrationFormData);
                    setAuthViewMode('register');
                    setAuthError(null);
                  }}
                  className="w-full bg-transparent border border-slate-700 hover:border-slate-600 hover:bg-slate-800/40 text-brand-gold-light font-black text-xs py-3.5 rounded-xl transition-all duration-200 uppercase tracking-wider"
                >
                  Register New Shop
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Shop Name</label>
                <input
                  type="text"
                  placeholder="e.g., Rajesh Cosmetics"
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-gold transition"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Owner Full Name</label>
                <input
                  type="text"
                  placeholder="e.g., Rajesh Kumar"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-gold transition"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Mobile Number</label>
                <input
                  type="tel"
                  placeholder="e.g., 9876543210"
                  value={formData.mobileNumber || formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value, phone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-gold transition font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">City</label>
                <input
                  type="text"
                  placeholder="e.g., Ahmedabad"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-gold transition"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Complete Address</label>
                <textarea
                  placeholder="e.g., Shop No. 12, Market Yard"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-gold transition resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full bg-brand-gold hover:bg-brand-gold/90 text-black font-black text-sm py-3.5 rounded-xl shadow-md transition-all duration-200 active:scale-[0.98] mt-2 disabled:opacity-50"
              >
                {isRegistering ? 'Submitting Registration...' : 'Submit Registration'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(initialRegistrationFormData);
                    setAuthViewMode('login');
                    setAuthError(null);
                  }}
                  className="text-xs font-bold text-brand-gold-light hover:underline"
                >
                  Already Registered? Login here
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (currentCustomer && !isApprovedStatus(currentCustomer.status)) {
    return (
      <div className="fixed inset-0 w-full h-full bg-brand-navy-dark text-slate-100 font-sans antialiased flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-brand-navy-card border border-red-500/30 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 mb-2 animate-pulse">
            <Store size={32} />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white">Registration Pending Approval</h2>
            <p className="text-red-400 font-bold text-sm bg-red-950/20 border border-red-500/25 py-2.5 px-4 rounded-xl leading-relaxed">
              Aapka account approval ke liye pending hai
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-left space-y-1.5 text-xs text-slate-300">
            <p className="font-bold text-white border-b border-slate-800 pb-1.5">Registration Details:</p>
            <p><span className="text-slate-400">Shop Name:</span> {currentCustomer.shopName}</p>
            <p><span className="text-slate-400">Owner Name:</span> {currentCustomer.ownerName}</p>
            <p><span className="text-slate-400">City:</span> {currentCustomer.city}</p>
          </div>

          <button
            onClick={handleLogoutOrSwitch}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2.5 rounded-xl transition border border-slate-700"
          >
            Switch Shop / Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-brand-navy-dark text-slate-100 font-sans antialiased overflow-hidden select-none pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] flex items-center justify-center">
      {/* MOBILE SHOWROOM CONTAINER */}
      <div 
        className="relative bg-brand-navy-dark overflow-hidden flex flex-col transition-all duration-300 shadow-2xl w-full h-full"
      >
        
        {/* APP ACTION BAR (Shown on Home only, hidden in subcategories) */}
        {showroomScreenMode === 'home' && (
          <header className="bg-brand-navy-card/95 backdrop-blur-md border-b border-brand-navy-border px-3 py-1.5 flex items-center justify-between gap-3 flex-shrink-0 z-20">
            {/* Brand Logo & Name */}
            <Link to="/" className="flex items-center gap-2 group">
              <img src="/icon.svg" alt="SHIVAM" className="w-7 h-7 rounded-lg shadow-md group-hover:scale-105 transition-transform" />
              <h1 className="text-sm font-black tracking-wider text-white">SHIVAM</h1>
            </Link>

            {/* Right Header Utilities: Cloud Sync Status, Communicate, Customer ID, Order Slip Button */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              
              {/* Network Status Indicator Badge */}
              <div 
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                  networkOnline 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-amber-500/15 text-amber-500 border-amber-500/40 animate-pulse'
                }`}
                title={networkOnline ? 'Online - Live Database Sync Active' : 'Offline Mode (Changes saved locally)'}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${networkOnline ? 'bg-emerald-400' : 'bg-amber-500 animate-ping'}`} />
                <span className="font-sans font-black tracking-wider uppercase text-[9px]">
                  {networkOnline ? 'Online' : 'Offline Mode'}
                </span>
                {!networkOnline && (
                  <span className="hidden sm:inline text-[9px] font-medium text-amber-400 ml-1">
                    (Changes saved locally)
                  </span>
                )}
              </div>

              {/* Community Hub Button with Real-Time Unread Count Badge */}
              <button
                onClick={() => {
                  setIsChatOpen(true);
                  markMessagesAsRead();
                }}
                className="relative flex items-center gap-1.5 bg-brand-gold/10 border border-brand-gold/50 hover:bg-brand-gold hover:text-black text-brand-gold px-2.5 py-1 rounded-lg text-[11px] transition font-bold shadow-sm"
                title="Community Hub & WhatsApp Support Chat"
              >
                <div className="relative flex items-center justify-center">
                  <MessageCircle size={14} />
                  {totalUnreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[16px] h-4 px-1 bg-[#25d366] text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center border border-black shadow">
                      {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                    </span>
                  )}
                </div>
                <span className="hidden xs:inline">Community Hub</span>
              </button>

              {/* Order Management Toggle Button (Shivam Staff only) */}
              {currentCustomer?.role === 'Shivam Staff' && (
                <button
                  onClick={() => setIsStaffOrderManagementActive(!isStaffOrderManagementActive)}
                  className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition font-bold shadow-sm border ${
                    isStaffOrderManagementActive 
                      ? 'bg-purple-600 text-white border-purple-500' 
                      : 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-600 hover:text-white text-purple-400 animate-pulse'
                  }`}
                  title="Order Management Packing Workspace"
                >
                  <ClipboardList size={14} />
                  <span className="hidden xs:inline">Order Packing</span>
                </button>
              )}

              {/* Customer Switcher / Profile */}
              <button 
                onClick={openProfileModal}
                className="flex items-center gap-1 bg-slate-900 border border-slate-700 hover:border-brand-gold px-2.5 py-1 rounded-lg text-[11px] transition"
              >
                <UserCircle size={14} className="text-brand-gold" />
                {currentCustomer ? (
                  <span className="font-bold text-brand-gold-light truncate max-w-[90px]">
                    {currentCustomer.shopName || currentCustomer.customerId}
                  </span>
                ) : (
                  <span className="font-bold text-white">Login</span>
                )}
              </button>

              {/* Top Order Slip / Cart Button */}
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center justify-center bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black w-7 h-7 rounded-lg transition shadow-md active:scale-95"
              >
                <ShoppingBag size={16} />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center border border-black shadow">
                    {cart.length}
                  </span>
                )}
              </button>
            </div>
          </header>
        )}

        {/* MAIN SHOWROOM CONTENT AREA */}
        <main className="flex-1 w-full p-2 overflow-hidden flex flex-col">
          {isStaffOrderManagementActive ? (
            <StaffOrderManagement />
          ) : (
            children
          )}
        </main>



        {/* ANDROID BOTTOM GESTURE PILL BAR */}
        <div className="h-3 bg-brand-navy-dark flex items-center justify-center flex-shrink-0 z-20">
          <div className="w-20 h-1 bg-slate-700 rounded-full" />
        </div>

      </div>

      {/* Full-Screen Cart / Order Slip */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col landscape:flex-row animate-fadeIn overflow-hidden">
          
          {/* Main Area: Scrollable Large Images (Left in landscape, Top in portrait) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin flex flex-col h-full bg-slate-950">
            <div className="flex items-center gap-3 mb-2 flex-shrink-0">
               <button 
                onClick={() => setIsCartOpen(false)}
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 border border-slate-700 transition"
              >
                <X size={24} />
              </button>
              <h3 className="font-black text-xl text-white flex items-center gap-2">
                <ShoppingBag className="text-brand-gold" size={24} /> 
                Wholesale Order Slip
              </h3>
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
                <ShoppingBag size={48} className="mx-auto text-slate-600 mb-4" />
                <p className="font-bold text-lg text-slate-300">Your order slip is empty</p>
                <p className="text-sm text-slate-500 mt-2">Select items from the showroom to build your order.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-[env(safe-area-inset-bottom)]">
                {cart.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="bg-brand-navy-card border border-brand-navy-border p-3 rounded-2xl flex flex-col gap-3 shadow-lg"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-800">
                      <img 
                        src={item.imageUri} 
                        alt={item.photoCode} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-black bg-white px-2 py-0.5 rounded shadow">
                          {item.photoCode}
                        </span>
                        <span className="font-black text-sm text-black bg-brand-gold px-2 py-0.5 rounded shadow">
                          Option {item.optionLetter}
                        </span>
                      </div>
                      <button 
                        onClick={() => removeFromCart(idx)}
                        className="absolute top-2 right-2 p-2 bg-black/60 text-slate-300 hover:text-red-400 hover:bg-red-500/20 backdrop-blur-md rounded-lg transition"
                        title="Remove Item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Big Finger-Friendly Stepper in Cart */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl overflow-hidden p-1 flex-1">
                        <button
                          onClick={() => {
                            const minQty = item.defaultQuantity || 1;
                            const target = item.quantity <= minQty ? 0 : item.quantity - minQty;
                            updateCartItemQuantity(idx, target);
                          }}
                          className="flex-1 py-3 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 active:scale-95 rounded-lg transition"
                        >
                          <Minus size={20} strokeWidth={2.5} />
                        </button>
                        <span className="w-16 text-center font-mono font-black text-lg text-amber-300 select-none">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => {
                            const minQty = item.defaultQuantity || 1;
                            const target = item.quantity + minQty;
                            updateCartItemQuantity(idx, target);
                          }}
                          className="flex-1 py-3 flex items-center justify-center bg-amber-500 hover:bg-amber-400 text-black active:scale-95 rounded-lg transition font-black"
                        >
                          <Plus size={20} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right/Bottom Side Panel: Customer, Notes, and Dispatch */}
          <div className="w-full landscape:w-[350px] md:landscape:w-[400px] bg-slate-900 border-t landscape:border-t-0 landscape:border-l border-slate-800 flex flex-col shadow-2xl flex-shrink-0 h-auto landscape:h-full z-10 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            
            {/* Customer info preview inside cart */}
            <div className="p-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Ordering as:</div>
                <div className="font-black text-white text-xs">
                  {currentCustomer ? `${currentCustomer.shopName} (${currentCustomer.customerId || currentCustomer.customerCode})` : 'Not logged in'}
                </div>
              </div>
              <button
                onClick={() => {
                  openProfileModal();
                }}
                className="text-xs text-amber-400 hover:underline font-bold"
              >
                {currentCustomer ? 'Change' : 'Login'}
              </button>
            </div>

            {/* Notes Section - Can expand flex-1 in landscape */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Order Note</label>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Type any specific instructions for this order here..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-gold min-h-[80px] landscape:min-h-[120px] resize-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Voice Recording</label>
                <VoiceRecorder />
              </div>
            </div>

            {/* Submit Order Bottom Box */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex-shrink-0">
              <div className="flex gap-2">
                <button 
                  disabled={cart.length === 0 || isDispatching}
                  onClick={async () => {
                    console.log("Start: Place Order");
                    if (!currentCustomer) {
                      openProfileModal();
                      console.log("End: Place Order");
                      return;
                    }

                    setIsDispatching(true);

                    try {
                      const { isRecordingVoice, stopVoiceRecordingFn } = useAppStore.getState();
                      if (isRecordingVoice && stopVoiceRecordingFn) {
                        stopVoiceRecordingFn();
                        // Wait up to 3s for the recording's onstop to populate orderVoiceNote
                        for (let i = 0; i < 30; i++) {
                          await new Promise(r => setTimeout(r, 100));
                          if (useAppStore.getState().orderVoiceNote) break;
                        }
                        if (!useAppStore.getState().orderVoiceNote) {
                          console.warn('[Dispatch] Voice note not ready in time — sending order without it');
                        }
                      }

                      const success = await placeOrder();
                      if (success) {
                        setIsCartOpen(false);
                        setOrderSuccessMsg('Order dispatched and saved to database successfully!');
                        setTimeout(() => setOrderSuccessMsg(null), 5000);
                      }
                    } catch (err: any) {
                      console.error('Order dispatch error:', err);
                    } finally {
                      setIsDispatching(false);
                      console.log("End: Place Order");
                    }
                  }}
                  className="flex-1 py-4 px-4 rounded-xl font-black text-base bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  <Send size={18} className={isDispatching ? 'animate-spin' : ''} />
                  <span>{isDispatching ? 'Dispatching to Server...' : 'Dispatch Order'}</span>
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}

      {/* Customer Login / Profile / Register Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-brand-navy-card border border-brand-navy-border rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3 flex-shrink-0">
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Store className="text-brand-gold" size={20} />
                {modalMode === 'view' && 'Customer Shop Profile'}
                {modalMode === 'login' && 'Select / Login Customer'}
                {modalMode === 'register' && 'Register New Shop'}
                {modalMode === 'edit' && 'Edit Shop Profile'}
              </h2>
              <button onClick={() => setShowLogin(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 scrollbar-thin">
              
              {/* MODE 1: VIEW LOGGED-IN CUSTOMER PROFILE */}
              {modalMode === 'view' && currentCustomer && (
                <div className="space-y-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm space-y-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500">Shop Name</label>
                      <div className="font-bold text-white text-base">{currentCustomer.shopName}</div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500">Owner Name</label>
                      <div className="font-medium text-slate-200">{currentCustomer.ownerName || currentCustomer.contactPerson}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500">Phone</label>
                        <div className="font-medium text-slate-200">{currentCustomer.phone || currentCustomer.mobileNumber || 'N/A'}</div>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500">Customer ID</label>
                        <div className="font-mono font-bold text-brand-gold bg-black/40 px-2 py-0.5 rounded border border-slate-800 inline-block">
                          {currentCustomer.customerId || currentCustomer.customerCode}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500">City & Address</label>
                      <div className="font-medium text-slate-300">
                        {currentCustomer.city || currentCustomer.cityName}
                        {currentCustomer.address ? ` • ${currentCustomer.address}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button
                      onClick={() => {
                        setFormData({
                          shopName: currentCustomer.shopName || '',
                          ownerName: currentCustomer.ownerName || currentCustomer.contactPerson || '',
                          phone: currentCustomer.phone || currentCustomer.mobileNumber || '',
                          mobileNumber: currentCustomer.mobileNumber || currentCustomer.phone || '',
                          city: currentCustomer.city || currentCustomer.cityName || '',
                          address: currentCustomer.address || '',
                          pin: currentCustomer.pin || ''
                        });
                        setModalMode('edit');
                      }}
                      className="px-4 py-2 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
                    >
                      <Edit3 size={14} />
                      <span>Edit Details</span>
                    </button>

                    <div className="flex gap-2">
                      <button 
                        onClick={handleLogoutOrSwitch}
                        className="px-4 py-2 rounded-xl font-bold text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition"
                      >
                        Switch / Logout
                      </button>
                      <button 
                        onClick={() => setShowLogin(false)} 
                        className="px-4 py-2 rounded-xl font-bold text-xs bg-amber-500 text-black hover:bg-amber-400 transition"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 2: EDIT PROFILE */}
              {modalMode === 'edit' && (
                <form onSubmit={handleUpdateProfile} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Shop Name *</label>
                    <input
                      type="text"
                      value={formData.shopName}
                      onChange={e => setFormData({ ...formData, shopName: e.target.value })}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Owner Name *</label>
                    <input
                      type="text"
                      value={formData.ownerName}
                      onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">Phone *</label>
                      <input
                        type="tel"
                        value={formData.mobileNumber || formData.phone || ''}
                        onChange={e => setFormData({ ...formData, mobileNumber: e.target.value, phone: e.target.value })}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">City *</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Address / Landmark</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(initialRegistrationFormData);
                        setModalMode('view');
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xs transition"
                    >
                      Save
                    </button>
                  </div>
                </form>
              )}

              {/* MODE 3: LOGIN / QUICK SELECT */}
              {modalMode === 'login' && (
                <div className="space-y-4">
                  
                  {/* Quick Select */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Registered Shops:
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(initialRegistrationFormData);
                          setModalMode('register');
                        }}
                        className="text-amber-400 hover:underline text-xs font-bold flex items-center gap-1"
                      >
                        <UserPlus size={13} />
                        <span>+ Register New Shop</span>
                      </button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                      {customers.map(c => {
                        const cid = c.customerId || c.customerCode;
                        return (
                          <div
                            key={cid}
                            className="w-full p-2.5 rounded-xl border flex items-center justify-between transition bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-200 gap-2"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                if (!isApprovedStatus(c.status)) {
                                  setAuthError('Aapka account approval ke liye pending hai');
                                  return;
                                }
                                setCurrentCustomer(c);
                                subscribeCustomerDoc(c.id || c.customerId || c.customerCode);
                                setShowLogin(false);
                              }}
                              className="flex-1 text-left"
                            >
                              <div className="font-bold text-xs text-white">{c.shopName}</div>
                              <div className="text-[11px] text-slate-400">
                                {c.ownerName || c.contactPerson} • {c.city || c.cityName}
                              </div>
                            </button>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="font-mono text-xs font-bold text-brand-gold bg-black/40 px-2 py-0.5 rounded">
                                {cid}
                              </span>
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const confirmed = window.confirm(
                                    `Are you sure you want to permanently delete customer "${c.shopName}" (${cid})?\n\nThis will permanently delete all linked orders, carts, chat messages, and audio notes.`
                                  );
                                  if (!confirmed) return;
                                  try {
                                    await deleteCustomerWithCascade(cid);
                                    deleteCustomer(cid);
                                    if (currentCustomer && (currentCustomer.customerId === cid || currentCustomer.customerCode === cid || currentCustomer.id === cid)) {
                                      handleLogoutOrSwitch();
                                    }
                                  } catch (err) {
                                    console.error('Error deleting customer:', err);
                                  }
                                }}
                                className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                                title="Permanently delete customer & cascade-delete all data"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="relative my-3">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-800" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-500">
                      <span className="bg-brand-navy-card px-2">Or enter ID manually</span>
                    </div>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-3">
                    {authError && (
                      <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs font-semibold leading-relaxed">
                        {authError}
                      </div>
                    )}
                    <div>
                      <input
                        type="text"
                        placeholder="Enter Customer Code / ID (e.g. CUST-101)"
                        value={loginId}
                        onChange={e => {
                          setLoginId(e.target.value);
                          setAuthError(null);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-brand-gold text-sm"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowLogin(false);
                          setAuthError(null);
                        }} 
                        className="px-4 py-2 rounded-xl font-bold text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        disabled={isLoggingIn}
                        className="px-5 py-2 rounded-xl font-black text-xs bg-brand-gold text-black hover:bg-brand-gold-light transition disabled:opacity-50"
                      >
                        {isLoggingIn ? 'Logging in...' : 'Login Shop'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* MODE 4: REGISTER NEW CUSTOMER SHOP */}
              {modalMode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-xs text-amber-300 mb-2">
                    Create your wholesale account to place direct orders and access the community feed.
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Shop / Business Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Cosmetics & Jewelry"
                      value={formData.shopName}
                      onChange={e => setFormData({ ...formData, shopName: e.target.value })}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Owner / Contact Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Kumar"
                      value={formData.ownerName}
                      onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">Phone / Mobile *</label>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={formData.mobileNumber || formData.phone || ''}
                        onChange={e => setFormData({ ...formData, mobileNumber: e.target.value, phone: e.target.value })}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">City / Market *</label>
                      <input
                        type="text"
                        placeholder="e.g. Ahmedabad"
                        value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Shop Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Market Yard, Shop #12"
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(initialRegistrationFormData);
                        setModalMode('login');
                      }}
                      className="text-xs font-bold text-slate-400 hover:text-white"
                    >
                      Back to Login
                    </button>
                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xs transition disabled:opacity-50"
                    >
                      {isRegistering ? 'Registering...' : 'Register & Connect'}
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Order Success Toast Notification */}
      {orderSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-[120] bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400/30 animate-slideUp">
          <CheckCircle2 size={22} className="text-white" />
          <div>
            <div className="font-black text-sm">Order Placed Successfully!</div>
            <div className="text-xs text-emerald-100">{orderSuccessMsg}</div>
          </div>
        </div>
      )}

      {/* Interactive Foreground Push Notification Banner */}
      {fcmAlert && (
        <div 
          onClick={() => {
            setIsStaffOrderManagementActive(true);
            setFcmAlert(null);
          }}
          className="fixed top-4 left-4 right-4 md:left-auto md:w-96 md:right-4 z-[150] bg-gradient-to-r from-purple-700 to-indigo-800 text-white p-4 rounded-2xl shadow-2xl border border-purple-500/30 flex items-start gap-3 cursor-pointer hover:scale-[1.02] transition duration-300 animate-slideDown"
        >
          <div className="bg-white/10 p-2 rounded-xl text-brand-gold flex items-center justify-center">
            <ClipboardList size={20} />
          </div>
          <div className="flex-1">
            <h4 className="font-black text-xs text-brand-gold flex items-center gap-1.5">
              {fcmAlert.title}
            </h4>
            <p className="text-[11px] text-slate-100 font-bold leading-snug mt-0.5">
              {fcmAlert.body}
            </p>
            <span className="text-[10px] text-purple-300 font-bold underline mt-1 block">
              Tap to open Order Management
            </span>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setFcmAlert(null);
            }} 
            className="text-slate-300 hover:text-white p-1 self-start"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* CHAT & COMMUNITY MODAL */}
      <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/category/:id" element={<CategoryGallery />} />
          <Route path="/subcategory/:id" element={<SubCategoryGallery />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
