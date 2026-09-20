import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Image as ImageIcon, 
  Mic, 
  Square, 
  Trash2, 
  Check, 
  CheckCheck, 
  Store, 
  Bell, 
  Users, 
  MessageSquare, 
  Phone, 
  PlusCircle, 
  Heart, 
  Share2, 
  Paperclip
} from 'lucide-react';
import { useAppStore } from '../store';
import { ChatMessage, CommunityPost } from '../types';
import { AudioMessagePlayer } from './AudioMessagePlayer';
import { generateMessageId } from '../lib/idGenerator';
import { uploadMediaToStorage } from '../services/storageService';

export function ChatModal({ 
  isOpen, 
  onClose, 
  defaultCustomerCode = '' 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  defaultCustomerCode?: string; 
}) {
  const currentCustomer = useAppStore(state => state.currentCustomer);
  const messages = useAppStore(state => state.messages);
  const broadcastMessages = useAppStore(state => state.broadcastMessages);
  const addMessage = useAppStore(state => state.addMessage);
  const markMessagesAsRead = useAppStore(state => state.markMessagesAsRead);
  
  const communityPosts = useAppStore(state => state.communityPosts);
  const addCommunityPost = useAppStore(state => state.addCommunityPost);
  const toggleLikeCommunityPost = useAppStore(state => state.toggleLikeCommunityPost);
  const deleteCommunityPost = useAppStore(state => state.deleteCommunityPost);

  const [activeTab, setActiveTab] = useState<'chat' | 'broadcast' | 'community'>('chat');

  const isAdmin = !!defaultCustomerCode;
  const customerId = isAdmin ? defaultCustomerCode : (currentCustomer?.customerId || currentCustomer?.customerCode || '');
  const effectiveCustomerId = customerId || 'CUST-GENERAL';
  const effectiveShopName = currentCustomer?.shopName || currentCustomer?.ownerName || currentCustomer?.customerCode || '';
  const effectivePhone = currentCustomer?.phone || currentCustomer?.mobileNumber || '';

  // Direct Chat state
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const [hasText, setHasText] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState('');
  
  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Community Post Form State
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postCaption, setPostCaption] = useState('');
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const postFileInputRef = useRef<HTMLInputElement>(null);

  // Strictly filter messages for this customer thread (Customer Privacy Constraint)
  const chatMessages = messages.filter(m => {
    if (isAdmin && defaultCustomerCode) {
      return m.customerCode === defaultCustomerCode || m.customerId === defaultCustomerCode;
    }
    if (customerId) {
      return m.customerCode === customerId || m.customerId === customerId;
    }
    return m.customerCode === 'CUST-GENERAL' || m.customerId === 'CUST-GENERAL' || !m.customerId;
  });

  // Mark all admin messages as read when opening modal or changing tabs
  useEffect(() => {
    if (isOpen) {
      markMessagesAsRead();
    }
  }, [isOpen, markMessagesAsRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages.length, activeTab]);

  // Clean up recording timer
  useEffect(() => {
    return () => {
      if (recordingTimer.current) clearInterval(recordingTimer.current);
    };
  }, []);

  if (!isOpen) return null;

  // 1. Send Text Message
  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = chatInputRef.current?.value.trim();
    if (!text) return;
    
    const msgId = generateMessageId();
    const newMsg: ChatMessage = {
      id: msgId,
      messageId: msgId,
      customerId: effectiveCustomerId,
      customerCode: effectiveCustomerId,
      shopName: effectiveShopName,
      sender: isAdmin ? 'admin' : 'customer',
      type: 'text',
      text: text,
      isRead: false,
      timestamp: Date.now(),
      createdAt: Date.now()
    };

    addMessage(newMsg);
    if (chatInputRef.current) {
      chatInputRef.current.value = '';
    }
    setHasText(false);
  };
  const handleSendText = handleSend;

  // 2. Select Image for Attachment
  const handleImagePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    // reset input
    e.target.value = '';
  };

  // Send Image Message
  const handleSendImage = async () => {
    if (!selectedImage) return;

    const imageToUpload = selectedImage;
    const caption = imageCaption.trim();
    setSelectedImage(null);
    setImageCaption('');

    const msgId = generateMessageId();
    let cloudImageUrl = '';
    try {
      cloudImageUrl = await uploadMediaToStorage(imageToUpload, 'communication', 'chat_img');
    } catch (err) {
      console.warn('Failed to upload chat image to Cloud Storage:', err);
    }

    const newMsg: ChatMessage = {
      id: msgId,
      messageId: msgId,
      customerId: effectiveCustomerId,
      customerCode: effectiveCustomerId,
      shopName: effectiveShopName,
      sender: isAdmin ? 'admin' : 'customer',
      type: 'image',
      text: caption || undefined,
      mediaUrl: cloudImageUrl,
      imageUri: cloudImageUrl,
      imageUrl: cloudImageUrl,
      isRead: false,
      timestamp: Date.now(),
      createdAt: Date.now()
    };

    addMessage(newMsg);
  };

  // 3. Voice Recording Functions
  const startRecording = async () => {
    setMicNotice(null);
    setRecordingSeconds(0);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicNotice("Microphone is not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        if (audioChunks.current.length === 0) return;
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const msgId = generateMessageId();

        let cloudAudioUrl = '';
        try {
          cloudAudioUrl = await uploadMediaToStorage(audioBlob, 'voice_notes', 'chat_voice');
        } catch (err) {
          console.warn('Failed to upload chat voice to Cloud Storage:', err);
        }

        const newMsg: ChatMessage = {
          id: msgId,
          messageId: msgId,
          customerId: effectiveCustomerId,
          customerCode: effectiveCustomerId,
          shopName: effectiveShopName,
          sender: isAdmin ? 'admin' : 'customer',
          type: 'voice',
          mediaUrl: cloudAudioUrl,
          audioUri: cloudAudioUrl,
          audioUrl: cloudAudioUrl,
          isRead: false,
          timestamp: Date.now(),
          createdAt: Date.now()
        };
        addMessage(newMsg);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start(100);
      setIsRecording(true);

      // Start timer
      recordingTimer.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      if (err?.name === 'NotFoundError' || err?.message?.includes('not found')) {
        setMicNotice("No microphone detected. Please type your message.");
      } else {
        setMicNotice("Microphone permission denied or unavailable.");
      }
    }
  };

  const stopAndSendRecording = () => {
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      audioChunks.current = [];
      mediaRecorder.current.stop();
      setIsRecording(false);
      setRecordingSeconds(0);
    }
  };

  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Community Post Form Handlers
  const handleSelectPostImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPostImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitCommunityPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postImagePreview && !postCaption.trim()) return;

    const imageToUpload = postImagePreview;
    const caption = postCaption.trim();
    setPostCaption('');
    setPostImagePreview(null);
    setIsCreatingPost(false);

    let cloudImageUrl = '';
    if (imageToUpload) {
      try {
        cloudImageUrl = await uploadMediaToStorage(imageToUpload, 'communication', 'community_post');
      } catch (err) {
        console.warn('Failed to upload community post image:', err);
      }
    }

    const newPost: CommunityPost = {
      postId: `post-${Date.now()}`,
      id: `post-${Date.now()}`,
      customerId: effectiveCustomerId,
      customerCode: effectiveCustomerId,
      shopName: effectiveShopName,
      imageUrl: cloudImageUrl,
      caption,
      timestamp: Date.now(),
      likesCount: 0,
      likedBy: []
    };

    addCommunityPost(newPost);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0b141a] text-[#e9edef] w-full max-w-lg h-[92vh] sm:h-[86vh] rounded-2xl shadow-2xl border border-slate-700/80 flex flex-col overflow-hidden">
        
        {/* WhatsApp-Style Header */}
        <div className="bg-[#202c33] px-3.5 py-2.5 border-b border-slate-700/60 flex items-center justify-between flex-shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            {/* Showroom Admin Avatar */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-bold text-sm shadow">
                <Store size={20} />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#202c33]" />
            </div>

            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Shivam Communication Hub</span>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">
                  Admin
                </span>
              </div>
              <div className="text-[11px] text-[#8696a0] flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>online</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {effectivePhone && (
              <a 
                href={`tel:${effectivePhone}`} 
                className="p-2 text-[#aebac1] hover:text-white hover:bg-white/10 rounded-full transition"
                title="Call Support"
              >
                <Phone size={17} />
              </a>
            )}
            <button 
              onClick={onClose} 
              className="p-2 text-[#aebac1] hover:text-white hover:bg-white/10 rounded-full transition"
              title="Close Chat"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* Customer Badge & Navigation Tabs */}
        <div className="bg-[#111b21] px-3 py-2 border-b border-slate-800 flex flex-col gap-2 flex-shrink-0">
          <div className="flex justify-between items-center text-[11px]">
            <div className="flex items-center gap-1.5 text-[#8696a0]">
              <span>Active Customer:</span>
              <span className="font-bold text-amber-300">{effectiveShopName}</span>
              <span className="font-mono text-[10px] bg-[#202c33] text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                {effectiveCustomerId}
              </span>
            </div>
            <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Encrypted Two-Way</span>
            </div>
          </div>

          {/* WhatsApp-Style Tab Switcher */}
          <div className="grid grid-cols-3 bg-[#202c33] p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => { setActiveTab('chat'); markMessagesAsRead(); }}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'chat'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              <MessageSquare size={13} />
              <span>Direct Chat</span>
              {chatMessages.length > 0 && (
                <span className={`text-[10px] px-1.5 rounded-full font-mono ${
                  activeTab === 'chat' ? 'bg-black/30 text-white' : 'bg-[#111b21] text-slate-400'
                }`}>
                  {chatMessages.length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('broadcast'); markMessagesAsRead(); }}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'broadcast'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              <Bell size={13} />
              <span>Broadcasts</span>
              {broadcastMessages.length > 0 && (
                <span className={`text-[10px] px-1.5 rounded-full font-mono ${
                  activeTab === 'broadcast' ? 'bg-black/30 text-white' : 'bg-[#111b21] text-slate-400'
                }`}>
                  {broadcastMessages.length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('community'); }}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'community'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              <Users size={13} />
              <span>Community</span>
              {communityPosts.length > 0 && (
                <span className={`text-[10px] px-1.5 rounded-full font-mono ${
                  activeTab === 'community' ? 'bg-black/30 text-white' : 'bg-[#111b21] text-slate-400'
                }`}>
                  {communityPosts.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* TAB 1: DIRECT WHATSAPP-STYLE CHAT */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0b141a] relative">
            
            {/* Subtle WhatsApp chat wallpaper pattern background */}
            <div 
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
                backgroundSize: '16px 16px'
              }}
            />

            {/* Messages Scroll Area */}
            <div className="flex-1 p-3 sm:p-4 overflow-y-auto flex flex-col gap-2.5 scrollbar-thin z-10">
              
              {/* WhatsApp Security Notice Box */}
              <div className="bg-[#182229] border border-[#222d34] rounded-xl p-2.5 text-center text-[11px] text-[#ffd279] shadow-sm max-w-[92%] mx-auto mb-1">
                🔒 Messages with Shivam Showroom Admin are private & synced in real-time to the PC Admin Dashboard.
              </div>

              {chatMessages.length === 0 && (
                <div className="text-center text-[#8696a0] text-xs my-auto py-10 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-emerald-400 mb-3">
                    <MessageSquare size={24} />
                  </div>
                  <p className="font-bold text-[#e9edef]">Direct WhatsApp-Style Support</p>
                  <p className="text-[11px] text-[#8696a0] max-w-xs mt-1">
                    Send photos of custom jewelry or cosmetic items, request prices, or hold the mic to record a voice note!
                  </p>
                </div>
              )}

              {chatMessages.map(msg => {
                const isMe = msg.sender === (isAdmin ? 'admin' : 'customer');
                const timeStr = msg.timestamp 
                  ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                  : '';
                
                const mediaSource = msg.mediaUrl || msg.imageUri || msg.audioUri;
                const isVoice = msg.type === 'voice' || !!msg.audioUri;
                const isImage = msg.type === 'image' || (!isVoice && !!msg.imageUri);

                return (
                  <div 
                    key={msg.messageId || msg.id} 
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-2.5 shadow-md flex flex-col gap-1 transition-all ${
                      isMe 
                        ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-xs' 
                        : 'bg-[#202c33] text-[#e9edef] rounded-tl-xs border border-[#2a3942]'
                    }`}>
                      
                      {/* Sender Header for Incoming Messages */}
                      {!isMe && (
                        <div className="flex items-center justify-between gap-2 pb-0.5 border-b border-white/10 text-[10px]">
                          <span className="font-bold text-emerald-400">
                            {msg.sender === 'admin' ? 'Shivam Showroom Admin' : (msg.shopName || 'Customer')}
                          </span>
                          <span className="text-[9px] text-[#8696a0]">Support</span>
                        </div>
                      )}

                      {/* Image Message */}
                      {isImage && mediaSource && (
                        <div className="rounded-xl overflow-hidden bg-black/40 border border-black/20 my-0.5">
                          <img 
                            src={mediaSource} 
                            alt="Attachment" 
                            loading="lazy"
                            className="w-full max-h-64 object-cover cursor-pointer hover:opacity-95 transition"
                            onClick={() => window.open(mediaSource, '_blank')}
                          />
                        </div>
                      )}

                      {/* Voice Note Message */}
                      {isVoice && mediaSource && (
                        <div className="my-0.5">
                          <AudioMessagePlayer src={mediaSource} isMe={isMe} />
                        </div>
                      )}

                      {/* Text content */}
                      {msg.text && (
                        <p dir="ltr" className="text-xs leading-relaxed whitespace-pre-wrap select-text text-left" style={{ direction: 'ltr', textAlign: 'left' }}>
                          <span>{msg.text}</span>
                        </p>
                      )}

                      {/* Timestamp & Read Receipt Checkmarks */}
                      <div className="flex items-center justify-end gap-1 text-[9px] font-mono text-[#8696a0] mt-0.5">
                        <span className={isMe ? 'text-emerald-200/80' : 'text-[#8696a0]'}>{timeStr}</span>
                        {isMe && (
                          <span title={msg.isRead ? 'Read by Admin' : 'Sent to Dashboard'}>
                            {msg.isRead ? (
                              <CheckCheck size={14} className="text-[#53bdeb]" />
                            ) : (
                              <Check size={14} className="text-emerald-300" />
                            )}
                          </span>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Image Preview Overlay before sending */}
            {selectedImage && (
              <div className="bg-[#111b21] p-3 border-t border-slate-700 flex flex-col gap-2 z-20 animate-fadeIn">
                <div className="flex justify-between items-center text-xs font-bold text-amber-300">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon size={14} />
                    <span>Image Preview</span>
                  </div>
                  <button 
                    onClick={() => { setSelectedImage(null); setImageCaption(''); }}
                    className="p-1 hover:text-red-400 text-[#8696a0] transition"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="relative rounded-xl overflow-hidden max-h-44 bg-black/60 border border-slate-700 flex items-center justify-center">
                  <img src={selectedImage} alt="Preview" className="max-h-44 object-contain" />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                    placeholder="Add a caption... (optional)"
                    className="flex-1 bg-[#202c33] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-[#8696a0] focus:outline-none focus:border-emerald-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendImage();
                      }
                    }}
                  />
                  <button
                    onClick={handleSendImage}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition"
                  >
                    <Send size={14} />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            )}

            {/* Mic Recording Active Banner */}
            {isRecording && (
              <div className="bg-[#182229] border-t border-red-500/40 px-3 py-2 flex items-center justify-between z-20 animate-pulse">
                <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                  <Mic size={16} className="text-red-400" />
                  <span>Recording Voice Note:</span>
                  <span className="font-mono text-white text-xs">{formatRecordingTime(recordingSeconds)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={cancelRecording}
                    className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                  >
                    <Trash2 size={13} />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={stopAndSendRecording}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                  >
                    <Send size={13} />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            )}

            {/* Mic Notice (permission/error) */}
            {micNotice && (
              <div className="bg-amber-950/90 border-t border-amber-500/30 px-3 py-1.5 text-[11px] text-amber-300 flex items-center justify-between flex-shrink-0 z-20">
                <span>{micNotice}</span>
                <button onClick={() => setMicNotice(null)} className="text-amber-400 hover:text-white font-bold ml-2">×</button>
              </div>
            )}

            {/* WhatsApp Chat Input Bar */}
            <form onSubmit={handleSendText} className="p-2.5 bg-[#202c33] border-t border-slate-700/60 flex items-center gap-2 flex-shrink-0 z-10">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={chatFileInputRef}
                onChange={handleImagePicked}
              />

              {/* Photo Attachment Button */}
              <button 
                type="button"
                onClick={() => chatFileInputRef.current?.click()}
                className="p-2 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-white/5 transition flex-shrink-0"
                title="Attach Photo"
              >
                <Paperclip size={20} />
              </button>
              
              {/* Text Input Area */}
              <textarea
                ref={chatInputRef}
                defaultValue=""
                rows={1}
                placeholder="Type a message..."
                dir="ltr"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="flex-1 bg-[#2a3942] text-white text-left outline-none resize-none px-3.5 py-2 rounded-2xl text-xs placeholder-[#8696a0]"
                style={{ direction: 'ltr', textAlign: 'left' }}
                onInput={() => setHasText(Boolean(chatInputRef.current?.value.trim()))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />

              {/* Send or Voice Record Action Button */}
              {hasText ? (
                <button 
                  type="submit"
                  className="w-10 h-10 rounded-full bg-emerald-600 text-white hover:bg-emerald-500 transition shadow flex items-center justify-center flex-shrink-0 active:scale-95"
                  title="Send Message"
                >
                  <Send size={18} />
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={isRecording ? stopAndSendRecording : startRecording}
                  className={`w-10 h-10 rounded-full transition shadow flex items-center justify-center flex-shrink-0 active:scale-95 ${
                    isRecording 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                  title={isRecording ? 'Stop & Send' : 'Record Voice Note'}
                >
                  {isRecording ? <Square size={16} fill="currentColor" /> : <Mic size={18} />}
                </button>
              )}
            </form>
          </div>
        )}

        {/* TAB 2: BROADCAST ANNOUNCEMENTS */}
        {activeTab === 'broadcast' && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-[#0b141a] flex flex-col gap-3 scrollbar-thin">
            <div className="bg-[#182229] border border-amber-500/30 p-3 rounded-2xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                <Bell size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-300">Wholesale Broadcast Announcements</div>
                <div className="text-[11px] text-[#8696a0]">Official price drops, new arrivals, and festival stock alerts.</div>
              </div>
            </div>

            {broadcastMessages.length === 0 ? (
              <div className="text-center text-[#8696a0] py-14 flex flex-col items-center justify-center gap-2">
                <Bell size={36} className="text-slate-700" />
                <p className="text-sm font-bold text-slate-300">No broadcast messages yet</p>
                <p className="text-xs text-[#8696a0] max-w-xs">
                  Official announcements from Shivam Showroom will appear here.
                </p>
              </div>
            ) : (
              broadcastMessages.map(item => (
                <div key={item.id} className="bg-[#202c33] border border-slate-700/60 rounded-2xl p-3.5 space-y-2.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-amber-400 uppercase tracking-wide">
                        {item.title || 'Showroom Announcement'}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#8696a0] font-mono">
                      {item.timestamp ? new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                    </span>
                  </div>

                  {item.imageUrl && (
                    <div className="rounded-xl overflow-hidden max-h-60 border border-slate-700/80 bg-black/40">
                      <img src={item.imageUrl} alt="Broadcast Attachment" className="w-full object-cover max-h-60" />
                    </div>
                  )}

                  <p className="text-xs text-[#e9edef] whitespace-pre-wrap leading-relaxed">
                    {item.message}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: COMMUNITY POSTS & INQUIRIES */}
        {activeTab === 'community' && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-[#0b141a] flex flex-col gap-3 scrollbar-thin">
            {/* Create Community Post Header */}
            <div className="bg-[#202c33] border border-slate-700 p-3 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
              <div className="text-xs text-[#8696a0]">
                Share sample requests or inquiry photos with verified buyer shops.
              </div>
              <button
                onClick={() => setIsCreatingPost(prev => !prev)}
                className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow"
              >
                <PlusCircle size={14} />
                <span>{isCreatingPost ? 'Cancel' : 'New Post'}</span>
              </button>
            </div>

            {/* Create Post Form */}
            {isCreatingPost && (
              <form onSubmit={handleSubmitCommunityPost} className="bg-[#202c33] border border-emerald-500/40 p-3.5 rounded-2xl space-y-3 animate-fadeIn shadow-xl">
                <div className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                  New Community Post
                </div>

                <textarea
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  placeholder="Describe the jewelry or cosmetic designs you are requesting..."
                  className="w-full bg-[#111b21] border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-[#8696a0] focus:outline-none focus:border-emerald-500 min-h-[70px] resize-none"
                />

                {postImagePreview && (
                  <div className="relative rounded-xl overflow-hidden max-h-48 border border-slate-700">
                    <img src={postImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPostImagePreview(null)}
                      className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-500 text-white rounded-lg transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  <input
                    type="file"
                    accept="image/*"
                    ref={postFileInputRef}
                    className="hidden"
                    onChange={handleSelectPostImage}
                  />
                  <button
                    type="button"
                    onClick={() => postFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-bold transition"
                  >
                    <ImageIcon size={16} className="text-emerald-400" />
                    <span>{postImagePreview ? 'Change Photo' : 'Attach Photo'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={!postCaption.trim() && !postImagePreview}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Send size={14} />
                    <span>Publish</span>
                  </button>
                </div>
              </form>
            )}

            {/* Posts List */}
            {communityPosts.length === 0 ? (
              <div className="text-center text-[#8696a0] py-12 flex flex-col items-center justify-center gap-2">
                <Users size={36} className="text-slate-700" />
                <p className="text-sm font-bold text-slate-300">No community posts yet</p>
                <p className="text-xs text-[#8696a0] max-w-xs">
                  Be the first to share an inquiry or trending wholesale product sample!
                </p>
              </div>
            ) : (
              communityPosts.map(post => {
                const isMyPost = post.customerId === customerId || post.customerCode === customerId;
                const isLiked = Array.isArray(post.likedBy) && post.likedBy.includes(customerId);

                return (
                  <div 
                    key={post.postId || post.id}
                    className="bg-[#202c33] border border-slate-700/80 rounded-2xl p-3.5 space-y-2.5 shadow-md"
                  >
                    {/* Post Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center text-amber-300 font-bold text-xs">
                          {post.shopName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-black text-white flex items-center gap-1.5">
                            <span>{post.shopName}</span>
                            <span className="text-[10px] font-mono text-[#8696a0] bg-[#111b21] px-1.5 py-0.2 rounded">
                              {post.customerId || post.customerCode}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#8696a0]">
                            {post.timestamp ? new Date(post.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                          </div>
                        </div>
                      </div>

                      {isMyPost && (
                        <button
                          onClick={() => deleteCommunityPost(post.postId || post.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                          title="Delete Post"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Post Caption */}
                    {post.caption && (
                      <p className="text-xs text-[#e9edef] whitespace-pre-wrap leading-relaxed">
                        {post.caption}
                      </p>
                    )}

                    {/* Post Image */}
                    {post.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-slate-700/80 bg-black/40 max-h-72">
                        <img 
                          src={post.imageUrl} 
                          alt="Community sample" 
                          className="w-full h-full object-cover max-h-72"
                        />
                      </div>
                    )}

                    {/* Post Actions: Like & Share */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-700/60">
                      <button
                        onClick={() => toggleLikeCommunityPost(post.postId || post.id, customerId || 'guest')}
                        className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg transition ${
                          isLiked 
                            ? 'text-red-400 bg-red-500/10' 
                            : 'text-[#8696a0] hover:text-white hover:bg-slate-700/50'
                        }`}
                      >
                        <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} />
                        <span>{post.likesCount || 0}</span>
                      </button>

                      <button
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(`${post.shopName}: ${post.caption || 'Check this out on Shivam Showroom'}`);
                          }
                        }}
                        className="flex items-center gap-1 text-[11px] text-[#8696a0] hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-700/50 transition"
                      >
                        <Share2 size={13} />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>
    </div>
  );
}
