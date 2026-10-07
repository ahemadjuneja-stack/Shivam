import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore,
  getFirestore, 
  doc, 
  getDoc,
  Firestore,
  memoryLocalCache,
  setLogLevel
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Silence transient network/offline connection warnings from Firestore internal logger
setLogLevel('silent');

export const DATABASE_ID = "ai-studio-shivam-6138ca5c-1e3b-412f-957d-d52501eff503";

export const firebaseConfig = {
  apiKey: "AIzaSyBgsDf1VyV8yWoJBiKsp5zKO6IhGUYkpKI",
  authDomain: "shivam-2bace.firebaseapp.com",
  projectId: "shivam-2bace",
  storageBucket: "shivam-2bace.firebasestorage.app",
  messagingSenderId: "998857606826",
  appId: "1:998857606826:web:b294810014f9b4b60172d3",
};

// Initialize Firebase App singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Cloud Firestore database instance with in-memory cache (no IndexedDB persistence)
// experimentalAutoDetectLongPolling automatically negotiates streaming or long polling in preview/iframe/proxy environments
let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    experimentalAutoDetectLongPolling: true,
  }, DATABASE_ID);
} catch {
  firestoreDb = getFirestore(app, DATABASE_ID);
}

export const db: Firestore = firestoreDb;
export const auth = getAuth(app);
export const storage = getStorage(app, "gs://shivam-2bace.firebasestorage.app");

/**
 * Direct Cloud Storage Upload Utility for 100% cloud-hosted media
 */
export async function uploadDashboardMedia(
  fileOrBlob: File | Blob, 
  folder: 'catalog' | 'showroom_videos' | 'communication' | 'broadcasts', 
  idPrefix: string = 'media'
): Promise<string> {
  const fileName = (fileOrBlob as any).name;
  let ext = 'jpg';
  if (fileName && typeof fileName === 'string' && fileName.includes('.')) {
    ext = fileName.split('.').pop() || 'jpg';
  } else if (fileOrBlob.type) {
    if (fileOrBlob.type.includes('webm')) ext = 'webm';
    else if (fileOrBlob.type.includes('mp4')) ext = 'mp4';
    else if (fileOrBlob.type.includes('png')) ext = 'png';
    else if (fileOrBlob.type.includes('audio')) ext = 'webm';
    else if (fileOrBlob.type.includes('jpeg') || fileOrBlob.type.includes('jpg')) ext = 'jpg';
  }

  const cleanPrefix = idPrefix.replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniquePath = `${folder}/${cleanPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const fileRef = ref(storage, uniquePath);
  const snapshot = await uploadBytes(fileRef, fileOrBlob, { contentType: fileOrBlob.type || undefined });
  return await getDownloadURL(snapshot.ref);
}

// Helper to test connection
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    const testDocRef = doc(db, 'system', 'connection_ping');
    await getDoc(testDocRef);
    return true;
  } catch (error: any) {
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      console.warn('Firebase currently offline or connecting...', error);
      return false;
    }
    // If permission or document not found, connection itself still succeeded
    return true;
  }
}

