/**
 * One-time startup purge for stale offline caches, deprecated localStorage keys, and IndexedDB databases.
 * Ensures old deleted products, thumbnails, and categories never flash or resurface from client caches.
 */

const ACTIVE_SESSION_KEY = 'shivam-wholesale-session-v9';

export const CLEARED_LEGACY_KEYS = [
  'shivam-wholesale-clean-v8',
  'shivam-wholesale-clean-v7',
  'shivam-wholesale-clean-v6',
  'shivam-wholesale-clean-v5',
  'shivam-wholesale-clean-v4',
  'shivam-wholesale-clean-v3',
  'shivam-wholesale-clean-v2',
  'shivam-wholesale-clean-v1',
  'shivam-wholesale-storage',
  'catalog-storage',
  'photos-storage',
  'categories-storage',
  'subcategories-storage',
  'wholesale-storage',
  'shivam-app-storage'
];

export function purgeLegacyStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    // 1. Remove known legacy localStorage keys
    CLEARED_LEGACY_KEYS.forEach((key) => {
      try {
        if (localStorage.getItem(key) !== null) {
          localStorage.removeItem(key);
          console.log(`[Storage Cleanup] Cleared legacy key: ${key}`);
        }
      } catch (_) {}
    });

    // 2. Scan and remove any other stale catalog/photo/cache keys in localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k !== ACTIVE_SESSION_KEY) {
        const lower = k.toLowerCase();
        if (
          lower.includes('shivam-wholesale') ||
          lower.includes('catalog') ||
          lower.includes('photo') ||
          lower.includes('category') ||
          lower.includes('subcategory') ||
          lower.includes('firestore') ||
          lower.includes('firebase')
        ) {
          keysToRemove.push(k);
        }
      }
    }

    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
        console.log(`[Storage Cleanup] Purged pattern-matched legacy key: ${k}`);
      } catch (_) {}
    });

    // 3. Purge legacy IndexedDB databases (e.g., persistent Firestore caches)
    if ('indexedDB' in window && typeof indexedDB.databases === 'function') {
      indexedDB.databases().then((databases) => {
        databases.forEach((dbInfo) => {
          if (dbInfo.name && (
            dbInfo.name.includes('firestore') || 
            dbInfo.name.includes('firebase') ||
            dbInfo.name.includes('shivam') ||
            dbInfo.name.includes('catalog')
          )) {
            try {
              indexedDB.deleteDatabase(dbInfo.name);
              console.log(`[Storage Cleanup] Deleted legacy IndexedDB: ${dbInfo.name}`);
            } catch (err) {
              console.warn(`[Storage Cleanup] Could not delete IndexedDB ${dbInfo.name}:`, err);
            }
          }
        });
      }).catch(() => {});
    }

    // 4. Clear any stale sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  } catch (e) {
    console.warn('[Storage Cleanup] Purge error:', e);
  }
}

// Auto-run immediately upon file load
purgeLegacyStorage();
