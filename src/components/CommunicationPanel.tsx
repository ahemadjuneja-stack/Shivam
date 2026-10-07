import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '../store';
import { 
  X, 
  Search, 
  Image as ImageIcon, 
  Send, 
  MessageSquare, 
  Megaphone, 
  Download, 
  CheckCheck,
  Radio,
  Mic,
  Trash2,
  MessageCircle,
  Package,
  Check,
  Volume2
} from 'lucide-react';
import { ChatMessage, Customer } from '../types';
import { 
  syncChatMessageToFirebase, 
  markMessagesAsReadInFirebase,
  sendBroadcastMessageToFirebase 
} from '../services/firebaseSync';
import { uploadDashboardMedia } from '../services/storageService';
import { AudioPlayer } from './AudioPlayer';
import { CommonLoader } from './CommonLoader';

interface CommunicationPanelProps {
  onClose: () => void;
  initialCustomerCode?: string | null;
  onFilterShopOrders?: (shopName: string) => void;
}

const isAudioUrl = (url: string): boolean => {
  if (!url) return false;
  return /\.(webm|mp3|ogg|m4a|wav)(\?|$)/i.test(url) || url.includes('voice') || url.startsWith('data:audio');
};

const isRawMediaUrl = (text?: string, mediaUrl?: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.startsWith('http') && trimmed.includes('firebasestorage')) return true;
  if (mediaUrl && trimmed === mediaUrl.trim()) return true;
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
  if (trimmed.includes(' ')) return false;
  return /\.(jpeg|jpg|png|webp|gif|webm|mp3|ogg|m4a|wav)(\?|$)/i.test(trimmed) ||
         ((trimmed.includes('firebasestorage.googleapis.com') || trimmed.includes('storage.googleapis.com')) &&
          /\.(jpeg|jpg|png|webp|gif|webm|mp3|ogg|m4a|wav)/i.test(trimmed));
};

