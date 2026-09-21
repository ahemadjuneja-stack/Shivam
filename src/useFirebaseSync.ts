import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  db, 
  COLLECTIONS,
  handleFirestoreError,
  OperationType 
} from './firebase';
import { useAppStore } from './store';
import { 
  CatalogPhoto, 
  ShowroomVideo, 
  WholesaleOrder, 
  Customer, 
  ChatMessage, 
  CategoryItem, 
  SubCategory,
  CommunityPost 
} from './types';

export function useFirebaseSync() {
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'synced' | 'error'>('connecting');

  useEffect(() => {
    let unsubscribePhotos: (() => void) | null = null;
    let unsubscribeCatalogPhotos: (() => void) | null = null;
    let unsubscribeShowroomVideos: (() => void) | null = null;
    let unsubscribeCategories: (() => void) | null = null;
    let unsubscribeSubCategories: (() => void) | null = null;
    let unsubscribeOrders: (() => void) | null = null;
    let unsubscribeCustomers: (() => void) | null = null;
    let unsubscribeMessages: (() => void) | null = null;
    let unsubscribeAltMessages: (() => void) | null = null;
    let unsubscribeBroadcasts: (() => void) | null = null;
    let unsubscribeCommunityPosts: (() => void) | null = null;

    // Track messages from both 'chat_messages' and 'messages'
    const chatMessagesMap = new Map<string, ChatMessage>();
    const altMessagesMap = new Map<string, ChatMessage>();

    // Track photos from both 'photos' and 'catalog_photos' to merge them seamlessly
    const photosCollectionMap = new Map<string, CatalogPhoto>();
    const catalogPhotosCollectionMap = new Map<string, CatalogPhoto>();

    const updateMergedMessages = () => {
      const merged = new Map<string, ChatMessage>();
      altMessagesMap.forEach((m, id) => merged.set(id, m));
      chatMessagesMap.forEach((m, id) => merged.set(id, m));
      const allMsgs = Array.from(merged.values());
      allMsgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      useAppStore.setState({ messages: allMsgs });
    };

    function normalizeMessage(doc: any): ChatMessage {
      const data = doc.data() as any;
      const msgTimestamp = data.timestamp?.toMillis 
        ? data.timestamp.toMillis() 
        : (typeof data.timestamp === 'number' ? data.timestamp : (data.createdAt || Date.now()));

      const msgType: 'text' | 'image' | 'voice' = data.type || 
        (data.audioUri || data.audioUrl ? 'voice' : (data.imageUri || data.imageUrl ? 'image' : 'text'));
      
      const media = data.mediaUrl || data.imageUri || data.imageUrl || data.audioUri || data.audioUrl || undefined;

      return {
        id: data.id || data.messageId || doc.id,
        messageId: data.messageId || data.id || doc.id,
        customerCode: data.customerCode || data.customerId || '',
        customerId: data.customerId || data.customerCode || '',
        shopName: data.shopName || '',
        sender: data.sender || 'customer',
        type: msgType,
        text: data.text || data.message || '',
        mediaUrl: media,
        imageUri: msgType === 'image' ? media : (data.imageUri || data.imageUrl || undefined),
        audioUri: msgType === 'voice' ? media : (data.audioUri || data.audioUrl || undefined),
        isRead: data.isRead !== undefined ? data.isRead : (data.read !== undefined ? data.read : false),
        timestamp: msgTimestamp,
        createdAt: data.createdAt || msgTimestamp
      };
    }

    const updateMergedPhotos = () => {
      const mergedMap = new Map<string, CatalogPhoto>();
      
      // Add items from catalog_photos first
      catalogPhotosCollectionMap.forEach((p, id) => {
        mergedMap.set(id, p);
      });

      // Add/overwrite with items from photos
      photosCollectionMap.forEach((p, id) => {
        mergedMap.set(id, p);
      });

      const allPhotos = Array.from(mergedMap.values());
      allPhotos.sort((a, b) => (a.orderIndex ?? a.sortOrder ?? 0) - (b.orderIndex ?? b.sortOrder ?? 0));
      useAppStore.setState({ photos: allPhotos });
    };

    function normalizePhoto(doc: any): CatalogPhoto {
      const data = doc.data() as any;
      return {
        id: data.id || doc.id,
        categoryId: data.categoryId || data.category || '',
        subCategoryId: data.subCategoryId || data.subCategory || data.sub_category_id || '',
        subCategoryName: data.subCategoryName || data.subCategoryTitle || data.subCategory || '',
        photoCode: data.photoCode || data.code || data.title || doc.id,
        imageUri: data.imageUri || data.imageUrl || data.image_url || data.image || data.url || data.photoUrl || data.photo_url || '',
        videoUri: data.videoUri || data.videoUrl || data.video_url || data.mediaUrl || data.media_url || data.video || undefined,
        itemCount: typeof data.itemCount === 'number' ? data.itemCount : 4,
        aAvailable: data.aAvailable !== undefined ? data.aAvailable : (data.a !== undefined ? data.a : true),
        bAvailable: data.bAvailable !== undefined ? data.bAvailable : (data.b !== undefined ? data.b : true),
        cAvailable: data.cAvailable !== undefined ? data.cAvailable : (data.c !== undefined ? data.c : true),
        dAvailable: data.dAvailable !== undefined ? data.dAvailable : (data.d !== undefined ? data.d : true),
        defaultQuantity: typeof data.defaultQuantity === 'number' ? data.defaultQuantity : 6,
        sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
        orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : (typeof data.sortOrder === 'number' ? data.sortOrder : 0),
        description: data.description || '',
        // Dynamic fields
        variants: data.variants || undefined,
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

    async function initSync() {
      try {
        // 1. Real-time listener for Categories from 'categories'
        const catCol = collection(db, COLLECTIONS.CATEGORIES);
        unsubscribeCategories = onSnapshot(catCol, { includeMetadataChanges: true }, (snapshot) => {
          if (snapshot.metadata && snapshot.metadata.fromCache) {
            console.log('[Firestore Sync] Skipping cached categories snapshot');
            return;
          }
          const fetchedCats: CategoryItem[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as any;
            fetchedCats.push({
              id: data.id || doc.id,
              displayName: data.displayName || data.name || data.title || doc.id,
              thumbnailUrl: data.thumbnailUrl || data.imageUri || data.imageUrl || data.image || '',
              accentColorHex: data.accentColorHex || data.accentColor || data.color || '#F59E0B',
              sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
              orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : (typeof data.sortOrder === 'number' ? data.sortOrder : 0)
            });
          });
          fetchedCats.sort((a, b) => (a.orderIndex ?? a.sortOrder ?? 0) - (b.orderIndex ?? b.sortOrder ?? 0));
          useAppStore.setState((state) => ({ 
            categories: fetchedCats,
            activeCategoryId: state.activeCategoryId && fetchedCats.some(c => c.id === state.activeCategoryId)
              ? state.activeCategoryId
              : (fetchedCats[0]?.id || '')
          }));
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, COLLECTIONS.CATEGORIES);
        });

        // 2. Real-time listener for SubCategories from 'subCategories'
        const subCatCol = collection(db, COLLECTIONS.SUBCATEGORIES);
        unsubscribeSubCategories = onSnapshot(subCatCol, { includeMetadataChanges: true }, (snapshot) => {
          if (snapshot.metadata && snapshot.metadata.fromCache) {
            console.log('[Firestore Sync] Skipping cached subcategories snapshot');
            return;
          }
          const fetchedSubs: SubCategory[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as any;
            fetchedSubs.push({
              id: data.id || doc.id,
              categoryId: data.categoryId || data.category || '',
              name: data.name || data.displayName || data.title || doc.id,
              iconName: data.iconName || data.icon || 'sparkles',
              thumbnailUrl: data.thumbnailUrl || data.imageUri || data.imageUrl || data.image || '',
              photoCount: typeof data.photoCount === 'number' ? data.photoCount : 0,
              sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
              orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : (typeof data.sortOrder === 'number' ? data.sortOrder : 0)
            });
          });
          fetchedSubs.sort((a, b) => (a.orderIndex ?? a.sortOrder ?? 0) - (b.orderIndex ?? b.sortOrder ?? 0));
          useAppStore.setState((state) => ({
            subCategories: fetchedSubs,
            activeSubCategoryId: state.activeSubCategoryId && fetchedSubs.some(s => s.id === state.activeSubCategoryId)
              ? state.activeSubCategoryId
              : (fetchedSubs.find(s => s.categoryId === state.activeCategoryId)?.id || fetchedSubs[0]?.id || '')
          }));
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, COLLECTIONS.SUBCATEGORIES);
        });

        // 3. Real-time listener for Products/Photos from 'photos'
        const photosCol = collection(db, COLLECTIONS.PHOTOS);
        unsubscribePhotos = onSnapshot(photosCol, { includeMetadataChanges: true }, (snapshot) => {
          if (snapshot.metadata && snapshot.metadata.fromCache) {
            console.log('[Firestore Sync] Skipping cached photos snapshot');
            return;
          }
          photosCollectionMap.clear();
          snapshot.forEach((doc) => {
            const photo = normalizePhoto(doc);
            photosCollectionMap.set(photo.id, photo);
          });
          updateMergedPhotos();
          setIsFirebaseConnected(true);
          setSyncStatus('synced');
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, COLLECTIONS.PHOTOS);
        });

        // 4. Real-time listener for Products/Photos from 'catalog_photos' (fallback collection)
        try {
          const catalogPhotosCol = collection(db, COLLECTIONS.CATALOG_PHOTOS);
          unsubscribeCatalogPhotos = onSnapshot(catalogPhotosCol, { includeMetadataChanges: true }, (snapshot) => {
            if (snapshot.metadata && snapshot.metadata.fromCache) {
              return;
            }
            catalogPhotosCollectionMap.clear();
            snapshot.forEach((doc) => {
              const photo = normalizePhoto(doc);
              catalogPhotosCollectionMap.set(photo.id, photo);
            });
            updateMergedPhotos();
            setIsFirebaseConnected(true);
            setSyncStatus('synced');
          }, (err) => {
            console.warn('catalog_photos collection listener skipped (reading directly from photos):', err.message);
          });
        } catch (e) {
          console.warn('catalog_photos listener init skipped:', e);
        }

        // 5. Real-time listener for Showroom Videos from 'showroomVideos'
        const showroomVideosCol = collection(db, COLLECTIONS.SHOWROOM_VIDEOS);
        unsubscribeShowroomVideos = onSnapshot(showroomVideosCol, { includeMetadataChanges: true }, (snapshot) => {
          if (snapshot.metadata && snapshot.metadata.fromCache) {
            return;
          }
          const fetchedVideos: ShowroomVideo[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as any;
            fetchedVideos.push({
              id: data.id || doc.id,
              videoUri: data.videoUri || data.videoUrl || data.video_url || data.video || data.url || data.mediaUrl || data.media_url || '',
              imageUri: data.imageUri || data.imageUrl || data.image_url || data.image || data.thumbnailUrl || data.poster || '',
              photoCode: data.photoCode || data.code || data.title || doc.id,
              subCategoryName: data.subCategoryName || data.subCategoryTitle || data.subCategory || '',
              subCategoryId: data.subCategoryId || data.subCategory || '',
              categoryId: data.categoryId || data.category || '',
              title: data.title || data.name || '',
              sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0
            });
          });
          fetchedVideos.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          useAppStore.setState({ showroomVideos: fetchedVideos });
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, COLLECTIONS.SHOWROOM_VIDEOS);
        });

        // 6. Real-time listener for Wholesale Orders from 'orders'
        const ordersCol = collection(db, COLLECTIONS.ORDERS);
        unsubscribeOrders = onSnapshot(ordersCol, { includeMetadataChanges: true }, (snapshot) => {
          if (snapshot.metadata && snapshot.metadata.fromCache) {
            return;
          }
          const fetchedOrders: WholesaleOrder[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as any;
            const orderTimestamp = data.createdAt?.toMillis 
              ? data.createdAt.toMillis() 
              : (typeof data.createdAt === 'number' ? data.createdAt : Date.now());

            fetchedOrders.push({
              orderId: data.orderId || data.id || doc.id,
              id: data.id || data.orderId || doc.id,
              customerId: data.customerId || data.customerCode || '',
              customerCode: data.customerCode || data.customerId || '',
              shopName: data.shopName || '',
              cityName: data.cityName || '',
              mobileNumber: data.mobileNumber || '',
              items: Array.isArray(data.items) ? data.items.map((item: any) => {
                const resolvedImage = 
                  item.imageUri || 
                  item.imageUrl || 
                  item.image || 
                  item.photo || 
                  (Array.isArray(item.images) && item.images[0]) || 
                  '';
                return {
                  ...item,
                  imageUri: resolvedImage,
                  imageUrl: resolvedImage, // Dual-key compatibility
                  photoCode: item.photoCode || item.code || item.name || 'SKU',
                  quantity: Number(item.quantity || 1)
                };
              }) : [],
              totalItemsCount: typeof data.totalItemsCount === 'number' 
                ? data.totalItemsCount 
                : (Array.isArray(data.items) ? data.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) : 0),
              totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : 0,
              orderNote: data.orderNote || data.notes || '',
              notes: data.notes || data.orderNote || '',
              voiceNoteUrl: data.voiceNoteUrl || data.voiceNoteUri || null,
              voiceNoteUri: data.voiceNoteUri || data.voiceNoteUrl || undefined,
              status: data.status || data.overallStatus || 'Pending',
              overallStatus: data.overallStatus || data.status || 'Pending',
              imitationStatus: data.imitationStatus || 'PENDING',
              cosmeticsStatus: data.cosmeticsStatus || 'PENDING',
              hairStatus: data.hairStatus || 'PENDING',
              createdAt: orderTimestamp
            });
          });
          fetchedOrders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          useAppStore.setState({ orders: fetchedOrders });
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, COLLECTIONS.ORDERS);
        });

        // 7. Real-time listener for Customers from 'customers'
        const customersCol = collection(db, COLLECTIONS.CUSTOMERS);
        unsubscribeCustomers = onSnapshot(customersCol, { includeMetadataChanges: true }, (snapshot) => {
          if (snapshot.metadata && snapshot.metadata.fromCache) {
            return;
          }
          if (!snapshot.empty) {
            const fetchedCust: Customer[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data() as any;
              const custId = data.customerId || data.customerCode || doc.id;
              fetchedCust.push({
                customerId: custId,
                customerCode: custId,
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
              });
            });
            useAppStore.setState({ customers: fetchedCust });

            // If current customer is selected, update it with fresh doc data
            const currentCust = useAppStore.getState().currentCustomer;
            if (currentCust) {
              const updatedCurrent = fetchedCust.find(c => 
                c.customerId === currentCust.customerId || c.customerCode === currentCust.customerCode
              );
              if (updatedCurrent) {
                useAppStore.setState({ currentCustomer: updatedCurrent });
              }
            }
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, COLLECTIONS.CUSTOMERS);
        });

        // 8. Real-time listener for Community Posts from 'community_posts'
        const communityCol = collection(db, COLLECTIONS.COMMUNITY_POSTS);
        unsubscribeCommunityPosts = onSnapshot(communityCol, { includeMetadataChanges: true }, (snapshot) => {
          if (snapshot.metadata && snapshot.metadata.fromCache) {
            return;
          }
          const fetchedPosts: CommunityPost[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as any;
            const postTimestamp = data.timestamp?.toMillis 
              ? data.timestamp.toMillis() 
              : (typeof data.timestamp === 'number' ? data.timestamp : (data.createdAt || Date.now()));

            fetchedPosts.push({
              postId: data.postId || data.id || doc.id,
              id: data.id || data.postId || doc.id,
              customerId: data.customerId || data.customerCode || '',
              customerCode: data.customerCode || data.customerId || '',
              shopName: data.shopName || '',
              imageUrl: data.imageUrl || data.image || '',
              caption: data.caption || data.message || data.text || '',
              likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
              likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
              timestamp: postTimestamp
            });
          });
          fetchedPosts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          useAppStore.setState({ communityPosts: fetchedPosts });
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, COLLECTIONS.COMMUNITY_POSTS);
        });

        // 9. Real-time listener for Chat Messages from 'chat_messages'
        const messagesCol = collection(db, COLLECTIONS.MESSAGES);
        unsubscribeMessages = onSnapshot(messagesCol, { includeMetadataChanges: true }, (snapshot) => {
          if (snapshot.metadata && snapshot.metadata.fromCache) {
            return;
          }
          chatMessagesMap.clear();
          snapshot.forEach((doc) => {
            const msg = normalizeMessage(doc);
            const msgKey = msg.id || msg.messageId || doc.id;
            chatMessagesMap.set(msgKey, msg);
          });
          updateMergedMessages();
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, COLLECTIONS.MESSAGES);
        });

        // 10. Real-time listener for alternate 'messages' collection
        try {
          const altMessagesCol = collection(db, 'messages');
          unsubscribeAltMessages = onSnapshot(altMessagesCol, { includeMetadataChanges: true }, (snapshot) => {
            if (snapshot.metadata && snapshot.metadata.fromCache) {
              return;
            }
            altMessagesMap.clear();
            snapshot.forEach((doc) => {
              const msg = normalizeMessage(doc);
              const msgKey = msg.id || msg.messageId || doc.id;
              altMessagesMap.set(msgKey, msg);
            });
            updateMergedMessages();
          }, () => {
            // Ignored if alternate collection is not present
          });
        } catch {}

        // 11. Real-time listener for 'broadcast_messages' collection
        try {
          const broadcastCol = collection(db, COLLECTIONS.BROADCAST_MESSAGES);
          unsubscribeBroadcasts = onSnapshot(broadcastCol, { includeMetadataChanges: true }, (snapshot) => {
            if (snapshot.metadata && snapshot.metadata.fromCache) {
              return;
            }
            const fetchedBroadcasts: any[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data() as any;
              const bTimestamp = data.timestamp?.toMillis 
                ? data.timestamp.toMillis() 
                : (typeof data.timestamp === 'number' ? data.timestamp : (data.createdAt || Date.now()));

              fetchedBroadcasts.push({
                id: doc.id,
                title: data.title || 'Announcement',
                message: data.message || data.text || '',
                imageUrl: data.imageUrl || data.imageUri || undefined,
                sender: data.sender || 'Admin',
                isReadByCustomer: data.isReadByCustomer || false,
                timestamp: bTimestamp
              });
            });
            fetchedBroadcasts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            useAppStore.setState({ broadcastMessages: fetchedBroadcasts });
          }, () => {
            // Ignored if broadcast collection not configured yet
          });
        } catch {}

      } catch (err) {
        console.error('Error in initSync:', err);
        setSyncStatus('error');
      }
    }

    initSync();

    return () => {
      if (unsubscribeCategories) unsubscribeCategories();
      if (unsubscribeSubCategories) unsubscribeSubCategories();
      if (unsubscribePhotos) unsubscribePhotos();
      if (unsubscribeCatalogPhotos) unsubscribeCatalogPhotos();
      if (unsubscribeShowroomVideos) unsubscribeShowroomVideos();
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribeCustomers) unsubscribeCustomers();
      if (unsubscribeCommunityPosts) unsubscribeCommunityPosts();
      if (unsubscribeMessages) unsubscribeMessages();
      if (unsubscribeAltMessages) unsubscribeAltMessages();
      if (unsubscribeBroadcasts) unsubscribeBroadcasts();
    };
  }, []);

  return { isFirebaseConnected, syncStatus };
}
