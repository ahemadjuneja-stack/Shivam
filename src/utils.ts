export function getTextColorForBackground(hexColor: string): string {
  if (!hexColor) return '#ffffff';
  
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6 && hex.length !== 3) return '#ffffff';

  const fullHex = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;

  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  // Calculate perceived brightness
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;

  return yiq >= 128 ? '#000000' : '#ffffff';
}

/**
 * Strictly formats a timestamp into 12-hour AM/PM format (e.g. "02:30 PM", "11:15 AM")
 */
export function formatOrderTime12Hour(timestamp: number | string | Date | undefined): string {
  if (!timestamp) return '--:-- --';
  const date = typeof timestamp === 'number' 
    ? new Date(timestamp) 
    : typeof timestamp === 'string' && !isNaN(Number(timestamp))
    ? new Date(Number(timestamp))
    : new Date(timestamp);

  if (isNaN(date.getTime())) {
    return '--:-- --';
  }

  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const strHours = hours < 10 ? `0${hours}` : `${hours}`;
  const strMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${strHours}:${strMinutes} ${ampm}`;
}

/**
 * Formats a date into DD-MM-YYYY format (e.g. "19-09-2026")
 */
export function formatOrderDate(timestamp: number | string | Date | undefined): string {
  if (!timestamp) return '';
  const date = typeof timestamp === 'number' 
    ? new Date(timestamp) 
    : typeof timestamp === 'string' && !isNaN(Number(timestamp))
    ? new Date(Number(timestamp))
    : new Date(timestamp);

  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Safely parses Firestore timestamps, ISO strings, Date objects, or millisecond numbers into milliseconds.
 */
export function parseOrderTimestamp(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val?.toMillis === 'function') return val.toMillis();
  if (typeof val?.toDate === 'function') return val.toDate().getTime();
  if (typeof val?.seconds === 'number') {
    return val.seconds * 1000 + (val.nanoseconds ? Math.floor(val.nanoseconds / 1e6) : 0);
  }
  if (val instanceof Date) return isNaN(val.getTime()) ? 0 : val.getTime();
  if (typeof val === 'string') {
    const num = Number(val);
    if (!isNaN(num) && num > 0) return num;
    const parsed = Date.parse(val);
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

/**
 * Universal image fallback helper matching app's active image keys
 */
export const resolveItemImage = (item: any): string => {
  if (!item) return '';
  if (typeof item.imageUri === 'string' && item.imageUri) return item.imageUri;
  if (typeof item.image === 'string' && item.image) return item.image;
  if (typeof item.imageUrl === 'string' && item.imageUrl) return item.imageUrl;
  if (typeof item.photo === 'string' && item.photo) return item.photo;
  if (Array.isArray(item.images) && item.images.length > 0 && typeof item.images[0] === 'string') {
    return item.images[0];
  }
  return '';
};

export interface GroupedOrderItem {
  key: string;
  photoCode: string;
  imageUri: string;
  totalQuantity: number;
  shadesText: string;
}

/**
 * Groups an order's items array by product (key = photoId, fallback photoCode).
 * Returns grouped products with shade breakdown (e.g. "B: 12 · C: 36 · D: 21")
 * and total design & piece counts.
 */
export function groupOrderItemsForDisplay(rawItems: any): {
  groupedProducts: GroupedOrderItem[];
  totalDesigns: number;
  totalPieces: number;
} {
  const itemsList = Array.isArray(rawItems)
    ? rawItems
    : (typeof rawItems === 'object' && rawItems !== null)
      ? Object.values(rawItems)
      : [];

  const groupMap = new Map<string, {
    key: string;
    photoCode: string;
    imageUri: string;
    totalQuantity: number;
    shadesMap: Map<string, number>;
  }>();

  itemsList.forEach((item: any, idx: number) => {
    if (!item) return;
    const photoId = (item.photoId || item.id || '').toString().trim();
    const photoCode = (item.photoCode || item.code || item.name || `Item #${idx + 1}`).toString().trim();
    const key = photoId || photoCode || `item-${idx}`;
    const imageUri = resolveItemImage(item);
    const optionLetter = (item.optionLetter || item.variant || item.option || 'A').toString().trim();
    const qty = Number(item.quantity || item.qty) || 0;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        photoCode,
        imageUri,
        totalQuantity: 0,
        shadesMap: new Map<string, number>()
      });
    }

    const group = groupMap.get(key)!;
    if (!group.imageUri && imageUri) {
      group.imageUri = imageUri;
    }
    group.totalQuantity += qty;
    group.shadesMap.set(optionLetter, (group.shadesMap.get(optionLetter) || 0) + qty);
  });

  const groupedProducts: GroupedOrderItem[] = Array.from(groupMap.values()).map(group => {
    const shadesList = Array.from(group.shadesMap.entries()).map(([opt, qty]) => ({
      optionLetter: opt,
      quantity: qty
    }));

    shadesList.sort((a, b) => a.optionLetter.localeCompare(b.optionLetter, undefined, { numeric: true, sensitivity: 'base' }));

    const shadesText = shadesList.map(s => `${s.optionLetter}: ${s.quantity}`).join(' · ');

    return {
      key: group.key,
      photoCode: group.photoCode,
      imageUri: group.imageUri,
      totalQuantity: group.totalQuantity,
      shadesText
    };
  });

  const totalDesigns = groupedProducts.length;
  const totalPieces = groupedProducts.reduce((sum, p) => sum + p.totalQuantity, 0);

  return {
    groupedProducts,
    totalDesigns,
    totalPieces
  };
}

