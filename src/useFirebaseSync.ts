import { useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  query, 
  where, 
  getDocs,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { 
  db, 
  COLLECTIONS, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { useAppStore } from './store';
import { 
  CatalogPhoto, 
  Customer, 
  CategoryItem, 
  SubCategory,
  ShowroomVideo
} from './types';

function isTransientConnectionError(err: any): boolean {
  const msg = String(err?.message || err || '');
  const code = String(err?.code || '');
  return (
    code === 'unavailable' ||
    msg.includes('unavailable') ||
    msg.includes('Could not reach Cloud Firestore backend') ||
    msg.includes('offline') ||
    msg.includes('RST_STREAM')
  );
}

// Helper to normalize photo doc
export function normalizePhotoDoc(docSnap: QueryDocumentSnapshot<DocumentData>): CatalogPhoto {
  const data = docSnap.data();
  let parsedVariants = data.variants;
  if (typeof parsedVariants === 'string') {
    try {
      parsedVariants = JSON.parse(parsedVariants);
    } catch {}
  }

  const thumb = data.thumbnailUrl || data.imageUri || data.imageUrl || data.image || '';
  const fullImg = data.imageUrl || data.imageUri || data.image || thumb;

  return {
    id: data.id || docSnap.id,
    categoryId: data.categoryId || data.category || '',
    subCategoryId: data.subCategoryId || data.subCategory || data.sub_category_id || '',
    subCategoryName: data.subCategoryName || data.subCategoryTitle || data.subCategory || '',
    photoCode: data.photoCode || data.code || data.title || docSnap.id,
    imageUri: fullImg,
    thumbnailUrl: thumb,
    videoUri: data.videoUri || data.videoUrl || data.video || undefined,
    itemCount: typeof data.itemCount === 'number' ? data.itemCount : 4,
    aAvailable: data.aAvailable !== undefined ? data.aAvailable : (data.a !== undefined ? data.a : true),
    bAvailable: data.bAvailable !== undefined ? data.bAvailable : (data.b !== undefined ? data.b : true),
    cAvailable: data.cAvailable !== undefined ? data.cAvailable : (data.c !== undefined ? data.c : true),
    dAvailable: data.dAvailable !== undefined ? data.dAvailable : (data.d !== undefined ? data.d : true),
    defaultQuantity: typeof data.defaultQuantity === 'number' ? data.defaultQuantity : 1,
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
    orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : (typeof data.sortOrder === 'number' ? data.sortOrder : 0),
    description: data.description || '',
    variants: Array.isArray(parsedVariants) ? parsedVariants : undefined,
    aLabel: data.aLabel || undefined,
    bLabel: data.bLabel || undefined,
    cLabel: data.cLabel || undefined,
    dLabel: data.dLabel || undefined,
    aDefaultQuantity: typeof data.aDefaultQuantity === 'number' ? data.aDefaultQuantity : undefined,
    bDefaultQuantity: typeof data.bDefaultQuantity === 'number' ? data.bDefaultQuantity : undefined,
    cDefaultQuantity: typeof data.cDefaultQuantity === 'number' ? data.cDefaultQuantity : undefined,
    dDefaultQuantity: typeof data.dDefaultQuantity === 'number' ? data.dDefaultQuantity : undefined
  };
}

// Targeted Async Loaders
export async function loadSubCategoriesForCategory(categoryId: string) {
  if (!categoryId) return;
  const existing = useAppStore.getState().subCategories.filter(s => s.categoryId === categoryId);
  const hasExistingData = existing.length > 0;
  // If data already exists for this id: do NOT set loading=true (no spinner). Set loading=true ONLY when store has no data.
  useAppStore.setState({ isSubCategoriesLoading: !hasExistingData, syncError: null });
  try {
    const q = query(
      collection(db, COLLECTIONS.SUBCATEGORIES),
      where('categoryId', '==', categoryId)
    );
    const snap = await getDocs(q);
    const fetchedSubs: SubCategory[] = snap.docs.map((docSnap) => {
      const data = docSnap.data() as any;
      const docId = docSnap.id;
      return {
        id: data.id || docId,
        categoryId: data.categoryId || data.category || categoryId,
        name: data.name || data.displayName || data.title || docId,
        iconName: data.iconName || data.icon || 'sparkles',
        thumbnailUrl: data.thumbnailUrl || data.imageUrl || data.imageUri || data.image || '',
        photoCount: typeof data.photoCount === 'number' ? data.photoCount : 0,
        sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
        orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : (typeof data.sortOrder === 'number' ? data.sortOrder : 0)
      };
    });
    fetchedSubs.sort((a, b) => (a.orderIndex ?? a.sortOrder ?? 0) - (b.orderIndex ?? b.sortOrder ?? 0));

    useAppStore.setState((state) => {
      const newIds = new Set(fetchedSubs.map(s => s.id));
      const otherSubs = state.subCategories.filter(s => s.categoryId !== categoryId && !newIds.has(s.id));
      const combined = [...otherSubs, ...fetchedSubs];
      combined.sort((a, b) => (a.orderIndex ?? a.sortOrder ?? 0) - (b.orderIndex ?? b.sortOrder ?? 0));

      const newActiveSubId = state.activeSubCategoryId && combined.some((s) => s.id === state.activeSubCategoryId)
        ? state.activeSubCategoryId
        : (fetchedSubs[0]?.id || state.activeSubCategoryId || '');

      return {
        subCategories: combined,
        activeSubCategoryId: newActiveSubId,
        isSubCategoriesLoading: false,
        syncError: null
      };
    });
  } catch (err: any) {
    console.error('[loadSubCategoriesForCategory Error]', err);
    handleFirestoreError(err, OperationType.GET, COLLECTIONS.SUBCATEGORIES);
    useAppStore.setState({ 
      isSubCategoriesLoading: false, 
      syncError: isTransientConnectionError(err) ? null : String(err.message || err) 
    });
  }
}

export async function loadPhotosForCategory(categoryId: string) {
  if (!categoryId) return;
  const existing = useAppStore.getState().photos.filter(p => p.categoryId === categoryId);
  const hasExistingData = existing.length > 0;
  // If data already exists for this id: do NOT set loading=true (no spinner). Set loading=true ONLY when store has no data.
  useAppStore.setState({ isPhotosLoading: !hasExistingData, syncError: null });
  try {
    const qPhotos = query(
      collection(db, COLLECTIONS.PHOTOS),
      where('categoryId', '==', categoryId)
    );
    const qCatalogPhotos = query(
      collection(db, COLLECTIONS.CATALOG_PHOTOS),
      where('categoryId', '==', categoryId)
    );

    const [snapPhotos, snapCatalogPhotos] = await Promise.all([
      getDocs(qPhotos).catch(() => null),
      getDocs(qCatalogPhotos).catch(() => null)
    ]);

    const photoMap = new Map<string, CatalogPhoto>();

    if (snapCatalogPhotos && !snapCatalogPhotos.empty) {
      snapCatalogPhotos.docs.forEach((docSnap) => {
        const item = normalizePhotoDoc(docSnap);
        photoMap.set(item.id, item);
      });
    }

    if (snapPhotos && !snapPhotos.empty) {
      snapPhotos.docs.forEach((docSnap) => {
        const item = normalizePhotoDoc(docSnap);
        photoMap.set(item.id, item);
      });
    }

    const merged = Array.from(photoMap.values());
    merged.sort((a, b) => (a.orderIndex ?? a.sortOrder ?? 0) - (b.orderIndex ?? b.sortOrder ?? 0));

    useAppStore.setState((state) => {
      const newIds = new Set(merged.map(m => m.id));
      const otherPhotos = state.photos.filter(p => p.categoryId !== categoryId && !newIds.has(p.id));
      return {
        photos: [...otherPhotos, ...merged],
        isPhotosLoading: false,
        syncError: null
      };
    });
  } catch (err: any) {
    console.error('[loadPhotosForCategory Error]', err);
    handleFirestoreError(err, OperationType.GET, COLLECTIONS.PHOTOS);
    useAppStore.setState({ 
      isPhotosLoading: false, 
      syncError: isTransientConnectionError(err) ? null : String(err.message || err) 
    });
  }
}

export async function loadPhotosForSubCategory(subCategoryId: string) {
  if (!subCategoryId) return;
  const existing = useAppStore.getState().photos.filter(p => p.subCategoryId === subCategoryId);
  const hasExistingData = existing.length > 0;
  // If data already exists for this id: do NOT set loading=true (no spinner). Set loading=true ONLY when store has no data.
  useAppStore.setState({ isPhotosLoading: !hasExistingData, syncError: null });
  try {
    const qPhotos = query(
      collection(db, COLLECTIONS.PHOTOS),
      where('subCategoryId', '==', subCategoryId)
    );
    const qCatalogPhotosSubCategoryId = query(
      collection(db, COLLECTIONS.CATALOG_PHOTOS),
      where('subCategoryId', '==', subCategoryId)
    );

    let [snapPhotos, snapCatalogPhotos] = await Promise.all([
      getDocs(qPhotos).catch(() => null),
      getDocs(qCatalogPhotosSubCategoryId).catch(() => null)
    ]);

    const primaryReturnedZero = !snapCatalogPhotos || snapCatalogPhotos.empty;

    if (primaryReturnedZero) {
      const qCatalogPhotosSubCategoryFallback = query(
        collection(db, COLLECTIONS.CATALOG_PHOTOS),
        where('subCategory', '==', subCategoryId)
      );
      snapCatalogPhotos = await getDocs(qCatalogPhotosSubCategoryFallback).catch(() => null);
      if (snapCatalogPhotos && !snapCatalogPhotos.empty) {
        const fallbackDocsCount = snapCatalogPhotos.size;
        const fallbackSampleKeys = snapCatalogPhotos.docs.slice(0, 3).map(d => d.id);
        console.warn(`[Slow Subcategory Warning] Primary 'subCategoryId' query returned 0 docs, but legacy 'subCategory' query returned results!`, {
          subCategoryId,
          fallbackDocsCount,
          fallbackSampleKeys
        });
      }
    }

    const photoMap = new Map<string, CatalogPhoto>();

    if (snapCatalogPhotos && !snapCatalogPhotos.empty) {
      snapCatalogPhotos.docs.forEach((docSnap) => {
        const item = normalizePhotoDoc(docSnap);
        photoMap.set(item.id, item);
      });
    }

    if (snapPhotos && !snapPhotos.empty) {
      snapPhotos.docs.forEach((docSnap) => {
        const item = normalizePhotoDoc(docSnap);
        photoMap.set(item.id, item);
      });
    }

    const merged = Array.from(photoMap.values());
    merged.sort((a, b) => (a.orderIndex ?? a.sortOrder ?? 0) - (b.orderIndex ?? b.sortOrder ?? 0));

    useAppStore.setState((state) => {
      const newIds = new Set(merged.map(m => m.id));
      const otherPhotos = state.photos.filter(p => p.subCategoryId !== subCategoryId && !newIds.has(p.id));
      return {
        photos: [...otherPhotos, ...merged],
        isPhotosLoading: false,
        syncError: null
      };
    });
  } catch (err: any) {
    console.error('[loadPhotosForSubCategory Error]', err);
    handleFirestoreError(err, OperationType.GET, COLLECTIONS.PHOTOS);
    useAppStore.setState({ 
      isPhotosLoading: false, 
      syncError: isTransientConnectionError(err) ? null : String(err.message || err) 
    });
  }
}

export function useFirebaseSync() {
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'synced' | 'error'>('connecting');

  // 1. Snapshot Listener for CATEGORIES (Small collection)
  useEffect(() => {
    let unsubscribeCategories: (() => void) | null = null;

    try {
      const catCol = collection(db, COLLECTIONS.CATEGORIES);
      unsubscribeCategories = onSnapshot(
        catCol,
        (snapshot) => {
          const currentCategoriesMap = new Map<string, CategoryItem>(
            useAppStore.getState().categories.map((c) => [c.id, c])
          );

          snapshot.docChanges().forEach((change) => {
            const data = change.doc.data() as any;
            const docId = change.doc.id;

            if (change.type === 'removed') {
              currentCategoriesMap.delete(docId);
            } else {
              currentCategoriesMap.set(docId, {
                id: data.id || docId,
                displayName: data.displayName || data.name || data.title || docId,
                thumbnailUrl: data.thumbnailUrl || data.imageUrl || data.imageUri || data.image || '',
                accentColorHex: data.accentColorHex || data.accentColor || data.color || '#F59E0B',
                sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
                orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : (typeof data.sortOrder === 'number' ? data.sortOrder : 0)
              });
            }
          });

          const fetchedCats = Array.from(currentCategoriesMap.values());
          fetchedCats.sort((a, b) => (a.orderIndex ?? a.sortOrder ?? 0) - (b.orderIndex ?? b.sortOrder ?? 0));

          useAppStore.setState((state) => {
            const newActiveCatId = state.activeCategoryId && fetchedCats.some((c) => c.id === state.activeCategoryId)
              ? state.activeCategoryId
              : (fetchedCats[0]?.id || '');

            return {
              categories: fetchedCats,
              activeCategoryId: newActiveCatId,
              syncError: null
            };
          });

          setIsFirebaseConnected(true);
          setSyncStatus('synced');
        },
        (err) => {
          console.error('[Categories Sync Error]', err);
          handleFirestoreError(err, OperationType.GET, COLLECTIONS.CATEGORIES);
          useAppStore.setState({ syncError: isTransientConnectionError(err) ? null : String(err.message || err) });
          setSyncStatus(isTransientConnectionError(err) ? 'synced' : 'error');
        }
      );
    } catch (err: any) {
      console.error('[Categories Sync Initialization Error]', err);
      useAppStore.setState({ syncError: isTransientConnectionError(err) ? null : String(err.message || err) });
      setSyncStatus('error');
    }

    return () => {
      if (unsubscribeCategories) unsubscribeCategories();
    };
  }, []);

  // 2. Snapshot Listener for SHOWROOM_VIDEOS (Small collection)
  useEffect(() => {
    let unsubscribeVideos: (() => void) | null = null;
    try {
      const vidCol = collection(db, COLLECTIONS.SHOWROOM_VIDEOS);
      unsubscribeVideos = onSnapshot(
        vidCol,
        (snapshot) => {
          const vids: ShowroomVideo[] = snapshot.docs.map((d) => {
            const data = d.data() as any;
            return {
              id: data.id || d.id,
              title: data.title || data.name || '',
              videoUri: data.videoUri || data.videoUrl || data.url || '',
              thumbnailUrl: data.thumbnailUrl || data.imageUrl || '',
              sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0
            };
          });
          useAppStore.setState({ showroomVideos: vids });
        },
        (err) => {
          console.error('[ShowroomVideos Sync Error]', err);
          handleFirestoreError(err, OperationType.GET, COLLECTIONS.SHOWROOM_VIDEOS);
          useAppStore.setState({ syncError: isTransientConnectionError(err) ? null : String(err.message || err) });
        }
      );
    } catch (err: any) {
      console.error('[ShowroomVideos Init Error]', err);
    }
    return () => {
      if (unsubscribeVideos) unsubscribeVideos();
    };
  }, []);

  // 3. Customer document listener for current customer shop
  useEffect(() => {
    let unsubscribeCustomerDoc: (() => void) | null = null;
    const currentCust = useAppStore.getState().currentCustomer;
    const custCode = currentCust?.customerId || currentCust?.customerCode;

    if (custCode) {
      try {
        const custRef = doc(db, COLLECTIONS.CUSTOMERS, custCode);
        unsubscribeCustomerDoc = onSnapshot(
          custRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data() as any;
              const updatedCust: Customer = {
                customerId: data.customerId || data.customerCode || snapshot.id,
                customerCode: data.customerCode || data.customerId || snapshot.id,
                shopName: data.shopName || '',
                ownerName: data.ownerName || data.contactPerson || '',
                phone: data.phone || data.mobileNumber || '',
                city: data.city || data.cityName || '',
                address: data.address || '',
                contactPerson: data.ownerName || data.contactPerson || '',
                mobileNumber: data.phone || data.mobileNumber || '',
                cityName: data.city || data.cityName || '',
                createdAt: data.createdAt || 0,
                pin: data.pin || '1111',
                status: data.status || 'Approved',
                role: data.role || 'User',
                allowedCategoryIds: data.allowedCategoryIds || ['all'],
                allowedSubCategoryIds: data.allowedSubCategoryIds || ['all'],
                isOnline: data.isOnline || false,
                lastActive: data.lastActive || null,
                location: data.location || null
              };
              useAppStore.setState({ currentCustomer: updatedCust });
            }
          },
          (err) => {
            useAppStore.setState({ syncError: isTransientConnectionError(err) ? null : String(err.message || err) });
          }
        );
      } catch {}
    }

    return () => {
      if (unsubscribeCustomerDoc) unsubscribeCustomerDoc();
    };
  }, []);

  return { isFirebaseConnected, syncStatus };
}
