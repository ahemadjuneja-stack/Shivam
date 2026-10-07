import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// One-time startup cleanup: Clear all old persisted storage keys and IndexedDB caches
try {
  // 1. Remove legacy localStorage keys that store products, categories, subcategories, photos, orders, or customers
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key !== 'shivam-wholesale-pc-session') {
      if (
        key.startsWith('shivam-wholesale-pc') ||
        key.includes('photos') ||
        key.includes('categories') ||
        key.includes('products') ||
        key.includes('orders') ||
        key.includes('customers') ||
        key.includes('showroom')
      ) {
        keysToRemove.push(key);
      }
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));

  // 2. Delete old IndexedDB databases to eliminate offline cache persistence
  if (typeof window !== 'undefined' && window.indexedDB && typeof window.indexedDB.deleteDatabase === 'function') {
    const dbsToDelete = [
      'ShowroomVideosDB',
      'firestore/[DEFAULT]/ai-studio-shivam-6138ca5c-1e3b-412f-957d-d52501eff503/main',
      'firestore/[DEFAULT]/[DEFAULT]/main',
      'firestore/ai-studio-shivam-6138ca5c-1e3b-412f-957d-d52501eff503/main'
    ];
    dbsToDelete.forEach((dbName) => {
      try {
        window.indexedDB.deleteDatabase(dbName);
      } catch (err) {
        console.warn('Could not delete IndexedDB database:', dbName, err);
      }
    });
  }
} catch (e) {
  console.error("Local storage & IndexedDB cleanup error:", e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