export interface CategoryStatusResult {
  present: ('imitation' | 'cosmetics' | 'hair')[];
  done: Record<'imitation' | 'cosmetics' | 'hair', boolean>;
  overall: 'PENDING' | 'IN PROGRESS' | 'DONE';
}

export function getOrderCategoryStatus(
  order: any,
  catalogCategories?: any[]
): CategoryStatusResult {
  const isDoneVal = (s?: string | null): boolean => {
    if (!s) return false;
    const c = String(s).toLowerCase().trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
    return ['done', 'packed', 'completed', 'fully packed', 'ready to ship'].includes(c);
  };

  const isNotApplicable = (s?: string | null): boolean => {
    if (!s) return true;
    const c = String(s).toLowerCase().trim().replace(/_/g, ' ');
    return c === 'not applicable' || c === 'n/a' || c === 'not_applicable' || c === 'none';
  };

  const presentSet = new Set<'imitation' | 'cosmetics' | 'hair'>();

  // Check top-level legacy fields
  if (order.imitationStatus && !isNotApplicable(order.imitationStatus)) presentSet.add('imitation');
  if (order.cosmeticsStatus && !isNotApplicable(order.cosmeticsStatus)) presentSet.add('cosmetics');
  if (order.hairStatus && !isNotApplicable(order.hairStatus)) presentSet.add('hair');

  // Check departmentStatus object
  if (order.departmentStatus && typeof order.departmentStatus === 'object') {
    Object.entries(order.departmentStatus).forEach(([key, val]) => {
      const k = key.toLowerCase().trim();
      const st = val && typeof val === 'object' ? (val as any).status : null;
      if (st && !isNotApplicable(st)) {
        if (k.includes('imitation')) presentSet.add('imitation');
        else if (k.includes('cosmetic')) presentSet.add('cosmetics');
        else if (k.includes('hair')) presentSet.add('hair');
      }
    });
  }

  // Check order.items
  if (Array.isArray(order.items) && order.items.length > 0) {
    order.items.forEach((item: any) => {
      const catId = String(item.categoryId || item.category || '').toLowerCase().trim();

      if (catId.includes('imitation') || catId === 'cat-1789888076918') presentSet.add('imitation');
      else if (catId.includes('cosmetic') || catId === 'cat-1789888279190') presentSet.add('cosmetics');
      else if (catId.includes('hair') || catId === 'cat-1789888067134') presentSet.add('hair');

      if (catalogCategories && Array.isArray(catalogCategories)) {
        const matched = catalogCategories.find((c: any) => c.id === item.categoryId || c.id === item.category);
        if (matched) {
          const dn = String(matched.displayName || matched.id).toLowerCase();
          if (dn.includes('imitation')) presentSet.add('imitation');
          else if (dn.includes('cosmetic')) presentSet.add('cosmetics');
          else if (dn.includes('hair')) presentSet.add('hair');
        }
      }
    });
  }

  const present = Array.from(presentSet);

  const doneMap: Record<'imitation' | 'cosmetics' | 'hair', boolean> = {
    imitation: false,
    cosmetics: false,
    hair: false
  };

  const checkDeptDone = (
    legacyStatus?: string | null,
    deptObjKeys: string[] = []
  ): boolean => {
    if (isDoneVal(legacyStatus)) return true;
    if (order.departmentStatus && typeof order.departmentStatus === 'object') {
      for (const k of deptObjKeys) {
        if (order.departmentStatus[k] && isDoneVal(order.departmentStatus[k].status)) {
          return true;
        }
      }
      for (const [k, v] of Object.entries(order.departmentStatus)) {
        const lk = k.toLowerCase().trim();
        if (deptObjKeys.some(dk => lk.includes(dk.toLowerCase())) && v && isDoneVal((v as any).status)) {
          return true;
        }
      }
    }
    return false;
  };

  doneMap.imitation = checkDeptDone(order.imitationStatus, ['imitation', 'IMITATION']);
  doneMap.cosmetics = checkDeptDone(order.cosmeticsStatus, ['cosmetics', 'cosmetic', 'COSMETIC']);
  doneMap.hair = checkDeptDone(order.hairStatus, ['hair', 'HAIR', 'HAIR ACCESSORIES']);

  let overall: 'PENDING' | 'IN PROGRESS' | 'DONE' = 'PENDING';

  if (present.length === 0) {
    const ov = String(order.overallStatus || '').toLowerCase().trim();
    if (['done', 'completed', 'ready to ship', 'packed'].includes(ov)) {
      overall = 'DONE';
    } else if (['in_progress', 'in progress', 'partially_packed', 'partially packed', 'processing'].includes(ov)) {
      overall = 'IN PROGRESS';
    } else {
      overall = 'PENDING';
    }
  } else {
    const doneCount = present.filter(cat => doneMap[cat]).length;
    if (doneCount === present.length) {
      overall = 'DONE';
    } else if (doneCount > 0 && present.length >= 2) {
      overall = 'IN PROGRESS';
    } else {
      overall = 'PENDING';
    }
  }

  return {
    present,
    done: doneMap,
    overall
  };
}


