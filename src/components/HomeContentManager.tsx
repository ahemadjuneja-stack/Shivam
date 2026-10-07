import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Store, 
  Check, 
  Plus, 
  Trash2, 
  Upload, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  X, 
  CheckCircle2,
  MoveUp,
  MoveDown
} from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot, collection, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppStore } from '../store';
import { uploadDashboardMedia } from '../services/storageService';
import { CommonLoader } from './CommonLoader';
import { BrandLogo } from './BrandLogo';

interface HomeContentManagerProps {
  onClose: () => void;
}

interface BrandItem {
  id: string;
  name: string;
  logoUrl: string;
  productIds: string[];
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

export const HomeContentManager: React.FC<HomeContentManagerProps> = ({ onClose }) => {
  const { photos, orders } = useAppStore();
  const [isHomeConfigLoaded, setIsHomeConfigLoaded] = useState(false);

  // Accordion Expand States
  const [openSection, setOpenSection] = useState<string | null>('nayaStock');

  // Toast / Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSavingSection, setIsSavingSection] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // FORM STATES
  // ---------------------------------------------------------------------------
  // S1: New Stock
  const [nayaStockOn, setNayaStockOn] = useState(true);
  const [nayaStockDays, setNayaStockDays] = useState(7);
  const [nayaStockMax, setNayaStockMax] = useState(15);

  // S2: Offers
  const [offersOn, setOffersOn] = useState(false);
  const [offersImages, setOffersImages] = useState<string[]>([]);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // S3: Best Sellers
  const [bestSellersOn, setBestSellersOn] = useState(false);

  // S4: Festival
  const [festivalOn, setFestivalOn] = useState(false);
  const [festId, setFestId] = useState('');
  const [festName, setFestName] = useState('Ramzan Mubarak');
  const [festPrimary, setFestPrimary] = useState('#0B7A3B');
  const [festAccent, setFestAccent] = useState('#FFD54A');
  const [festDecor, setFestDecor] = useState('moon-stars');
  const [festBanner, setFestBanner] = useState('');
  const [festStartDate, setFestStartDate] = useState('');
  const [festEndDate, setFestEndDate] = useState('');
  const [festGroups, setFestGroups] = useState<FestivalGroup[]>([]);
  const [festProducts, setFestProducts] = useState<FestivalProductDoc[]>([]);

  // D2-A: Festival Group Form State
  const [newGroupNaam, setNewGroupNaam] = useState('');
  const [newGroupThumbUrl, setNewGroupThumbUrl] = useState('');
  const [isUploadingGroupThumb, setIsUploadingGroupThumb] = useState(false);

  // D2-B: Festival Product Form State
  const [newProdName, setNewProdName] = useState('');
  const [newProdImageUrl, setNewProdImageUrl] = useState('');
  const [newProdGroupId, setNewProdGroupId] = useState('');
  const [newProdCategory, setNewProdCategory] = useState<'Cosmetic' | 'Imitation' | 'Hair Accessories'>('Cosmetic');
  const [newProdDefaultQty, setNewProdDefaultQty] = useState<number>(1);
  const [isUploadingProdImage, setIsUploadingProdImage] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // S5: Rate Drop
  const [rateDropOn, setRateDropOn] = useState(false);
  const [rateDropItems, setRateDropItems] = useState<string[]>([]);

  // S6: Showcase
  const [showcaseOn, setShowcaseOn] = useState(false);
  const [showcaseProductIds, setShowcaseProductIds] = useState<string[]>([]);

  // S7: Brand View
  const [brandViewOn, setBrandViewOn] = useState(false);
  const [brands, setBrands] = useState<BrandItem[]>([]);

  // ---------------------------------------------------------------------------
  // PRODUCT PICKER MODAL STATE
  // ---------------------------------------------------------------------------
  const [pickerModalConfig, setPickerModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    selectedIds: string[];
    onConfirm: (ids: string[]) => void;
  } | null>(null);

  const [pickerSearch, setPickerSearch] = useState('');
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);

