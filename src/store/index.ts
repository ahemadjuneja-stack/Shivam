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
  batchUpdatePhotosOrder,
  db
} from '../firebase';
import { uploadMediaToStorage } from '../services/storageService';
import { doc, setDoc } from 'firebase/firestore';
import { generateOrderId } from '../lib/idGenerator';

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
  placeOrder: () => Promise<boolean>;
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
  deletePhoto: (photoId: string, photoCode?: string) => void;
  reorderCategories: (categories: CategoryItem[]) => void;
  reorderSubCategories: (subCategories: SubCategory[]) => void;
  reorderPhotos: (photos: CatalogPhoto[]) => void;
  resetToDefaults: () => void;
}

export const defaultCategories: CategoryItem[] = [];
export const defaultSubCategories: SubCategory[] = [];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      categories: [],
      subCategories: [],
      photos: [],
      showroomVideos: [],
      customers: [],
      orders: [],
      messages: [],
      broadcastMessages: [],
      communityPosts: [],
      
      activeCategoryId: '',
      activeSubCategoryId: '',
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

      addToCart: (item) => set((state) => {
        const targetPhotoCode = item.photoCode || (item as any).code || 'SKU';
        const targetOption = item.optionLetter || item.variant || 'A';
        const targetId = item.id || `${item.photoId || targetPhotoCode}_${targetOption}`;

        const existingIdx = state.cart.findIndex(i => {
          if (item.photoId && i.photoId && i.photoId === item.photoId && (i.optionLetter || 'A') === targetOption) return true;
          if (i.id && targetId && i.id === targetId) return true;
          if (i.photoCode && targetPhotoCode && i.photoCode === targetPhotoCode && (i.optionLetter || 'A') === targetOption) return true;
          if ((i.photoCode || i.id) === (item.photoCode || item.id)) return true;
          return false;
        });

        const addedQty = Number(item.quantity || 1);

        if (existingIdx > -1) {
          const updated = [...state.cart];
          const newQty = (Number(updated[existingIdx].quantity) || 0) + addedQty;
          if (newQty <= 0) {
            updated.splice(existingIdx, 1);
            return { cart: updated };
          }
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: newQty,
            imageUri: updated[existingIdx].imageUri || item.imageUri || (item as any).imageUrl || '',
            imageUrl: updated[existingIdx].imageUrl || item.imageUrl || item.imageUri || ''
          };
          return { cart: updated };
        } else {
          if (addedQty <= 0) return state;
          const newItem: OrderCartItem = {
            ...item,
            id: targetId,
            photoCode: targetPhotoCode,
            optionLetter: targetOption,
            quantity: Math.max(1, addedQty),
            imageUri: item.imageUri || (item as any).imageUrl || '',
            imageUrl: item.imageUrl || item.imageUri || ''
          };
          return { cart: [...state.cart, newItem] };
        }
      }),
      setItemQuantity: (photo, optionLetter, quantity) => set((state) => {
        const targetPhotoCode = photo.photoCode || (photo as any).code || 'SKU';
        const targetId = `${photo.id}_${optionLetter}`;

        const existingIdx = state.cart.findIndex(i => 
          (i.photoId === photo.id && (i.optionLetter || 'A') === optionLetter) ||
          (i.photoCode === targetPhotoCode && (i.optionLetter || 'A') === optionLetter) ||
          i.id === targetId
        );

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

        const resolvedPhotoImg = 
          photo.imageUri || 
          (photo as any).imageUrl || 
          (photo as any).image || 
          (photo as any).photo || 
          (Array.isArray((photo as any).images) && (photo as any).images[0]) || 
          '';

        if (existingIdx !== -1) {
          const updated = [...state.cart];
          updated[existingIdx] = { 
            ...updated[existingIdx], 
            quantity, 
            defaultQuantity: minQty,
            imageUri: updated[existingIdx].imageUri || resolvedPhotoImg,
            imageUrl: updated[existingIdx].imageUrl || resolvedPhotoImg
          };
          return { cart: updated };
        } else {
          const newItem: OrderCartItem = {
            photoId: photo.id,
            photoCode: targetPhotoCode,
            imageUri: resolvedPhotoImg,
            imageUrl: resolvedPhotoImg,
            categoryId: photo.categoryId,
            subCategoryName: photo.subCategoryName,
            optionLetter,
            quantity,
            defaultQuantity: minQty,
            id: targetId,
            name: `${targetPhotoCode} (Option ${optionLetter})`,
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

      placeOrder: async () => {
        const state = get();
        if (!state.currentCustomer) {
          alert("Please login or select your customer shop first!");
          return false;
        }
        if (state.cart.length === 0) {
          alert("Your order slip is empty. Please add items from the showroom.");
          return false;
        }
        
        const hasImitation = state.cart.some(item => item.categoryId === MainCategory.IMITATION);
        const hasCosmetics = state.cart.some(item => item.categoryId === MainCategory.COSMETICS);
        const hasHair = state.cart.some(item => item.categoryId === MainCategory.HAIR_ACCESSORIES);

        const orderIdNumber = generateOrderId();
        const custId = state.currentCustomer.customerId || state.currentCustomer.customerCode || 'CUST-GUEST';

        // Await voice note upload if exists to resolve getDownloadURL before setDoc
        let uploadedVoiceUrl = '';
        const voiceNoteToUpload = state.orderVoiceNote;
        if (voiceNoteToUpload) {
          try {
            uploadedVoiceUrl = await uploadMediaToStorage(voiceNoteToUpload, 'voice_notes', `order_voice_${orderIdNumber}`);
            console.log('Voice note uploaded successfully, URL:', uploadedVoiceUrl);
          } catch (uploadErr) {
            console.warn('Voice note upload error:', uploadErr);
          }
        }

        const standardizedItems = state.cart.map(item => {
          const fallbackPhoto = state.photos.find(p => p.id === item.photoId || p.photoCode === item.photoCode);
          const resolvedImage = 
            item.imageUri || 
            (item as any).imageUrl || 
            (item as any).image || 
            (item as any).photo || 
            (Array.isArray((item as any).images) && (item as any).images[0]) || 
            fallbackPhoto?.imageUri ||
            (fallbackPhoto as any)?.imageUrl ||
            (fallbackPhoto as any)?.image ||
            '';
          
          return {
            photoCode: item.photoCode || (item as any).code || (item as any).name || 'SKU',
            imageUri: resolvedImage,
            imageUrl: resolvedImage, // Dual-key compatibility
            quantity: Number(item.quantity || 1),
            category: item.categoryId || (item as any).category || fallbackPhoto?.categoryId || '',
            categoryId: item.categoryId || (item as any).category || fallbackPhoto?.categoryId || '',
            subCategoryName: item.subCategoryName || fallbackPhoto?.subCategoryName || '',
            variant: item.variant || item.optionLetter || 'A',
            optionLetter: item.optionLetter || item.variant || 'A',
            price: Number((item as any).price) || 0,
            photoId: item.photoId || fallbackPhoto?.id || '',
            id: item.id || `${item.photoId || item.photoCode}_${item.optionLetter || item.variant || 'A'}`,
            name: item.name || `${item.photoCode || 'SKU'} (Option ${item.optionLetter || item.variant || 'A'} - ${item.subCategoryName || ''})`
          };
        });

        const totalQty = state.cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);

        const newOrder: WholesaleOrder = {
          orderId: orderIdNumber,
          id: orderIdNumber,
          orderNumber: orderIdNumber,
          customerId: custId,
          customerCode: custId,
          shopName: state.currentCustomer.shopName || '',
          cityName: state.currentCustomer.city || state.currentCustomer.cityName || '',
          mobileNumber: state.currentCustomer.phone || state.currentCustomer.mobileNumber || '',
          items: standardizedItems,
          itemCount: standardizedItems.length,
          totalItemsCount: totalQty,
          totalAmount: 0,
          orderNote: state.orderNote || '',
          notes: state.orderNote || '',
          voiceNoteUrl: uploadedVoiceUrl,
          voiceUrl: uploadedVoiceUrl,
          audioUrl: uploadedVoiceUrl,
          voiceNoteUri: uploadedVoiceUrl,
          status: 'Pending',
          overallStatus: 'RECEIVED',
          imitationStatus: hasImitation ? 'PENDING' : 'NOT_APPLICABLE',
          cosmeticsStatus: hasCosmetics ? 'PENDING' : 'NOT_APPLICABLE',
          hairStatus: hasHair ? 'PENDING' : 'NOT_APPLICABLE',
          createdAt: Date.now()
        };

        try {
          console.log("SENDING ORDER DIRECTLY TO FIRESTORE:", newOrder);
          // Strip any unexpected undefined values to ensure Firestore compliance
          const sanitizedPayload = JSON.parse(JSON.stringify(newOrder));
          const orderRef = doc(db, 'orders', orderIdNumber);

          await setDoc(orderRef, sanitizedPayload);
          console.log('Order successfully written directly to Firestore orders:', orderIdNumber);

          set({
            orders: [newOrder, ...state.orders],
            cart: [],
            orderNote: '',
            orderVoiceNote: null,
            isCartOpen: false
          });
          return true;
        } catch (error: any) {
          console.error("FIRESTORE ORDER WRITE ERROR:", error);
          window.alert("Order Dispatch Error: " + (error?.message || String(error)));
          throw error;
        }
      },

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
        const newCustomerId = customer.customerId || customer.customerCode || `CUST-${Date.now().toString().slice(-4)}`;
        const customerPayload = {
          ...customer,
          id: newCustomerId,
          customerId: newCustomerId,
          customerCode: newCustomerId,
          status: customer.status || 'PENDING',
          isVerified: (customer as any).isVerified !== undefined ? (customer as any).isVerified : false,
          createdAt: typeof customer.createdAt === 'number' ? customer.createdAt : Date.now()
        };

        (async () => {
          try {
            const custRef = doc(db, 'customers', newCustomerId);
            await setDoc(custRef, customerPayload, { merge: true });
            console.log('Customer written directly to Firestore customers:', newCustomerId);
          } catch (error) {
            console.error("Firestore Register Error:", error);
          }
        })();

        set((state) => ({ customers: [...state.customers, customerPayload as Customer] }));
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
          orders: state.orders.filter(o => o.customerId !== customerKey && o.customerCode !== customerKey),
          messages: state.messages.filter(m => m.customerId !== customerKey && m.customerCode !== customerKey),
          cart: (state.currentCustomer?.customerId === customerKey || state.currentCustomer?.customerCode === customerKey)
            ? []
            : state.cart,
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
        const cleanSku = photo.photoCode?.trim();
        // Remove any existing duplicate SKU or ID to ensure fresh conflict-free record
        const filtered = current.filter(p => p.id !== photo.id && (!cleanSku || p.photoCode?.trim() !== cleanSku));
        const maxIndex = filtered.reduce((m, p) => Math.max(m, p.orderIndex ?? p.sortOrder ?? 0), -1);
        const newPhoto = { ...photo, orderIndex: maxIndex + 1, sortOrder: maxIndex + 2 };
        syncPhotoToFirebase(newPhoto).catch((e) => console.error('Firebase sync error on addPhoto:', e));
        set({ photos: [...filtered, newPhoto] });
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

      deletePhoto: (photoId, photoCode) => {
        const targetPhoto = get().photos.find(p => p.id === photoId || (photoCode && p.photoCode === photoCode));
        const effectiveCode = photoCode || targetPhoto?.photoCode;
        deletePhotoFromFirebase(photoId, effectiveCode).catch((e) => console.error('Firebase sync error on deletePhoto:', e));
        set((state) => ({
          photos: state.photos.filter(p => p.id !== photoId && (!effectiveCode || p.photoCode !== effectiveCode)),
          cart: state.cart.filter(item => item.photoId !== photoId && (!effectiveCode || item.photoCode !== effectiveCode))
        }));
      },

      resetToDefaults: () => {
        set({
          categories: [],
          subCategories: [],
          photos: [],
          showroomVideos: [],
          communityPosts: [],
          activeCategoryId: '',
          activeSubCategoryId: '',
          activePhotoId: ''
        });
      }
    }),
    {
      name: 'shivam-wholesale-session-v9',
      version: 9,
      partialize: (state) => ({
        currentCustomer: state.currentCustomer,
        cart: state.cart,
        orderNote: state.orderNote
      })
    }
  )
);
