import { useState } from 'react';
import { useAppStore } from '../store';
import { 
  Package, 
  UserPlus, 
  Users, 
  Layers, 
  Smartphone, 
  Search, 
  CheckCircle2, 
  Clock, 
  Printer, 
  Plus, 
  Trash2, 
  Copy, 
  Video, 
  ShoppingBag, 
  Check, 
  MapPin,
  Phone,
  RefreshCw,
  Lock,
  Unlock,
  ShieldCheck,
  MessageCircle
} from 'lucide-react';
import { MainCategory, CatalogPhoto } from '../types';
import { ChatModal } from '../components/ChatModal';

export function AdminDashboard() {
  // Admin PIN Protection (Default PIN: 1234)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('shivam_admin_auth') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [selectedChatCustomer, setSelectedChatCustomer] = useState<string | null>(null);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === '1234') {
      sessionStorage.setItem('shivam_admin_auth', 'true');
      setIsAdminAuthenticated(true);
      setPinError(false);
      setPinInput('');
    } else {
      setPinError(true);
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('shivam_admin_auth');
    setIsAdminAuthenticated(false);
  };

  const [activeTab, setActiveTab] = useState<'orders' | 'customers' | 'catalog' | 'messages' | 'mobile_guide'>('orders');
  
  const orders = useAppStore(state => state.orders);
  const customers = useAppStore(state => state.customers);
  const categories = useAppStore(state => state.categories);
