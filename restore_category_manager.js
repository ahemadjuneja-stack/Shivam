const fs = require('fs');
const cleanCode = `import React, { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { Plus, Edit2, Trash2, ArrowLeft, ChevronDown, Check, Lock, ShieldCheck } from 'lucide-react';
import { getTextColorForBackground } from '../utils';

interface CategoryManagerProps {
  onClose: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ onClose }) => {
  const { categories, subCategories, addCategory, updateCategory, deleteCategory, addSubCategory, updateSubCategory, deleteSubCategory } = useAppStore();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(categories[0]?.id || null);
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  
  const relevantSubcategories = subCategories.filter(s => s.categoryId === selectedCategoryId);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>('');
  const selectedSubcategory = relevantSubcategories.find(s => s.id === selectedSubcategoryId);

  // Editing state
  const [editingCategory, setEditingCategory] = useState(false);
  const [catNameInput, setCatNameInput] = useState('');
  const [catColorInput, setCatColorInput] = useState('');
  const [editingSub, setEditingSub] = useState(false);
  const [subNameInput, setSubNameInput] = useState('');

  // Delete confirmation popup state
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'CATEGORY' | 'SUBCATEGORY'; id: string; name: string } | null>(null);

  const catImageRef = useRef<HTMLInputElement>(null);
  const subImageRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (selectedCategoryId) {
      const subs = subCategories.filter(s => s.categoryId === selectedCategoryId);
      if (!subs.some(s => s.id === selectedSubcategoryId)) {
        setSelectedSubcategoryId('');
      }
    }
  }, [selectedCategoryId, subCategories]);

  const handleCreateCategory = () => {
    const id = \`cat-\${Date.now()}\`;
    addCategory({
      id,
      displayName: 'New Category',
      thumbnailUrl: 'https://images.unsplash.com/photo-1599643478514-4a410f0a82ef?auto=format&fit=crop&q=80&w=600',
      accentColorHex: '#4f46e5',
      sortOrder: categories.length + 1
    });
    setSelectedCategoryId(id);
  };

  const handleCreateSubcategory = () => {
    if (!selectedCategoryId) return;
    const id = \`sub-\${Date.now()}\`;
    addSubCategory({
      id,
      categoryId: selectedCategoryId,
      name: 'New Subcategory',
      iconName: 'Box',
      thumbnailUrl: 'https://images.unsplash.com/photo-1599643478514-4a410f0a82ef?auto=format&fit=crop&q=80&w=600',
      photoCount: 0,
      sortOrder: relevantSubcategories.length + 1
    });
    setSelectedSubcategoryId(id);
  };

  const handleCatImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedCategoryId) {
      updateCategory(selectedCategoryId, { thumbnailUrl: URL.createObjectURL(file) });
    }
    e.target.value = '';
  };

  const handleSubImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedSubcategoryId) {
      updateSubCategory(selectedSubcategoryId, { thumbnailUrl: URL.createObjectURL(file) });
    }
    e.target.value = '';
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
    <div className="fixed inset-0 z-50 bg-[#02050f] flex flex-col select-none">
      {/* Hidden inputs */}
      <input type="file" ref={catImageRef} onChange={handleCatImageUpload} accept="image/*" className="hidden" />
      <input type="file" ref={subImageRef} onChange={handleSubImageUpload} accept="image/*" className="hidden" />

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
          <button onClick={onClose} className="px-4 py-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-lg text-sm font-bold flex items-center gap-2 transition">
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Categories */}
        <div className="flex-1 p-8 border-r border-slate-800 flex flex-col items-center overflow-y-auto">
          <div className="w-full max-w-md space-y-4">
            <div className="relative">
              <select 
                className="w-full appearance-none font-bold p-4 rounded-lg focus:outline-none cursor-pointer transition-colors shadow-lg"
                style={{ 
                  backgroundColor: selectedCategory?.accentColorHex ? \`\${selectedCategory.accentColorHex}dd\` : '#7c5cdb',
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

            {selectedCategory && (
              <div 
                className="font-bold p-4 rounded-lg flex items-center justify-between transition-colors shadow-lg"
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
                      className="bg-black/10 px-2 py-1 rounded outline-none flex-1"
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
                      <button onClick={startEditCategory} className="p-1 hover:bg-black/10 rounded"><Edit2 size={16} /></button>
                      <button onClick={() => setDeleteConfirm({ type: 'CATEGORY', id: selectedCategory.id, name: selectedCategory.displayName })} className="p-1 hover:bg-black/10 rounded text-red-900"><Trash2 size={16} /></button>
                    </div>
                  </>
                )}
              </div>
            )}

            <button onClick={handleCreateCategory} className="w-full py-2 border border-slate-700 border-dashed rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-bold flex justify-center items-center gap-2">
              <Plus size={16} /> Add Category
            </button>

            {selectedCategory && (
              <div className="mt-8 flex flex-col items-center w-full">
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300">Category Thumbnail</span>
                  <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    16:9 (1280×720) Locked
                  </span>
                </div>
                <div className="bg-[#141b2d] p-3 rounded-2xl w-full aspect-video flex items-center justify-center relative group overflow-hidden border border-slate-700 shadow-xl">
                  <img src={selectedCategory.thumbnailUrl} alt={selectedCategory.displayName} className="w-full h-full object-cover rounded-xl" />
                </div>
                <div className="w-full mt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-slate-400">
                    <ShieldCheck size={13} className="text-emerald-400" /> Max file size: 5 MB
                  </span>
                  <button 
                    onClick={() => catImageRef.current?.click()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-lg text-xs transition shadow"
                  >
                    Change Thumbnail
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Subcategories */}
        <div className="flex-1 p-8 flex flex-col items-center overflow-y-auto">
          <div className="w-full max-w-md space-y-4">
            <div className="relative">
              <select 
                className="w-full appearance-none font-bold p-4 rounded-lg focus:outline-none cursor-pointer transition-colors shadow-lg"
                style={{ 
                  backgroundColor: selectedCategory?.accentColorHex ? \`\${selectedCategory.accentColorHex}dd\` : '#7c5cdb',
                  color: selectedCategory?.accentColorHex ? getTextColorForBackground(selectedCategory.accentColorHex) : '#ffffff'
                }}
                value={selectedCategoryId || ''}
                disabled={true}
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id} style={{ color: '#000' }}>{c.displayName.toUpperCase()}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: selectedCategory?.accentColorHex ? getTextColorForBackground(selectedCategory.accentColorHex) : '#ffffff' }} />
            </div>

            {selectedCategory && (
              <div 
                className="font-bold p-4 rounded-lg flex items-center justify-between transition-colors shadow-lg"
                style={{ 
                  backgroundColor: selectedCategory.accentColorHex || '#a69c73',
                  color: getTextColorForBackground(selectedCategory.accentColorHex || '#a69c73')
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border border-black/30" style={{ backgroundColor: selectedCategory.accentColorHex }} />
                  <span>{selectedCategory.displayName.toUpperCase()}</span>
                </div>
              </div>
            )}

            <div className="relative mt-6">
              <select 
                className="w-full appearance-none bg-[#7c5cdb] hover:bg-[#6b4ab5] text-white font-bold p-4 rounded-lg focus:outline-none cursor-pointer"
                value={selectedSubcategoryId || ''}
                onChange={(e) => setSelectedSubcategoryId(e.target.value)}
              >
                <option value="">-- Select Subcategory --</option>
                {relevantSubcategories.map(s => (
                  <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white" />
            </div>

            {selectedSubcategory && (
              <div className="bg-[#7c5cdb] text-white font-bold p-4 rounded-lg flex items-center justify-between shadow-lg">
                {editingSub ? (
                  <div className="flex-1 flex items-center gap-3">
                    <input 
                      type="text" 
                      value={subNameInput} 
                      onChange={e => setSubNameInput(e.target.value)}
                      className="bg-black/20 px-2 py-1 rounded outline-none flex-1"
                    />
                    <button onClick={saveSub} className="p-1 hover:bg-black/20 rounded"><Check size={18} /></button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span>{selectedSubcategory.name.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={startEditSub} className="p-1 hover:bg-black/10 rounded"><Edit2 size={16} /></button>
                      <button onClick={() => setDeleteConfirm({ type: 'SUBCATEGORY', id: selectedSubcategory.id, name: selectedSubcategory.name })} className="p-1 hover:bg-black/10 rounded text-red-200"><Trash2 size={16} /></button>
                    </div>
                  </>
                )}
              </div>
            )}

            <button 
              onClick={handleCreateSubcategory} 
              disabled={!selectedCategoryId}
              className="w-full py-2 border border-slate-700 border-dashed rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-bold flex justify-center items-center gap-2 disabled:opacity-50"
            >
              <Plus size={16} /> Add Subcategory
            </button>

            {selectedSubcategory && (
              <div className="mt-8 flex flex-col items-center w-full">
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300">Subcategory Thumbnail</span>
                  <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    16:9 (1280×720) Locked
                  </span>
                </div>
                <div className="bg-[#141b2d] p-3 rounded-2xl w-full aspect-video flex items-center justify-center relative group overflow-hidden border border-slate-700 shadow-xl">
                  <img src={selectedSubcategory.thumbnailUrl} alt={selectedSubcategory.name} className="w-full h-full object-cover rounded-xl" />
                </div>
                <div className="w-full mt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-slate-400">
                    <ShieldCheck size={13} className="text-emerald-400" /> Max file size: 5 MB
                  </span>
                  <button 
                    onClick={() => subImageRef.current?.click()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-lg text-xs transition shadow"
                  >
                    Change Thumbnail
                  </button>
                </div>
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
  );
};
`;

fs.writeFileSync('src/components/CategoryManager.tsx', cleanCode);
console.log("Restored cleanly without warnings!");
