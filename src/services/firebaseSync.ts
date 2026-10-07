import { 
  collection, 
  doc, 
  setDoc as firestoreSetDoc, 
  updateDoc as firestoreUpdateDoc,
  onSnapshot, 
  deleteDoc as firestoreDeleteDoc, 
  query,
  where,
  limit,
  getDocs,
  getDoc,
  writeBatch,
  serverTimestamp,
  Unsubscribe 
} from 'firebase/firestore';
import { db, testFirebaseConnection, auth } from '../firebase';
import { useAppStore } from '../store';
import { WholesaleOrder, CategoryItem, SubCategory, Customer, ChatMessage, CatalogPhoto, ShowroomVideo, CommunityPost } from '../types';
import { parseOrderTimestamp, resolveItemImage } from '../utils';

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
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as any;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanUndefined(value);
      }
    }
    return cleaned;
  }
  return obj;
}

function setDoc(reference: any, data: any, options?: any) {
  const cleanedData = cleanUndefined(data);
  return firestoreSetDoc(reference, cleanedData, options);
}

function updateDoc(reference: any, data: any) {
  const cleanedData = cleanUndefined(data);
  return firestoreUpdateDoc(reference, cleanedData);
}

function deleteDoc(reference: any) {
  return firestoreDeleteDoc(reference);
}

let unsubOrders: Unsubscribe | null = null;
let unsubCategories: Unsubscribe | null = null;
let unsubSubCategories: Unsubscribe | null = null;
let unsubCustomers: Unsubscribe | null = null;
let unsubChat: Unsubscribe | null = null;
let unsubPhotos: Unsubscribe | null = null;
let unsubVideos: Unsubscribe | null = null;
let unsubCommunity: Unsubscribe | null = null;

let isSyncInitialized = false;

/**
 * Initialize bidirectional sync between Firebase Firestore and the App Store.
 */
