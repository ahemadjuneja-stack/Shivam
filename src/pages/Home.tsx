import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Minus, 
  Volume2, 
  VolumeX, 
  ArrowLeft, 
  Check
} from 'lucide-react';
import { CatalogPhoto } from '../types';

export function Home() {
  const categories = useAppStore(state => state.categories);
  const subCategories = useAppStore(state => state.subCategories);
  const photos = useAppStore(state => state.photos);
  const cart = useAppStore(state => state.cart);
  const setItemQuantity = useAppStore(state => state.setItemQuantity);

  const activeCategoryId = useAppStore(state => state.activeCategoryId);
  const activeSubCategoryId = useAppStore(state => state.activeSubCategoryId);
  const setActiveCategory = useAppStore(state => state.setActiveCategory);
  const setActiveSubCategory = useAppStore(state => state.setActiveSubCategory);
  const setShowroomScreenMode = useAppStore(state => state.setShowroomScreenMode);

  // Screen modes: 'home' | 'subcategories' | 'gallery' | 'fullimage'
  const [screenMode, setScreenMode] = useState<'home' | 'subcategories' | 'gallery' | 'fullimage'>('home');
  const [selectedPhoto, setSelectedPhoto] = useState<CatalogPhoto | null>(null);

  // Filtered lists
  const currentCategory = categories.find(c => c.id === activeCategoryId) || categories[0];
  const categorySubList = subCategories.filter(s => s.categoryId === activeCategoryId);
  const galleryPhotos = photos.filter(p => p.subCategoryId === activeSubCategoryId);
  const activePhotoIndex = selectedPhoto ? galleryPhotos.findIndex(p => p.id === selectedPhoto.id) : 0;

  // Video slide reel (all photos with videos in 16:9 HDTV)
  const videoList = photos.filter(p => !!p.videoUri);
  const [videoSlideIdx, setVideoSlideIdx] = useState(0);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Feedback notification
  const [qtyFeedback, setQtyFeedback] = useState<string | null>(null);

  // Auto-slide video on the left side every 6.5s
  useEffect(() => {
    if (videoList.length <= 1) return;
    const interval = setInterval(() => {
      setVideoSlideIdx(prev => (prev + 1) % videoList.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [videoList.length]);

  const activeVideoPhoto = videoList[videoSlideIdx] || videoList[0];

  // 1. Select category from Home -> opens subcategory view
  const handleSelectCategory = (catId: string) => {
    setActiveCategory(catId);
    setScreenMode('subcategories');
    setShowroomScreenMode('subcategories');
  };

  // 2. Select subcategory -> opens gallery view
  const handleSelectSubCategory = (subId: string) => {
    setActiveSubCategory(subId);
    setScreenMode('gallery');
    setShowroomScreenMode('gallery');
  };

  // 3. Select product photo -> opens full image view
  const handleOpenFullImage = (photo: CatalogPhoto) => {
    setSelectedPhoto(photo);
    setScreenMode('fullimage');
    setShowroomScreenMode('fullimage');
  };

  // Next & Prev slide in Full Image mode
  const handleNextPhoto = () => {
    if (galleryPhotos.length === 0) return;
    const nextIdx = (activePhotoIndex + 1) % galleryPhotos.length;
    setSelectedPhoto(galleryPhotos[nextIdx]);
  };

  const handlePrevPhoto = () => {
    if (galleryPhotos.length === 0) return;
    const prevIdx = (activePhotoIndex - 1 + galleryPhotos.length) % galleryPhotos.length;
    setSelectedPhoto(galleryPhotos[prevIdx]);
  };

  // Keyboard navigation for full image
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screenMode === 'fullimage') {
        if (e.key === 'ArrowRight') handleNextPhoto();
        if (e.key === 'ArrowLeft') handlePrevPhoto();
        if (e.key === 'Escape') {
          setScreenMode('gallery');
          setShowroomScreenMode('gallery');
        }
      } else if (screenMode === 'gallery') {
        if (e.key === 'Escape') {
          setScreenMode('subcategories');
          setShowroomScreenMode('subcategories');
        }
      } else if (screenMode === 'subcategories') {
        if (e.key === 'Escape') {
          setScreenMode('home');
          setShowroomScreenMode('home');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Get current quantity for a photo's option letter from cart
  const getOptionQty = (photoId: string, optionLetter: string, defaultQty: number) => {
    const item = cart.find(c => c.photoId === photoId && c.optionLetter === optionLetter);
    return item ? item.quantity : defaultQty;
  };

  // Update quantity directly (No cart button required!)
  const handleUpdateQty = (photo: CatalogPhoto, option: string, newQty: number) => {
    const finalQty = Math.max(0, newQty);
    setItemQuantity(photo, option, finalQty);
    setQtyFeedback(`${option}: ${finalQty}`);
    setTimeout(() => setQtyFeedback(null), 1200);
  };

  // Batch increment/decrement all options together
  const handleBatchAll = (photo: CatalogPhoto, delta: number) => {
    const options = ['A', 'B', 'C', 'D'].slice(0, photo.itemCount);
    options.forEach(opt => {
      const isAvailable = photo[`${opt.toLowerCase()}Available` as keyof typeof photo];
      if (isAvailable) {
        const current = getOptionQty(photo.id, opt, photo.defaultQuantity);
        handleUpdateQty(photo, opt, Math.max(0, current + delta));
      }
    });
  };

  const letterBadgeColors: Record<string, { bg: string; text: string }> = {
    A: { bg: 'bg-amber-400', text: 'text-black' },
    B: { bg: 'bg-sky-400', text: 'text-black' },
    C: { bg: 'bg-emerald-400', text: 'text-black' },
    D: { bg: 'bg-fuchsia-400', text: 'text-white' }
  };

  /* -----------------------------------------------------------------------------------
     VIEW 1: HOME PAGE (LEFT HDTV 16:9 VIDEO SLIDE, RIGHT ONLY CATEGORY THUMBNAILS!)
     * Category me sirf thumbnail ki image aayegi! No subcategories on Home!
     ----------------------------------------------------------------------------------- */
  if (screenMode === 'home') {
    return (
      <div className="w-full h-full flex flex-row gap-3 overflow-hidden select-none items-center">
        
        {/* LEFT 50%: HDTV 16:9 VIDEO SLIDE ONLY */}
        <div className="w-1/2 h-full flex items-center justify-center bg-black/40 rounded-2xl border border-slate-800/80 p-2 overflow-hidden shadow-2xl">
          <div className="w-full aspect-video max-h-full rounded-xl overflow-hidden bg-black relative border border-slate-800 shadow-xl flex items-center justify-center group">
            {activeVideoPhoto?.videoUri ? (
              <>
                <video
                  ref={videoRef}
                  key={activeVideoPhoto.videoUri}
                  src={activeVideoPhoto.videoUri}
                  autoPlay
                  loop
                  muted={isVideoMuted}
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Video Slide Chevrons */}
                {videoList.length > 1 && (
                  <>
                    <button
                      onClick={() => setVideoSlideIdx(prev => (prev - 1 + videoList.length) % videoList.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition hover:scale-105 active:scale-95 z-10"
                      title="Previous"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={() => setVideoSlideIdx(prev => (prev + 1) % videoList.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition hover:scale-105 active:scale-95 z-10"
                      title="Next"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}

                {/* Mute/Unmute */}
                <button
                  onClick={() => setIsVideoMuted(!isVideoMuted)}
                  className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-black/70 hover:bg-black text-white backdrop-blur-md border border-white/20 transition z-10"
                >
                  {isVideoMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                </button>

                {/* Slide Dots */}
                {videoList.length > 1 && (
                  <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/15 flex items-center gap-1.5 z-10">
                    {videoList.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setVideoSlideIdx(i)}
                        className={`h-1.5 rounded-full transition-all ${
                          i === videoSlideIdx ? 'w-4 bg-brand-gold' : 'w-1.5 bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>

        {/* RIGHT 50%: SIRF CATEGORY THUMBNAIL IMAGES (3 MAIN CATEGORIES IN 16:9) */}
        <div className="w-1/2 h-full rounded-2xl bg-slate-900/90 border border-slate-800 p-3 overflow-y-auto scrollbar-thin shadow-2xl flex flex-col justify-center gap-3">
          {categories.map(cat => {
            const count = subCategories.filter(s => s.categoryId === cat.id).length;

            return (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat.id)}
                className="group relative w-full aspect-video max-h-[140px] rounded-xl overflow-hidden bg-slate-950 border-2 border-slate-800 hover:border-brand-gold transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-xl flex items-end text-left"
              >
                {/* Strict 16:9 Category Thumbnail Image */}
                <img
                  src={cat.thumbnailUrl}
                  alt={cat.displayName}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Subtle Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

                {/* Minimalist Title on Thumbnail */}
                <div className="relative z-10 p-3 flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shadow" 
                      style={{ backgroundColor: cat.accentColorHex }} 
                    />
                    <span className="text-sm font-black text-white group-hover:text-brand-gold tracking-wide">
                      {cat.displayName}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-300 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/15">
                    {count} Folders
                  </span>
                </div>
              </button>
            );
          })}
        </div>

      </div>
    );
  }

  /* -----------------------------------------------------------------------------------
     VIEW 2: SUBCATEGORIES VIEW
     * User requirement:
       "subcatagory ke andar sirf thumbnail aur uske niche subcatagory ka naam show hona chahye,
        upar ka baar nahi show hona chahye shivam ka logo cart ka logo ye kuch nahi aana chahye"
     ----------------------------------------------------------------------------------- */
  if (screenMode === 'subcategories') {
    return (
      <div className="w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none">
        
        {/* Minimal Navigation: Clean Back Button only (NO Shivam logo, NO Cart logo, NO clutter) */}
        <div className="px-3 py-2 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/40 flex-shrink-0">
          <button
            onClick={() => {
              setScreenMode('home');
              setShowroomScreenMode('home');
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-800/90 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition active:scale-95 border border-slate-700/60 shadow-sm"
          >
            <ArrowLeft size={16} className="text-brand-gold" />
            <span>Categories</span>
          </button>

          <div className="flex items-center gap-2">
            <span 
              className="w-2 h-2 rounded-full shadow" 
              style={{ backgroundColor: currentCategory?.accentColorHex }} 
            />
            <span className="text-xs font-bold text-slate-300">
              {currentCategory?.displayName}
            </span>
          </div>
        </div>

        {/* Subcategories Grid: Sirf Thumbnail aur uske Niche Subcategory ka Naam */}
        <div className="flex-1 p-4 overflow-y-auto scrollbar-thin">
          <div className="grid grid-cols-3 gap-4 max-w-5xl mx-auto">
            {categorySubList.map((sub) => (
              <button
                key={sub.id}
                onClick={() => handleSelectSubCategory(sub.id)}
                className="group flex flex-col gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-95 text-center focus:outline-none"
              >
                {/* 1. Strict 16:9 Thumbnail Image (Pure image, no text/folder icons over it) */}
                <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-900 border-2 border-slate-800 group-hover:border-brand-gold transition-colors shadow-lg">
                  <img
                    src={sub.thumbnailUrl}
                    alt={sub.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* 2. Uske Niche Subcategory ka Naam */}
                <span className="text-xs sm:text-sm font-bold text-slate-200 group-hover:text-brand-gold tracking-wide truncate px-1">
                  {sub.name}
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>
    );
  }

  /* -----------------------------------------------------------------------------------
     VIEW 3: SUBCATEGORY GALLERY VIEW (Products in Strict 16:9 HDTV)
     ----------------------------------------------------------------------------------- */
  if (screenMode === 'gallery') {
    const activeSub = subCategories.find(s => s.id === activeSubCategoryId);

    return (
      <div className="w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none">
        
        {/* Minimal Navigation */}
        <div className="px-3 py-2 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/40 flex-shrink-0">
          <button
            onClick={() => {
              setScreenMode('subcategories');
              setShowroomScreenMode('subcategories');
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-800/90 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition active:scale-95 border border-slate-700/60 shadow-sm"
          >
            <ArrowLeft size={16} className="text-brand-gold" />
            <span>Subcategories</span>
          </button>

          <div className="text-xs font-bold text-brand-gold">
            {activeSub?.name}
          </div>
        </div>

        {/* Gallery Grid (Strict 16:9 HDTV Thumbnails, ZERO ABCD badges on top!) */}
        <div className="flex-1 p-3 overflow-y-auto scrollbar-thin">
          <div className="grid grid-cols-3 gap-3 max-w-5xl mx-auto">
            {galleryPhotos.map((photo) => {
              const orderedItems = cart.filter(c => c.photoId === photo.id);
              const totalPiecesOrdered = orderedItems.reduce((sum, item) => sum + item.quantity, 0);

              return (
                <div
                  key={photo.id}
                  onClick={() => handleOpenFullImage(photo)}
                  className="group relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-brand-gold cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-lg flex items-center justify-center"
                >
                  {/* Clean 16:9 Photo without any ABCD overlay */}
                  <img
                    src={photo.imageUri}
                    alt={photo.photoCode}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Subtle Photo Code Badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold text-white border border-white/10">
                    {photo.photoCode}
                  </div>

                  {/* Ordered Badge if already in cart */}
                  {totalPiecesOrdered > 0 && (
                    <div className="absolute top-2 right-2 bg-emerald-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                      <Check size={10} />
                      <span>{totalPiecesOrdered} pcs</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    );
  }

  /* -----------------------------------------------------------------------------------
     VIEW 4: FULL IMAGE VIEW (16:9 Image on Left, Dedicated SIDE PANEL with ABCD on Right)
     Product ke upar ABCD NAHI aayegi, ABCD dedicated Side Panel me rahegi!
     ----------------------------------------------------------------------------------- */
  const photo = selectedPhoto || galleryPhotos[0];

  return (
    <div className="w-full h-full flex flex-row gap-2.5 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl p-2 select-none items-stretch">
      
      {/* LEFT/CENTER: 16:9 HDTV PRODUCT IMAGE (100% Clean, NO ABCD on top!) */}
      <div className="flex-1 h-full rounded-xl bg-black border border-slate-800/80 overflow-hidden relative flex items-center justify-center">
        
        {/* Strict 16:9 HDTV Big Photo */}
        <div className="w-full aspect-video max-h-full relative flex items-center justify-center overflow-hidden">
          <img
            key={photo?.imageUri}
            src={photo?.imageUri}
            alt={photo?.photoCode}
            className="w-full h-full object-cover"
          />

          {/* Slide Navigation Left Arrow */}
          {galleryPhotos.length > 1 && (
            <button
              onClick={handlePrevPhoto}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-md border border-white/20 hover:border-brand-gold transition-transform hover:scale-105 active:scale-95 z-10 shadow-2xl"
              title="Previous"
            >
              <ChevronLeft size={22} />
            </button>
          )}

          {/* Slide Navigation Right Arrow */}
          {galleryPhotos.length > 1 && (
            <button
              onClick={handleNextPhoto}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-md border border-white/20 hover:border-brand-gold transition-transform hover:scale-105 active:scale-95 z-10 shadow-2xl"
              title="Next"
            >
              <ChevronRight size={22} />
            </button>
          )}

          {/* Slide Dots at bottom of 16:9 frame */}
          {galleryPhotos.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/15 flex items-center gap-1.5 z-10">
              {galleryPhotos.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPhoto(p)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === activePhotoIndex ? 'w-4 bg-brand-gold' : 'w-1.5 bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Back Button to return to Gallery */}
        <button
          onClick={() => {
            setScreenMode('gallery');
            setShowroomScreenMode('gallery');
          }}
          className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black text-white backdrop-blur-md border border-white/20 text-xs font-bold transition active:scale-95 z-20 shadow-lg"
        >
          <ArrowLeft size={14} className="text-brand-gold" />
          <span>Gallery</span>
        </button>

        {/* Photo Code */}
        <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/20 text-xs font-mono font-black text-brand-gold shadow-lg z-20">
          {photo?.photoCode} • ({activePhotoIndex + 1}/{galleryPhotos.length})
        </div>

        {/* Feedback Toast */}
        {qtyFeedback && (
          <div className="absolute bottom-3 right-3 z-30 bg-emerald-500 text-black font-black text-xs px-2.5 py-1 rounded-lg shadow-xl flex items-center gap-1 backdrop-blur-md animate-fadeIn">
            <Check size={12} />
            <span>{qtyFeedback}</span>
          </div>
        )}

      </div>

      {/* RIGHT: DEDICATED SIDE PANEL FOR ABCD (Not on top of the product!) */}
      {photo && (
        <div className="w-56 h-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 flex flex-col justify-between shadow-xl flex-shrink-0">
          
          <div className="flex flex-col gap-2">
            <div className="text-center pb-1 border-b border-slate-800">
              <span className="text-[11px] font-mono font-bold text-slate-400">Options</span>
            </div>

            {/* ABCD Stepper Options */}
            {['A', 'B', 'C', 'D'].slice(0, photo.itemCount).map(option => {
              const isAvailable = photo[`${option.toLowerCase()}Available` as keyof typeof photo];
              const currentQty = getOptionQty(photo.id, option, photo.defaultQuantity);
              const badge = letterBadgeColors[option];

              if (!isAvailable) {
                return (
                  <div 
                    key={option} 
                    className="flex items-center justify-between p-1 rounded-lg bg-slate-950/60 border border-slate-800/80 opacity-40"
                  >
                    <div className="w-7 h-7 rounded-md bg-slate-800 text-slate-500 font-black text-xs flex items-center justify-center">
                      {option}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono px-2">OUT</span>
                  </div>
                );
              }

              return (
                <div
                  key={option}
                  className="flex items-center justify-between p-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-brand-gold/60 transition shadow-sm"
                >
                  {/* Letter Badge */}
                  <div 
                    className={`w-7 h-7 rounded-lg ${badge.bg} ${badge.text} font-black text-xs flex items-center justify-center shadow flex-shrink-0`}
                  >
                    {option}
                  </div>

                  {/* (-) Count (+) Stepper */}
                  <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg overflow-hidden">
                    <button
                      onClick={() => handleUpdateQty(photo, option, currentQty - (photo.defaultQuantity >= 12 ? 6 : 1))}
                      className="w-6 h-7 text-slate-300 hover:text-white flex items-center justify-center transition hover:bg-slate-800 active:scale-90"
                      title="Minus"
                    >
                      <Minus size={11} />
                    </button>

                    <span className="w-8 text-center font-mono font-black text-xs text-brand-gold select-none">
                      {currentQty}
                    </span>

                    <button
                      onClick={() => handleUpdateQty(photo, option, currentQty + (photo.defaultQuantity >= 12 ? 6 : 1))}
                      className="w-6 h-7 text-slate-300 hover:text-white flex items-center justify-center transition hover:bg-slate-800 active:scale-90"
                      title="Plus"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Batch Steppers */}
          <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5">
            <button
              onClick={() => handleBatchAll(photo, -(photo.defaultQuantity >= 12 ? 6 : 1))}
              className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition flex items-center justify-center gap-1 active:scale-95 border border-slate-700"
            >
              <Minus size={10} />
              <span>ALL</span>
            </button>
            <button
              onClick={() => handleBatchAll(photo, (photo.defaultQuantity >= 12 ? 6 : 1))}
              className="flex-1 py-1.5 rounded-lg bg-brand-gold hover:bg-brand-gold-light text-black text-[10px] font-black transition flex items-center justify-center gap-1 active:scale-95 shadow-md"
            >
              <Plus size={10} />
              <span>ALL</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
