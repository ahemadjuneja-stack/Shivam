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

export interface Customer {
  customerCode: string;
  shopName: string;
  cityName: string;
  mobileNumber: string;
  contactPerson: string;
  address: string;
}

export interface OrderCartItem {
  photoId: string;
  photoCode: string;
  imageUri: string;
  categoryId: string;
  subCategoryName: string;
  optionLetter: string;
  quantity: number;
}

export interface WholesaleOrder {
  id: string;
  orderNumber: string;
  customerCode: string;
  shopName: string;
  cityName: string;
  mobileNumber: string;
  items: OrderCartItem[];
  totalItemsCount: number;
  imitationStatus: string; // PENDING, DONE, NOT_APPLICABLE
  cosmeticsStatus: string;
  hairStatus: string;
  overallStatus: string; // RECEIVED, PARTIALLY_PACKED, READY_TO_SHIP, DISPATCHED
  notes: string;
  createdAt: number;
}
