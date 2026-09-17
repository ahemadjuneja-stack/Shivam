import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MainCategory, CategoryItem, SubCategory, CatalogPhoto, Customer, OrderCartItem, WholesaleOrder, ChatMessage } from '../types';

interface AppState {
  // Catalog Data
  categories: CategoryItem[];
  subCategories: SubCategory[];
  photos: CatalogPhoto[];
  customers: Customer[];
  orders: WholesaleOrder[];
  messages: ChatMessage[];
  
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

  // Actions
  setShowroomScreenMode: (mode: 'home' | 'subcategories' | 'gallery' | 'fullimage') => void;
  setActiveCategory: (categoryId: string) => void;
  setActiveSubCategory: (subCategoryId: string) => void;
  setActivePhoto: (photoId: string) => void;
  setIsCartOpen: (open: boolean) => void;
  setOrderNote: (note: string) => void;
  setOrderVoiceNote: (uri: string | null) => void;

  addToCart: (item: OrderCartItem) => void;
  setItemQuantity: (photo: CatalogPhoto, optionLetter: string, quantity: number) => void;
  updateCartItemQuantity: (index: number, quantity: number) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  setCurrentCustomer: (customer: Customer | null) => void;
  placeOrder: () => void;
  addMessage: (message: ChatMessage) => void;
  
  // Admin Actions
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customerCode: string, data: Partial<Customer>) => void;
  updateOrderStatus: (orderId: string, department: 'imitation' | 'cosmetics' | 'hair', status: string) => void;
  addPhoto: (photo: CatalogPhoto) => void;
  updatePhoto: (photoId: string, data: Partial<CatalogPhoto>) => void;
  deletePhoto: (photoId: string) => void;
  resetToDefaults: () => void;
}

