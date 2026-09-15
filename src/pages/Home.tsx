import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { Folder } from 'lucide-react';

export function Home() {
  const categories = useAppStore(state => state.categories);
  const subCategories = useAppStore(state => state.subCategories);
  const photos = useAppStore(state => state.photos);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-white">Wholesale Catalog</h2>
        <p className="text-slate-400 text-sm">Select a department to view designs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map(cat => {
          const catSubs = subCategories.filter(s => s.categoryId === cat.id);
          const catPhotosCount = photos.filter(p => p.categoryId === cat.id).length;
          
          return (
            <Link 
              key={cat.id} 
              to={`/category/${cat.id}`}
              className="group rounded-xl overflow-hidden border border-slate-700 bg-brand-navy-card hover:border-brand-gold transition-colors block"
            >
              <div className="h-48 relative overflow-hidden bg-slate-900">
                {cat.thumbnailUrl ? (
                  <img src={cat.thumbnailUrl} alt={cat.displayName} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Folder size={48} color={cat.accentColorHex} />
                  </div>
                )}
                <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm border border-slate-700 px-3 py-1 rounded-md">
                  <span className="text-[10px] font-bold text-white">{catSubs.length} Folders</span>
                </div>
              </div>
              <div className="p-4 text-center">
                <h3 className="text-lg font-bold text-white">{cat.displayName}</h3>
                <p className="text-xs text-slate-400 mt-1">{cat.hindiName} • {catPhotosCount} Designs</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
