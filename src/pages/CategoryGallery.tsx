import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../store';

export function CategoryGallery() {
  const { id } = useParams<{ id: string }>();
  const currentCustomer = useAppStore(state => state.currentCustomer);
  
  const isCategoryAllowed = !currentCustomer || !currentCustomer.allowedCategoryIds || 
    currentCustomer.allowedCategoryIds.includes('all') || 
    currentCustomer.allowedCategoryIds.includes(id || '');

  const category = useAppStore(state => state.categories.find(c => c.id === id));
  const rawSubCategories = useAppStore(state => state.subCategories.filter(s => s.categoryId === id));

  const subCategories = rawSubCategories.filter(s => {
    if (!currentCustomer) return true;
    const allowedSub = currentCustomer.allowedSubCategoryIds;
    if (!allowedSub || allowedSub.includes('all')) return true;
    return allowedSub.includes(s.id);
  });

  if (!category || !isCategoryAllowed) return <div className="text-center py-20 text-slate-400 font-bold">Category not found or access restricted</div>;

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
            className="group flex flex-col gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-95 text-center focus:outline-none"
          >
            {/* 1. Strict 16:9 Thumbnail Image */}
            <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-900 border-2 border-slate-800 group-hover:border-brand-gold transition-colors shadow-lg">
              <img
                src={sub.thumbnailUrl}
                alt={sub.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* 2. Below Thumbnail: Subcategory Name only */}
            <span className="text-xs sm:text-sm font-bold text-slate-200 group-hover:text-brand-gold tracking-wide truncate px-1">
              {sub.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
