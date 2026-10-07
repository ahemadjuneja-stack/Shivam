import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { CatalogPhoto, SubCategory, ProductVariant } from '../types';
import { checkProductCodeExistsInFirebase } from '../services/firebaseSync';
import { uploadDashboardMedia, urlToBlob } from '../services/storageService';
import { db } from '../firebase';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  ArrowLeftRight,
  Upload,
  Check,
  Sparkles,
  Edit2,
  AlertTriangle,
  Layers,
  FolderPlus,
  ThumbsUp,
  Trash2,
  Loader2
} from 'lucide-react';
import { BackButton } from './BackButton';
import { BrandLogo } from './BrandLogo';

interface VariantItem {
  id: string;
  letter: string;
  label: string;
  minQuantity: number;
  quantity: number;
}

interface StagedPhoto {
  id: string;
  file?: File;
  imageUri: string;
  photoCode: string;
  title?: string;
  name?: string;
  categoryId: string;
  categoryName: string;
  subCategoryId: string;
  subCategoryName: string;
  variants: VariantItem[];
  mrpText?: string;
  defaultQuantity?: number;
  isHidden?: boolean;
}

interface ProductSnapshot {
  photoCode: string;
  categoryId: string;
  subCategoryId: string;
  variants: { id?: string; label: string; minQuantity: number; quantity: number }[];
  mrpText?: string;
  isHidden?: boolean;
}

interface ProductUploadEditorProps {
  onClose: () => void;
  onSuccess?: () => void;
  initialPhoto?: CatalogPhoto | null;
  siblingPhotos?: CatalogPhoto[];
  onSelectProduct?: (product: CatalogPhoto) => void;
}

interface DuplicateState {
  existingProduct: CatalogPhoto;
  stagedIndex: number;
  attemptedCode: string;
  newImageUri: string;
}

