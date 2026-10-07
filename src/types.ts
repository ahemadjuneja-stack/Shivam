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
  orderIndex?: number;
}

export interface SubCategory {
  id: string;
  categoryId: string;
  name: string;
  iconName: string;
  thumbnailUrl: string;
  photoCount: number;
  sortOrder: number;
  orderIndex?: number;
}

export interface ProductVariant {
  id: string;
  label: string;
  minQuantity: number;
  quantity?: number;
  letter?: string;
  name?: string;
  isAvailable?: boolean;
  inStock?: boolean;
}

export interface CatalogPhoto {
  id: string;
  categoryId: string;
  subCategoryId: string;
  subcategoryId?: string;
  subCategoryName: string;
  photoCode: string;
  code?: string;
  title?: string;
  name?: string;
  imageUri: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  photoUrl?: string;
  videoUri?: string; // Optional showcase video
  videoUrl?: string;
  itemCount: number; // number of variants
  aAvailable?: boolean;
  bAvailable?: boolean;
  cAvailable?: boolean;
  dAvailable?: boolean;
  defaultQuantity: number;
  minQty?: number;
  sortOrder: number;
  orderIndex?: number;
  description: string;
  customLabels?: string[]; // e.g. ['Black', '100ml'] or ['A', 'B']
  variants?: ProductVariant[]; // [{ id: "v1", label: "Black", minQuantity: 12 }, { id: "v2", label: "100ml", minQuantity: 5 }]
  isHidden?: boolean;
  isVisible?: boolean;
  status?: string;
  updatedAt?: any;
}

export interface DeviceSession {
  deviceId: string;
  deviceName?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  lastActiveAt: string;
  isOnline: boolean;
}

export interface DeviceInfo {
  model?: string;
  osVersion?: string;
  appVersion?: string;
  updatedAt?: number | any;
}

export interface LoginHistoryItem {
  ts?: number | any;
  model?: string;
  osVersion?: string;
  appVersion?: string;
  deviceId?: string;
}

export interface CartAbandonData {
  count?: number;
  lastItems?: number;
  lastAt?: number | any;
}

export interface Customer {
  id?: string;
  customerId?: string;
  customerCode: string;
  shopName: string;
  cityName: string;
  mobileNumber: string;
  contactPerson: string;
  address: string;
  status?: 'Verified' | 'Pending' | 'Approved';
  isVerified?: boolean;
  isOnline?: boolean;
  lastActive?: number;
  gpsLocation?: string;
  resolvedAddress?: string;
  pin?: string;
  allowedCategories?: string[];
  allowedSubCategories?: string[];
  allowedCategoryIds?: string[];
  allowedSubCategoryIds?: string[];
  totalOrders?: number;
  role?: string;
  staffCategory?: string;
  hasAllowedLocation?: boolean;
  maxAllowedDevices?: number;
  activeSessions?: DeviceSession[];
  visitingCardUrl?: string;
  activeDeviceId?: string | null;
  deviceBoundAt?: number | null;
  createdAt?: number;
  deviceInfo?: DeviceInfo;
  loginHistory?: LoginHistoryItem[];
  sectionViews?: Record<string, number>;
  cartAbandon?: CartAbandonData;
}

export interface OrderCartItem {
  photoId: string;
  photoCode: string;
  imageUri: string;
  imageUrl?: string;
  image?: string;
  categoryId: string;
  subCategoryName: string;
  optionLetter: string;
  customLabel?: string; // custom variant name e.g. '1KG'
  quantity: number;

  // New fields requested for order schema preparedness
  id?: string;
  name?: string;
  category?: string;
  variant?: string;
  price?: number;
}

export interface DepartmentStatusItem {
  status: 'Pending' | 'Done';
  packedBy: string;
  packedAt: number;
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
  itemCount?: number;
  totalQuantity?: number;
  imitationStatus: string; // PENDING, DONE, NOT_APPLICABLE
  cosmeticsStatus: string;
  hairStatus: string;
  overallStatus: string; // PENDING, PROCESSING, PACKED, DISPATCHED, DONE, RECEIVED, PARTIALLY_PACKED, READY_TO_SHIP
  notes: string;
  orderNote?: string; // Alternative field from mobile app
  voiceNoteUrl?: string; // Voice recording URL from mobile application
  voiceNote?: string; // Alternative voice note field from mobile app
  createdAt: number;
  source?: 'SALESMAN' | 'CUSTOMER';
  salesmanName?: string; // e.g. 'RAMIZ', 'RIYAZ', 'ZARIF'
  displayTitle?: string;
  dateFormatted?: string; // e.g. '16-09-2026'
  departmentStatus?: {
    [categoryName: string]: DepartmentStatusItem;
  };
  notificationHistory?: OrderNotificationHistoryItem[];
}

export interface OrderNotificationHistoryItem {
  id: string;
  type: 'CONFIRMATION' | 'DEPT_PACKED' | 'DISPATCHED';
  message: string;
  timestamp: number;
  details?: {
    transportName?: string;
    biltyNumber?: string;
    parcelsCount?: number;
    biltyPhotoUrl?: string;
  };
}

export interface CommunityPost {
  id: string;
  customerCode?: string;
  shopName: string;
  authorName?: string;
  cityName?: string;
  text?: string;
  caption?: string;
  imageUrl?: string;
  imageUri?: string;
  voiceNoteUrl?: string;
  timestamp: number;
  type?: 'CUSTOMER_POST' | 'ADMIN_ANNOUNCEMENT' | 'PHOTO' | 'TEXT';
  isAnnouncement?: boolean;
  likesCount?: number;
}

export interface ShowroomVideo {
  id: string;
  title: string;
  videoUri: string;
  videoUrl?: string;
  thumbnailUri?: string;
  categoryId?: string;
  categoryName?: string;
  fileSizeMb?: number;
  orderQuantity?: string;
  uploadedAt: number;
  imageUri?: string;
  posterUrl?: string;
  quantity?: number;
  sortOrder?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface ChatMessage {
  id: string;
  customerCode: string;
  customerId?: string;
  sender: 'CUSTOMER' | 'ADMIN' | 'customer' | 'admin';
  type: 'TEXT' | 'IMAGE' | 'VOICE' | 'text' | 'image' | 'voice';
  content: string; // text content, or URL for image/voice
  text?: string;
  mediaUrl?: string;
  imageUrl?: string;
  imageUri?: string;
  image?: string;
  voiceNoteUrl?: string;
  audioUrl?: string;
  audioUri?: string;
  timestamp: number;
  isRead: boolean;
  isBroadcast?: boolean;
}

export interface BroadcastMessage {
  id: string;
  title?: string;
  text: string;
  type: 'TEXT' | 'IMAGE' | 'VOICE';
  mediaUrl?: string;
  imageUrl?: string;
  voiceNoteUrl?: string;
  timestamp: number;
  sender: 'admin' | 'ADMIN';
  targetAudience?: 'ALL_CUSTOMERS';
}
