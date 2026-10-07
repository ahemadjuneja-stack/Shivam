import React from 'react';
import { Images, Image as ImageIcon } from 'lucide-react';

interface GalleryLoaderProps {
  className?: string;
}

export const GalleryLoader: React.FC<GalleryLoaderProps> = ({ className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
      <style>{`
        @keyframes galleryScalePulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.08);
          }
        }
        @keyframes filmstripPulse {
          0%, 100% {
            opacity: 0.4;
            transform: translateY(0);
          }
          50% {
            opacity: 1;
            transform: translateY(-4px);
          }
        }
      `}</style>
      
      {/* Center: lucide Images icon with scale pulse */}
      <div 
        className="text-emerald-500 flex items-center justify-center mb-6"
        style={{ animation: 'galleryScalePulse 1.6s ease-in-out infinite' }}
      >
        <Images className="w-14 h-14 text-emerald-500" />
      </div>

      {/* Row of 3 photo-frame placeholders with staggered pulse */}
      <div className="flex items-center gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-16 h-20 rounded-lg bg-slate-800/60 border border-slate-700 flex items-center justify-center shadow-lg"
            style={{
              animation: 'filmstripPulse 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`
            }}
          >
            <ImageIcon size={20} className="text-slate-500" />
          </div>
        ))}
      </div>
    </div>
  );
};
