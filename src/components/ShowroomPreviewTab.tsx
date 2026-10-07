import { useAppStore } from '../store';
import { Tv } from 'lucide-react';

export function ShowroomPreviewTab() {
  const { photos } = useAppStore();

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
      <div className="flex flex-wrap items-center justify-between bg-[#0B1120] border border-[#334155]/40 px-4 py-3 rounded-2xl gap-3">
        <div>
          <h2 className="text-sm font-black uppercase text-[#F1F5F9] tracking-wider flex items-center gap-2">
            <Tv size={16} className="text-cyan-400" />
            <span>Showroom & HDTV Media Management</span>
          </h2>
          <p className="text-[11px] text-[#94A3B8]">Configure digital showroom banners, promotional video loops, and live TV presentation slides.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {photos.slice(0, 9).map((p) => (
          <div key={p.id} className="bg-[#0B1120] border border-[#334155]/60 rounded-2xl overflow-hidden p-2 flex gap-3 items-center">
            <img src={p.imageUri} alt={p.photoCode || 'Product'} className="w-20 h-20 object-cover rounded-xl bg-slate-950" />
            <div className="flex-1 min-w-0">
              <div className="font-mono font-black text-amber-400 text-xs">{p.photoCode || p.code || 'NO-CODE'}</div>
              <div className="text-xs font-bold text-white truncate">{p.subCategoryName || 'Uncategorized'}</div>
              <div className="text-[10px] text-slate-400 mt-1">{p.itemCount || 4} Designs • {p.defaultQuantity || 1} pcs</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
