import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore,
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocFromServer,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';
import { getStorage, ref as storageRef, listAll, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';
import { CatalogPhoto, WholesaleOrder, Customer, ChatMessage, CommunityPost, CategoryItem, SubCategory } from './types';
import { generateOrderId } from './lib/idGenerator';

// Initialize Firebase App
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseApp = app;

// Firebase Authentication instance
export const auth = getAuth(app);

// Storage bucket instance
export const storage = typeof window !== 'undefined' 
  ? getStorage(app, "gs://shivam-2bace.firebasestorage.app") 
  : null;

export type MediaFolder = 'catalog' | 'voice_notes' | 'communication' | 'cart_attachments' | 'staff_uploads';

/**
 * Direct Cloud Storage upload pipeline
 */
export async function uploadMediaToStorage(
  fileOrBlob: Blob | File | string,
  folder: MediaFolder,
  prefix: string = 'media',
  timeoutMs: number = 20000
): Promise<string> {
  if (!fileOrBlob) return '';

  if (typeof fileOrBlob === 'string' && (fileOrBlob.startsWith('http://') || fileOrBlob.startsWith('https://'))) {
    return fileOrBlob;
  }

  let uploadableBlob: Blob | File | null = null;

  if (typeof fileOrBlob === 'string') {
    if (fileOrBlob.startsWith('data:') || fileOrBlob.startsWith('blob:')) {
      try {
        const res = await fetch(fileOrBlob);
        uploadableBlob = await res.blob();
      } catch (err) {
        console.warn('[Storage] Failed to convert URI to blob:', err);
        return '';
      }
    } else {
      return '';
    }
  } else {
    uploadableBlob = fileOrBlob;
  }

  if (!uploadableBlob || !storage) return '';

  const mime = (uploadableBlob as Blob).type || '';
  let ext = 'jpg';
  if (mime.includes('mp4') || mime.includes('m4a')) ext = 'm4a';
  else if (mime.includes('wav')) ext = 'wav';
  else if (mime.includes('audio') || mime.includes('webm')) ext = 'webm';
  else if (mime.includes('png')) ext = 'png';
  else if (mime.includes('webp')) ext = 'webp';
  else if (mime.includes('gif')) ext = 'gif';
  else if (mime.includes('pdf')) ext = 'pdf';

  const uniqueName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
  const fileRef = storageRef(storage, `${folder}/${uniqueName}`);

  const uploadTask = async () => {
    const snapshot = await uploadBytes(fileRef, uploadableBlob as Blob, { 
      contentType: (uploadableBlob as Blob).type || undefined,
      cacheControl: 'public, max-age=31536000, immutable'
    });
    return await getDownloadURL(snapshot.ref);
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<string>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Cloud Storage upload timed out after ${timeoutMs / 1000}s`)), timeoutMs);
  });
  try {
    return await Promise.race([uploadTask(), timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Custom Database ID
export const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId || "ai-studio-shivam-6138ca5c-1e3b-412f-957d-d52501eff503";

export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true
}, FIRESTORE_DATABASE_ID);


// Initialize Firebase Messaging safely
export let messaging: any = null;
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(firebaseApp);
  }
} catch (e) {
  console.warn('Firebase Messaging is not supported or failed to initialize:', e);
}

// Collection Names
export const COLLECTIONS = {
  PHOTOS: 'photos',
  CATALOG_PHOTOS: 'catalog_photos',
  SHOWROOM_VIDEOS: 'showroomVideos',
  CUSTOMERS: 'customers',
  ORDERS: 'orders',
  COMMUNITY_POSTS: 'community_posts',
  MESSAGES: 'chat_messages',
  CONVERSATIONS: 'conversations',
  BROADCAST_MESSAGES: 'broadcast_messages',
  CATEGORIES: 'categories',
  SUBCATEGORIES: 'subCategories',
  SUBCATEGORIES_LOWER: 'subcategories'
} as const;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  
  if (errorMessage.includes('Quota limit exceeded') || errorMessage.includes('quota')) {
    console.warn(`[Firebase Quota Exceeded] Unable to sync '${path}'. The daily free read limit has been reached. Please upgrade to the Blaze plan or wait for the daily reset.`);
  } else if (
    errorMessage.includes('RST_STREAM') || 
    errorMessage.includes('Code: 13') || 
    errorMessage.includes('INTERNAL: Received RST_STREAM') ||
    errorMessage.includes('unavailable') ||
    errorMessage.includes('Could not reach Cloud Firestore backend') ||
    errorMessage.includes('offline')
  ) {
    console.warn(`[Firestore Connection Notice] Temporary network interruption for '${path}'. Auto-reconnecting...`);
  } else {
    console.error('Firestore Error:', JSON.stringify(errInfo));
  }
  
  return errInfo;
}

// Test Firestore connection on boot (non-blocking)
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is offline. Verify network connection.');
      return false;
    }
    // Any other response means the server was reached
    return true;
  }
}

if (typeof window !== 'undefined') {
  testFirestoreConnection().catch(() => {});
}

/* ==========================================================================
   FIRESTORE CRUD HELPERS
   ========================================================================== */

export async function safelyDeleteStorageFolder(folderPath: string): Promise<void> {
  if (!storage) return;
  try {
    const folder = storageRef(storage, folderPath);
    const listResult = await listAll(folder);
    await Promise.all(listResult.items.map(item => deleteObject(item).catch(() => {})));
    await Promise.all(listResult.prefixes.map(prefix => safelyDeleteStorageFolder(prefix.fullPath)));
  } catch {
    // Safe fallback if folder not found
  }
}

export async function syncPhotoToFirebase(photo: CatalogPhoto): Promise<void> {
  const path = `${COLLECTIONS.PHOTOS}/${photo.id}`;
  try {
    // Ensure no stale conflicting document with the same SKU (photoCode) lingers
    if (photo.photoCode) {
      try {
        const cleanSku = photo.photoCode.trim();
        const qPhotos = query(collection(db, COLLECTIONS.PHOTOS), where('photoCode', '==', cleanSku));
        const qCatalogPhotos = query(collection(db, COLLECTIONS.CATALOG_PHOTOS), where('photoCode', '==', cleanSku));
        const [snap1, snap2] = await Promise.allSettled([getDocs(qPhotos), getDocs(qCatalogPhotos)]);
        
        const staleDocs: any[] = [];
        if (snap1.status === 'fulfilled') {
          snap1.value.forEach(d => {
            if (d.id !== photo.id) staleDocs.push(d.ref);
          });
        }
        if (snap2.status === 'fulfilled') {
          snap2.value.forEach(d => {
            if (d.id !== photo.id) staleDocs.push(d.ref);
          });
        }
        if (staleDocs.length > 0) {
          const batch = writeBatch(db);
          staleDocs.forEach(r => batch.delete(r));
          await batch.commit();
        }
      } catch (err) {
        console.warn('SKU conflict pre-check error (non-fatal):', err);
      }
    }

    const photoPayload = {
      ...photo,
      updatedAt: Date.now()
    };

    // Guard: Prevent base64 data URIs from being written to Firestore
    if (photoPayload.imageUri && photoPayload.imageUri.startsWith('data:')) {
      throw new Error('[Base64 Protection] Base64 data URIs cannot be saved to Firestore. Please upload image to Storage first.');
    }

    const photoRef = doc(db, COLLECTIONS.PHOTOS, photo.id);
    await setDoc(photoRef, photoPayload, { merge: true });

    // Also mirror to CATALOG_PHOTOS
    try {
      const catPhotoRef = doc(db, COLLECTIONS.CATALOG_PHOTOS, photo.id);
      await setDoc(catPhotoRef, photoPayload, { merge: true });
    } catch {}
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncCategoryToFirebase(category: CategoryItem): Promise<void> {
  const path = `${COLLECTIONS.CATEGORIES}/${category.id}`;
  try {
    const catRef = doc(db, COLLECTIONS.CATEGORIES, category.id);
    await setDoc(catRef, {
      ...category,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncSubCategoryToFirebase(subCategory: SubCategory): Promise<void> {
  const path = `${COLLECTIONS.SUBCATEGORIES}/${subCategory.id}`;
  try {
    const subRef = doc(db, COLLECTIONS.SUBCATEGORIES, subCategory.id);
    await setDoc(subRef, {
      ...subCategory,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function batchUpdateSubCategoriesOrder(subCategories: SubCategory[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    subCategories.forEach((sub, index) => {
      const subRef = doc(db, COLLECTIONS.SUBCATEGORIES, sub.id);
      batch.set(subRef, { orderIndex: index, sortOrder: index + 1 }, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.SUBCATEGORIES);
  }
}

export async function batchUpdatePhotosOrder(photos: CatalogPhoto[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    photos.forEach((photo, index) => {
      const photoRef = doc(db, COLLECTIONS.PHOTOS, photo.id);
      batch.set(photoRef, { orderIndex: index, sortOrder: index + 1 }, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.PHOTOS);
  }
}

export async function batchUpdateCategoriesOrder(categories: CategoryItem[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    categories.forEach((cat, index) => {
      const catRef = doc(db, COLLECTIONS.CATEGORIES, cat.id);
      batch.set(catRef, { orderIndex: index, sortOrder: index + 1 }, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.CATEGORIES);
  }
}

export async function deleteSubCategoryFromFirebase(subCategoryId: string): Promise<void> {
  const path = `${COLLECTIONS.SUBCATEGORIES}/${subCategoryId}`;
  try {
    const subRef = doc(db, COLLECTIONS.SUBCATEGORIES, subCategoryId);
    await deleteDoc(subRef);

    // After deleting from 'subCategories', also check the legacy lowercase 'subcategories' collection and delete any doc with the same id
    const legacyRef = doc(db, COLLECTIONS.SUBCATEGORIES_LOWER, subCategoryId);
    await deleteDoc(legacyRef).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deletePhotoFromFirebase(photoId: string, photoCode?: string): Promise<void> {
  const path = `${COLLECTIONS.PHOTOS}/${photoId}`;
  try {
    const docsToDelete: any[] = [];
    docsToDelete.push(doc(db, COLLECTIONS.PHOTOS, photoId));
    docsToDelete.push(doc(db, COLLECTIONS.CATALOG_PHOTOS, photoId));

    if (photoCode && photoCode.trim()) {
      const cleanSku = photoCode.trim();
      const q1 = query(collection(db, COLLECTIONS.PHOTOS), where('photoCode', '==', cleanSku));
      const q2 = query(collection(db, COLLECTIONS.CATALOG_PHOTOS), where('photoCode', '==', cleanSku));
      const [s1, s2] = await Promise.allSettled([getDocs(q1), getDocs(q2)]);
      if (s1.status === 'fulfilled') s1.value.forEach(d => docsToDelete.push(d.ref));
      if (s2.status === 'fulfilled') s2.value.forEach(d => docsToDelete.push(d.ref));
    }

    const uniqueMap = new Map<string, any>();
    docsToDelete.forEach(r => uniqueMap.set(r.path, r));

    const batch = writeBatch(db);
    uniqueMap.forEach(r => batch.delete(r));
    await batch.commit();

    if (photoCode) {
      safelyDeleteStorageFolder(`products/${photoCode}`).catch(() => {});
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncCustomerToFirebase(customer: Customer): Promise<void> {
  const customerId = customer.customerId || customer.customerCode || (customer as any).id || `CUST-${Date.now().toString().slice(-4)}`;
  const path = `${COLLECTIONS.CUSTOMERS}/${customerId}`;
  try {
    const custRef = doc(db, COLLECTIONS.CUSTOMERS, customerId);
    await setDoc(custRef, {
      ...customer,
      id: customerId,
      customerId,
      customerCode: customerId,
      shopName: customer.shopName || '',
      ownerName: customer.ownerName || customer.contactPerson || '',
      phone: customer.phone || customer.mobileNumber || '',
      city: customer.city || customer.cityName || '',
      address: customer.address || '',
      contactPerson: customer.ownerName || customer.contactPerson || '',
      mobileNumber: customer.phone || customer.mobileNumber || '',
      cityName: customer.city || customer.cityName || '',
      createdAt: typeof customer.createdAt === 'number' ? customer.createdAt : Date.now(),
      updatedAt: Date.now(),
      pin: customer.pin || '1111',
      status: customer.status || 'PENDING',
      isVerified: (customer as any).isVerified !== undefined ? (customer as any).isVerified : false,
      role: customer.role || 'User',
      allowedCategoryIds: customer.allowedCategoryIds || ['all'],
      allowedSubCategoryIds: customer.allowedSubCategoryIds || ['all'],
      isOnline: customer.isOnline !== undefined ? customer.isOnline : true,
      lastActive: Date.now(),
      location: customer.location || null
    }, { merge: true });
    console.log('Successfully synced customer to Firestore:', customerId);
  } catch (error) {
    console.error("Firestore Register Error:", error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCustomerWithCascade(customerCodeOrId: string): Promise<{
  deletedOrdersCount: number;
  deletedMessagesCount: number;
  deletedCartsCount: number;
}> {
  const targetKey = customerCodeOrId?.trim();
  if (!targetKey) {
    return { deletedOrdersCount: 0, deletedMessagesCount: 0, deletedCartsCount: 0 };
  }

  const path = `${COLLECTIONS.CUSTOMERS}/${targetKey}`;
  const refsToDelete: any[] = [];
  let deletedOrdersCount = 0;
  let deletedMessagesCount = 0;
  let deletedCartsCount = 0;

  try {
    // 1. Primary customer document & search for alternate IDs
    const searchKeys = new Set<string>([targetKey]);
    refsToDelete.push(doc(db, COLLECTIONS.CUSTOMERS, targetKey));

    try {
      const qCust1 = query(collection(db, COLLECTIONS.CUSTOMERS), where('customerId', '==', targetKey));
      const qCust2 = query(collection(db, COLLECTIONS.CUSTOMERS), where('customerCode', '==', targetKey));
      const [snap1, snap2] = await Promise.allSettled([getDocs(qCust1), getDocs(qCust2)]);
      
      if (snap1.status === 'fulfilled') {
        snap1.value.forEach(d => {
          refsToDelete.push(d.ref);
          const data = d.data();
          if (data.customerId) searchKeys.add(data.customerId);
          if (data.customerCode) searchKeys.add(data.customerCode);
        });
      }
      if (snap2.status === 'fulfilled') {
        snap2.value.forEach(d => {
          refsToDelete.push(d.ref);
          const data = d.data();
          if (data.customerId) searchKeys.add(data.customerId);
          if (data.customerCode) searchKeys.add(data.customerCode);
        });
      }
    } catch (e) {
      console.warn('Customer query error:', e);
    }

    const keyList = Array.from(searchKeys);

    // 2. Cascade delete Orders
    for (const key of keyList) {
      const qO1 = query(collection(db, COLLECTIONS.ORDERS), where('customerId', '==', key));
      const qO2 = query(collection(db, COLLECTIONS.ORDERS), where('customerCode', '==', key));
      const [snapO1, snapO2] = await Promise.allSettled([getDocs(qO1), getDocs(qO2)]);

      if (snapO1.status === 'fulfilled') {
        snapO1.value.forEach(d => {
          refsToDelete.push(d.ref);
          deletedOrdersCount++;
        });
      }
      if (snapO2.status === 'fulfilled') {
        snapO2.value.forEach(d => {
          refsToDelete.push(d.ref);
          deletedOrdersCount++;
        });
      }
    }

    // 3. Cascade delete Carts
    for (const key of keyList) {
      refsToDelete.push(doc(db, 'carts', key));
      refsToDelete.push(doc(db, 'cart', key));

      try {
        const qC1 = query(collection(db, 'carts'), where('customerId', '==', key));
        const qC2 = query(collection(db, 'cart'), where('customerId', '==', key));
        const [snapC1, snapC2] = await Promise.allSettled([getDocs(qC1), getDocs(qC2)]);
        if (snapC1.status === 'fulfilled') snapC1.value.forEach(d => { refsToDelete.push(d.ref); deletedCartsCount++; });
        if (snapC2.status === 'fulfilled') snapC2.value.forEach(d => { refsToDelete.push(d.ref); deletedCartsCount++; });
      } catch {}
    }

    // 4. Cascade delete Chat Messages & Conversations
    for (const key of keyList) {
      const qM1 = query(collection(db, COLLECTIONS.MESSAGES), where('customerId', '==', key));
      const qM2 = query(collection(db, COLLECTIONS.MESSAGES), where('customerCode', '==', key));
      const [snapM1, snapM2] = await Promise.allSettled([getDocs(qM1), getDocs(qM2)]);
      
      if (snapM1.status === 'fulfilled') {
        snapM1.value.forEach(d => { refsToDelete.push(d.ref); deletedMessagesCount++; });
      }
      if (snapM2.status === 'fulfilled') {
        snapM2.value.forEach(d => { refsToDelete.push(d.ref); deletedMessagesCount++; });
      }

      // Legacy 'messages'
      try {
        const qAlt = query(collection(db, 'messages'), where('customerId', '==', key));
        const snapAlt = await getDocs(qAlt);
        snapAlt.forEach(d => { refsToDelete.push(d.ref); deletedMessagesCount++; });
      } catch {}

      // Subcollection 'conversations/{key}/messages'
      try {
        const subCol = collection(db, COLLECTIONS.CONVERSATIONS, key, 'messages');
        const snapSub = await getDocs(subCol);
        snapSub.forEach(d => { refsToDelete.push(d.ref); deletedMessagesCount++; });
        refsToDelete.push(doc(db, COLLECTIONS.CONVERSATIONS, key));
      } catch {}

      // Community posts
      try {
        const qPost = query(collection(db, COLLECTIONS.COMMUNITY_POSTS), where('customerId', '==', key));
        const snapPost = await getDocs(qPost);
        snapPost.forEach(d => refsToDelete.push(d.ref));
      } catch {}
    }

    // Deduplicate refs
    const uniqueRefs = new Map<string, any>();
    refsToDelete.forEach(ref => {
      if (ref && ref.path) {
        uniqueRefs.set(ref.path, ref);
      }
    });

    // Execute in batches of 400
    const refsList = Array.from(uniqueRefs.values());
    const chunkSize = 400;
    for (let i = 0; i < refsList.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = refsList.slice(i, i + chunkSize);
      chunk.forEach(ref => batch.delete(ref));
      await batch.commit();
    }

    // 5. Delete Storage Audio / Voice Notes
    for (const key of keyList) {
      await Promise.allSettled([
        safelyDeleteStorageFolder(`voiceNotes/${key}`),
        safelyDeleteStorageFolder(`orders/${key}`),
        safelyDeleteStorageFolder(`customers/${key}`)
      ]);
    }

    return { deletedOrdersCount, deletedMessagesCount, deletedCartsCount };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function deleteCustomerFromFirebase(customerCodeOrId: string): Promise<void> {
  await deleteCustomerWithCascade(customerCodeOrId);
}

export async function syncOrderToFirebase(order: WholesaleOrder): Promise<void> {
  const orderId = order.orderId || order.id || (order as any).orderNumber || generateOrderId();
  const path = `${COLLECTIONS.ORDERS}/${orderId}`;
  
  if (!order.items || order.items.length === 0) {
    console.warn("syncOrderToFirebase aborted: items array is empty");
    return;
  }

  try {
    const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
    
    // Standardized fields requested by Admin Dashboard
    const sanitizedItems = order.items.map((item: any) => {
      const resolvedImage = 
        item.imageUri || 
        item.imageUrl || 
        item.image || 
        item.photo || 
        (Array.isArray(item.images) && item.images[0]) || 
        '';

      return {
        photoCode: item.photoCode || item.code || item.name || 'SKU',
        imageUri: resolvedImage,
        imageUrl: resolvedImage, // Dual-key compatibility
        quantity: Number(item.quantity || 1),
        category: item.category || item.categoryId || '',
        categoryId: item.categoryId || item.category || '',
        subCategoryName: item.subCategoryName || '',
        variant: item.variant || item.optionLetter || 'A',
        optionLetter: item.optionLetter || item.variant || 'A',
        price: Number(item.price) || 0,
        photoId: item.photoId || '',
        id: item.id || `${item.photoId || item.photoCode}_${item.variant || item.optionLetter || 'A'}`,
        name: item.name || `${item.photoCode || 'SKU'} (Option ${item.variant || item.optionLetter || 'A'})`
      };
    });

    const totalQty = Number(order.totalItemsCount) || sanitizedItems.reduce((acc, i) => acc + i.quantity, 0);

    const orderPayload = {
      orderId,
      id: orderId,
      orderNumber: orderId,
      customerId: order.customerId || order.customerCode || '',
      customerCode: order.customerCode || order.customerId || '',
      shopName: order.shopName || '',
      cityName: order.cityName || '',
      mobileNumber: order.mobileNumber || '',
      items: sanitizedItems,
      itemCount: sanitizedItems.length,
      totalItemsCount: totalQty,
      orderNote: order.orderNote || order.notes || '',
      notes: order.notes || order.orderNote || '',
      voiceNoteUrl: order.voiceNoteUrl || order.voiceNoteUri || null,
      voiceNoteUri: order.voiceNoteUri || order.voiceNoteUrl || null,
      totalAmount: Number(order.totalAmount) || 0,
      status: order.status || 'Pending',
      overallStatus: order.overallStatus || order.status || 'Pending',
      imitationStatus: order.imitationStatus || 'PENDING',
      cosmeticsStatus: order.cosmeticsStatus || 'PENDING',
      hairStatus: order.hairStatus || 'PENDING',
      createdAt: typeof order.createdAt === 'number' ? order.createdAt : Date.now(),
      updatedAt: Date.now()
    };

    const sanitizedPayload = JSON.parse(JSON.stringify(orderPayload));
    await setDoc(orderRef, sanitizedPayload, { merge: true });
    console.log('Order successfully synced to Firestore:', orderId);
  } catch (error) {
    console.error("Firestore Place Order Error:", error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateOrderStatusInFirebase(
  orderId: string, 
  data: Partial<WholesaleOrder>
): Promise<void> {
  const path = `${COLLECTIONS.ORDERS}/${orderId}`;
  try {
    const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
    await updateDoc(orderRef, {
      ...data,
      updatedAt: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteOrderFromFirebase(orderId: string): Promise<void> {
  const path = `${COLLECTIONS.ORDERS}/${orderId}`;
  try {
    const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
    await deleteDoc(orderRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncCommunityPostToFirebase(post: CommunityPost): Promise<void> {
  const postId = post.postId || post.id || `post-${Date.now()}`;
  const path = `${COLLECTIONS.COMMUNITY_POSTS}/${postId}`;

  let cleanImageUrl = post.imageUrl || '';
  if (cleanImageUrl.startsWith('data:') || cleanImageUrl.startsWith('blob:')) {
    try {
      cleanImageUrl = await uploadMediaToStorage(cleanImageUrl, 'communication', 'community_post');
    } catch {
      cleanImageUrl = '';
    }
  }

  const postPayload = {
    postId,
    id: postId,
    customerId: post.customerId || post.customerCode || 'CUST-GENERAL',
    customerCode: post.customerCode || post.customerId || 'CUST-GENERAL',
    shopName: post.shopName || 'Wholesale Buyer',
    imageUrl: cleanImageUrl,
    image: cleanImageUrl,
    caption: post.caption || '',
    text: post.caption || '',
    message: post.caption || '',
    likesCount: Number(post.likesCount) || 0,
    likedBy: post.likedBy || [],
    timestamp: serverTimestamp(),
    createdAt: Date.now()
  };

  try {
    const postRef = doc(db, COLLECTIONS.COMMUNITY_POSTS, postId);
    await setDoc(postRef, postPayload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function likeCommunityPostInFirebase(postId: string, customerId: string, isCurrentlyLiked: boolean): Promise<void> {
  const path = `${COLLECTIONS.COMMUNITY_POSTS}/${postId}`;
  try {
    const postRef = doc(db, COLLECTIONS.COMMUNITY_POSTS, postId);
    if (isCurrentlyLiked) {
      await updateDoc(postRef, {
        likesCount: increment(-1),
        likedBy: arrayRemove(customerId)
      });
    } else {
      await updateDoc(postRef, {
        likesCount: increment(1),
        likedBy: arrayUnion(customerId)
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCommunityPostFromFirebase(postId: string): Promise<void> {
  const path = `${COLLECTIONS.COMMUNITY_POSTS}/${postId}`;
  try {
    const postRef = doc(db, COLLECTIONS.COMMUNITY_POSTS, postId);
    await deleteDoc(postRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncMessageToFirebase(message: ChatMessage): Promise<void> {
  const msgId = message.messageId || message.id || `msg-${Date.now()}`;
  const customerId = message.customerId || message.customerCode || 'CUST-GENERAL';
  const shopName = message.shopName || '';
  const sender = message.sender || 'customer';
  const type = message.type || (message.audioUri ? 'voice' : message.imageUri ? 'image' : 'text');
  let mediaUrl = message.mediaUrl || message.imageUri || message.audioUri || '';

  // Direct Cloud Storage upload pipeline - Never save raw Base64 or local blob strings to Firestore
  if (mediaUrl && (mediaUrl.startsWith('data:') || mediaUrl.startsWith('blob:'))) {
    try {
      const folder: MediaFolder = type === 'voice' ? 'voice_notes' : 'communication';
      const prefix = type === 'voice' ? 'chat_voice' : 'chat_image';
      mediaUrl = await uploadMediaToStorage(mediaUrl, folder, prefix, 30000);
    } catch (uploadErr) {
      console.error('[ChatImage] upload failed:', uploadErr);
      mediaUrl = '';
    }
  }

  const payload: any = {
    id: msgId,
    messageId: msgId,
    customerId,
    customerCode: customerId,
    shopName,
    sender,
    type,
    text: message.text || '',
    message: message.text || '',
    mediaUrl: mediaUrl || null,
    imageUri: type === 'image' ? (mediaUrl || null) : (message.imageUri && !message.imageUri.startsWith('data:') ? message.imageUri : null),
    imageUrl: type === 'image' ? (mediaUrl || null) : (message.imageUri && !message.imageUri.startsWith('data:') ? message.imageUri : null),
    audioUri: type === 'voice' ? (mediaUrl || null) : (message.audioUri && !message.audioUri.startsWith('data:') ? message.audioUri : null),
    audioUrl: type === 'voice' ? (mediaUrl || null) : (message.audioUri && !message.audioUri.startsWith('data:') ? message.audioUri : null),
    isRead: message.isRead ?? false,
    read: message.isRead ?? false,
    timestamp: serverTimestamp(),
    createdAt: Date.now()
  };

  const path = `${COLLECTIONS.MESSAGES}/${msgId}`;

  try {
    // 1. Primary write to 'chat_messages'
    const msgRef = doc(db, COLLECTIONS.MESSAGES, msgId);
    await setDoc(msgRef, payload, { merge: true });

    // 2. Also write to 'conversations/{customerId}/messages/{msgId}' subcollection
    try {
      const convMsgRef = doc(db, COLLECTIONS.CONVERSATIONS, customerId, 'messages', msgId);
      await setDoc(convMsgRef, payload, { merge: true });
    } catch (subErr) {
      console.warn('Subcollection conversation write skipped:', subErr);
    }

    // 3. Mirror to 'messages' collection for backward compatibility
    try {
      const altMsgRef = doc(db, 'messages', msgId);
      await setDoc(altMsgRef, payload, { merge: true });
    } catch {
      // Ignored if alternate collection is not present
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function markCustomerMessagesAsReadInFirebase(customerId: string): Promise<void> {
  if (!customerId) return;
  try {
    // 1. In 'chat_messages' collection
    const messagesCol = collection(db, COLLECTIONS.MESSAGES);
    const q = query(
      messagesCol, 
      where('customerId', '==', customerId),
      where('sender', '==', 'admin'),
      where('isRead', '==', false)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.forEach((d) => {
        batch.update(d.ref, { isRead: true, read: true });
      });
      await batch.commit();
    }

    // 2. In subcollection 'conversations/{customerId}/messages'
    try {
      const subCol = collection(db, COLLECTIONS.CONVERSATIONS, customerId, 'messages');
      const subQ = query(subCol, where('sender', '==', 'admin'), where('isRead', '==', false));
      const subSnap = await getDocs(subQ);
      if (!subSnap.empty) {
        const subBatch = writeBatch(db);
        subSnap.forEach((d) => {
          subBatch.update(d.ref, { isRead: true, read: true });
        });
        await subBatch.commit();
      }
    } catch {}

    // 3. In legacy 'messages' collection
    try {
      const altCol = collection(db, 'messages');
      const altQ = query(altCol, where('customerId', '==', customerId), where('sender', '==', 'admin'), where('isRead', '==', false));
      const altSnap = await getDocs(altQ);
      if (!altSnap.empty) {
        const altBatch = writeBatch(db);
        altSnap.forEach((d) => {
          altBatch.update(d.ref, { isRead: true, read: true });
        });
        await altBatch.commit();
      }
    } catch {}
  } catch (error) {
    console.warn('markCustomerMessagesAsReadInFirebase error:', error);
  }
}

export async function deleteMessageFromFirebase(messageId: string, customerId?: string): Promise<void> {
  const path = `${COLLECTIONS.MESSAGES}/${messageId}`;
  try {
    const msgRef = doc(db, COLLECTIONS.MESSAGES, messageId);
    await deleteDoc(msgRef);

    if (customerId) {
      try {
        const convMsgRef = doc(db, COLLECTIONS.CONVERSATIONS, customerId, 'messages', messageId);
        await deleteDoc(convMsgRef);
      } catch {}
    }

    try {
      const altMsgRef = doc(db, 'messages', messageId);
      await deleteDoc(altMsgRef);
    } catch {}
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/* ==========================================================================
   DATABASE MAINTENANCE & CLEAN SCANNER (TASK 4)
   ========================================================================== */

export interface DatabaseScanResult {
  orphanedOrders: Array<{
    id: string;
    orderNumber?: string;
    customerId: string;
    customerCode?: string;
    shopName: string;
    totalAmount?: number;
    createdAt?: number;
    docRef: any;
  }>;
  abandonedCarts: Array<{
    id: string;
    collectionName: string;
    customerId?: string;
    itemsCount: number;
    updatedAt?: number;
    reason: string;
    docRef: any;
  }>;
  invalidPhotos: Array<{
    id: string;
    photoCode?: string;
    collectionName: string;
    reason: string;
    docRef: any;
  }>;
  totalFound: number;
  scannedAt: number;
}

export async function scanDatabaseForOrphansAndStaleData(): Promise<DatabaseScanResult> {
  const result: DatabaseScanResult = {
    orphanedOrders: [],
    abandonedCarts: [],
    invalidPhotos: [],
    totalFound: 0,
    scannedAt: Date.now()
  };

  try {
    // 1. Gather all valid customer IDs & Codes
    const validCustomers = new Set<string>();
    const custSnap = await getDocs(collection(db, COLLECTIONS.CUSTOMERS));
    custSnap.forEach(d => {
      validCustomers.add(d.id);
      const data = d.data();
      if (data.customerId) validCustomers.add(data.customerId);
      if (data.customerCode) validCustomers.add(data.customerCode);
    });

    // 2. Scan Orders for orphaned orders
    const orderSnap = await getDocs(collection(db, COLLECTIONS.ORDERS));
    orderSnap.forEach(d => {
      const data = d.data();
      const cId = data.customerId || '';
      const cCode = data.customerCode || '';
      // If neither customerId nor customerCode matches any registered customer in customers collection
      const isOrphan = (cId && !validCustomers.has(cId)) || (!cId && !cCode) || (cCode && !validCustomers.has(cCode));
      if (isOrphan) {
        result.orphanedOrders.push({
          id: d.id,
          orderNumber: data.orderId || d.id,
          customerId: cId,
          customerCode: cCode,
          shopName: data.shopName || 'Unknown Shop',
          totalAmount: data.totalAmount || 0,
          createdAt: typeof data.createdAt === 'number' ? data.createdAt : undefined,
          docRef: d.ref
        });
      }
    });

    // 3. Scan Carts ('carts', 'cart') for empty or stale (>24h old)
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    for (const colName of ['carts', 'cart']) {
      try {
        const cartSnap = await getDocs(collection(db, colName));
        cartSnap.forEach(d => {
          const data = d.data();
          const items = data.items || [];
          const itemsCount = Array.isArray(items) ? items.length : 0;
          const updated = data.updatedAt || data.createdAt || 0;
          
          if (itemsCount === 0) {
            result.abandonedCarts.push({
              id: d.id,
              collectionName: colName,
              customerId: data.customerId || d.id,
              itemsCount: 0,
              updatedAt: updated,
              reason: 'Empty Cart',
              docRef: d.ref
            });
          } else if (updated > 0 && updated < twentyFourHoursAgo) {
            result.abandonedCarts.push({
              id: d.id,
              collectionName: colName,
              customerId: data.customerId || d.id,
              itemsCount,
              updatedAt: updated,
              reason: 'Abandoned Cart (>24h old)',
              docRef: d.ref
            });
          }
        });
      } catch {}
    }

    // 4. Scan Photos ('photos', 'catalog_photos') for broken or corrupted records
    for (const colName of [COLLECTIONS.PHOTOS, COLLECTIONS.CATALOG_PHOTOS]) {
      try {
        const photoSnap = await getDocs(collection(db, colName));
        photoSnap.forEach(d => {
          const data = d.data();
          const img = data.imageUri || data.imageUrl || '';
          const code = data.photoCode || '';

          if (!img || typeof img !== 'string' || img.trim() === '') {
            result.invalidPhotos.push({
              id: d.id,
              photoCode: code || 'UNKNOWN',
              collectionName: colName,
              reason: 'Missing Image URL',
              docRef: d.ref
            });
          } else if (!code || typeof code !== 'string' || code.trim() === '') {
            result.invalidPhotos.push({
              id: d.id,
              photoCode: 'BLANK_SKU',
              collectionName: colName,
              reason: 'Missing Product SKU',
              docRef: d.ref
            });
          }
        });
      } catch {}
    }

    result.totalFound = result.orphanedOrders.length + result.abandonedCarts.length + result.invalidPhotos.length;
    return result;
  } catch (error) {
    console.error('scanDatabaseForOrphansAndStaleData error:', error);
    throw error;
  }
}

export async function executeDatabaseCleanup(scanResult: DatabaseScanResult): Promise<{
  cleanedOrders: number;
  cleanedCarts: number;
  cleanedPhotos: number;
}> {
  const allRefs: any[] = [];
  let cleanedOrders = 0;
  let cleanedCarts = 0;
  let cleanedPhotos = 0;

  scanResult.orphanedOrders.forEach(o => {
    if (o.docRef) { allRefs.push(o.docRef); cleanedOrders++; }
  });
  scanResult.abandonedCarts.forEach(c => {
    if (c.docRef) { allRefs.push(c.docRef); cleanedCarts++; }
  });
  scanResult.invalidPhotos.forEach(p => {
    if (p.docRef) { allRefs.push(p.docRef); cleanedPhotos++; }
  });

  const uniqueMap = new Map<string, any>();
  allRefs.forEach(r => {
    if (r && r.path) uniqueMap.set(r.path, r);
  });

  const refsArray = Array.from(uniqueMap.values());
  const batchSize = 400;
  for (let i = 0; i < refsArray.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = refsArray.slice(i, i + batchSize);
    chunk.forEach(r => batch.delete(r));
    await batch.commit();
  }

  return { cleanedOrders, cleanedCarts, cleanedPhotos };
}

