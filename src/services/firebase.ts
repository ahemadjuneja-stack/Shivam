import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, COLLECTIONS, handleFirestoreError, OperationType } from '../firebase';
import { uploadMediaToStorage } from './storageService';
import { Customer, WholesaleOrder, OrderCartItem } from '../types';

export * from '../firebase';

/**
 * Direct helper to register a new customer shop in Firestore
 */
export async function registerCustomerDirectly(registrationData: {
  shopName: string;
  ownerName: string;
  phone: string;
  mobileNumber?: string;
  city: string;
  cityName?: string;
  address: string;
  pin?: string;
  contactPerson?: string;
}): Promise<{ success: boolean; customerId: string; customer?: Customer; error?: any }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const error = new Error("Network Error: Please check your internet connection and try again.");
    return { success: false, customerId: '', error };
  }

  const newCustomerId = `CUST-${Date.now().toString().slice(-4)}`;
  const phoneVal = registrationData.mobileNumber || registrationData.phone || '';
  const cityVal = registrationData.cityName || registrationData.city || '';
  const ownerVal = registrationData.contactPerson || registrationData.ownerName || '';

  const customerPayload: Customer = {
    id: newCustomerId,
    customerId: newCustomerId,
    customerCode: newCustomerId,
    shopName: registrationData.shopName.trim(),
    ownerName: ownerVal.trim(),
    contactPerson: ownerVal.trim(),
    phone: phoneVal.trim(),
    mobileNumber: phoneVal.trim(),
    city: cityVal.trim(),
    cityName: cityVal.trim(),
    address: registrationData.address.trim(),
    pin: registrationData.pin?.trim() || '1111',
    status: 'PENDING',
    isVerified: false,
    role: 'User',
    allowedCategoryIds: ['all'],
    allowedSubCategoryIds: ['all'],
    isOnline: true,
    lastActive: Date.now(),
    createdAt: Date.now()
  };

  try {
    const custRef = doc(db, COLLECTIONS.CUSTOMERS, newCustomerId);
    await setDoc(custRef, customerPayload, { merge: true });
    console.log('Directly registered customer to Firestore:', newCustomerId);
    return { success: true, customerId: newCustomerId, customer: customerPayload };
  } catch (error) {
    console.error("Firestore Register Error:", error);
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.CUSTOMERS}/${newCustomerId}`);
    return { success: false, customerId: newCustomerId, error };
  }
}

/**
 * Direct helper to submit an order payload to Firestore
 */
export async function submitOrderDirectly(
  customer: Customer,
  cart: OrderCartItem[],
  orderNote: string = '',
  voiceNoteUrl: string | null = null,
  orderIdInput?: string
): Promise<{ success: boolean; orderId: string; order?: WholesaleOrder; error?: any }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { success: false, orderId: '', error: new Error("Network Error: Please check your internet connection and try again.") };
  }

  if (!cart || cart.length === 0) {
    console.warn("Cannot submit order: Cart is empty");
    return { success: false, orderId: '', error: new Error('Cart is empty') };
  }

  const orderId = orderIdInput || `ORD-${Date.now().toString().slice(-6)}`;
  const custId = customer.customerId || customer.customerCode || (customer as any).id || 'CUST-GUEST';

  const items = cart.map(item => {
    const resolvedImage = 
      item.imageUri || 
      item.imageUrl || 
      (item as any).image || 
      (item as any).photo || 
      (Array.isArray((item as any).images) && (item as any).images[0]) || 
      '';

    return {
      photoCode: item.photoCode || (item as any).code || (item as any).name || 'SKU',
      imageUri: resolvedImage,
      imageUrl: resolvedImage,
      quantity: Number(item.quantity || 1),
      category: (item as any).category || item.categoryId || '',
      categoryId: item.categoryId || (item as any).category || '',
      subCategoryName: item.subCategoryName || '',
      optionLetter: item.optionLetter || (item as any).variant || 'A',
      variant: (item as any).variant || item.optionLetter || 'A',
      price: Number((item as any).price) || 0,
      id: item.id || `${item.photoCode || 'SKU'}_${item.optionLetter || 'A'}`,
      name: (item as any).name || `${item.photoCode || 'SKU'} (Option ${item.optionLetter || 'A'} - ${item.subCategoryName || ''})`
    };
  });

  const totalItemsCount = cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);

  // Background non-blocking audio upload
  if (voiceNoteUrl) {
    uploadMediaToStorage(voiceNoteUrl, 'voice_notes', `order_voice_${orderId}`)
      .then(async (url) => {
        if (url) {
          try {
            const targetOrderRef = doc(db, COLLECTIONS.ORDERS, orderId);
            await updateDoc(targetOrderRef, {
              voiceNoteUrl: url,
              voiceUrl: url,
              audioUrl: url,
              voiceNoteUri: url
            });
            console.log('Background voice note attached successfully to order:', orderId);
          } catch (updateErr) {
            console.warn('Non-blocking voice note attachment notice:', updateErr);
          }
        }
      })
      .catch((err) => console.warn('Background voice note upload catch:', err));
  }

  const orderPayload: WholesaleOrder = {
    orderId,
    id: orderId,
    orderNumber: orderId,
    customerId: custId,
    customerCode: custId,
    shopName: customer.shopName || '',
    cityName: customer.city || customer.cityName || '',
    mobileNumber: customer.phone || customer.mobileNumber || '',
    items,
    itemCount: items.length,
    totalItemsCount,
    totalAmount: 0,
    orderNote: orderNote || '',
    notes: orderNote || '',
    voiceNoteUrl: '',
    voiceUrl: '',
    audioUrl: '',
    voiceNoteUri: '',
    status: 'Pending',
    overallStatus: 'RECEIVED',
    imitationStatus: 'PENDING',
    cosmeticsStatus: 'PENDING',
    hairStatus: 'PENDING',
    createdAt: Date.now()
  };

  try {
    const sanitizedPayload = JSON.parse(JSON.stringify(orderPayload));
    const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
    await setDoc(orderRef, sanitizedPayload, { merge: true });
    console.log('Order written directly to Firestore orders collection:', orderId);
    return { success: true, orderId, order: orderPayload };
  } catch (error) {
    console.error('Firestore Place Order Error:', error);
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.ORDERS}/${orderId}`);
    return { success: false, orderId, error };
  }
}