const downloadImageToGallery = async (url: string, timestamp?: number) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `shivam_chat_${timestamp || Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } catch (err) {
    console.error('Failed to download image:', err);
    window.open(url, '_blank');
  }
};

const compressDashboardImage = async (file: File, maxWidth: number = 1280, quality: number = 0.8): Promise<File | Blob> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      // Export toDataURL('image/jpeg', 0.8) and convert to Blob
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const byteString = atob(dataUrl.split(',')[1]);
      const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });

      const kb = Math.round(blob.size / 1024);
      console.log(`[DashImage] compressed to ${kb} KB`);

      const baseName = file.name ? file.name.replace(/\.[^/.]+$/, "") : "image";
      const compressedFile = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
      resolve(compressedFile);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
};

const getDateKey = (timestamp: number): string => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const getDateSeparatorLabel = (timestamp: number): string => {
  if (!timestamp) return 'Today';
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const CommunicationPanel: React.FC<CommunicationPanelProps> = ({ 
  onClose,
  initialCustomerCode = null,
  onFilterShopOrders
}) => {
  const { customers, chatMessages, sendMessage, markMessagesAsRead, customersLoaded, chatLoaded } = useAppStore();
  
  // Active selected thread
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(initialCustomerCode);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'unread' | 'broadcasts'>('all');
  
  // Message composition state
  const [messageText, setMessageText] = useState('');
  const [attachedImageUrl, setAttachedImageUrl] = useState<string | null>(null);
  
  // Voice Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Broadcast Modal State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastImageUrl, setBroadcastImageUrl] = useState<string | null>(null);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [broadcastSuccessNotice, setBroadcastSuccessNotice] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const broadcastFileInputRef = useRef<HTMLInputElement>(null);
  const prevSelectedCustomerIdRef = useRef<string | null>(null);
  const prevActiveMsgCountRef = useRef<number>(0);

  // 1. Group direct messages by customer ID/Code
  const messagesByCustomer = useMemo(() => {
    const map: Record<string, ChatMessage[]> = {};
    (chatMessages || []).forEach(msg => {
      const code = msg.customerCode || msg.customerId || 'UNKNOWN';
      if (!map[code]) map[code] = [];
      map[code].push(msg);
    });
    // Sort each customer's messages chronologically
    Object.keys(map).forEach(k => {
      map[k].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    });
    return map;
  }, [chatMessages]);

  // 2. Build complete list of Customer Chat Threads
  const chatThreads = useMemo(() => {
    const threadMap = new Map<string, {
      customerCode: string;
      customer?: Customer;
      shopName: string;
      cityName: string;
      mobileNumber: string;
      contactPerson: string;
      lastMessage?: ChatMessage;
      unreadCount: number;
      lastTimestamp: number;
      hasBroadcast: boolean;
    }>();

    // Add registered customers
    (customers || []).forEach(c => {
      threadMap.set(c.customerCode, {
        customerCode: c.customerCode,
        customer: c,
        shopName: c.shopName || `Shop ${c.customerCode}`,
        cityName: c.cityName || '',
        mobileNumber: c.mobileNumber || '',
        contactPerson: c.contactPerson || '',
        unreadCount: 0,
        lastTimestamp: 0,
        hasBroadcast: false
      });
    });

    // Process messages into thread metadata ONLY for existing registered customers
    Object.entries(messagesByCustomer).forEach(([cCode, msgs]) => {
      const customerExists = (customers || []).some(c => c.customerCode === cCode);
      if (!customerExists) return;

      const existing = threadMap.get(cCode);
      if (!existing) return;

      const lastMsg = msgs[msgs.length - 1];
      const unread = msgs.filter(m => {
        const sender = String(m.sender || '').toUpperCase();
        return sender === 'CUSTOMER' && !m.isRead;
      }).length;

      const hasBcast = msgs.some(m => m.isBroadcast === true);

      threadMap.set(cCode, {
        ...existing,
        lastMessage: lastMsg,
        unreadCount: unread,
        lastTimestamp: lastMsg ? (lastMsg.timestamp || 0) : 0,
        hasBroadcast: hasBcast
      });
    });

    const threads = Array.from(threadMap.values()).filter(t => 
      (customers || []).some(c => c.customerCode === t.customerCode)
    );

    // Sort: newest messages first
    threads.sort((a, b) => {
      if (a.lastTimestamp > 0 && b.lastTimestamp > 0) {
        return b.lastTimestamp - a.lastTimestamp;
      }
      if (a.lastTimestamp > 0) return -1;
      if (b.lastTimestamp > 0) return 1;
      return a.shopName.localeCompare(b.shopName);
    });

    return threads;
  }, [customers, messagesByCustomer]);

  // 3. Filtered Threads based on search and active tab
  const filteredThreads = useMemo(() => {
    let list = chatThreads;

    if (activeFilterTab === 'unread') {
      list = list.filter(t => t.unreadCount > 0);
    } else if (activeFilterTab === 'broadcasts') {
      list = list.filter(t => t.hasBroadcast);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => 
        t.shopName.toLowerCase().includes(q) ||
        t.customerCode.toLowerCase().includes(q) ||
        t.cityName.toLowerCase().includes(q) ||
        t.mobileNumber.toLowerCase().includes(q) ||
        t.contactPerson.toLowerCase().includes(q) ||
        (t.lastMessage && (t.lastMessage.text || t.lastMessage.content || '').toLowerCase().includes(q))
      );
    }

    return list;
  }, [chatThreads, activeFilterTab, searchQuery]);

  // Total unread count across all threads
  const totalUnreadCount = useMemo(() => {
    return chatThreads.reduce((sum, t) => sum + t.unreadCount, 0);
  }, [chatThreads]);

  // Active Chat details
  const activeThread = useMemo(() => {
    if (!selectedCustomerId) return null;
    return chatThreads.find(t => t.customerCode === selectedCustomerId) || null;
  }, [chatThreads, selectedCustomerId]);

  const activeChatMessages = useMemo(() => {
    if (!selectedCustomerId) return [];
    return messagesByCustomer[selectedCustomerId] || [];
  }, [messagesByCustomer, selectedCustomerId]);

  // Auto-select first thread if none selected on desktop
  useEffect(() => {
    if (!selectedCustomerId && chatThreads.length > 0 && window.innerWidth >= 768) {
      const firstUnread = chatThreads.find(t => t.unreadCount > 0);
      setSelectedCustomerId(firstUnread ? firstUnread.customerCode : chatThreads[0].customerCode);
    }
  }, [chatThreads.length]);

  // Mark messages as read in store & Firebase when thread is opened
  useEffect(() => {
    if (selectedCustomerId) {
      markMessagesAsRead(selectedCustomerId);
      markMessagesAsReadInFirebase(selectedCustomerId);
    }
  }, [selectedCustomerId, markMessagesAsRead]);

  // Auto-scroll chat to bottom on thread open (auto) and on new message (smooth)
  useEffect(() => {
    if (!selectedCustomerId) {
      prevSelectedCustomerIdRef.current = null;
      prevActiveMsgCountRef.current = 0;
      return;
    }

    const isThreadOpen = prevSelectedCustomerIdRef.current !== selectedCustomerId;
    const isNewMessage = !isThreadOpen && activeChatMessages.length > prevActiveMsgCountRef.current;

    prevSelectedCustomerIdRef.current = selectedCustomerId;
    prevActiveMsgCountRef.current = activeChatMessages.length;

    const timer = setTimeout(() => {
      if (isThreadOpen) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      } else if (isNewMessage) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }, 40);

    return () => clearTimeout(timer);
  }, [selectedCustomerId, activeChatMessages.length]);

  // Handle Send 1-on-1 Message from Admin
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedCustomerId) return;
    
    const textTrimmed = messageText.trim();
    if (!textTrimmed && !attachedImageUrl && !recordedAudioUrl) return;

    let msgType: 'TEXT' | 'IMAGE' | 'VOICE' = 'TEXT';
    let mediaUrl = '';
    
    if (recordedAudioUrl) {
      msgType = 'VOICE';
      mediaUrl = recordedAudioUrl;
    } else if (attachedImageUrl) {
      msgType = 'IMAGE';
      mediaUrl = attachedImageUrl;
    }

    const newMsg: ChatMessage = {
      id: `msg-admin-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customerCode: selectedCustomerId,
      customerId: selectedCustomerId,
      sender: 'ADMIN',
      type: msgType,
      text: textTrimmed, // ONLY typed caption, never the media URL
      content: textTrimmed, // ONLY typed caption, never the media URL
      mediaUrl: mediaUrl,
      imageUrl: msgType === 'IMAGE' ? mediaUrl : undefined,
      voiceNoteUrl: msgType === 'VOICE' ? mediaUrl : undefined,
      timestamp: Date.now(),
      isRead: true,
      isBroadcast: false
    };

    console.log('[AdminChat] Final message object sent (text = caption only):', newMsg);

    sendMessage(newMsg);
    syncChatMessageToFirebase(newMsg);

    setMessageText('');
    setAttachedImageUrl(null);
    setRecordedAudioUrl(null);
  };

  // Image File Picker Handler (with canvas compression: max 1280px, quality 0.8)
  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressDashboardImage(file, 1280, 0.8);
      const cloudUrl = await uploadDashboardMedia(compressed, 'communication', selectedCustomerId || 'admin_dispatch');
      setAttachedImageUrl(cloudUrl);
    } catch (err) {
      console.error('Failed to upload attachment to Firebase Storage:', err);
      alert('Failed to upload image file to Cloud Storage.');
    } finally {
      e.target.value = '';
    }
  };

  // Broadcast Image File Picker Handler (with canvas compression: max 1280px, quality 0.8)
  const handleBroadcastImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressDashboardImage(file, 1280, 0.8);
      const cloudUrl = await uploadDashboardMedia(compressed, 'broadcasts', 'broadcast');
      setBroadcastImageUrl(cloudUrl);
    } catch (err) {
      console.error('Failed to upload broadcast image to Firebase Storage:', err);
      alert('Failed to upload broadcast image to Cloud Storage.');
    } finally {
      e.target.value = '';
    }
  };

  // Voice Note Recording Management
  const startVoiceRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Microphone access is not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        try {
          const cloudUrl = await uploadDashboardMedia(audioBlob, 'communication', `voice_admin_${selectedCustomerId || 'general'}`);
          setRecordedAudioUrl(cloudUrl);
        } catch (uploadErr) {
          console.error('Failed to upload admin voice note to Cloud Storage:', uploadErr);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecordingVoice(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting audio recording:', err);
      alert('Could not access microphone. Please grant permission.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecordingVoice(false);
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecordingVoice(false);
    setRecordedAudioUrl(null);
    setRecordingDuration(0);
  };

  // Send Broadcast to All Customers
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim() && !broadcastImageUrl) return;

    setIsSendingBroadcast(true);
    try {
      await sendBroadcastMessageToFirebase({
        title: broadcastTitle.trim() || 'Store Announcement',
        text: broadcastText.trim(),
        imageUrl: broadcastImageUrl || undefined,
        type: broadcastImageUrl ? 'IMAGE' : 'TEXT'
      });

      setBroadcastSuccessNotice(true);
      setTimeout(() => {
        setBroadcastSuccessNotice(false);
        setShowBroadcastModal(false);
        setBroadcastText('');
        setBroadcastTitle('');
        setBroadcastImageUrl(null);
      }, 1500);

    } catch (err) {
      console.error('Failed to send broadcast:', err);
      alert('Error broadcasting message to customers. Please check connection.');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col h-full w-full bg-[#111b21] overflow-hidden select-none animate-in fade-in duration-150 text-[#e9edef] font-sans"
    >
      
      {/* Hidden File Inputs */}
      <input 
        type="file" 
        ref={chatFileInputRef} 
        onChange={handleImageFileSelect} 
        accept="image/*" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={broadcastFileInputRef} 
        onChange={handleBroadcastImageSelect} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Main WhatsApp Web Style Full-Screen Layout */}
      <div className="w-full h-full flex flex-1 overflow-hidden relative bg-[#111b21]">
        
        {/* ================================================================= */}
        {/* LEFT SIDEBAR: CHAT THREADS & CUSTOMER DIRECTORY (WhatsApp Web Style) */}
        {/* ================================================================= */}
        <div className={`w-full md:w-80 lg:w-[380px] flex-shrink-0 bg-[#111b21] border-r border-[#222e35] flex flex-col ${selectedCustomerId ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Top Header with Profile & Broadcast Button */}
          <div className="p-3 bg-[#202c33] border-b border-[#222e35] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00a884]/20 border border-[#00a884]/40 flex items-center justify-center text-[#00a884] font-black shadow-sm">
                <MessageCircle size={22} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-[#e9edef] tracking-wide">Chat Box</span>
                  <span className="w-2 h-2 rounded-full bg-[#00a884] animate-pulse" title="Live & Connected" />
                </div>
                <span className="text-[11px] text-[#8696a0] block font-medium">Customer Chat Desk</span>
              </div>
            </div>

            {/* Quick Actions in Header (No BrandLogo) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBroadcastModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-[#111b21] hover:bg-[#2a3942] border border-[#222e35] text-amber-400 font-bold text-[11px] flex items-center gap-1.5 transition active:scale-95"
                title="Send Broadcast Announcement to all mobile users"
              >
                <Megaphone size={13} className="text-amber-400" />
                <span className="hidden sm:inline">Broadcast</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-[#aebac1] hover:text-white hover:bg-[#2a3942] rounded-lg transition"
                title="Close Chat Box"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-3 bg-[#111b21] border-b border-[#222e35]">
            <div className="relative flex items-center bg-[#202c33] border border-[#222e35] rounded-lg px-3 py-1.5 focus-within:border-[#00a884] transition">
              <Search size={14} className="text-[#8696a0] mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search shop, phone, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-[#d1d7db] placeholder-[#8696a0] w-full"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-0.5 text-[#8696a0] hover:text-white rounded"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 mt-2.5">
              <button
                type="button"
                onClick={() => setActiveFilterTab('all')}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition flex items-center gap-1.5 border border-[#222e35] ${
                  activeFilterTab === 'all'
                    ? 'bg-[#00a884] text-[#111b21] font-bold border-transparent'
                    : 'bg-[#202c33] text-[#8696a0] hover:text-[#d1d7db] hover:bg-[#2a3942]'
                }`}
              >
                <span>All</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeFilterTab === 'all' ? 'bg-[#111b21] text-[#00a884]' : 'bg-[#111b21] text-[#8696a0]'}`}>
                  {chatThreads.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilterTab('unread')}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition flex items-center gap-1.5 border border-[#222e35] ${
                  activeFilterTab === 'unread'
                    ? 'bg-[#00a884] text-[#111b21] font-bold border-transparent'
                    : 'bg-[#202c33] text-[#8696a0] hover:text-[#d1d7db] hover:bg-[#2a3942]'
                }`}
              >
                <span>Unread</span>
                {totalUnreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-[10px] text-white font-black animate-pulse">
                    {totalUnreadCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveFilterTab('broadcasts')}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition flex items-center gap-1.5 border border-[#222e35] ${
                  activeFilterTab === 'broadcasts'
                    ? 'bg-[#00a884] text-[#111b21] font-bold border-transparent'
                    : 'bg-[#202c33] text-[#8696a0] hover:text-[#d1d7db] hover:bg-[#2a3942]'
                }`}
              >
                <Radio size={11} />
                <span>Broadcasts</span>
              </button>
            </div>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[#222e35]">
            {!customersLoaded && customers.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center">
                <CommonLoader message="Loading messages..." />
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-[#8696a0] space-y-2">
                <MessageSquare size={32} className="mx-auto text-[#8696a0] opacity-60" />
                <p className="text-xs font-semibold">No customer threads found.</p>
                {searchQuery && (
                  <p className="text-[11px] text-[#8696a0]">
                    Try searching with another shop name or mobile number.
                  </p>
                )}
              </div>
            ) : (
              filteredThreads.map(thread => {
                const isSelected = selectedCustomerId === thread.customerCode;
                const initials = (thread.shopName || 'CU')
                  .split(' ')
                  .map(w => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                const lastMsg = thread.lastMessage;
                const lastMsgType = String(lastMsg?.type || 'TEXT').toUpperCase();
                const lastImg = (lastMsg as any)?.mediaUrl || (lastMsg as any)?.imageUri || (lastMsg as any)?.imageUrl || (lastMsg as any)?.image || '';
                const lastAudio = (lastMsg as any)?.audioUri || (lastMsg as any)?.audioUrl || (lastMsg as any)?.mediaUrl || (lastMsg as any)?.voiceNoteUrl || '';
                const isLastVoice = lastMsgType === 'VOICE' || Boolean(lastAudio && !lastImg);
                const isLastImage = lastMsgType === 'IMAGE' || Boolean(lastImg);

                return (
                  <div
                    key={thread.customerCode}
                    onClick={() => setSelectedCustomerId(thread.customerCode)}
                    className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 relative group ${
                      isSelected 
                        ? 'bg-[#2a3942] border-l-4 border-[#00a884]' 
                        : 'hover:bg-[#202c33]'
                    }`}
                  >
                    {/* Customer Initial Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-transform group-hover:scale-105 ${
                        thread.unreadCount > 0 
                          ? 'bg-[#00a884] text-[#111b21]' 
                          : isSelected 
                          ? 'bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/50' 
                          : 'bg-[#202c33] text-[#cfd9df] border border-[#222e35]'
                      }`}>
                        {initials}
                      </div>
                    </div>

                    {/* Thread Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className={`text-xs truncate uppercase tracking-wide ${isSelected ? 'text-[#e9edef] font-bold' : 'text-[#d1d7db] font-medium'}`}>
                          {thread.cityName ? `${thread.cityName.toUpperCase()} - ${thread.shopName.toUpperCase()}` : thread.shopName.toUpperCase()}
                        </h4>
                        <span className="text-[10px] text-[#8696a0] font-mono flex-shrink-0">
                          {formatTime(thread.lastTimestamp)}
                        </span>
                      </div>

                      {/* Last Message Snippet */}
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <div className="flex items-center gap-1 text-[11px] truncate">
                          {lastMsg && String(lastMsg.sender || '').toUpperCase() === 'ADMIN' && (
                            <CheckCheck size={13} className={lastMsg.isRead ? 'text-[#53bdeb]' : 'text-[#8696a0]'} />
                          )}

                          {isLastVoice ? (
                            <span className="flex items-center gap-1 text-[#00a884] font-semibold italic">
                              <Mic size={11} /> Voice Note
                            </span>
                          ) : isLastImage ? (
                            <span className="flex items-center gap-1 text-[#53bdeb] font-semibold italic">
                              <ImageIcon size={11} /> Photo Attachment
                            </span>
                          ) : lastMsg?.isBroadcast ? (
                            <span className="flex items-center gap-1 text-amber-400 font-semibold italic">
                              <Megaphone size={11} /> Broadcast
                            </span>
                          ) : (
                            <span className={`truncate ${thread.unreadCount > 0 ? 'text-[#00a884] font-bold' : 'text-[#8696a0]'}`}>
                              {lastMsg?.text || lastMsg?.content || 'No messages yet'}
                            </span>
                          )}
                        </div>

                        {/* WhatsApp-style green unread count badge */}
                        {thread.unreadCount > 0 && (
                          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#00a884] text-[#111b21] font-bold text-[11px] flex items-center justify-center flex-shrink-0 shadow-sm animate-pulse">
                            {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* MAIN CHAT WINDOW (WhatsApp Web Style) */}
        {/* ================================================================= */}
        <div className={`flex-1 flex flex-col bg-[#0b141a] relative ${!selectedCustomerId ? 'hidden md:flex' : 'flex'}`}>
          
          {activeThread ? (
            <>
              {/* 1. Chat Header */}
              <div className="p-3 bg-[#202c33] border-b border-[#222e35] flex items-center justify-between z-10 shadow-sm">
                
                {/* Left: Customer Info & Back on Mobile */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerId(null)}
                    className="md:hidden p-1.5 text-[#aebac1] hover:text-white rounded-lg"
                    title="Back to Chats"
                  >
                    <X size={18} />
                  </button>

                  <div className="w-10 h-10 rounded-full bg-[#00a884]/20 border border-[#00a884]/40 text-[#00a884] flex items-center justify-center font-bold text-xs shadow-sm">
                    {(activeThread.shopName || 'CU').substring(0, 2).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#e9edef] tracking-wide uppercase">
                        {activeThread.cityName ? `${activeThread.cityName.toUpperCase()} - ${activeThread.shopName.toUpperCase()}` : activeThread.shopName.toUpperCase()}
                      </h3>
                      <span className="px-1.5 py-0.5 rounded bg-[#111b21] text-[10px] font-mono text-[#00a884] border border-[#222e35]">
                        {activeThread.customerCode}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Action Tools */}
                <div className="flex items-center gap-2">
                  {/* WhatsApp Direct Chat on Desktop PC */}
                  {activeThread.mobileNumber && (
                    <a
                      href={(() => {
                        const cleanNum = activeThread.mobileNumber.replace(/\D/g, '');
                        const waNumber = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum;
                        const greetText = encodeURIComponent(
                          `Hello ${activeThread.shopName || ''} (SHIVAM B2B Wholesale), regarding your wholesale inquiry and orders.`
                        );
                        return `https://wa.me/${waNumber}?text=${greetText}`;
                      })()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-[#00a884] hover:bg-[#02906f] text-[#111b21] text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                      title={`Open WhatsApp chat with ${activeThread.shopName} (${activeThread.mobileNumber}) on Desktop`}
                    >
                      <MessageCircle size={14} />
                      <span>WhatsApp</span>
                    </a>
                  )}

                  {/* Filter Dashboard Orders by this Shop */}
                  {onFilterShopOrders && (
                    <button
                      type="button"
                      onClick={() => {
                        onFilterShopOrders(activeThread.shopName);
                        onClose();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[#111b21] hover:bg-[#2a3942] border border-[#222e35] text-[#53bdeb] text-xs font-bold flex items-center gap-1.5 transition"
                      title="Filter Orders for this Shop on Dashboard"
                    >
                      <Package size={13} className="text-[#53bdeb]" />
                      <span className="hidden sm:inline">View Orders</span>
                    </button>
                  )}

                  {/* Close Helpdesk */}
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 text-[#aebac1] hover:text-white hover:bg-[#111b21] rounded-lg transition"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* 2. Messages Canvas (WhatsApp Styled Bubbles) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#0b141a] relative">
                
                {/* Subtle WhatsApp Watermark background */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#8696a0_1px,transparent_1px)] [background-size:20px_20px]" />

                {/* Day Divider */}
                <div className="flex justify-center my-2">
                  <span className="px-3 py-1 rounded-lg bg-[#18222d] border border-[#222e35] text-[10px] font-bold text-[#8696a0] uppercase tracking-widest shadow-sm">
                    Direct Customer Chat
                  </span>
                </div>

                {!chatLoaded && chatMessages.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center">
                    <CommonLoader message="Loading chat history..." />
                  </div>
                ) : activeChatMessages.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-[#8696a0] space-y-2">
                    <MessageSquare size={36} className="text-[#8696a0]" />
                    <p className="text-xs font-bold text-[#d1d7db]">No chat history with this customer yet.</p>
                    <p className="text-[11px] text-[#8696a0]">
                      Send a message, catalog photo, or voice note below.
                    </p>
                  </div>
                ) : (
                  activeChatMessages.map((msg, index) => {
                    const isSenderAdmin = String(msg.sender || '').toUpperCase() === 'ADMIN';
                    const msgType = String(msg.type || 'TEXT').toUpperCase();

                    // Guard against audio vs image collision
                    const rawMedia = (msg as any).mediaUrl || '';
                    const isAudioLike = isAudioUrl(rawMedia) || isAudioUrl((msg as any).audioUri || '') || isAudioUrl((msg as any).audioUrl || '') || isAudioUrl((msg as any).voiceNoteUrl || '');

                    let img = (msg as any).imageUri || (msg as any).imageUrl || (msg as any).image || (!isAudioLike ? rawMedia : '') || (msgType === 'IMAGE' && !isAudioUrl(msg.content) ? msg.content : '') || '';
                    let audio = (msg as any).audioUri || (msg as any).audioUrl || (msg as any).voiceNoteUrl || (isAudioLike ? rawMedia : '') || (msgType === 'VOICE' ? (rawMedia || msg.content) : '') || '';

                    if (img && isAudioUrl(img)) {
                      audio = audio || img;
                      img = '';
                    }

                    const hasValidAudio = Boolean(audio && (isAudioUrl(audio) || msgType === 'VOICE'));
                    const hasValidImg = Boolean(img && !isAudioUrl(img));

                    // Date separator between days
                    const prevMsg = index > 0 ? activeChatMessages[index - 1] : null;
                    const isNewDay = !prevMsg || getDateKey(msg.timestamp) !== getDateKey(prevMsg.timestamp);

                    return (
                      <React.Fragment key={msg.id}>
                        {isNewDay && (
                          <div className="flex justify-center my-3 relative z-10 select-none">
                            <span className="px-3 py-1 rounded-lg bg-[#18222d] text-[#8696a0] text-[11px] font-semibold shadow-sm border border-[#222e35] uppercase tracking-wider">
                              {getDateSeparatorLabel(msg.timestamp)}
                            </span>
                          </div>
                        )}

                        <div
                          className={`flex flex-col ${isSenderAdmin ? 'items-end' : 'items-start'} relative z-10`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-[70%] p-3 shadow transition-all ${
                              msg.isBroadcast
                                ? 'bg-[#372b15] border border-amber-500/40 text-amber-100 rounded-lg'
                                : isSenderAdmin
                                ? 'bg-[#005c4b] text-[#e9edef] rounded-lg rounded-tr-none'
                                : 'bg-[#202c33] text-[#e9edef] rounded-lg rounded-tl-none'
                            }`}
                          >
                            {/* Sender Label & Broadcast Badge */}
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                msg.isBroadcast 
                                  ? 'text-amber-400 flex items-center gap-1' 
                                  : isSenderAdmin 
                                  ? 'text-[#53bdeb]' 
                                  : 'text-[#00a884]'
                              }`}>
                                {msg.isBroadcast ? (
                                  <>
                                    <Megaphone size={10} /> BROADCAST ANNOUNCEMENT
                                  </>
                                ) : isSenderAdmin ? (
                                  'SHIVAM'
                                ) : (
                                  activeThread.shopName
                                )}
                              </span>

                              <span className="text-[9px] text-[#8696a0] font-mono">
                                {formatTime(msg.timestamp)}
                              </span>
                            </div>

                            {/* Message Body based on type */}
                            {/* A. VOICE NOTE */}
                            {hasValidAudio ? (
                              <div className="my-1 w-64 sm:w-72">
                                <AudioPlayer 
                                  url={audio || msg.voiceNoteUrl || msg.mediaUrl || msg.content} 
                                  title={isSenderAdmin ? 'Admin Voice Note' : `${activeThread.shopName} Voice`}
                                />
                              </div>
                            ) : null}

                            {/* B. IMAGE ATTACHMENT */}
                            {hasValidImg ? (
                              <div className="my-1.5 relative group rounded-lg overflow-hidden border border-[#222e35] bg-black/40">
                                <img
                                  src={img || msg.imageUrl || msg.mediaUrl || msg.content}
                                  alt="Attachment"
                                  className="max-h-64 w-auto rounded-lg object-contain"
                                />
                                <button
                                  type="button"
                                  onClick={() => downloadImageToGallery(img || msg.imageUrl || msg.mediaUrl || msg.content, msg.timestamp)}
                                  title="Download image"
                                  className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white shadow-md backdrop-blur-sm transition-all flex items-center gap-1 text-[11px] font-medium border border-white/10"
                                >
                                  <Download size={13} />
                                  <span className="hidden sm:inline">Save</span>
                                </button>
                              </div>
                            ) : null}

                            {/* C. TEXT CONTENT */}
                            {(() => {
                              const candidate = (msg.text && !isRawMediaUrl(msg.text, rawMedia))
                                ? msg.text
                                : (msgType === 'TEXT' && msg.content && !hasValidImg && !hasValidAudio && !isRawMediaUrl(msg.content, rawMedia))
                                  ? msg.content
                                  : '';
                              const displayable = candidate.trim();
                              if (!displayable) return null;
                              return (
                                <p dir="ltr" className="text-xs sm:text-[13px] text-left leading-relaxed whitespace-pre-wrap break-words font-sans selection:bg-[#00a884] selection:text-black">
                                  {displayable}
                                </p>
                              );
                            })()}

                            {/* Footer with Read Receipt ticks */}
                            <div className="flex items-center justify-end gap-1 mt-1">
                              {isSenderAdmin && (
                                <span title={msg.isRead ? 'Read by customer' : 'Sent'}>
                                  <CheckCheck 
                                    size={14} 
                                    className={msg.isRead ? 'text-[#53bdeb]' : 'text-[#8696a0]'} 
                                  />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 3. Bottom Composer Bar */}
              <div className="p-3 bg-[#202c33] border-t border-[#222e35] space-y-2">
                
                {/* Image / Audio Attachment Preview Card */}
                {attachedImageUrl && (
                  <div className="flex items-center gap-2 p-2 bg-[#111b21] border border-[#00a884]/40 rounded-lg">
                    <img 
                      src={attachedImageUrl} 
                      alt="Attachment Preview" 
                      className="w-12 h-12 rounded-lg object-cover border border-[#222e35]" 
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-[#00a884] block truncate">Photo ready to send</span>
                      <span className="text-[10px] text-[#8696a0]">Click Send to upload to customer thread</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedImageUrl(null)}
                      className="p-1 text-[#8696a0] hover:text-red-400 rounded"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}

                {recordedAudioUrl && !isRecordingVoice && (
                  <div className="flex items-center gap-2 p-2 bg-[#111b21] border border-[#00a884]/40 rounded-lg">
                    <Volume2 size={18} className="text-[#00a884] flex-shrink-0 ml-1" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-[#00a884] block truncate">Voice Note Ready</span>
                      <span className="text-[10px] text-[#00a884]/80 font-mono">Recorded Audio ({formatSeconds(recordingDuration)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRecordedAudioUrl(null);
                        setRecordingDuration(0);
                      }}
                      className="p-1 text-[#8696a0] hover:text-red-400 rounded"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}

                {/* Quick Reply Template Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {[
                    'Order Received & Processing ✅',
                    'Checking stock in warehouse 📦',
                    'Parcel dispatched today 🚚',
                    'Voice Note received 👍',
                    'Payment received, thank you 💳'
                  ].map((quickText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMessageText(quickText)}
                      className="px-3 py-1 rounded-full bg-[#111b21] hover:bg-[#2a3942] text-[#d1d7db] hover:text-white text-[11px] font-medium flex-shrink-0 transition border border-[#222e35]"
                    >
                      {quickText}
                    </button>
                  ))}
                </div>

                {/* Active Voice Recording Bar vs Standard Input Form */}
                {isRecordingVoice ? (
                  <div className="flex items-center justify-between gap-3 bg-red-950/70 border border-red-800/80 rounded-lg p-2.5 shadow-inner">
                    <div className="flex items-center gap-3">
                      <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping" />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-red-300">Recording Voice Note...</span>
                        <span className="text-xs font-mono font-black text-white px-2 py-0.5 rounded bg-red-900 border border-red-700">
                          {formatSeconds(recordingDuration)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={cancelVoiceRecording}
                        className="px-3 py-1.5 rounded-lg bg-[#202c33] hover:bg-[#2a3942] text-[#d1d7db] text-xs font-bold flex items-center gap-1 transition"
                      >
                        <Trash2 size={13} /> Cancel
                      </button>
                      <button
                        type="button"
                        onClick={stopVoiceRecording}
                        className="px-3 py-1.5 rounded-lg bg-[#00a884] hover:bg-[#02906f] text-[#111b21] text-xs font-black flex items-center gap-1 transition shadow-md"
                      >
                        <Check size={13} /> Done Recording
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    
                    {/* Attach Image Button */}
                    <button
                      type="button"
                      onClick={() => chatFileInputRef.current?.click()}
                      className="p-2.5 rounded-lg bg-[#111b21] hover:bg-[#2a3942] border border-[#222e35] text-[#8696a0] hover:text-[#d1d7db] transition flex-shrink-0"
                      title="Attach Image / Photo"
                    >
                      <ImageIcon size={18} />
                    </button>

                    {/* Text Input */}
                    <input
                      type="text"
                      placeholder={`Type a message...`}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      dir="ltr"
                      style={{ direction: 'ltr', textAlign: 'left', unicodeBidi: 'plaintext' }}
                      className="flex-1 bg-[#2a3942] border-none outline-none rounded-lg px-4 py-2.5 text-xs sm:text-sm text-[#d1d7db] placeholder-[#8696a0] transition"
                    />

                    {/* Mic Button for Voice Recording */}
                    <button
                      type="button"
                      onClick={startVoiceRecording}
                      className="p-2.5 rounded-lg bg-[#111b21] hover:bg-[#2a3942] border border-[#222e35] text-[#8696a0] hover:text-[#00a884] transition flex-shrink-0"
                      title="Record Voice Note"
                    >
                      <Mic size={18} />
                    </button>

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={!messageText.trim() && !attachedImageUrl && !recordedAudioUrl}
                      className="p-2.5 rounded-full bg-[#00a884] hover:bg-[#02906f] disabled:bg-[#202c33] disabled:text-[#8696a0] text-[#111b21] font-bold transition flex-shrink-0 shadow-md active:scale-95"
                      title="Send Message"
                    >
                      <Send size={18} />
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            /* Splash / Empty State (WhatsApp Web Style) */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-[#111b21]">
              <div className="w-20 h-20 rounded-full bg-[#202c33] border border-[#222e35] flex items-center justify-center text-[#00a884] shadow-xl">
                <MessageCircle size={40} />
              </div>

              <div className="max-w-md space-y-1">
                <h2 className="text-xl font-bold text-[#e9edef]">Chat Box & Customer Desk</h2>
                <p className="text-xs text-[#8696a0] leading-relaxed">
                  Select a customer thread from the left to view order instructions, listen to customer voice notes, and send instant Chatbox replies.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(true)}
                  className="px-4 py-2 rounded-lg bg-[#00a884] hover:bg-[#02906f] text-[#111b21] font-bold text-xs flex items-center gap-2 shadow-lg transition active:scale-95"
                >
                  <Megaphone size={16} />
                  <span>Send Broadcast Announcement</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* BROADCAST ANNOUNCEMENT MODAL ("Send to All") */}
      {/* =================================================================== */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-[#09152a] border border-amber-500/50 rounded-2xl shadow-2xl p-5 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <Megaphone size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Broadcast Announcement
                  </h3>
                  <span className="text-[11px] text-amber-300 font-medium block">
                    Will be delivered to {customers.length} registered buyer apps
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {broadcastSuccessNotice ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto animate-bounce">
                  <Check size={24} />
                </div>
                <h4 className="text-sm font-extrabold text-white">Broadcast Delivered!</h4>
                <p className="text-xs text-slate-300">
                  Announcement has been posted to community feeds and all customer chat inboxes with unread badges.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendBroadcast} className="space-y-3.5">
                
                {/* Title */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Announcement Headline (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 🌟 New Imitation Bridal Collection Launched!"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className="w-full bg-[#050c18] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Announcement Body */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Broadcast Message Content *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Type details, discounts, new arrivals, transport schedules..."
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                    className="w-full bg-[#050c18] border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
                    required
                  />
                </div>

                {/* Image Attachment for Broadcast */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Attached Showcase Photo (Optional)
                  </label>
                  
                  {broadcastImageUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black/40 h-32 flex items-center justify-center">
                      <img 
                        src={broadcastImageUrl} 
                        alt="Broadcast Attached" 
                        className="max-h-full object-contain" 
                      />
                      <button
                        type="button"
                        onClick={() => setBroadcastImageUrl(null)}
                        className="absolute top-2 right-2 p-1 rounded-lg bg-red-600 text-white hover:bg-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => broadcastFileInputRef.current?.click()}
                      className="w-full py-3 rounded-xl border border-dashed border-slate-700 hover:border-amber-400 text-slate-400 hover:text-amber-300 flex items-center justify-center gap-2 text-xs font-bold transition bg-[#050c18]"
                    >
                      <ImageIcon size={16} />
                      <span>Select Photo from Computer</span>
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowBroadcastModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSendingBroadcast || (!broadcastText.trim() && !broadcastImageUrl)}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg transition active:scale-95"
                  >
                    {isSendingBroadcast ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Sending to All...</span>
                      </>
                    ) : (
                      <>
                        <Megaphone size={14} />
                        <span>Send Broadcast to All</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
