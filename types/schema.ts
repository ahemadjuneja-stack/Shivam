/**
 * SHIVAM WHOLESALE - FIRESTORE DATA SCHEMA & TYPES FOR CUSTOMER APK & DASHBOARD
 * 
 * Target Firestore Collections:
 * - 'products' (or 'photos')
 * - 'categories'
 * - 'subCategories'
 * - 'orders'
 * - 'customers'
 */

// ============================================================================
// 1. MAIN CATEGORY & CATEGORIES SCHEMA
// ============================================================================

export enum MainCategory {
  IMITATION = 'imitation',
  COSMETICS = 'cosmetics',
  HAIR_ACCESSORIES = 'hair_accessories'
}

/**
 * Firestore Collection: 'categories'
 * Document ID: e.g. 'cat-imitation', 'cat-cosmetics'
 */
export interface CategoryItem {
  /** Unique category identifier */
  id: string;
  /** Display label shown in App UI (e.g., 'Imitation Jewellery') */
  displayName: string;
  /** Thumbnail image URL */
  thumbnailUrl: string;
  /** Hex color for UI branding (e.g. '#E11D48') */
  accentColorHex: string;
  /** Numerical sorting index */
  sortOrder: number;
  /** Alternative sorting index field in Firestore */
  orderIndex?: number;
}

/**
 * Firestore Collection: 'subCategories'
 * Document ID: e.g. 'sub-earrings', 'sub-lipsticks'
 */
export interface SubCategory {
  /** Unique subcategory identifier */
  id: string;
  /** Reference to parent category ID (e.g. 'imitation') */
  categoryId: string;
  /** Subcategory title (e.g. 'Jhumkas & Earrings') */
  name: string;
  /** Lucide icon identifier name */
  iconName: string;
  /** Subcategory thumbnail image URL */
  thumbnailUrl: string;
  /** Total item count in this subcategory */
  photoCount: number;
  /** Numerical sorting index */
  sortOrder: number;
  /** Alternative sorting index field in Firestore */
  orderIndex?: number;
}


// ============================================================================
// 2. PRODUCT & VARIANTS SCHEMA
// ============================================================================

/**
 * Product Variant structure within a Product
 */
export interface ProductVariant {
  /** Variant identifier (e.g. 'v1', 'opt-A') */
  id: string;
  /** Variant label or option name (e.g. 'A', 'Black', '100ml', 'Red Matte') */
  label: string;
  /** Minimum quantity required per batch/box */
  minQuantity: number;
  /** Current ordered or available quantity */
  quantity?: number;
  /** Alternative option letter ('A', 'B', 'C', 'D') */
  letter?: string;
  /** Alternative name label */
  name?: string;
  /** Stock availability flag */
  isAvailable?: boolean;
  /** Stock flag */
  inStock?: boolean;
}

/**
 * Firestore Collection: 'products' (and legacy fallback 'photos')
 * Document ID: Unique Product ID (e.g. 'p-er-101', 'p-lp-202')
 */
export interface CatalogProduct {
  /** Unique product ID in Firestore */
  id: string;
  /** Parent category ID ('imitation', 'cosmetics', 'hair_accessories') */
  categoryId: string;
  /** Parent subcategory ID (e.g. 'sub-earrings') */
  subCategoryId: string;
  /** Alternative subcategory ID key */
  subcategoryId?: string;
  /** Human-readable subcategory name */
  subCategoryName: string;
  /** Unique photo/product code displayed in catalog (e.g. 'ER-101', 'LP-302') */
  photoCode: string;
  /** Alternative code field */
  code?: string;
  /** Alternative title field */
  title?: string;
  /** Alternative name field */
  name?: string;
  /** Primary product image URL */
  imageUri: string;
  /** Alternative image URL field */
  imageUrl?: string;
  /** Alternative thumbnail URL field */
  thumbnailUrl?: string;
  /** Video URL for 360 showroom preview */
  videoUri?: string;
  /** Alternative video URL field */
  videoUrl?: string;
  
  /** Number of variants available (e.g. 2, 4) */
  itemCount: number;
  
  /** Option A stock availability (Legacy) */
  aAvailable?: boolean;
  /** Option B stock availability (Legacy) */
  bAvailable?: boolean;
  /** Option C stock availability (Legacy) */
  cAvailable?: boolean;
  /** Option D stock availability (Legacy) */
  dAvailable?: boolean;
  
  /** Minimum box/batch order quantity */
  defaultQuantity: number;
  /** Alternative minimum quantity field */
  minQty?: number;
  
  /** Sorting index */
  sortOrder: number;
  /** Alternative sorting index */
  orderIndex?: number;
  
  /** Detailed product description */
  description: string;
  
  /** Custom variant option labels (e.g. ['A', 'B'] or ['Black', 'Red', '100ml']) */
  customLabels?: string[];
  
  /** Detailed variant options array */
  variants?: ProductVariant[];
  
  // --------------------------------------------------------------------------
  // VISIBILITY & APK HIDE FLAGS
  // --------------------------------------------------------------------------
  /** Primary hide flag for Customer APK (true = Hidden from APK, false = Visible) */
  isHidden?: boolean;
  /** Explicit visibility flag (false = Hidden, true = Visible) */
  isVisible?: boolean;
  /** Secondary explicit APK hide flag (true = Hidden from APK) */
  hideFromApk?: boolean;
  /** Status string: 'active' or 'hidden' */
  status?: 'active' | 'hidden' | string;
  