  // ---------------------------------------------------------------------------
  // AUTO-COMPUTE BEST SELLERS (READ-ONLY PREVIEW)
  // ---------------------------------------------------------------------------
  const computedBestSellers = useMemo(() => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentOrders = orders.filter(o => {
      const ts = typeof o.createdAt === 'number' ? o.createdAt : (o.createdAt ? Number(o.createdAt) : 0);
      return ts >= thirtyDaysAgo || ts === 0;
    });

    const soldQtyMap: Record<string, number> = {};
    recentOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const pid = item.photoId || item.id || '';
        const qty = Number(item.quantity || 0);
        if (pid) {
          soldQtyMap[pid] = (soldQtyMap[pid] || 0) + qty;
        }
      });
    });

    const sorted = photos
      .map(p => ({
        photo: p,
        soldQty: soldQtyMap[p.id] || 0
      }))
      .filter(p => p.soldQty > 0)
      .sort((a, b) => b.soldQty - a.soldQty)
      .slice(0, 6);

    if (sorted.length < 6) {
      photos.forEach(p => {
        if (sorted.length < 6 && !sorted.some(x => x.photo.id === p.id)) {
          sorted.push({ photo: p, soldQty: soldQtyMap[p.id] || 0 });
        }
      });
    }

    return sorted;
  }, [orders, photos]);

  // ---------------------------------------------------------------------------
  // LOAD REALTIME CONFIG FROM FIRESTORE
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      unsub = onSnapshot(doc(db, 'config', 'homeContent'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();

          // S1
          if (data.nayaStock) {
            setNayaStockOn(data.nayaStock.on !== false);
            setNayaStockDays(Number(data.nayaStock.days || 7));
            setNayaStockMax(Number(data.nayaStock.max || 15));
          }

          // S2
          if (data.offers) {
            setOffersOn(data.offers.on === true);
            setOffersImages(Array.isArray(data.offers.images) ? data.offers.images : []);
          }

          // S3
          if (data.bestSellers) {
            setBestSellersOn(data.bestSellers.on === true);
          }

          // S4
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

          // S5
          if (data.rateDrop) {
            setRateDropOn(data.rateDrop.on === true);
            setRateDropItems(Array.isArray(data.rateDrop.items) ? data.rateDrop.items : []);
          }

          // S6
          if (data.showcase) {
            setShowcaseOn(data.showcase.on === true);
            setShowcaseProductIds(Array.isArray(data.showcase.productIds) ? data.showcase.productIds : []);
          }

          // S7
          if (data.brandView) {
            setBrandViewOn(data.brandView.on === true);
            const loadedBrands = Array.isArray(data.brandView.brands)
              ? data.brandView.brands.map((b: any) => ({
                  id: b.id || `brand_${Date.now()}`,
                  name: b.name || b.naam || 'Brand',
                  logoUrl: b.logoUrl || '',
                  productIds: Array.isArray(b.productIds) ? b.productIds : []
                }))
              : [];
            setBrands(loadedBrands);
          }
        } else {
          // Initialize skeleton if doc does not exist (all 7 sections default on: false)
          const defaultSkeleton = {
            nayaStock: { on: false, days: 7, max: 15 },
            offers: { on: false, images: [] },
            bestSellers: { on: false, items: [] },
            festival: { on: false, active: null },
            rateDrop: { on: false, items: [] },
            showcase: { on: false, productIds: [] },
            brandView: { on: false, brands: [] }
          };
          setDoc(doc(db, 'config', 'homeContent'), defaultSkeleton);
        }
        setIsHomeConfigLoaded(true);
      }, (error) => {
        console.warn('Notice loading config/homeContent snapshot error:', error);
        setIsHomeConfigLoaded(true);
      });
    } catch (err) {
      console.warn('Notice loading config/homeContent:', err);
      setIsHomeConfigLoaded(true);
    }

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // REAL-TIME FESTIVAL PRODUCTS LISTENER (PHASE-A: Dedicated collection)
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
            createdAt: Number(d.createdAt || Date.now())
          });
        }
      });
      prods.sort((a, b) => b.createdAt - a.createdAt);
      setFestProducts(prods);
    }, (err) => {
      console.warn('Festival products snapshot notice:', err);
    });

    return () => unsubFestProds();
  }, [festId]);

  // Show Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Helper to recursively remove undefined values for Firestore
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
  // PER-SECTION SAVE HANDLER (OWNER-LOCK: NEVER OVERWRITES OTHER SECTIONS)
  // ---------------------------------------------------------------------------
  const saveSection = async (sectionKey: string, sectionPayload: any) => {
    setIsSavingSection(sectionKey);
    try {
      const docRef = doc(db, 'config', 'homeContent');
      const snap = await getDoc(docRef);

      // K5: SKELETON-WRITE: if document does not exist yet, write full skeleton first (all 7 keys, on: false)
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

      const cleanedPayload = cleanUndefined(sectionPayload);
      await setDoc(docRef, {
        [sectionKey]: cleanedPayload
      }, { merge: true });

      showToast(`Section "${sectionKey}" saved & live on mobile app!`);
    } catch (err: any) {
      console.error(`Failed to save ${sectionKey}:`, err);
      alert(`Failed to save ${sectionKey}: ${err?.message || err}`);
    } finally {
      setIsSavingSection(null);
    }
  };

  // ---------------------------------------------------------------------------
  // PRODUCT PICKER HELPERS
  // ---------------------------------------------------------------------------
  const openProductPicker = (title: string, currentSelectedIds: string[], onConfirm: (ids: string[]) => void) => {
    setTempSelectedIds([...currentSelectedIds]);
    setPickerSearch('');
    setPickerModalConfig({
      isOpen: true,
      title,
      selectedIds: currentSelectedIds,
      onConfirm
    });
  };

  const filteredPickerProducts = useMemo(() => {
    if (!pickerSearch.trim()) return photos;
    const q = pickerSearch.toLowerCase();
    return photos.filter(p => 
      (p.code || p.title || '').toLowerCase().includes(q) ||
      (p.subCategoryName || '').toLowerCase().includes(q) ||
      (p.categoryId || '').toLowerCase().includes(q)
    );
  }, [photos, pickerSearch]);

  const togglePickerProductId = (id: string) => {
    setTempSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // ---------------------------------------------------------------------------
  // OFFERS IMAGE UPLOAD
  // ---------------------------------------------------------------------------
  const handleOfferBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBanner(true);
    try {
      const url = await uploadDashboardMedia(file, 'home_banners', 'offer');
      setOffersImages(prev => [...prev, url]);
      showToast('Banner image uploaded successfully!');
    } catch (err) {
      console.error('Failed to upload banner:', err);
      alert('Failed to upload banner image.');
    } finally {
      setIsUploadingBanner(false);
      e.target.value = '';
    }
  };

  // ---------------------------------------------------------------------------
  // FESTIVAL BANNER UPLOAD
  // ---------------------------------------------------------------------------
  const handleFestivalBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBanner(true);
    try {
      const url = await uploadDashboardMedia(file, 'home_banners', 'festival');
      setFestBanner(url);
      showToast('Festival banner uploaded!');
    } catch (err) {
      console.error('Failed to upload festival banner:', err);
      alert('Failed to upload festival banner.');
    } finally {
      setIsUploadingBanner(false);
      e.target.value = '';
    }
  };

  // ---------------------------------------------------------------------------
  // BRAND LOGO UPLOAD
  // ---------------------------------------------------------------------------
  const handleBrandLogoUpload = async (brandId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadDashboardMedia(file, 'brand_logos', `brand_${brandId}`);
      setBrands(prev => prev.map(b => b.id === brandId ? { ...b, logoUrl: url } : b));
      showToast('Brand logo uploaded!');
    } catch (err) {
      console.error('Failed to upload brand logo:', err);
      alert('Failed to upload brand logo.');
    } finally {
      e.target.value = '';
    }
  };

  // ---------------------------------------------------------------------------
  // D2-A: FESTIVAL GROUP HANDLERS
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

  const handleAddGroup = () => {
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
    setFestGroups(prev => [...prev, newGrp]);
    if (!newProdGroupId) {
      setNewProdGroupId(newGrp.id);
    }
    setNewGroupNaam('');
    setNewGroupThumbUrl('');
    showToast(`Festival Group "${newGrp.naam}" added!`);
  };

  const handleMoveGroup = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= festGroups.length) return;
    const arr = [...festGroups];
    const temp = arr[idx];
    arr[idx] = arr[targetIdx];
    arr[targetIdx] = temp;
    arr.forEach((g, i) => { g.order = i; });
    setFestGroups(arr);
  };

  const handleDeleteGroup = async (grp: FestivalGroup) => {
    if (!window.confirm(`Group "${grp.naam}" + uske products delete honge. Are you sure?`)) return;
    
    // Delete all products associated with this group from Firestore
    try {
      const prodsToDelete = festProducts.filter(p => p.groupId === grp.id);
      for (const p of prodsToDelete) {
        await deleteDoc(doc(db, 'festival_products', p.id)).catch(console.warn);
      }
    } catch (err) {
      console.warn('Error deleting associated products:', err);
    }

    setFestGroups(prev => prev.filter(g => g.id !== grp.id));
    if (newProdGroupId === grp.id) {
      const remaining = festGroups.filter(g => g.id !== grp.id);
      setNewProdGroupId(remaining.length > 0 ? remaining[0].id : '');
    }
    showToast(`Group "${grp.naam}" & its products deleted.`);
  };

  // ---------------------------------------------------------------------------
  // D2-B: FESTIVAL PRODUCT HANDLERS
  // ---------------------------------------------------------------------------
  const handleProdImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingProdImage(true);
    try {
      const url = await uploadDashboardMedia(file, 'festival_products', 'fest_prod');
      setNewProdImageUrl(url);
      showToast('16:9 Festival Product Image uploaded!');
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

      const prodRef = doc(collection(db, 'festival_products'));
      await setDoc(prodRef, {
        festivalId: currentFestId,
        groupId: newProdGroupId,
        name: newProdName.trim(),
        imageUrl: newProdImageUrl,
        category: newProdCategory,
        defaultQty: Number(newProdDefaultQty || 1),
        createdAt: Date.now()
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

  return (
    <div className="fixed inset-0 z-50 bg-[#040812] text-slate-100 flex flex-col h-full w-full overflow-hidden select-none animate-in fade-in duration-200">
      
      {/* HEADER BAR */}
      <header className="bg-[#0B1120] border-b border-[#334155]/60 px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-lg">
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
            <Store size={22} className="text-amber-400" />
            <h2 className="text-sm sm:text-base font-black tracking-wide text-white uppercase font-mono">
              🏠 HOME CONTENT MANAGER
            </h2>
          </div>
        </div>

        <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1">
          <Sparkles size={12} />
          <span>REALTIME LIVE</span>
        </span>
      </header>

      {/* MAIN CONTAINER: 7 EXPANDABLE SECTIONS */}
      <main className="flex-1 overflow-y-auto px-4 py-5 max-w-4xl mx-auto w-full space-y-4 custom-scrollbar">
        {!isHomeConfigLoaded ? (
          <CommonLoader message="Loading home content configuration..." className="py-32" />
        ) : (
          <>
        {/* =================================================-------------------- */}
        {/* S1. NEW STOCK CARD */}
        {/* =================================================-------------------- */}
        <div className="bg-[#0B1120] border border-[#334155]/60 rounded-2xl overflow-hidden shadow-xl transition-all">
          <div 
            onClick={() => setOpenSection(openSection === 'nayaStock' ? null : 'nayaStock')}
            className="p-4 bg-slate-900/80 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between border-b border-[#334155]/40"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                ✨
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>1. NEW STOCK</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${nayaStockOn ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-500'}`}>
                    {nayaStockOn ? 'ON' : 'OFF'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Days filter & equal-mix display threshold</p>
              </div>
            </div>
            {openSection === 'nayaStock' ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </div>

          {openSection === 'nayaStock' && (
            <div className="p-4 space-y-4 bg-[#0B1120]">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-slate-200">Show New Stock Banner Section</span>
                <button
                  type="button"
                  onClick={() => setNayaStockOn(!nayaStockOn)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${nayaStockOn ? 'bg-emerald-500' : 'bg-slate-800'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${nayaStockOn ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Created Within (Days)</label>
                  <input
                    type="number"
                    value={nayaStockDays}
                    onChange={(e) => setNayaStockDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Max Display Limit</label>
                  <input
                    type="number"
                    value={nayaStockMax}
                    onChange={(e) => setNayaStockMax(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                  />
                  <p className="text-[10px] text-amber-400/90 mt-1 italic">
                    💡 "15 = 3 categories × 5, app me equal-mix"
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isSavingSection === 'nayaStock'}
                onClick={() => saveSection('nayaStock', { on: nayaStockOn, days: nayaStockDays, max: nayaStockMax })}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <Check size={15} />
                <span>SAVE NEW STOCK SETTINGS</span>
              </button>
            </div>
          )}
        </div>

        {/* =================================================-------------------- */}
        {/* S2. OFFERS CARD */}
        {/* =================================================-------------------- */}
        <div className="bg-[#0B1120] border border-[#334155]/60 rounded-2xl overflow-hidden shadow-xl transition-all">
          <div 
            onClick={() => setOpenSection(openSection === 'offers' ? null : 'offers')}
            className="p-4 bg-slate-900/80 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between border-b border-[#334155]/40"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                🏷️
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>2. OFFERS & BANNERS</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${offersOn ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-500'}`}>
                    {offersOn ? 'ON' : 'OFF'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Carousel banners with rate/discount text</p>
              </div>
            </div>
            {openSection === 'offers' ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </div>

          {openSection === 'offers' && (
            <div className="p-4 space-y-4 bg-[#0B1120]">
              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-slate-200">Show Offers Carousel in App</span>
                <button
                  type="button"
                  onClick={() => setOffersOn(!offersOn)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${offersOn ? 'bg-emerald-500' : 'bg-slate-800'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${offersOn ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Banner Upload Button */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Upload Offer Banner Image</label>
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-2">
                    <Upload size={14} />
                    <span>{isUploadingBanner ? 'Uploading...' : 'Upload Banner'}</span>
                    <input type="file" accept="image/*" onChange={handleOfferBannerUpload} className="hidden" disabled={isUploadingBanner} />
                  </label>
                  <span className="text-[11px] text-slate-400 italic">💡 "Rate/price image ke andar hi likhein"</span>
                </div>
              </div>

              {/* Banners List */}
              <div className="space-y-2">
                {offersImages.map((imgUrl, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-xl gap-3">
                    <img src={imgUrl} alt={`Offer ${idx}`} className="w-16 h-10 object-cover rounded-lg bg-black border border-slate-700" />
                    <span className="text-[11px] font-mono text-slate-400 truncate flex-1">{imgUrl}</span>
                    <div className="flex items-center gap-1">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const arr = [...offersImages];
                            const temp = arr[idx];
                            arr[idx] = arr[idx - 1];
                            arr[idx - 1] = temp;
                            setOffersImages(arr);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                          title="Move Up"
                        >
                          <MoveUp size={12} />
                        </button>
                      )}
                      {idx < offersImages.length - 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const arr = [...offersImages];
                            const temp = arr[idx];
                            arr[idx] = arr[idx + 1];
                            arr[idx + 1] = temp;
                            setOffersImages(arr);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                          title="Move Down"
                        >
                          <MoveDown size={12} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setOffersImages(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-xs"
                        title="Delete Banner"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={isSavingSection === 'offers'}
                onClick={() => saveSection('offers', { on: offersOn, images: offersImages })}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20"
              >
                <Check size={15} />
                <span>SAVE OFFERS SETTINGS</span>
              </button>
            </div>
          )}
        </div>

        {/* =================================================-------------------- */}
        {/* S3. BEST SELLERS CARD (AUTO-COMPUTED READ-ONLY PREVIEW) */}
        {/* =================================================-------------------- */}
        <div className="bg-[#0B1120] border border-[#334155]/60 rounded-2xl overflow-hidden shadow-xl transition-all">
          <div 
            onClick={() => setOpenSection(openSection === 'bestSellers' ? null : 'bestSellers')}
            className="p-4 bg-slate-900/80 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between border-b border-[#334155]/40"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                🔥
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>3. BEST SELLERS</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${bestSellersOn ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-500'}`}>
                    {bestSellersOn ? 'ON' : 'OFF'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Auto-calculated top 6 sold items (last 30 days)</p>
              </div>
            </div>
            {openSection === 'bestSellers' ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </div>

          {openSection === 'bestSellers' && (
            <div className="p-4 space-y-4 bg-[#0B1120]">
              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-slate-200">Show Best Sellers in App</span>
                <button
                  type="button"
                  onClick={() => setBestSellersOn(!bestSellersOn)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${bestSellersOn ? 'bg-emerald-500' : 'bg-slate-800'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${bestSellersOn ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-xs text-indigo-200 flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-400 flex-shrink-0" />
                <span>Auto-computed live from orders history (last 30 days). No manual picker needed.</span>
              </div>

              {/* READ-ONLY TOP-6 PREVIEW */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {computedBestSellers.map(({ photo, soldQty }, idx) => (
                  <div key={photo.id} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center flex-shrink-0">
                      #{idx + 1}
                    </span>
                    <img src={photo.imageUrl || photo.thumbnailUrl} alt="" className="w-10 h-10 object-cover rounded-lg bg-black border border-slate-700 flex-shrink-0" />
                    <div className="min-w-0 flex-1 text-left">
                      <span className="font-bold text-xs text-white block truncate">{photo.code || photo.title}</span>
                      <span className="text-[10px] text-emerald-400 font-bold block">{soldQty} Pcs Sold</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={isSavingSection === 'bestSellers'}
                onClick={() => saveSection('bestSellers', { on: bestSellersOn, items: computedBestSellers.map(x => x.photo.id) })}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <Check size={15} />
                <span>SAVE BEST SELLERS STATUS</span>
              </button>
            </div>
          )}
        </div>

        {/* =================================================-------------------- */}
        {/* S4. FESTIVAL MAKER CARD */}
        {/* =================================================-------------------- */}
        <div className="bg-[#0B1120] border border-[#334155]/60 rounded-2xl overflow-hidden shadow-xl transition-all">
          <div 
            onClick={() => setOpenSection(openSection === 'festival' ? null : 'festival')}
            className="p-4 bg-slate-900/80 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between border-b border-[#334155]/40"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/30 flex items-center justify-center font-bold">
                🎉
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>4. FESTIVAL THEME MAKER</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${festivalOn ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-500'}`}>
                    {festivalOn ? 'ON' : 'OFF'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Presets, theme colors, decor packs & date schedule</p>
              </div>
            </div>
            {openSection === 'festival' ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </div>

          {openSection === 'festival' && (
            <div className="p-4 space-y-4 bg-[#0B1120]">
              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-slate-200">Show Festival Theme in App</span>
                <button
                  type="button"
                  onClick={() => setFestivalOn(!festivalOn)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${festivalOn ? 'bg-emerald-500' : 'bg-slate-800'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${festivalOn ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">⚡ Quick Festival Presets (1-Tap Fill)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FESTIVAL_PRESETS.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setFestName(p.name);
                        setFestPrimary(p.primary);
                        setFestAccent(p.accent);
                        setFestDecor(p.decor);
                        showToast(`Applied preset ${p.label}!`);
                      }}
                      className="px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-white text-left transition flex items-center justify-between"
                    >
                      <span>{p.label}</span>
                      <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ background: p.primary }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Colors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Festival Title</label>
                  <input
                    type="text"
                    value={festName}
                    onChange={(e) => setFestName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={festPrimary}
                      onChange={(e) => setFestPrimary(e.target.value)}
                      className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={festPrimary}
                      onChange={(e) => setFestPrimary(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={festAccent}
                      onChange={(e) => setFestAccent(e.target.value)}
                      className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={festAccent}
                      onChange={(e) => setFestAccent(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Decor Pack & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Decor Animation Pack</label>
                  <select
                    value={festDecor}
                    onChange={(e) => setFestDecor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                  >
                    {DECOR_PACKS.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={festStartDate}
                    onChange={(e) => setFestStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={festEndDate}
                    onChange={(e) => setFestEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                💡 "Ramzan ~1 mahina, Diwali ~15 din; date niklte hi app me theme KHUD band"
              </p>

              {/* Festival Banner Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Festival Header Banner</label>
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 border border-pink-500/40 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-2">
                    <Upload size={14} />
                    <span>Upload Festival Banner</span>
                    <input type="file" accept="image/*" onChange={handleFestivalBannerUpload} className="hidden" disabled={isUploadingBanner} />
                  </label>
                  {festBanner && (
                    <img src={festBanner} alt="Banner" className="w-16 h-10 object-cover rounded-lg bg-black border border-slate-700" />
                  )}
                </div>
              </div>

              {/* ============================================================= */}
              {/* D2-A: 🏷️ FESTIVAL GROUPS MANAGER */}
              {/* ============================================================= */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏷️</span>
                    <h4 className="text-xs font-black uppercase text-pink-300 tracking-wider">
                      FESTIVAL GROUPS ({festGroups.length})
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400">1:1 Thumbnails • Display Order</span>
                </div>

                {/* Add Group Sub-form */}
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-slate-300 block">Create New Group</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Group Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Eid Specials, Diamond Bangles"
                        value={newGroupNaam}
                        onChange={(e) => setNewGroupNaam(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">1:1 Thumbnail</label>
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 flex-shrink-0">
                          <Upload size={13} />
                          <span>{isUploadingGroupThumb ? 'Uploading...' : 'Upload 1:1 Thumb'}</span>
                          <input type="file" accept="image/*" onChange={handleGroupThumbUpload} className="hidden" disabled={isUploadingGroupThumb} />
                        </label>
                        {newGroupThumbUrl && (
                          <img src={newGroupThumbUrl} alt="Group Thumb Preview" className="w-9 h-9 object-cover rounded-lg bg-black border border-pink-400/60 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddGroup}
                    disabled={isUploadingGroupThumb || !newGroupNaam.trim()}
                    className="w-full py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-pink-600/20"
                  >
                    <Plus size={14} />
                    <span>ADD FESTIVAL GROUP</span>
                  </button>
                </div>

                {/* Groups List */}
                {festGroups.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic text-center py-2">
                    No festival groups created yet. Create a group above to organize products.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {festGroups.map((grp, idx) => {
                      const groupProdCount = festProducts.filter(p => p.groupId === grp.id).length;
                      return (
                        <div key={grp.id} className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-pink-400 font-black text-[10px] flex items-center justify-center flex-shrink-0">
                              #{idx + 1}
                            </span>
                            {grp.thumbUrl ? (
                              <img src={grp.thumbUrl} alt={grp.naam} className="w-10 h-10 object-cover rounded-lg bg-black border border-slate-700 flex-shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 text-xs flex-shrink-0">
                                1:1
                              </div>
                            )}
                            <div className="min-w-0 flex-1 text-left">
                              <span className="font-bold text-xs text-white block truncate">{grp.naam}</span>
                              <span className="text-[10px] text-slate-400 font-mono block">{groupProdCount} Products</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => handleMoveGroup(idx, 'up')}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                                title="Move Up"
                              >
                                <MoveUp size={12} />
                              </button>
                            )}
                            {idx < festGroups.length - 1 && (
                              <button
                                type="button"
                                onClick={() => handleMoveGroup(idx, 'down')}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                                title="Move Down"
                              >
                                <MoveDown size={12} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteGroup(grp)}
                              className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-xs"
                              title="Delete Group"
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

              {/* ============================================================= */}
              {/* D2-B: 🎪 FESTIVAL PRODUCTS MANAGER */}
              {/* ============================================================= */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎪</span>
                    <h4 className="text-xs font-black uppercase text-pink-300 tracking-wider">
                      FESTIVAL PRODUCTS ({festProducts.length})
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400">16:9 Image • Dedicated Collection</span>
                </div>

                {/* Add Product Sub-form */}
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-slate-300 block">Add New Festival Product</span>

                  {festGroups.length === 0 ? (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                      <Sparkles size={15} className="text-amber-400 flex-shrink-0" />
                      <span>Pehle upar Festival Group banayein, phir product add kar sakeinge.</span>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Product Name */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Product Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Royal Eid Velvet Choker"
                            value={newProdName}
                            onChange={(e) => setNewProdName(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-400"
                          />
                        </div>

                        {/* Group Selection */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Festival Group</label>
                          <select
                            value={newProdGroupId}
                            onChange={(e) => setNewProdGroupId(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-400"
                          >
                            {festGroups.map(g => (
                              <option key={g.id} value={g.id}>{g.naam}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 16:9 Image Upload */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">16:9 Product Image</label>
                        <div className="flex items-center gap-3">
                          <label className="px-3.5 py-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 flex-shrink-0">
                            <Upload size={13} />
                            <span>{isUploadingProdImage ? 'Uploading...' : 'Upload 16:9 Image'}</span>
                            <input type="file" accept="image/*" onChange={handleProdImageUpload} className="hidden" disabled={isUploadingProdImage} />
                          </label>
                          {newProdImageUrl && (
                            <img src={newProdImageUrl} alt="Product Preview" className="w-16 h-9 object-cover rounded-lg bg-black border border-pink-400/60 flex-shrink-0" />
                          )}
                        </div>
                      </div>

                      {/* Category (3 Radio Buttons Only) & Default Qty */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1.5">Category</label>
                          <div className="flex items-center gap-3">
                            {(['Cosmetic', 'Imitation', 'Hair Accessories'] as const).map((cat) => (
                              <label key={cat} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-200">
                                <input
                                  type="radio"
                                  name="festProdCategory"
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
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Default Quantity (FV4-Q Contract)</label>
                          <input
                            type="number"
                            min="1"
                            value={newProdDefaultQty}
                            onChange={(e) => setNewProdDefaultQty(Math.max(1, Number(e.target.value)))}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-400"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddFestivalProduct}
                        disabled={isAddingProduct || isUploadingProdImage || !newProdName.trim() || !newProdImageUrl || !newProdGroupId}
                        className="w-full py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-pink-600/20"
                      >
                        <Plus size={14} />
                        <span>{isAddingProduct ? 'Adding Product...' : 'ADD FESTIVAL PRODUCT'}</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Live Products List */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 block">Live Session Products ({festProducts.length})</span>
                  {festProducts.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic text-center py-4 bg-slate-950/40 rounded-xl border border-slate-900">
                      No products added yet for this festival session.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {festProducts.map((p) => {
                        const grpName = festGroups.find(g => g.id === p.groupId)?.naam || 'No Group';
                        return (
                          <div key={p.id} className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center gap-3">
                            <img src={p.imageUrl} alt={p.name} className="w-16 h-10 object-cover rounded-lg bg-black border border-slate-700 flex-shrink-0" />
                            <div className="min-w-0 flex-1 text-left">
                              <span className="font-bold text-xs text-white block truncate">{p.name}</span>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 text-[9px] font-bold">
                                  {grpName}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] font-bold">
                                  {p.category}
                                </span>
                                <span className="text-[9px] text-emerald-400 font-bold">
                                  Qty: {p.defaultQty || 1}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteFestivalProduct(p.id, p.name)}
                              className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-xs flex-shrink-0"
                              title="Delete Product"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={isSavingSection === 'festival'}
                onClick={() => {
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
                    startDate: sTime,
                    endDate: eTime,
                    groups: festGroups.map((g, idx) => ({ ...g, order: idx }))
                  };
                  saveSection('festival', { on: festivalOn, active: activeObj });
                }}
                className="w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs transition active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-pink-600/20"
              >
                <Check size={15} />
                <span>SAVE FESTIVAL THEME SETTINGS</span>
              </button>
            </div>
          )}
        </div>

        {/* =================================================-------------------- */}
        {/* S5. RATE DROP CARD */}
        {/* =================================================-------------------- */}
        <div className="bg-[#0B1120] border border-[#334155]/60 rounded-2xl overflow-hidden shadow-xl transition-all">
          <div 
            onClick={() => setOpenSection(openSection === 'rateDrop' ? null : 'rateDrop')}
            className="p-4 bg-slate-900/80 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between border-b border-[#334155]/40"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
                📉
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>5. RATE DROP SPECIALS</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${rateDropOn ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-500'}`}>
                    {rateDropOn ? 'ON' : 'OFF'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Discounted rate items showcase (no price inputs)</p>
              </div>
            </div>
            {openSection === 'rateDrop' ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </div>

          {openSection === 'rateDrop' && (
            <div className="p-4 space-y-4 bg-[#0B1120]">
              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-slate-200">Show Rate Drop Section in App</span>
                <button
                  type="button"
                  onClick={() => setRateDropOn(!rateDropOn)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${rateDropOn ? 'bg-emerald-500' : 'bg-slate-800'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${rateDropOn ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-300">Selected Rate Drop Items ({rateDropItems.length})</label>
                  <button
                    type="button"
                    onClick={() => openProductPicker('Select Rate Drop Products', rateDropItems, setRateDropItems)}
                    className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Pick Products</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {rateDropItems.map(id => {
                    const photo = photos.find(p => p.id === id);
                    return (
                      <span key={id} className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-bold flex items-center gap-1.5">
                        <span>{photo?.code || id}</span>
                        <button type="button" onClick={() => setRateDropItems(prev => prev.filter(x => x !== id))} className="text-slate-400 hover:text-red-400">
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                disabled={isSavingSection === 'rateDrop'}
                onClick={() => saveSection('rateDrop', { on: rateDropOn, items: rateDropItems })}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20"
              >
                <Check size={15} />
                <span>SAVE RATE DROP SETTINGS</span>
              </button>
            </div>
          )}
        </div>

        {/* =================================================-------------------- */}
        {/* S6. SHOWCASE CARD */}
        {/* =================================================-------------------- */}
        <div className="bg-[#0B1120] border border-[#334155]/60 rounded-2xl overflow-hidden shadow-xl transition-all">
          <div 
            onClick={() => setOpenSection(openSection === 'showcase' ? null : 'showcase')}
            className="p-4 bg-slate-900/80 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between border-b border-[#334155]/40"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold">
                ⭐
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>6. FEATURED SHOWCASE</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${showcaseOn ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-500'}`}>
                    {showcaseOn ? 'ON' : 'OFF'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Hand-picked curated showcase tiles</p>
              </div>
            </div>
            {openSection === 'showcase' ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </div>

          {openSection === 'showcase' && (
            <div className="p-4 space-y-4 bg-[#0B1120]">
              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-slate-200">Show Showcase Section in App</span>
                <button
                  type="button"
                  onClick={() => setShowcaseOn(!showcaseOn)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${showcaseOn ? 'bg-emerald-500' : 'bg-slate-800'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${showcaseOn ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-300">Showcase Products ({showcaseProductIds.length})</label>
                  <button
                    type="button"
                    onClick={() => openProductPicker('Select Showcase Products', showcaseProductIds, setShowcaseProductIds)}
                    className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Pick Products</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {showcaseProductIds.map(id => {
                    const photo = photos.find(p => p.id === id);
                    return (
                      <span key={id} className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-bold flex items-center gap-1.5">
                        <span>{photo?.code || id}</span>
                        <button type="button" onClick={() => setShowcaseProductIds(prev => prev.filter(x => x !== id))} className="text-slate-400 hover:text-red-400">
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                disabled={isSavingSection === 'showcase'}
                onClick={() => saveSection('showcase', { on: showcaseOn, productIds: showcaseProductIds })}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
              >
                <Check size={15} />
                <span>SAVE SHOWCASE SETTINGS</span>
              </button>
            </div>
          )}
        </div>

        {/* =================================================-------------------- */}
        {/* S7. BRAND VIEW CARD */}
        {/* =================================================-------------------- */}
        <div className="bg-[#0B1120] border border-[#334155]/60 rounded-2xl overflow-hidden shadow-xl transition-all">
          <div 
            onClick={() => setOpenSection(openSection === 'brandView' ? null : 'brandView')}
            className="p-4 bg-slate-900/80 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between border-b border-[#334155]/40"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
                👑
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>7. BRAND VIEW GRID</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${brandViewOn ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-500'}`}>
                    {brandViewOn ? 'ON' : 'OFF'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Brand logos & multi-product mappings</p>
              </div>
            </div>
            {openSection === 'brandView' ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </div>

          {openSection === 'brandView' && (
            <div className="p-4 space-y-4 bg-[#0B1120]">
              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-slate-200">Show Brand View Section in App</span>
                <button
                  type="button"
                  onClick={() => setBrandViewOn(!brandViewOn)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${brandViewOn ? 'bg-emerald-500' : 'bg-slate-800'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${brandViewOn ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Add Brand Button */}
              <button
                type="button"
                onClick={() => {
                  const newB: BrandItem = {
                    id: `brand_${Date.now()}`,
                    name: 'New Brand',
                    logoUrl: '',
                    productIds: []
                  };
                  setBrands(prev => [...prev, newB]);
                }}
                className="w-full py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <Plus size={16} />
                <span>Add New Brand</span>
              </button>

              {/* Brands List */}
              <div className="space-y-3">
                {brands.map((b, bIdx) => (
                  <div key={b.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={b.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBrands(prev => prev.map(x => x.id === b.id ? { ...x, name: val } : x));
                        }}
                        className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white flex-1 focus:outline-none focus:border-amber-400"
                        placeholder="Brand Name"
                      />

                      <div className="flex items-center gap-1">
                        {bIdx > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const arr = [...brands];
                              const temp = arr[bIdx];
                              arr[bIdx] = arr[bIdx - 1];
                              arr[bIdx - 1] = temp;
                              setBrands(arr);
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                          >
                            <MoveUp size={12} />
                          </button>
                        )}
                        {bIdx < brands.length - 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const arr = [...brands];
                              const temp = arr[bIdx];
                              arr[bIdx] = arr[bIdx + 1];
                              arr[bIdx + 1] = temp;
                              setBrands(arr);
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                          >
                            <MoveDown size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setBrands(prev => prev.filter(x => x.id !== b.id))}
                          className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs border border-red-500/30"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Logo & Products */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Brand Logo Image</label>
                        <div className="flex items-center gap-2">
                          <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1">
                            <Upload size={12} />
                            <span>Upload Logo</span>
                            <input type="file" accept="image/*" onChange={(e) => handleBrandLogoUpload(b.id, e)} className="hidden" />
                          </label>
                          {b.logoUrl && (
                            <img src={b.logoUrl} alt="" className="w-8 h-8 object-contain rounded bg-white p-0.5" />
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-400">Brand Products ({b.productIds.length})</label>
                          <button
                            type="button"
                            onClick={() => openProductPicker(`Pick Products for ${b.name}`, b.productIds, (ids) => {
                              setBrands(prev => prev.map(x => x.id === b.id ? { ...x, productIds: ids } : x));
                            })}
                            className="text-[10px] text-amber-400 font-bold underline"
                          >
                            Manage Products
                          </button>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 truncate block">
                          {b.productIds.length} items mapped
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={isSavingSection === 'brandView'}
                onClick={() => saveSection('brandView', { on: brandViewOn, brands })}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                <Check size={15} />
                <span>SAVE BRAND VIEW SETTINGS</span>
              </button>
            </div>
          )}
        </div>
          </>
        )}
      </main>

      {/* =================================================-------------------- */}
      {/* PRODUCT PICKER MODAL */}
      {/* =================================================-------------------- */}
      {pickerModalConfig?.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1120] border border-[#334155] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wide">
                {pickerModalConfig.title} ({tempSelectedIds.length} selected)
              </h3>
              <button
                type="button"
                onClick={() => setPickerModalConfig(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-slate-900/60 border-b border-slate-800 flex items-center gap-2">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search catalog code, name or category..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 custom-scrollbar">
              {filteredPickerProducts.map(p => {
                const isSelected = tempSelectedIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => togglePickerProductId(p.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-2.5 relative ${
                      isSelected 
                        ? 'bg-amber-500/10 border-amber-400 text-white shadow-md' 
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <img src={p.imageUrl || p.thumbnailUrl} alt="" className="w-11 h-11 object-cover rounded-lg bg-black border border-slate-700 flex-shrink-0" />
                    <div className="min-w-0 flex-1 text-left">
                      <span className="font-extrabold text-xs block truncate">{p.code || p.title}</span>
                      <span className="text-[10px] text-slate-400 block truncate">{p.subCategoryName || p.categoryId}</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black ${isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                      {isSelected ? '✓' : ''}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-400">
                {tempSelectedIds.length} Products Selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPickerModalConfig(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    pickerModalConfig.onConfirm(tempSelectedIds);
                    setPickerModalConfig(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-lg shadow-amber-500/20"
                >
                  Confirm Selection
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TOAST FEEDBACK OVERLAY */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[200] bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 border border-emerald-400 animate-in slide-in-from-top-4">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
};
