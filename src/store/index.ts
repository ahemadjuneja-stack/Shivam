import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MainCategory, CategoryItem, SubCategory, CatalogPhoto, Customer, OrderCartItem, WholesaleOrder, ShowroomVideo, CommunityPost } from '../types';
import { 
  syncOrderToFirebase, 
  deleteOrderFromFirebase, 
  syncCategoryToFirebase, 
  deleteCategoryFromFirebase, 
  syncSubCategoryToFirebase, 
  deleteSubCategoryFromFirebase,
  syncChatMessageToFirebase,
  markMessagesAsReadInFirebase,
  syncCommunityPostToFirebase,
  deleteCommunityPostFromFirebase,
  syncCustomerToFirebase,
  deleteCustomerFromFirebase,
  syncPhotoToFirebase,
  toggleProductHideInFirebase,
  deletePhotoFromFirebase,
  syncShowroomVideoToFirebase,
  deleteShowroomVideoFromFirebase
} from '../services/firebaseSync';

interface AppState {
  // Catalog Data
  categories: CategoryItem[];
  subCategories: SubCategory[];
  photos: CatalogPhoto[];
  showroomVideos: ShowroomVideo[];
  customers: Customer[];
  orders: WholesaleOrder[];
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

  // Chat State
  chatMessages: import('../types').ChatMessage[];
  sendMessage: (msg: import('../types').ChatMessage) => void;
  markMessagesAsRead: (customerCode: string) => void;
  setChatMessages: (messages: import('../types').ChatMessage[]) => void;

  // Community Posts State
  setCommunityPosts: (posts: CommunityPost[]) => void;
  addCommunityPost: (post: CommunityPost) => void;
  deleteCommunityPost: (postId: string) => void;

  // Firebase Real-time State
  firebaseConnected: boolean;
  firebaseSyncing: boolean;
  setFirebaseConnected: (status: boolean) => void;
  setFirebaseSyncing: (syncing: boolean) => void;
  setOrders: (orders: WholesaleOrder[]) => void;
  setCategories: (categories: CategoryItem[]) => void;
  setSubCategories: (subCategories: SubCategory[]) => void;
  setPhotos: (photos: CatalogPhoto[]) => void;
  setShowroomVideos: (videos: ShowroomVideo[]) => void;
  videosLoaded: boolean;
  setVideosLoaded: (loaded: boolean) => void;
  catalogDataLoaded: boolean;
  setCatalogDataLoaded: (loaded: boolean) => void;
  ordersLoaded: boolean;
  setOrdersLoaded: (loaded: boolean) => void;
  customersLoaded: boolean;
  setCustomersLoaded: (loaded: boolean) => void;
  chatLoaded: boolean;
  setChatLoaded: (loaded: boolean) => void;
  setCustomers: (customers: Customer[]) => void;

  // Actions
  setShowroomScreenMode: (mode: 'home' | 'subcategories' | 'gallery' | 'fullimage') => void;
  setActiveCategory: (categoryId: string) => void;
  setActiveSubCategory: (subCategoryId: string) => void;
  setActivePhoto: (photoId: string) => void;
  setIsCartOpen: (open: boolean) => void;

  addToCart: (item: OrderCartItem) => void;
  setItemQuantity: (photo: CatalogPhoto, optionLetter: string, quantity: number) => void;
  updateCartItemQuantity: (index: number, quantity: number) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  setCurrentCustomer: (customer: Customer | null) => void;
  placeOrder: (options?: { notes?: string; voiceNoteUrl?: string }) => void;
  
