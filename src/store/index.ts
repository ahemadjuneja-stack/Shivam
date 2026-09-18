import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  MainCategory, 
  CategoryItem, 
  SubCategory, 
  CatalogPhoto, 
  ShowroomVideo, 
  Customer, 
  OrderCartItem, 
  WholesaleOrder, 
  ChatMessage, 
  CommunityPost,
  BroadcastMessage,
  getPhotoVariants
} from '../types';
import { 
  syncPhotoToFirebase, 
  deletePhotoFromFirebase, 
  syncCustomerToFirebase, 
  deleteCustomerFromFirebase,
  syncOrderToFirebase, 
  updateOrderStatusInFirebase, 
  deleteOrderFromFirebase,
  syncMessageToFirebase,
  markCustomerMessagesAsReadInFirebase,
  syncCommunityPostToFirebase,
  likeCommunityPostInFirebase,
  deleteCommunityPostFromFirebase,
  syncCategoryToFirebase,
  syncSubCategoryToFirebase,
  batchUpdateCategoriesOrder,
  batchUpdateSubCategoriesOrder,
  batchUpdatePhotosOrder
} from '../firebase';

interface AppState {
  // Catalog Data
  categories: CategoryItem[];
  subCategories: SubCategory[];
  photos: CatalogPhoto[];
  showroomVideos: ShowroomVideo[];
  customers: Customer[];
  orders: WholesaleOrder[];
  messages: ChatMessage[];
  broadcastMessages: BroadcastMessage[];
  communityPosts: CommunityPost[];
  
  // Navigation & Selection in Landscape Mode
  activeCategoryId: string;
  activeSubCategoryId: string;
  activePhotoId: string;
  showroomScreenMode: 'home' | 'subcategories' | 'gallery' | 'fullimage';

  // Cart & Customer State
  cart: OrderCartItem[];
  currentCustomer: Customer | null;
  isCartOpen: boolean;
  orderNote: string;
  orderVoiceNote: string | null;
  lastReadTimestamp: number;

  // Actions
  setShowroomScreenMode: (mode: 'home' | 'subcategories' | 'gallery' | 'fullimage') => void;
  setActiveCategory: (categoryId: string) => void;
  setActiveSubCategory: (subCategoryId: string) => void;
  setActivePhoto: (photoId: string) => void;
  setIsCartOpen: (open: boolean) => void;
  setOrderNote: (note: string) => void;
  setOrderVoiceNote: (uri: string | null) => void;
  markMessagesAsRead: () => void;

  addToCart: (item: OrderCartItem) => void;
  setItemQuantity: (photo: CatalogPhoto, optionLetter: string, quantity: number) => void;
  updateCartItemQuantity: (index: number, quantity: number) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  setCurrentCustomer: (customer: Customer | null) => void;
  placeOrder: () => void;
  addMessage: (message: ChatMessage) => void;
  
  // Community Actions
  addCommunityPost: (post: CommunityPost) => void;
  toggleLikeCommunityPost: (postId: string, customerId: string) => void;
  deleteCommunityPost: (postId: string) => void;

  // Admin & Customer Actions
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customerId: string, data: Partial<Customer>) => void;
  deleteCustomer: (customerId: string) => void;
  deleteOrder: (orderId: string) => void;
  updateOrderStatus: (orderId: string, department: 'imitation' | 'cosmetics' | 'hair', status: string) => void;
  addCategory: (category: CategoryItem) => void;
  addSubCategory: (subCategory: SubCategory) => void;
  addPhoto: (photo: CatalogPhoto) => void;
  updatePhoto: (photoId: string, data: Partial<CatalogPhoto>) => void;
  deletePhoto: (photoId: string) => void;
  reorderCategories: (categories: CategoryItem[]) => void;
  reorderSubCategories: (subCategories: SubCategory[]) => void;
  reorderPhotos: (photos: CatalogPhoto[]) => void;
  resetToDefaults: () => void;
}

export const defaultCategories: CategoryItem[] = [
  { 
    id: MainCategory.COSMETICS, 
    displayName: 'Cosmetics', 
    thumbnailUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=600', 
    accentColorHex: '#EC4899', 
    sortOrder: 1 
  },
  { 
    id: MainCategory.IMITATION, 
    displayName: 'Imitation Jewelry', 
    thumbnailUrl: 'https://images.unsplash.com/photo-1599643478514-4a410f0a82ef?auto=format&fit=crop&q=80&w=600', 
    accentColorHex: '#F59E0B', 
    sortOrder: 2 
  },
  { 
    id: MainCategory.HAIR_ACCESSORIES, 
    displayName: 'Hair Accessories', 
    thumbnailUrl: 'https://images.unsplash.com/photo-1606214532675-80277bd28bd9?auto=format&fit=crop&q=80&w=600', 
    accentColorHex: '#38BDF8', 
    sortOrder: 3 
  }
];

