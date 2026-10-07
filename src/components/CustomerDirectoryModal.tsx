import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppStore } from '../store';
import { Customer } from '../types';
import { syncCustomerToFirebase, deleteCustomerFromFirebase } from '../services/firebaseSync';
import { BrandLogo } from './BrandLogo';
import { CustomerProfilePage } from './CustomerProfilePage';
import { 
  Users, 
  Plus, 
  X, 
  Store, 
  Trash2, 
  CheckCircle2, 
  Lock, 
  Unlock,
  Check, 
  Shield, 
  Layers, 
  Copy, 
  CheckSquare, 
  Square,
  AlertTriangle,
  RefreshCw,
  Edit
} from 'lucide-react';


let cachedCustomers: Customer[] = [];
let hasLoadedOnce = false;

interface CustomerDirectoryModalProps {
  onClose: () => void;
  onSelectShopFilter?: (shopName: string) => void;
  onOpenChatWithCustomer?: (customerCode: string) => void;
}

export const CustomerDirectoryModal: React.FC<CustomerDirectoryModalProps> = ({
  onClose
}) => {
  const { customers, orders, categories, subCategories, addCustomer, updateCustomer, deleteCustomer, setCustomers } = useAppStore();
  
  // Seed cachedCustomers if Zustand store already had data from initial app sync
  if (!hasLoadedOnce && customers && customers.length > 0) {
    cachedCustomers = customers;
    hasLoadedOnce = true;
  }

  const [isLoading, setIsLoading] = useState(!hasLoadedOnce);
  const [selectedCustomerForModal, setSelectedCustomerForModal] = useState<Customer | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);

  // App version badge state
  const [latestAppVersion, setLatestAppVersion] = useState<number | null>(null);
  const [appVersionMap, setAppVersionMap] = useState<Record<string, { appVersion: number; lastCheckAt?: any; name?: string }>>({});

  // Sync latest app version reference and client check-in reports
  useEffect(() => {
    let unsubConfig: (() => void) | undefined;
    let unsubClientVersions: (() => void) | undefined;

    try {
      unsubConfig = onSnapshot(doc(db, 'config', 'appVersion'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const v = typeof data?.versionCode === 'number' ? data.versionCode : (data?.versionCode ? Number(data.versionCode) : null);
          setLatestAppVersion(v);
        }
      }, (error) => {
        console.warn('Firebase config/appVersion snapshot notice:', error);
      });
    } catch (err) {
      console.warn('Error setting up config/appVersion listener:', err);
    }

    try {
      unsubClientVersions = onSnapshot(collection(db, 'clientVersions'), (snapshot) => {
        const map: Record<string, { appVersion: number; lastCheckAt?: any; name?: string }> = {};
        snapshot.forEach((d) => {
          const data = d.data();
          map[d.id] = {
            appVersion: Number(data.appVersion || 0),
            lastCheckAt: data.lastCheckAt,
            name: data.name
          };
        });
        setAppVersionMap(map);
      }, (error) => {
        console.warn('Firebase clientVersions snapshot notice:', error);
      });
    } catch (err) {
      console.warn('Error setting up clientVersions listener:', err);
    }

    return () => {
      if (unsubConfig) unsubConfig();
      if (unsubClientVersions) unsubClientVersions();
    };
  }, []);

  useEffect(() => {
    if (cachedCustomers.length > 0 && customers.length === 0) {
      setCustomers(cachedCustomers);
    }

    const customersCol = collection(db, 'customers');
    const unsubscribe = onSnapshot(customersCol, (snapshot) => {
      const firestoreCustomers: Customer[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const customerCode = data.customerCode || docSnap.id;
        const status = data.status || (data.isVerified ? 'Verified' : 'Pending');
        const lastActiveVal = typeof data.lastActive === 'object' && data.lastActive?.seconds 
          ? data.lastActive.seconds * 1000 
          : (typeof data.lastActive === 'number' ? data.lastActive : undefined);
          
        firestoreCustomers.push({
          id: docSnap.id,
          customerCode,
          shopName: data.shopName || data.name || data.businessName || 'Unnamed Shop',
          contactPerson: data.contactPerson || data.name || '',
          mobileNumber: data.mobileNumber || data.phone || data.mobile || '',
          cityName: data.cityName || data.city || '',
          address: data.address || '',
          pin: data.pin || '1111',
          status: status as 'Verified' | 'Pending',
          isVerified: status === 'Verified' || data.isVerified === true,
          role: data.role || 'User',
          staffCategory: data.staffCategory || '',
          allowedCategories: Array.isArray(data.allowedCategories) ? data.allowedCategories : [],
          allowedSubCategories: Array.isArray(data.allowedSubCategories) ? data.allowedSubCategories : [],
          fcmToken: data.fcmToken || data.token,
          isOnline: Boolean(data.isOnline),
          lastActive: lastActiveVal,
          location: data.location,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          visitingCardUrl: data.visitingCardUrl || undefined,
          deviceInfo: data.deviceInfo || undefined,
          loginHistory: Array.isArray(data.loginHistory) ? data.loginHistory : [],
          sectionViews: data.sectionViews && typeof data.sectionViews === 'object' ? data.sectionViews : {},
          cartAbandon: data.cartAbandon || undefined
        } as Customer);
      });

      cachedCustomers = firestoreCustomers;
      hasLoadedOnce = true;
      setCustomers(firestoreCustomers);
      setIsLoading(false);
    }, (error) => {
      console.warn('Firebase customers snapshot notice:', error);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [setCustomers]);

  // Modal Form State (Left Column)
  const [modalShopName, setModalShopName] = useState('');
  const [modalContactPerson, setModalContactPerson] = useState('');
  const [modalMobileNumber, setModalMobileNumber] = useState('');
  const [modalCityName, setModalCityName] = useState('');
  const [modalAddress, setModalAddress] = useState('');

  // Selected Customer Profile Overlay State
  const [profileCustomer, setProfileCustomer] = useState<Customer | null>(null);

  // Modal Security & Permissions State (Right Column)
  const [modalCustomerCode, setModalCustomerCode] = useState('');
  const [modalPin, setModalPin] = useState('1111');
  const [modalStatus, setModalStatus] = useState<'Verified' | 'Pending' | 'Approved'>('Pending');
  const [modalAllowedCategories, setModalAllowedCategories] = useState<string[]>([]);
  const [modalAllowedSubCategories, setModalAllowedSubCategories] = useState<string[]>([]);
  const [modalRole, setModalRole] = useState('User');
  const [modalStaffCategory, setModalStaffCategory] = useState('');

  const [validationError, setValidationError] = useState('');

  // Delete Confirmation & Toast State
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showCardLightbox, setShowCardLightbox] = useState(false);

  // 1. Live status calculation helper
  const checkIsOnline = (c: Customer) => {
    if (c.isOnline) return true;
    if (c.lastActive && (Date.now() - c.lastActive) < 120000) return true; // < 2m
    return false;
  };

  // 2. Relative time calculation
  const getRelativeTime = (timestamp?: number) => {
    if (!timestamp) return 'Inactive';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // App version status helper
  const getAppVerStatus = (customer: Customer) => {
    const info = appVersionMap[customer.customerCode];
    const reported = Boolean(info);
    const version = reported ? info.appVersion : null;
    const isLatest = Boolean(reported && latestAppVersion !== null && version === latestAppVersion);
    return {
      version,
      isLatest,
      reported,
      lastCheckAt: info?.lastCheckAt
    };
  };

  const formatLastCheckTime = (lastCheckAt: any): string => {
    if (!lastCheckAt) return 'No check-in recorded';
    if (typeof lastCheckAt?.toDate === 'function') {
      return `Last check: ${lastCheckAt.toDate().toLocaleString()}`;
    }
    if (typeof lastCheckAt?.seconds === 'number') {
      return `Last check: ${new Date(lastCheckAt.seconds * 1000).toLocaleString()}`;
    }
    if (typeof lastCheckAt === 'number' || typeof lastCheckAt === 'string') {
      const d = new Date(lastCheckAt);
      return isNaN(d.getTime()) ? 'No check-in recorded' : `Last check: ${d.toLocaleString()}`;
    }
    return 'No check-in recorded';
  };

  // 3. Sort customers (Pending registrations appear at top of table)
  const sortedCustomers = [...customers].sort((a, b) => {
    const statusA = a.status || 'Pending';
    const statusB = b.status || 'Pending';
    
    if (statusA === 'Pending' && statusB !== 'Pending') return -1;
    if (statusA !== 'Pending' && statusB === 'Pending') return 1;

    // Secondary sort: online state
    const onlineA = checkIsOnline(a) ? 1 : 0;
    const onlineB = checkIsOnline(b) ? 1 : 0;
    if (onlineA !== onlineB) return onlineB - onlineA;

    // Tertiary sort: last active timestamp
    return (b.lastActive || 0) - (a.lastActive || 0);
  });

  // Calculate order count for specific customer code / shop name
  const getOrderCountForCustomer = (shopName: string, customerCode: string) => {
    return orders.filter(
      o => (o.shopName && o.shopName.toLowerCase() === shopName.toLowerCase()) || 
           o.customerCode === customerCode
    ).length;
  };

  // Copy Customer ID Helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setShowCopyFeedback(true);
    setTimeout(() => setShowCopyFeedback(false), 2000);
  };

  // SS+6 (8-char no-dash, unique check getDoc) Customer ID Generator
  const generateSSCustomerCode = async (): Promise<string> => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const random6 = Math.floor(100000 + Math.random() * 900000);
      const candidate = `SS${random6}`;
      try {
        const docRef = doc(db, 'customers', candidate);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          return candidate;
        }
      } catch (err) {
        console.warn('Unique customer code check warning:', err);
        return candidate;
      }
    }
    const random7 = Math.floor(1000000 + Math.random() * 9000000);
    return `SS${random7}`;
  };

  // DEVICE-LOCK-RESET (per-customer control)
  const handleResetDeviceLock = async (customer: Customer) => {
    if (window.confirm(`Device unlock ho jayega — naye device se login hoga for "${customer.shopName}" (${customer.customerCode}). Confirm?`)) {
      try {
        const updated: Customer = {
          ...customer,
          activeDeviceId: null,
          deviceBoundAt: null
        };
        updateCustomer(customer.customerCode, updated);
        const custRef = doc(db, 'customers', customer.customerCode);
        await updateDoc(custRef, { activeDeviceId: null, deviceBoundAt: null });
        setToastMessage(`Device lock reset for ${customer.shopName}. New device login enabled.`);
        setTimeout(() => setToastMessage(null), 3000);
      } catch (err) {
        console.error('Error resetting device lock:', err);
        setToastMessage('Failed to reset device lock.');
        setTimeout(() => setToastMessage(null), 3000);
      }
    }
  };

  // Start edit flow / Open two-column modal
  const handleOpenEditModal = (customer: Customer) => {
    setSelectedCustomerForModal(customer);
    setIsAddMode(false);
    setValidationError('');

    // Load Left Panel State
    setModalShopName(customer.shopName);
    setModalContactPerson(customer.contactPerson || '');
    setModalMobileNumber(customer.mobileNumber);
    setModalCityName(customer.cityName);
    setModalAddress(customer.address || '');

    // Load Right Panel State
    setModalCustomerCode(customer.customerCode);
    setModalPin(customer.pin || '1111');
    setModalStatus(customer.status || 'Pending');
    setModalRole(customer.role || 'User');
    setModalStaffCategory(customer.staffCategory || '');

    // Checked by default logic: if not defined, give full access
    const savedCats = customer.allowedCategoryIds !== undefined
      ? customer.allowedCategoryIds
      : (customer.allowedCategories !== undefined ? customer.allowedCategories : null);

    const allowedCats = (savedCats === null || savedCats.includes('all'))
      ? categories.map(c => c.id)
      : savedCats;

    const savedSubs = customer.allowedSubCategoryIds !== undefined
      ? customer.allowedSubCategoryIds
      : (customer.allowedSubCategories !== undefined ? customer.allowedSubCategories : null);

    const allowedSubs = (savedSubs === null || savedSubs.includes('all'))
      ? subCategories.map(s => s.id)
      : savedSubs;

    setModalAllowedCategories(allowedCats);
    setModalAllowedSubCategories(allowedSubs);
  };

  // Start add flow
  const handleOpenAddModal = async () => {
    setIsAddMode(true);
    setSelectedCustomerForModal({} as Customer);
    setValidationError('');

    const newCode = await generateSSCustomerCode();
    setModalCustomerCode(newCode);

    setModalShopName('');
    setModalContactPerson('');
    setModalMobileNumber('');
    setModalCityName('');
    setModalAddress('');
    setModalPin('1111');
    setModalStatus('Pending');
    setModalRole('User');
    setModalStaffCategory('');

    // Checked by default
    setModalAllowedCategories(categories.map(c => c.id));
    setModalAllowedSubCategories(subCategories.map(s => s.id));
  };

  // Save/Update handler
  const handleSaveCustomer = async () => {
    if (!modalShopName.trim()) {
      setValidationError('Shop Name is required.');
      return;
    }
    if (!modalCityName.trim()) {
      setValidationError('City Name is required.');
      return;
    }
    if (!modalMobileNumber.trim()) {
      setValidationError('Mobile Number is required.');
      return;
    }

    const pinPattern = /^\d{4}$/;
    if (!pinPattern.test(modalPin)) {
      setValidationError('Security PIN must be exactly 4 digits.');
      return;
    }

    const cleanCats = modalAllowedCategories.filter(id => id !== 'all');
    const cleanSubs = modalAllowedSubCategories.filter(id => id !== 'all');

    const updatedCustomer: Customer = {
      customerCode: modalCustomerCode,
      shopName: modalShopName.trim(),
      contactPerson: modalContactPerson.trim(),
      mobileNumber: modalMobileNumber.trim(),
      cityName: modalCityName.trim(),
      address: modalAddress.trim(),
      status: modalStatus,
      isVerified: modalStatus === 'Verified',
      pin: modalPin,
      allowedCategories: cleanCats,
      allowedSubCategories: cleanSubs,
      allowedCategoryIds: cleanCats,
      allowedSubCategoryIds: cleanSubs,
      role: modalRole,
      staffCategory: modalRole === 'Shivam Staff' ? modalStaffCategory : undefined,
      // Keep online / active status if editing
      isOnline: isAddMode ? false : (selectedCustomerForModal?.isOnline ?? false),
      lastActive: isAddMode ? Date.now() : (selectedCustomerForModal?.lastActive ?? Date.now())
    };

    if (isAddMode) {
      addCustomer(updatedCustomer);
      await syncCustomerToFirebase(updatedCustomer);
      setToastMessage(`New customer "${updatedCustomer.shopName}" registered successfully.`);
    } else {
      updateCustomer(modalCustomerCode, updatedCustomer);
      await syncCustomerToFirebase(updatedCustomer);
      setToastMessage(`Customer "${updatedCustomer.shopName}" profile updated successfully.`);
    }

    setTimeout(() => setToastMessage(null), 3000);
    setSelectedCustomerForModal(null);
  };

  // Real-time Delete Handler with Firestore sync
  const handleConfirmDeleteCustomer = async () => {
    if (!customerToDelete || customerToDelete.customerCode === 'AJ78692') {
      console.warn('Blocked deletion attempt of protected Admin ID AJ78692');
      setCustomerToDelete(null);
      return;
    }
    setIsDeleting(true);
    try {
      const code = customerToDelete.customerCode;
      const name = customerToDelete.shopName;
      
      // Delete from Zustand local store
      deleteCustomer(code);
      
      // Delete document from Firestore real-time collection
      await deleteCustomerFromFirebase(code);
      
      setToastMessage(`Customer "${name}" (${code}) was permanently deleted.`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Failed to delete customer from Firestore:', err);
      setToastMessage('Error deleting customer from database.');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsDeleting(false);
      setCustomerToDelete(null);
    }
  };

  // Quick Approve/Verify handler directly from directory list
  const handleQuickVerifyCustomer = async (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    const updatedCustomer: Customer = {
      ...customer,
      status: 'Verified',
      isVerified: true
    };
    updateCustomer(customer.customerCode, updatedCustomer);
    await syncCustomerToFirebase(updatedCustomer);
    setToastMessage(`Customer "${customer.shopName}" (${customer.customerCode}) verified successfully!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Tree permissions: Category Toggle Helper
  const handleCategoryPermissionToggle = (catId: string) => {
    const isSelected = modalAllowedCategories.includes(catId);
    let newCats = [...modalAllowedCategories];
    let newSubs = [...modalAllowedSubCategories];

    if (isSelected) {
      // Uncheck category & remove all children subcategories
      newCats = newCats.filter(id => id !== catId);
      const childSubIds = subCategories.filter(s => s.categoryId === catId).map(s => s.id);
      newSubs = newSubs.filter(id => !childSubIds.includes(id));
    } else {
      // Check category & add all children subcategories
      newCats.push(catId);
      const childSubIds = subCategories.filter(s => s.categoryId === catId).map(s => s.id);
      childSubIds.forEach(id => {
        if (!newSubs.includes(id)) {
          newSubs.push(id);
        }
      });
    }

    setModalAllowedCategories(newCats);
    setModalAllowedSubCategories(newSubs);
  };

  // Tree permissions: SubCategory Toggle Helper
  const handleSubCategoryPermissionToggle = (subId: string, catId: string) => {
    const isSelected = modalAllowedSubCategories.includes(subId);
    let newSubs = [...modalAllowedSubCategories];
    let newCats = [...modalAllowedCategories];

    if (isSelected) {
      newSubs = newSubs.filter(id => id !== subId);
      // Optional: If all subcategories of a category are unchecked, we can keep category checked or uncheck it.
      // Let's keep parent category checked unless we want to toggle it.
    } else {
      newSubs.push(subId);
      // Auto-check parent category if a subcategory is selected
      if (!newCats.includes(catId)) {
        newCats.push(catId);
      }
    }

    setModalAllowedCategories(newCats);
    setModalAllowedSubCategories(newSubs);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1120] flex flex-col h-full w-full overflow-hidden animate-in fade-in duration-150 text-slate-100 font-sans">
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-[#0B1120]">
        
        {/* Top Header Panel */}
        <div className="px-6 py-4 bg-[#0B1120] border-b border-[#334155]/60 flex items-center justify-between flex-shrink-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center text-[#3B82F6]">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-base font-medium text-[#F1F5F9] flex items-center gap-2 tracking-tight">
                <span>Access Control & Customer Directory</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#1E293B] text-[#94A3B8] text-[10px] font-mono font-bold border border-[#334155]/60 inline-flex items-center gap-1.5 min-h-[22px]">
                  {isLoading ? (
                    <>
                      <div className="w-2.5 h-2.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading...</span>
                    </>
                  ) : (
                    `${customers.length} Registered`
                  )}
                </span>
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" />
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-blue-500/10"
            >
              <Plus size={15} />
              <span>Register New Shop</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#1E293B] text-[#94A3B8] hover:text-white hover:bg-[#334155] transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Directory Table Area */}
        <div className="flex-1 overflow-auto p-6 custom-scrollbar bg-[#0F172A]/40">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-slate-400">Loading directory...</p>
            </div>
          ) : sortedCustomers.length === 0 ? (
            <div className="py-24 text-center text-[#64748B] space-y-3">
              <Store size={44} className="mx-auto text-[#2563EB]/40" />
              <p className="text-sm font-bold text-[#94A3B8]">No matching clients found</p>
              <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                No active or pending shops found. Register a new shop.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-full">
              <div className="min-w-[1100px] space-y-3">
                
                {/* Header Grid */}
                <div className="grid grid-cols-[160px_2fr_1.2fr_150px_110px_110px_1.2fr_70px_90px] gap-4 px-5 py-3 text-[10px] font-mono font-bold tracking-wider text-[#94A3B8] uppercase border-b border-[#334155]/30">
                  <div>City</div>
                  <div>Shop Name</div>
                  <div>Owner / Name</div>
                  <div>Mobile Number</div>
                  <div>Active Status</div>
                  <div>APP VER</div>
                  <div>Location</div>
                  <div>Role</div>
                  <div className="text-right pr-2">Actions</div>
                </div>

                {/* Body Rows */}
                {sortedCustomers.map((customer, index) => {
                  const isOnline = checkIsOnline(customer);

                  // Alternating modern dark-graphite slate row cards
                  const rowBg = index % 2 === 0 ? 'bg-[#0F172A]' : 'bg-[#1E293B]/70';

                  return (
                    <div
                      key={customer.customerCode}
                      onClick={() => setProfileCustomer(customer)}
                      className={`grid grid-cols-[160px_2fr_1.2fr_150px_110px_110px_1.2fr_70px_90px] gap-4 px-5 py-3 items-center ${rowBg} border border-[#334155]/40 hover:border-[#3B82F6]/60 rounded-2xl shadow-lg transition duration-150 cursor-pointer group`}
                    >
                      {/* CITY */}
                      <div className="text-[#38BDF8] font-extrabold text-xs sm:text-sm uppercase tracking-wide drop-shadow-sm truncate whitespace-nowrap overflow-hidden text-ellipsis" title={customer.cityName}>
                        {(customer.cityName || '').toUpperCase()}
                      </div>

                      {/* SHOP NAME */}
                      <div className="flex items-center gap-2 pr-2 min-w-0">
                        {(customer.customerCode === 'AJ78692' || customer.role === 'ADMIN') && (
                          <span className="text-amber-400 font-bold text-sm flex-shrink-0" title="Protected Admin ID">👑</span>
                        )}
                        <span className="text-white font-black text-sm sm:text-base group-hover:text-[#60A5FA] transition uppercase tracking-wide truncate whitespace-nowrap overflow-hidden text-ellipsis min-w-0" title={customer.shopName}>
                          {(customer.shopName || '').toUpperCase()}
                        </span>
                        {customer.activeDeviceId ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-500/30 text-[9px] font-bold flex items-center gap-0.5 flex-shrink-0" title={`Bound device: ${customer.activeDeviceId}`}>
                            <Lock size={9} />
                            <span>Bound</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold flex items-center gap-0.5 flex-shrink-0">
                            <Unlock size={9} />
                            <span>Unbound</span>
                          </span>
                        )}
                      </div>

                      {/* NAME */}
                      <div className="text-[#E2E8F0] text-sm font-bold pr-2 truncate whitespace-nowrap overflow-hidden text-ellipsis" title={customer.contactPerson}>
                        {customer.contactPerson || 'Proprietor'}
                      </div>

                      {/* MOBILE NUMBER */}
                      <div className="text-[#F8FAFC] font-mono text-sm sm:text-base font-bold tracking-wide truncate whitespace-nowrap overflow-hidden text-ellipsis">
                        {customer.mobileNumber}
                      </div>

                      {/* ACTIVE STATUS */}
                      <div className="truncate whitespace-nowrap overflow-hidden text-ellipsis">
                        {isOnline ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#064E3B]/60 text-[#34D399] font-bold text-[10px] border border-[#059669]/30 w-fit">
                            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#34D399]"></span>
                            </span>
                            <span>Online</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#334155]/40 text-[#94A3B8] font-bold text-[10px] border border-[#475569]/30 w-fit font-mono">
                            {getRelativeTime(customer.lastActive)}
                          </span>
                        )}
                      </div>

                      {/* APP VER */}
                      <div className="flex items-center truncate whitespace-nowrap overflow-hidden text-ellipsis">
                        {(() => {
                          const { version, isLatest, reported, lastCheckAt } = getAppVerStatus(customer);
                          const readableTime = formatLastCheckTime(lastCheckAt);

                          if (reported && isLatest) {
                            return (
                              <span
                                title={readableTime}
                                className="bg-emerald-950/90 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold rounded-full px-2.5 py-1 flex items-center gap-1 w-fit shadow-sm flex-shrink-0"
                              >
                                <span>v{version}</span>
                                <span>✓</span>
                              </span>
                            );
                          }

                          if (reported && !isLatest) {
                            return (
                              <span
                                title={readableTime}
                                className="bg-amber-950/90 text-amber-400 border border-amber-500/40 text-[10px] font-bold rounded-full px-2.5 py-1 flex items-center gap-1 w-fit shadow-sm flex-shrink-0"
                              >
                                <span>v{version} → v{latestAppVersion ?? '?'}</span>
                              </span>
                            );
                          }

                          return (
                            <span
                              title={readableTime}
                              className="bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold rounded-full px-2.5 py-1 w-fit shadow-sm flex-shrink-0"
                            >
                              No report
                            </span>
                          );
                        })()}
                      </div>

                      {/* LOCATION */}
                      {(() => {
                        const loc = (customer as any).location;
                        let text = '';
                        if (loc?.city || loc?.taluka) {
                          const locCity = (loc.city || '').trim().toUpperCase();
                          const locTaluka = (loc.taluka || '').trim().toUpperCase();
                          const primaryLoc = locCity && locTaluka && locCity !== locTaluka 
                            ? `${locCity}, ${locTaluka}` 
                            : (locCity || locTaluka);
                          
                          if (primaryLoc) {
                            text = primaryLoc.split(',')[0].trim();
                          }
                        }
                        
                        if (!text) {
                          text = (customer.address || customer.cityName || '').trim();
                        }

                        if (!text) {
                          text = 'No GPS';
                        }

                        return (
                          <div className="text-xs text-slate-300 font-bold truncate whitespace-nowrap overflow-hidden text-ellipsis" title={text}>
                            {text}
                          </div>
                        );
                      })()}

                      {/* ROLE */}
                      <div className="truncate whitespace-nowrap overflow-hidden text-ellipsis">
                        {(() => {
                          const isStaff = (customer.role || '').toLowerCase().includes('staff') || (customer.staffCategory && customer.staffCategory.trim().length > 0);
                          return (
                            <span className={`inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                              isStaff 
                                ? 'bg-[#78350F]/60 text-[#FDE68A] border-[#D97706]/50 shadow-sm' 
                                : 'bg-[#1E1B4B] text-[#C7D2FE] border-[#312E81]'
                            }`}>
                              {isStaff ? 'STAFF' : (customer.role || 'User')}
                            </span>
                          );
                        })()}
                      </div>

                      {/* ACTIONS */}
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        
                        {/* Edit Profile & Security Settings */}
                        <button
                          onClick={() => handleOpenEditModal(customer)}
                          className="p-1.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-[#94A3B8] hover:text-white transition-colors"
                          title="Edit Profile & Security Settings"
                        >
                          <Edit size={13} />
                        </button>

                        {/* Reset Device Lock */}
                        <button
                          onClick={() => handleResetDeviceLock(customer)}
                          className="p-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition-colors"
                          title="Reset Device Lock (Unlock for new device login)"
                        >
                          <Unlock size={13} />
                        </button>

                        {/* Delete with Confirmation Modal (Protected for AJ78692) */}
                        {customer.customerCode !== 'AJ78692' && (
                          <button
                            onClick={() => setCustomerToDelete(customer)}
                            className="p-1.5 rounded-xl bg-[#7F1D1D]/20 hover:bg-[#7F1D1D]/40 border border-[#EF4444]/20 text-[#FCA5A5] transition-colors"
                            title="Delete customer account"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })}

              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TWO-COLUMN DETAILS & SECURITY/PERMISSIONS MODAL POPUP */}
        {/* ------------------------------------------------------------- */}
        {selectedCustomerForModal && (
          <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
            <div className="bg-[#1E293B] border border-[#334155] rounded-3xl w-[92vw] max-w-5xl h-[90vh] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              
              {/* Modal Header */}
              <div className="px-6 py-4 bg-[#0B1120] border-b border-[#334155]/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center text-[#3B82F6]">
                    <Shield size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[#F1F5F9] flex items-center gap-2">
                      <span>{isAddMode ? 'Add Wholesale Customer Account' : 'Security Settings & Client Profile'}</span>
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCustomerForModal(null)}
                  className="p-1.5 rounded-lg bg-[#1E293B] text-[#94A3B8] hover:text-white transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body (Two-Column Layout) */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 custom-scrollbar text-xs">
                
                {/* ----------------- LEFT PANEL: Biodata & Activity ----------------- */}
                <div className="space-y-4 pr-1">
                  <h4 className="text-xs font-bold font-mono text-[#3B82F6] tracking-wider uppercase border-b border-[#334155]/60 pb-1.5 flex items-center gap-1.5">
                    <Store size={14} />
                    <span>Client Biodata & Logs</span>
                  </h4>

                  {validationError && (
                    <div className="p-3 rounded-xl bg-red-950/70 border border-red-800/60 text-red-200 text-xs leading-relaxed">
                      {validationError}
                    </div>
                  )}

                  {/* Shop Name */}
                  <div className="space-y-1">
                    <label className="block font-bold text-[#94A3B8]">Shop / Wholesale Business Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Radhe Novelty & Cosmetics"
                      value={modalShopName}
                      onChange={(e) => setModalShopName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]/80 focus:ring-1 focus:ring-[#3B82F6]/40 transition-all shadow-inner"
                    />
                  </div>

                  {/* Owner Full Name */}
                  <div className="space-y-1">
                    <label className="block font-bold text-[#94A3B8]">Owner Full Name (Contact Person)</label>
                    <input
                      type="text"
                      placeholder="e.g. Jayesh Bhai Patel"
                      value={modalContactPerson}
                      onChange={(e) => setModalContactPerson(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]/80 focus:ring-1 focus:ring-[#3B82F6]/40 transition-all shadow-inner"
                    />
                  </div>

                  {/* Mobile Number & City Name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block font-bold text-[#94A3B8]">Mobile Number *</label>
                      <input
                        type="tel"
                        placeholder="e.g. 9825011223"
                        value={modalMobileNumber}
                        onChange={(e) => setModalMobileNumber(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-[#F8FAFC] font-mono placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]/80 focus:ring-1 focus:ring-[#3B82F6]/40 transition-all shadow-inner"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-bold text-[#94A3B8]">City *</label>
                      <input
                        type="text"
                        placeholder="e.g. Rajkot"
                        value={modalCityName}
                        onChange={(e) => setModalCityName(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]/80 focus:ring-1 focus:ring-[#3B82F6]/40 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-1">
                    <label className="block font-bold text-[#94A3B8]">Full Address & Landmarks</label>
                    <textarea
                      placeholder="e.g. Shop 42, Golden Plaza, Soni Bazar Road"
                      rows={2}
                      value={modalAddress}
                      onChange={(e) => setModalAddress(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]/80 focus:ring-1 focus:ring-[#3B82F6]/40 transition-all shadow-inner resize-none"
                    />
                  </div>

                  {!isAddMode && selectedCustomerForModal?.visitingCardUrl && (
                    <div className="space-y-1">
                      <label className="block font-bold text-[#94A3B8]">Visiting Card</label>
                      <button
                        type="button"
                        onClick={() => setShowCardLightbox(true)}
                        className="block w-full aspect-[9/5] rounded-xl overflow-hidden border border-[#334155] bg-black hover:border-[#3B82F6]/60 transition-all group"
                      >
                        <img src={selectedCustomerForModal.visitingCardUrl} alt="Customer Visiting Card" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                      </button>
                    </div>
                  )}

                  {/* Activity Stats: Orders */}
                  {!isAddMode && (
                    <div className="flex items-center justify-between p-3.5 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#3B82F6] flex items-center justify-center">
                          <Layers size={15} />
                        </div>
                        <div>
                          <span className="text-[11px] text-[#94A3B8] block font-medium">Activity History</span>
                          <span className="text-[#F1F5F9] font-black text-xs">Total Orders Placed</span>
                        </div>
                      </div>
                      <div className="px-3.5 py-1.5 bg-[#2563EB]/20 text-[#3B82F6] border border-[#2563EB]/30 text-sm font-black rounded-xl">
                        {getOrderCountForCustomer(modalShopName, modalCustomerCode)}
                      </div>
                    </div>
                  )}

                </div>

                {/* ----------------- RIGHT PANEL: Security & Catalog Permissions ----------------- */}
                <div className="space-y-4 border-t md:border-t-0 md:border-l border-[#334155]/60 pt-4 md:pt-0 md:pl-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold font-mono text-[#3B82F6] tracking-wider uppercase border-b border-[#334155]/60 pb-1.5 flex items-center gap-1.5">
                      <Lock size={14} />
                      <span>Security & Catalog Permissions</span>
                    </h4>

                    {/* System User ID Prominent */}
                    <div className="p-4 bg-[#0F172A] border border-[#334155] rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#64748B] font-mono block uppercase">Wholesale System ID</span>
                        <span className="text-base font-black font-mono text-[#F1F5F9] mt-1 block tracking-wider">
                          {modalCustomerCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(modalCustomerCode)}
                        className="px-3 py-1.5 rounded-xl bg-[#1E293B] border border-[#334155] hover:border-[#64748B] text-[#94A3B8] font-bold flex items-center gap-1.5 transition active:scale-95"
                      >
                        {showCopyFeedback ? (
                          <>
                            <Check size={12} className="text-emerald-400" />
                            <span className="text-[10px] text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span className="text-[10px]">Copy ID</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Reset ID & Force Logout Option (for existing customers, protected for AJ78692) */}
                    {!isAddMode && modalCustomerCode !== 'AJ78692' && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to reset ID for "${modalShopName}" (${modalCustomerCode}) and instantly force logout their session?`)) {
                            const newCode = await generateSSCustomerCode();
                            const updatedCustomer: Customer = {
                              customerCode: newCode,
                              shopName: modalShopName.trim(),
                              contactPerson: modalContactPerson.trim(),
                              mobileNumber: modalMobileNumber.trim(),
                              cityName: modalCityName.trim(),
                              address: modalAddress.trim(),
                              status: modalStatus,
                              isVerified: modalStatus === 'Verified',
                              pin: modalPin,
                              allowedCategories: modalAllowedCategories,
                              allowedSubCategories: modalAllowedSubCategories,
                              staffCategory: modalRole === 'Shivam Staff' ? modalStaffCategory.trim() : undefined,
                              role: modalRole,
                              lastActive: Date.now()
                            };

                            // Delete old record and add new record with new ID
                            deleteCustomer(modalCustomerCode);
                            await deleteCustomerFromFirebase(modalCustomerCode);

                            addCustomer(updatedCustomer);
                            await syncCustomerToFirebase(updatedCustomer);

                            // Force logout locally if currently logged in customer matches
                            const currentCust = useAppStore.getState().currentCustomer;
                            if (currentCust && currentCust.customerCode.toLowerCase() === modalCustomerCode.toLowerCase()) {
                              useAppStore.getState().setCurrentCustomer(null);
                            }

                            setToastMessage(`Customer ID reset to ${newCode}. Session force logged out.`);
                            setTimeout(() => setToastMessage(null), 4000);
                            setSelectedCustomerForModal(null);
                          }
                        }}
                        className="w-full py-2.5 px-3 rounded-2xl bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-400 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-sm"
                      >
                        <RefreshCw size={14} />
                        <span>Reset ID & Force Logout</span>
                      </button>
                    )}

                    {/* Security PIN & Status Toggle */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block font-bold text-[#94A3B8]">4-Digit Security PIN</label>
                        <input
                          type="text"
                          maxLength={4}
                          value={modalPin}
                          onChange={(e) => setModalPin(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-[#F8FAFC] font-mono text-center tracking-widest text-sm focus:outline-none focus:border-[#3B82F6] transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-bold text-[#94A3B8]">Verification Status</label>
                        <select
                          value={modalStatus}
                          onChange={(e) => setModalStatus(e.target.value as 'Verified' | 'Pending')}
                          className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] transition"
                        >
                          <option value="Pending">Pending Validation</option>
                          <option value="Verified">Verified Retailer</option>
                        </select>
                      </div>
                    </div>

                    {/* Role Selection & Staff Department Assignment */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="block font-bold text-[#94A3B8]">System Role</label>
                        <select
                          value={modalRole}
                          onChange={(e) => setModalRole(e.target.value)}
                          className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] transition"
                        >
                          <option value="User">User (Default)</option>
                          <option value="Shivam Staff">Shivam Staff</option>
                        </select>
                      </div>

                      {modalRole === 'Shivam Staff' && (
                        <div className="p-3 bg-[#1E293B] border border-[#334155] rounded-2xl space-y-2 animate-in fade-in duration-200">
                          <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                            Assign Staff Department / Category
                          </label>
                          <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                            {categories.map((cat) => {
                              const currentSelected = modalStaffCategory
                                ? modalStaffCategory.split(',').map(s => s.trim()).filter(Boolean)
                                : [];
                              const isAssigned = currentSelected.includes(cat.id);
                              
                              return (
                                <label key={cat.id} className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    onChange={(e) => {
                                      let updatedList = [...currentSelected];
                                      if (e.target.checked) {
                                        updatedList.push(cat.id);
                                      } else {
                                        updatedList = updatedList.filter(id => id !== cat.id);
                                      }
                                      setModalStaffCategory(updatedList.join(', '));
                                    }}
                                    className="rounded border-[#334155] text-[#3B82F6] focus:ring-[#3B82F6] bg-[#0F172A]"
                                  />
                                  <span className="text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5">
                                    <span 
                                      className="w-2 h-2 rounded-full inline-block" 
                                      style={{ backgroundColor: cat.accentColorHex || '#F59E0B' }}
                                    />
                                    {cat.displayName}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Catalog Category & Subcategory Permissions checklist tree */}
                    <div className="space-y-1.5">
                      <label className="block font-bold text-[#94A3B8]">Catalog Access & Visibility Tree</label>

                      <div className="bg-[#0F172A] p-4 rounded-2xl border border-[#334155]/60 max-h-[220px] overflow-y-auto space-y-3 custom-scrollbar">
                        {categories.map((cat) => {
                          const isCatChecked = modalAllowedCategories.includes(cat.id);
                          const catSubs = subCategories.filter(s => s.categoryId === cat.id);

                          return (
                            <div key={cat.id} className="space-y-1">
                              {/* Category Header */}
                              <div className="flex items-center gap-2 py-1.5 border-b border-[#334155]/20">
                                <button
                                  type="button"
                                  onClick={() => handleCategoryPermissionToggle(cat.id)}
                                  className="text-[#64748B] hover:text-white transition"
                                >
                                  {isCatChecked ? (
                                    <CheckSquare size={16} className="text-[#3B82F6]" />
                                  ) : (
                                    <Square size={16} className="text-[#334155]" />
                                  )}
                                </button>
                                <span className="font-bold text-[#F1F5F9] text-xs flex items-center gap-1.5">
                                  <span 
                                    className="w-2.5 h-2.5 rounded-full inline-block" 
                                    style={{ backgroundColor: cat.accentColorHex || '#F59E0B' }}
                                  />
                                  <span>{cat.displayName}</span>
                                </span>
                              </div>

                              {/* Nested Subcategories */}
                              <div className="pl-6 space-y-1 pt-1.5 pb-1">
                                {catSubs.map((sub) => {
                                  const isSubChecked = modalAllowedSubCategories.includes(sub.id);
                                  return (
                                    <div key={sub.id} className="flex items-center gap-2 py-0.5">
                                      <button
                                        type="button"
                                        onClick={() => handleSubCategoryPermissionToggle(sub.id, cat.id)}
                                        className="text-[#64748B] hover:text-white transition"
                                      >
                                        {isSubChecked ? (
                                          <CheckSquare size={14} className="text-[#3B82F6]/80" />
                                        ) : (
                                          <Square size={14} className="text-[#334155]" />
                                        )}
                                      </button>
                                      <span className="text-[#94A3B8] font-medium text-[11px]">
                                        {sub.name}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons inside right panel footer */}
                  <div className="pt-4 border-t border-[#334155]/60 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerForModal(null)}
                      className="px-4 py-2 rounded-xl bg-[#0F172A] border border-[#334155] hover:bg-[#1E293B] text-[#94A3B8] font-bold transition active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCustomer}
                      className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold transition active:scale-95 shadow-lg shadow-blue-500/10 flex items-center gap-1.5"
                    >
                      <span>Save Changes</span>
                    </button>
                  </div>

                </div>

              </div>

            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* CUSTOM DELETE CONFIRMATION MODAL */}
        {/* ------------------------------------------------------------- */}
        {customerToDelete && (
          <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#1E293B] border border-red-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 space-y-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto">
                <AlertTriangle size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white">Delete Customer Account</h3>
                <p className="text-xs text-slate-300 leading-relaxed px-2">
                  Are you sure you want to delete this customer? This action will permanently remove their access and immediately log them out.
                </p>
              </div>

              {/* Customer summary pill */}
              <div className="p-3.5 bg-[#0F172A] border border-[#334155] rounded-2xl text-left text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white text-sm">{customerToDelete.shopName}</span>
                  <span className="font-mono text-[10px] text-blue-400 font-bold px-2 py-0.5 bg-blue-500/10 rounded-lg border border-blue-500/20">{customerToDelete.customerCode}</span>
                </div>
                <div className="text-slate-400">{customerToDelete.contactPerson || 'Proprietor'} • {customerToDelete.cityName}</div>
                <div className="text-slate-500 font-mono text-[11px]">{customerToDelete.mobileNumber}</div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setCustomerToDelete(null)}
                  className="py-2.5 rounded-xl bg-[#0F172A] border border-[#334155] hover:bg-[#334155] text-slate-300 text-xs font-bold transition active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDeleteCustomer}
                  className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <span>Deleting...</span>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Yes, Delete Customer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-[200] bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 border border-emerald-400 animate-in slide-in-from-top-4">
            <CheckCircle2 size={18} />
            <span>{toastMessage}</span>
          </div>
        )}

        {showCardLightbox && selectedCustomerForModal?.visitingCardUrl && (
          <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowCardLightbox(false)}>
            <img src={selectedCustomerForModal.visitingCardUrl} alt="Customer Visiting Card" className="max-w-full max-h-full object-contain rounded-xl" />
            <button type="button" onClick={() => setShowCardLightbox(false)} className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl font-black leading-none">✕</button>
          </div>
        )}

        {/* Customer Full Profile Page Overlay */}
        {profileCustomer && (
          <CustomerProfilePage
            customer={profileCustomer}
            orders={orders}
            onClose={() => setProfileCustomer(null)}
            onVerifyCustomer={async (cust) => {
              await handleQuickVerifyCustomer({} as any, cust);
              setProfileCustomer({ ...cust, isVerified: true, status: 'Verified' });
            }}
          />
        )}

      </div>
    </div>
  );
};