  // Admin Actions
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customerCode: string, data: Partial<Customer>) => void;
  deleteCustomer: (customerCode: string) => void;
  addOrder: (order: WholesaleOrder) => void;
  toggleOrderStatus: (orderId: string) => void;
  updateOrderNotes: (orderId: string, notes: string) => void;
  updateOrderStatus: (orderId: string, department: 'imitation' | 'cosmetics' | 'hair', status: string) => void;
  updateOverallOrderStatus: (orderId: string, status: string) => void;
  packAllDepartments: (orderId: string) => void;
  deleteOrder: (orderId: string) => void;
  addPhoto: (photo: CatalogPhoto) => void;
  addMultiplePhotos: (photos: CatalogPhoto[]) => void;
  reorderPhotos: (orderedPhotos: CatalogPhoto[]) => void;
  addSubCategory: (subCat: SubCategory) => void;
  addCategory: (category: CategoryItem) => void;
  updateCategory: (categoryId: string, data: Partial<CategoryItem>) => void;
  deleteCategory: (categoryId: string) => void;
  updateSubCategory: (subCategoryId: string, data: Partial<SubCategory>) => void;
  deleteSubCategory: (subCategoryId: string) => void;
  updatePhoto: (photoId: string, data: Partial<CatalogPhoto>) => void;
  deletePhoto: (photoId: string) => void;
  batchSetStock: (photoId: string, available: boolean) => void;
  addShowroomVideo: (video: ShowroomVideo) => void;
  addMultipleShowroomVideos: (videos: ShowroomVideo[]) => void;
  deleteShowroomVideo: (videoId: string) => void;
  updateShowroomVideo: (videoId: string, updates: Partial<ShowroomVideo>) => void;
  reorderShowroomVideos: (videos: ShowroomVideo[]) => void;
  resetToDefaults: () => void;
}