export const defaultSubCategories: SubCategory[] = [
  // Imitation
  { id: 'sub-earrings', categoryId: MainCategory.IMITATION, name: 'Earrings & Jhumkas', iconName: 'sparkles', thumbnailUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=600', photoCount: 3, sortOrder: 1 },
  { id: 'sub-bangles', categoryId: MainCategory.IMITATION, name: 'Bangles & Kadas', iconName: 'circle', thumbnailUrl: 'https://images.unsplash.com/photo-1611591475806-03f13f1737be?auto=format&fit=crop&q=80&w=600', photoCount: 2, sortOrder: 2 },
  { id: 'sub-necklaces', categoryId: MainCategory.IMITATION, name: 'Choker & Necklace Sets', iconName: 'gem', thumbnailUrl: 'https://images.unsplash.com/photo-1599643478514-4a410f0a82ef?auto=format&fit=crop&q=80&w=600', photoCount: 1, sortOrder: 3 },
  
  // Cosmetics
  { id: 'sub-lipsticks', categoryId: MainCategory.COSMETICS, name: 'Matte & Liquid Lipsticks', iconName: 'heart', thumbnailUrl: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=600', photoCount: 2, sortOrder: 1 },
  { id: 'sub-nailpolish', categoryId: MainCategory.COSMETICS, name: 'Nail Lacquer & Gel Polish', iconName: 'sparkles', thumbnailUrl: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&q=80&w=600', photoCount: 1, sortOrder: 2 },
  { id: 'sub-eyemakeup', categoryId: MainCategory.COSMETICS, name: 'Kajal & Liquid Liner', iconName: 'eye', thumbnailUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=600', photoCount: 1, sortOrder: 3 },

  // Hair Accessories
  { id: 'sub-clawclips', categoryId: MainCategory.HAIR_ACCESSORIES, name: 'Korean Claw Clips', iconName: 'scissors', thumbnailUrl: 'https://images.unsplash.com/photo-1606214532675-80277bd28bd9?auto=format&fit=crop&q=80&w=600', photoCount: 2, sortOrder: 1 },
  { id: 'sub-scrunchies', categoryId: MainCategory.HAIR_ACCESSORIES, name: 'Silk Scrunchies & Bands', iconName: 'circle-dot', thumbnailUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=600', photoCount: 1, sortOrder: 2 }
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      categories: defaultCategories,
      subCategories: defaultSubCategories,
      photos: [],
      showroomVideos: [],
      customers: [],
      orders: [],
      messages: [],
      broadcastMessages: [],
      communityPosts: [],
      
      activeCategoryId: MainCategory.IMITATION,
      activeSubCategoryId: 'sub-earrings',
      activePhotoId: '',
      showroomScreenMode: 'home',

      cart: [],
      currentCustomer: null,
      isCartOpen: false,
      orderNote: '',
      orderVoiceNote: null,
      lastReadTimestamp: Date.now(),

      setShowroomScreenMode: (mode) => set({ showroomScreenMode: mode }),
      setOrderNote: (note) => set({ orderNote: note }),
      setOrderVoiceNote: (uri) => set({ orderVoiceNote: uri }),
      markMessagesAsRead: () => {
        const custId = get().currentCustomer?.customerId || get().currentCustomer?.customerCode;
        if (custId) {
          markCustomerMessagesAsReadInFirebase(custId).catch(console.error);
        }
        set((state) => ({
          lastReadTimestamp: Date.now(),
          messages: state.messages.map((m) => {
            const mCust = m.customerId || m.customerCode;
            if (mCust === custId && m.sender === 'admin') {
              return { ...m, isRead: true };
            }
            return m;
          }),
          broadcastMessages: state.broadcastMessages.map((b) => ({
            ...b,
            isReadByCustomer: true
          }))
        }));
      },

      setActiveCategory: (categoryId) => set((state) => {
        const firstSub = state.subCategories.find(s => s.categoryId === categoryId);
        const subId = firstSub ? firstSub.id : '';
        const firstPhoto = state.photos.find(p => p.subCategoryId === subId);
        return {
          activeCategoryId: categoryId,
          activeSubCategoryId: subId,
          activePhotoId: firstPhoto ? firstPhoto.id : ''
        };
      }),

      setActiveSubCategory: (subCategoryId) => set((state) => {
        const firstPhoto = state.photos.find(p => p.subCategoryId === subCategoryId);
        return {
          activeSubCategoryId: subCategoryId,
          activePhotoId: firstPhoto ? firstPhoto.id : ''
        };
      }),

      setActivePhoto: (photoId) => set({ activePhotoId: photoId }),

      setIsCartOpen: (open) => set({ isCartOpen: open }),

      addToCart: (item) => set((state) => ({ cart: [...state.cart, item] })),
      setItemQuantity: (photo, optionLetter, quantity) => set((state) => {
        const existingIdx = state.cart.findIndex(i => i.photoId === photo.id && i.optionLetter === optionLetter);
        if (quantity <= 0) {
          if (existingIdx !== -1) {
            const updated = [...state.cart];
            updated.splice(existingIdx, 1);
            return { cart: updated };
          }
          return state;
        }

        const variants = getPhotoVariants(photo);
        const variantObj = variants.find(v => v.key === optionLetter);
        const minQty = variantObj ? variantObj.defaultQuantity : (photo.defaultQuantity || 6);

        if (existingIdx !== -1) {
          const updated = [...state.cart];
          updated[existingIdx] = { ...updated[existingIdx], quantity, defaultQuantity: minQty };
          return { cart: updated };
        } else {
          const newItem: OrderCartItem = {
            photoId: photo.id,
            photoCode: photo.photoCode,
            imageUri: photo.imageUri,
            categoryId: photo.categoryId,
            subCategoryName: photo.subCategoryName,
            optionLetter,
            quantity,
            defaultQuantity: minQty,
            id: `${photo.id}_${optionLetter}`,
            name: `${photo.photoCode} (Option ${optionLetter})`,
            variant: optionLetter,
            price: 0
          };
          return { cart: [...state.cart, newItem] };
        }
      }),
      updateCartItemQuantity: (index, quantity) => set((state) => {
        if (index < 0 || index >= state.cart.length) return state;
        if (quantity <= 0) {
          const newCart = [...state.cart];
          newCart.splice(index, 1);
          return { cart: newCart };
        }
        const newCart = [...state.cart];
        newCart[index] = { ...newCart[index], quantity };
        return { cart: newCart };
      }),
      removeFromCart: (index) => set((state) => {
        const newCart = [...state.cart];
        newCart.splice(index, 1);
        return { cart: newCart };
      }),
      clearCart: () => set({ cart: [] }),
      setCurrentCustomer: (customer) => set({ currentCustomer: customer }),

      placeOrder: () => set((state) => {
        if (!state.currentCustomer || state.cart.length === 0) return state;
        
        const hasImitation = state.cart.some(item => item.categoryId === MainCategory.IMITATION);
        const hasCosmetics = state.cart.some(item => item.categoryId === MainCategory.COSMETICS);
        const hasHair = state.cart.some(item => item.categoryId === MainCategory.HAIR_ACCESSORIES);

        const orderIdNumber = `ORD-${Math.floor(Math.random() * 90000) + 10000}`;
        const custId = state.currentCustomer.customerId || state.currentCustomer.customerCode || 'CUST-GUEST';

        const standardizedItems = state.cart.map(item => ({
          id: `${item.photoId}_${item.optionLetter}`,
          photoCode: item.photoCode,
          name: `${item.photoCode} (Option ${item.optionLetter} - ${item.subCategoryName})`,
          quantity: item.quantity,
          variant: item.optionLetter,
          price: 0,
          photoId: item.photoId,
          imageUri: item.imageUri,
          categoryId: item.categoryId,
          subCategoryName: item.subCategoryName,
          optionLetter: item.optionLetter
        }));

        const newOrder: WholesaleOrder = {
          orderId: orderIdNumber,
          id: orderIdNumber,
          orderNumber: orderIdNumber,
          customerId: custId,
          customerCode: custId,
          shopName: state.currentCustomer.shopName,
          cityName: state.currentCustomer.city || state.currentCustomer.cityName || '',
          mobileNumber: state.currentCustomer.phone || state.currentCustomer.mobileNumber || '',
          items: standardizedItems,
          totalItemsCount: state.cart.reduce((sum, item) => sum + item.quantity, 0),
          totalAmount: 0,
          orderNote: state.orderNote || '',
          notes: state.orderNote || '',
          voiceNoteUrl: state.orderVoiceNote || null,
          voiceNoteUri: state.orderVoiceNote || undefined,
          status: 'Pending',
          overallStatus: 'RECEIVED',
          imitationStatus: hasImitation ? 'PENDING' : 'NOT_APPLICABLE',
          cosmeticsStatus: hasCosmetics ? 'PENDING' : 'NOT_APPLICABLE',
          hairStatus: hasHair ? 'PENDING' : 'NOT_APPLICABLE',
          createdAt: Date.now()
        };

        // Sync new order to Firebase Firestore in real-time
        syncOrderToFirebase(newOrder).catch((e) => console.error('Firebase sync error for new order:', e));

        return {
          orders: [newOrder, ...state.orders],
          cart: [],
          orderNote: '',
          orderVoiceNote: null,
          isCartOpen: false
        };
      }),

      addMessage: (message) => {
        syncMessageToFirebase(message).catch((e) => console.error('Firebase sync error for message:', e));
        set((state) => ({
          messages: [...state.messages, message]
        }));
      },

      addCommunityPost: (post) => {
        syncCommunityPostToFirebase(post).catch((e) => console.error('Firebase sync error for community post:', e));
        set((state) => ({
          communityPosts: [post, ...state.communityPosts]
        }));
      },

      toggleLikeCommunityPost: (postId, customerId) => {
        const post = get().communityPosts.find(p => p.postId === postId || p.id === postId);
        if (!post) return;
        
        const likedBy = post.likedBy || [];
        const isCurrentlyLiked = likedBy.includes(customerId);
        const newLikedBy = isCurrentlyLiked 
          ? likedBy.filter(id => id !== customerId)
          : [...likedBy, customerId];
        const newLikesCount = Math.max(0, (post.likesCount || 0) + (isCurrentlyLiked ? -1 : 1));

        likeCommunityPostInFirebase(postId, customerId, isCurrentlyLiked).catch((e) => 
          console.error('Firebase like post error:', e)
        );

        set((state) => ({
          communityPosts: state.communityPosts.map(p => 
            (p.postId === postId || p.id === postId) 
              ? { ...p, likesCount: newLikesCount, likedBy: newLikedBy } 
              : p
          )
        }));
      },

      deleteCommunityPost: (postId) => {
        deleteCommunityPostFromFirebase(postId).catch((e) => console.error('Firebase delete post error:', e));
        set((state) => ({
          communityPosts: state.communityPosts.filter(p => p.postId !== postId && p.id !== postId)
        }));
      },

      addCustomer: (customer) => {
        syncCustomerToFirebase(customer).catch((e) => console.error('Firebase sync error for customer:', e));
        set((state) => ({ customers: [...state.customers, customer] }));
      },

      updateCustomer: (customerKey, data) => {
        const customer = get().customers.find(c => c.customerId === customerKey || c.customerCode === customerKey);
        if (customer) {
          const updated = { ...customer, ...data };
          syncCustomerToFirebase(updated).catch((e) => console.error('Firebase sync error on customer update:', e));
        }
        set((state) => ({
          customers: state.customers.map(c => 
            (c.customerId === customerKey || c.customerCode === customerKey) 
              ? { ...c, ...data } 
              : c
          ),
          currentCustomer: (state.currentCustomer?.customerId === customerKey || state.currentCustomer?.customerCode === customerKey)
            ? { ...state.currentCustomer, ...data }
            : state.currentCustomer
        }));
      },

      deleteCustomer: (customerKey) => {
        deleteCustomerFromFirebase(customerKey).catch((e) => console.error('Firebase sync error on deleteCustomer:', e));
        set((state) => ({
          customers: state.customers.filter(c => c.customerId !== customerKey && c.customerCode !== customerKey),
          currentCustomer: (state.currentCustomer?.customerId === customerKey || state.currentCustomer?.customerCode === customerKey)
            ? null
            : state.currentCustomer
        }));
      },

      deleteOrder: (orderId) => {
        deleteOrderFromFirebase(orderId).catch((e) => console.error('Firebase sync error on deleteOrder:', e));
        set((state) => ({
          orders: state.orders.filter(o => o.orderId !== orderId && o.id !== orderId)
        }));
      },
      
      updateOrderStatus: (orderId, department, status) => {
        let updatedOrderToSync: WholesaleOrder | null = null;
        set((state) => {
          const newOrders = state.orders.map(order => {
            if (order.id !== orderId && order.orderId !== orderId) return order;
            const updated = { ...order };
            if (department === 'imitation') updated.imitationStatus = status;
            if (department === 'cosmetics') updated.cosmeticsStatus = status;
            if (department === 'hair') updated.hairStatus = status;
            
            const statuses = [updated.imitationStatus, updated.cosmeticsStatus, updated.hairStatus].filter(s => s !== 'NOT_APPLICABLE');
            if (statuses.every(s => s === 'DONE')) {
              updated.overallStatus = 'READY_TO_SHIP';
              updated.status = 'Dispatched';
            } else if (statuses.some(s => s === 'DONE')) {
              updated.overallStatus = 'PARTIALLY_PACKED';
              updated.status = 'Processing';
            } else {
              updated.overallStatus = 'RECEIVED';
              updated.status = 'Pending';
            }
            updatedOrderToSync = updated;
            return updated;
          });
          return { orders: newOrders };
        });

        if (updatedOrderToSync) {
          updateOrderStatusInFirebase(orderId, updatedOrderToSync).catch((e) => 
            console.error('Firebase order status update error:', e)
          );
        }
      },

      addCategory: (category) => {
        const current = get().categories;
        const maxIndex = current.reduce((m, c) => Math.max(m, c.orderIndex ?? c.sortOrder ?? 0), -1);
        const newCat = { ...category, orderIndex: maxIndex + 1, sortOrder: maxIndex + 2 };
        syncCategoryToFirebase(newCat).catch((e) => console.error('Firebase sync error on addCategory:', e));
        set((state) => ({ categories: [...state.categories, newCat] }));
      },

      addSubCategory: (subCategory) => {
        const current = get().subCategories;
        const maxIndex = current.reduce((m, s) => Math.max(m, s.orderIndex ?? s.sortOrder ?? 0), -1);
        const newSub = { ...subCategory, orderIndex: maxIndex + 1, sortOrder: maxIndex + 2 };
        syncSubCategoryToFirebase(newSub).catch((e) => console.error('Firebase sync error on addSubCategory:', e));
        set((state) => ({ subCategories: [...state.subCategories, newSub] }));
      },

      addPhoto: (photo) => {
        const current = get().photos;
        const maxIndex = current.reduce((m, p) => Math.max(m, p.orderIndex ?? p.sortOrder ?? 0), -1);
        const newPhoto = { ...photo, orderIndex: maxIndex + 1, sortOrder: maxIndex + 2 };
        syncPhotoToFirebase(newPhoto).catch((e) => console.error('Firebase sync error on addPhoto:', e));
        set((state) => ({ photos: [...state.photos, newPhoto] }));
      },

      reorderCategories: (categories) => {
        const updated = categories.map((c, idx) => ({ ...c, orderIndex: idx, sortOrder: idx + 1 }));
        set({ categories: updated });
        batchUpdateCategoriesOrder(updated).catch((e) => console.error('Firebase batch update categories order error:', e));
      },

      reorderSubCategories: (subCategories) => {
        const updated = subCategories.map((s, idx) => ({ ...s, orderIndex: idx, sortOrder: idx + 1 }));
        set({ subCategories: updated });
        batchUpdateSubCategoriesOrder(updated).catch((e) => console.error('Firebase batch update subcategories order error:', e));
      },

      reorderPhotos: (photos) => {
        const updated = photos.map((p, idx) => ({ ...p, orderIndex: idx, sortOrder: idx + 1 }));
        set({ photos: updated });
        batchUpdatePhotosOrder(updated).catch((e) => console.error('Firebase batch update photos order error:', e));
      },

      updatePhoto: (photoId, data) => {
        const targetPhoto = get().photos.find(p => p.id === photoId);
        if (targetPhoto) {
          const updated = { ...targetPhoto, ...data };
          syncPhotoToFirebase(updated).catch((e) => console.error('Firebase sync error on updatePhoto:', e));
        }
        set((state) => ({
          photos: state.photos.map(p => p.id === photoId ? { ...p, ...data } : p)
        }));
      },

      deletePhoto: (photoId) => {
        deletePhotoFromFirebase(photoId).catch((e) => console.error('Firebase sync error on deletePhoto:', e));
        set((state) => ({
          photos: state.photos.filter(p => p.id !== photoId)
        }));
      },

      resetToDefaults: () => {
        set({
          categories: defaultCategories,
          subCategories: defaultSubCategories,
          photos: [],
          showroomVideos: [],
          communityPosts: [],
          activeCategoryId: MainCategory.IMITATION,
          activeSubCategoryId: 'sub-earrings',
          activePhotoId: ''
        });
      }
    }),
    {
      name: 'shivam-wholesale-clean-v7',
      version: 7,
    }
  )
);
