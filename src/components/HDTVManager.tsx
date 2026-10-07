import React, { useState, useEffect } from 'react';
import { ArrowLeft, Tv, Upload, Trash2, Play, Check } from 'lucide-react';
import { useAppStore } from '../store';
import { setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { uploadDashboardMedia } from '../services/storageService';
import { migrateOldVideos } from '../services/migrateOldVideos';
import { ShowroomVideo } from '../types';
import { BrandLogo } from './BrandLogo';

interface HDTVManagerProps {
  onClose: () => void;
}

export const HDTVManager: React.FC<HDTVManagerProps> = ({ onClose }) => {
  const { showroomVideos, setShowroomVideos } = useAppStore();
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    migrateOldVideos().catch(err => console.warn('Migration check:', err));
  }, []);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (showroomVideos.length >= 4) {
      alert('Maximum 4 HDTV showroom videos allowed.');
      return;
    }

    setIsUploading(true);
    try {
      const videoId = `v_${Date.now()}`;
      const videoUrl = await uploadDashboardMedia(file, 'showroom_videos', videoId);
      
      const newVideo: ShowroomVideo = {
        id: videoId,
        title: file.name.replace(/\.[^/.]+$/, ''),
        videoUri: videoUrl,
        videoUrl: videoUrl,
        imageUri: '',
        posterUrl: '',
        quantity: 0,
        orderQuantity: '0',
        sortOrder: showroomVideos.length + 1,
        uploadedAt: Date.now(),
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'showroomVideos', videoId), newVideo, { merge: true });
      setShowroomVideos([...showroomVideos, newVideo]);
      showToastMsg('Showroom video uploaded successfully!');
    } catch (err) {
      console.error('Failed to upload video:', err);
      alert('Failed to upload video file.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!window.confirm('Delete this showroom video slide?')) return;
    try {
      await deleteDoc(doc(db, 'showroomVideos', videoId));
      setShowroomVideos(showroomVideos.filter(v => v.id !== videoId));
      showToastMsg('Showroom video deleted.');
    } catch (err) {
      console.error('Failed to delete video:', err);
      alert('Failed to delete showroom video.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#040812] text-slate-100 flex flex-col h-full w-full overflow-hidden select-none animate-in fade-in duration-200">
      <header className="bg-[#0B1120] border-b border-[#334155]/60 px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 transition flex items-center gap-2 text-sm font-bold shadow-md border border-slate-700/80"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <BrandLogo size="sm" />
          <div className="flex items-center gap-2">
            <Tv size={22} className="text-amber-400" />
            <h2 className="text-sm sm:text-base font-black tracking-wide text-white uppercase font-mono">
              📺 HDTV SHOWROOM VIDEO REEL MANAGER
            </h2>
          </div>
        </div>

        <span className="text-[11px] font-mono text-amber-400 font-bold bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
          {showroomVideos.length} / 4 Videos
        </span>
      </header>

      <main className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full space-y-4 custom-scrollbar">
        {/* Upload Action */}
        <div className="p-4 bg-[#0B1120] border border-[#334155]/60 rounded-2xl flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">Upload HDTV Showroom Video Slide</h3>
            <p className="text-[11px] text-slate-400">Promotional MP4 / WebM videos displayed in digital showroom loop (Max 4).</p>
          </div>

          <label className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-2 ${
            showroomVideos.length >= 4 || isUploading 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
          }`}>
            <Upload size={14} />
            <span>{isUploading ? 'Uploading...' : 'Upload Video Slide'}</span>
            <input 
              type="file" 
              accept="video/*" 
              onChange={handleVideoUpload} 
              className="hidden" 
              disabled={showroomVideos.length >= 4 || isUploading} 
            />
          </label>
        </div>

        {/* Video Slides Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {showroomVideos.map((video, idx) => (
            <div key={video.id} className="bg-[#0B1120] border border-[#334155]/60 rounded-2xl overflow-hidden p-3 flex flex-col gap-2 relative shadow-xl">
              <div className="relative aspect-video rounded-xl bg-black overflow-hidden border border-slate-800 flex items-center justify-center">
                {video.videoUri ? (
                  <video src={video.videoUri} controls className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-500">
                    <Play size={24} />
                    <span className="text-[10px]">No Video Stream</span>
                  </div>
                )}
                <span className="absolute top-2 left-2 bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-md">
                  Slide #{idx + 1}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <input
                  type="text"
                  value={video.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    const updated = showroomVideos.map(v => v.id === video.id ? { ...v, title } : v);
                    setShowroomVideos(updated);
                    setDoc(doc(db, 'showroomVideos', video.id), { title }, { merge: true });
                  }}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white flex-1 focus:outline-none focus:border-amber-400"
                  placeholder="Video Title"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteVideo(video.id)}
                  className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs border border-red-500/30"
                  title="Delete Slide"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border border-emerald-400 shadow-2xl">
          <Check size={16} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
};