export const ProductUploadEditor: React.FC<ProductUploadEditorProps> = ({
  onClose,
  onSuccess,
  initialPhoto,
  siblingPhotos,
  onSelectProduct
}) => {
  const { categories, subCategories, photos, addMultiplePhotos, updatePhoto, deletePhoto, addSubCategory } = useAppStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Staged photos list
  const [stagedPhotos, setStagedPhotos] = useState<StagedPhoto[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Mandatory Category & Subcategory selection state (NO DEFAULT SELECTION)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string>('');
  const [customSubCategoryInput, setCustomSubCategoryInput] = useState<string>('');
  const [showNewSubCatInput, setShowNewSubCatInput] = useState<boolean>(false);
  const [categoryValidationError, setCategoryValidationError] = useState<string | null>(null);

  // Initial Product Snapshot Ref for Unsaved Changes (Dirty Check) Guard
  const initialSnapshotRef = useRef<ProductSnapshot | null>(null);
  const [pendingTargetProduct, setPendingTargetProduct] = useState<CatalogPhoto | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState<boolean>(false);

  // Editing state
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [codeInputValue, setCodeInputValue] = useState('');
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);

  // Position change state
  const [isChangingPosition, setIsChangingPosition] = useState(false);
  const [targetPositionInput, setTargetPositionInput] = useState('1');

  // Duplicate Code Detection Modal State
  const [duplicateModal, setDuplicateModal] = useState<DuplicateState | null>(null);
  const [customNewCodeInput, setCustomNewCodeInput] = useState<string>('');

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);

  // Success Animation State
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Fullscreen Lightbox State for Image Viewing
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'warn' | 'success'>('info');

  const showToast = (msg: string, type: 'info' | 'warn' | 'success' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const currentPhoto: StagedPhoto | undefined = stagedPhotos[currentIndex];

  const handleDeleteExistingProduct = () => {
    if (initialPhoto && initialPhoto.id) {
      if (window.confirm(`Are you sure you want to delete product [${initialPhoto.photoCode}]?`)) {
        deletePhoto(initialPhoto.id);
        showToast('Product deleted successfully', 'success');
        if (onSuccess) onSuccess();
        onClose();
      }
    }
  };

  const toggleVisibility = async (productId: string, currentHiddenState: boolean) => {
    try {
      const newHiddenState = !currentHiddenState;
      const productRef = doc(db, 'products', productId);

      try {
        await updateDoc(productRef, {
          isHidden: newHiddenState,
          status: newHiddenState ? 'hidden' : 'active',
          isVisible: !newHiddenState,
          hideFromApk: newHiddenState,
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        await setDoc(productRef, {
          id: productId,
          isHidden: newHiddenState,
          status: newHiddenState ? 'hidden' : 'active',
          isVisible: !newHiddenState,
          hideFromApk: newHiddenState,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      try {
        await setDoc(doc(db, 'photos', productId), {
          isHidden: newHiddenState,
          status: newHiddenState ? 'hidden' : 'active',
          isVisible: !newHiddenState,
          hideFromApk: newHiddenState,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (_) {}

      if (currentPhoto) {
        const updated = [...stagedPhotos];
        updated[currentIndex] = { ...currentPhoto, isHidden: newHiddenState };
        setStagedPhotos(updated);
      }

      updatePhoto(productId, {
        isHidden: newHiddenState,
        isVisible: !newHiddenState,
        status: newHiddenState ? 'hidden' : 'active'
      });

      showToast(
        newHiddenState ? "Updated: Product Hidden from APK" : "Updated: Product Visible in APK",
        "success"
      );
    } catch (err) {
      console.error("Failed to toggle product visibility in Firestore:", err);
      showToast("Failed to update product visibility in Firestore", "warn");
    }
  };

  // Pre-fill staged photos if initialPhoto prop is passed
  useEffect(() => {
    if (initialPhoto) {
      const photoCat = categories.find(c => c.id === initialPhoto.categoryId);
      const photoSub = subCategories.find(s => s.id === initialPhoto.subCategoryId);

      let mappedVariants: VariantItem[] = [];
      if (initialPhoto.variants && initialPhoto.variants.length > 0) {
        mappedVariants = initialPhoto.variants.map((v, i) => ({
          id: v.id || `v-${i}-${Date.now()}`,
          letter: v.label || `Option ${i + 1}`,
          label: v.label || `Option ${i + 1}`,
          minQuantity: typeof v.minQuantity === 'number' ? v.minQuantity : (typeof v.quantity === 'number' ? v.quantity : 1),
          quantity: typeof v.minQuantity === 'number' ? v.minQuantity : (typeof v.quantity === 'number' ? v.quantity : 1)
        }));
      } else if (initialPhoto.customLabels && initialPhoto.customLabels.length > 0) {
        mappedVariants = initialPhoto.customLabels.map((lbl, i) => ({
          id: `v-${i}-${Date.now()}`,
          letter: lbl,
          label: lbl,
          minQuantity: initialPhoto.defaultQuantity || 1,
          quantity: initialPhoto.defaultQuantity || 1
        }));
      } else {
        mappedVariants = [
          { id: `v1-${Date.now()}`, letter: 'A', label: 'A', minQuantity: initialPhoto.defaultQuantity || 1, quantity: initialPhoto.defaultQuantity || 1 },
          { id: `v2-${Date.now()}`, letter: 'B', label: 'B', minQuantity: initialPhoto.defaultQuantity || 1, quantity: initialPhoto.defaultQuantity || 1 }
        ];
      }

      const stagedItem: StagedPhoto = {
        id: initialPhoto.id,
        imageUri: initialPhoto.imageUri,
        photoCode: initialPhoto.photoCode,
        title: initialPhoto.title || initialPhoto.photoCode,
        name: initialPhoto.name || initialPhoto.photoCode,
        categoryId: initialPhoto.categoryId || '',
        categoryName: photoCat?.displayName || '',
        subCategoryId: initialPhoto.subCategoryId || '',
        subCategoryName: photoSub?.name || initialPhoto.subCategoryName || '',
        variants: mappedVariants,
        mrpText: initialPhoto.description || 'MRP : 999/-',
        defaultQuantity: initialPhoto.defaultQuantity || 1,
        isHidden: initialPhoto.isHidden || false
      };

      setStagedPhotos([stagedItem]);
      setCurrentIndex(0);
      setSelectedCategoryId(initialPhoto.categoryId || '');
      setSelectedSubCategoryId(initialPhoto.subCategoryId || '');
      setCodeInputValue(initialPhoto.photoCode);

      // Save initial snapshot for dirty checking
      initialSnapshotRef.current = {
        photoCode: (initialPhoto.photoCode || '').trim(),
        categoryId: initialPhoto.categoryId || '',
        subCategoryId: initialPhoto.subCategoryId || '',
        variants: mappedVariants.map(v => ({ id: v.id, label: v.label, minQuantity: v.minQuantity, quantity: v.quantity })),
        mrpText: initialPhoto.description || 'MRP : 999/-',
        isHidden: !!initialPhoto.isHidden
      };
    } else {
      initialSnapshotRef.current = null;
    }
  }, [initialPhoto, categories, subCategories]);



  // Sibling products navigation index
  const currentSiblingIndex = (siblingPhotos && initialPhoto)
    ? siblingPhotos.findIndex(p => p.id === initialPhoto.id)
    : -1;

  const handleSaveAndSwitch = async () => {
    if (!pendingTargetProduct || !onSelectProduct) return;
    const saveSuccess = await handleCreateAllProducts();
    if (saveSuccess) {
      const nextProd = pendingTargetProduct;
      setShowUnsavedModal(false);
      setPendingTargetProduct(null);
      onSelectProduct(nextProd);
    }
  };

  const handleDiscardAndSwitch = () => {
    if (!pendingTargetProduct || !onSelectProduct) return;
    const nextProd = pendingTargetProduct;
    setShowUnsavedModal(false);
    setPendingTargetProduct(null);
    onSelectProduct(nextProd);
  };

  const handleCancelSwitch = () => {
    setShowUnsavedModal(false);
    setPendingTargetProduct(null);
  };

  // Sync code input value when switching current photo
  useEffect(() => {
    if (currentPhoto) {
      setCodeInputValue(currentPhoto.photoCode);
    }
  }, [currentIndex, currentPhoto?.photoCode]);

  // Reset form after successful upload to fresh, blank upload state
  const handleResetForm = () => {
    setStagedPhotos([]);
    setCurrentIndex(0);
    setSelectedCategoryId('');
    setSelectedSubCategoryId('');
    setCustomSubCategoryInput('');
    setShowNewSubCatInput(false);
    setCategoryValidationError(null);
    setIsEditingCode(false);
    setCodeInputValue('');
    setEditingVariantIndex(null);
    setIsChangingPosition(false);
    setShowSuccessModal(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  // Auto-dismiss success overlay after 1.5 seconds and reset form cleanly to blank upload state
  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        handleResetForm();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  // Navigate photos
  const handlePrev = () => {
    if (stagedPhotos.length <= 1) return;
    setCurrentIndex(prev => (prev === 0 ? stagedPhotos.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (stagedPhotos.length <= 1) return;
    setCurrentIndex(prev => (prev === stagedPhotos.length - 1 ? 0 : prev + 1));
  };

  // Keyboard navigation when lightbox is open
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLightboxOpen(false);
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, stagedPhotos.length]);

  // Reordering: move current photo to target position (1-based index)
  const handleApplyPositionChange = () => {
    const target = parseInt(targetPositionInput, 10);
    if (isNaN(target) || target < 1 || target > stagedPhotos.length) {
      showToast(`Please enter a valid number between 1 and ${stagedPhotos.length}`, 'warn');
      setIsChangingPosition(false);
      return;
    }

    const targetIndex = target - 1;
    if (targetIndex === currentIndex) {
      setIsChangingPosition(false);
      return;
    }

    const updated = [...stagedPhotos];
    const [movedItem] = updated.splice(currentIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    setStagedPhotos(updated);
    setCurrentIndex(targetIndex);
    setIsChangingPosition(false);
    showToast(`Image moved to position ${target} of ${stagedPhotos.length}`, 'info');
  };

  // Swap with next photo
  const handleSwapWithNext = () => {
    if (stagedPhotos.length <= 1) return;
    const nextIdx = (currentIndex + 1) % stagedPhotos.length;
    const updated = [...stagedPhotos];
    const temp = updated[currentIndex];
    updated[currentIndex] = updated[nextIdx];
    updated[nextIdx] = temp;
    setStagedPhotos(updated);
    setCurrentIndex(nextIdx);
    showToast(`Swapped with position ${nextIdx + 1}`, 'info');
  };

  // Delete current photo
  const handleDeleteCurrentPhoto = () => {
    if (stagedPhotos.length <= 1) {
      setStagedPhotos([]);
      setCurrentIndex(0);
      showToast('Photo removed. Ready for new upload.', 'info');
      return;
    }
    const updated = stagedPhotos.filter((_, idx) => idx !== currentIndex);
    setStagedPhotos(updated);
    setCurrentIndex(prev => Math.min(prev, updated.length - 1));
    showToast('Photo removed from staging', 'info');
  };

  // ---------------------------------------------------------------------------
  // 1. STRICT FILE NAME AUTO-DETECTION (No re-typing needed)
  // ---------------------------------------------------------------------------
  const extractCodeFromFileName = (fileName: string): string => {
    // Exact file name without extension e.g., "HG 201.jpg" -> "HG 201"
    const baseName = fileName.replace(/\.[^/.]+$/, "").trim();
    return baseName || fileName;
  };

  // Read file as 16:9 optimized Data URL
  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_SIZE = 960;
          if (width > height && width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // ---------------------------------------------------------------------------
  // 2. HANDLE FILE(S) SELECTION & INSTANT DUPLICATE DETECTION
  // ---------------------------------------------------------------------------
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const newStagedList: StagedPhoto[] = [];
    const duplicatesFound: { code: string; fileIndex: number; existing: CatalogPhoto }[] = [];

    // Get current category names if selected
    const currentCatObj = categories.find(c => c.id === selectedCategoryId);
    const currentSubObj = subCategories.find(s => s.id === selectedSubCategoryId);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const dataUrl = await readFileAsDataUrl(file);
      
      // Feature 1: Automatically extract Product Code/Name from original filename
      const baseName = extractCodeFromFileName(file.name);

      // Default variants start with 'A' and 'B' with default minQuantity = 1
      const defaultVariants: VariantItem[] = [
        { id: `v1-${i}-${Date.now()}`, letter: 'A', label: 'A', minQuantity: 1, quantity: 1 },
        { id: `v2-${i}-${Date.now()}`, letter: 'B', label: 'B', minQuantity: 1, quantity: 1 }
      ];

      const stagedItem: StagedPhoto = {
        id: `staged-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        file,
        imageUri: dataUrl,
        photoCode: baseName,
        title: baseName,
        name: baseName,
        categoryId: selectedCategoryId || '',
        categoryName: currentCatObj?.displayName || '',
        subCategoryId: selectedSubCategoryId || '',
        subCategoryName: currentSubObj?.name || '',
        variants: defaultVariants,
        mrpText: 'MRP : 999/-',
        defaultQuantity: 1
      };

      newStagedList.push(stagedItem);

      // Query Firestore & local store for duplicate product code/name
      const existing = await checkProductCodeExistsInFirebase(baseName);
      if (existing) {
        duplicatesFound.push({
          code: baseName,
          fileIndex: stagedPhotos.length + i,
          existing
        });
      }
    }

    const updatedList = [...stagedPhotos, ...newStagedList];
    setStagedPhotos(updatedList);
    setCurrentIndex(stagedPhotos.length);
    e.target.value = '';

    // If duplicate detected, trigger comparison popup for the first duplicate
    if (duplicatesFound.length > 0) {
      const firstDup = duplicatesFound[0];
      const dupStaged = updatedList[firstDup.fileIndex];
      setCustomNewCodeInput(`${firstDup.code}_NEW`);
      setDuplicateModal({
        existingProduct: firstDup.existing,
        stagedIndex: firstDup.fileIndex,
        attemptedCode: firstDup.code,
        newImageUri: dupStaged ? dupStaged.imageUri : ''
      });
      showToast(`⚠️ Duplicate detected: "${firstDup.code}" already exists!`, 'warn');
    } else {
      showToast(`Added ${newStagedList.length} photo(s) using original file names.`, 'success');
    }
  };

  // ---------------------------------------------------------------------------
  // CHECK DUPLICATE ON MANUAL CODE / NAME EDIT
  // ---------------------------------------------------------------------------
  const handleSaveEditedCode = async () => {
    if (!currentPhoto) return;
    const cleanCode = codeInputValue.trim();
    if (!cleanCode) {
      setIsEditingCode(false);
      return;
    }

    // Check if name changed
    if (cleanCode === currentPhoto.photoCode) {
      setIsEditingCode(false);
      return;
    }

    // Check in Firestore & database
    const existing = await checkProductCodeExistsInFirebase(cleanCode);
    if (existing) {
      setCustomNewCodeInput(`${cleanCode}_NEW`);
      setDuplicateModal({
        existingProduct: existing,
        stagedIndex: currentIndex,
        attemptedCode: cleanCode,
        newImageUri: currentPhoto.imageUri
      });
      setIsEditingCode(false);
      return;
    }

    // Unique name, save to staged photo
    updateCurrentPhoto({ photoCode: cleanCode, title: cleanCode, name: cleanCode });
    setIsEditingCode(false);
    showToast(`Product name set to "${cleanCode}"`, 'success');
  };

  // Handle Duplicate Modal Actions
  const handleDuplicateEditExisting = () => {
    if (!duplicateModal) return;
    const { existingProduct, stagedIndex } = duplicateModal;
    
    // Load existing product into current staged item
    const updated = [...stagedPhotos];
    if (updated[stagedIndex]) {
      updated[stagedIndex] = {
        ...updated[stagedIndex],
        photoCode: existingProduct.photoCode,
        title: existingProduct.photoCode,
        name: existingProduct.photoCode,
        categoryId: existingProduct.categoryId || updated[stagedIndex].categoryId,
        subCategoryId: existingProduct.subCategoryId || updated[stagedIndex].subCategoryId,
        subCategoryName: existingProduct.subCategoryName || updated[stagedIndex].subCategoryName,
        defaultQuantity: existingProduct.defaultQuantity || 1,
        mrpText: existingProduct.description || updated[stagedIndex].mrpText
      };
      setStagedPhotos(updated);
    }
    setDuplicateModal(null);
    showToast(`Loaded existing product data for "${existingProduct.photoCode}".`, 'info');
  };

  const handleDuplicateChangeCode = (newUniqueCode: string) => {
    if (!duplicateModal) return;
    const { stagedIndex } = duplicateModal;
    const clean = newUniqueCode.trim();
    if (!clean) return;

    const updated = [...stagedPhotos];
    if (updated[stagedIndex]) {
      updated[stagedIndex] = {
        ...updated[stagedIndex],
        photoCode: clean,
        title: clean,
        name: clean
      };
      setStagedPhotos(updated);
    }
    setDuplicateModal(null);
    showToast(`Product name updated to "${clean}".`, 'success');
  };

  // ---------------------------------------------------------------------------
  // 3. MANDATORY CATEGORY & SUBCATEGORY SELECTION LOGIC
  // ---------------------------------------------------------------------------
  const handleCategoryChange = (newCatId: string) => {
    setSelectedCategoryId(newCatId);
    setSelectedSubCategoryId('');
    setCategoryValidationError(null);

    const catObj = categories.find(c => c.id === newCatId);
    const catName = catObj ? catObj.displayName : '';

    if (currentPhoto) {
      updateCurrentPhoto({
        categoryId: newCatId,
        categoryName: catName,
        subCategoryId: '',
        subCategoryName: ''
      });
    }
  };

  const handleSubCategoryChange = (newSubId: string) => {
    setSelectedSubCategoryId(newSubId);
    setCategoryValidationError(null);

    const subObj = subCategories.find(s => s.id === newSubId);
    const subName = subObj ? subObj.name : '';

    if (currentPhoto) {
      updateCurrentPhoto({
        subCategoryId: newSubId,
        subCategoryName: subName
      });
    }
  };

  const handleApplyCategoryToAllStaged = () => {
    if (!selectedCategoryId || !selectedSubCategoryId) {
      setCategoryValidationError('Please select both Category and Subcategory first.');
      return;
    }

    const catObj = categories.find(c => c.id === selectedCategoryId);
    const subObj = subCategories.find(s => s.id === selectedSubCategoryId);

    const updated = stagedPhotos.map(p => ({
      ...p,
      categoryId: selectedCategoryId,
      categoryName: catObj?.displayName || '',
      subCategoryId: selectedSubCategoryId,
      subCategoryName: subObj?.name || ''
    }));

    setStagedPhotos(updated);
    setCategoryValidationError(null);
    showToast(`Applied ${catObj?.displayName} > ${subObj?.name} to all ${stagedPhotos.length} photos!`, 'success');
  };

  const handleCreateNewSubCategory = () => {
    const trimmed = customSubCategoryInput.trim();
    if (!trimmed || !selectedCategoryId) return;

    const newSubId = `sub-${Date.now()}`;
    const newSub: SubCategory = {
      id: newSubId,
      categoryId: selectedCategoryId,
      name: trimmed,
      iconName: 'sparkles',
      thumbnailUrl: currentPhoto?.imageUri || 'https://images.unsplash.com/photo-1599643478514-4a410f0a82ef?auto=format&fit=crop&q=80&w=600',
      photoCount: 1,
      sortOrder: subCategories.length + 1
    };

    addSubCategory(newSub);
    setSelectedSubCategoryId(newSubId);
    setCustomSubCategoryInput('');
    setShowNewSubCatInput(false);
    setCategoryValidationError(null);

    if (currentPhoto) {
      updateCurrentPhoto({
        subCategoryId: newSubId,
        subCategoryName: trimmed
      });
    }

    showToast(`Created new subcategory: "${trimmed}"`, 'success');
  };

  // ---------------------------------------------------------------------------
  // 4. FLEXIBLE CUSTOM VARIANT LABELS ("A", "Black", "1kg", "100ml", etc.) & MIN QUANTITY
  // ---------------------------------------------------------------------------
  const getNextOptionLabel = (existingLabels: string[]): string => {
    const nextFallback = `Option ${existingLabels.length + 1}`;
    const trimmed = existingLabels.map(l => (l || '').trim()).filter(l => l.length > 0);

    if (trimmed.length === 0) {
      return nextFallback;
    }

    // 1. Check if all labels are single letters (/^[A-Za-z]$/)
    const isAllSingleLetters = trimmed.every(l => /^[A-Za-z]$/.test(l));
    if (isAllSingleLetters) {
      const isAllLower = trimmed.every(l => l === l.toLowerCase());
      const maxCharCode = Math.max(...trimmed.map(l => l.toUpperCase().charCodeAt(0)));
      if (maxCharCode < 90) {
        const nextChar = String.fromCharCode(maxCharCode + 1);
        return isAllLower ? nextChar.toLowerCase() : nextChar.toUpperCase();
      }
      return nextFallback;
    }

    // 2. Check if all labels are pure numbers (/^\d+$/)
    const isAllPureNumbers = trimmed.every(l => /^\d+$/.test(l));
    if (isAllPureNumbers) {
      const maxNum = Math.max(...trimmed.map(l => parseInt(l, 10)));
      return String(maxNum + 1);
    }

    // 3. Otherwise (mixed/custom — e.g. Black, 1kg) -> current default behavior ("Option N")
    return nextFallback;
  };

  const handleAddVariant = () => {
    if (!currentPhoto) return;
    const currentVariants = currentPhoto.variants;
    const nextIndex = currentVariants.length + 1;
    const existingLabels = currentVariants.map(v => v.label || v.letter || '');
    const nextLabel = getNextOptionLabel(existingLabels);
    
    const newVariant: VariantItem = {
      id: `v${nextIndex}-${Date.now()}`,
      letter: nextLabel,
      label: nextLabel,
      minQuantity: 1,
      quantity: 1
    };

    const updated = stagedPhotos.map((p, idx) => {
      if (idx === currentIndex) {
        return { ...p, variants: [...p.variants, newVariant] };
      }
      return p;
    });
    setStagedPhotos(updated);
    showToast(`Added Variant: ${nextLabel}`, 'info');
  };

  const handleRemoveLastVariant = () => {
    if (!currentPhoto || currentPhoto.variants.length <= 1) {
      showToast('At least 1 variant is required.', 'warn');
      return;
    }

    const updated = stagedPhotos.map((p, idx) => {
      if (idx === currentIndex) {
        return { ...p, variants: p.variants.slice(0, -1) };
      }
      return p;
    });
    setStagedPhotos(updated);
  };

  const handleRemoveVariantByIndex = (vIndex: number) => {
    if (!currentPhoto || currentPhoto.variants.length <= 1) {
      showToast('At least 1 variant is required.', 'warn');
      return;
    }

    const updated = stagedPhotos.map((p, idx) => {
      if (idx === currentIndex) {
        const remaining = p.variants.filter((_, i) => i !== vIndex);
        return { ...p, variants: remaining };
      }
      return p;
    });
    setStagedPhotos(updated);
  };

  // Update specific variant label (Allows ANY text: "A", "B", "Black", "Maroon", "1kg", "500gm", "100ml")
  const handleUpdateVariantLabel = (vIndex: number, newLabel: string) => {
    if (!currentPhoto) return;
    const updatedVariants = currentPhoto.variants.map((v, idx) => {
      if (idx === vIndex) {
        return { ...v, label: newLabel, letter: newLabel };
      }
      return v;
    });
    updateCurrentPhoto({ variants: updatedVariants });
  };

  // Update starting minQuantity for specific variant (allows 0 for out-of-stock)
  const handleUpdateVariantQuantity = (vIndex: number, newQty: number) => {
    if (!currentPhoto) return;
    const val = Math.max(0, isNaN(newQty) ? 0 : newQty);
    const updatedVariants = currentPhoto.variants.map((v, idx) => {
      if (idx === vIndex) {
        return { ...v, quantity: val, minQuantity: val };
      }
      return v;
    });
    updateCurrentPhoto({ variants: updatedVariants });
  };

  // Helper to update current photo partial
  const updateCurrentPhoto = (data: Partial<StagedPhoto>) => {
    setStagedPhotos(prev =>
      prev.map((p, idx) => (idx === currentIndex ? { ...p, ...data } : p))
    );
  };

  // ---------------------------------------------------------------------------
  // 5. CREATE ALL PRODUCTS & SAVE EXACT 'variants' SCHEMA TO FIRESTORE
  // ---------------------------------------------------------------------------
  const handleCreateAllProducts = async (): Promise<boolean> => {
    if (stagedPhotos.length === 0) {
      showToast('Please upload photo(s) first.', 'warn');
      return false;
    }

    // MANDATORY VALIDATION: Check Category and Subcategory for every photo
    const missingCategoryPhoto = stagedPhotos.find(p => !p.categoryId || !p.subCategoryId);
    if (missingCategoryPhoto) {
      setCategoryValidationError('⚠️ Please select both Category and Subcategory before creating products!');
      showToast('Mandatory selection: Please choose Category & Subcategory!', 'warn');
      return false;
    }

    setCategoryValidationError(null);
    setIsUploading(true);

    try {
      const existingPhotoIds = new Set(photos.map(p => p.id));
      const newPhotosToCreate: CatalogPhoto[] = [];

      await Promise.all(stagedPhotos.map(async (sp, idx) => {
        const subId = sp.subCategoryId;
        const customLabels = sp.variants.map(v => v.label || v.letter);
        const startingDefaultQty = typeof sp.variants[0]?.minQuantity === 'number'
          ? sp.variants[0].minQuantity
          : (typeof sp.variants[0]?.quantity === 'number' ? sp.variants[0].quantity : 1);

        // Exact variants schema object array
        const formattedVariants: ProductVariant[] = sp.variants.map((v, vIdx) => {
          const qty = typeof v.minQuantity === 'number' ? v.minQuantity : (typeof v.quantity === 'number' ? v.quantity : 1);
          const isAvail = qty > 0;
          return {
            id: v.id || `v${vIdx + 1}`,
            label: v.label || v.letter,
            minQuantity: qty,
            quantity: qty,
            isAvailable: isAvail,
            inStock: isAvail
          };
        });

        const photoId = (sp.id && existingPhotoIds.has(sp.id))
          ? sp.id
          : `p-up-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`;

        // Upload directly to Firebase Storage catalog/ folder
        let cloudImageUrl = sp.imageUri;
        try {
          if (sp.file) {
            cloudImageUrl = await uploadDashboardMedia(sp.file, 'catalog', sp.photoCode);
          } else if (sp.imageUri && sp.imageUri.startsWith('data:')) {
            const blob = await urlToBlob(sp.imageUri);
            cloudImageUrl = await uploadDashboardMedia(blob, 'catalog', sp.photoCode);
          }
        } catch (uploadError) {
          console.warn('Storage upload notice for item:', sp.photoCode, uploadError);
        }

        const photoData: CatalogPhoto = {
          id: photoId,
          categoryId: sp.categoryId,
          subCategoryId: subId,
          subCategoryName: sp.subCategoryName || 'General',
          photoCode: sp.photoCode.trim(),
          title: sp.photoCode.trim(),
          name: sp.photoCode.trim(),
          imageUri: cloudImageUrl,
          imageUrl: cloudImageUrl,
          thumbnailUrl: cloudImageUrl,
          photoUrl: cloudImageUrl,
          itemCount: sp.variants.length,
          aAvailable: sp.variants.length >= 1,
          bAvailable: sp.variants.length >= 2,
          cAvailable: sp.variants.length >= 3,
          dAvailable: sp.variants.length >= 4,
          customLabels,
          variants: formattedVariants,
          defaultQuantity: startingDefaultQty,
          sortOrder: idx + 1,
          description: sp.mrpText || '',
          isHidden: sp.isHidden || false
        };

        if (sp.id && existingPhotoIds.has(sp.id)) {
          updatePhoto(sp.id, photoData);
        } else {
          newPhotosToCreate.push(photoData);
        }
      }));

      if (newPhotosToCreate.length > 0) {
        addMultiplePhotos(newPhotosToCreate);
      }

      setShowSuccessModal(true);
      return true;
    } catch (err) {
      console.error('Failed to create/upload products:', err);
      showToast('Error uploading products to Cloud Storage. Please check connection.', 'warn');
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const filteredSubCategories = subCategories.filter(s => s.categoryId === selectedCategoryId);

  return (
    <div className="fixed inset-0 z-50 bg-[#060c1c] text-white flex items-center justify-center p-2 sm:p-4 lg:p-6 overflow-y-auto select-none">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 border ${
          toastType === 'warn'
            ? 'bg-amber-500 text-black border-amber-300'
            : toastType === 'success'
            ? 'bg-emerald-500 text-black border-emerald-300'
            : 'bg-indigo-600 text-white border-indigo-400'
        }`}>
          {toastType === 'warn' ? <AlertTriangle size={16} /> : <Sparkles size={16} />}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden Multiple File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/*"
        className="hidden"
      />

      {/* =================================================================== */}
      {/* MAIN CONTAINER (Left: Upload/Stage, Right: Single Info Panel)       */}
      {/* =================================================================== */}
      <div className="w-full max-w-7xl mx-auto h-full max-h-[96vh] lg:h-[94vh] bg-[#070f23] border border-[#142444] rounded-2xl p-3 sm:p-5 lg:p-6 flex flex-col lg:flex-row gap-4 sm:gap-6 shadow-2xl relative overflow-y-auto lg:overflow-hidden">
        
        {/* =============================================================== */}
        {/* LEFT / CENTER STAGE: 16:9 IMAGE PREVIEW CARD WITH CONTROLS     */}
        {/* =============================================================== */}
        <div className="flex-1 flex flex-col items-center justify-between lg:justify-center min-w-0 min-h-0 w-full">
          
          {/* Top Bar with BackButton on left of BrandLogo */}
          <div className="w-full flex items-center justify-between pb-1 z-10">
            <div className="flex items-center gap-3">
              <BackButton onClick={onClose} />
              <BrandLogo size="sm" />
            </div>
          </div>

          {/* Slim Product Counter */}
          {siblingPhotos && siblingPhotos.length > 1 && currentSiblingIndex >= 0 && (
            <div className="w-full text-center pb-2 font-mono text-xs text-slate-400">
              Product <span className="text-amber-400 font-bold">{currentSiblingIndex + 1}</span> of <span className="text-white">{siblingPhotos.length}</span>
            </div>
          )}

          {/* Main 16:9 Card Wrapper */}
          <div className="w-full flex-1 flex items-center justify-center relative min-h-0">
            {currentPhoto ? (
              <div className="w-full max-w-[780px] lg:max-w-none aspect-[16/9] bg-[#030712] rounded-xl border border-slate-800/80 relative overflow-hidden shadow-2xl flex items-center justify-center group">
                {/* Top-Left Red Circular Close (X) Button */}
                <button
                  onClick={handleDeleteCurrentPhoto}
                  title="Remove this photo from staging"
                  className="absolute top-3 left-3 z-30 w-7 h-7 rounded-full bg-[#ef4444] hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition active:scale-90"
                >
                  <X size={16} className="stroke-[2.5]" />
                </button>

                {/* Upload More Photos Quick Action Badge */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload more photos from your PC"
                  className="absolute top-3 right-3 z-30 bg-[#0c2444]/90 hover:bg-[#123666] border border-slate-700 text-slate-200 hover:text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm transition shadow-lg"
                >
                  <Upload size={14} className="text-amber-400" />
                  <span>Upload More</span>
                </button>

                {/* Product Name Badge on Image */}
                <div className="absolute top-3 left-12 z-20 bg-black/75 backdrop-blur-sm border border-purple-500/40 text-purple-200 px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide max-w-[280px] truncate">
                  <span className="text-amber-300">{currentPhoto.photoCode}</span>
                </div>

                {/* 1/N Counter Badge on Image */}
                {stagedPhotos.length > 0 && (
                  <div className="absolute bottom-3 left-3 z-20 bg-black/75 backdrop-blur-sm border border-slate-700/80 text-white px-2.5 py-1 rounded-lg text-xs font-mono font-bold shadow-lg flex items-center gap-1.5 pointer-events-none">
                    <span className="text-amber-400 font-black">{currentIndex + 1}</span>
                    <span className="text-slate-400">/</span>
                    <span>{stagedPhotos.length}</span>
                  </div>
                )}

                {/* Left Carousel Arrow (<) */}
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={stagedPhotos.length <= 1}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed transition active:scale-95 shadow-xl backdrop-blur-sm"
                  title="Previous photo"
                >
                  <ChevronLeft size={24} />
                </button>

                {/* Right Carousel Arrow (>) */}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={stagedPhotos.length <= 1}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed transition active:scale-95 shadow-xl backdrop-blur-sm"
                  title="Next photo"
                >
                  <ChevronRight size={24} />
                </button>

                {/* Bottom-Right Swap / Reorder Button (⇄) */}
                <button
                  onClick={handleSwapWithNext}
                  title="Swap order with next photo"
                  className="absolute bottom-3 right-3 z-30 w-8 h-8 rounded-lg bg-black/70 hover:bg-black text-slate-200 hover:text-white flex items-center justify-center backdrop-blur-sm border border-slate-700 transition active:scale-95"
                >
                  <ArrowLeftRight size={16} />
                </button>

                {/* The Clean 16:9 Image Preview with Lightbox Trigger */}
                <div
                  className="w-full h-full relative cursor-zoom-in flex items-center justify-center"
                  onClick={() => setIsLightboxOpen(true)}
                  title="Click to view full-size image"
                >
                  <img
                    src={currentPhoto.imageUri}
                    alt={currentPhoto.photoCode}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            ) : (
              /* Clean Minimalist Upload Dropzone */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-[780px] lg:max-w-none aspect-[16/9] bg-[#04091a]/80 hover:bg-[#08122c] border-2 border-dashed border-slate-700/80 hover:border-amber-400/80 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group shadow-2xl p-6"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 group-hover:bg-amber-500/20 group-hover:border-amber-400 transition-all duration-200 shadow-xl mb-3">
                  <Upload size={36} className="stroke-[2.2]" />
                </div>
                <span className="text-base sm:text-lg font-black tracking-wide text-white group-hover:text-amber-300 transition">
                  Upload Products
                </span>
              </div>
            )}
          </div>

          {/* Thumbnail Gallery Strip */}
          {stagedPhotos.length > 1 && (
            <div className="w-full max-w-[780px] lg:max-w-none flex items-center justify-center gap-2 overflow-x-auto py-1 px-1 custom-scrollbar">
              {stagedPhotos.map((photo, idx) => (
                <button
                  key={photo.id || idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative flex-shrink-0 w-14 h-9 sm:w-16 sm:h-10 rounded-lg overflow-hidden border-2 transition ${
                    idx === currentIndex
                      ? 'border-amber-400 ring-2 ring-amber-400/40 scale-105'
                      : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
                  }`}
                  title={`View image ${idx + 1}`}
                >
                  <img src={photo.imageUri} alt={photo.photoCode} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-[8px] font-mono font-bold px-1 rounded text-white">
                    {idx + 1}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* ----------------------------------------------------------- */}
          {/* BOTTOM NUMBER / POSITION DISPLAY                            */}
          {/* ----------------------------------------------------------- */}
          <div className="py-2 flex flex-col items-center justify-center min-h-[52px]">
            {stagedPhotos.length > 0 ? (
              isChangingPosition ? (
                <div className="flex items-center gap-2 bg-[#0c1a36] px-3 py-1 rounded-xl border border-amber-400/50 shadow-xl animate-in zoom-in-95">
                  <span className="text-xs text-slate-300 font-semibold">Move to position:</span>
                  <input
                    type="number"
                    min={1}
                    max={stagedPhotos.length}
                    value={targetPositionInput}
                    onChange={(e) => setTargetPositionInput(e.target.value)}
                    className="w-14 bg-slate-950 border border-slate-700 text-center font-bold text-amber-300 rounded py-0.5 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleApplyPositionChange();
                      if (e.key === 'Escape') setIsChangingPosition(false);
                    }}
                  />
                  <span className="text-xs text-slate-400">of {stagedPhotos.length}</span>
                  <button
                    onClick={handleApplyPositionChange}
                    className="px-2.5 py-0.5 bg-amber-500 text-black text-xs font-bold rounded"
                  >
                    OK
                  </button>
                  <button
                    onClick={() => setIsChangingPosition(false)}
                    className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setTargetPositionInput(String(currentIndex + 1));
                      setIsChangingPosition(true);
                    }}
                    title="Click to change photo sequence number / position"
                    className="group flex items-center gap-2 text-3xl sm:text-4xl font-light tracking-widest text-white hover:text-amber-400 transition"
                  >
                    <span>{currentIndex + 1}/{stagedPhotos.length}</span>
                    <Edit2 size={16} className="opacity-0 group-hover:opacity-100 text-amber-400 transition-opacity" />
                  </button>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    Click number to change position in catalog order
                  </span>
                </>
              )
            ) : (
              <span className="text-xs text-slate-500 italic">
                No photos selected yet
              </span>
            )}
          </div>
        </div>

        {/* =============================================================== */}
        {/* RIGHT PANEL: PRODUCT INFORMATION & CONFIGURATION                */}
        {/* =============================================================== */}
        <div className="w-full lg:w-[360px] xl:w-[400px] flex flex-col justify-between flex-shrink-0 bg-[#060e22] rounded-2xl p-4 sm:p-6 border border-slate-800/80 overflow-y-auto custom-scrollbar gap-5">
          
          <div className="space-y-5">
            {/* 1. TOP DASHBOARD BUTTON (Dark Teal) */}
            <button
              onClick={onClose}
              className="w-full h-11 bg-[#0c443c] hover:bg-[#11554c] text-white font-bold text-base rounded-xl flex items-center justify-center transition shadow-md active:scale-98"
            >
              Dashboard
            </button>

            {/* 2. PRODUCT INFORMATION TITLE */}
            <div className="text-center border-b border-slate-800 pb-3">
              <h2 className="text-base sm:text-lg font-bold tracking-wide uppercase text-white">
                PRODUCT INFORMATION
              </h2>
            </div>

            {/* HIDE / UNHIDE PRODUCT TOGGLE */}
            {initialPhoto && (
              <div className="bg-[#0a142c] p-3.5 rounded-xl border border-slate-700/80 flex items-center justify-between">
                <div>
                  <span className="text-xs sm:text-sm font-bold text-white block">Product Visibility (APK Hide)</span>
                  <span className="text-[11px] text-slate-300">
                    {currentPhoto?.isHidden ? 'Hidden from APK (Blurred in Gallery)' : 'Visible in APK'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (currentPhoto && currentPhoto.id) {
                      toggleVisibility(currentPhoto.id, !!currentPhoto.isHidden);
                    }
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition shadow ${
                    currentPhoto?.isHidden
                      ? 'bg-red-600 text-white shadow-red-600/30'
                      : 'bg-emerald-600 text-white shadow-emerald-600/30'
                  }`}
                >
                  {currentPhoto?.isHidden ? 'Hidden (Show)' : 'Visible (Hide)'}
                </button>
              </div>
            )}

            {/* MANDATORY CATEGORY & SUBCATEGORY SELECTION */}
            <div className={`p-4 rounded-xl border ${categoryValidationError ? 'bg-red-950/40 border-red-500/80 ring-1 ring-red-500' : 'bg-[#0a142c] border-slate-700/60'} space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1.5">
                  <Layers size={16} className="text-amber-400" />
                  <span>Category & Subcategory *</span>
                </span>
                {stagedPhotos.length > 1 && (
                  <button
                    onClick={handleApplyCategoryToAllStaged}
                    title="Apply selected Category & Subcategory to all staged photos"
                    className="text-xs text-indigo-300 hover:text-white underline font-semibold"
                  >
                    Apply to all ({stagedPhotos.length})
                  </button>
                )}
              </div>

              {/* Category Dropdown (NO DEFAULT SELECTION) */}
              <div>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className={`w-full bg-[#050b18] border text-sm sm:text-base font-semibold text-white rounded-xl py-2.5 px-3.5 focus:outline-none transition ${
                    !selectedCategoryId && categoryValidationError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-700 focus:border-purple-400'
                  }`}
                >
                  <option value="" disabled className="text-sm font-medium text-slate-400">-- Select Category * --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id} className="text-sm font-semibold text-white">{c.displayName}</option>
                  ))}
                </select>
              </div>

              {/* Subcategory Dropdown (NO DEFAULT SELECTION) */}
              <div>
                <select
                  value={selectedSubCategoryId}
                  disabled={!selectedCategoryId}
                  onChange={(e) => handleSubCategoryChange(e.target.value)}
                  className={`w-full bg-[#050b18] border text-sm sm:text-base font-semibold text-white rounded-xl py-2.5 px-3.5 focus:outline-none transition disabled:opacity-40 ${
                    !selectedSubCategoryId && categoryValidationError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-700 focus:border-purple-400'
                  }`}
                >
                  <option value="" disabled className="text-sm font-medium text-slate-400">
                    {selectedCategoryId ? '-- Select Subcategory * --' : '-- First Select Category --'}
                  </option>
                  {filteredSubCategories.map(s => (
                    <option key={s.id} value={s.id} className="text-sm font-semibold text-white">{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Add New Subcategory Option */}
              {selectedCategoryId && (
                <div>
                  {showNewSubCatInput ? (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="New Subcategory name..."
                        value={customSubCategoryInput}
                        onChange={(e) => setCustomSubCategoryInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateNewSubCategory()}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-white"
                        autoFocus
                      />
                      <button
                        onClick={handleCreateNewSubCategory}
                        className="px-4 py-2 bg-amber-500 text-black font-bold text-xs rounded-xl"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setShowNewSubCatInput(false)}
                        className="px-2 py-2 text-slate-400 hover:text-white text-xs"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewSubCatInput(true)}
                      className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 mt-1"
                    >
                      <FolderPlus size={14} />
                      <span>+ Create New Subcategory</span>
                    </button>
                  )}
                </div>
              )}

              {/* Error warning badge */}
              {categoryValidationError && (
                <p className="text-xs text-red-400 font-bold leading-tight">
                  {categoryValidationError}
                </p>
              )}
            </div>

            {/* 3. PRODUCT NAME / CODE PILL / CUSTOMIZABLE INPUT */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-bold text-slate-200 flex items-center justify-between">
                <span>Product Code / Name</span>
                <span className="text-[11px] font-bold text-amber-300 bg-amber-400/15 border border-amber-400/40 px-2 py-0.5 rounded-md tracking-wider uppercase">
                  Click to edit
                </span>
              </label>

              {isEditingCode ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={codeInputValue}
                    onChange={(e) => setCodeInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEditedCode();
                      if (e.key === 'Escape') setIsEditingCode(false);
                    }}
                    className="flex-1 bg-[#5b3d99] text-white font-bold text-base py-2.5 px-3.5 rounded-xl border border-purple-300 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveEditedCode}
                    className="p-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white shadow-md"
                    title="Save Name"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => setIsEditingCode(false)}
                    className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300"
                    title="Cancel"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setCodeInputValue(currentPhoto?.photoCode || '');
                    setIsEditingCode(true);
                  }}
                  title="Click to customize product name"
                  className="w-full bg-[#5b3d99] hover:bg-[#6846ae] text-white font-bold text-base sm:text-lg py-3 px-4 rounded-xl text-center transition shadow-md flex items-center justify-between group"
                >
                  <span className="flex-1 text-center truncate">{currentPhoto?.photoCode || 'PRODUCT NAME'}</span>
                  <Edit2 size={16} className="text-purple-300 opacity-80 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>
              )}
            </div>

            {/* 4. DYNAMIC VARIANTS HEADER */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <div>
                <span className="text-sm sm:text-base font-bold tracking-wide uppercase text-white block">
                  Product Variants
                </span>
                <span className="text-xs text-slate-300">
                  Click label to edit (e.g. Black, 1kg, 100ml)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRemoveLastVariant}
                  title="Remove last variant"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#ef4444] hover:bg-red-600 text-white flex items-center justify-center font-bold text-base transition active:scale-95 shadow-md"
                >
                  <X size={18} />
                </button>
                <button
                  onClick={handleAddVariant}
                  title="Add variant"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#16a34a] hover:bg-emerald-600 text-white flex items-center justify-center font-bold text-base transition active:scale-95 shadow-md"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            {/* 5. DYNAMIC VARIANT ROWS WITH ENLARGED BADGES & CONTROLS */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {currentPhoto && currentPhoto.variants.length > 0 ? (
                currentPhoto.variants.map((v, idx) => (
                  <div
                    key={v.id || `${v.label}-${idx}`}
                    className="flex items-center justify-between bg-[#040816] border border-slate-800/90 p-3 rounded-xl text-sm gap-3 shadow-sm"
                  >
                    {/* Enlarge Green Variant Badge Box (1, A, B, C, D) */}
                    <div className="w-10 h-10 sm:w-11 sm:h-11 bg-[#00c950] rounded-xl flex-shrink-0 flex items-center justify-center text-base sm:text-lg font-bold text-black shadow-md">
                      {idx + 1}
                    </div>

                    {/* Editable Variant Label Box */}
                    {editingVariantIndex === idx ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={v.label || v.letter}
                          onChange={(e) => handleUpdateVariantLabel(idx, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingVariantIndex(null);
                          }}
                          className="w-full bg-[#1e1338] border border-amber-400 rounded-xl px-3 py-1.5 text-base font-bold text-amber-300 focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => setEditingVariantIndex(null)}
                          className="p-2 bg-emerald-600 rounded-xl text-white hover:bg-emerald-500 shadow"
                          title="Done"
                        >
                          <Check size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingVariantIndex(idx)}
                        title="Click to rename variant"
                        className="group flex items-center gap-2 flex-1 text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-800/80 transition truncate border border-transparent hover:border-slate-700"
                      >
                        <span className="font-bold text-white text-base tracking-wide">
                          {v.label || v.letter}
                        </span>
                        <Edit2 size={14} className="text-slate-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}

                    {/* Enlarged Min Qty Stepper Box */}
                    <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition ${
                      (v.minQuantity === 0 || v.quantity === 0)
                        ? 'bg-red-950/40 border-red-500/80'
                        : 'bg-[#0b1429] border-slate-700/90 shadow-inner'
                    }`}>
                      <span className="text-xs sm:text-sm font-bold text-slate-300">Min:</span>
                      <input
                        type="number"
                        min={0}
                        value={v.minQuantity ?? v.quantity ?? 1}
                        onChange={(e) => handleUpdateVariantQuantity(idx, parseInt(e.target.value, 10))}
                        className={`w-14 bg-transparent text-center font-mono font-bold text-base focus:outline-none ${
                          (v.minQuantity === 0 || v.quantity === 0) ? 'text-red-400' : 'text-white'
                        }`}
                      />
                      {(v.minQuantity === 0 || v.quantity === 0) && (
                        <span className="text-[10px] font-black uppercase text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded">
                          Out
                        </span>
                      )}
                    </div>

                    {/* Delete Variant Button */}
                    <button
                      onClick={() => handleRemoveVariantByIndex(idx)}
                      title="Delete variant"
                      className="w-9 h-9 rounded-xl bg-red-950/50 hover:bg-red-900 text-red-400 hover:text-red-200 flex items-center justify-center font-bold transition active:scale-95 flex-shrink-0"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-sm text-slate-400 italic">
                  Upload a photo to configure variants
                </div>
              )}
            </div>
          </div>

          {/* 6. BOTTOM ACTION BUTTONS: Save & Delete */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <button
              onClick={handleCreateAllProducts}
              disabled={stagedPhotos.length === 0 || isUploading}
              className="w-full py-3.5 bg-[#00c853] hover:bg-[#00b047] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-black text-base rounded-xl flex items-center justify-center gap-2 shadow-xl transition active:scale-98 tracking-wide"
            >
              {isUploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Uploading to Cloud Storage ({stagedPhotos.length})...</span>
                </>
              ) : (
                <span>→ Save All Products ({stagedPhotos.length})</span>
              )}
            </button>

            {initialPhoto && (
              <button
                type="button"
                onClick={handleDeleteExistingProduct}
                className="w-full py-3 bg-red-950/80 hover:bg-red-900 border border-red-600 text-red-200 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition shadow-md"
              >
                <Trash2 size={16} />
                <span>Delete Product</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* DUPLICATE CODE DETECTION & COMPARISON POPUP                         */}
      {/* =================================================================== */}
      {duplicateModal && (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#091228] border-2 border-amber-500/80 rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
            
            {/* Warning Header */}
            <div className="flex items-start gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-white">
                  Duplicate Product Detected!
                </h3>
                <p className="text-xs text-amber-300 font-medium">
                  Product name <span className="font-bold bg-amber-400/20 px-1.5 py-0.5 rounded text-amber-300">[{duplicateModal.attemptedCode}]</span> already exists in Showroom!
                </p>
              </div>
              <button
                onClick={() => setDuplicateModal(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Side-by-Side Image Comparison */}
            <div className="grid grid-cols-2 gap-3">
              {/* Existing Product in Database */}
              <div className="bg-[#040816] p-2.5 rounded-xl border border-slate-700/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-400">Existing in Showroom</span>
                  <span className="text-[10px] font-mono text-slate-400">ID: {duplicateModal.existingProduct.id}</span>
                </div>
                <div className="w-full aspect-video bg-black rounded-lg overflow-hidden border border-slate-800">
                  <img
                    src={duplicateModal.existingProduct.imageUri}
                    alt={duplicateModal.existingProduct.photoCode}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-[11px] text-slate-300 space-y-0.5">
                  <p><strong>Name:</strong> {duplicateModal.existingProduct.photoCode}</p>
                  <p><strong>Category:</strong> {duplicateModal.existingProduct.subCategoryName}</p>
                  <p><strong>Variants:</strong> {duplicateModal.existingProduct.itemCount} Items ({duplicateModal.existingProduct.customLabels?.join(', ') || 'A, B'})</p>
                </div>
              </div>

              {/* Newly Uploaded Staged Photo */}
              <div className="bg-[#040816] p-2.5 rounded-xl border border-purple-500/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-400">New Upload Staged</span>
                  <span className="text-[10px] text-purple-300 font-semibold">New Image</span>
                </div>
                <div className="w-full aspect-video bg-black rounded-lg overflow-hidden border border-slate-800">
                  <img
                    src={duplicateModal.newImageUri}
                    alt={duplicateModal.attemptedCode}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-[11px] text-slate-300 space-y-0.5">
                  <p><strong>Proposed Name:</strong> {duplicateModal.attemptedCode}</p>
                  <p className="text-slate-400">What would you like to do?</p>
                </div>
              </div>
            </div>

            {/* Change Code Input & Suggestions */}
            <div className="bg-[#0e1c3a] p-3 rounded-xl border border-slate-700 space-y-2">
              <label className="block text-xs font-bold text-slate-200">
                Option A: Change to a Unique Name (Recommended)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customNewCodeInput}
                  onChange={(e) => setCustomNewCodeInput(e.target.value)}
                  placeholder="Enter unique name..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-amber-300 font-bold"
                />
                <button
                  onClick={() => handleDuplicateChangeCode(customNewCodeInput)}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition"
                >
                  Use New Name
                </button>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400">Suggestions:</span>
                <button
                  onClick={() => setCustomNewCodeInput(`${duplicateModal.attemptedCode}-A`)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded"
                >
                  {duplicateModal.attemptedCode}-A
                </button>
                <button
                  onClick={() => setCustomNewCodeInput(`${duplicateModal.attemptedCode}_1`)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded"
                >
                  {duplicateModal.attemptedCode}_1
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={() => setDuplicateModal(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg"
              >
                Cancel / Skip
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDuplicateEditExisting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl transition shadow flex items-center gap-1.5"
                >
                  <Edit2 size={13} />
                  <span>Edit Existing Product</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5. SUCCESS ANIMATION OVERLAY MODAL: Animated Thumbs Up ONLY         */}
      {/* =================================================================== */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-none animate-in fade-in duration-200">
          <div className="relative flex items-center justify-center animate-in zoom-in-95 duration-200">
            {/* Pulse Glow Ring */}
            <div className="absolute -inset-6 rounded-full bg-emerald-500/30 animate-ping" />
            {/* Main Animated Thumbs Up Circle */}
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-emerald-400 flex items-center justify-center text-white shadow-[0_0_60px_rgba(16,185,129,0.7)] animate-bounce border-4 border-emerald-300/80">
              <ThumbsUp size={64} className="stroke-[2.5]" />
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 6. INLINE LIGHTBOX VIEWER FOR PRODUCT IMAGES                        */}
      {/* =================================================================== */}
      {isLightboxOpen && currentPhoto && (
        <div 
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 select-none animate-in fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Top Bar: Counter + Close Button */}
          <div className="w-full max-w-5xl flex items-center justify-between z-30" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-900/90 border border-slate-700/80 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold text-white shadow-lg flex items-center gap-2">
              <span className="text-amber-400 font-black">{currentPhoto.photoCode}</span>
              <span className="text-slate-400">•</span>
              <span>{currentIndex + 1} / {stagedPhotos.length}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="w-10 h-10 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white flex items-center justify-center transition active:scale-90 shadow-xl"
              title="Close preview (Esc)"
            >
              <X size={20} />
            </button>
          </div>

          {/* Middle Stage: Image + Chevrons */}
          <div className="relative flex-1 w-full max-w-5xl flex items-center justify-center min-h-0 my-2" onClick={(e) => e.stopPropagation()}>
            {/* Left Chevron Circle */}
            <button
              type="button"
              onClick={handlePrev}
              disabled={stagedPhotos.length <= 1}
              className="absolute left-2 sm:left-4 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center disabled:opacity-20 transition active:scale-95 shadow-2xl backdrop-blur-sm"
              title="Previous image"
            >
              <ChevronLeft size={26} />
            </button>

            <img
              src={currentPhoto.imageUri}
              alt={currentPhoto.photoCode}
              className="max-h-[80vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            />

            {/* Right Chevron Circle */}
            <button
              type="button"
              onClick={handleNext}
              disabled={stagedPhotos.length <= 1}
              className="absolute right-2 sm:right-4 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center disabled:opacity-20 transition active:scale-95 shadow-2xl backdrop-blur-sm"
              title="Next image"
            >
              <ChevronRight size={26} />
            </button>
          </div>

          {/* Bottom Footer Hint */}
          <div className="text-[11px] text-slate-400 font-medium">
            Use left/right chevrons or keyboard arrow keys • Click outside or X to close
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 7. UNSAVED CHANGES GUARD MODAL                                      */}
      {/* =================================================================== */}
      {showUnsavedModal && pendingTargetProduct && (
        <div className="fixed inset-0 z-[210] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in">
          <div className="bg-[#0b1329] border border-amber-500/50 rounded-2xl max-w-md w-full p-6 shadow-[0_0_35px_rgba(245,158,11,0.25)] space-y-5 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider">Unsaved Changes</h3>
                <p className="text-xs text-slate-400">Product: <strong className="text-amber-300 font-bold">{currentPhoto?.photoCode || initialPhoto?.photoCode}</strong></p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed bg-[#070f23] p-4 rounded-xl border border-slate-800">
              You have unsaved modifications on this product. Do you want to save them before switching to <strong className="text-white font-bold">{pendingTargetProduct.photoCode}</strong>?
            </p>

            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleSaveAndSwitch}
                disabled={isUploading}
                className="w-full py-3 bg-[#00c853] hover:bg-[#00b047] disabled:bg-slate-800 text-white font-black text-sm rounded-xl transition shadow-[0_4px_15px_rgba(0,200,83,0.3)] flex items-center justify-center gap-2 active:scale-98"
              >
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                <span>Save & Next</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDiscardAndSwitch}
                  disabled={isUploading}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl transition"
                >
                  Discard changes
                </button>
                <button
                  type="button"
                  onClick={handleCancelSwitch}
                  disabled={isUploading}
                  className="flex-1 py-2.5 bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 font-semibold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
