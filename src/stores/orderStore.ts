// 📁 src/stores/orderStore.ts
 
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types';
import { useAuthStore } from './authStore';
import api from '@/lib/api';

// ✅ URL UNIQUE
const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

// =============================================
// CONSTANTES
// =============================================

const MAX_ORDERS_IN_PROGRESS = 2;

// =============================================
// HELPERS DE CACHE
// =============================================

const getCachedOrders = (): { data: Order[]; timestamp: number } | null => {
  try {
    const cached = localStorage.getItem('sante_plus_orders_cache');
    if (cached) return JSON.parse(cached);
    return null;
  } catch { return null; }
};

const setCachedOrders = (orders: Order[]) => {
  try {
    localStorage.setItem('sante_plus_orders_cache', JSON.stringify({
      data: orders,
      timestamp: Date.now(),
    }));
  } catch { /* ignore */ }
};

const clearCachedOrders = () => {
  try {
    localStorage.removeItem('sante_plus_orders_cache');
  } catch { /* ignore */ }
};

// =============================================
// ORDER STORE
// =============================================

interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  lastFetch: number | null;
  isCacheInvalidated: boolean;
  
  fetchOrders: (force?: boolean) => Promise<void>;
  fetchOrderById: (id: string) => Promise<void>;
  createOrder: (data: any) => Promise<Order>;
  updateOrder: (id: string, data: Partial<Order>) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  confirmPayment: (id: string, transactionId: string) => Promise<void>;
  takeOrder: (id: string, lat?: number | null, lng?: number | null) => Promise<any>;
  acceptOrder: (id: string) => Promise<void>;
  prepareOrder: (id: string) => Promise<void>;
  markOrderReady: (id: string) => Promise<void>;
  startDelivery: (id: string, location?: { lat: number; lng: number }) => Promise<void>;
  completeDelivery: (id: string, data: {
    proof_url: string | null;
    delivery_fee: number;
    payment_method: 'online' | 'cash';
    cash_amount_received?: number;
    lat?: number | null;
    lng?: number | null;
  }) => Promise<void>;
  confirmCashPayment: (id: string, isConfirmed: boolean) => Promise<void>;
  getAssignedOrders: () => Order[];
  getAvailableOrders: () => Promise<Order[]>;
  getDeliveryOrders: () => Order[];
  canManageOrders: () => boolean;
  invalidateCache: () => void;
  refresh: () => Promise<void>;
  clearError: () => void;
  
  checkOrderQuota: () => Promise<{ current: number; max: number; available: number; canTake: boolean }>;
  getQuotaInfo: () => { current: number; max: number; available: number; canTake: boolean };
  autoValidateOrder: (id: string) => Promise<void>;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  currentOrder: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  lastFetch: null,
  isCacheInvalidated: false,

  canManageOrders: () => {
    const { profile } = useAuthStore.getState();
    return profile?.role === 'admin' || profile?.role === 'coordinator';
  },

  invalidateCache: () => {
    clearCachedOrders();
    set({ 
      isCacheInvalidated: true,
      isInitialized: false,
      lastFetch: null,
    });
  },

  refresh: async () => {
    get().invalidateCache();
    await get().fetchOrders(true);
  },

  checkOrderQuota: async () => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) {
        return { current: 0, max: MAX_ORDERS_IN_PROGRESS, available: 0, canTake: false };
      }

      const { data: aidant } = await supabase
        .from('aidants')
        .select('current_orders, max_orders')
        .eq('user_id', user.id)
        .single();

      if (!aidant) {
        return { current: 0, max: MAX_ORDERS_IN_PROGRESS, available: 0, canTake: false };
      }

      const current = aidant.current_orders || 0;
      const max = aidant.max_orders || MAX_ORDERS_IN_PROGRESS;
      const available = max - current;

      return {
        current,
        max,
        available,
        canTake: current < max,
      };
    } catch (error) {
      console.error('❌ checkOrderQuota error:', error);
      return { current: 0, max: MAX_ORDERS_IN_PROGRESS, available: 0, canTake: false };
    }
  },

  getQuotaInfo: () => {
    const state = get();
    const { user } = useAuthStore.getState();
    
    const inProgressOrders = state.orders.filter(
      (o: any) => o.status === 'en_cours' && o.aidant_id === user?.id
    );
    
    const current = inProgressOrders.length;
    const max = MAX_ORDERS_IN_PROGRESS;
    const available = max - current;

    return {
      current,
      max,
      available,
      canTake: current < max,
    };
  },

  fetchOrders: async (force = false) => {
    const state = get();
    if (state.isLoading && !force) return;

    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/orders');
      const ordersData = response.data || [];

      set({ 
        orders: ordersData, 
        isLoading: false,
        isInitialized: true,
        lastFetch: Date.now(),
        isCacheInvalidated: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchOrderById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.get(`/orders/${id}`);
      set({ currentOrder: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createOrder: async (data: any): Promise<Order> => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post('/orders', data);
      const newOrder = response.data?.order || response.data;

      get().invalidateCache();
      await get().fetchOrders(true);

      set({ isLoading: false });

      return newOrder;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // ✅ METHODE DE MISE À JOUR GLOBAL DE COMMANDE
  updateOrder: async (id: string, data: Partial<Order>) => {
    try {
      set({ isLoading: true, error: null });
      await api.put(`/orders/${id}`, data);
      
      clearCachedOrders();
      await get().fetchOrders(true);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  confirmPayment: async (id: string, transactionId: string) => {
    try {
      set({ isLoading: true, error: null });
      await api.post(`/orders/${id}/confirm-payment`, { transaction_id: transactionId });
      get().invalidateCache();
      await get().fetchOrders(true);
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  takeOrder: async (id: string, lat?: number | null, lng?: number | null) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const response = await api.post(`/orders/${id}/take`, { lat, lng });
      const order = response.data?.order || response.data;

      if (!order) {
        throw new Error('Erreur lors de la prise de commande');
      }

      set((state) => ({
        orders: state.orders.map(o => o.id === id ? order : o),
        currentOrder: state.currentOrder?.id === id ? order : state.currentOrder
      }));

      clearCachedOrders();
      await get().fetchOrders(true);

      set({ isLoading: false });
      return order;
    } catch (error: any) {
      console.error('❌ Take order error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  acceptOrder: async (id: string) => {
    let startLat: number | null = null;
    let startLng: number | null = null;

    try {
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        startLat = position.coords.latitude;
        startLng = position.coords.longitude;
      }
    } catch (e) {
      console.warn("⚠️ Impossible de récupérer le GPS");
    }

    return get().takeOrder(id, startLat, startLng);
  },

  prepareOrder: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post(`/orders/${id}/prepare`);
      const order = response.data?.order || response.data;
      
      set((state) => ({ orders: state.orders.map(o => o.id === id ? order : o) }));

      clearCachedOrders();
      await get().fetchOrders(true);
      set({ isLoading: false });
    } catch (error: any) {
      console.error('❌ Prepare order error:', error);
      set({ isLoading: false });
    }
  },

  markOrderReady: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post(`/orders/${id}/status`, { status: 'disponible' });
      const order = response.data?.order || response.data;
      
      set((state) => ({ orders: state.orders.map(o => o.id === id ? order : o) }));

      clearCachedOrders();
      await get().fetchOrders(true);
      set({ isLoading: false });
    } catch (error: any) {
      console.error('❌ Mark ready error:', error);
      set({ isLoading: false });
    }
  },

  startDelivery: async (id: string, location?: { lat: number; lng: number }) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post(`/orders/${id}/deliver`, { location });
      const order = response.data?.order || response.data;
      
      set((state) => ({ orders: state.orders.map(o => o.id === id ? order : o) }));

      clearCachedOrders();
      await get().fetchOrders(true);
      set({ isLoading: false });
    } catch (error: any) {
      console.error('❌ Start delivery error:', error);
      set({ isLoading: false });
    }
  },

  completeDelivery: async (id: string, data: {
    proof_url: string | null;
    delivery_fee: number;
    payment_method: 'online' | 'cash';
    cash_amount_received?: number;
    lat?: number | null;
    lng?: number | null;
  }) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post(`/orders/${id}/deliver`, data);
      const order = response.data?.order || response.data;
      
      set((state) => ({ 
        orders: state.orders.map(o => o.id === id ? order : o),
        currentOrder: state.currentOrder?.id === id ? order : state.currentOrder
      }));

      clearCachedOrders();
      await get().fetchOrders(true);
      set({ isLoading: false });
    } catch (error: any) {
      console.error('❌ Complete delivery error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  confirmCashPayment: async (id: string, isConfirmed: boolean) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post(`/orders/${id}/confirm-cash`, { is_confirmed: isConfirmed });
      const order = response.data?.order || response.data;
      
      set((state) => ({ 
        orders: state.orders.map(o => o.id === id ? order : o),
        currentOrder: state.currentOrder?.id === id ? order : state.currentOrder
      }));

      clearCachedOrders();
      await get().fetchOrders(true);
      set({ isLoading: false });
    } catch (error: any) {
      console.error('❌ Confirm cash payment error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  autoValidateOrder: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      const response = await fetch(`${API_URL}/orders/${id}/auto-validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      const order = result?.order || result;
      
      set((state) => ({ orders: state.orders.map(o => o.id === id ? order : o) }));

      clearCachedOrders();
      await get().fetchOrders(true);
      set({ isLoading: false });
    } catch (error: any) {
      console.error('❌ Auto-validate error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  updateOrderStatus: async (id: string, status: OrderStatus) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post(`/orders/${id}/status`, { status });
      const order = response.data?.order || response.data;

      set((state) => ({
        orders: state.orders.map(o => o.id === id ? order : o),
        currentOrder: state.currentOrder?.id === id ? order : state.currentOrder
      }));

      clearCachedOrders();
      await get().fetchOrders(true);
      set({ isLoading: false });
    } catch (error: any) {
      console.error('❌ Update order status error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteOrder: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      await api.delete(`/orders/${id}`);

      clearCachedOrders();
      await get().fetchOrders(true);
      set({ isLoading: false });
    } catch (error: any) {
      console.error('❌ Delete order error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getAvailableOrders: async (): Promise<Order[]> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      const response = await fetch(`${API_URL}/orders/available`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      return result.data || [];
    } catch (error: any) {
      console.error('❌ Get available orders error:', error);
      return [];
    }
  },

  getAssignedOrders: () => {
    const { user } = useAuthStore.getState();
    const state = get();
    return state.orders.filter((o: any) => o.aidant_id === user?.id);
  },

  getDeliveryOrders: () => {
    const state = get();
    return state.orders.filter((o: any) => o.status === 'en_cours');
  },

  clearError: () => set({ error: null }),
}));

export default useOrderStore;
