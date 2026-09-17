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
  // Dynamic fields from Firestore
  variants?: Array<{
    key: string;
    label: string;
    isAvailable: boolean;
    defaultQuantity?: number;
  }>;
  aLabel?: string;
  bLabel?: string;
  cLabel?: string;
  dLabel?: string;
  aDefaultQuantity?: number;
  bDefaultQuantity?: number;
  cDefaultQuantity?: number;
  dDefaultQuantity?: number;
}

export interface ProductVariant {
  key: string;        // 'A', 'B', 'C', 'D' or index-based
  label: string;      // 'Black', 'Maroon', 'A', 'B', etc.
  isAvailable: boolean;
  defaultQuantity: number;
}

export function getPhotoVariants(photo: CatalogPhoto): ProductVariant[] {
  const baseDefaultQty = typeof photo.defaultQuantity === 'number' && photo.defaultQuantity >= 0 
    ? photo.defaultQuantity 
    : 6;
  
  // 1. If photo.variants is an array of objects
  if (Array.isArray(photo.variants) && photo.variants.length > 0) {
    return photo.variants.map((v: any, index: number) => {
      const keys = ['A', 'B', 'C', 'D'];
      const defaultKey = keys[index] || `V${index + 1}`;
      return {
        key: v.key || defaultKey,
        label: v.label || v.name || defaultKey,
        isAvailable: v.isAvailable !== undefined ? v.isAvailable : true,
        defaultQuantity: typeof v.defaultQuantity === 'number' && v.defaultQuantity >= 0 
          ? v.defaultQuantity 
          : baseDefaultQty
      };
    });
  }

  // 2. Generate from standard properties (A, B, C, D)
  const variantsList: ProductVariant[] = [];
  const count = typeof photo.itemCount === 'number' ? photo.itemCount : 4;
  const options = ['A', 'B', 'C', 'D'];

  for (let i = 0; i < count; i++) {
    const opt = options[i];
    const isAvailKey = `${opt.toLowerCase()}Available` as keyof CatalogPhoto;
    const labelKey = `${opt.toLowerCase()}Label` as keyof CatalogPhoto;
    const qtyKey = `${opt.toLowerCase()}DefaultQuantity` as keyof CatalogPhoto;

    const isAvailable = photo[isAvailKey] !== undefined ? !!photo[isAvailKey] : true;
    const label = (photo[labelKey] as string) || opt;
    const defaultQuantity = typeof photo[qtyKey] === 'number' && (photo[qtyKey] as number) >= 0 
      ? (photo[qtyKey] as number) 
      : baseDefaultQty;

    variantsList.push({
      key: opt,
      label,
      isAvailable,
      defaultQuantity
    });
  }

  return variantsList;
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
  id?: string;
  messageId?: string;
  customerId: string;
  customerCode?: string;
  shopName: string;
  sender: 'customer' | 'admin';
  type: 'text' | 'image' | 'voice';
  text?: string;
  mediaUrl?: string; // image or audio data / URL
  imageUri?: string; // backwards compatibility
  audioUri?: string; // backwards compatibility
  isRead: boolean;
  timestamp: any;
  createdAt?: number;
}

export interface BroadcastMessage {
  id: string;
  title?: string;
  message: string;
  imageUrl?: string;
  sender?: string;
  isReadByCustomer?: boolean;
  timestamp: any;
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
  defaultQuantity?: number;
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
