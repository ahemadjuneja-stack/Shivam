export enum MainCategory {
  IMITATION = 'imitation',
  COSMETICS = 'cosmetics',
  HAIR_ACCESSORIES = 'hair_accessories'
}

export interface CategoryItem {
  id: string;
  displayName: string;
  thumbnailUrl: string;
  accentColorHex: string;
  sortOrder: number;
}

export interface SubCategory {
  id: string;
  categoryId: string;
  name: string;
  iconName: string;
  thumbnailUrl: string;
  photoCount: number;
  sortOrder: number;
}

export interface CatalogPhoto {
  id: string;
  categoryId: string;
  subCategoryId: string;
  subCategoryName: string;
  photoCode: string;
  imageUri: string;
  videoUri?: string; // Optional showcase video
  itemCount: number; // 2, 3, or 4
  aAvailable: boolean;
  bAvailable: boolean;
  cAvailable: boolean;
  dAvailable: boolean;
  defaultQuantity: number;
  sortOrder: number;
  description: string;
}

export interface ShowroomVideo {
  id: string;
  videoUri: string;
  imageUri?: string;
  photoCode?: string;
  subCategoryName?: string;
  subCategoryId?: string;
  categoryId?: string;
  title?: string;
  sortOrder?: number;
}

export interface Customer {
  customerId: string;
  customerCode: string; // backwards compatibility
  shopName: string;
  ownerName: string;
  phone: string;
  city: string;
  address?: string;
  createdAt?: number | any;
  // Legacy aliases
  contactPerson?: string;
  mobileNumber?: string;
  cityName?: string;
}

export interface ChatMessage {
  id: string;
  customerCode: string;
  customerId?: string;
  shopName?: string;
  sender: 'customer' | 'admin';
  text?: string;
  imageUri?: string;
  audioUri?: string;
  timestamp: number;
}

export interface CommunityPost {
  postId: string;
  id: string;
  customerId: string;
  customerCode?: string;
  shopName: string;
  imageUrl: string;
  caption: string;
  timestamp: any;
  likesCount: number;
  likedBy?: string[];
}

export interface OrderCartItem {
  photoId: string;
  photoCode: string;
  imageUri: string;
  categoryId: string;
  subCategoryName: string;
  optionLetter: string;
  quantity: number;
  // Dashboard item format fields
  id?: string;
  name?: string;
  variant?: string;
  price?: number;
}

export interface StandardOrderItem {
  id: string;
  photoCode: string;
  name: string;
  quantity: number;
  variant: string;
  price: number;
  // Optional extra metadata
  photoId?: string;
  imageUri?: string;
  categoryId?: string;
  subCategoryName?: string;
}

export interface WholesaleOrder {
  orderId: string;
  id: string;
  customerId: string;
  customerCode: string;
  shopName: string;
  cityName?: string;
  mobileNumber?: string;
  items: (OrderCartItem | StandardOrderItem)[];
  totalItemsCount: number;
  totalAmount: number;
  orderNote: string;
  voiceNoteUrl?: string | null;
  status: 'Pending' | 'Processing' | 'Dispatched' | string;
  imitationStatus?: string; // PENDING, DONE, NOT_APPLICABLE
  cosmeticsStatus?: string;
  hairStatus?: string;
  overallStatus?: string; // RECEIVED, PARTIALLY_PACKED, READY_TO_SHIP, DISPATCHED
  notes?: string;
  voiceNoteUri?: string;
  orderNumber?: string;
  createdAt: any;
}