export function initFirebaseSync() {
  if (isSyncInitialized) return;
  isSyncInitialized = true;

  const store = useAppStore.getState();
  store.setFirebaseSyncing(true);

  // 1. Test connection
  testFirebaseConnection().then(connected => {
    useAppStore.getState().setFirebaseConnected(connected);
  }).catch(() => {
    useAppStore.getState().setFirebaseConnected(false);
  });

  try {
    // 2. Real-time Orders listener from raw collection 'orders' cleanly
    const ordersQuery = query(collection(db, 'orders'));

    const processOrdersSnapshot = (snapshot: any) => {
      if (snapshot.metadata && snapshot.metadata.fromCache) {
        console.log("Ignoring cached Orders snapshot");
        return;
      }
      console.log("Firestore Orders Snapshot Count (firebaseSync):", snapshot.docs.length);
      if (snapshot.docs.length > 0) {
        const firestoreOrders: WholesaleOrder[] = snapshot.docs.map((docSnap: any) => {
          const data = docSnap.data() as any;
          let rawItems: any[] = [];
          if (Array.isArray(data.items)) {
            rawItems = data.items;
          } else if (Array.isArray(data.products)) {
            rawItems = data.products;
          } else if (Array.isArray(data.orderItems)) {
            rawItems = data.orderItems;
          } else if (data.items && typeof data.items === 'object') {
            rawItems = Object.values(data.items);
          } else if (data.item && typeof data.item === 'object') {
            rawItems = [data.item];
          }

          const normalizedItems = rawItems.map((it: any) => {
            if (!it || typeof it !== 'object') {
              return {
                photoCode: String(it || 'ITEM'),
                optionLetter: 'A',
                quantity: 1,
                imageUri: '',
                imageUrl: '',
                image: ''
              };
            }
            const img = resolveItemImage(it);
            return {
              ...it,
              photoCode: it.photoCode || it.code || it.name || it.title || 'Item',
              optionLetter: it.optionLetter || it.option || 'A',
              quantity: Number(it.quantity || it.qty || 1),
              imageUri: img || it.imageUri || it.imageUrl || it.image || '',
              imageUrl: img || it.imageUrl || it.imageUri || it.image || '',
              image: img || it.image || it.imageUri || it.imageUrl || ''
            };
          });

          return {
            id: docSnap.id,
            ...data,
            items: normalizedItems,
            shopName: data.shopName || data.customerName || data.buyerName || 'Direct Customer',
            notes: data.notes || data.orderNote || '',
            orderNote: data.orderNote || data.notes || '',
            voiceNoteUrl: data.voiceNoteUrl || data.voiceNote || undefined,
            voiceNote: data.voiceNote || data.voiceNoteUrl || undefined,
            overallStatus: data.overallStatus || data.status || 'PENDING',
            createdAt: parseOrderTimestamp(data.createdAt) || Date.now()
          } as WholesaleOrder;
        });

        console.log("Fetched Orders Data (firebaseSync):", firestoreOrders);
        // Client-side sorting: newest first reliably
        firestoreOrders.sort((a, b) => (Number(b.createdAt || 0) - Number(a.createdAt || 0)));
        useAppStore.getState().setOrders(firestoreOrders);
        useAppStore.getState().setOrdersLoaded(true);
        autoComputeAndSyncBestSellers(firestoreOrders, useAppStore.getState().photos);
      } else {
        useAppStore.getState().setOrders([]);
        useAppStore.getState().setOrdersLoaded(true);
      }
      useAppStore.getState().setFirebaseConnected(true);
      useAppStore.getState().setFirebaseSyncing(false);
    };

    unsubOrders = onSnapshot(ordersQuery, processOrdersSnapshot, (error) => {
      console.warn("Firestore Orders Listener Notice (firebaseSync):", error);
      useAppStore.getState().setOrdersLoaded(true);
      useAppStore.getState().setFirebaseSyncing(false);
    });

    // 3. Real-time Categories listener from Firebase
    const categoriesCol = collection(db, 'categories');
    unsubCategories = onSnapshot(categoriesCol, (snapshot) => {
      if (snapshot.metadata && snapshot.metadata.fromCache) return;
      if (!snapshot.empty) {
        const firestoreCategories: CategoryItem[] = [];
        snapshot.forEach((docSnap) => {
          firestoreCategories.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        firestoreCategories.sort((a, b) => {
          const orderA = a.orderIndex !== undefined ? a.orderIndex : (a.sortOrder || 0);
          const orderB = b.orderIndex !== undefined ? b.orderIndex : (b.sortOrder || 0);
          return orderA - orderB;
        });
        useAppStore.getState().setCategories(firestoreCategories);
      } else {
        useAppStore.getState().setCategories([]);
      }
      useAppStore.getState().setCatalogDataLoaded(true);
    }, (error) => {
      console.warn('Firebase categories snapshot notice:', error);
      useAppStore.getState().setCatalogDataLoaded(true);
    });

    // 4. Real-time SubCategories listener
    const subCategoriesCol = collection(db, 'subCategories');
    unsubSubCategories = onSnapshot(subCategoriesCol, (snapshot) => {
      if (snapshot.metadata && snapshot.metadata.fromCache) return;
      if (!snapshot.empty) {
        const firestoreSubCats: SubCategory[] = [];
        snapshot.forEach((docSnap) => {
          firestoreSubCats.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        firestoreSubCats.sort((a, b) => {
          const orderA = a.orderIndex !== undefined ? a.orderIndex : (a.sortOrder || 0);
          const orderB = b.orderIndex !== undefined ? b.orderIndex : (b.sortOrder || 0);
          return orderA - orderB;
        });
        useAppStore.getState().setSubCategories(firestoreSubCats);
      } else {
        useAppStore.getState().setSubCategories([]);
      }
    }, (error) => {
      console.warn('Firebase subcategories snapshot notice:', error);
    });

    // 5. Real-time Customers listener
    const customersCol = collection(db, 'customers');
    unsubCustomers = onSnapshot(customersCol, (snapshot) => {
      if (snapshot.metadata && snapshot.metadata.fromCache) return;
      if (!snapshot.empty) {
        const firestoreCustomers: Customer[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          const customerCode = data.customerCode || docSnap.id;
          const status = data.status || (data.isVerified ? 'Verified' : 'Pending');
          const lastActiveVal = typeof data.lastActive === 'object' && data.lastActive?.seconds 
            ? data.lastActive.seconds * 1000 
            : (typeof data.lastActive === 'number' ? data.lastActive : undefined);
            
          firestoreCustomers.push({
            id: docSnap.id,
            customerCode,
            shopName: data.shopName || data.name || data.businessName || 'Unnamed Shop',
            contactPerson: data.contactPerson || data.name || '',
            mobileNumber: data.mobileNumber || data.phone || data.mobile || '',
            cityName: data.cityName || data.city || '',
            address: data.address || '',
            pin: data.pin || '1111',
            status: status as 'Verified' | 'Pending',
            isVerified: status === 'Verified' || data.isVerified === true,
            role: data.role || 'User',
            staffCategory: data.staffCategory || '',
            allowedCategories: Array.isArray(data.allowedCategories) ? data.allowedCategories : [],
            allowedSubCategories: Array.isArray(data.allowedSubCategories) ? data.allowedSubCategories : [],
            fcmToken: data.fcmToken || data.token,
            isOnline: Boolean(data.isOnline),
            lastActive: lastActiveVal,
            location: data.location,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            visitingCardUrl: data.visitingCardUrl || undefined
          } as Customer);
        });
        useAppStore.getState().setCustomers(firestoreCustomers);
        useAppStore.getState().setCustomersLoaded(true);
      } else {
        useAppStore.getState().setCustomers([]);
        useAppStore.getState().setCustomersLoaded(true);
      }
    }, (error) => {
      console.warn('Firebase customers snapshot notice:', error);
      useAppStore.getState().setCustomersLoaded(true);
    });

    // 6. Real-time Chat Messages listener (Two-way between App and Dashboard)
    const chatCol = collection(db, 'chat_messages');
    unsubChat = onSnapshot(chatCol, (snapshot) => {
      if (!snapshot.empty) {
        const firestoreMsgs: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          const code = data.customerCode || data.customerId || 'UNKNOWN';
          const senderRaw = String(data.sender || 'CUSTOMER').toUpperCase();
          const senderNorm: 'CUSTOMER' | 'ADMIN' = senderRaw.includes('ADMIN') ? 'ADMIN' : 'CUSTOMER';
          
          // FIX 1 — Audio-assignment collision fix (type-aware extraction)
          const typeRaw = String(data.type || '').toUpperCase();
          const mediaUrl = data.mediaUrl || '';
          const isAudioLike = /\.(webm|mp3|ogg|m4a|wav)(\?|$)/i.test(mediaUrl) || 
                              mediaUrl.includes('voice') || mediaUrl.startsWith('data:audio');
          const img = data.imageUri || data.imageUrl || data.image || 
                      (!isAudioLike ? mediaUrl : '');
          const audio = data.audioUri || data.audioUrl || data.voiceNoteUrl || 
                        (isAudioLike ? mediaUrl : '');

          let typeNorm: 'TEXT' | 'IMAGE' | 'VOICE' = 'TEXT';
          if (typeRaw === 'IMAGE') {
            typeNorm = 'IMAGE';
          } else if (typeRaw === 'VOICE') {
            typeNorm = 'VOICE';
          } else if (img && !audio) {
            typeNorm = 'IMAGE';
          } else if (audio && !img) {
            typeNorm = 'VOICE';
          }

          const textVal = data.text || (typeNorm === 'TEXT' ? data.content : '') || '';
          const resolvedContent = textVal || img || audio || data.content || '';

          firestoreMsgs.push({
            id: docSnap.id,
            ...data,
            customerCode: code,
            customerId: data.customerId || code,
            sender: senderNorm,
            type: typeNorm,
            content: resolvedContent,
            text: textVal,
            mediaUrl: img || audio || data.mediaUrl || '',
            imageUrl: img || data.imageUrl || '',
            imageUri: img || data.imageUri || '',
            image: img || data.image || '',
            voiceNoteUrl: audio || data.voiceNoteUrl || '',
            audioUrl: audio || data.audioUrl || '',
            audioUri: audio || data.audioUri || '',
            isRead: data.isRead === true,
            timestamp: typeof data.timestamp === 'number' ? data.timestamp : (data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now()),
            isBroadcast: data.isBroadcast === true
          });
        });
        firestoreMsgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        useAppStore.getState().setChatMessages(firestoreMsgs);
        useAppStore.getState().setChatLoaded(true);
      } else {
        useAppStore.getState().setChatMessages([]);
        useAppStore.getState().setChatLoaded(true);
      }
    }, (error) => {
      console.warn('Firebase chat snapshot notice:', error);
      useAppStore.getState().setChatLoaded(true);
    });

    // 7. Real-time Community Posts listener with limit(50)
    const communityCol = collection(db, 'community_posts');
    const communityQuery = query(communityCol, limit(50));
    unsubCommunity = onSnapshot(communityQuery, (snapshot) => {
      if (snapshot.metadata && snapshot.metadata.fromCache) return;
      if (!snapshot.empty) {
        const firestorePosts: CommunityPost[] = [];
        snapshot.forEach((docSnap) => {
          const pData = docSnap.data() as any;
          firestorePosts.push({
            id: docSnap.id,
            ...pData,
            shopName: pData.shopName || 'Customer Shop',
            timestamp: pData.timestamp || Date.now()
          });
        });
        firestorePosts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        useAppStore.getState().setCommunityPosts(firestorePosts);
      } else {
        useAppStore.getState().setCommunityPosts([]);
      }
    }, (error) => {
      console.warn('Firebase community_posts snapshot notice:', error);
    });

    // 8. Real-time Products listener from collection 'products' with limit(50)
    const productsCol = collection(db, 'products');
    const productsQuery = query(productsCol, limit(50));
    const processProductsSnapshot = (snapshot: any) => {
      if (snapshot.metadata && snapshot.metadata.fromCache) return;
      if (!snapshot.empty) {
        const firestoreProducts: CatalogPhoto[] = [];
        snapshot.forEach((docSnap: any) => {
          const data = docSnap.data() as any;
          const isHiddenVal = data.isHidden === true || data.status === 'hidden' || data.isVisible === false;
          const codeVal = (data.code || data.photoCode || data.title || data.name || '').trim();
          const imgVal = data.imageUrl || data.thumbnailUrl || data.imageUri || '';
          const vidVal = data.videoUrl || data.videoUri || '';
          const subIdVal = data.subcategoryId || data.subCategoryId || '';
          const minQtyVal = typeof data.minQty === 'number' ? data.minQty : (typeof data.defaultQuantity === 'number' ? data.defaultQuantity : 1);
          const variantsList = Array.isArray(data.variants) ? data.variants : [];

          firestoreProducts.push({
            id: docSnap.id,
            ...data,
            photoCode: codeVal,
            code: codeVal,
            title: codeVal,
            name: codeVal,
            categoryId: data.categoryId || '',
            subCategoryId: subIdVal,
            subcategoryId: subIdVal,
            subCategoryName: data.subCategoryName || 'General',
            imageUri: imgVal,
            imageUrl: imgVal,
            thumbnailUrl: imgVal,
            videoUri: vidVal,
            videoUrl: vidVal,
            variants: variantsList,
            customLabels: data.customLabels || variantsList.map((v: any) => v.label || v.letter || ''),
            defaultQuantity: minQtyVal,
            minQty: minQtyVal,
            itemCount: variantsList.length,
            sortOrder: data.orderIndex !== undefined ? data.orderIndex : (data.sortOrder || 0),
            orderIndex: data.orderIndex !== undefined ? data.orderIndex : (data.sortOrder || 0),
            isHidden: isHiddenVal,
            isVisible: !isHiddenVal,
            status: isHiddenVal ? 'hidden' : 'active',
            description: data.description || ''
          });
        });

        firestoreProducts.sort((a, b) => {
          const orderA = a.orderIndex !== undefined ? a.orderIndex : (a.sortOrder || 0);
          const orderB = b.orderIndex !== undefined ? b.orderIndex : (b.sortOrder || 0);
          return orderA - orderB;
        });

        useAppStore.getState().setPhotos(firestoreProducts);
        autoComputeAndSyncBestSellers(useAppStore.getState().orders, firestoreProducts);
      } else {
        useAppStore.getState().setPhotos([]);
      }
    };

    unsubPhotos = onSnapshot(productsQuery, processProductsSnapshot, (error) => {
      console.warn('Firebase products snapshot notice:', error);
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    // 9. Real-time Videos listener with limit(50)
    const videosCol = collection(db, 'showroomVideos');
    const videosQuery = query(videosCol, limit(50));
    unsubVideos = onSnapshot(videosQuery, (snapshot) => {
      if (snapshot.metadata && snapshot.metadata.fromCache) return;
      if (!snapshot.empty) {
        const firestoreVideos: ShowroomVideo[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          firestoreVideos.push({
            id: docSnap.id,
            title: data.title || '',
            videoUri: data.videoUri || data.videoUrl || '',
            videoUrl: data.videoUrl || data.videoUri || '',
            thumbnailUri: data.imageUri || data.posterUrl || '',
            imageUri: data.imageUri || data.posterUrl || '',
            posterUrl: data.posterUrl || data.imageUri || '',
            quantity: typeof data.quantity === 'number' ? data.quantity : parseInt(data.orderQuantity || '0'),
            orderQuantity: data.quantity !== undefined ? String(data.quantity) : (data.orderQuantity || '0'),
            sortOrder: data.sortOrder || 0,
            fileSizeMb: data.fileSizeMb || 0,
            uploadedAt: data.uploadedAt || (data.createdAt?.seconds ? data.createdAt.seconds * 1000 : (typeof data.createdAt === 'number' ? data.createdAt : Date.now())),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          });
        });
        firestoreVideos.sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0));
        useAppStore.getState().setShowroomVideos(firestoreVideos);
      } else {
        useAppStore.getState().setShowroomVideos([]);
      }
      useAppStore.getState().setVideosLoaded(true);
    }, (error) => {
      console.warn('Firebase showroomVideos snapshot notice:', error);
      useAppStore.getState().setVideosLoaded(true);
    });

  } catch (err) {
    console.error('Error attaching Firebase listeners:', err);
    useAppStore.getState().setFirebaseSyncing(false);
  }
}

