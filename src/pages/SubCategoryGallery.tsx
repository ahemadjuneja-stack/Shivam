import { useParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { ShoppingCart } from 'lucide-react';
import { useState } from 'react';

export function SubCategoryGallery() {
  const { id } = useParams<{ id: string }>();
  const subCategory = useAppStore(state => state.subCategories.find(s => s.id === id));
  const category = useAppStore(state => state.categories.find(c => c.id === subCategory?.categoryId));
  const photos = useAppStore(state => state.photos.filter(p => p.subCategoryId === id));
  const addToCart = useAppStore(state => state.addToCart);
  
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  if (!subCategory || !category) return <div className="text-center py-20">Folder not found</div>;

  const handleAdd = (photo: typeof photos[0], option: string) => {
    const qtyKey = `${photo.id}-${option}`;
    const qty = quantities[qtyKey] || photo.defaultQuantity;
    
    addToCart({
      photoId: photo.id,
      photoCode: photo.photoCode,
      imageUri: photo.imageUri,
      categoryId: category.id,
      subCategoryName: subCategory.name,
      optionLetter: option,
      quantity: qty
    });
    alert(`Added Option ${option} of ${photo.photoCode} to Cart!`);
  };

  const updateQty = (photoId: string, option: string, val: number) => {
    setQuantities(prev => ({
      ...prev,
      [`${photoId}-${option}`]: Math.max(1, val)
    }));
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
                {['A', 'B', 'C', 'D'].slice(0, photo.itemCount).map((opt) => {
                  const isAvail = photo[`${opt.toLowerCase()}Available` as keyof typeof photo];
                  if (!isAvail) return null;
                  
                  const qtyKey = `${photo.id}-${opt}`;
                  const qty = quantities[qtyKey] || photo.defaultQuantity;

                  return (
                    <div key={opt} className="bg-slate-800 rounded-lg p-2 border border-slate-700 flex flex-col gap-2">
                      <div className="text-center font-black text-brand-gold bg-slate-900 rounded py-1 border border-slate-700">
                        {opt}
                      </div>
                      <div className="flex items-center justify-between bg-slate-900 rounded px-2 py-1 border border-slate-700">
                        <button onClick={() => updateQty(photo.id, opt, qty - 1)} className="text-slate-400 font-bold hover:text-white px-1">-</button>
                        <span className="text-xs font-bold w-6 text-center">{qty}</span>
                        <button onClick={() => updateQty(photo.id, opt, qty + 1)} className="text-slate-400 font-bold hover:text-white px-1">+</button>
                      </div>
                      <button 
                        onClick={() => handleAdd(photo, opt)}
                        className="w-full bg-brand-gold hover:bg-brand-gold-light text-black font-bold text-xs py-1.5 rounded flex items-center justify-center gap-1 transition"
                      >
                        <ShoppingCart size={12} /> Add
                      </button>
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
