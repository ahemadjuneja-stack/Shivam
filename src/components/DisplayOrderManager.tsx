import { useState } from 'react';
import { ArrowUp, ArrowDown, Sparkles, Check } from 'lucide-react';
import { useAppStore } from '../store';

export function DisplayOrderManager() {
  const categories = useAppStore(state => state.categories);
  const subCategories = useAppStore(state => state.subCategories);
  const photos = useAppStore(state => state.photos);

  const reorderCategories = useAppStore(state => state.reorderCategories);
  const reorderSubCategories = useAppStore(state => state.reorderSubCategories);
  const reorderPhotos = useAppStore(state => state.reorderPhotos);

  const [activeTab, setActiveTab] = useState<'categories' | 'subcategories' | 'products'>('subcategories');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('imitation');
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string>('');
  const [savedNotice, setSavedNotice] = useState(false);

  const triggerSaveNotice = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  // Move items up or down
  const moveItem = <T,>(list: T[], index: number, direction: 'up' | 'down', updateFn: (newList: T[]) => void) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= list.length) return;
    const updated = [...list];
    const [movedItem] = updated.splice(index, 1);
    updated.splice(newIndex, 0, movedItem);
    updateFn(updated);
    triggerSaveNotice();
  };

  const handleIndexChange = <T,>(list: T[], index: number, newPosStr: string, updateFn: (newList: T[]) => void) => {
    const pos = parseInt(newPosStr, 10);
    if (isNaN(pos) || pos < 1 || pos > list.length) return;
    const targetIndex = pos - 1;
    const updated = [...list];
    const [movedItem] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, movedItem);
    updateFn(updated);
    triggerSaveNotice();
  };

  // Filtered subcategories and photos
  const filteredSubCategories = subCategories.filter(s => s.categoryId === selectedCategoryId);
  const filteredPhotos = photos.filter(p => {
    if (selectedSubCategoryId) {
      return p.subCategoryId === selectedSubCategoryId;
    }
    return p.categoryId === selectedCategoryId;
  });

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 p-4 sm:p-6 overflow-y-auto">
      
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Sparkles className="text-amber-400" size={20} />
            Custom Display Order Manager
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Rearrange categories, subcategories, and products. Changes sync instantly across the Dashboard and Mobile App.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedNotice && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg animate-fade-in">
              <Check size={14} /> Sequence Saved & Synced
            </span>
          )}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'categories' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Main Categories
            </button>
            <button
              onClick={() => setActiveTab('subcategories')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'subcategories' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Subcategories
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'products' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Products / Catalog
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pt-6 flex-1">
        
        {/* 1. CATEGORIES REORDERING */}
        {activeTab === 'categories' && (
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
              Main Categories Sequence ({categories.length})
            </div>
            {categories.map((cat, idx) => (
              <div 
                key={cat.id}
                className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3.5 rounded-xl hover:border-amber-500/40 transition shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-slate-800 text-amber-400 flex items-center justify-center font-black text-xs">
                    #{idx + 1}
                  </span>
                  <img src={cat.thumbnailUrl} alt={cat.displayName} className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
                  <div>
                    <h4 className="text-sm font-bold text-white">{cat.displayName}</h4>
                    <span className="text-[10px] text-slate-400">ID: {cat.id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">Pos:</span>
                    <input 
                      type="number" 
                      min="1" 
                      max={categories.length}
                      value={idx + 1}
                      onChange={(e) => handleIndexChange(categories, idx, e.target.value, reorderCategories)}
                      className="w-12 bg-slate-950 border border-slate-800 rounded text-center text-xs text-white py-1 font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    onClick={() => moveItem(categories, idx, 'up', reorderCategories)}
                    disabled={idx === 0}
                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Move Up"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    onClick={() => moveItem(categories, idx, 'down', reorderCategories)}
                    disabled={idx === categories.length - 1}
                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Move Down"
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 2. SUBCATEGORIES REORDERING */}
        {activeTab === 'subcategories' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Subcategories Sequence ({filteredSubCategories.length})
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Filter Category:</span>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg text-xs text-white px-3 py-1.5 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="imitation">Imitation Jewelry</option>
                  <option value="cosmetics">Cosmetics</option>
                  <option value="hair_accessories">Hair Accessories</option>
                </select>
              </div>
            </div>

            {filteredSubCategories.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">No subcategories found in this category.</div>
            ) : (
              filteredSubCategories.map((sub, idx) => (
                <div 
                  key={sub.id}
                  className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3.5 rounded-xl hover:border-amber-500/40 transition shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-800 text-amber-400 flex items-center justify-center font-black text-xs">
                      #{idx + 1}
                    </span>
                    <img src={sub.thumbnailUrl} alt={sub.name} className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
                    <div>
                      <h4 className="text-sm font-bold text-white">{sub.name}</h4>
                      <span className="text-[10px] text-slate-400">{sub.photoCount || 0} Products • ID: {sub.id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">Pos:</span>
                      <input 
                        type="number" 
                        min="1" 
                        max={filteredSubCategories.length}
                        value={idx + 1}
                        onChange={(e) => {
                          // Reorder within the entire subcategories list while maintaining other category subcategories
                          handleIndexChange(filteredSubCategories, idx, e.target.value, (newFiltered) => {
                            const otherSubs = subCategories.filter(s => s.categoryId !== selectedCategoryId);
                            reorderSubCategories([...otherSubs, ...newFiltered]);
                          });
                        }}
                        className="w-12 bg-slate-950 border border-slate-800 rounded text-center text-xs text-white py-1 font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <button
                      onClick={() => {
                        moveItem(filteredSubCategories, idx, 'up', (newFiltered) => {
                          const otherSubs = subCategories.filter(s => s.categoryId !== selectedCategoryId);
                          reorderSubCategories([...otherSubs, ...newFiltered]);
                        });
                      }}
                      disabled={idx === 0}
                      className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      title="Move Up"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      onClick={() => {
                        moveItem(filteredSubCategories, idx, 'down', (newFiltered) => {
                          const otherSubs = subCategories.filter(s => s.categoryId !== selectedCategoryId);
                          reorderSubCategories([...otherSubs, ...newFiltered]);
                        });
                      }}
                      disabled={idx === filteredSubCategories.length - 1}
                      className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      title="Move Down"
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 3. PRODUCTS / CATALOG REORDERING */}
        {activeTab === 'products' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Products Sequence ({filteredPhotos.length})
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    setSelectedSubCategoryId('');
                  }}
                  className="bg-slate-900 border border-slate-800 rounded-lg text-xs text-white px-3 py-1.5 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="imitation">Imitation Jewelry</option>
                  <option value="cosmetics">Cosmetics</option>
                  <option value="hair_accessories">Hair Accessories</option>
                </select>

                <select
                  value={selectedSubCategoryId}
                  onChange={(e) => setSelectedSubCategoryId(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg text-xs text-white px-3 py-1.5 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">All Subcategories in Dept</option>
                  {subCategories
                    .filter(s => s.categoryId === selectedCategoryId)
                    .map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))
                  }
                </select>
              </div>
            </div>

            {filteredPhotos.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">No products found matching this filter.</div>
            ) : (
              filteredPhotos.map((photo, idx) => (
                <div 
                  key={photo.id}
                  className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3.5 rounded-xl hover:border-amber-500/40 transition shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-800 text-amber-400 flex items-center justify-center font-black text-xs">
                      #{idx + 1}
                    </span>
                    <img src={photo.imageUri} alt={photo.photoCode} className="w-12 h-12 rounded-lg object-cover border border-slate-700" />
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {photo.photoCode}
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-normal">
                          {photo.subCategoryName || 'General'}
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate max-w-xs">{photo.description || 'No description'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">Pos:</span>
                      <input 
                        type="number" 
                        min="1" 
                        max={filteredPhotos.length}
                        value={idx + 1}
                        onChange={(e) => {
                          handleIndexChange(filteredPhotos, idx, e.target.value, (newFiltered) => {
                            const otherPhotos = photos.filter(p => selectedSubCategoryId ? p.subCategoryId !== selectedSubCategoryId : p.categoryId !== selectedCategoryId);
                            reorderPhotos([...otherPhotos, ...newFiltered]);
                          });
                        }}
                        className="w-12 bg-slate-950 border border-slate-800 rounded text-center text-xs text-white py-1 font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <button
                      onClick={() => {
                        moveItem(filteredPhotos, idx, 'up', (newFiltered) => {
                          const otherPhotos = photos.filter(p => selectedSubCategoryId ? p.subCategoryId !== selectedSubCategoryId : p.categoryId !== selectedCategoryId);
                          reorderPhotos([...otherPhotos, ...newFiltered]);
                        });
                      }}
                      disabled={idx === 0}
                      className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      title="Move Up"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      onClick={() => {
                        moveItem(filteredPhotos, idx, 'down', (newFiltered) => {
                          const otherPhotos = photos.filter(p => selectedSubCategoryId ? p.subCategoryId !== selectedSubCategoryId : p.categoryId !== selectedCategoryId);
                          reorderPhotos([...otherPhotos, ...newFiltered]);
                        });
                      }}
                      disabled={idx === filteredPhotos.length - 1}
                      className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      title="Move Down"
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
