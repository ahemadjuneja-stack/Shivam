import { useParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { Minus, Plus } from 'lucide-react';
import { getPhotoVariants } from '../types';

export function SubCategoryGallery() {
  const { id } = useParams<{ id: string }>();
  const subCategory = useAppStore(state => state.subCategories.find(s => s.id === id));
  const category = useAppStore(state => state.categories.find(c => c.id === subCategory?.categoryId));
  const photos = useAppStore(state => state.photos.filter(p => p.subCategoryId === id));
  const cart = useAppStore(state => state.cart);
  const setItemQuantity = useAppStore(state => state.setItemQuantity);

  if (!subCategory || !category) return <div className="text-center py-20 text-slate-400">Folder not found</div>;

  const letterBadgeColors: Record<string, { bg: string; text: string }> = {
    A: { bg: 'bg-amber-400', text: 'text-black' },
    B: { bg: 'bg-sky-400', text: 'text-black' },
    C: { bg: 'bg-emerald-400', text: 'text-black' },
    D: { bg: 'bg-fuchsia-400', text: 'text-white' }
  };

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-white flex items-center gap-2">
          {subCategory.name}
        </h2>
        <p className="text-slate-400 text-sm">{category.displayName} • {photos.length} Designs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
        {photos.map(photo => (
          <div key={photo.id} className="bg-brand-navy-card rounded-xl border border-slate-700 overflow-hidden shadow-lg">
            <div className="aspect-video bg-slate-900 relative">
              <img src={photo.imageUri} alt={photo.photoCode} className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 bg-black/80 text-white font-mono text-xs px-2 py-1 rounded border border-slate-600">
                {photo.photoCode}
              </div>
            </div>
            
            <div className="p-4">
              <p className="text-sm text-slate-300 mb-4">{photo.description}</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {getPhotoVariants(photo).map((variant) => {
                  const isAvailable = variant.isAvailable;
                  if (!isAvailable) return null;
                  
                  const currentQty = cart.find(i => i.photoId === photo.id && i.optionLetter === variant.key)?.quantity || 0;
                  const minQty = variant.defaultQuantity;
                  const badge = letterBadgeColors[variant.key] || { bg: 'bg-indigo-600', text: 'text-white' };

                  return (
                    <div key={variant.key} className="bg-slate-800 rounded-lg p-2 border border-slate-700 flex flex-col gap-2 justify-between">
                      {/* Interactive Variant Label Button (Touch CLEARS quantity if > 0, NEVER increments) */}
                      <button
                        onClick={() => {
                          if (currentQty > 0) {
                            setItemQuantity(photo, variant.key, 0);
                          }
                        }}
                        disabled={currentQty === 0}
                        className={`text-center font-black rounded py-1 border border-slate-700 select-none transition active:scale-95 text-xs sm:text-sm whitespace-nowrap min-w-fit px-2 ${
                          currentQty > 0 
                            ? `${badge.bg} ${badge.text} cursor-pointer` 
                            : 'bg-slate-900 text-slate-400 opacity-60 cursor-default'
                        }`}
                        title={currentQty > 0 ? `Tap to Clear (${variant.label})` : `${variant.label} (Pack: ${minQty})`}
                      >
                        {variant.label}
                      </button>

                      {/* Stepper (Strict wholesale quantities: toggles between 0 and multiples of minQty) */}
                      <div className="flex items-center justify-between bg-slate-950 rounded-lg p-0.5 border border-slate-700">
                        <button 
                          onClick={() => {
                            const target = currentQty <= minQty ? 0 : currentQty - minQty;
                            setItemQuantity(photo, variant.key, target);
                          }}
                          disabled={currentQty <= 0}
                          className={`w-8 h-8 flex items-center justify-center rounded font-bold transition active:scale-90 ${
                            currentQty > 0 
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' 
                              : 'bg-slate-900 text-slate-600 opacity-40 cursor-not-allowed'
                          }`}
                          title="Minus"
                        >
                          <Minus size={13} strokeWidth={3} />
                        </button>
                        
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-mono font-black text-brand-gold">{currentQty}</span>
                          <span className="text-[8px] text-slate-400 -mt-1 font-bold">pcs</span>
                        </div>

                        <button 
                          onClick={() => {
                            const target = currentQty === 0 ? minQty : currentQty + minQty;
                            setItemQuantity(photo, variant.key, target);
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded bg-amber-500 hover:bg-amber-400 text-black font-black transition active:scale-90"
                          title={`Add ${minQty} pcs`}
                        >
                          <Plus size={13} strokeWidth={3} />
                        </button>
                      </div>

                      {/* Explicit marked button to add initial pack */}
                      {currentQty === 0 && (
                        <button 
                          onClick={() => {
                            setItemQuantity(photo, variant.key, minQty);
                          }}
                          className="w-full bg-brand-gold hover:bg-brand-gold-light active:scale-95 text-black font-black text-xs py-2 rounded-lg flex items-center justify-center gap-1 transition shadow"
                        >
                          Add Pack
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
