import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  Upload, 
  Trash2, 
  Plus, 
  Check, 
  MoveUp, 
  MoveDown, 
  Search, 
  Filter, 
  Calendar, 
  Layers, 
  Image as ImageIcon,
  Palette,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot, collection, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { uploadDashboardMedia } from '../services/storageService';
import { CommonLoader } from './CommonLoader';
import { BrandLogo } from './BrandLogo';

interface FestivalDashboardProps {
  onClose: () => void;
}

export interface FestivalGroup {
  id: string;
  naam: string;
  thumbUrl: string;
  order: number;
}

export interface FestivalActiveData {
  id?: string;
  name: string;
  primary: string;
  accent: string;
  decor: string;
  banner?: string;
  backgroundPoster?: string;
  startDate?: number | null;
  endDate?: number | null;
  groups?: FestivalGroup[];
  items?: string[];
}

export interface FestivalProductDoc {
  id: string;
  festivalId: string;
  groupId: string;
  name: string;
  imageUrl: string;
  category: 'Cosmetic' | 'Imitation' | 'Hair Accessories';
  defaultQty: number;
  createdAt: number;
  order?: number;
}

const DECOR_PACKS = [
  { id: 'moon-stars', name: '🌙 Moon & Stars (Ramzan/Eid)' },
  { id: 'fireworks', name: '🎆 Fireworks (Diwali/New Year)' },
  { id: 'color-fly', name: '🎨 Color Splash (Holi)' },
  { id: 'snow', name: '❄️ Snowfall (Christmas)' },
  { id: 'diyas', name: '🪔 Golden Diyas (Diwali)' },
  { id: 'lanterns', name: '🏮 Hanging Lanterns' },
  { id: 'flowers', name: '🌸 Marigold Flowers' },
  { id: 'confetti', name: '🎉 Party Confetti' },
  { id: 'hearts', name: '💖 Rakhi & Love' },
  { id: 'none', name: '🚫 None (Clean)' }
];

const FESTIVAL_PRESETS = [
  {
    label: '🌙 Ramzan / Eid',
    name: 'Ramzan & Eid Mubarak',
    primary: '#0B7A3B',
    accent: '#FFD54A',
    decor: 'moon-stars'
  },
  {
    label: '🪔 Diwali',
    name: 'Happy Diwali Specials',
    primary: '#FFB300',
    accent: '#FF6D00',
    decor: 'fireworks'
  },
  {
    label: '🎨 Holi',
    name: 'Happy Holi Color Fest',
    primary: '#FF4FA3',
    accent: '#FFE066',
    decor: 'color-fly'
  },
  {
    label: '🎄 Christmas',
    name: 'Merry Christmas',
    primary: '#D32F2F',
    accent: '#1B7A3B',
    decor: 'snow'
  },
  {
    label: '🎉 New Year',
    name: 'Happy New Year 2026',
    primary: '#FFC107',
    accent: '#7C4DFF',
    decor: 'confetti'
  },
  {
    label: '🎀 Rakhi',
    name: 'Happy Raksha Bandhan',
    primary: '#C2185B',
    accent: '#FFD54A',
    decor: 'hearts'
  }
];

