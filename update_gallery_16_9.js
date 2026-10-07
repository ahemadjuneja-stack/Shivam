const fs = require('fs');

let code = `import React, { useState } from 'react';
import { useAppStore } from '../store';
import { ArrowLeft, ImageIcon, X, Image as ImageIcon2 } from 'lucide-react';

interface ShowroomVideoManagerProps {
  onClose: () => void;
}

type ViewState = 'CATEGORIES' | 'SUBCATEGORIES' | 'PRODUCTS';

export const ShowroomVideoManager: React.FC<ShowroomVideoManagerProps> = ({ onClose }) => {
  const { categories, subCategories, photos } = useAppStore();
  
  const [viewState, setViewState] = useState<ViewState>('CATEGORIES');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 bg-[#02050f] flex flex-col p-4 md:p-8">
      {/* HEADER GLOBALS */}
      {viewState === 'CATEGORIES' && (
        <div className="flex items-center justify-between mb-6 shrink-0">
          <h1 className="text-2xl font-black tracking-wide text-white flex items-center gap-3">
             <ImageIcon2 className="text-emerald-500" />
             Catalog Gallery
          </h1>
          <button 
            onClick={onClose} 
            className="bg-white text-black hover:bg-slate-200 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition shadow-lg"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>
        </div>
      )}

      {/* VIEW: CATEGORIES */}
      {viewState === 'CATEGORIES' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {categories.map(cat => {
                 const catSubs = subCategories.filter(s => s.categoryId === cat.id);
                 return (
                    <button
                       key={cat.id}
                       onClick={() => {
                          setSelectedCategoryId(cat.id);
                          setViewState('SUBCATEGORIES');
                       }}
                       className="group bg-[#070f23] rounded-2xl overflow-hidden border border-slate-800 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 transition-all text-left flex flex-col"
                    >
                       <div className="w-full aspect-video bg-black relative overflow-hidden">
                          <img 
                             src={cat.thumbnailUrl} 
                             alt={cat.displayName} 
                             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                       </div>
                       <div className="p-4 flex flex-col items-center">
                          <span className="font-black text-sm uppercase tracking-wider text-white text-center mb-1">
                             {cat.displayName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                             {catSubs.length} Subcategories
                          </span>
                       </div>
                    </button>
                 );
              })}
           </div>
        </div>
      )}

      {/* VIEW: SUBCATEGORIES */}
      {viewState === 'SUBCATEGORIES' && selectedCategoryId && (
        <div className="flex-1 flex flex-col bg-[#070f23] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative">
           
           {/* Sub Header */}
           <div className="h-16 px-6 bg-[#050a17] border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                 <button 
                   onClick={() => {
                      setViewState('CATEGORIES');
                      setSelectedCategoryId(null);
                   }}
                   className="w-8 h-8 rounded-full bg-slate-800 hover:bg-emerald-500 hover:text-black text-white flex items-center justify-center transition"
                 >
                   <ArrowLeft size={16} />
                 </button>
                 <h2 className="text-lg font-black text-white tracking-widest uppercase">
                    {categories.find(c => c.id === selectedCategoryId)?.displayName}
                 </h2>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition">
                 <X size={20} />
              </button>
           </div>

           <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar">
              {/* SUBCATEGORIES GRID */}
              <div>
                 {(() => {
                    const catSubs = subCategories.filter(s => s.categoryId === selectedCategoryId);
                    if (catSubs.length === 0) {
                       return <div className="text-slate-500 text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">No subcategories found.</div>;
                    }
                    return (
                       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                          {catSubs.map(sub => {
                             const subPhotos = photos.filter(p => p.subCategoryId === sub.id);
                             return (
                                <button
                                   key={sub.id}
                                   onClick={() => {
                                      setSelectedSubId(sub.id);
                                      setViewState('PRODUCTS');
                                   }}
                                   className="group bg-[#0b1329] rounded-2xl overflow-hidden border border-slate-800 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 transition-all text-left flex flex-col"
                                >
                                   <div className="w-full aspect-video bg-slate-900 relative">
                                      <img src={sub.thumbnailUrl} alt={sub.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                      <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold text-white border border-white/10 flex items-center gap-1">
                                         <ImageIcon size={10} className="text-emerald-400" />
                                         {subPhotos.length}
                                      </div>
                                   </div>
                                   <div className="p-3 md:p-4 text-center bg-[#070f23]">
                                      <span className="font-black text-[11px] md:text-xs uppercase tracking-widest text-white leading-tight">
                                         {sub.name}
                                      </span>
                                   </div>
                                </button>
                             )
                          })}
                       </div>
                    );
                 })()}
              </div>
           </div>
        </div>
      )}

      {/* VIEW: PRODUCTS */}
      {viewState === 'PRODUCTS' && selectedSubId && (
        <div className="flex-1 flex flex-col bg-[#070f23] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative">
           
           {/* Sub Header */}
           <div className="h-16 px-6 bg-[#050a17] border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                 <button 
                   onClick={() => {
                      setViewState('SUBCATEGORIES');
                      setSelectedSubId(null);
                   }}
                   className="w-8 h-8 rounded-full bg-slate-800 hover:bg-emerald-500 hover:text-black text-white flex items-center justify-center transition"
                 >
                   <ArrowLeft size={16} />
                 </button>
                 <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                       {categories.find(c => c.id === selectedCategoryId)?.displayName}
                    </span>
                    <h2 className="text-lg font-black text-emerald-400 tracking-widest uppercase leading-none">
                       {subCategories.find(s => s.id === selectedSubId)?.name}
                    </h2>
                 </div>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition">
                 <X size={20} />
              </button>
           </div>

           <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#02050f]">
              {(() => {
                 const subPhotos = photos.filter(p => p.subCategoryId === selectedSubId);
                 if (subPhotos.length === 0) {
                    return <div className="text-slate-500 text-center py-20 bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">No products uploaded in this subcategory.</div>;
                 }
                 return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                       {subPhotos.map(photo => (
                          <div key={photo.id} className="bg-[#070f23] rounded-2xl overflow-hidden border border-slate-800 relative group flex flex-col">
                             <div className="w-full aspect-video bg-black relative overflow-hidden">
                                <img src={photo.imageUri} alt={photo.photoCode} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                {(photo.variants?.length || 0) > 0 && (
                                   <div className="absolute top-2 left-2 bg-emerald-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border border-emerald-400">
                                      {photo.variants?.length} Opts
                                   </div>
                                )}
                             </div>
                             <div className="p-3 text-center bg-[#070f23] border-t border-slate-800">
                                <span className="text-xs font-mono font-bold text-white tracking-widest">{photo.photoCode}</span>
                             </div>
                          </div>
                       ))}
                    </div>
                 );
              })()}
           </div>
        </div>
      )}
    </div>
  );
};
`;

fs.writeFileSync('src/components/ShowroomVideoManager.tsx', code);
