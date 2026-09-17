import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocFromServer,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { CatalogPhoto, WholesaleOrder, Customer, ChatMessage, CommunityPost } from './types';

// Initialize Firebase App
export const firebaseApp = getApps().length === 0 
  ? initializeApp(firebaseConfig) 
  : getApps()[0];

// Custom Database ID
export const FIRESTORE_DATABASE_ID = "ai-studio-shivam-6138ca5c-1e3b-412f-957d-d52501eff503";

// Initialize Firestore with specific database ID
export const db = getFirestore(firebaseApp, FIRESTORE_DATABASE_ID);

// Collection Names
export const COLLECTIONS = {
  PHOTOS: 'photos',
  CATALOG_PHOTOS: 'catalog_photos',
  SHOWROOM_VIDEOS: 'showroomVideos',
  CUSTOMERS: 'customers',
  ORDERS: 'orders',
  COMMUNITY_POSTS: 'community_posts',
  MESSAGES: 'chat_messages',
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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

// Test Firestore connection on boot
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

/* ==========================================================================
   FIRESTORE CRUD HELPERS
   ========================================================================== */

export async function syncPhotoToFirebase(photo: CatalogPhoto): Promise<void> {
  const path = `${COLLECTIONS.PHOTOS}/${photo.id}`;
  try {
    const photoRef = doc(db, COLLECTIONS.PHOTOS, photo.id);
    await setDoc(photoRef, {
      ...photo,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePhotoFromFirebase(photoId: string): Promise<void> {
  const path = `${COLLECTIONS.PHOTOS}/${photoId}`;
  try {
    const photoRef = doc(db, COLLECTIONS.PHOTOS, photoId);
    await deleteDoc(photoRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncCustomerToFirebase(customer: Customer): Promise<void> {
  const customerId = customer.customerId || customer.customerCode;
  const path = `${COLLECTIONS.CUSTOMERS}/${customerId}`;
  try {
    const custRef = doc(db, COLLECTIONS.CUSTOMERS, customerId);
    await setDoc(custRef, {
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
      createdAt: customer.createdAt || Date.now(),
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCustomerFromFirebase(customerCodeOrId: string): Promise<void> {
  const path = `${COLLECTIONS.CUSTOMERS}/${customerCodeOrId}`;
  try {
    const custRef = doc(db, COLLECTIONS.CUSTOMERS, customerCodeOrId);
    await deleteDoc(custRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncOrderToFirebase(order: WholesaleOrder): Promise<void> {
  const orderId = order.orderId || order.id;
  const path = `${COLLECTIONS.ORDERS}/${orderId}`;
  try {
    const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
    
    // Standardized fields requested by Admin Dashboard
    const sanitizedItems = order.items.map((item: any) => ({
      id: item.id || `${item.photoId || item.photoCode}_${item.variant || item.optionLetter || 'A'}`,
      photoCode: item.photoCode || '',
      name: item.name || `${item.photoCode} (Option ${item.variant || item.optionLetter || 'A'})`,
      quantity: Number(item.quantity) || 1,
      variant: item.variant || item.optionLetter || 'A',
      price: Number(item.price) || 0,
      photoId: item.photoId || '',
      imageUri: item.imageUri || '',
      categoryId: item.categoryId || '',
      subCategoryName: item.subCategoryName || '',
      optionLetter: item.optionLetter || item.variant || 'A'
    }));

    await setDoc(orderRef, {
      orderId,
      id: orderId,
      customerId: order.customerId || order.customerCode || '',
      customerCode: order.customerCode || order.customerId || '',
      shopName: order.shopName || '',
      items: sanitizedItems,
      orderNote: order.orderNote || order.notes || '',
      notes: order.notes || order.orderNote || '',
      voiceNoteUrl: order.voiceNoteUrl || order.voiceNoteUri || null,
      voiceNoteUri: order.voiceNoteUri || order.voiceNoteUrl || null,
      totalAmount: Number(order.totalAmount) || 0,
      totalItemsCount: Number(order.totalItemsCount) || sanitizedItems.reduce((acc, i) => acc + i.quantity, 0),
      status: order.status || 'Pending',
      overallStatus: order.overallStatus || order.status || 'Pending',
      imitationStatus: order.imitationStatus || 'PENDING',
      cosmeticsStatus: order.cosmeticsStatus || 'PENDING',
      hairStatus: order.hairStatus || 'PENDING',
      cityName: order.cityName || '',
      mobileNumber: order.mobileNumber || '',
      createdAt: serverTimestamp(),
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
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
  const postPayload = {
    postId,
    id: postId,
    customerId: post.customerId || post.customerCode || 'CUST-GENERAL',
    customerCode: post.customerCode || post.customerId || 'CUST-GENERAL',
    shopName: post.shopName || 'Wholesale Buyer',
    imageUrl: post.imageUrl || '',
    image: post.imageUrl || '',
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
  const msgId = message.id || `msg-${Date.now()}`;
  const path = `${COLLECTIONS.MESSAGES}/${msgId}`;
  const payload = {
    id: msgId,
    messageId: msgId,
    customerId: message.customerId || message.customerCode || 'CUST-GENERAL',
    customerCode: message.customerCode || message.customerId || 'CUST-GENERAL',
    shopName: message.shopName || 'Wholesale Buyer',
    sender: message.sender || 'customer',
    text: message.text || '',
    message: message.text || '',
    imageUri: message.imageUri || null,
    imageUrl: message.imageUri || null,
    audioUri: message.audioUri || null,
    audioUrl: message.audioUri || null,
    isRead: false,
    read: false,
    status: 'sent',
    timestamp: serverTimestamp(),
    createdAt: Date.now()
  };

  try {
    // 1. Primary write to 'chat_messages'
    const msgRef = doc(db, COLLECTIONS.MESSAGES, msgId);
    await setDoc(msgRef, payload, { merge: true });

    // 2. Also mirror to 'messages' collection so dashboard never misses it
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

export async function deleteMessageFromFirebase(messageId: string): Promise<void> {
  const path = `${COLLECTIONS.MESSAGES}/${messageId}`;
  try {
    const msgRef = doc(db, COLLECTIONS.MESSAGES, messageId);
    await deleteDoc(msgRef);
    try {
      const altMsgRef = doc(db, 'messages', messageId);
      await deleteDoc(altMsgRef);
    } catch {}
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