export const FestivalDashboard: React.FC<FestivalDashboardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'theme' | 'posters' | 'groups' | 'products'>('theme');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Festival Core Config State
  const [festivalOn, setFestivalOn] = useState(false);
  const [festId, setFestId] = useState('');
  const [festName, setFestName] = useState('Ramzan Mubarak');
  const [festPrimary, setFestPrimary] = useState('#0B7A3B');
  const [festAccent, setFestAccent] = useState('#FFD54A');
  const [festDecor, setFestDecor] = useState('moon-stars');
  const [festBanner, setFestBanner] = useState('');
  const [festBackgroundPoster, setFestBackgroundPoster] = useState('');
  const [festStartDate, setFestStartDate] = useState('');
  const [festEndDate, setFestEndDate] = useState('');
  const [festGroups, setFestGroups] = useState<FestivalGroup[]>([]);

  // Products State (from collection 'festival_products')
  const [festProducts, setFestProducts] = useState<FestivalProductDoc[]>([]);

  // Group Creation Sub-form State
  const [newGroupNaam, setNewGroupNaam] = useState('');
  const [newGroupThumbUrl, setNewGroupThumbUrl] = useState('');
  const [isUploadingGroupThumb, setIsUploadingGroupThumb] = useState(false);

  // Product Creation Sub-form State
  const [newProdName, setNewProdName] = useState('');
  const [newProdImageUrl, setNewProdImageUrl] = useState('');
  const [newProdGroupId, setNewProdGroupId] = useState('');
  const [newProdCategory, setNewProdCategory] = useState<'Cosmetic' | 'Imitation' | 'Hair Accessories'>('Cosmetic');
  const [newProdDefaultQty, setNewProdDefaultQty] = useState<number>(1);
  const [isUploadingProdImage, setIsUploadingProdImage] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // Posters upload states
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);

  // Product List Filter & Search
  const [prodGroupFilter, setProdGroupFilter] = useState<string>('ALL');
  const [prodSearchQuery, setProdSearchQuery] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const cleanUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) return obj.map(cleanUndefined);
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined) {
          cleaned[k] = cleanUndefined(v);
        }
      }
      return cleaned;
    }
    return obj;
  };

  // ---------------------------------------------------------------------------
  // 1. LOAD CONFIG FROM FIRESTORE
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      unsub = onSnapshot(doc(db, 'config', 'homeContent'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.festival) {
            setFestivalOn(data.festival.on === true);
            if (data.festival.active) {
              const a = data.festival.active;
              const currentId = a.id || `fest_${Date.now()}`;
              setFestId(currentId);
              setFestName(a.name || 'Ramzan Mubarak');
              setFestPrimary(a.primary || '#0B7A3B');
              setFestAccent(a.accent || '#FFD54A');
              setFestDecor(a.decor || 'moon-stars');
              setFestBanner(a.banner || '');
              setFestBackgroundPoster(a.backgroundPoster || '');
              setFestStartDate(a.startDate ? new Date(a.startDate).toISOString().split('T')[0] : '');
              setFestEndDate(a.endDate ? new Date(a.endDate).toISOString().split('T')[0] : '');
              const loadedGroups: FestivalGroup[] = Array.isArray(a.groups)
                ? a.groups.map((g: any, idx: number) => ({
                    id: g.id || `grp_${Date.now()}_${idx}`,
                    naam: g.naam || g.name || 'Group',
                    thumbUrl: g.thumbUrl || g.thumbnailUrl || '',
                    order: typeof g.order === 'number' ? g.order : idx
                  }))
                : [];
              setFestGroups(loadedGroups);
              if (loadedGroups.length > 0) {
                setNewProdGroupId(prev => prev || loadedGroups[0].id);
              }
            } else {
              setFestId(`fest_${Date.now()}`);
            }
          } else {
            setFestId(`fest_${Date.now()}`);
          }
        }
        setIsLoading(false);
      }, (err) => {
        console.warn('Notice loading festival config:', err);
        setIsLoading(false);
      });
    } catch (err) {
      console.warn('Error loading festival config:', err);
      setIsLoading(false);
    }

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 2. REAL-TIME FESTIVAL PRODUCTS LISTENER
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!festId) return;
    const unsubFestProds = onSnapshot(collection(db, 'festival_products'), (snapshot) => {
      const prods: FestivalProductDoc[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data() as any;
        if (d.festivalId === festId) {
          prods.push({
            id: docSnap.id,
            festivalId: d.festivalId,
            groupId: d.groupId || '',
            name: d.name || '',
            imageUrl: d.imageUrl || '',
            category: d.category || 'Cosmetic',
            defaultQty: Number(d.defaultQty || 1),
            createdAt: Number(d.createdAt || Date.now()),
            order: typeof d.order === 'number' ? d.order : 0
          });
        }
      });
      // Sort by order ascending if specified, else createdAt desc
      prods.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined && a.order !== b.order) {
          return a.order - b.order;
        }
        return b.createdAt - a.createdAt;
      });
      setFestProducts(prods);
    }, (err) => {
      console.warn('Festival products snapshot notice:', err);
    });

    return () => unsubFestProds();
  }, [festId]);

  // ---------------------------------------------------------------------------
  // 3. PERSISTENCE HELPER
  // ---------------------------------------------------------------------------
  const saveFestivalConfig = async (override?: Partial<FestivalActiveData>, newOnState?: boolean) => {
    setIsSaving(true);
    try {
      const docRef = doc(db, 'config', 'homeContent');
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        const fullSkeleton = {
          nayaStock: { on: false, days: 7, max: 15 },
          offers: { on: false, images: [] },
          bestSellers: { on: false, items: [] },
          festival: { on: false, active: null },
          rateDrop: { on: false, items: [] },
          showcase: { on: false, productIds: [] },
          brandView: { on: false, brands: [] }
        };
        await setDoc(docRef, fullSkeleton);
      }

      const sTime = festStartDate ? new Date(festStartDate).getTime() : null;
      const eTime = festEndDate ? new Date(festEndDate).getTime() : null;
      const currentFestId = festId || `fest_${Date.now()}`;
      if (!festId) setFestId(currentFestId);

      const activeObj: FestivalActiveData = {
        id: currentFestId,
        name: festName,
        primary: festPrimary,
        accent: festAccent,
        decor: festDecor,
        banner: festBanner,
        backgroundPoster: festBackgroundPoster,
        startDate: sTime,
        endDate: eTime,
        groups: festGroups.map((g, idx) => ({ ...g, order: idx })),
        ...override
      };

      const payload = {
        on: newOnState !== undefined ? newOnState : festivalOn,
        active: cleanUndefined(activeObj)
      };

      await setDoc(docRef, { festival: payload }, { merge: true });
      showToast('Festival settings saved & live in app!');
    } catch (err: any) {
      console.error('Failed to save festival settings:', err);
      alert('Failed to save festival settings: ' + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. POSTER UPLOADS (TAB 2)
  // ---------------------------------------------------------------------------
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBanner(true);
    try {
      const url = await uploadDashboardMedia(file, 'home_banners', 'fest_banner');
      setFestBanner(url);
      showToast('Festival Entry Banner uploaded!');
    } catch (err) {
      console.error('Failed to upload festival banner:', err);
      alert('Failed to upload festival banner.');
    } finally {
      setIsUploadingBanner(false);
      e.target.value = '';
    }
  };

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPoster(true);
    try {
      const url = await uploadDashboardMedia(file, 'home_banners', 'fest_poster');
      setFestBackgroundPoster(url);
      showToast('Session Background Poster uploaded!');
    } catch (err) {
      console.error('Failed to upload poster:', err);
      alert('Failed to upload session background poster.');
    } finally {
      setIsUploadingPoster(false);
      e.target.value = '';
    }
  };

  // ---------------------------------------------------------------------------
  // 5. GROUP HANDLERS (TAB 3)
  // ---------------------------------------------------------------------------
  const handleGroupThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingGroupThumb(true);
    try {
      const url = await uploadDashboardMedia(file, 'festival_groups', 'group_thumb');
      setNewGroupThumbUrl(url);
      showToast('1:1 Group Thumbnail uploaded!');
    } catch (err) {
      console.error('Failed to upload group thumb:', err);
      alert('Failed to upload group thumbnail.');
    } finally {
      setIsUploadingGroupThumb(false);
      e.target.value = '';
    }
  };

  const handleAddGroup = async () => {
    if (!newGroupNaam.trim()) {
      alert('Please enter group name');
      return;
    }
    if (!newGroupThumbUrl) {
      alert('Please upload a 1:1 thumbnail for the group');
      return;
    }
    const newGrp: FestivalGroup = {
      id: `grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      naam: newGroupNaam.trim(),
      thumbUrl: newGroupThumbUrl,
      order: festGroups.length
    };
    const updatedGroups = [...festGroups, newGrp];
    setFestGroups(updatedGroups);
    if (!newProdGroupId) {
      setNewProdGroupId(newGrp.id);
    }
    setNewGroupNaam('');
    setNewGroupThumbUrl('');
    await saveFestivalConfig({ groups: updatedGroups });
  };

  const handleMoveGroup = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= festGroups.length) return;
    const arr = [...festGroups];
    const temp = arr[idx];
    arr[idx] = arr[targetIdx];
    arr[targetIdx] = temp;
    arr.forEach((g, i) => { g.order = i; });
    setFestGroups(arr);
    await saveFestivalConfig({ groups: arr });
  };

  const handleDeleteGroup = async (grp: FestivalGroup) => {
    if (!window.confirm(`Group "${grp.naam}" + uske products delete honge. Are you sure?`)) return;
    
    // 1. Delete associated products from Firestore
    try {
      const prodsToDelete = festProducts.filter(p => p.groupId === grp.id);
      for (const p of prodsToDelete) {
        await deleteDoc(doc(db, 'festival_products', p.id)).catch(console.warn);
      }
    } catch (err) {
      console.warn('Error deleting associated products:', err);
    }

    // 2. Remove group from array & persist
    const updatedGroups = festGroups.filter(g => g.id !== grp.id).map((g, idx) => ({ ...g, order: idx }));
    setFestGroups(updatedGroups);
    if (newProdGroupId === grp.id) {
      setNewProdGroupId(updatedGroups.length > 0 ? updatedGroups[0].id : '');
    }
    await saveFestivalConfig({ groups: updatedGroups });
    showToast(`Group "${grp.naam}" & products deleted.`);
  };

  // ---------------------------------------------------------------------------
  // 6. PRODUCT HANDLERS (TAB 4)
  // ---------------------------------------------------------------------------
  const handleProdImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingProdImage(true);
    try {
      const url = await uploadDashboardMedia(file, 'festival_products', 'fest_prod');
      setNewProdImageUrl(url);
      showToast('16:9 Product Image uploaded!');
    } catch (err) {
      console.error('Failed to upload product image:', err);
      alert('Failed to upload product image.');
    } finally {
      setIsUploadingProdImage(false);
      e.target.value = '';
    }
  };

  const handleAddFestivalProduct = async () => {
    if (!newProdName.trim()) {
      alert('Please enter product name');
      return;
    }
    if (!newProdImageUrl) {
      alert('Please upload 16:9 product image');
      return;
    }
    if (!newProdGroupId) {
      alert('Please select a festival group (or create one first)');
      return;
    }

    setIsAddingProduct(true);
    try {
      const currentFestId = festId || `fest_${Date.now()}`;
      if (!festId) setFestId(currentFestId);

      const nextOrder = festProducts.length > 0 
        ? Math.max(...festProducts.map(p => p.order || 0)) + 1 
        : 0;

      const prodRef = doc(collection(db, 'festival_products'));
      await setDoc(prodRef, {
        festivalId: currentFestId,
        groupId: newProdGroupId,
        name: newProdName.trim(),
        imageUrl: newProdImageUrl,
        category: newProdCategory,
        defaultQty: Number(newProdDefaultQty || 1),
        createdAt: Date.now(),
        order: nextOrder
      });

      setNewProdName('');
      setNewProdImageUrl('');
      setNewProdDefaultQty(1);
      showToast('Festival product added to live session!');
    } catch (err: any) {
      console.error('Failed to add festival product:', err);
      alert('Failed to add festival product: ' + (err?.message || err));
    } finally {
      setIsAddingProduct(false);
    }
  };

  const handleMoveProduct = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= filteredProducts.length) return;

    const currentItem = filteredProducts[idx];
    const targetItem = filteredProducts[targetIdx];

    const currentOrder = currentItem.order !== undefined ? currentItem.order : idx;
    const targetOrder = targetItem.order !== undefined ? targetItem.order : targetIdx;

    try {
      await updateDoc(doc(db, 'festival_products', currentItem.id), { order: targetOrder });
      await updateDoc(doc(db, 'festival_products', targetItem.id), { order: currentOrder });
      showToast('Product reordered!');
    } catch (err) {
      console.error('Failed to reorder product:', err);
    }
  };

  const handleDeleteFestivalProduct = async (prodId: string, name: string) => {
    if (!window.confirm(`Delete festival product "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'festival_products', prodId));
      showToast('Festival product deleted');
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert('Failed to delete festival product.');
    }
  };

  // Filtered Products for Tab 4
  const filteredProducts = useMemo(() => {
    return festProducts.filter(p => {
      const matchesGroup = prodGroupFilter === 'ALL' || p.groupId === prodGroupFilter;
      const matchesSearch = !prodSearchQuery.trim() || 
        p.name.toLowerCase().includes(prodSearchQuery.toLowerCase());
      return matchesGroup && matchesSearch;
    });
  }, [festProducts, prodGroupFilter, prodSearchQuery]);

  // Status calculation for Status Strip
  const statusInfo = useMemo(() => {
    if (!festivalOn) {
      return { label: 'INACTIVE / OFF', color: 'bg-slate-800 text-slate-400 border-slate-700' };
    }
    const now = Date.now();
    const sTime = festStartDate ? new Date(festStartDate).getTime() : null;
    const eTime = festEndDate ? new Date(festEndDate).getTime() + (24 * 60 * 60 * 1000 - 1) : null;

    if (sTime && now < sTime) {
      return { label: '⏳ UPCOMING', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' };
    }
    if (eTime && now > eTime) {
      return { label: '⚠️ EXPIRED (AUTO-OFF)', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' };
    }
    return { label: '🟢 JARI HAI (LIVE NOW)', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
  }, [festivalOn, festStartDate, festEndDate]);

  return (
    <div className="fixed inset-0 z-50 bg-[#040812] text-slate-100 flex flex-col h-full w-full overflow-hidden select-none animate-in fade-in duration-200">
      
      {/* ----------------------------------------------------------------- */}
      {/* 1. HEADER BAR & STATUS STRIP */}
      {/* ----------------------------------------------------------------- */}
      <header className="bg-[#0B1120] border-b border-[#334155]/60 px-4 py-3 flex flex-col gap-3 flex-shrink-0 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 transition flex items-center gap-2 text-sm font-bold shadow-md border border-slate-700/80"
            >
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            <BrandLogo size="sm" />
            <div className="flex items-center gap-2">
              <span className="text-xl">🎪</span>
              <h2 className="text-sm sm:text-base font-black tracking-wide text-white uppercase font-mono">
                FESTIVAL DASHBOARD
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const nextOn = !festivalOn;
                setFestivalOn(nextOn);
                saveFestivalConfig({}, nextOn);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
                festivalOn 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-lg shadow-emerald-500/10' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${festivalOn ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>{festivalOn ? 'FESTIVAL: ON' : 'FESTIVAL: OFF'}</span>
            </button>
          </div>
        </div>

        {/* Status Strip */}
        <div className="bg-[#070D19] border border-slate-800 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wider border ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            <span className="font-bold text-white flex items-center gap-1">
              <span>{festName}</span>
            </span>
            {(festStartDate || festEndDate) && (
              <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                <Calendar size={12} className="text-amber-400" />
                <span>{festStartDate || 'Start'} → {festEndDate || 'End'}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400">
            <span>🏷️ {festGroups.length} Groups</span>
            <span>🎪 {festProducts.length} Products</span>
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------------------- */}
      {/* 2. 4-TAB NAVIGATION BAR */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-[#070D19] border-b border-[#334155]/40 px-4 flex items-center gap-2 overflow-x-auto custom-scrollbar flex-shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('theme')}
          className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
            activeTab === 'theme'
              ? 'border-pink-500 text-pink-400 bg-pink-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Palette size={14} />
          <span>1. THEME & SCHEDULE</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('posters')}
          className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
            activeTab === 'posters'
              ? 'border-pink-500 text-pink-400 bg-pink-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ImageIcon size={14} />
          <span>2. POSTERS (16:9)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
            activeTab === 'groups'
              ? 'border-pink-500 text-pink-400 bg-pink-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers size={14} />
          <span>3. GROUPS ({festGroups.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
            activeTab === 'products'
              ? 'border-pink-500 text-pink-400 bg-pink-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles size={14} />
          <span>4. PRODUCTS ({festProducts.length})</span>
        </button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 3. TAB CONTENT VIEWS */}
      {/* ----------------------------------------------------------------- */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-[#040812]">
        {isLoading ? (
          <CommonLoader message="Loading Festival Dashboard..." className="py-24" />
        ) : (
          <div className="max-w-5xl mx-auto space-y-6">

            {/* ============================================================= */}
            {/* TAB 1: THEME & SCHEDULE */}
            {/* ============================================================= */}
            {activeTab === 'theme' && (
              <div className="bg-[#0B1120] border border-[#334155]/60 rounded-2xl p-4 sm:p-6 space-y-5 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Palette size={16} className="text-pink-400" />
                      <span>Theme Colors, Presets & Schedule</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Customize the look & schedule automatic live dates</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => saveFestivalConfig()}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-lg shadow-pink-600/20"
                  >
                    <Check size={14} />
                    <span>{isSaving ? 'Saving...' : 'SAVE THEME'}</span>
                  </button>
                </div>

                {/* Quick Presets */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">⚡ 1-Tap Quick Presets</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {FESTIVAL_PRESETS.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setFestName(p.name);
                          setFestPrimary(p.primary);
                          setFestAccent(p.accent);
                          setFestDecor(p.decor);
                          showToast(`Applied preset ${p.label}! Click "SAVE THEME" to persist.`);
                        }}
                        className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-white text-left transition flex items-center justify-between group"
                      >
                        <span>{p.label}</span>
                        <div className="w-4 h-4 rounded-full border border-white/20 shadow-sm" style={{ background: p.primary }} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title & Colors */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Festival Title</label>
                    <input
                      type="text"
                      value={festName}
                      onChange={(e) => setFestName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={festPrimary}
                        onChange={(e) => setFestPrimary(e.target.value)}
                        className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={festPrimary}
                        onChange={(e) => setFestPrimary(e.target.value)}
                        className="flex-1 px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={festAccent}
                        onChange={(e) => setFestAccent(e.target.value)}
                        className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={festAccent}
                        onChange={(e) => setFestAccent(e.target.value)}
                        className="flex-1 px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Decor & Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Decor Animation Pack</label>
                    <select
                      value={festDecor}
                      onChange={(e) => setFestDecor(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                    >
                      {DECOR_PACKS.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={festStartDate}
                      onChange={(e) => setFestStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">End Date</label>
                    <input
                      type="date"
                      value={festEndDate}
                      onChange={(e) => setFestEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => saveFestivalConfig()}
                    disabled={isSaving}
                    className="w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-pink-600/20"
                  >
                    <Check size={16} />
                    <span>SAVE THEME & SCHEDULE SETTINGS</span>
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 2: POSTERS (16:9) */}
            {/* ============================================================= */}
            {activeTab === 'posters' && (
              <div className="bg-[#0B1120] border border-[#334155]/60 rounded-2xl p-4 sm:p-6 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ImageIcon size={16} className="text-pink-400" />
                      <span>Festival Poster Assets (16:9)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Upload entry banner and session background poster</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => saveFestivalConfig()}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-lg shadow-pink-600/20"
                  >
                    <Check size={14} />
                    <span>{isSaving ? 'Saving...' : 'SAVE POSTERS'}</span>
                  </button>
                </div>

                {/* Poster 1: Entry Banner */}
                <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">1. Entry / Header Banner (16:9)</span>
                      <span className="text-[11px] text-slate-400">Shown in customer home feed when festival is active</span>
                    </div>
                    {festBanner && (
                      <button
                        type="button"
                        onClick={() => {
                          setFestBanner('');
                          showToast('Banner cleared. Click "SAVE POSTERS" to persist.');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold"
                      >
                        Remove Banner
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <label className="px-4 py-2.5 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-2 flex-shrink-0">
                      <Upload size={14} />
                      <span>{isUploadingBanner ? 'Uploading...' : 'Upload Entry Banner (16:9)'}</span>
                      <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" disabled={isUploadingBanner} />
                    </label>
                    {festBanner ? (
                      <img src={festBanner} alt="Festival Banner" className="w-48 h-27 object-cover rounded-xl bg-black border border-slate-700 shadow-md" />
                    ) : (
                      <span className="text-xs text-slate-500 italic">No banner uploaded yet</span>
                    )}
                  </div>
                </div>

                {/* Poster 2: Session Background Poster */}
                <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">2. Session Room Background Poster (16:9, Optional)</span>
                      <span className="text-[11px] text-slate-400">Custom dedicated background for the festival session room</span>
                    </div>
                    {festBackgroundPoster && (
                      <button
                        type="button"
                        onClick={() => {
                          setFestBackgroundPoster('');
                          showToast('Poster cleared. Click "SAVE POSTERS" to persist.');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold"
                      >
                        Remove Poster
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <label className="px-4 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-2 flex-shrink-0">
                      <Upload size={14} />
                      <span>{isUploadingPoster ? 'Uploading...' : 'Upload Session Poster (16:9)'}</span>
                      <input type="file" accept="image/*" onChange={handlePosterUpload} className="hidden" disabled={isUploadingPoster} />
                    </label>
                    {festBackgroundPoster ? (
                      <img src={festBackgroundPoster} alt="Session Background Poster" className="w-48 h-27 object-cover rounded-xl bg-black border border-slate-700 shadow-md" />
                    ) : (
                      <span className="text-xs text-slate-500 italic">Optional (falls back to entry banner if unset)</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => saveFestivalConfig()}
                  disabled={isSaving}
                  className="w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-pink-600/20"
                >
                  <Check size={16} />
                  <span>SAVE POSTERS CONFIGURATION</span>
                </button>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 3: GROUPS (1:1 THUMBNAILS & REORDER) */}
            {/* ============================================================= */}
            {activeTab === 'groups' && (
              <div className="bg-[#0B1120] border border-[#334155]/60 rounded-2xl p-4 sm:p-6 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers size={16} className="text-pink-400" />
                      <span>Festival Groups ({festGroups.length})</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Organize festival products into custom groups with 1:1 thumbnails</p>
                  </div>
                </div>

                {/* Add Group Sub-form */}
                <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-white block">Create New Festival Group</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">Group Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Eid Specials, Diamond Bangles, Eye Makeup"
                        value={newGroupNaam}
                        onChange={(e) => setNewGroupNaam(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">1:1 Thumbnail</label>
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 flex-shrink-0">
                          <Upload size={13} />
                          <span>{isUploadingGroupThumb ? 'Uploading...' : 'Upload 1:1 Thumb'}</span>
                          <input type="file" accept="image/*" onChange={handleGroupThumbUpload} className="hidden" disabled={isUploadingGroupThumb} />
                        </label>
                        {newGroupThumbUrl && (
                          <img src={newGroupThumbUrl} alt="Group Preview" className="w-10 h-10 object-cover rounded-lg bg-black border border-pink-400 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddGroup}
                    disabled={isUploadingGroupThumb || !newGroupNaam.trim()}
                    className="w-full py-2.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-pink-600/20"
                  >
                    <Plus size={14} />
                    <span>ADD FESTIVAL GROUP</span>
                  </button>
                </div>

                {/* Groups List */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300 block">Ordered Groups List</span>
                  {festGroups.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs italic bg-slate-950/40 rounded-xl border border-slate-900">
                      No groups created yet. Add a group above.
                    </div>
                  ) : (
                    festGroups.map((grp, idx) => {
                      const count = festProducts.filter(p => p.groupId === grp.id).length;
                      return (
                        <div key={grp.id} className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800 rounded-xl gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="w-6 h-6 rounded-full bg-slate-800 text-pink-400 font-black text-xs flex items-center justify-center flex-shrink-0">
                              #{idx + 1}
                            </span>
                            {grp.thumbUrl ? (
                              <img src={grp.thumbUrl} alt={grp.naam} className="w-12 h-12 object-cover rounded-xl bg-black border border-slate-700 flex-shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 text-xs flex-shrink-0">
                                1:1
                              </div>
                            )}
                            <div className="min-w-0 flex-1 text-left">
                              <span className="font-bold text-sm text-white block truncate">{grp.naam}</span>
                              <span className="text-[11px] text-pink-400/80 font-mono block">{count} Products Assigned</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => handleMoveGroup(idx, 'up')}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
                                title="Move Up"
                              >
                                <MoveUp size={14} />
                              </button>
                            )}
                            {idx < festGroups.length - 1 && (
                              <button
                                type="button"
                                onClick={() => handleMoveGroup(idx, 'down')}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
                                title="Move Down"
                              >
                                <MoveDown size={14} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteGroup(grp)}
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-xs transition"
                              title="Delete Group (and associated products)"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 4: PRODUCTS (16:9 IMAGE, GROUP, CATEGORY, REORDER) */}
            {/* ============================================================= */}
            {activeTab === 'products' && (
              <div className="bg-[#0B1120] border border-[#334155]/60 rounded-2xl p-4 sm:p-6 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles size={16} className="text-pink-400" />
                      <span>Festival Products ({festProducts.length})</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Upload 16:9 products, assign groups & reorder</p>
                  </div>
                </div>

                {/* Add Product Sub-form */}
                <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-white block">Add Festival Product</span>

                  {festGroups.length === 0 ? (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                      <AlertCircle size={16} className="text-amber-400 flex-shrink-0" />
                      <span>Pehle "3. GROUPS" tab me jaakar kam az kam ek Festival Group banayein.</span>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Name */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">Product Title / Code</label>
                          <input
                            type="text"
                            placeholder="e.g. Royal Eid Velvet Choker"
                            value={newProdName}
                            onChange={(e) => setNewProdName(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-400"
                          />
                        </div>

                        {/* Group Selection */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">Festival Group</label>
                          <select
                            value={newProdGroupId}
                            onChange={(e) => setNewProdGroupId(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-400"
                          >
                            {festGroups.map(g => (
                              <option key={g.id} value={g.id}>{g.naam}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 16:9 Image Upload */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">16:9 Product Image</label>
                        <div className="flex items-center gap-3">
                          <label className="px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 flex-shrink-0">
                            <Upload size={14} />
                            <span>{isUploadingProdImage ? 'Uploading...' : 'Upload 16:9 Image'}</span>
                            <input type="file" accept="image/*" onChange={handleProdImageUpload} className="hidden" disabled={isUploadingProdImage} />
                          </label>
                          {newProdImageUrl && (
                            <img src={newProdImageUrl} alt="Product Preview" className="w-20 h-11 object-cover rounded-lg bg-black border border-pink-400 flex-shrink-0" />
                          )}
                        </div>
                      </div>

                      {/* Category (3 Radio Buttons Only) & Default Qty */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 mb-1.5">Category</label>
                          <div className="flex items-center gap-4">
                            {(['Cosmetic', 'Imitation', 'Hair Accessories'] as const).map((cat) => (
                              <label key={cat} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-200">
                                <input
                                  type="radio"
                                  name="festProdCategoryTab"
                                  checked={newProdCategory === cat}
                                  onChange={() => setNewProdCategory(cat)}
                                  className="accent-pink-500"
                                />
                                <span>{cat}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">Default Quantity (FV4-Q Contract)</label>
                          <input
                            type="number"
                            min="1"
                            value={newProdDefaultQty}
                            onChange={(e) => setNewProdDefaultQty(Math.max(1, Number(e.target.value)))}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-400"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddFestivalProduct}
                        disabled={isAddingProduct || isUploadingProdImage || !newProdName.trim() || !newProdImageUrl || !newProdGroupId}
                        className="w-full py-2.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-pink-600/20"
                      >
                        <Plus size={14} />
                        <span>{isAddingProduct ? 'Adding Product...' : 'ADD FESTIVAL PRODUCT'}</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Filter / Search Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search size={14} className="text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search festival products by name..."
                      value={prodSearchQuery}
                      onChange={(e) => setProdSearchQuery(e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Filter size={14} className="text-slate-400" />
                    <select
                      value={prodGroupFilter}
                      onChange={(e) => setProdGroupFilter(e.target.value)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none"
                    >
                      <option value="ALL">All Groups ({festProducts.length})</option>
                      {festGroups.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.naam} ({festProducts.filter(p => p.groupId === g.id).length})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Products List */}
                <div className="space-y-2">
                  {filteredProducts.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs italic bg-slate-950/40 rounded-xl border border-slate-900">
                      No matching festival products found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredProducts.map((p, idx) => {
                        const grpName = festGroups.find(g => g.id === p.groupId)?.naam || 'No Group';
                        return (
                          <div key={p.id} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center gap-3 group">
                            <img src={p.imageUrl} alt={p.name} className="w-20 h-12 sm:w-24 sm:h-14 object-cover rounded-lg bg-black border border-slate-700 flex-shrink-0" />
                            <div className="min-w-0 flex-1 text-left">
                              <span className="font-bold text-xs text-white block truncate">{p.name}</span>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 text-[9px] font-bold">
                                  {grpName}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] font-bold">
                                  {p.category}
                                </span>
                                <span className="text-[9px] text-emerald-400 font-bold">
                                  Qty: {p.defaultQty || 1}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveProduct(idx, 'up')}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
                                  title="Move Up"
                                >
                                  <MoveUp size={12} />
                                </button>
                              )}
                              {idx < filteredProducts.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveProduct(idx, 'down')}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
                                  title="Move Down"
                                >
                                  <MoveDown size={12} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteFestivalProduct(p.id, p.name)}
                                className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-xs flex-shrink-0"
                                title="Delete Product"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-55 bg-[#064E3B] border border-[#059669]/60 text-[#A7F3D0] px-4.5 py-3 rounded-2xl text-xs font-black shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={15} className="text-[#34D399]" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
};
