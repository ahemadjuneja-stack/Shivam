import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  db, 
  COLLECTIONS, 
  seedInitialDataIfEmpty, 
  syncPhotoToFirebase, 
  syncCustomerToFirebase 
} from './firebase';
import { useAppStore, defaultPhotos, defaultCategories, defaultSubCategories, defaultCustomers } from './store';
import { CatalogPhoto, WholesaleOrder, Customer, ChatMessage } from './types';

export function useFirebaseSync() {
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'synced' | 'error'>('connecting');

  useEffect(() => {
    let unsubscribePhotos: (() => void) | null = null;
    let unsubscribeOrders: (() => void) | null = null;
    let unsubscribeCustomers: (() => void) | null = null;
    let unsubscribeMessages: (() => void) | null = null;

    async function initSync() {
      try {
        // 1. Check & Seed initial catalog if database is fresh
        await seedInitialDataIfEmpty(defaultPhotos, defaultCategories, defaultSubCategories);

        // Also seed initial default customers if needed
        defaultCustomers.forEach(cust => {
          syncCustomerToFirebase(cust).catch(() => {});
        });

        // 2. Real-time listener for Catalog Photos
        const photosCol = collection(db, COLLECTIONS.PHOTOS);
        unsubscribePhotos = onSnapshot(photosCol, (snapshot) => {
          if (!snapshot.empty) {
            const fetchedPhotos: CatalogPhoto[] = [];
            snapshot.forEach((doc) => {
              fetchedPhotos.push(doc.data() as CatalogPhoto);
            });
            // Sort by sortOrder or photoCode
            fetchedPhotos.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            useAppStore.setState({ photos: fetchedPhotos });
          } else {
            // If empty, upload defaults
            defaultPhotos.forEach(p => syncPhotoToFirebase(p));
          }
          setIsFirebaseConnected(true);
          setSyncStatus('synced');
        }, (err) => {
          console.error('Photos onSnapshot error:', err);
          setSyncStatus('error');
        });

        // 3. Real-time listener for Wholesale Orders
        const ordersCol = collection(db, COLLECTIONS.ORDERS);
        unsubscribeOrders = onSnapshot(ordersCol, (snapshot) => {
          const fetchedOrders: WholesaleOrder[] = [];
          snapshot.forEach((doc) => {
            fetchedOrders.push(doc.data() as WholesaleOrder);
          });
          fetchedOrders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          useAppStore.setState({ orders: fetchedOrders });
        }, (err) => {
          console.error('Orders onSnapshot error:', err);
        });

        // 4. Real-time listener for Customers
        const customersCol = collection(db, COLLECTIONS.CUSTOMERS);
        unsubscribeCustomers = onSnapshot(customersCol, (snapshot) => {
          if (!snapshot.empty) {
            const fetchedCust: Customer[] = [];
            snapshot.forEach((doc) => {
              fetchedCust.push(doc.data() as Customer);
            });
            useAppStore.setState({ customers: fetchedCust });
          }
        }, (err) => {
          console.error('Customers onSnapshot error:', err);
        });

        // 5. Real-time listener for Chat Messages
        const messagesCol = collection(db, COLLECTIONS.MESSAGES);
        unsubscribeMessages = onSnapshot(messagesCol, (snapshot) => {
          const fetchedMsgs: ChatMessage[] = [];
          snapshot.forEach((doc) => {
            fetchedMsgs.push(doc.data() as ChatMessage);
          });
          fetchedMsgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          useAppStore.setState({ messages: fetchedMsgs });
        }, (err) => {
          console.error('Messages onSnapshot error:', err);
        });

      } catch (err) {
        console.error('Error in initSync:', err);
        setSyncStatus('error');
      }
    }

    initSync();

    return () => {
      if (unsubscribePhotos) unsubscribePhotos();
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribeCustomers) unsubscribeCustomers();
      if (unsubscribeMessages) unsubscribeMessages();
    };
  }, []);

  return { isFirebaseConnected, syncStatus };
}
