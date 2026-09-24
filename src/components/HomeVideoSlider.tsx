import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Volume2, 
  VolumeX, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { CatalogPhoto, ShowroomVideo } from '../types';

interface HomeVideoSliderProps {
  videos: (CatalogPhoto | ShowroomVideo)[];
  onSelectPhoto?: (photo: CatalogPhoto | ShowroomVideo) => void;
}

// Helper functions for field-name compatibility across both ShowroomVideo & CatalogPhoto models
const getVideoUrl = (item: any): string => {
  return item?.videoUri || item?.videoUrl || '';
};

const getPosterUrl = (item: any): string => {
  return item?.imageUri || item?.posterUrl || item?.poster || '';
};

const getTitle = (item: any): string => {
  return item?.title || item?.photoCode || item?.name || '';
};

const getSortOrder = (item: any): number => {
  if (item?.sortOrder !== undefined && item?.sortOrder !== null && item?.sortOrder !== '') {
    const num = Number(item.sortOrder);
    if (!isNaN(num)) return num;
  }
  if (item?.orderIndex !== undefined && item?.orderIndex !== null && item?.orderIndex !== '') {
    const num = Number(item.orderIndex);
    if (!isNaN(num)) return num;
  }
  return 99999;
};

const getQuantity = (item: any): number | undefined => {
  if (item?.quantity !== undefined && item?.quantity !== null && item?.quantity !== '') {
    const num = Number(item.quantity);
    if (!isNaN(num)) return num;
  }
  if (item?.qty !== undefined && item?.qty !== null && item?.qty !== '') {
    const num = Number(item.qty);
    if (!isNaN(num)) return num;
  }
  if (item?.defaultQuantity !== undefined && item?.defaultQuantity !== null && item?.defaultQuantity !== '') {
    const num = Number(item.defaultQuantity);
    if (!isNaN(num)) return num;
  }
  return undefined;
};

