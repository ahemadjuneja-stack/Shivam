import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Image as ImageIcon, 
  Mic, 
  Square, 
  Heart, 
  MessageSquare, 
  Users, 
  PlusCircle, 
  Store, 
  Trash2,
  Share2
} from 'lucide-react';
import { useAppStore } from '../store';
import { CommunityPost } from '../types';

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
  const addMessage = useAppStore(state => state.addMessage);
  const markMessagesAsRead = useAppStore(state => state.markMessagesAsRead);
  
  const communityPosts = useAppStore(state => state.communityPosts);
  const addCommunityPost = useAppStore(state => state.addCommunityPost);
  const toggleLikeCommunityPost = useAppStore(state => state.toggleLikeCommunityPost);
  const deleteCommunityPost = useAppStore(state => state.deleteCommunityPost);

  const [activeTab, setActiveTab] = useState<'feed' | 'chat'>('feed');

  const isAdmin = !!defaultCustomerCode;
  const customerId = isAdmin ? defaultCustomerCode : (currentCustomer?.customerId || currentCustomer?.customerCode || '');
  const effectiveCustomerId = customerId || 'CUST-GENERAL';
  const effectiveShopName = currentCustomer?.shopName || 'Wholesale Buyer';

  // Direct Chat state
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New Community Post modal/form state
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postCaption, setPostCaption] = useState('');
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const postFileInputRef = useRef<HTMLInputElement>(null);

  const chatMessages = messages.filter(m => {
    if (isAdmin && defaultCustomerCode) {
      return m.customerCode === defaultCustomerCode || m.customerId === defaultCustomerCode;
    }
    if (customerId) {
      return m.customerCode === customerId || m.customerId === customerId;
    }
    return m.customerCode === 'CUST-GENERAL' || m.customerId === 'CUST-GENERAL' || !m.customerCode;
  });

  useEffect(() => {
    if (isOpen) {
      markMessagesAsRead();
    }
  }, [isOpen, markMessagesAsRead]);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages.length, activeTab]);

  if (!isOpen) return null;

  // Direct Chat handlers
  const handleSendText = () => {
    if (!text.trim()) return;
    const msgText = text.trim();
    setText('');
    
    addMessage({
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      customerCode: effectiveCustomerId,
      customerId: effectiveCustomerId,
      shopName: effectiveShopName,
      sender: isAdmin ? 'admin' : 'customer',
      text: msgText,
      timestamp: Date.now()
    });
  };

  const handleChatImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        addMessage({
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          customerCode: effectiveCustomerId,
          customerId: effectiveCustomerId,
          shopName: effectiveShopName,
          sender: isAdmin ? 'admin' : 'customer',
          imageUri: reader.result as string,
          timestamp: Date.now()
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    setMicNotice(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicNotice("Microphone recording is not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          addMessage({
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            customerCode: effectiveCustomerId,
            customerId: effectiveCustomerId,
            shopName: effectiveShopName,
            sender: isAdmin ? 'admin' : 'customer',
            audioUri: reader.result as string,
            timestamp: Date.now()
          });
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err: any) {
      if (err?.name === 'NotFoundError' || err?.message?.includes('not found')) {
        setMicNotice("No microphone detected. Please type your message.");
      } else {
        setMicNotice("Microphone unavailable. Please type your message.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  // Community Post handlers
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

  const handleSubmitCommunityPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postImagePreview && !postCaption.trim()) return;

    const newPost: CommunityPost = {
      postId: `post-${Date.now()}`,
      id: `post-${Date.now()}`,
      customerId: effectiveCustomerId,
      customerCode: effectiveCustomerId,
      shopName: effectiveShopName,
      imageUrl: postImagePreview || '',
      caption: postCaption.trim(),
      timestamp: Date.now(),
      likesCount: 0,
      likedBy: []
    };

    addCommunityPost(newPost);
    setPostCaption('');
    setPostImagePreview(null);
    setIsCreatingPost(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 w-full max-w-lg h-[86vh] rounded-2xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden">
        
        {/* Header with Navigation Tabs */}
        <div className="bg-slate-800 p-2.5 border-b border-slate-700 flex flex-col gap-2 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-black font-black text-xs shadow-md">
                <Store size={16} />
              </div>
              <div>
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>{effectiveShopName}</span>
                  {customerId && (
                    <span className="text-[10px] font-mono text-amber-300 bg-black/40 px-1.5 py-0.5 rounded">
                      {customerId}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-amber-400/90 font-bold">Community Hub • Live Dashboard Sync</div>
              </div>
            </div>

            <button 
              onClick={onClose} 
              className="p-1.5 text-slate-400 hover:text-white bg-slate-700/60 hover:bg-slate-700 rounded-full transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => { setActiveTab('feed'); setIsCreatingPost(false); }}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'feed'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users size={14} />
              <span>Community Feed</span>
              {communityPosts.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeTab === 'feed' ? 'bg-black text-amber-300' : 'bg-slate-800 text-slate-300'}`}>
                  {communityPosts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('chat'); setIsCreatingPost(false); }}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'chat'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare size={14} />
              <span>Direct Chat</span>
              {chatMessages.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeTab === 'chat' ? 'bg-black text-amber-300' : 'bg-slate-800 text-slate-300'}`}>
                  {chatMessages.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* TAB 1: COMMUNITY FEED */}
        {activeTab === 'feed' && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-[#0a1120] flex flex-col gap-4 scrollbar-thin">
            
            {/* Create Post Action Header Bar */}
            <div className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-xl flex items-center justify-between gap-3 shadow-sm">
              <div className="text-xs text-slate-300">
                Share sample requests, new styles, or inquiries with verified shops.
              </div>
              <button
                onClick={() => setIsCreatingPost(prev => !prev)}
                className="flex-shrink-0 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold px-3 py-1.5 rounded-lg text-xs transition shadow"
              >
                <PlusCircle size={14} />
                <span>{isCreatingPost ? 'Cancel' : 'Post'}</span>
              </button>
            </div>

            {/* Create Post Form */}
            {isCreatingPost && (
              <form onSubmit={handleSubmitCommunityPost} className="bg-slate-800 border border-amber-500/40 p-4 rounded-xl space-y-3 animate-fadeIn shadow-xl">
                <div className="text-xs font-black text-amber-300 uppercase tracking-wider">
                  New Community Post
                </div>

                <textarea
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  placeholder="What jewelry or cosmetic designs are you looking for?"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 min-h-[70px] resize-none"
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
                    <ImageIcon size={16} className="text-amber-400" />
                    <span>{postImagePreview ? 'Change Photo' : 'Attach Photo'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={!postCaption.trim() && !postImagePreview}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-lg text-xs transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Send size={14} />
                    <span>Publish Post</span>
                  </button>
                </div>
              </form>
            )}

            {/* Posts List */}
            {communityPosts.length === 0 ? (
              <div className="text-center text-slate-500 py-12 flex flex-col items-center justify-center gap-2">
                <Users size={36} className="text-slate-700" />
                <p className="text-sm font-bold text-slate-400">No community posts yet</p>
                <p className="text-xs text-slate-600 max-w-xs">
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
                    className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3.5 space-y-3 shadow-md"
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
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-900/60 px-1 rounded">
                              {post.customerId || post.customerCode}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {post.timestamp ? new Date(post.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                          </div>
                        </div>
                      </div>

                      {isMyPost && (
                        <button
                          onClick={() => deleteCommunityPost(post.postId || post.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                          title="Delete Post"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Post Caption */}
                    {post.caption && (
                      <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {post.caption}
                      </p>
                    )}

                    {/* Post Image */}
                    {post.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-slate-700/80 bg-black/40 max-h-72">
                        <img 
                          src={post.imageUrl} 
                          alt="Community shared item" 
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
                            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`}
                      >
                        <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} />
                        <span>{post.likesCount || 0}</span>
                      </button>

                      <button
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(`${post.shopName}: ${post.caption || 'Check this out on Shivam Showroom'}`);
                            alert('Post caption copied to clipboard!');
                          }
                        }}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-700/50 transition"
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

        {/* TAB 2: DIRECT SUPPORT CHAT */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0a1120]">
            
            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 scrollbar-thin">
              {chatMessages.length === 0 && (
                <div className="text-center text-slate-500 text-xs my-auto py-8">
                  <MessageSquare size={32} className="mx-auto text-slate-700 mb-2" />
                  <p className="font-bold text-slate-400">Direct Chat with Admin</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Send custom inquiries, order updates, or request wholesale sample photos.
                  </p>
                </div>
              )}

              {chatMessages.map(msg => {
                const isMe = msg.sender === (isAdmin ? 'admin' : 'customer');
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] py-2 px-3 rounded-2xl shadow-sm ${
                      isMe 
                        ? 'bg-amber-500 text-black rounded-tr-sm font-medium' 
                        : 'bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700'
                    }`}>
                      {msg.text && <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                      {msg.imageUri && (
                        <img src={msg.imageUri} alt="Uploaded" className="rounded-xl w-full object-cover mt-1 max-h-48" />
                      )}
                      {msg.audioUri && (
                        <audio controls src={msg.audioUri} className="mt-1 max-w-full h-7" />
                      )}
                      <span className={`text-[9px] block mt-1 text-right ${isMe ? 'text-black/60 font-mono' : 'text-slate-400 font-mono'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Mic Notice */}
            {micNotice && (
              <div className="bg-amber-950/80 border-t border-amber-500/30 px-3 py-1.5 text-[11px] text-amber-300 flex items-center justify-between flex-shrink-0">
                <span>{micNotice}</span>
                <button onClick={() => setMicNotice(null)} className="text-amber-400 hover:text-white font-bold ml-2">×</button>
              </div>
            )}

            {/* Chat Input Bar */}
            <div className="p-3 bg-slate-800 border-t border-slate-700 flex items-end gap-2 flex-shrink-0">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={chatFileInputRef}
                onChange={handleChatImageUpload}
              />
              <button 
                onClick={() => chatFileInputRef.current?.click()}
                className="p-2.5 rounded-xl bg-slate-700 text-slate-300 hover:text-amber-400 transition flex-shrink-0"
                title="Send Photo"
              >
                <ImageIcon size={18} />
              </button>
              
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Type your inquiry here..."
                className="flex-1 bg-slate-900 border border-slate-600 rounded-xl p-2.5 text-xs text-white resize-none h-[42px] max-h-28 focus:outline-none focus:border-amber-400 scrollbar-thin"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendText();
                  }
                }}
              />

              {text.trim() ? (
                <button 
                  onClick={handleSendText}
                  className="p-2.5 rounded-xl bg-amber-500 text-black hover:bg-amber-400 transition shadow-lg flex-shrink-0"
                >
                  <Send size={18} />
                </button>
              ) : (
                <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-2.5 rounded-xl transition shadow-lg flex-shrink-0 ${
                    isRecording 
                      ? 'bg-red-500 animate-pulse text-white' 
                      : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                  }`}
                  title={isRecording ? 'Stop Recording' : 'Record Voice Note'}
                >
                  {isRecording ? <Square size={18} fill="currentColor" /> : <Mic size={18} />}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