/**
 * Stop all listeners
 */
export function cleanupFirebaseSync() {
  if (unsubOrders) unsubOrders();
  if (unsubCategories) unsubCategories();
  if (unsubSubCategories) unsubSubCategories();
  if (unsubCustomers) unsubCustomers();
  if (unsubChat) unsubChat();
  if (unsubCommunity) unsubCommunity();
  if (unsubPhotos) unsubPhotos();
  if (unsubVideos) unsubVideos();
  isSyncInitialized = false;
}

// -------------------------------------------------------------
// FIRESTORE MUTATION HELPERS
// -------------------------------------------------------------

export async function syncCommunityPostToFirebase(post: CommunityPost) {
  try {
    const docRef = doc(db, 'community_posts', post.id);
    await setDoc(docRef, post, { merge: true });
  } catch (err) {
    console.error('Failed to sync community post to Firebase:', err);
  }
}

export async function deleteCommunityPostFromFirebase(postId: string) {
  try {
    const docRef = doc(db, 'community_posts', postId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Failed to delete community post from Firebase:', err);
  }
}

export async function syncChatMessageToFirebase(msg: ChatMessage) {
  try {
    const docRef = doc(db, 'chat_messages', msg.id);
    const targetCode = msg.customerCode || msg.customerId || 'UNKNOWN';
    const payload = {
      id: msg.id,
      customerId: targetCode,
      customerCode: targetCode,
      sender: 'admin',
      type: (msg.type || 'TEXT').toLowerCase(),
      text: msg.text || msg.content || '',
      content: msg.content || msg.text || '',
      mediaUrl: msg.mediaUrl || msg.imageUrl || msg.voiceNoteUrl || '',
      imageUrl: msg.imageUrl || '',
      voiceNoteUrl: msg.voiceNoteUrl || '',
      isRead: false,
      timestamp: msg.timestamp || Date.now(),
      isBroadcast: msg.isBroadcast === true
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.error('Failed to sync chat message to Firebase:', err);
  }
}

export async function markMessagesAsReadInFirebase(customerCode: string) {
  try {
    const msgs = useAppStore.getState().chatMessages;
    for (const m of msgs) {
      if ((m.customerCode === customerCode || m.customerId === customerCode) && 
          (m.sender === 'CUSTOMER' || (m.sender as string) === 'customer') && 
          !m.isRead) {
        await setDoc(doc(db, 'chat_messages', m.id), { isRead: true }, { merge: true });
      }
    }
  } catch (err) {
    console.error('Failed to mark messages read in Firebase:', err);
  }
}

export async function sendBroadcastMessageToFirebase(broadcastData: {
  title?: string;
  text: string;
  imageUrl?: string;
  voiceNoteUrl?: string;
  type: 'TEXT' | 'IMAGE' | 'VOICE';
}) {
  try {
    const timestamp = Date.now();
    const broadcastId = `bcast-${timestamp}-${Math.floor(Math.random() * 1000)}`;
    
    // 1. Save to broadcast_messages
    const broadcastDocRef = doc(db, 'broadcast_messages', broadcastId);
    await setDoc(broadcastDocRef, {
      id: broadcastId,
      title: broadcastData.title || 'Store Announcement',
      text: broadcastData.text,
      type: broadcastData.type.toLowerCase(),
      mediaUrl: broadcastData.imageUrl || broadcastData.voiceNoteUrl || '',
      imageUrl: broadcastData.imageUrl || '',
      voiceNoteUrl: broadcastData.voiceNoteUrl || '',
      timestamp,
      sender: 'admin',
      targetAudience: 'ALL_CUSTOMERS'
    }, { merge: true });

    // 2. Save as Announcement in community_posts
    const communityDocRef = doc(db, 'community_posts', broadcastId);
    await setDoc(communityDocRef, {
      id: broadcastId,
      shopName: 'SHIVAM WHOLESALE HQ',
      authorName: 'Admin Broadcast',
      text: broadcastData.text,
      caption: broadcastData.text,
      imageUrl: broadcastData.imageUrl || '',
      voiceNoteUrl: broadcastData.voiceNoteUrl || '',
      timestamp,
      type: 'ADMIN_ANNOUNCEMENT',
      isAnnouncement: true
    }, { merge: true });

    // 3. Write to every registered customer's chat thread in chat_messages so it appears on their phone
    const store = useAppStore.getState();
    const registeredCustomers = store.customers || [];
    const knownCustomerCodes = new Set<string>();
    registeredCustomers.forEach(c => knownCustomerCodes.add(c.customerCode));
    store.orders.forEach(o => { if (o.customerCode) knownCustomerCodes.add(o.customerCode); });
    store.chatMessages.forEach(m => { if (m.customerCode) knownCustomerCodes.add(m.customerCode); });

    const customerList = Array.from(knownCustomerCodes);
    for (const code of customerList) {
      const msgId = `bmsg-${code}-${timestamp}`;
      const msgDocRef = doc(db, 'chat_messages', msgId);
      const bcastMsg: ChatMessage = {
        id: msgId,
        customerCode: code,
        customerId: code,
        sender: 'ADMIN',
        type: broadcastData.type,
        text: broadcastData.text,
        content: broadcastData.text || broadcastData.imageUrl || broadcastData.voiceNoteUrl || '',
        mediaUrl: broadcastData.imageUrl || broadcastData.voiceNoteUrl || '',
        imageUrl: broadcastData.imageUrl || '',
        voiceNoteUrl: broadcastData.voiceNoteUrl || '',
        isRead: false,
        isBroadcast: true,
        timestamp
      };
      
      await setDoc(msgDocRef, {
        id: msgId,
        customerId: code,
        customerCode: code,
        sender: 'admin',
        type: broadcastData.type.toLowerCase(),
        text: broadcastData.text,
        content: broadcastData.text || broadcastData.imageUrl || broadcastData.voiceNoteUrl || '',
        mediaUrl: broadcastData.imageUrl || broadcastData.voiceNoteUrl || '',
        imageUrl: broadcastData.imageUrl || '',
        voiceNoteUrl: broadcastData.voiceNoteUrl || '',
        isRead: false,
        isBroadcast: true,
        timestamp
      }, { merge: true });

      // Update local store state
      useAppStore.setState(prev => ({
        chatMessages: [...prev.chatMessages, bcastMsg]
      }));
    }

    return broadcastId;
  } catch (err) {
    console.error('Failed to send broadcast message to Firebase:', err);
    throw err;
  }
}

export async function syncOrderToFirebase(order: WholesaleOrder) {
  try {
    const docRef = doc(db, 'orders', order.id);

    // Map existing items to match the requested items schema exactly with image fallback
    const enhancedItems = (order.items || []).map(item => {
      let catName = item.categoryId;
      if (item.categoryId === 'imitation') catName = 'IMITATION';
      if (item.categoryId === 'cosmetics') catName = 'COSMETIC';
      if (item.categoryId === 'hair_accessories') catName = 'HAIR ACCESSORIES';
      
      const imgVal = resolveItemImage(item) || item.imageUri || item.imageUrl || item.image || '';

      return {
        ...item,
        id: item.id || item.photoId || `item-${Math.random()}`,
        photoCode: item.photoCode || 'ITEM',
        name: item.name || item.subCategoryName || 'Wholesale Product',
        category: item.category || catName || 'UNKNOWN',
        quantity: item.quantity || 1,
        variant: item.variant || item.customLabel || item.optionLetter || 'STANDARD',
        price: item.price || 0,
        imageUri: imgVal,
        imageUrl: imgVal,
        image: imgVal
      };
    });

    const notesVal = order.notes || order.orderNote || 'No Note';
    const voiceVal = order.voiceNoteUrl || order.voiceNote || undefined;

    // Populate departmentStatus based on individual department packing statuses
    const imitationStatusVal = order.imitationStatus === 'DONE' ? 'Done' : 'Pending';
    const cosmeticsStatusVal = order.cosmeticsStatus === 'DONE' ? 'Done' : 'Pending';
    const hairStatusVal = order.hairStatus === 'DONE' ? 'Done' : 'Pending';

    const departmentStatus = {
      "IMITATION": {
        status: imitationStatusVal as 'Pending' | 'Done',
        packedBy: order.imitationStatus === 'DONE' ? 'Shivam Staff' : '',
        packedAt: order.imitationStatus === 'DONE' ? Date.now() : 0
      },
      "COSMETIC": {
        status: cosmeticsStatusVal as 'Pending' | 'Done',
        packedBy: order.cosmeticsStatus === 'DONE' ? 'Shivam Staff' : '',
        packedAt: order.cosmeticsStatus === 'DONE' ? Date.now() : 0
      },
      "HAIR ACCESSORIES": {
        status: hairStatusVal as 'Pending' | 'Done',
        packedBy: order.hairStatus === 'DONE' ? 'Shivam Staff' : '',
        packedAt: order.hairStatus === 'DONE' ? Date.now() : 0
      }
    };

    const enhancedOrder = {
      ...order,
      notes: notesVal,
      orderNote: notesVal,
      voiceNoteUrl: voiceVal,
      voiceNote: voiceVal,
      items: enhancedItems,
      departmentStatus: order.departmentStatus || departmentStatus
    };

    console.log('Syncing enhanced order to Firebase:', order.id, enhancedOrder);
    await setDoc(docRef, enhancedOrder, { merge: true });
    console.log('Order successfully synced to Firebase!');
  } catch (err) {
    console.error('Failed to sync order to Firebase:', err);
  }
}

export async function updateOrderStatusInFirebase(orderId: string, status: string) {
  try {
    const docRef = doc(db, 'orders', orderId);
    
    // Construct corresponding departmentStatus updates
    const packedVal = status === 'DONE' ? 'Done' : 'Pending';
    const packedByVal = status === 'DONE' ? 'Shivam Staff' : '';
    const packedTime = status === 'DONE' ? Date.now() : 0;

    await setDoc(docRef, { 
      overallStatus: status,
      imitationStatus: status,
      cosmeticsStatus: status,
      hairStatus: status,
      departmentStatus: {
        "IMITATION": { status: packedVal, packedBy: packedByVal, packedAt: packedTime },
        "imitation": { status: packedVal, packedBy: packedByVal, packedAt: packedTime },
        "COSMETIC": { status: packedVal, packedBy: packedByVal, packedAt: packedTime },
        "cosmetic": { status: packedVal, packedBy: packedByVal, packedAt: packedTime },
        "HAIR ACCESSORIES": { status: packedVal, packedBy: packedByVal, packedAt: packedTime },
        "hair": { status: packedVal, packedBy: packedByVal, packedAt: packedTime }
      },
      updatedAt: Date.now()
    }, { merge: true });
  } catch (err) {
    console.error('Failed to update order status in Firebase:', err);
  }
}

export async function updateOrderNoteInFirebase(orderId: string, notes: string) {
  try {
    const docRef = doc(db, 'orders', orderId);
    await setDoc(docRef, { 
      notes,
      orderNote: notes,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (err) {
    console.error('Failed to update order note in Firebase:', err);
  }
}

export async function deleteOrderFromFirebase(orderId: string) {
  try {
    const docRef = doc(db, 'orders', orderId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Failed to delete order from Firebase:', err);
  }
}

export async function syncCustomerToFirebase(customer: Customer) {
  try {
    const docRef = doc(db, 'customers', customer.customerCode);
    await setDoc(docRef, customer, { merge: true });
  } catch (err) {
    console.error('Failed to sync customer to Firebase:', err);
  }
}

export async function deleteCustomerFromFirebase(customerCode: string) {
  if (customerCode === 'AJ78692') {
    console.warn('Blocked deletion attempt of protected Admin ID AJ78692');
    return;
  }
  try {
    const batch = writeBatch(db);
    
    // 1. Delete the customer
    const customerDocRef = doc(db, 'customers', customerCode);
    batch.delete(customerDocRef);
    
    // 2. Query and delete all orders for this customer
    const ordersCol = collection(db, 'orders');
    const q = query(ordersCol, where('customerCode', '==', customerCode));
    const orderDocs = await getDocs(q);
    
    orderDocs.forEach((orderDoc) => {
      batch.delete(orderDoc.ref);
    });

    // 3. Query and delete all chat messages for this customer
    const chatCol = collection(db, 'chat_messages');
    const chatQuery1 = query(chatCol, where('customerCode', '==', customerCode));
    const chatDocs1 = await getDocs(chatQuery1);
    chatDocs1.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    const chatQuery2 = query(chatCol, where('customerId', '==', customerCode));
    const chatDocs2 = await getDocs(chatQuery2);
    chatDocs2.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    
    // 4. Commit the batch
    await batch.commit();
    console.log(`Customer ${customerCode}, associated orders, and chat messages deleted successfully.`);
  } catch (err) {
    console.error('Failed to delete customer, orders, and chats from Firebase:', err);
    throw err; // Re-throw to handle it in the component if needed
  }
}

export async function syncCategoryToFirebase(category: CategoryItem) {
  try {
    const docRef = doc(db, 'categories', category.id);
    await setDoc(docRef, category, { merge: true });
  } catch (err) {
    console.error('Failed to sync category to Firebase:', err);
  }
}

export async function deleteCategoryFromFirebase(categoryId: string) {
  try {
    const docRef = doc(db, 'categories', categoryId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Failed to delete category from Firebase:', err);
  }
}

export async function syncSubCategoryToFirebase(subCat: SubCategory) {
  try {
    const docRef = doc(db, 'subCategories', subCat.id);
    await setDoc(docRef, subCat, { merge: true });
  } catch (err) {
    console.error('Failed to sync subCategory to Firebase:', err);
  }
}

export async function deleteSubCategoryFromFirebase(subCatId: string) {
  try {
    const docRef = doc(db, 'subCategories', subCatId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Failed to delete subCategory from Firebase:', err);
  }
}

/**
 * One-click helper to push existing categories and sample orders to Firebase
 * so newly connected mobile app instantly has all live data.
 */
export async function seedCatalogToFirebase() {
  const store = useAppStore.getState();
  store.setFirebaseSyncing(true);
  try {
    // 1. Categories
    for (const cat of store.categories) {
      await setDoc(doc(db, 'categories', cat.id), cat, { merge: true });
    }
    // 2. SubCategories
    for (const sub of store.subCategories) {
      await setDoc(doc(db, 'subCategories', sub.id), sub, { merge: true });
    }
    // 3. Customers
    for (const cust of store.customers) {
      await setDoc(doc(db, 'customers', cust.customerCode), cust, { merge: true });
    }
    // 4. Orders
    for (const ord of store.orders) {
      await setDoc(doc(db, 'orders', ord.id), ord, { merge: true });
    }
    // 5. Chat Messages
    for (const msg of store.chatMessages) {
      await setDoc(doc(db, 'chat_messages', msg.id), msg, { merge: true });
    }
    // 6. Community Posts
    for (const post of store.communityPosts) {
      await setDoc(doc(db, 'community_posts', post.id), post, { merge: true });
    }
    // 7. Photos
    for (const photo of store.photos) {
      await setDoc(doc(db, 'photos', photo.id), photo, { merge: true });
    }
    // 8. Showroom Videos
    if (store.showroomVideos) {
      for (const video of store.showroomVideos) {
        await setDoc(doc(db, 'showroomVideos', video.id), video, { merge: true });
      }
    }
    store.setFirebaseConnected(true);
    return true;
  } catch (err) {
    console.error('Error seeding data to Firebase:', err);
    throw err;
  } finally {
    store.setFirebaseSyncing(false);
  }
}

export async function syncPhotoToFirebase(photo: CatalogPhoto) {
  try {
    const isHidden = photo.isHidden === true;
    const variants = photo.variants || [];
    const minQty = typeof photo.minQty === 'number'
      ? photo.minQty
      : (typeof photo.defaultQuantity === 'number' ? photo.defaultQuantity : 1);
    const code = (photo.code || photo.photoCode || photo.title || photo.name || '').trim();
    const imgUrl = photo.imageUrl || photo.thumbnailUrl || photo.imageUri || '';
    const videoUrl = photo.videoUrl || photo.videoUri || '';
    const categoryId = photo.categoryId || '';
    const subcategoryId = photo.subcategoryId || photo.subCategoryId || '';
    const orderIndex = photo.orderIndex !== undefined ? photo.orderIndex : (photo.sortOrder || 0);

    const payload = cleanUndefined({
      id: photo.id,
      code,
      photoCode: code,
      title: code,
      name: code,
      categoryId,
      subcategoryId,
      subCategoryId: subcategoryId,
      subCategoryName: photo.subCategoryName || 'General',
      variants,
      customLabels: photo.customLabels || variants.map((v: any) => v.label || v.letter || ''),
      minQty,
      defaultQuantity: minQty,
      imageUrl: imgUrl,
      thumbnailUrl: imgUrl,
      imageUri: imgUrl,
      videoUrl,
      videoUri: videoUrl,
      isVisible: !isHidden,
      status: isHidden ? 'hidden' : 'active',
      isHidden,
      hideFromApk: isHidden,
      orderIndex,
      sortOrder: orderIndex,
      itemCount: photo.itemCount || variants.length,
      aAvailable: photo.aAvailable ?? (variants.length >= 1),
      bAvailable: photo.bAvailable ?? (variants.length >= 2),
      cAvailable: photo.cAvailable ?? (variants.length >= 3),
      dAvailable: photo.dAvailable ?? (variants.length >= 4),
      description: photo.description || '',
      createdAt: (photo as any).createdAt || Date.now(),
      updatedAt: serverTimestamp()
    });

    // 1. Unified Write to collection 'products'
    const productRef = doc(db, 'products', photo.id);
    await setDoc(productRef, payload, { merge: true });

    // 2. Legacy fallback writes
    try {
      await setDoc(doc(db, 'photos', photo.id), payload, { merge: true });
    } catch (_) {}
    try {
      await setDoc(doc(db, 'catalog_photos', photo.id), payload, { merge: true });
    } catch (_) {}

  } catch (err) {
    console.error('Failed to sync product to Firebase:', err);
    handleFirestoreError(err, OperationType.WRITE, `products/${photo.id}`);
  }
}

export async function toggleProductHideInFirebase(productId: string, hide: boolean) {
  try {
    const isVisible = !hide;
    const status = hide ? 'hidden' : 'active';
    const productRef = doc(db, 'products', productId);

    try {
      await updateDoc(productRef, {
        isVisible,
        status,
        isHidden: hide,
        hideFromApk: hide,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      await setDoc(productRef, {
        id: productId,
        isVisible,
        status,
        isHidden: hide,
        hideFromApk: hide,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    try {
      await setDoc(doc(db, 'photos', productId), { isVisible, status, isHidden: hide, hideFromApk: hide, updatedAt: serverTimestamp() }, { merge: true });
    } catch (_) {}

    try {
      await setDoc(doc(db, 'catalog_photos', productId), { isVisible, status, isHidden: hide, hideFromApk: hide, updatedAt: serverTimestamp() }, { merge: true });
    } catch (_) {}
  } catch (err) {
    console.error('Failed to toggle product hide in Firebase:', err);
    handleFirestoreError(err, OperationType.UPDATE, `products/${productId}`);
  }
}

export async function deletePhotoFromFirebase(photoId: string) {
  try {
    const productRef = doc(db, 'products', photoId);
    await deleteDoc(productRef);

    try {
      await deleteDoc(doc(db, 'photos', photoId));
    } catch (_) {}
    try {
      await deleteDoc(doc(db, 'catalog_photos', photoId));
    } catch (_) {}
  } catch (err) {
    console.error('Failed to delete product from Firebase:', err);
    handleFirestoreError(err, OperationType.DELETE, `products/${photoId}`);
  }
}

export async function syncShowroomVideoToFirebase(video: ShowroomVideo) {
  try {
    const qtyNum = typeof video.quantity === 'number' ? video.quantity : parseInt(video.orderQuantity || '0', 10);
    const payload = cleanUndefined({
      id: video.id,
      videoUri: video.videoUri || video.videoUrl || '',
      videoUrl: video.videoUri || video.videoUrl || '',
      imageUri: video.imageUri || video.posterUrl || video.thumbnailUri || '',
      posterUrl: video.imageUri || video.posterUrl || video.thumbnailUri || '',
      title: video.title || 'Showroom Video',
      quantity: isNaN(qtyNum) ? 0 : qtyNum,
      sortOrder: typeof video.sortOrder === 'number' ? video.sortOrder : (video.uploadedAt || Date.now()),
      createdAt: video.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Keep legacy fields for safe internal operation if needed
      fileSizeMb: video.fileSizeMb || 0,
      orderQuantity: String(isNaN(qtyNum) ? 0 : qtyNum),
      uploadedAt: video.uploadedAt || Date.now()
    });

    const docRef = doc(db, 'showroomVideos', video.id);
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.error('Failed to sync showroom video to Firebase:', err);
  }
}

export async function deleteShowroomVideoFromFirebase(videoId: string) {
  try {
    await deleteDoc(doc(db, 'showroomVideos', videoId));
  } catch (err) {
    console.error('Failed to delete showroom video from Firebase:', err);
  }
}

/**
 * Check if a product code already exists in Firestore ('photos' or 'catalog_photos') or cached state
 */
export async function checkProductCodeExistsInFirebase(code: string): Promise<CatalogPhoto | null> {
  const cleanCode = code?.trim().toUpperCase();
  if (!cleanCode) return null;

  try {
    // 1. First check in-memory / store synced photos for instant response
    const cached = useAppStore.getState().photos.find(
      p => (p.photoCode || p.code)?.trim().toUpperCase() === cleanCode
    );
    if (cached) return cached;

    // 2. Query Firestore 'products' collection
    const productsRef = collection(db, 'products');
    const q0 = query(productsRef, where('code', '==', cleanCode));
    const snap0 = await getDocs(q0);
    if (!snap0.empty) {
      const docData = snap0.docs[0].data() as CatalogPhoto;
      return { ...docData, id: snap0.docs[0].id };
    }

    const q0_1 = query(productsRef, where('photoCode', '==', cleanCode));
    const snap0_1 = await getDocs(q0_1);
    if (!snap0_1.empty) {
      const docData = snap0_1.docs[0].data() as CatalogPhoto;
      return { ...docData, id: snap0_1.docs[0].id };
    }

    // 3. Query Firestore 'photos' collection
    const photosRef = collection(db, 'photos');
    const q1 = query(photosRef, where('photoCode', '==', cleanCode));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      const docData = snap1.docs[0].data() as CatalogPhoto;
      return { ...docData, id: snap1.docs[0].id };
    }

    return null;
  } catch (err) {
    console.warn('Error checking product code duplicate in Firestore:', err);
    const cached = useAppStore.getState().photos.find(
      p => (p.photoCode || p.code)?.trim().toUpperCase() === cleanCode
    );
    return cached || null;
  }
}

/**
 * Pushes a targeted or direct notification broadcast to Firestore 'notifications'
 */
export async function syncNotificationToFirebase(notification: any) {
  try {
    const docRef = doc(db, 'notifications', notification.id);
    await setDoc(docRef, notification);
    console.log(`Notification successfully synchronized to Firestore: ${notification.id}`);
  } catch (err) {
    console.error('Failed to sync notification to Firestore:', err);
    handleFirestoreError(err, OperationType.WRITE, `notifications/${notification.id}`);
  }
}

/**
 * Appends a notification trigger event to the notificationHistory field of an order document in Firestore
 */
export async function updateOrderNotificationHistory(orderId: string, historyItem: any) {
  try {
    const orderDocRef = doc(db, 'orders', orderId);
    
    // Read the current document state to append safely
    const currentOrder = useAppStore.getState().orders.find(o => o.id === orderId);
    const existingHistory = currentOrder?.notificationHistory || [];
    
    const updatedHistory = [...existingHistory, historyItem];
    
    await setDoc(orderDocRef, {
      notificationHistory: updatedHistory,
      updatedAt: Date.now()
    }, { merge: true });

    // Sync state locally as well
    useAppStore.setState((state) => ({
      orders: state.orders.map(o => o.id === orderId ? { ...o, notificationHistory: updatedHistory } : o)
    }));
    
    console.log(`Notification history successfully appended for order: ${orderId}`);
  } catch (err) {
    console.error('Failed to update order notification history in Firestore:', err);
  }
}

let lastAutoBestSellersIdsStr = '';

/**
 * Auto-computes top-6 best sellers from last 30 days orders and syncs to config/homeContent
 * Includes LOOP-SHIELD to prevent snapshot loops
 */
export async function autoComputeAndSyncBestSellers(orders: WholesaleOrder[], photos: CatalogPhoto[]) {
  try {
    if (!orders || orders.length === 0 || !photos || photos.length === 0) return;

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

    const sortedProductIds = photos
      .map(p => ({
        id: p.id,
        qty: soldQtyMap[p.id] || 0
      }))
      .filter(p => p.qty > 0)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6)
      .map(p => p.id);

    if (sortedProductIds.length < 6) {
      photos.forEach(p => {
        if (sortedProductIds.length < 6 && !sortedProductIds.includes(p.id)) {
          sortedProductIds.push(p.id);
        }
      });
    }

    const newIdsStr = sortedProductIds.join(',');
    if (newIdsStr === lastAutoBestSellersIdsStr) {
      // LOOP-SHIELD: array has not changed, do NOT write to Firestore
      return;
    }

    const configRef = doc(db, 'config', 'homeContent');
    const configSnap = await getDoc(configRef);
    let currentOn = false;
    let existingItemsStr = '';
    
    if (configSnap.exists()) {
      const data = configSnap.data();
      currentOn = data.bestSellers?.on === true;
      const existingItems = Array.isArray(data.bestSellers?.items) ? data.bestSellers.items : [];
      existingItemsStr = existingItems.join(',');
    }

    if (newIdsStr === existingItemsStr) {
      lastAutoBestSellersIdsStr = newIdsStr;
      return;
    }

    lastAutoBestSellersIdsStr = newIdsStr;
    await setDoc(configRef, {
      bestSellers: {
        on: currentOn,
        items: sortedProductIds
      }
    }, { merge: true });

    console.log('[BestSellers] Auto-computed top-6 items in config/homeContent:', sortedProductIds);
  } catch (err) {
    console.warn('Notice: BestSellers auto-compute notice:', err);
  }
}

