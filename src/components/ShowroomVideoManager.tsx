import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Trash2,
  Check,
  Image as ImageIcon,
  Folder,
  Layers,
  Sparkles,
  ListOrdered
} from 'lucide-react';
import { useAppStore } from '../store';
import type { CatalogPhoto } from '../types';
import {
  syncCategoryToFirebase,
  syncSubCategoryToFirebase,
  syncPhotoToFirebase,
  toggleProductHideInFirebase,
  deletePhotoFromFirebase
} from '../services/firebaseSync';
import { ProductUploadEditor } from './ProductUploadEditor';
import { CommonLoader } from './CommonLoader';
import { BrandLogo } from './BrandLogo';

interface ShowroomVideoManagerProps {
  onClose: () => void;
}

type GalleryViewMode = 'CATEGORIES' | 'SUBCATEGORIES' | 'PRODUCTS';

export const ShowroomVideoManager: React.FC<ShowroomVideoManagerProps> = ({ onClose }) => {
  const {
    categories,
    setCategories,
    subCategories,
    setSubCategories,
    photos,
    setPhotos,
    updatePhoto,
    deletePhoto,
    catalogDataLoaded
  } = useAppStore();

  // Navigation & Drilldown State
  const [viewMode, setViewMode] = useState<GalleryViewMode>('CATEGORIES');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string | null>(null);

  // Reorder & Action States
  const [isReorderActive, setIsReorderActive] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<CatalogPhoto | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Selected entities for breadcrumbs & context
  const selectedCategory = useMemo(() => {
    return categories.find(c => c.id === selectedCategoryId) || null;
  }, [categories, selectedCategoryId]);

  const selectedSubCategory = useMemo(() => {
    return subCategories.find(s => s.id === selectedSubCategoryId) || null;
  }, [subCategories, selectedSubCategoryId]);

  // Current Items List depending on view
  const currentCategories = useMemo(() => {
    return [...categories].sort((a, b) => (a.orderIndex ?? a.sortOrder ?? 0) - (b.orderIndex ?? b.sortOrder ?? 0));
  }, [categories]);

  const currentSubCategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    return subCategories
      .filter(s => s.categoryId === selectedCategoryId)
      .sort((a, b) => (a.orderIndex ?? a.sortOrder ?? 0) - (b.orderIndex ?? b.sortOrder ?? 0));
  }, [subCategories, selectedCategoryId]);

  const currentPhotos = useMemo(() => {
    if (!selectedSubCategoryId) return [];
    return photos
      .filter(p => p.subCategoryId === selectedSubCategoryId)
      .sort((a, b) => (a.orderIndex ?? a.sortOrder ?? 0) - (b.orderIndex ?? b.sortOrder ?? 0));
  }, [photos, selectedSubCategoryId]);

  // ---------------------------------------------------------------------------
  // REORDERING LOGIC & PERSISTENCE
  // ---------------------------------------------------------------------------
  const moveItem = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (viewMode === 'CATEGORIES') {
      if (targetIndex < 0 || targetIndex >= currentCategories.length) return;
      const updated = [...currentCategories];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;

      updated.forEach((c, idx) => {
        c.sortOrder = idx;
        c.orderIndex = idx;
        syncCategoryToFirebase(c).catch(console.warn);
      });
      setCategories(updated);
      showToast('Category sequence updated');
    } else if (viewMode === 'SUBCATEGORIES') {
      if (targetIndex < 0 || targetIndex >= currentSubCategories.length) return;
      const updated = [...currentSubCategories];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;

      updated.forEach((s, idx) => {
        s.sortOrder = idx;
        s.orderIndex = idx;
        syncSubCategoryToFirebase(s).catch(console.warn);
      });

      const otherSubs = subCategories.filter(s => s.categoryId !== selectedCategoryId);
      setSubCategories([...otherSubs, ...updated]);
      showToast('Subcategory sequence updated');
    } else if (viewMode === 'PRODUCTS') {
      if (targetIndex < 0 || targetIndex >= currentPhotos.length) return;
      const updated = [...currentPhotos];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;

      updated.forEach((p, idx) => {
        p.sortOrder = idx;
        p.orderIndex = idx;
        syncPhotoToFirebase(p).catch(console.warn);
      });

      const otherPhotos = photos.filter(p => p.subCategoryId !== selectedSubCategoryId);
      setPhotos([...otherPhotos, ...updated]);
      showToast('Product sequence updated');
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isReorderActive) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isReorderActive) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    if (!isReorderActive || draggedIndex === null || draggedIndex === dropIndex) return;
    e.preventDefault();

    if (viewMode === 'CATEGORIES') {
      const updated = [...currentCategories];
      const [draggedItem] = updated.splice(draggedIndex, 1);
      updated.splice(dropIndex, 0, draggedItem);

      updated.forEach((c, idx) => {
        c.sortOrder = idx;
        c.orderIndex = idx;
        syncCategoryToFirebase(c).catch(console.warn);
      });
      setCategories(updated);
      showToast('Category reordered');
    } else if (viewMode === 'SUBCATEGORIES') {
      const updated = [...currentSubCategories];
      const [draggedItem] = updated.splice(draggedIndex, 1);
      updated.splice(dropIndex, 0, draggedItem);

      updated.forEach((s, idx) => {
        s.sortOrder = idx;
        s.orderIndex = idx;
        syncSubCategoryToFirebase(s).catch(console.warn);
      });

      const otherSubs = subCategories.filter(s => s.categoryId !== selectedCategoryId);
      setSubCategories([...otherSubs, ...updated]);
      showToast('Subcategory reordered');
    } else if (viewMode === 'PRODUCTS') {
      const updated = [...currentPhotos];
      const [draggedItem] = updated.splice(draggedIndex, 1);
      updated.splice(dropIndex, 0, draggedItem);

      updated.forEach((p, idx) => {
        p.sortOrder = idx;
        p.orderIndex = idx;
        syncPhotoToFirebase(p).catch(console.warn);
      });

      const otherPhotos = photos.filter(p => p.subCategoryId !== selectedSubCategoryId);
      setPhotos([...otherPhotos, ...updated]);
      showToast('Product reordered');
    }

    setDraggedIndex(null);
  };

  // ---------------------------------------------------------------------------
  // PRODUCT ACTIONS (HIDE / DELETE / EDIT)
  // ---------------------------------------------------------------------------
  const handleToggleHide = async (photo: CatalogPhoto) => {
    const nextHidden = !photo.isHidden;
    updatePhoto(photo.id, { isHidden: nextHidden, isVisible: !nextHidden });
    await toggleProductHideInFirebase(photo.id, nextHidden);
    showToast(nextHidden ? 'Product hidden from mobile app' : 'Product visible on mobile app');
  };

  const handleDeleteProduct = async (photoId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    deletePhoto(photoId);
    await deletePhotoFromFirebase(photoId);
    showToast('Product deleted successfully');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#040812] text-slate-100 flex flex-col h-full w-full overflow-hidden select-none animate-in fade-in duration-200">
      
      {/* ----------------------------------------------------------------- */}
      {/* TOP HEADER & BREADCRUMBS */}
      {/* ----------------------------------------------------------------- */}
      <header className="bg-[#0B1120] border-b border-[#334155]/60 px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (viewMode === 'PRODUCTS') {
                setViewMode('SUBCATEGORIES');
                setSelectedSubCategoryId(null);
              } else if (viewMode === 'SUBCATEGORIES') {
                setViewMode('CATEGORIES');
                setSelectedCategoryId(null);
              } else {
                onClose();
              }
            }}
            className="px-4.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 transition flex items-center gap-2 text-sm font-bold shadow-md border border-slate-700/80"
          >
            <ArrowLeft size={18} />
            <span>{viewMode === 'CATEGORIES' ? 'Close' : 'Back'}</span>
          </button>
          <BrandLogo size="sm" />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsReorderActive(!isReorderActive)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              isReorderActive
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <ListOrdered size={14} />
            <span>{isReorderActive ? 'Done Reordering' : 'Edit Sequence'}</span>
          </button>
        </div>
      </header>

      {/* ----------------------------------------------------------------- */}
      {/* MAIN CONTENT DRILLDOWN CONTAINER */}
      {/* ----------------------------------------------------------------- */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-full mx-auto w-full custom-scrollbar">
        
        {/* VIEW 1: CATEGORIES LIST */}
        {viewMode === 'CATEGORIES' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <Folder size={16} className="text-amber-400" />
                  <span>{isReorderActive ? 'Main Categories (Reorder Active)' : 'Main Categories'}</span>
                </h3>
              </div>
            </div>

            {!catalogDataLoaded ? (
              <CommonLoader message="Loading categories..." className="py-24" />
            ) : currentCategories.length === 0 ? (
              <div className="py-24 text-center text-slate-500 font-bold text-xs">
                No active categories found in database.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
                {currentCategories.map((cat, index) => {
                  return (
                    <div
                      key={cat.id}
                      draggable={isReorderActive}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`bg-[#0B1120] border rounded-2xl overflow-hidden transition group flex flex-col ${
                        isReorderActive
                          ? 'border-amber-500/60 cursor-grab active:cursor-grabbing hover:border-amber-400'
                          : 'border-[#334155]/60 hover:border-blue-500/50 cursor-pointer shadow-lg'
                      }`}
                      onClick={() => {
                        if (!isReorderActive) {
                          setSelectedCategoryId(cat.id);
                          setViewMode('SUBCATEGORIES');
                        }
                      }}
                    >
                      <div className="standard-thumbnail-container relative bg-slate-950">
                        {cat.thumbnailUrl ? (
                          <img src={cat.thumbnailUrl} alt={cat.displayName} className="standard-thumbnail-img" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-600">
                            <ImageIcon size={32} />
                          </div>
                        )}

                        {isReorderActive && (
                          <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 p-1.5 rounded-lg shadow-lg flex items-center gap-1">
                            <GripVertical size={14} />
                          </div>
                        )}
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-base font-black text-white group-hover:text-amber-400 transition">
                            {cat.displayName || (cat as any).name || cat.id}
                          </h4>
                        </div>

                        {isReorderActive && (
                          <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-800" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => moveItem(index, 'up')}
                              className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                            >
                              <ArrowUp size={12} />
                              <span>Up</span>
                            </button>
                            <button
                              type="button"
                              disabled={index === currentCategories.length - 1}
                              onClick={() => moveItem(index, 'down')}
                              className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                            >
                              <ArrowDown size={12} />
                              <span>Down</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: SUBCATEGORIES LIST */}
        {viewMode === 'SUBCATEGORIES' && selectedCategory && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <Layers size={16} className="text-amber-400" />
                  <span>{selectedCategory.displayName || (selectedCategory as any).name || selectedCategory.id}{isReorderActive ? ' (Reorder Active)' : ''}</span>
                </h3>
              </div>
            </div>

            {!catalogDataLoaded ? (
              <CommonLoader message="Loading subcategories..." className="py-24" />
            ) : currentSubCategories.length === 0 ? (
              <div className="py-20 text-center text-slate-500 font-bold text-xs">
                No subcategories found in this category.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
                {currentSubCategories.map((sub, index) => {
                  const subPhotoCount = photos.filter(p => p.subCategoryId === sub.id).length;

                  return (
                    <div
                      key={sub.id}
                      draggable={isReorderActive}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`bg-[#0B1120] border rounded-2xl overflow-hidden transition group flex flex-col ${
                        isReorderActive
                          ? 'border-amber-500/60 cursor-grab active:cursor-grabbing hover:border-amber-400'
                          : 'border-[#334155]/60 hover:border-blue-500/50 cursor-pointer shadow-lg'
                      }`}
                      onClick={() => {
                        if (!isReorderActive) {
                          setSelectedSubCategoryId(sub.id);
                          setViewMode('PRODUCTS');
                        }
                      }}
                    >
                      <div className="standard-thumbnail-container relative bg-slate-950">
                        {sub.thumbnailUrl ? (
                          <img src={sub.thumbnailUrl} alt={sub.name} className="standard-thumbnail-img" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-600">
                            <ImageIcon size={24} />
                          </div>
                        )}

                        {isReorderActive && (
                          <div className="absolute top-1.5 right-1.5 bg-amber-500 text-slate-950 p-1 rounded shadow-lg">
                            <GripVertical size={12} />
                          </div>
                        )}
                      </div>

                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-black text-white truncate group-hover:text-amber-400 transition">
                            {sub.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            {subPhotoCount} Products
                          </span>
                        </div>

                        {isReorderActive && (
                          <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-slate-800" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => moveItem(index, 'up')}
                              className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 rounded text-[10px] font-bold flex items-center justify-center"
                            >
                              <ArrowUp size={10} />
                            </button>
                            <button
                              type="button"
                              disabled={index === currentSubCategories.length - 1}
                              onClick={() => moveItem(index, 'down')}
                              className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 rounded text-[10px] font-bold flex items-center justify-center"
                            >
                              <ArrowDown size={10} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: PRODUCTS LIST */}
        {viewMode === 'PRODUCTS' && selectedSubCategory && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-400" />
                  <span>{selectedSubCategory.name}{isReorderActive ? ' (Reorder Active)' : ''}</span>
                </h3>
              </div>
            </div>

            {!catalogDataLoaded ? (
              <CommonLoader message="Loading products..." className="py-24" />
            ) : currentPhotos.length === 0 ? (
              <div className="py-20 text-center text-slate-500 font-bold text-xs">
                No products uploaded in this subcategory.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                {currentPhotos.map((photo, index) => {
                  const img = photo.imageUrl || photo.thumbnailUrl || photo.imageUri;
                  const isHidden = photo.isHidden === true;

                  return (
                    <div
                      key={photo.id}
                      draggable={isReorderActive}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      onClick={() => {
                        if (!isReorderActive) {
                          setEditingProduct(photo);
                        }
                      }}
                      className={`bg-[#0B1120] border rounded-2xl overflow-hidden transition group relative ${
                        isReorderActive
                          ? 'border-amber-500/60 cursor-grab active:cursor-grabbing hover:border-amber-400'
                          : isHidden
                            ? 'border-red-500/30 opacity-80 cursor-pointer hover:border-amber-400/60'
                            : 'border-[#334155]/60 hover:border-amber-400/80 cursor-pointer shadow-lg'
                      }`}
                    >
                      <div className="standard-thumbnail-container relative bg-slate-950">
                        {img ? (
                          <img src={img} alt={photo.photoCode || 'Product'} className={`standard-thumbnail-img ${isHidden ? 'opacity-20 brightness-25' : ''}`} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-600">
                            <ImageIcon size={24} />
                          </div>
                        )}

                        {isHidden && (
                          <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-10">
                            <span className="bg-red-600 text-white font-black text-xs px-3 py-1 rounded-lg shadow-2xl uppercase tracking-wider border border-red-400">
                              Hidden
                            </span>
                          </div>
                        )}

                        {/* Top-left: Product Code Badge */}
                        <div className="absolute top-2 left-2 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700/80 z-20 shadow-md">
                          <span className="font-mono font-black text-amber-400 text-xs">
                            {photo.photoCode || photo.code || 'NO-CODE'}
                          </span>
                        </div>

                        {/* Top-right: Reorder grip */}
                        {isReorderActive && (
                          <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 p-1.5 rounded-lg shadow-lg z-20">
                            <GripVertical size={14} />
                          </div>
                        )}

                        {/* Bottom Overlay Toolbar for Actions / Reorder */}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2.5 flex items-center justify-between z-20" onClick={(e) => e.stopPropagation()}>
                          {!isReorderActive ? (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleHide(photo);
                                }}
                                title={isHidden ? 'Unhide Product' : 'Hide Product'}
                                className={`p-1.5 rounded-lg text-xs transition ${
                                  isHidden
                                    ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
                                }`}
                              >
                                {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProduct(photo.id);
                                }}
                                title="Delete Product"
                                className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs transition"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5 w-full">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => moveItem(index, 'up')}
                                className="flex-1 py-1 bg-slate-800/90 hover:bg-slate-700 disabled:opacity-30 text-slate-200 rounded text-[10px] font-bold flex items-center justify-center gap-1"
                              >
                                <ArrowUp size={11} />
                                <span>Up</span>
                              </button>
                              <button
                                type="button"
                                disabled={index === currentPhotos.length - 1}
                                onClick={() => moveItem(index, 'down')}
                                className="flex-1 py-1 bg-slate-800/90 hover:bg-slate-700 disabled:opacity-30 text-slate-200 rounded text-[10px] font-bold flex items-center justify-center gap-1"
                              >
                                <ArrowDown size={11} />
                                <span>Down</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ----------------------------------------------------------------- */}
      {/* PRODUCT UPLOAD / EDIT OVERLAY MODAL */}
      {/* ----------------------------------------------------------------- */}
      {editingProduct && (
        <ProductUploadEditor
          initialPhoto={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => {
            setEditingProduct(null);
            showToast('Product updated successfully');
          }}
        />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TOAST FEEDBACK */}
      {/* ----------------------------------------------------------------- */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border border-emerald-400 shadow-2xl animate-in slide-in-from-bottom-2">
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
