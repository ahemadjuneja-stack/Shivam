import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MainCategory, CategoryItem, SubCategory, CatalogPhoto, Customer, OrderCartItem, WholesaleOrder } from '../types';

interface AppState {
  // Mock Data Data
  categories: CategoryItem[];
  subCategories: SubCategory[];
  photos: CatalogPhoto[];
  customers: Customer[];
  orders: WholesaleOrder[];
  
  // App State
  cart: OrderCartItem[];
  currentCustomer: Customer | null;

  // Actions
  addToCart: (item: OrderCartItem) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  setCurrentCustomer: (customer: Customer | null) => void;
  placeOrder: () => void;
  
  // Admin Actions
  addCustomer: (customer: Customer) => void;
  updateOrderStatus: (orderId: string, department: 'imitation' | 'cosmetics' | 'hair', status: string) => void;
}

const mockCategories: CategoryItem[] = [
  { id: MainCategory.IMITATION, displayName: 'Imitation Jewelry', hindiName: 'इमिटेशन ज्वेलरी', thumbnailUrl: 'https://images.unsplash.com/photo-1599643478514-4a410f0a82ef?auto=format&fit=crop&q=80&w=400', accentColorHex: '#F59E0B', sortOrder: 1 },
  { id: MainCategory.COSMETICS, displayName: 'Cosmetics', hindiName: 'कॉस्मेटिक्स', thumbnailUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=400', accentColorHex: '#EC4899', sortOrder: 2 },
  { id: MainCategory.HAIR_ACCESSORIES, displayName: 'Hair Accessories', hindiName: 'हेयर एक्सेसरीज', thumbnailUrl: 'https://images.unsplash.com/photo-1606214532675-80277bd28bd9?auto=format&fit=crop&q=80&w=400', accentColorHex: '#38BDF8', sortOrder: 3 }
];

const mockSubCategories: SubCategory[] = [
  { id: 'sub1', categoryId: MainCategory.IMITATION, name: 'Earrings', iconName: 'folder', thumbnailUrl: '', photoCount: 12, sortOrder: 1 },
  { id: 'sub2', categoryId: MainCategory.COSMETICS, name: 'Lipsticks', iconName: 'folder', thumbnailUrl: '', photoCount: 8, sortOrder: 1 },
];

const mockPhotos: CatalogPhoto[] = [
  {
    id: 'p1', categoryId: MainCategory.IMITATION, subCategoryId: 'sub1', subCategoryName: 'Earrings', photoCode: 'ER-101', imageUri: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=800', itemCount: 4, aAvailable: true, bAvailable: true, cAvailable: false, dAvailable: true, defaultQuantity: 12, sortOrder: 1, description: 'Gold plated earrings'
  },
  {
    id: 'p2', categoryId: MainCategory.COSMETICS, subCategoryId: 'sub2', subCategoryName: 'Lipsticks', photoCode: 'LP-202', imageUri: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=800', itemCount: 3, aAvailable: true, bAvailable: true, cAvailable: true, dAvailable: false, defaultQuantity: 6, sortOrder: 2, description: 'Matte lipstick set'
  }
];

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      categories: mockCategories,
      subCategories: mockSubCategories,
      photos: mockPhotos,
      customers: [
        { customerCode: 'CUST-101', shopName: 'Pooja Novelty', cityName: 'Mumbai', mobileNumber: '9876543210', contactPerson: 'Raj', address: 'Dadar' }
      ],
      orders: [],
      cart: [],
      currentCustomer: null,

      addToCart: (item) => set((state) => ({ cart: [...state.cart, item] })),
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
          orderNumber: `ORD-${Math.floor(Math.random() * 10000)}`,
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
          notes: '',
          createdAt: Date.now()
        };

        return {
          orders: [newOrder, ...state.orders],
          cart: []
        };
      }),
      addCustomer: (customer) => set((state) => ({ customers: [...state.customers, customer] })),
      updateOrderStatus: (orderId, department, status) => set((state) => {
        const newOrders = state.orders.map(order => {
          if (order.id !== orderId) return order;
          const updated = { ...order };
          if (department === 'imitation') updated.imitationStatus = status;
          if (department === 'cosmetics') updated.cosmeticsStatus = status;
          if (department === 'hair') updated.hairStatus = status;
          
          // Calculate overall status
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
      })
    }),
    {
      name: 'shivam-storage',
    }
  )
);
