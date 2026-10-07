import { ThumbnailCropModal } from './ThumbnailCropModal';
import { BrandLogo } from './BrandLogo';
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { Plus, Edit2, Trash2, ArrowLeft, ChevronDown, Check, Lock, ShieldCheck, X, CheckCircle2, Loader2, ImagePlus } from 'lucide-react';
import { getTextColorForBackground } from '../utils';

interface CategoryManagerProps {
  onClose: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ onClose }) => {
  const { categories, subCategories, addCategory, updateCategory, deleteCategory, addSubCategory, updateSubCategory, deleteSubCategory } = useAppStore();

  // Pending thumbnail preview state before explicit Save
  const [pendingCatThumbnail, setPendingCatThumbnail] = useState<string | null>(null);
  const [pendingSubThumbnail, setPendingSubThumbnail] = useState<string | null>(null);
  const [isSavingCat, setIsSavingCat] = useState(false);
  const [isSavingSub, setIsSavingSub] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Left Panel: Category selection & editing
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(categories[0]?.id || null);
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  // Right Panel: Independent Category & Subcategory selection
  const [rightCategoryId, setRightCategoryId] = useState<string | null>(categories[0]?.id || null);
  const rightCategory = categories.find(c => c.id === rightCategoryId);
  const rightSubcategories = subCategories.filter(s => s.categoryId === rightCategoryId);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>('');
  const selectedSubcategory = rightSubcategories.find(s => s.id === selectedSubcategoryId);

  // Editing existing item state
  const [editingCategory, setEditingCategory] = useState(false);
  const [catNameInput, setCatNameInput] = useState('');
  const [catColorInput, setCatColorInput] = useState('');
  const [editingSub, setEditingSub] = useState(false);
  const [subNameInput, setSubNameInput] = useState('');

  // Add Category Creation State (Mandatory Thumbnail)
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#4f46e5');
  const [newCatThumbnail, setNewCatThumbnail] = useState<string | null>(null);

  // Add Subcategory Creation State (Mandatory Thumbnail)
  const [isAddingSubcategory, setIsAddingSubcategory] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubThumbnail, setNewSubThumbnail] = useState<string | null>(null);

  // Delete confirmation popup state
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'CATEGORY' | 'SUBCATEGORY'; id: string; name: string } | null>(null);

  // Cropping Modal State
  const [cropTarget, setCropTarget] = useState<{
    file: File;
    type: "CATEGORY" | "SUBCATEGORY" | "NEW_CATEGORY" | "NEW_SUBCATEGORY";
    targetId: string;
    title: string;
  } | null>(null);

  // File input refs
  const catImageRef = useRef<HTMLInputElement>(null);
  const newCatImageRef = useRef<HTMLInputElement>(null);
  const subImageRef = useRef<HTMLInputElement>(null);
  const newSubImageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPendingCatThumbnail(null);
  }, [selectedCategoryId]);

  useEffect(() => {
    setPendingSubThumbnail(null);
  }, [selectedSubcategoryId]);

  useEffect(() => {
    if (categories.length > 0 && (!selectedCategoryId || !categories.some(c => c.id === selectedCategoryId))) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    if (categories.length > 0 && (!rightCategoryId || !categories.some(c => c.id === rightCategoryId))) {
      setRightCategoryId(categories[0].id);
    }
  }, [categories, rightCategoryId]);

  useEffect(() => {
    if (rightCategoryId) {
      const subs = subCategories.filter(s => s.categoryId === rightCategoryId);
      if (!subs.some(s => s.id === selectedSubcategoryId)) {
        setSelectedSubcategoryId('');
      }
    }
  }, [rightCategoryId, subCategories, selectedSubcategoryId]);

  // Image Upload Handlers
  const handleCatImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedCategoryId && selectedCategory) {
      setCropTarget({
        file,
        type: "CATEGORY",
        targetId: selectedCategoryId,
        title: `Category: ${selectedCategory.displayName.toUpperCase()}`
      });
    }
    e.target.value = '';
  };

  const handleNewCatImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCropTarget({
        file,
        type: "NEW_CATEGORY",
        targetId: 'new-cat',
        title: `New Category: ${(newCatName || 'Category').toUpperCase()}`
      });
    }
    e.target.value = '';
  };

  const handleSubImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedSubcategoryId && selectedSubcategory) {
      setCropTarget({
        file,
        type: "SUBCATEGORY",
        targetId: selectedSubcategoryId,
        title: `Subcategory: ${selectedSubcategory.name.toUpperCase()}`
      });
    }
    e.target.value = '';
  };

  const handleNewSubImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCropTarget({
        file,
        type: "NEW_SUBCATEGORY",
        targetId: 'new-sub',
        title: `New Subcategory: ${(newSubName || 'Subcategory').toUpperCase()}`
      });
    }
    e.target.value = '';
  };

  const handleSaveCroppedThumbnail = (croppedDataUrl: string) => {
    if (!cropTarget) return;
    if (cropTarget.type === "CATEGORY") {
      setPendingCatThumbnail(croppedDataUrl);
    } else if (cropTarget.type === "NEW_CATEGORY") {
      setNewCatThumbnail(croppedDataUrl);
    } else if (cropTarget.type === "SUBCATEGORY") {
      setPendingSubThumbnail(croppedDataUrl);
    } else if (cropTarget.type === "NEW_SUBCATEGORY") {
      setNewSubThumbnail(croppedDataUrl);
    }
    setCropTarget(null);
  };

  // Creation Handlers (Thumbnails Mandatory)
  const handleConfirmCreateCategory = () => {
    if (!newCatThumbnail || !newCatName.trim()) return;
    const id = `cat-${Date.now()}`;
    addCategory({
      id,
      displayName: newCatName.trim(),
      thumbnailUrl: newCatThumbnail,
      accentColorHex: newCatColor || '#4f46e5',
      sortOrder: categories.length + 1
    });
    setSelectedCategoryId(id);
    setIsAddingCategory(false);
    setNewCatName('');
    setNewCatThumbnail(null);
    setToastMessage(`Category "${newCatName.trim()}" created successfully!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleConfirmCreateSubcategory = () => {
    if (!rightCategoryId || !newSubThumbnail || !newSubName.trim()) return;
    const id = `sub-${Date.now()}`;
    addSubCategory({
      id,
      categoryId: rightCategoryId,
      name: newSubName.trim(),
      iconName: 'Box',
      thumbnailUrl: newSubThumbnail,
      photoCount: 0,
      sortOrder: rightSubcategories.length + 1
    });
    setSelectedSubcategoryId(id);
    setIsAddingSubcategory(false);
    setNewSubName('');
    setNewSubThumbnail(null);
    setToastMessage(`Subcategory "${newSubName.trim()}" created successfully!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Thumbnail Update Handlers
  const handleSaveCategoryThumbnail = async () => {
    if (!selectedCategoryId || !pendingCatThumbnail) return;
    setIsSavingCat(true);
    try {
      updateCategory(selectedCategoryId, { thumbnailUrl: pendingCatThumbnail });
      setPendingCatThumbnail(null);
      setToastMessage(`Category "${selectedCategory?.displayName}" thumbnail saved successfully!`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Failed to save category thumbnail:', err);
      alert('Failed to save category thumbnail to Firebase.');
    } finally {
      setIsSavingCat(false);
    }
  };

  const handleSaveSubCategoryThumbnail = async () => {
    if (!selectedSubcategoryId || !pendingSubThumbnail) return;
    setIsSavingSub(true);
    try {
      updateSubCategory(selectedSubcategoryId, { thumbnailUrl: pendingSubThumbnail });
      setPendingSubThumbnail(null);
      setToastMessage(`Subcategory "${selectedSubcategory?.name}" thumbnail saved successfully!`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Failed to save subcategory thumbnail:', err);
      alert('Failed to save subcategory thumbnail to Firebase.');
    } finally {
      setIsSavingSub(false);
    }
  };

  const startEditCategory = () => {
    if (!selectedCategory) return;
    setCatNameInput(selectedCategory.displayName);
    setCatColorInput(selectedCategory.accentColorHex);
    setEditingCategory(true);
  };

  const saveCategory = () => {
    if (!selectedCategoryId) return;
    updateCategory(selectedCategoryId, { displayName: catNameInput, accentColorHex: catColorInput });
    setEditingCategory(false);
  };

  const startEditSub = () => {
    if (!selectedSubcategory) return;
    setSubNameInput(selectedSubcategory.name);
    setEditingSub(true);
  };

  const saveSub = () => {
    if (!selectedSubcategoryId) return;
    updateSubCategory(selectedSubcategoryId, { name: subNameInput });
    setEditingSub(false);
  };

  return (
    <>
      {cropTarget && (
        <ThumbnailCropModal
          imageFile={cropTarget.file}
          targetTitle={cropTarget.title}
          onClose={() => setCropTarget(null)}
          onSave={handleSaveCroppedThumbnail}
        />
      )}
      <div className="fixed inset-0 z-50 bg-[#02050f] flex flex-col select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-black px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-[0_4px_20px_rgba(16,185,129,0.5)] flex items-center gap-2.5 border border-emerald-400">
          <CheckCircle2 size={18} strokeWidth={2.5} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden inputs */}
      <input type="file" ref={catImageRef} onChange={handleCatImageUpload} accept="image/*" className="hidden" />
      <input type="file" ref={newCatImageRef} onChange={handleNewCatImageUpload} accept="image/*" className="hidden" />
      <input type="file" ref={subImageRef} onChange={handleSubImageUpload} accept="image/*" className="hidden" />
      <input type="file" ref={newSubImageRef} onChange={handleNewSubImageUpload} accept="image/*" className="hidden" />

      {/* Top Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-[#070b14]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Lock size={18} />
          </div>
          <div>
            <h1 className="text-base font-black text-white flex items-center gap-2">
              <span>Thumbnail Studio</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Max 5 MB
              </span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="px-4.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 hover:bg-slate-700 text-slate-100 text-sm font-bold flex items-center gap-2 transition shadow-md">
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
          <BrandLogo size="sm" />
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Categories Only */}
        <div className="flex-1 p-8 border-r border-slate-800 flex flex-col items-center overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-md space-y-4">
            
            {/* Category Select Dropdown */}
            <div className="relative">
              <select 
                className="w-full appearance-none font-bold p-4 rounded-xl focus:outline-none cursor-pointer transition-colors shadow-lg"
                style={{ 
                  backgroundColor: selectedCategory?.accentColorHex ? `${selectedCategory.accentColorHex}dd` : '#7c5cdb',
                  color: selectedCategory?.accentColorHex ? getTextColorForBackground(selectedCategory.accentColorHex) : '#ffffff'
                }}
                value={selectedCategoryId || ''}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id} style={{ color: '#000' }}>{c.displayName.toUpperCase()}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: selectedCategory?.accentColorHex ? getTextColorForBackground(selectedCategory.accentColorHex) : '#ffffff' }} />
            </div>

            {/* Selected Category Card (Edit / Delete) */}
            {selectedCategory && (
              <div 
                className="font-bold p-4 rounded-xl flex items-center justify-between transition-colors shadow-lg"
                style={{ 
                  backgroundColor: selectedCategory.accentColorHex || '#a69c73',
                  color: getTextColorForBackground(selectedCategory.accentColorHex || '#a69c73')
                }}
              >
                {editingCategory ? (
                  <div className="flex-1 flex items-center gap-3">
                    <input type="color" value={catColorInput} onChange={e => setCatColorInput(e.target.value)} className="w-8 h-8 rounded border-none cursor-pointer bg-transparent" />
                    <input 
                      type="text" 
                      value={catNameInput} 
                      onChange={e => setCatNameInput(e.target.value)} 
                      className="bg-black/10 px-2 py-1 rounded outline-none flex-1 font-bold"
                    />
                    <button onClick={saveCategory} className="p-1 hover:bg-black/20 rounded"><Check size={18} /></button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border border-black/30" style={{ backgroundColor: selectedCategory.accentColorHex }} />
                      <span>{selectedCategory.displayName.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={startEditCategory} title="Edit Category Name & Color" className="p-1 hover:bg-black/10 rounded"><Edit2 size={16} /></button>
                      <button onClick={() => setDeleteConfirm({ type: 'CATEGORY', id: selectedCategory.id, name: selectedCategory.displayName })} title="Delete Category" className="p-1 hover:bg-black/10 rounded text-red-900"><Trash2 size={16} /></button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Add Category Flow (Mandatory Thumbnail) */}
            {isAddingCategory ? (
              <div className="bg-[#0f172a] border border-amber-500/40 rounded-2xl p-4 space-y-3.5 shadow-xl animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus size={14} /> New Category
                  </span>
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsAddingCategory(false);
                      setNewCatName('');
                      setNewCatThumbnail(null);
                    }}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Category Name
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={newCatColor} 
                        onChange={e => setNewCatColor(e.target.value)} 
                        className="w-9 h-9 rounded-lg border border-slate-700 cursor-pointer bg-transparent p-0.5 flex-shrink-0" 
                        title="Choose Accent Color"
                      />
                      <input 
                        type="text" 
                        placeholder="e.g. COSMETICS, PERFUMES..."
                        value={newCatName} 
                        onChange={e => setNewCatName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-xs uppercase focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Category Thumbnail (9:5)
                      </label>
                      {!newCatThumbnail ? (
                        <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                          Thumbnail required
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                          <Check size={10} strokeWidth={3} /> Ready
                        </span>
                      )}
                    </div>

                    {newCatThumbnail ? (
                      <div className="aspect-[9/5] w-full rounded-xl overflow-hidden relative border border-emerald-500/40 bg-black">
                        <img src={newCatThumbnail} alt="Category Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => newCatImageRef.current?.click()}
                          className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/80 hover:bg-black text-white text-[11px] font-bold rounded-lg border border-slate-600 shadow"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => newCatImageRef.current?.click()}
                        className="aspect-[9/5] w-full rounded-xl border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 flex flex-col items-center justify-center gap-2 cursor-pointer transition"
                      >
                        <div className="p-2.5 rounded-full bg-amber-500/10 text-amber-400">
                          <ImagePlus size={20} />
                        </div>
                        <span className="text-xs font-bold text-amber-300">Click to Upload Thumbnail</span>
                        <span className="text-[10px] text-slate-400">9:5 locked • Max 5 MB</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddingCategory(false);
                      setNewCatName('');
                      setNewCatThumbnail(null);
                    }}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-lg text-xs transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={handleConfirmCreateCategory}
                    disabled={!newCatThumbnail || !newCatName.trim()}
                    className={`flex-1 py-2 font-black rounded-lg text-xs transition flex items-center justify-center gap-1.5 ${
                      !newCatThumbnail || !newCatName.trim()
                        ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 active:scale-95'
                    }`}
                  >
                    {!newCatThumbnail ? (
                      <span>Thumbnail required</span>
                    ) : (
                      <>
                        <Check size={14} strokeWidth={3} />
                        <span>Create Category</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => {
                  setIsAddingCategory(true);
                  setNewCatName('');
                  setNewCatThumbnail(null);
                }} 
                className="w-full py-2.5 border border-slate-700 border-dashed rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 text-sm font-bold flex justify-center items-center gap-2 transition"
              >
                <Plus size={16} /> Add Category
              </button>
            )}

            {/* Category Thumbnail Box */}
            {selectedCategory && (
              <div className="mt-8 flex flex-col items-center w-full">
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300">Category Thumbnail</span>
                  <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    9:5 (900×500) Locked
                  </span>
                </div>
                <div className="bg-[#141b2d] p-3 rounded-2xl w-full aspect-[9/5] flex items-center justify-center relative group overflow-hidden border border-slate-700 shadow-xl">
                  <img src={pendingCatThumbnail || selectedCategory.thumbnailUrl} alt={selectedCategory.displayName} className="w-full h-full object-cover rounded-xl" />
                  {pendingCatThumbnail && (
                    <div className="absolute top-3 left-3 bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded shadow-lg flex items-center gap-1 uppercase tracking-wider">
                      <span>Unsaved Preview</span>
                    </div>
                  )}
                </div>

                {pendingCatThumbnail ? (
                  <div className="w-full mt-3 flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl">
                    <span className="text-xs text-amber-300 font-medium">Commit this new thumbnail?</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPendingCatThumbnail(null)}
                        disabled={isSavingCat}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                      >
                        <X size={14} />
                        <span>Cancel</span>
                      </button>
                      <button
                        onClick={handleSaveCategoryThumbnail}
                        disabled={isSavingCat}
                        className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-lg text-xs transition shadow flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                      >
                        {isSavingCat ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check size={14} strokeWidth={3} />
                            <span>Save</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full mt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-slate-400">
                      <ShieldCheck size={13} className="text-emerald-400" /> Max file size: 5 MB
                    </span>
                    <button 
                      onClick={() => catImageRef.current?.click()}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-lg text-xs transition shadow active:scale-95"
                    >
                      Change Thumbnail
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Subcategories Management (Independent Category & Subcategory Selectors) */}
        <div className="flex-1 p-8 flex flex-col items-center overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-md space-y-4">
            
            {/* Top Selector Pair */}
            {/* 1. Category Selector (Independent from Left Panel) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                1. Select Category
              </label>
              <div className="relative">
                <select 
                  className="w-full appearance-none bg-slate-900 border border-slate-700 hover:border-slate-600 text-white font-bold p-3.5 rounded-xl focus:outline-none cursor-pointer text-sm shadow-md"
                  value={rightCategoryId || ''}
                  onChange={(e) => {
                    setRightCategoryId(e.target.value);
                    setSelectedSubcategoryId('');
                  }}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.displayName.toUpperCase()}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={18} />
              </div>
            </div>

            {/* 2. Subcategory Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                2. Select Subcategory ({rightSubcategories.length})
              </label>
              <div className="relative">
                <select 
                  className="w-full appearance-none bg-[#7c5cdb] hover:bg-[#6b4ab5] text-white font-bold p-3.5 rounded-xl focus:outline-none cursor-pointer text-sm shadow-md"
                  value={selectedSubcategoryId || ''}
                  onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                >
                  <option value="">-- Select Subcategory --</option>
                  {rightSubcategories.map(s => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                      {s.name.toUpperCase()}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white" size={18} />
              </div>
            </div>

            {/* Selected Subcategory Card (Edit Name / Delete) */}
            {selectedSubcategory && (
              <div className="bg-[#7c5cdb] text-white font-bold p-4 rounded-xl flex items-center justify-between shadow-lg">
                {editingSub ? (
                  <div className="flex-1 flex items-center gap-3">
                    <input 
                      type="text" 
                      value={subNameInput} 
                      onChange={e => setSubNameInput(e.target.value)} 
                      className="bg-black/20 px-2 py-1 rounded outline-none flex-1 font-bold text-white"
                    />
                    <button onClick={saveSub} className="p-1 hover:bg-black/20 rounded"><Check size={18} /></button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span>{selectedSubcategory.name.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={startEditSub} title="Edit Subcategory Name" className="p-1 hover:bg-black/10 rounded"><Edit2 size={16} /></button>
                      <button onClick={() => setDeleteConfirm({ type: 'SUBCATEGORY', id: selectedSubcategory.id, name: selectedSubcategory.name })} title="Delete Subcategory" className="p-1 hover:bg-black/10 rounded text-red-200"><Trash2 size={16} /></button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Add Subcategory Flow (Mandatory Thumbnail) */}
            {isAddingSubcategory ? (
              <div className="bg-[#0f172a] border border-amber-500/40 rounded-2xl p-4 space-y-3.5 shadow-xl animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus size={14} /> New Subcategory in {rightCategory?.displayName || 'Category'}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsAddingSubcategory(false);
                      setNewSubName('');
                      setNewSubThumbnail(null);
                    }}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Subcategory Name
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. LIPSTICKS, EARRINGS, NAIL POLISH..."
                      value={newSubName} 
                      onChange={e => setNewSubName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-xs uppercase focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Subcategory Thumbnail (9:5)
                      </label>
                      {!newSubThumbnail ? (
                        <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                          Thumbnail required
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                          <Check size={10} strokeWidth={3} /> Ready
                        </span>
                      )}
                    </div>

                    {newSubThumbnail ? (
                      <div className="aspect-[9/5] w-full rounded-xl overflow-hidden relative border border-emerald-500/40 bg-black">
                        <img src={newSubThumbnail} alt="Subcategory Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => newSubImageRef.current?.click()}
                          className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/80 hover:bg-black text-white text-[11px] font-bold rounded-lg border border-slate-600 shadow"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => newSubImageRef.current?.click()}
                        className="aspect-[9/5] w-full rounded-xl border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 flex flex-col items-center justify-center gap-2 cursor-pointer transition"
                      >
                        <div className="p-2.5 rounded-full bg-amber-500/10 text-amber-400">
                          <ImagePlus size={20} />
                        </div>
                        <span className="text-xs font-bold text-amber-300">Click to Upload Thumbnail</span>
                        <span className="text-[10px] text-slate-400">9:5 locked • Max 5 MB</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddingSubcategory(false);
                      setNewSubName('');
                      setNewSubThumbnail(null);
                    }}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-lg text-xs transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={handleConfirmCreateSubcategory}
                    disabled={!newSubThumbnail || !newSubName.trim()}
                    className={`flex-1 py-2 font-black rounded-lg text-xs transition flex items-center justify-center gap-1.5 ${
                      !newSubThumbnail || !newSubName.trim()
                        ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 active:scale-95'
                    }`}
                  >
                    {!newSubThumbnail ? (
                      <span>Thumbnail required</span>
                    ) : (
                      <>
                        <Check size={14} strokeWidth={3} />
                        <span>Create Subcategory</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => {
                  setIsAddingSubcategory(true);
                  setNewSubName('');
                  setNewSubThumbnail(null);
                }} 
                disabled={!rightCategoryId}
                className="w-full py-2.5 border border-slate-700 border-dashed rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 text-sm font-bold flex justify-center items-center gap-2 transition disabled:opacity-50"
              >
                <Plus size={16} /> Add Subcategory
              </button>
            )}

            {/* Subcategory Thumbnail Box */}
            {selectedSubcategory && (
              <div className="mt-8 flex flex-col items-center w-full">
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300">Subcategory Thumbnail</span>
                  <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    9:5 (900×500) Locked
                  </span>
                </div>
                <div className="bg-[#141b2d] p-3 rounded-2xl w-full aspect-[9/5] flex items-center justify-center relative group overflow-hidden border border-slate-700 shadow-xl">
                  <img src={pendingSubThumbnail || selectedSubcategory.thumbnailUrl} alt={selectedSubcategory.name} className="w-full h-full object-cover rounded-xl" />
                  {pendingSubThumbnail && (
                    <div className="absolute top-3 left-3 bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded shadow-lg flex items-center gap-1 uppercase tracking-wider">
                      <span>Unsaved Preview</span>
                    </div>
                  )}
                </div>

                {pendingSubThumbnail ? (
                  <div className="w-full mt-3 flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl">
                    <span className="text-xs text-amber-300 font-medium">Commit this new thumbnail?</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPendingSubThumbnail(null)}
                        disabled={isSavingSub}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                      >
                        <X size={14} />
                        <span>Cancel</span>
                      </button>
                      <button
                        onClick={handleSaveSubCategoryThumbnail}
                        disabled={isSavingSub}
                        className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-lg text-xs transition shadow flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                      >
                        {isSavingSub ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check size={14} strokeWidth={3} />
                            <span>Save</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full mt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-slate-400">
                      <ShieldCheck size={13} className="text-emerald-400" /> Max file size: 5 MB
                    </span>
                    <button 
                      onClick={() => subImageRef.current?.click()}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-lg text-xs transition shadow active:scale-95"
                    >
                      Change Thumbnail
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Red Confirmation Popup Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-red-500/50 rounded-2xl max-w-md w-full p-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider">Confirm Deletion</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-300 mb-6 bg-red-500/5 border border-red-500/20 p-4 rounded-xl leading-relaxed">
              Are you sure you want to delete this {deleteConfirm.type === 'CATEGORY' ? 'Category' : 'Subcategory'}: <strong className="text-white uppercase font-bold">"{deleteConfirm.name}"</strong>? All associated items will be deleted.
            </p>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (deleteConfirm.type === 'CATEGORY') {
                    deleteCategory(deleteConfirm.id);
                  } else {
                    deleteSubCategory(deleteConfirm.id);
                  }
                  setDeleteConfirm(null);
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition shadow-[0_4px_15px_rgba(239,68,68,0.4)]"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};
