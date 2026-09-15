import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { Folder, Image as ImageIcon } from 'lucide-react';

export function CategoryGallery() {
  const { id } = useParams<{ id: string }>();
  const category = useAppStore(state => state.categories.find(c => c.id === id));
  const subCategories = useAppStore(state => state.subCategories.filter(s => s.categoryId === id));

  if (!category) return <div className="text-center py-20">Category not found</div>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-black text-white">{category.displayName}</h2>
        <p className="text-slate-400 text-sm">Browse subcategory folders</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {subCategories.map(sub => (
          <Link
            key={sub.id}
            to={`/subcategory/${sub.id}`}
            className="bg-brand-navy-card border border-slate-700 hover:border-brand-gold rounded-xl p-4 flex flex-col items-center justify-center gap-3 transition-colors text-center"
          >
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
              <Folder size={28} color={category.accentColorHex} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white line-clamp-1">{sub.name}</h3>
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-1">
                <ImageIcon size={12} /> {sub.photoCount}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