const defaultCategories: CategoryItem[] = [
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

const defaultSubCategories: SubCategory[] = [
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

const defaultPhotos: CatalogPhoto[] = [
  // Imitation - Earrings
  {
    id: 'p-er-101',
    categoryId: MainCategory.IMITATION,
    subCategoryId: 'sub-earrings',
    subCategoryName: 'Earrings & Jhumkas',
    photoCode: 'ER-101',
    imageUri: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    itemCount: 4,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: true,
    defaultQuantity: 12,
    sortOrder: 1,
    description: ''
  },
  {
    id: 'p-er-102',
    categoryId: MainCategory.IMITATION,
    subCategoryId: 'sub-earrings',
    subCategoryName: 'Earrings & Jhumkas',
    photoCode: 'ER-102',
    imageUri: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    itemCount: 4,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: false,
    defaultQuantity: 12,
    sortOrder: 2,
    description: ''
  },
  {
    id: 'p-er-103',
    categoryId: MainCategory.IMITATION,
    subCategoryId: 'sub-earrings',
    subCategoryName: 'Earrings & Jhumkas',
    photoCode: 'ER-103',
    imageUri: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    itemCount: 4,
    aAvailable: true,
    bAvailable: true,
    cAvailable: false,
    dAvailable: true,
    defaultQuantity: 12,
    sortOrder: 3,
    description: ''
  },

  // Bangles
  {
    id: 'p-bg-201',
    categoryId: MainCategory.IMITATION,
    subCategoryId: 'sub-bangles',
    subCategoryName: 'Bangles & Kadas',
    photoCode: 'BG-201',
    imageUri: 'https://images.unsplash.com/photo-1611591475806-03f13f1737be?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    itemCount: 4,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: true,
    defaultQuantity: 24,
    sortOrder: 1,
    description: ''
  },
  {
    id: 'p-bg-202',
    categoryId: MainCategory.IMITATION,
    subCategoryId: 'sub-bangles',
    subCategoryName: 'Bangles & Kadas',
    photoCode: 'BG-202',
    imageUri: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    itemCount: 3,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: false,
    defaultQuantity: 12,
    sortOrder: 2,
    description: ''
  },

  // Necklaces
  {
    id: 'p-nk-301',
    categoryId: MainCategory.IMITATION,
    subCategoryId: 'sub-necklaces',
    subCategoryName: 'Choker & Necklace Sets',
    photoCode: 'NK-301',
    imageUri: 'https://images.unsplash.com/photo-1599643478514-4a410f0a82ef?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    itemCount: 2,
    aAvailable: true,
    bAvailable: true,
    cAvailable: false,
    dAvailable: false,
    defaultQuantity: 6,
    sortOrder: 1,
    description: ''
  },

  // Cosmetics - Lipsticks
  {
    id: 'p-lp-101',
    categoryId: MainCategory.COSMETICS,
    subCategoryId: 'sub-lipsticks',
    subCategoryName: 'Matte & Liquid Lipsticks',
    photoCode: 'LP-101',
    imageUri: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    itemCount: 4,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: true,
    defaultQuantity: 24,
    sortOrder: 1,
    description: ''
  },
  {
    id: 'p-lp-102',
    categoryId: MainCategory.COSMETICS,
    subCategoryId: 'sub-lipsticks',
    subCategoryName: 'Matte & Liquid Lipsticks',
    photoCode: 'LP-102',
    imageUri: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    itemCount: 4,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: true,
    defaultQuantity: 12,
    sortOrder: 2,
    description: ''
  },

  // Cosmetics - Nail Polish
  {
    id: 'p-np-201',
    categoryId: MainCategory.COSMETICS,
    subCategoryId: 'sub-nailpolish',
    subCategoryName: 'Nail Lacquer & Gel Polish',
    photoCode: 'NP-201',
    imageUri: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    itemCount: 4,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: true,
    defaultQuantity: 36,
    sortOrder: 1,
    description: ''
  },

  // Cosmetics - Eye Makeup
  {
    id: 'p-em-301',
    categoryId: MainCategory.COSMETICS,
    subCategoryId: 'sub-eyemakeup',
    subCategoryName: 'Kajal & Liquid Liner',
    photoCode: 'EM-301',
    imageUri: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    itemCount: 3,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: false,
    defaultQuantity: 24,
    sortOrder: 1,
    description: ''
  },

  // Hair Accessories - Claw Clips
  {
    id: 'p-cc-101',
    categoryId: MainCategory.HAIR_ACCESSORIES,
    subCategoryId: 'sub-clawclips',
    subCategoryName: 'Korean Claw Clips',
    photoCode: 'CC-101',
    imageUri: 'https://images.unsplash.com/photo-1606214532675-80277bd28bd9?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    itemCount: 4,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: true,
    defaultQuantity: 24,
    sortOrder: 1,
    description: ''
  },
  {
    id: 'p-cc-102',
    categoryId: MainCategory.HAIR_ACCESSORIES,
    subCategoryId: 'sub-clawclips',
    subCategoryName: 'Korean Claw Clips',
    photoCode: 'CC-102',
    imageUri: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    itemCount: 3,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: false,
    defaultQuantity: 24,
    sortOrder: 2,
    description: ''
  },

  // Hair Accessories - Scrunchies
  {
    id: 'p-sc-201',
    categoryId: MainCategory.HAIR_ACCESSORIES,
    subCategoryId: 'sub-scrunchies',
    subCategoryName: 'Silk Scrunchies & Bands',
    photoCode: 'SC-201',
    imageUri: 'https://images.unsplash.com/photo-1620656798579-1984d9e87dfa?auto=format&fit=crop&w=1280&h=720&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    itemCount: 4,
    aAvailable: true,
    bAvailable: true,
    cAvailable: true,
    dAvailable: true,
    defaultQuantity: 36,
    sortOrder: 1,
    description: ''
  }
];

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      categories: defaultCategories,
      subCategories: defaultSubCategories,
      photos: defaultPhotos,
      customers: [
        { customerCode: 'CUST-101', shopName: 'Pooja Novelty Store', cityName: 'Mumbai', mobileNumber: '9876543210', contactPerson: 'Rajesh Bhai', address: 'Shop 14, Dadar Market' },
        { customerCode: 'CUST-102', shopName: 'Shrinath Cosmetics', cityName: 'Ahmedabad', mobileNumber: '9825012345', contactPerson: 'Ketan Patel', address: 'Ratanpole Wholesale Market' },
        { customerCode: 'CUST-103', shopName: 'Radhe Fashion Jewelry', cityName: 'Surat', mobileNumber: '9712345678', contactPerson: 'Amit Shah', address: 'Bhagal Main Road' }
      ],
      orders: [],
      messages: [],
      
      activeCategoryId: MainCategory.IMITATION,
      activeSubCategoryId: 'sub-earrings',
      activePhotoId: 'p-er-101',
      showroomScreenMode: 'home',

      cart: [],
      currentCustomer: { customerCode: 'CUST-101', shopName: 'Pooja Novelty Store', cityName: 'Mumbai', mobileNumber: '9876543210', contactPerson: 'Rajesh Bhai', address: 'Shop 14, Dadar Market' },
      isCartOpen: false,
      orderNote: '',
      orderVoiceNote: null,

      setShowroomScreenMode: (mode) => set({ showroomScreenMode: mode }),
      setOrderNote: (note) => set({ orderNote: note }),
      setOrderVoiceNote: (uri) => set({ orderVoiceNote: uri }),

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

      placeOrder: () => set((state) => {
        if (!state.currentCustomer || state.cart.length === 0) return state;
        
        const hasImitation = state.cart.some(item => item.categoryId === MainCategory.IMITATION);
        const hasCosmetics = state.cart.some(item => item.categoryId === MainCategory.COSMETICS);
        const hasHair = state.cart.some(item => item.categoryId === MainCategory.HAIR_ACCESSORIES);

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
          overallStatus: 'RECEIVED',
          notes: state.orderNote || '',
          voiceNoteUri: state.orderVoiceNote || undefined,
          createdAt: Date.now()
        };

        return {
          orders: [newOrder, ...state.orders],
          cart: [],
          orderNote: '',
          orderVoiceNote: null,
          isCartOpen: false
        };
      }),

      addMessage: (message) => set((state) => ({
        messages: [...state.messages, message]
      })),

      addCustomer: (customer) => set((state) => ({ customers: [...state.customers, customer] })),

      updateCustomer: (customerCode, data) => set((state) => ({
        customers: state.customers.map(c => c.customerCode === customerCode ? { ...c, ...data } : c)
      })),
      
      updateOrderStatus: (orderId, department, status) => set((state) => {
        const newOrders = state.orders.map(order => {
          if (order.id !== orderId) return order;
          const updated = { ...order };
          if (department === 'imitation') updated.imitationStatus = status;
          if (department === 'cosmetics') updated.cosmeticsStatus = status;
          if (department === 'hair') updated.hairStatus = status;
          
          const statuses = [updated.imitationStatus, updated.cosmeticsStatus, updated.hairStatus].filter(s => s !== 'NOT_APPLICABLE');
          if (statuses.every(s => s === 'DONE')) {
            updated.overallStatus = 'READY_TO_SHIP';
          } else if (statuses.some(s => s === 'DONE')) {
            updated.overallStatus = 'PARTIALLY_PACKED';
          } else {
            updated.overallStatus = 'RECEIVED';
          }
          return updated;
        });
        return { orders: newOrders };
      }),

      addPhoto: (photo) => set((state) => ({ photos: [...state.photos, photo] })),

      updatePhoto: (photoId, data) => set((state) => ({
        photos: state.photos.map(p => p.id === photoId ? { ...p, ...data } : p)
      })),

      deletePhoto: (photoId) => set((state) => ({
        photos: state.photos.filter(p => p.id !== photoId)
      })),

      resetToDefaults: () => set({
        categories: defaultCategories,
        subCategories: defaultSubCategories,
        photos: defaultPhotos,
        activeCategoryId: MainCategory.IMITATION,
        activeSubCategoryId: 'sub-earrings',
        activePhotoId: 'p-er-101'
      })
    }),
    {
      name: 'shivam-wholesale-clean-v4',
      version: 4,
    }
  )
);