export const defaultCategories: CategoryItem[] = [];
export const defaultSubCategories: SubCategory[] = [];
export const defaultShowroomVideos: ShowroomVideo[] = [];
export const defaultPhotos: CatalogPhoto[] = [];

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      categories: [],
      subCategories: [],
      photos: [],
      showroomVideos: [],
      customers: [],
      orders: [],
      communityPosts: [],
      
      activeCategoryId: MainCategory.IMITATION,
      activeSubCategoryId: '',
      activePhotoId: '',
      showroomScreenMode: 'home',

      cart: [],
      currentCustomer: null,
      isCartOpen: false,

      // Initial Chat State
      chatMessages: [],

      sendMessage: (msg) => {
        syncChatMessageToFirebase(msg);
        set((state) => ({
          chatMessages: [...state.chatMessages, msg]
        }));
      },

      markMessagesAsRead: (customerCode) => {
        markMessagesAsReadInFirebase(customerCode);
        set((state) => ({
          chatMessages: state.chatMessages.map(m => 
            m.customerCode === customerCode && m.sender === 'CUSTOMER' ? { ...m, isRead: true } : m
          )
        }));
      },

      setChatMessages: (messages) => set({ chatMessages: messages }),

      // Community Posts Actions
      setCommunityPosts: (posts) => set({ communityPosts: posts }),
      addCommunityPost: (post) => {
        syncCommunityPostToFirebase(post);
        set((state) => ({
          communityPosts: [post, ...state.communityPosts]
        }));
      },
      deleteCommunityPost: (postId) => {
        deleteCommunityPostFromFirebase(postId);
        set((state) => ({
          communityPosts: state.communityPosts.filter(p => p.id !== postId)
        }));
      },

      // Firebase state & setters
      firebaseConnected: false,
      firebaseSyncing: false,
      setFirebaseConnected: (status) => set({ firebaseConnected: status }),
      setFirebaseSyncing: (syncing) => set({ firebaseSyncing: syncing }),
      setOrders: (newOrders) => set({ orders: newOrders }),
      setCategories: (newCategories) => set({ categories: newCategories }),
      setSubCategories: (newSubCategories) => set({ subCategories: newSubCategories }),
      setPhotos: (newPhotos) => set({ photos: newPhotos }),
      setShowroomVideos: (newVideos) => set({ showroomVideos: newVideos }),
      videosLoaded: false,
      setVideosLoaded: (loaded) => set({ videosLoaded: loaded }),
      catalogDataLoaded: false,
      setCatalogDataLoaded: (loaded) => set({ catalogDataLoaded: loaded }),
      ordersLoaded: false,
      setOrdersLoaded: (loaded) => set({ ordersLoaded: loaded }),
      customersLoaded: false,
      setCustomersLoaded: (loaded) => set({ customersLoaded: loaded }),
      chatLoaded: false,
      setChatLoaded: (loaded) => set({ chatLoaded: loaded }),
      setCustomers: (newCustomers) => set({ customers: newCustomers }),

      setShowroomScreenMode: (mode) => set({ showroomScreenMode: mode }),

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
        const existingIdx = state.cart.findIndex(
          i => i.photoId === photo.id && i.optionLetter === optionLetter
        );
        if (quantity <= 0) {
          if (existingIdx !== -1) {
            const updated = [...state.cart];
            updated.splice(existingIdx, 1);
            return { cart: updated };
          }
          return state;
        }

        if (existingIdx !== -1) {
          const updated = [...state.cart];
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity
          };
          return { cart: updated };
        } else {
          const newItem: OrderCartItem = {
            photoId: photo.id,
            photoCode: photo.photoCode,
            imageUri: photo.imageUri,
            categoryId: photo.categoryId,
            subCategoryName: photo.subCategoryName,
            optionLetter,
            quantity
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

      placeOrder: (options) => set((state) => {
        if (!state.currentCustomer || state.cart.length === 0) return state;
        
        const hasImitation = state.cart.some(item => item.categoryId === MainCategory.IMITATION);
        const hasCosmetics = state.cart.some(item => item.categoryId === MainCategory.COSMETICS);
        const hasHair = state.cart.some(item => item.categoryId === MainCategory.HAIR_ACCESSORIES);

        const today = new Date();
        const d = String(today.getDate()).padStart(2, '0');
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const y = today.getFullYear();
        const dateFormatted = `${d}-${m}-${y}`;

        const newOrder: WholesaleOrder = {
          id: Date.now().toString(),
          orderNumber: `ORD-${Math.floor(Math.random() * 90000) + 10000}`,
          customerCode: state.currentCustomer.customerCode,
          shopName: state.currentCustomer.shopName,
          cityName: state.currentCustomer.cityName,
          mobileNumber: state.currentCustomer.mobileNumber,
          items: [...state.cart],
          totalItemsCount: state.cart.reduce((sum, item) => sum + item.quantity, 0),
          imitationStatus: hasImitation ? 'PENDING' : 'NOT_APPLICABLE',
          cosmeticsStatus: hasCosmetics ? 'PENDING' : 'NOT_APPLICABLE',
          hairStatus: hasHair ? 'PENDING' : 'NOT_APPLICABLE',
          overallStatus: 'PENDING',
          notes: options?.notes ? options.notes.trim() : 'No Note',
          voiceNoteUrl: options?.voiceNoteUrl,
          createdAt: Date.now(),
          source: 'CUSTOMER',
          dateFormatted
        };

        syncOrderToFirebase(newOrder);

        return {
          orders: [newOrder, ...state.orders],
          cart: [],
          isCartOpen: false
        };
      }),

      addOrder: (newOrder) => {
        syncOrderToFirebase(newOrder);
        set((state) => ({
          orders: [newOrder, ...state.orders]
        }));
      },

      toggleOrderStatus: (orderId) => set((state) => {
        const updatedOrders = state.orders.map(o => {
          if (o.id !== orderId) return o;
          const nextStatus = (o.overallStatus === 'DONE' || o.overallStatus === 'READY_TO_SHIP') ? 'PENDING' : 'DONE';
          const updated = {
            ...o,
            overallStatus: nextStatus,
            imitationStatus: o.imitationStatus !== 'NOT_APPLICABLE' ? nextStatus : 'NOT_APPLICABLE',
            cosmeticsStatus: o.cosmeticsStatus !== 'NOT_APPLICABLE' ? nextStatus : 'NOT_APPLICABLE',
            hairStatus: o.hairStatus !== 'NOT_APPLICABLE' ? nextStatus : 'NOT_APPLICABLE'
          };
          syncOrderToFirebase(updated);
          return updated;
        });
        return { orders: updatedOrders };
      }),

      updateOrderNotes: (orderId, notes) => set((state) => {
        const updatedOrders = state.orders.map(o => {
          if (o.id === orderId) {
            const updated = { ...o, notes };
            syncOrderToFirebase(updated);
            return updated;
          }
          return o;
        });
        return { orders: updatedOrders };
      }),

      addCustomer: (customer) => {
        syncCustomerToFirebase(customer);
        set((state) => ({ customers: [...state.customers, customer] }));
      },

      updateCustomer: (customerCode, data) => set((state) => {
        const updatedCustomers = state.customers.map(c => {
          if (c.customerCode === customerCode) {
            const updated = { ...c, ...data };
            syncCustomerToFirebase(updated);
            return updated;
          }
          return c;
        });
        return { customers: updatedCustomers };
      }),

      deleteCustomer: (customerCode) => {
        deleteCustomerFromFirebase(customerCode);
        set((state) => ({
          customers: state.customers.filter(c => c.customerCode !== customerCode),
          orders: state.orders.filter(o => o.customerCode !== customerCode)
        }));
      },
      
      updateOrderStatus: (orderId, department, status) => set((state) => {
        const newOrders = state.orders.map(order => {
          if (order.id !== orderId) return order;
          const updated = { ...order };
          if (department === 'imitation') updated.imitationStatus = status;
          if (department === 'cosmetics') updated.cosmeticsStatus = status;
          if (department === 'hair') updated.hairStatus = status;
          
          const statuses = [updated.imitationStatus, updated.cosmeticsStatus, updated.hairStatus].filter(s => s !== 'NOT_APPLICABLE');
          if (statuses.every(s => s === 'DONE')) {
            updated.overallStatus = 'DONE';
          } else if (statuses.some(s => s === 'DONE')) {
            updated.overallStatus = 'PARTIALLY_PACKED';
          } else {
            updated.overallStatus = 'PENDING';
          }

          const packedVal = status === 'DONE' ? 'Done' : 'Pending';
          updated.departmentStatus = {
            ...((order as any).departmentStatus || {}),
            [department === 'imitation' ? 'imitation' : department === 'cosmetics' ? 'cosmetic' : 'hair']: { status: packedVal, packedBy: 'Shivam Staff', packedAt: status === 'DONE' ? Date.now() : 0 }
          };

          syncOrderToFirebase(updated);
          return updated;
        });
        return { orders: newOrders };
      }),

      updateOverallOrderStatus: (orderId, status) => set((state) => {
        const updatedOrders = state.orders.map(o => {
          if (o.id === orderId) {
            const updated = { ...o, overallStatus: status };
            syncOrderToFirebase(updated);
            return updated;
          }
          return o;
        });
        return { orders: updatedOrders };
      }),

      packAllDepartments: (orderId) => set((state) => {
        const updatedOrders = state.orders.map(order => {
          if (order.id !== orderId) return order;
          const updated = {
            ...order,
            imitationStatus: order.imitationStatus !== 'NOT_APPLICABLE' ? 'DONE' : 'NOT_APPLICABLE',
            cosmeticsStatus: order.cosmeticsStatus !== 'NOT_APPLICABLE' ? 'DONE' : 'NOT_APPLICABLE',
            hairStatus: order.hairStatus !== 'NOT_APPLICABLE' ? 'DONE' : 'NOT_APPLICABLE',
            overallStatus: 'DONE'
          };
          syncOrderToFirebase(updated);
          return updated;
        });
        return { orders: updatedOrders };
      }),

      deleteOrder: (orderId) => {
        deleteOrderFromFirebase(orderId);
        set((state) => ({
          orders: state.orders.filter(o => o.id !== orderId)
        }));
      },

      addPhoto: (photo) => {
        syncPhotoToFirebase(photo);
        set((state) => ({ photos: [...state.photos, photo] }));
      },

      addMultiplePhotos: (newPhotos) => {
        newPhotos.forEach(p => syncPhotoToFirebase(p));
        set((state) => ({
          photos: [...state.photos, ...newPhotos]
        }));
      },

      reorderPhotos: (orderedPhotos) => {
        orderedPhotos.forEach(p => syncPhotoToFirebase(p));
        set({ photos: orderedPhotos });
      },

      addSubCategory: (subCat) => {
        syncSubCategoryToFirebase(subCat);
        set((state) => {
          if (state.subCategories.some(s => s.id === subCat.id)) return state;
          return { subCategories: [...state.subCategories, subCat] };
        });
      },
      addCategory: (category) => {
        syncCategoryToFirebase(category);
        set((state) => ({
          categories: [...state.categories, category]
        }));
      },
      updateCategory: (categoryId, data) => set((state) => {
        const updatedCategories = state.categories.map(c => {
          if (c.id === categoryId) {
            const updated = { ...c, ...data };
            syncCategoryToFirebase(updated);
            return updated;
          }
          return c;
        });
        return { categories: updatedCategories };
      }),
      deleteCategory: (categoryId) => {
        deleteCategoryFromFirebase(categoryId);
        set((state) => ({
          categories: state.categories.filter(c => c.id !== categoryId)
        }));
      },
      updateSubCategory: (subCategoryId, data) => set((state) => {
        const updatedSubCats = state.subCategories.map(s => {
          if (s.id === subCategoryId) {
            const updated = { ...s, ...data };
            syncSubCategoryToFirebase(updated);
            return updated;
          }
          return s;
        });
        return { subCategories: updatedSubCats };
      }),
      deleteSubCategory: (subCategoryId) => {
        deleteSubCategoryFromFirebase(subCategoryId);
        set((state) => ({
          subCategories: state.subCategories.filter(s => s.id !== subCategoryId)
        }));
      },

      updatePhoto: (photoId, data) => set((state) => {
        const updatedPhotos = state.photos.map(p => {
          if (p.id === photoId) {
            const updated = { ...p, ...data };
            if (data.isHidden !== undefined) {
              toggleProductHideInFirebase(photoId, data.isHidden);
            }
            syncPhotoToFirebase(updated);
            return updated;
          }
          return p;
        });
        return { photos: updatedPhotos };
      }),

      deletePhoto: (photoId) => {
        deletePhotoFromFirebase(photoId);
        set((state) => ({
          photos: state.photos.filter(p => p.id !== photoId)
        }));
      },

      batchSetStock: (photoId, available) => set((state) => {
        const updatedPhotos = state.photos.map(p => {
          if (p.id !== photoId) return p;
          const updated = {
            ...p,
            aAvailable: available,
            bAvailable: available,
            cAvailable: available,
            dAvailable: available
          };
          syncPhotoToFirebase(updated);
          return updated;
        });
        return { photos: updatedPhotos };
      }),

      addShowroomVideo: (video) => {
        syncShowroomVideoToFirebase(video);
        set((state) => ({
          showroomVideos: [...(state.showroomVideos || []), video]
        }));
      },

      addMultipleShowroomVideos: (newVideos) => {
        newVideos.forEach(v => syncShowroomVideoToFirebase(v));
        set((state) => ({
          showroomVideos: [...(state.showroomVideos || []), ...newVideos]
        }));
      },

      deleteShowroomVideo: (videoId) => {
        deleteShowroomVideoFromFirebase(videoId);
        set((state) => ({
          showroomVideos: (state.showroomVideos || []).filter(v => v.id !== videoId)
        }));
      },
      updateShowroomVideo: (videoId, updates) => {
        set((state) => {
          const updatedVideos = (state.showroomVideos || []).map(v => 
            v.id === videoId ? { ...v, ...updates } : v
          );
          const videoToUpdate = updatedVideos.find(v => v.id === videoId);
          if (videoToUpdate) {
            syncShowroomVideoToFirebase(videoToUpdate);
          }
          return { showroomVideos: updatedVideos };
        });
      },

      reorderShowroomVideos: (reordered) => {
        reordered.forEach(v => syncShowroomVideoToFirebase(v));
        set({
          showroomVideos: reordered
        });
      },

      resetToDefaults: () => set({
        categories: [],
        subCategories: [],
        photos: [],
        showroomVideos: [],
        orders: [],
        customers: [],
        communityPosts: [],
        chatMessages: [],
        activeCategoryId: MainCategory.IMITATION,
        activeSubCategoryId: '',
        activePhotoId: ''
      })
    }),
    {
      name: 'shivam-wholesale-pc-session',
      partialize: (state) => ({
        currentCustomer: state.currentCustomer,
        cart: state.cart
      }),
    }
  )
);

