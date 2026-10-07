import React, { useState } from 'react';
import { useAppStore } from '../store';
import { CommunityPost } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { BrandLogo } from './BrandLogo';
import { 
  Image as ImageIcon, 
  Send, 
  Plus, 
  X, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  MessageSquare, 
  Megaphone, 
  Radio, 
  Store, 
  Clock, 
  CheckCircle2,
  ExternalLink,
  Filter
} from 'lucide-react';

interface CommunityMediaInboxProps {
  onClose: () => void;
  onOpenChatWithCustomer?: (customerCode: string) => void;
}

export const CommunityMediaInbox: React.FC<CommunityMediaInboxProps> = ({
  onClose,
  onOpenChatWithCustomer
}) => {
  const { 
    communityPosts, 
    chatMessages, 
    customers, 
    addCommunityPost, 
    deleteCommunityPost
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'ALL' | 'PHOTOS' | 'ANNOUNCEMENTS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Post Form State
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImageUrl, setNewPostImageUrl] = useState('');
  const [isAnnouncement, setIsAnnouncement] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combine community_posts with image chat messages from customers into a unified media feed
  const mediaFromChat: CommunityPost[] = chatMessages
    .filter(msg => {
      const msgType = String(msg.type || '').toUpperCase();
      const img = msg.mediaUrl || msg.imageUri || msg.imageUrl || msg.image || '';
      const audio = msg.audioUri || msg.audioUrl || msg.mediaUrl || msg.voiceNoteUrl || '';
      return Boolean(img || (msgType === 'IMAGE') || (msgType === 'VOICE' && msg.sender === 'CUSTOMER') || (audio && msg.sender === 'CUSTOMER'));
    })
    .map(msg => {
      const msgType = String(msg.type || '').toUpperCase();
      const img = msg.mediaUrl || msg.imageUri || msg.imageUrl || msg.image || (msgType === 'IMAGE' ? msg.content : '') || '';
      const audio = msg.audioUri || msg.audioUrl || msg.mediaUrl || msg.voiceNoteUrl || (msgType === 'VOICE' ? msg.content : '') || '';
      const customer = customers.find(c => c.customerCode === msg.customerCode);
      return {
        id: `chat-${msg.id}`,
        customerCode: msg.customerCode,
        shopName: customer?.shopName || `Customer ${msg.customerCode}`,
        authorName: customer?.contactPerson || 'Customer',
        cityName: customer?.cityName || 'Gujarat',
        imageUrl: img || undefined,
        voiceNoteUrl: audio || undefined,
        text: img ? 'Sent via Customer WhatsApp Chat' : 'Customer Voice Recording',
        timestamp: msg.timestamp,
        type: img ? 'PHOTO' : 'CUSTOMER_POST',
        isAnnouncement: false
      };
    });

  // Merge and deduplicate
  const allFeedItems = [...communityPosts, ...mediaFromChat].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  // Filter items
  const filteredItems = allFeedItems.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (item.shopName && item.shopName.toLowerCase().includes(q)) ||
      (item.text && item.text.toLowerCase().includes(q)) ||
      (item.caption && item.caption.toLowerCase().includes(q)) ||
      (item.cityName && item.cityName.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (activeTab === 'PHOTOS') {
      return !!item.imageUrl || !!item.imageUri;
    }
    if (activeTab === 'ANNOUNCEMENTS') {
      return item.isAnnouncement || item.type === 'ADMIN_ANNOUNCEMENT';
    }
    return true;
  });

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() && !newPostImageUrl.trim()) return;

    setIsSubmitting(true);
    try {
      const newPost: CommunityPost = {
        id: `post-${Date.now()}`,
        customerCode: 'ADMIN',
        shopName: isAnnouncement ? 'SHIVAM WHOLESALE (ADMIN)' : 'Wholesale Admin Desk',
        authorName: 'Admin Desk',
        cityName: 'Rajkot Head Office',
        text: newPostContent.trim(),
        caption: newPostTitle.trim() || undefined,
        imageUrl: newPostImageUrl.trim() || undefined,
        timestamp: Date.now(),
        type: isAnnouncement ? 'ADMIN_ANNOUNCEMENT' : 'PHOTO',
        isAnnouncement: isAnnouncement
      };

      addCommunityPost(newPost);

      // Reset form
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostImageUrl('');
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating post:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageZoom = (url: string) => {
    setSelectedImage(url);
    setZoomScale(1);
  };

  const formatTimestamp = (ts: number) => {
    if (!ts) return 'Recent';
    const date = new Date(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return `Today at ${timeStr}`;
    }
    return `${date.toLocaleDateString([], { day: 'numeric', month: 'short' })} • ${timeStr}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#0b1329] border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
              <Radio size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Community & Media Inbox
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-bold flex items-center gap-1 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Sync (community_posts)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                WhatsApp-style customer media feed & admin broadcasts synced live across all wholesale customer apps.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <BrandLogo size="sm" />
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition active:scale-95"
            >
              <Plus size={15} />
              <span>Post Broadcast / Offer</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Close Panel"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter and Tab Navigation */}
        <div className="px-5 py-3 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'ALL'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>All Media ({allFeedItems.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('PHOTOS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'PHOTOS'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ImageIcon size={13} />
              <span>Customer Photos</span>
            </button>
            <button
              onClick={() => setActiveTab('ANNOUNCEMENTS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'ANNOUNCEMENTS'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Megaphone size={13} />
              <span>Admin Broadcasts</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search posts or shop names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950/90 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/80"
            />
            <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          </div>
        </div>

        {/* Live Feed Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar bg-slate-950/40">
          {filteredItems.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500">
              <Radio size={48} className="text-slate-700 mb-3 animate-pulse" />
              <p className="text-sm font-bold text-slate-400">No media posts in this stream</p>
              <p className="text-xs text-slate-600 mt-1 max-w-sm">
                Incoming customer WhatsApp photos and broadcast announcements will appear live here in real-time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((post) => {
                const isFromAdmin = post.isAnnouncement || post.customerCode === 'ADMIN';
                const photoSrc = post.imageUrl || post.imageUri;

                return (
                  <div
                    key={post.id}
                    className={`rounded-2xl border flex flex-col justify-between overflow-hidden shadow-lg transition duration-150 ${
                      isFromAdmin 
                        ? 'bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border-amber-500/30 hover:border-amber-500/50' 
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Header: Shop Name, Author, Timestamp */}
                    <div className="p-3.5 border-b border-slate-800/80 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                          isFromAdmin 
                            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' 
                            : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        }`}>
                          {isFromAdmin ? <Megaphone size={16} /> : <Store size={16} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white tracking-wide truncate max-w-[200px]">
                              {post.shopName}
                            </h4>
                            {isFromAdmin && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                                BROADCAST
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <Clock size={11} className="text-slate-500" />
                            <span>{formatTimestamp(post.timestamp)}</span>
                            {post.cityName && <span>• {post.cityName}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Post Actions */}
                      <div className="flex items-center gap-1">
                        {post.customerCode && post.customerCode !== 'ADMIN' && onOpenChatWithCustomer && (
                          <button
                            onClick={() => onOpenChatWithCustomer(post.customerCode!)}
                            className="p-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 text-xs transition"
                            title="Reply to Customer via Chat"
                          >
                            <MessageSquare size={13} />
                          </button>
                        )}

                        {!post.id.startsWith('chat-') && (
                          <button
                            onClick={() => deleteCommunityPost(post.id)}
                            className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800/40 text-red-300 text-xs transition"
                            title="Delete Post"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="p-3.5 space-y-3">
                      {/* Text Note / Caption */}
                      {(post.text || post.caption) && (
                        <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                          {post.caption && <strong className="block text-amber-300 mb-1">{post.caption}</strong>}
                          {post.text}
                        </p>
                      )}

                      {/* Voice Note Player */}
                      {post.voiceNoteUrl && (
                        <div className="pt-1">
                          <AudioPlayer url={post.voiceNoteUrl} title="Customer Audio Note" compact={false} />
                        </div>
                      )}

                      {/* Photo Preview */}
                      {photoSrc && (
                        <div 
                          onClick={() => handleImageZoom(photoSrc)}
                          className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 cursor-pointer group/img aspect-video flex items-center justify-center"
                        >
                          <img 
                            src={photoSrc} 
                            alt="Media Preview" 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <span className="px-3 py-1.5 rounded-lg bg-black/80 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm">
                              <ZoomIn size={14} />
                              <span>Click to Zoom</span>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Info */}
                    <div className="px-3.5 py-2 bg-slate-950/50 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <CheckCircle2 size={12} className="text-emerald-400" />
                        <span>Firestore Synced</span>
                      </span>
                      {photoSrc && (
                        <button
                          onClick={() => handleImageZoom(photoSrc)}
                          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold"
                        >
                          <ZoomIn size={12} />
                          <span>Full Screen</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Create Broadcast / Announcement */}
        {showCreateModal && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0b1329] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Megaphone size={16} className="text-emerald-400" />
                  <span>Create Community Broadcast / Announcement</span>
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="p-5 space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Broadcast Title (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 🌟 New Diwali Stock Arrival or Flash Offer"
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Announcement Message / Description *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Type details for wholesale shops: new product arrivals, minimum order discounts, transport details..."
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-400 custom-scrollbar resize-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Image URL (Optional showcase photo)</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or cloud image link"
                    value={newPostImageUrl}
                    onChange={(e) => setNewPostImageUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isAnnouncementCheck"
                    checked={isAnnouncement}
                    onChange={(e) => setIsAnnouncement(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <label htmlFor="isAnnouncementCheck" className="text-slate-300 select-none cursor-pointer font-medium">
                    Highlight as Official Admin Announcement to all customer devices
                  </label>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition active:scale-95"
                  >
                    <Send size={14} />
                    <span>{isSubmitting ? 'Broadcasting...' : 'Publish to Feed'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: High-Res Image Zoom Viewer */}
        {selectedImage && (
          <div 
            className="fixed inset-0 z-70 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            {/* Top Toolbar */}
            <div 
              className="absolute top-4 right-4 flex items-center gap-2 z-10 bg-slate-900/80 border border-slate-700 p-1.5 rounded-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setZoomScale(s => Math.min(s + 0.3, 3))}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={() => setZoomScale(s => Math.max(s - 0.3, 0.5))}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <a
                href={selectedImage}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
                title="Open in new tab"
              >
                <ExternalLink size={16} />
              </a>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Image Stage */}
            <div 
              className="max-w-4xl max-h-[80vh] overflow-auto flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage}
                alt="Full View"
                style={{ transform: `scale(${zoomScale})`, transition: 'transform 0.15s ease-out' }}
                className="rounded-xl shadow-2xl max-w-full max-h-[75vh] object-contain border border-slate-700"
              />
            </div>
            
            <p className="text-slate-400 text-xs mt-3 select-none">
              Click anywhere outside or press Close to return
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