export function HomeVideoSlider({ videos, onSelectPhoto }: HomeVideoSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true); // Default muted as requested
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);

  // References to video elements
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Gesture handling for finger slide & swipe
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const isDragging = useRef(false);
  const mouseStartX = useRef<number | null>(null);

  // Filter, sort by sortOrder ascending, and limit to a maximum of 4 videos
  const filteredVideos = useMemo(() => {
    return [...videos]
      .filter(v => !!getVideoUrl(v))
      .sort((a, b) => getSortOrder(a) - getSortOrder(b))
      .slice(0, 4);
  }, [videos]);

  const totalVideos = filteredVideos.length;

  // Safe navigation
  const goToNext = useCallback(() => {
    if (totalVideos === 0) return;
    setCurrentIndex((prev) => (prev + 1) % totalVideos);
  }, [totalVideos]);

  const goToPrev = useCallback(() => {
    if (totalVideos === 0) return;
    setCurrentIndex((prev) => (prev - 1 + totalVideos) % totalVideos);
  }, [totalVideos]);

  // Touch handlers for finger slide
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      touchDeltaX.current = 0;
      isDragging.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || touchStartX.current === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - (touchStartY.current ?? currentY);

    // If horizontal swipe is dominant
    if (Math.abs(diffX) > Math.abs(diffY)) {
      touchDeltaX.current = diffX;
      setDragOffset(diffX);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const delta = touchDeltaX.current;

    // Swipe threshold: 45px
    if (delta < -45) {
      goToNext();
    } else if (delta > 45) {
      goToPrev();
    }

    // Reset drag offset
    setDragOffset(0);
    touchStartX.current = null;
    touchStartY.current = null;
    touchDeltaX.current = 0;
  };

  // Mouse drag handlers for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
    isDragging.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || mouseStartX.current === null) return;
    const diffX = e.clientX - mouseStartX.current;
    setDragOffset(diffX);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (mouseStartX.current !== null) {
      const diffX = e.clientX - mouseStartX.current;
      if (diffX < -45) {
        goToNext();
      } else if (diffX > 45) {
        goToPrev();
      }
    }
    setDragOffset(0);
    mouseStartX.current = null;
  };

  // Play active video automatically on mount and when slide index changes
  useEffect(() => {
    const timer = setTimeout(() => {
      videoRefs.current.forEach((v, idx) => {
        if (!v) return;
        if (idx === currentIndex) {
          v.muted = isMuted;
          if (v.src) {
            const playPromise = v.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => setIsPlaying(true))
                .catch((err) => {
                  console.warn('Autoplay prevented or interrupted:', err);
                  // In case browser blocked audio, ensure muted
                  if (!v.muted) {
                    v.muted = true;
                    setIsMuted(true);
                    v.play().catch(() => {});
                  }
                });
            }
          }
        } else {
          try {
            v.pause();
            v.currentTime = 0;
          } catch (e) {}
        }
      });
    }, 50); // Small delay to let browser bind the src before playing
    return () => clearTimeout(timer);
  }, [currentIndex, isMuted, filteredVideos]);

  // Handle Mute / Unmute toggle
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    const activeVideo = videoRefs.current[currentIndex];
    if (activeVideo) {
      activeVideo.muted = nextMuted;
      if (!activeVideo.paused) {
        activeVideo.play().catch(() => {});
      }
    }
  };

  // Handle Play / Pause toggle
  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const activeVideo = videoRefs.current[currentIndex];
    if (activeVideo) {
      if (activeVideo.paused) {
        activeVideo.play().then(() => setIsPlaying(true)).catch(() => {});
      } else {
        activeVideo.pause();
        setIsPlaying(false);
      }
    }
  };

  // Track progress of the active video
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const target = e.currentTarget;
    if (target.duration) {
      setVideoProgress((target.currentTime / target.duration) * 100);
    }
  };

  // Auto-advance to next video when active video finishes
  const handleVideoEnded = () => {
    goToNext();
  };

  if (totalVideos === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/60 rounded-2xl border border-slate-800 p-4 text-center">
        <Sparkles className="w-8 h-8 text-brand-gold mb-2 animate-pulse" />
        <p className="text-sm font-bold text-slate-300">Loading catalog videos...</p>
      </div>
    );
  }

  const currentPhoto = filteredVideos[currentIndex];
  const qty = currentPhoto ? getQuantity(currentPhoto) : undefined;
  const hasOrderOption = qty !== undefined && !isNaN(qty) && qty >= 1;

  return (
    <div 
      className="relative w-full h-full flex flex-col justify-between overflow-hidden rounded-2xl bg-black border border-slate-800/90 shadow-2xl select-none group touch-pan-y"
      style={{ touchAction: 'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (isDragging.current) {
          isDragging.current = false;
          setDragOffset(0);
        }
      }}
    >
      {/* ----------------- SLIDER TRACK ----------------- */}
      <div 
        className="relative w-full h-full flex"
        style={{
          transform: `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))`,
          transition: isDragging.current ? 'none' : 'transform 400ms cubic-bezier(0.25, 1, 0.5, 1)'
        }}
      >
        {filteredVideos.map((photo, index) => {
          const isCurrent = index === currentIndex;
          const videoUrl = getVideoUrl(photo);
          const posterUrl = getPosterUrl(photo);
          const title = getTitle(photo);

          return (
            <div 
              key={photo.id}
              className="relative w-full h-full flex-shrink-0 bg-black flex items-center justify-center overflow-hidden"
              style={{ width: '100%' }}
            >
              {videoUrl ? (
                <video
                  ref={(el) => {
                    videoRefs.current[index] = el;
                  }}
                  src={isCurrent ? videoUrl : undefined}
                  poster={posterUrl}
                  preload="metadata"
                  autoPlay={isCurrent}
                  playsInline
                  muted={isMuted}
                  loop={false}
                  onTimeUpdate={isCurrent ? handleTimeUpdate : undefined}
                  onEnded={isCurrent ? handleVideoEnded : undefined}
                  className="w-full h-full object-cover sm:object-contain bg-black cursor-pointer"
                  onClick={togglePlayPause}
                />
              ) : (
                <img 
                  src={posterUrl} 
                  alt={title} 
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ----------------- TOP HEADER OVERLAYS ----------------- */}
      <div className="absolute top-0 inset-x-0 p-2.5 sm:p-3 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
        </div>

        {/* UNMUTE / MUTE BUTTON (Floating & High Contrast) */}
        <button
          type="button"
          onClick={toggleMute}
          className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs shadow-xl backdrop-blur-md transition-all active:scale-95 ${
            isMuted 
              ? 'bg-red-500/90 hover:bg-red-500 text-white animate-pulse border border-white/30' 
              : 'bg-emerald-500/90 hover:bg-emerald-500 text-black font-black border border-emerald-300/40'
          }`}
          title={isMuted ? "Tap to Unmute Video" : "Mute Sound"}
        >
          {isMuted ? (
            <>
              <VolumeX size={15} />
              <span>Unmute</span>
            </>
          ) : (
            <>
              <Volume2 size={15} />
              <span>Sound On</span>
            </>
          )}
        </button>
      </div>

      {/* ----------------- LEFT & RIGHT TOUCH ARROWS ----------------- */}
      {totalVideos > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-transform active:scale-90 z-20 shadow-lg"
            title="Previous Video (Swipe Right)"
          >
            <ChevronLeft size={22} className="text-brand-gold -ml-0.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-transform active:scale-90 z-20 shadow-lg"
            title="Next Video (Swipe Left)"
          >
            <ChevronRight size={22} className="text-brand-gold -mr-0.5" />
          </button>
        </>
      )}

      {/* ----------------- BOTTOM OVERLAY: CONTROLS & PRODUCT INFO ----------------- */}
      <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-3 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-2 z-20">
        
        {/* Video Timeline Progress Bar */}
        <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
          <div 
            className="bg-brand-gold h-full transition-all duration-200"
            style={{ width: `${videoProgress}%` }}
          />
        </div>

        {/* Product Details & Actions */}
        <div className="flex items-center justify-between gap-2">
          
          {/* Left: Play/Pause button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlayPause}
              className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-sm transition active:scale-90"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
            </button>
          </div>

          {/* Right: Dot indicators and Direct Order / View Product Button */}
          <div className="flex items-center gap-2">
            {/* Dots */}
            <div className="hidden xs:flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10">
              {filteredVideos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  className={`transition-all rounded-full ${
                    idx === currentIndex 
                      ? 'w-4 h-1.5 bg-brand-gold' 
                      : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
                  }`}
                  title={`Slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Quick Order / Explore Button */}
            {onSelectPhoto && currentPhoto && hasOrderOption && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPhoto(currentPhoto);
                }}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-brand-gold hover:bg-amber-400 text-black font-black text-[11px] sm:text-xs shadow-md active:scale-95 transition"
              >
                <span>Order Now</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
