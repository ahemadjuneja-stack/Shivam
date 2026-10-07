import { useState, useEffect } from 'react';
import { CatalogPhoto, CategoryItem, SubCategory } from '../types';
import { X, Save, Image as ImageIcon } from 'lucide-react';

interface EditProductModalProps {
  photo: CatalogPhoto | null;
  categories: CategoryItem[];
  subCategories: SubCategory[];
  onClose: () => void;
  onSave: (photoId: string, data: Partial<CatalogPhoto>) => void;
}

export function EditProductModal({
  photo,
  categories,
  subCategories,
  onClose,
  onSave
}: EditProductModalProps) {
  const [photoCode, setPhotoCode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [videoUri, setVideoUri] = useState('');
  const [defaultQuantity, setDefaultQuantity] = useState(12);
  const [itemCount, setItemCount] = useState(4);
  const [customLabelsInput, setCustomLabelsInput] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (photo) {
      setPhotoCode(photo.photoCode);
      setCategoryId(photo.categoryId);
      setSubCategoryId(photo.subCategoryId);
      setImageUri(photo.imageUri);
      setVideoUri(photo.videoUri || '');
      setDefaultQuantity(photo.defaultQuantity);
      setItemCount(photo.itemCount);
      setCustomLabelsInput(photo.customLabels ? photo.customLabels.join(', ') : '');
      setDescription(photo.description || '');
    }
  }, [photo]);

  if (!photo) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sub = subCategories.find(s => s.id === subCategoryId);
    const parsedLabels = customLabelsInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const generatedVariants = parsedLabels.map((lbl, idx) => {
      const minQ = typeof photo.variants?.[idx]?.minQuantity === 'number' 
        ? photo.variants[idx].minQuantity 
        : (typeof photo.variants?.[idx]?.quantity === 'number' ? photo.variants[idx].quantity : defaultQuantity || 1);
      const isAvail = minQ > 0;
      return {
        id: photo.variants?.[idx]?.id || `v-${idx + 1}`,
        label: lbl,
        minQuantity: minQ,
        quantity: minQ,
        isAvailable: isAvail,
        inStock: isAvail
      };
    });

    onSave(photo.id, {
      photoCode: photoCode.trim(),
      title: photoCode.trim(),
      name: photoCode.trim(),
      categoryId: categoryId as any,
      subCategoryId,
      subCategoryName: sub ? sub.name : photo.subCategoryName,
      imageUri: imageUri.trim(),
      videoUri: videoUri.trim() ? videoUri.trim() : undefined,
      defaultQuantity: Number(defaultQuantity),
      itemCount: parsedLabels.length > 0 ? parsedLabels.length : Number(itemCount),
      customLabels: parsedLabels.length > 0 ? parsedLabels : undefined,
      variants: generatedVariants.length > 0 ? generatedVariants : photo.variants,
      description: description.trim()
    });
    onClose();
  };

  const filteredSubs = subCategories.filter(s => s.categoryId === categoryId);

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ImageIcon size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Edit Catalog Photo</h3>
              <p className="text-[11px] font-mono text-amber-400 font-bold">{photo.photoCode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={e => {
                  const newCat = e.target.value;
                  setCategoryId(newCat);
                  const firstSub = subCategories.find(s => s.categoryId === newCat);
                  if (firstSub) setSubCategoryId(firstSub.id);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.displayName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Subcategory</label>
              <select
                value={subCategoryId}
                onChange={e => setSubCategoryId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              >
                {filteredSubs.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Photo Code / Name *</label>
              <input
                type="text"
                required
                value={photoCode}
                onChange={e => setPhotoCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Default Pack Pcs *</label>
              <input
                type="number"
                min={1}
                required
                value={defaultQuantity}
                onChange={e => setDefaultQuantity(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">16:9 Image URL *</label>
            <input
              type="url"
              required
              value={imageUri}
              onChange={e => setImageUri(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
            />
          </div>

          {/* Quick Preview Thumbnail */}
          {imageUri && (
            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 relative">
              <img src={imageUri} alt="Preview" className="w-full h-full object-contain" />
              <span className="absolute bottom-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] text-amber-400 font-mono">
                16:9 HDTV Preview
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">HDTV 16:9 Video URL (Optional)</label>
            <input
              type="url"
              placeholder="https://...mp4"
              value={videoUri}
              onChange={e => setVideoUri(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Items Count</label>
              <select
                value={itemCount}
                onChange={e => setItemCount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              >
                <option value={1}>1 Item</option>
                <option value={2}>2 Items</option>
                <option value={3}>3 Items</option>
                <option value={4}>4 Items</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Variant Labels (A,B or 1,2 or 1KG,2KG)
              </label>
              <input
                type="text"
                placeholder="e.g. 1KG, 2KG or 1, 2"
                value={customLabelsInput}
                onChange={e => setCustomLabelsInput(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-amber-300 font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition shadow-lg"
            >
              <Save size={14} />
              <span>Save Photo Changes</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
