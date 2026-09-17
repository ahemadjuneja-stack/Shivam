import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  getDocs
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { CatalogPhoto, WholesaleOrder, Customer, ChatMessage, CategoryItem, SubCategory } from './types';

// Initialize Firebase App
export const firebaseApp = getApps().length === 0 
  ? initializeApp(firebaseConfig) 
  : getApps()[0];

// Initialize Firestore with custom databaseId if configured
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);

// Collection Names
export const COLLECTIONS = {
  PHOTOS: 'catalog_photos',
  CUSTOMERS: 'customers',
  ORDERS: 'orders',
  MESSAGES: 'chat_messages',
  CATEGORIES: 'categories',
  SUBCATEGORIES: 'subcategories'
} as const;

/* ==========================================================================
   FIRESTORE CRUD HELPERS
   ========================================================================== */

export async function syncPhotoToFirebase(photo: CatalogPhoto): Promise<void> {
  try {
    const photoRef = doc(db, COLLECTIONS.PHOTOS, photo.id);
    await setDoc(photoRef, {
      ...photo,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    console.error('Failed to sync photo to Firebase:', error);
  }
}

export async function deletePhotoFromFirebase(photoId: string): Promise<void> {
  try {
    const photoRef = doc(db, COLLECTIONS.PHOTOS, photoId);
    await deleteDoc(photoRef);
  } catch (error) {
    console.error('Failed to delete photo from Firebase:', error);
  }
}

export async function syncCustomerToFirebase(customer: Customer): Promise<void> {
  try {
    const custRef = doc(db, COLLECTIONS.CUSTOMERS, customer.customerCode);
    await setDoc(custRef, {
      ...customer,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    console.error('Failed to sync customer to Firebase:', error);
  }
}

export async function syncOrderToFirebase(order: WholesaleOrder): Promise<void> {
  try {
    const orderRef = doc(db, COLLECTIONS.ORDERS, order.id);
    await setDoc(orderRef, {
      ...order,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    console.error('Failed to sync order to Firebase:', error);
  }
}

export async function updateOrderStatusInFirebase(
  orderId: string, 
  data: Partial<WholesaleOrder>
): Promise<void> {
  try {
    const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
    await updateDoc(orderRef, {
      ...data,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('Failed to update order status in Firebase:', error);
  }
}

export async function syncMessageToFirebase(message: ChatMessage): Promise<void> {
  try {
    const msgRef = doc(db, COLLECTIONS.MESSAGES, message.id);
    await setDoc(msgRef, {
      ...message,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('Failed to sync message to Firebase:', error);
  }
}

/**
 * Seed initial catalog to Firebase if Firestore collection is empty
 */
export async function seedInitialDataIfEmpty(
  defaultPhotos: CatalogPhoto[],
  defaultCategories: CategoryItem[],
  defaultSubCategories: SubCategory[]
): Promise<void> {
  try {
    const photosCol = collection(db, COLLECTIONS.PHOTOS);
    const snapshot = await getDocs(photosCol);
    
    if (snapshot.empty && defaultPhotos.length > 0) {
      console.log('Seeding initial photos to Firestore...');
      const batch = writeBatch(db);
      
      defaultPhotos.forEach((photo) => {
        const docRef = doc(db, COLLECTIONS.PHOTOS, photo.id);
        batch.set(docRef, { ...photo, updatedAt: Date.now() });
      });

      defaultCategories.forEach((cat) => {
        const docRef = doc(db, COLLECTIONS.CATEGORIES, cat.id);
        batch.set(docRef, { ...cat, updatedAt: Date.now() });
      });

      defaultSubCategories.forEach((sub) => {
        const docRef = doc(db, COLLECTIONS.SUBCATEGORIES, sub.id);
        batch.set(docRef, { ...sub, updatedAt: Date.now() });
      });

      await batch.commit();
      console.log('Successfully seeded catalog into Firestore!');
    }
  } catch (error) {
    console.error('Error seeding initial data to Firestore:', error);
  }
}