  /** Firestore server timestamp or timestamp number */
  updatedAt?: any;
}


// ============================================================================
// 3. WHOLESALE ORDERS SCHEMA
// ============================================================================

/**
 * Individual item inside an order cart
 */
export interface OrderCartItem {
  /** Reference product ID */
  photoId: string;
  /** Product code (e.g. 'ER-101') */
  photoCode: string;
  /** Image URL */
  imageUri: string;
  /** Category ID */
  categoryId: string;
  /** Subcategory title */
  subCategoryName: string;
  /** Selected option variant letter or label (e.g. 'A', 'B', 'Black') */
  optionLetter: string;
  /** Custom label string if applicable */
  customLabel?: string;
  /** Quantity ordered (number of pieces/boxes) */
  quantity: number;
  
  id?: string;
  name?: string;
  category?: string;
  variant?: string;
  price?: number;
}

/**
 * Firestore Collection: 'orders'
 * Document ID: e.g. 'ord-5501', or auto-generated Firestore doc ID
 */
export interface WholesaleOrder {
  /** Unique Order ID in Firestore */
  id: string;
  /** Human readable order number (e.g., 'ORD-5501') */
  orderNumber: string;
  /** Customer unique code (e.g. 'CUST-101', 'CUST-RIYAZ-1') */
  customerCode: string;
  /** Customer shop title */
  shopName: string;
  /** City name */
  cityName: string;
  /** Contact phone number */
  mobileNumber: string;
  
  /** Array of ordered items */
  items: OrderCartItem[];
  /** Sum total of items across all variants */
  totalItemsCount: number;
  
  /** Department packing statuses: 'PENDING' | 'DONE' | 'NOT_APPLICABLE' */
  imitationStatus: string;
  cosmeticsStatus: string;
  hairStatus: string;
  
  /** Overall order status: 'PENDING' | 'PROCESSING' | 'PACKED' | 'DISPATCHED' | 'DONE' */
  overallStatus: 'PENDING' | 'PROCESSING' | 'PACKED' | 'DISPATCHED' | 'DONE' | string;
  
  /** Text notes provided during order placement */
  notes: string;
  /** Alternative order notes field */
  orderNote?: string;
  
  /** URL to recorded voice note MP3/WAV file in Firebase Storage */
  voiceNoteUrl?: string;
  /** Alternative voice note field */
  voiceNote?: string;
  
  /** Creation Unix timestamp in milliseconds */
  createdAt: number;
  /** Order origin source */
  source?: 'SALESMAN' | 'CUSTOMER';
  /** Salesman name if created via salesman tablet */
  salesmanName?: string;
  /** Formatted date string (e.g. '18-09-2026') */
  dateFormatted?: string;
}


// ============================================================================
// 4. JSON SCHEMA DEFINITIONS FOR VALIDATION
// ============================================================================

export const FirestoreCollectionsSchema = {
  products: {
    collectionName: "products",
    fallbackCollectionName: "photos",
    primaryKey: "id",
    fields: {
      id: { type: "string", required: true },
      photoCode: { type: "string", required: true },
      categoryId: { type: "string", required: true },
      subCategoryId: { type: "string", required: true },
      imageUri: { type: "string", required: true },
      itemCount: { type: "number", default: 1 },
      defaultQuantity: { type: "number", default: 12 },
      sortOrder: { type: "number", default: 0 },
      description: { type: "string", default: "" },
      variants: { type: "array", items: "ProductVariant" },
      customLabels: { type: "array", items: "string" },
      isHidden: { type: "boolean", default: false, description: "True hides item from Customer APK" },
      isVisible: { type: "boolean", default: true, description: "False hides item from Customer APK" },
      hideFromApk: { type: "boolean", default: false, description: "True hides item from Customer APK" },
      status: { type: "string", enum: ["active", "hidden"], default: "active" },
      updatedAt: { type: "timestamp" }
    }
  },
  categories: {
    collectionName: "categories",
    primaryKey: "id",
    fields: {
      id: { type: "string", required: true },
      displayName: { type: "string", required: true },
      thumbnailUrl: { type: "string" },
      accentColorHex: { type: "string" },
      sortOrder: { type: "number", default: 0 }
    }
  },
  subCategories: {
    collectionName: "subCategories",
    primaryKey: "id",
    fields: {
      id: { type: "string", required: true },
      categoryId: { type: "string", required: true },
      name: { type: "string", required: true },
      iconName: { type: "string" },
      thumbnailUrl: { type: "string" },
      photoCount: { type: "number", default: 0 },
      sortOrder: { type: "number", default: 0 }
    }
  },
  orders: {
    collectionName: "orders",
    primaryKey: "id",
    fields: {
      id: { type: "string", required: true },
      orderNumber: { type: "string", required: true },
      customerCode: { type: "string", required: true },
      shopName: { type: "string", required: true },
      cityName: { type: "string" },
      mobileNumber: { type: "string" },
      items: { type: "array", items: "OrderCartItem" },
      totalItemsCount: { type: "number", required: true },
      imitationStatus: { type: "string", default: "PENDING" },
      cosmeticsStatus: { type: "string", default: "PENDING" },
      hairStatus: { type: "string", default: "PENDING" },
      overallStatus: { type: "string", default: "PENDING" },
      notes: { type: "string" },
      voiceNoteUrl: { type: "string" },
      createdAt: { type: "number", required: true }
    }
  }
} as const;
