const DB_NAME = 'voice-queue';
const STORE = 'pending';

export interface PendingVoice { orderId: string; dataUrl: string; createdAt: number; }

let dbPromise: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'orderId' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { dbPromise = null; reject(req.error); };
    });
  }
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(db => new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

export const savePendingVoice = (orderId: string, dataUrl: string) =>
  tx('readwrite', s => s.put({ orderId, dataUrl, createdAt: Date.now() } as PendingVoice));
export const getPendingVoice = (orderId: string): Promise<PendingVoice | undefined> =>
  tx('readonly', s => s.get(orderId));
export const deletePendingVoice = (orderId: string) =>
  tx('readwrite', s => s.delete(orderId));
export const listPendingVoiceIds = (): Promise<string[]> =>
  tx<IDBValidKey[]>('readonly', s => s.getAllKeys()).then(keys => keys.map(String));
