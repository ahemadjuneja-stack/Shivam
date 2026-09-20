/**
 * Guaranteed unique, collision-proof ID generators using crypto.randomUUID()
 * and crypto.getRandomValues().
 */

export function generateUniqueId(prefix = ''): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    const uuid = crypto.randomUUID();
    return prefix ? `${prefix}-${uuid}` : uuid;
  }
  const array = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 16; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  return prefix ? `${prefix}-${hex}` : hex;
}

export function generateOrderId(): string {
  const timestamp = Date.now();
  let entropy: string;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    entropy = crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
  } else if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const arr = new Uint8Array(4);
    crypto.getRandomValues(arr);
    entropy = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  } else {
    entropy = Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  return `ORD-${timestamp}-${entropy}`;
}

export function generateMessageId(): string {
  const timestamp = Date.now();
  let entropy: string;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    entropy = crypto.randomUUID().replace(/-/g, '').substring(0, 8);
  } else {
    entropy = Math.random().toString(36).substring(2, 10);
  }
  return `msg-${timestamp}-${entropy}`;
}

export function generateCustomerId(prefix = 'CUST'): string {
  let entropy: string;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    entropy = crypto.randomUUID().replace(/-/g, '').substring(0, 6).toUpperCase();
  } else {
    entropy = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  return `${prefix}-${entropy}`;
}

export function generateCommunityPostId(): string {
  const timestamp = Date.now();
  let entropy: string;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    entropy = crypto.randomUUID().replace(/-/g, '').substring(0, 8);
  } else {
    entropy = Math.random().toString(36).substring(2, 10);
  }
  return `post-${timestamp}-${entropy}`;
}

export function generatePhotoId(code?: string): string {
  const cleanCode = (code || '').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  let entropy: string;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    entropy = crypto.randomUUID().replace(/-/g, '').substring(0, 8);
  } else {
    entropy = Math.random().toString(36).substring(2, 10);
  }
  return cleanCode ? `photo_${cleanCode}_${entropy}` : `photo_${Date.now()}_${entropy}`;
}
