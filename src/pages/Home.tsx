import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { 
  Plus, 
  Minus, 
  ArrowLeft, 
  Check,
  ShoppingBag
} from 'lucide-react';
import { CatalogPhoto, ShowroomVideo, getPhotoVariants } from '../types';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { HomeVideoSlider } from '../components/HomeVideoSlider';

export function Home() {
  const categories = useAppStore(state => state.categories);
  const subCategories = useAppStore(state => state.subCategories);
  const photos = useAppStore(state => state.photos);
  const showroomVideos = useAppStore(state => state.showroomVideos);
  const cart = useAppStore(state => state.cart);
  const setItemQuantity = useAppStore(state => state.setItemQuantity);
  const setIsCartOpen = useAppStore(state => state.setIsCartOpen);

  const activeCategoryId = useAppStore(state => state.activeCategoryId);
  const activeSubCategoryId = useAppStore(state => state.activeSubCategoryId);
  const setActiveCategory = useAppStore(state => state.setActiveCategory);
  const setActiveSubCategory = useAppStore(state => state.setActiveSubCategory);
  const setShowroomScreenMode = useAppStore(state => state.setShowroomScreenMode);

  // Screen modes: 'home' | 'subcategories' | 'gallery' | 'fullimage'
  const [screenMode, setScreenMode] = useState<'home' | 'subcategories' | 'gallery' | 'fullimage'>('home');
  const [selectedPhoto, setSelectedPhoto] = useState<CatalogPhoto | null>(null);
  const [endOfCategorySuggestion, setEndOfCategorySuggestion] = useState(false);

  // Filtered lists
  const currentCategory = categories.find(c => c.id === activeCategoryId) || categories[0];
  const categorySubList = subCategories.filter(s => s.categoryId === activeCategoryId);
  const galleryPhotos = photos.filter(p => p.subCategoryId === activeSubCategoryId);
  const activePhotoIndex = selectedPhoto ? galleryPhotos.findIndex(p => p.id === selectedPhoto.id) : 0;

  // Video slide reel (combine showroomVideos collection and photos with videoUri)
  const videoList: (CatalogPhoto | ShowroomVideo)[] = [
    ...(showroomVideos || []),
    ...photos.filter(p => !!p.videoUri && !showroomVideos.some(v => v.id === p.id || v.videoUri === p.videoUri))
  ];

  const [isZoomedIn, setIsZoomedIn] = useState(false);

  // Touch & Swipe gesture handling for full image
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const isMouseDown = useRef(false);
  const mouseStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isZoomedIn) return;
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isZoomedIn) return;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (isZoomedIn) return;
    if (touchStartX.current !== null && touchEndX.current !== null) {
      const diffX = touchStartX.current - touchEndX.current;
      if (diffX > 35) {
        handleNextPhoto(); // swiped left -> next photo
      } else if (diffX < -35) {
        handlePrevPhoto(); // swiped right -> prev photo
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isZoomedIn) return;
    isMouseDown.current = true;
    mouseStartX.current = e.clientX;
  };

  const handleMouseMove = () => {
    // keeping drag state active
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isZoomedIn) return;
    if (isMouseDown.current && mouseStartX.current !== null) {
      const diffX = mouseStartX.current - e.clientX;
      if (diffX > 40) {
        handleNextPhoto();
      } else if (diffX < -40) {
        handlePrevPhoto();
      }
    }
    isMouseDown.current = false;
    mouseStartX.current = null;
  };

  // Feedback notification
  const [qtyFeedback, setQtyFeedback] = useState<string | null>(null);

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
  const handleOpenFullImage = (item: CatalogPhoto | ShowroomVideo) => {
    const matchedPhoto = photos.find(p => p.id === item.id || p.photoCode === item.photoCode);
    if (matchedPhoto) {
      setSelectedPhoto(matchedPhoto);
      if (matchedPhoto.subCategoryId) {
        setActiveSubCategory(matchedPhoto.subCategoryId);
      }
    } else {
      const fallbackPhoto: CatalogPhoto = {
        id: item.id,
        categoryId: (item as any).categoryId || activeCategoryId || categories[0]?.id || '',
        subCategoryId: (item as any).subCategoryId || activeSubCategoryId || '',
        subCategoryName: item.subCategoryName || '',
        photoCode: item.photoCode || 'SHOWCASE',
        imageUri: item.imageUri || (item as any).videoUri || '',
        videoUri: (item as any).videoUri || undefined,
        itemCount: (item as any).itemCount || 4,
        aAvailable: true,
        bAvailable: true,
        cAvailable: true,
        dAvailable: true,
        defaultQuantity: 6,
        sortOrder: item.sortOrder || 0,
        description: (item as any).description || ''
      };
      setSelectedPhoto(fallbackPhoto);
    }
    setScreenMode('fullimage');
    setShowroomScreenMode('fullimage');
  };

  // Next & Prev slide in Full Image mode
  const handleNextPhoto = () => {
    if (galleryPhotos.length === 0) return;
    if (activePhotoIndex === galleryPhotos.length - 1) {
      setEndOfCategorySuggestion(true);
    } else {
      const nextIdx = activePhotoIndex + 1;
      setSelectedPhoto(galleryPhotos[nextIdx]);
    }
  };

  const handlePrevPhoto = () => {
    if (endOfCategorySuggestion) {
      setEndOfCategorySuggestion(false);
      return;
    }
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
          if (endOfCategorySuggestion) {
            setEndOfCategorySuggestion(false);
          } else {
            setScreenMode('gallery');
            setShowroomScreenMode('gallery');
          }
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
  }, [screenMode, activePhotoIndex, galleryPhotos, endOfCategorySuggestion]);

  // Get current quantity for a photo's option letter from cart
  const getOptionQty = (photoId: string, optionLetter: string) => {
    const item = cart.find(c => c.photoId === photoId && c.optionLetter === optionLetter);
    return item ? item.quantity : 0;
  };

  // Update quantity directly (No cart button required!)
  const handleUpdateQty = (photo: CatalogPhoto, option: string, newQty: number) => {
    const finalQty = Math.max(0, newQty);
    setItemQuantity(photo, option, finalQty);
    setQtyFeedback(`${option}: ${finalQty}`);
    setTimeout(() => setQtyFeedback(null), 1200);
  };

  const letterBadgeColors: Record<string, { bg: string; text: string }> = {
    A: { bg: 'bg-amber-400', text: 'text-black' },
    B: { bg: 'bg-sky-400', text: 'text-black' },
    C: { bg: 'bg-emerald-400', text: 'text-black' },
    D: { bg: 'bg-fuchsia-400', text: 'text-white' }
  };

  /* -----------------------------------------------------------------------------------
     VIEW 1: HOME PAGE (LEFT VERTICAL VIDEO SLIDE, RIGHT CATEGORY GRID)
     ----------------------------------------------------------------------------------- */
  if (screenMode === 'home') {
    return (
      <div className="w-full h-full flex flex-col landscape:flex-row gap-3 overflow-hidden select-none">
        
        {/* MULTIPLE VIDEO SLIDER (Touch/Finger Swiping, Muted by Default with Unmute Option, Instant Autoplay) */}
        <div className="w-full h-[45%] landscape:w-[65%] landscape:h-full flex-shrink-0">
          <HomeVideoSlider 
            videos={videoList} 
            onSelectPhoto={handleOpenFullImage} 
          />
        </div>

        {/* RIGHT/BOTTOM: CATEGORY GRID */}
        <div className="flex-1 w-full landscape:w-[35%] h-full rounded-2xl bg-slate-900/90 border border-slate-800 p-3 sm:p-4 shadow-2xl overflow-y-auto scroll-smooth scrollbar-thin">
          <div className="flex flex-col gap-4 pb-4">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat.id)}
                className="group w-full flex flex-col gap-3 p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/80 hover:border-brand-gold/80 transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] text-center shadow-lg focus:outline-none"
              >
                <div className="w-full aspect-[16/10] sm:aspect-video rounded-xl overflow-hidden bg-black border-2 border-slate-700/60 group-hover:border-brand-gold transition-colors shadow-inner flex items-center justify-center">
                  <img
                    src={cat.thumbnailUrl}
                    alt={cat.displayName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="flex items-center justify-center gap-2 py-1.5 flex-shrink-0">
                  <span 
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow" 
                    style={{ backgroundColor: cat.accentColorHex }} 
                  />
                  <span className="text-sm sm:text-base font-black text-slate-200 group-hover:text-brand-gold tracking-wide truncate">
                    {cat.displayName}
                  </span>
                </div>
              </button>
            ))}
          </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 landscape:grid-cols-4 gap-4 max-w-6xl mx-auto">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 landscape:grid-cols-4 gap-3 max-w-6xl mx-auto">
            {galleryPhotos.map((photo) => {
              const orderedItems = cart.filter(c => c.photoId === photo.id);
              const totalPiecesOrdered = orderedItems.reduce((sum, item) => sum + item.quantity, 0);

              return (
                <div
                  key={photo.id}
                  onClick={() => handleOpenFullImage(photo)}
                  className="group relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-brand-gold cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-lg flex items-center justify-center"
                >
                  {/* Clean 16:9 Photo without any ABCD overlay or item number */}
                  <img
                    src={photo.imageUri}
                    alt={photo.photoCode}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

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
     VIEW 4: FULL IMAGE VIEW (Clean Maximized Image on Left, Dedicated SIDE PANEL on Right)
     - Image par se arrows, dots, product number, aur gallery button hata diye gaye hain.
     - Finger se slide / swipe karne par image change hoti hai.
     - Gallery button, Product code, aur Cart icon ABCD ke panel me integrate hain.
     ----------------------------------------------------------------------------------- */
  const photo = selectedPhoto || galleryPhotos[0];

  return (
    <div className="w-full h-full flex flex-col landscape:flex-row gap-2 rounded-2xl bg-brand-navy-dark border border-slate-800 overflow-hidden shadow-2xl select-none items-stretch">
      
      {/* LEFT/CENTER: 100% CLEAN MAXIMIZED PRODUCT IMAGE WITH FINGER SLIDE SWIPE */}
      <div 
        onTouchStartCapture={handleTouchStart}
        onTouchMoveCapture={handleTouchMove}
        onTouchEndCapture={handleTouchEnd}
        onMouseDownCapture={handleMouseDown}
        onMouseMoveCapture={handleMouseMove}
        onMouseUpCapture={handleMouseUp}
        className="flex-1 h-full rounded-xl bg-brand-navy-dark overflow-hidden relative flex items-center justify-center select-none"
        title="Double tap or pinch to zoom. Swipe to change."
      >
        {endOfCategorySuggestion ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/90 text-white animate-fadeIn p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-8 text-center text-brand-gold">
              You've reached the end of this folder!
            </h2>
            
            {(() => {
              const currentCategorySubList = subCategories.filter(s => s.categoryId === activeCategoryId);
              const currentSubIdx = currentCategorySubList.findIndex(s => s.id === activeSubCategoryId);
              const nextSubCategory = currentSubIdx >= 0 && currentSubIdx < currentCategorySubList.length - 1
                  ? currentCategorySubList[currentSubIdx + 1]
                  : null;

              if (nextSubCategory) {
                return (
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-sm text-slate-400">Continue exploring:</p>
                    <button
                      onClick={() => {
                        setEndOfCategorySuggestion(false);
                        handleSelectSubCategory(nextSubCategory.id);
                      }}
                      className="group flex flex-col items-center gap-3 bg-slate-800 border border-slate-700 hover:border-brand-gold p-4 rounded-2xl transition shadow-lg active:scale-95"
                    >
                      <div className="w-40 sm:w-56 aspect-video rounded-lg overflow-hidden bg-black shadow-inner">
                        <img 
                          src={nextSubCategory.thumbnailUrl} 
                          className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                        />
                      </div>
                      <span className="font-bold text-lg text-slate-200 group-hover:text-brand-gold">
                        {nextSubCategory.name}
                      </span>
                    </button>
                  </div>
                );
              } else {
                return (
                  <div className="flex flex-col items-center gap-6">
                    <p className="text-sm text-slate-400">You've seen all folders in this category.</p>
                    <button
                      onClick={() => {
                        setEndOfCategorySuggestion(false);
                        setScreenMode('home');
                        setShowroomScreenMode('home');
                      }}
                      className="px-6 py-3 rounded-xl bg-brand-gold text-black font-bold shadow-lg hover:bg-amber-400 transition active:scale-95"
                    >
                      Back to Categories
                    </button>
                  </div>
                );
              }
            })()}

            <button
              onClick={() => setEndOfCategorySuggestion(false)}
              className="mt-8 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 hover:text-white transition shadow text-sm"
            >
              Go Back
            </button>
          </div>
        ) : (
          <TransformWrapper
            initialScale={1}
            minScale={1}
            maxScale={4}
            centerOnInit={true}
            wheel={{ step: 0.1 }}
            doubleClick={{ step: 0.5 }}
            pinch={{ step: 5 }}
            panning={{ disabled: !isZoomedIn }}
            onTransform={(ref: any) => {
              setIsZoomedIn(ref.state.scale > 1.05);
            }}
          >
            <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img
                key={photo?.imageUri}
                src={photo?.imageUri}
                alt={photo?.photoCode}
                draggable={false}
                className="w-full h-full object-contain pointer-events-auto cursor-zoom-in"
              />
            </TransformComponent>
          </TransformWrapper>
        )}

        {/* Feedback Toast */}
        {qtyFeedback && (
          <div className="absolute bottom-3 right-3 z-30 bg-emerald-500 text-black font-black text-xs px-2.5 py-1 rounded-lg shadow-xl flex items-center gap-1 backdrop-blur-md animate-fadeIn pointer-events-none">
            <Check size={12} />
            <span>{qtyFeedback}</span>
          </div>
        )}
      </div>

      {/* RIGHT: COMPACT SIDE PANEL FOR ABCD (With Gallery button, Product Code, ABCD, and Cart icon) */}
      {photo && (
        <div className="w-full landscape:w-[145px] sm:landscape:w-[160px] md:landscape:w-[175px] h-auto landscape:h-full rounded-2xl bg-slate-900 border border-slate-800 p-2 flex flex-col justify-between shadow-2xl flex-shrink-0 gap-2 landscape:gap-0 items-stretch">
          
          {/* TOP: Gallery Back Button & Product Code */}
          <div className="flex flex-row landscape:flex-col gap-2 justify-between flex-shrink-0 w-full landscape:w-auto">
            <button
              onClick={() => {
                setScreenMode('gallery');
                setShowroomScreenMode('gallery');
              }}
              className="flex-1 landscape:w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700/80 transition active:scale-95 shadow-sm"
              title="Back to Gallery"
            >
              <ArrowLeft size={13} className="text-brand-gold" />
              <span>Gallery</span>
            </button>

            {/* Product Number in ABCD Side Panel */}
            <div className="flex-1 landscape:w-full flex items-center justify-center text-center py-1.5 px-2 rounded-lg bg-black/70 border border-slate-800 font-mono font-black text-xs text-brand-gold truncate shadow-inner">
              {photo?.photoCode}
            </div>
          </div>

          {/* MIDDLE: ABCD Steppers (Enlarged, high-contrast, finger-friendly) */}
          <div className="grid grid-cols-2 landscape:flex landscape:flex-col gap-2 py-1 overflow-y-auto overflow-x-hidden scrollbar-none flex-1 content-start">
            {getPhotoVariants(photo).map((variant) => {
              const isAvailable = variant.isAvailable;
              const currentQty = getOptionQty(photo.id, variant.key);
              const minQty = variant.defaultQuantity;
              const badge = letterBadgeColors[variant.key] || { bg: 'bg-indigo-600', text: 'text-white' };

              if (!isAvailable || minQty === 0) {
                return (
                  <div 
                    key={variant.key} 
                    className="flex flex-wrap items-center justify-between p-1.5 rounded-xl bg-slate-950 border border-slate-800 transition shadow-sm gap-1.5 pointer-events-none w-full"
                  >
                    {/* Left Label Box (Variant Name): reddish tint with bold RED text */}
                    <div className="min-w-fit px-3 py-1.5 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center bg-red-950/30 border border-red-900/30 text-red-500 whitespace-nowrap">
                      {variant.label}
                    </div>

                    {/* Right Control Area: Out of Stock bright red bold pill with slow blink animation */}
                    <div className="flex-1 flex items-center justify-center px-3 py-1.5 bg-red-950/25 border border-red-900/40 rounded-lg animate-slow-blink">
                      <span className="text-xs font-black text-red-500 whitespace-nowrap">
                        Out of Stock
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={variant.key}
                  className="flex flex-wrap items-center justify-between p-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-brand-gold/60 transition shadow-sm gap-1.5"
                >
                  {/* Interactive Variant Badge (Clicking acts ONLY as CLEAR when has quantity, NEVER increments) */}
                  <button
                    onClick={() => {
                      if (currentQty > 0) {
                        handleUpdateQty(photo, variant.key, 0); // Touching label CLEARS quantity
                      }
                    }}
                    disabled={currentQty === 0}
                    className={`min-w-fit px-3 py-1.5 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center shadow transition active:scale-95 whitespace-nowrap ${
                      currentQty > 0 
                        ? `${badge.bg} ${badge.text} cursor-pointer font-black` 
                        : 'bg-[#1e293b] text-white border border-[#334155] cursor-default'
                    }`}
                    title={currentQty > 0 ? `Tap to Clear (${variant.label})` : `${variant.label} (Pack: ${minQty} pcs)`}
                  >
                    {variant.label}
                  </button>

                  {/* Compact Stepper (Strictly toggles in multiples of minQty) */}
                  <div className="flex items-center bg-slate-900 border border-slate-700/90 rounded-lg overflow-hidden justify-between flex-1">
                    {/* Big Minus Button */}
                    <button
                      onClick={() => {
                        const target = currentQty <= minQty ? 0 : currentQty - minQty;
                        handleUpdateQty(photo, variant.key, target);
                      }}
                      disabled={currentQty <= 0}
                      className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center transition rounded-l-md active:scale-90 ${
                        currentQty > 0 
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-100' 
                          : 'bg-slate-900 text-slate-600 opacity-40 cursor-not-allowed'
                      }`}
                      title="Decrease Quantity"
                    >
                      <Minus size={13} strokeWidth={3} />
                    </button>

                    {/* Centered Quantity Number */}
                    <span className="flex-1 text-center font-mono font-black text-xs sm:text-sm text-brand-gold select-none px-1">
                      {currentQty}
                    </span>

                    {/* Big Plus Button (Amber high visibility) */}
                    <button
                      onClick={() => {
                        const target = currentQty === 0 ? minQty : currentQty + minQty;
                        handleUpdateQty(photo, variant.key, target);
                      }}
                      className="w-8 h-8 sm:w-9 sm:h-9 bg-amber-500 hover:bg-amber-400 active:bg-amber-300 text-black flex items-center justify-center transition font-black rounded-r-md active:scale-90 shadow-sm"
                      title={`Add ${minQty} pcs`}
                    >
                      <Plus size={13} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* BOTTOM: Cart Button with ShoppingBag Icon */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 landscape:py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-sm landscape:text-xs shadow-lg transition active:scale-95 border border-amber-400/50 flex-shrink-0"
            title="Open Order Slip / Cart"
          >
            <ShoppingBag size={16} className="landscape:w-[14px] landscape:h-[14px]" />
            <span>View Cart</span>
          </button>

        </div>
      )}

    </div>
  );
}
