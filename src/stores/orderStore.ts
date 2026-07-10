// 📁 frontend/src/stores/orderStore.ts
// ✅ STORE COMMANDES COMPLET : OPTIMISTIC UPDATES ET BY-PASS DU VERROU DE CACHE SUR FORCE-REFRESH

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types';
import { useAuthStore } from './authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast'; 

// ✅ IMPORTER LES HELPERS
import {
  getPonctualOrderPrice,
} from '@/lib/constants';

// ✅ URL UNIQUE
const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

// =============================================
// CONSTANTES
// =============================================

const STATUS_LABELS: Record<OrderStatus, string> = {
  creee: 'Créée',
  en_attente: 'En attente',
  disponible: 'Disponible',
  en_cours: 'En cours',
  livree: 'Livrée',
  validee: 'Validée',
  annulee: 'Annulée',
  attente_paiement: 'En attente paiement',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  creee: '#9E9E9E',
  en_attente: '#FF9800',
  disponible: '#F44336',
  en_cours: '#2196F3',
  livree: '#2196F3',
  validee: '#4CAF50',
  annulee: '#9E9E9E',
  attente_paiement: '#8b5cf6',
};

// ✅ QUOTA MAX DE COMMANDES EN COURS PAR AIDANT
const MAX_ORDERS_IN_PROGRESS = 2;

// =============================================
// HELPERS DE CACHE
// =============================================

const CACHE_KEY = 'sante_plus_orders_cache';
const CACHE_DURATION = 60000;

const getCachedOrders = (): { data: Order[]; timestamp: number } | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
    return null;
  } catch { return null; }
};

const setCachedOrders = (orders: Order[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: orders,
      timestamp: Date.now(),
    }));
  } catch { /* ignore */ }
};

const clearCachedOrders = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
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
  createOrder: (data: Partial<Order> & { 
    target_type?: 'personal' | 'patient'; 
    target_name?: string;
    wizard_choice?: string;
    selected_aidant_id?: string;
  }) => Promise<Order>;
  updateOrder: (id: string, data: Partial<Order>) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  confirmPayment: (id: string, transactionId: string) => Promise<void>;
  takeOrder: (id: string) => Promise<void>;
  acceptOrder: (id: string) => Promise<void>;
  prepareOrder: (id: string) => Promise<void>;
  markOrderReady: (id: string) => Promise<void>;
  startDelivery: (id: string, location?: { lat: number; lng: number }) => Promise<void>;
  completeDelivery: (id: string, proof_url?: string) => Promise<void>;
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

  // ============================================================
  // VÉRIFICATION DU QUOTA DE COMMANDES
  // ============================================================
  checkOrderQuota: async () => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) {
        return { current: 0, max: MAX_ORDERS_IN_PROGRESS, available: 0, canTake: false };
      }

      const { data: aidant, error } = await supabase
        .from('aidants')
        .select('current_orders, max_orders')
        .eq('user_id', user.id)
        .single();

      if (error || !aidant) {
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
      o => o.status === 'en_cours' && o.aidant_id === user?.id
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

  // ============================================================
  // FETCH ORDERS (Version réactive avec forçage de bypass)
  // ============================================================
  fetchOrders: async (force = false) => {
    const state = get();
    
    // ✅ CORRECTIF DU VERROU : Si force = true, on ignore totalement le lock 'isLoading'
    if (state.isLoading && !force) {
      console.log('ℹ️ Déjà en cours de chargement, skip...');
      return;
    }

    if (state.isCacheInvalidated) {
      force = true;
    }

    if (!force && state.lastFetch && (Date.now() - state.lastFetch < CACHE_DURATION)) {
      return;
    }

    if (!force) {
      const cached = getCachedOrders();
      if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        set({ 
          orders: cached.data, 
          isLoading: false, 
          isInitialized: true,
          lastFetch: cached.timestamp,
          isCacheInvalidated: false,
        });
        return;
      }
    }

    try {
      set({ isLoading: true, error: null, isCacheInvalidated: false });
      
      const { user } = useAuthStore.getState();
      if (!user) {
        set({ orders: [], isLoading: false });
        return;
      }

      const response = await api.get('/orders');
      const ordersData = response.data || [];

      setCachedOrders(ordersData);
      
      set({ 
        orders: ordersData, 
        isLoading: false,
        isInitialized: true,
        lastFetch: Date.now(),
        isCacheInvalidated: false,
      });
    } catch (error: any) {
      console.error('❌ Fetch orders error:', error);
      
      const cached = getCachedOrders();
      if (cached && cached.data.length > 0) {
        set({
          orders: cached.data,
          isLoading: false,
          isInitialized: true,
          lastFetch: cached.timestamp,
          error: error.message || 'Erreur de chargement (cache utilisé)',
          isCacheInvalidated: false,
        });
      } else {
        set({ error: error.message, isLoading: false });
      }
    }
  },

  fetchOrderById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const state = get();
      const cachedOrder = state.orders.find(o => o.id === id);
      if (cachedOrder) {
        set({ currentOrder: cachedOrder, isLoading: false });
        return;
      }

      const response = await api.get(`/orders/${id}`);
      const order = response.data;

      if (!order) {
        set({ error: 'Commande non trouvée', isLoading: false });
        return;
      }

      set({ currentOrder: order, isLoading: false });
    } catch (error: any) {
      console.error('❌ Fetch order error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  createOrder: async (data: Partial<Order> & { 
    target_type?: 'personal' | 'patient'; 
    target_name?: string;
    wizard_choice?: string;
    selected_aidant_id?: string;
  }): Promise<Order> => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      if (profile?.role === 'aidant') {
        throw new Error('Les aidants ne peuvent pas créer de commandes');
      }

      const targetType = data.target_type || (data.patient_id ? 'patient' : 'personal');
      const targetName = data.target_name || (data.patient_id ? null : profile?.full_name || 'Personnel');

      const isPonctual = data.order_type === 'ponctual' || false;
      let status: OrderStatus = 'creee';
      let requiresPayment = false;
      let paymentAmount = 0;

      if (isPonctual) {
        requiresPayment = true;
        status = 'attente_paiement';
        paymentAmount = getPonctualOrderPrice(data.items);
      } else {
        const { data: subscription } = await supabase
          .from('abonnements')
          .select('id, remaining_orders, status')
          .eq('user_id', user.id)
          .eq('status', 'actif')
          .maybeSingle();

        if (!subscription || subscription.remaining_orders <= 0) {
          requiresPayment = true;
          status = 'attente_paiement';
          paymentAmount = getPonctualOrderPrice(data.items);
        }
      }

      const orderData = {
        user_id: user.id,
        patient_id: data.patient_id || null,
        target_type: targetType,
        target_name: targetName,
        family_id: user.id,
        aidant_id: data.aidant_id || null,
        type: data.type || 'autre',
        description: data.description || 'Commande',
        address: data.address || 'Adresse non spécifiée',
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        status: status,
        estimated_amount: data.estimated_amount || 0,
        final_amount: data.final_amount || null,
        delivery_fee: data.delivery_fee || null,
        tip_amount: data.tip_amount || null,
        items: data.items || [],
        prescription_url: data.prescription_url || null,
        delivery_notes: data.delivery_notes || null,
        order_type: isPonctual ? 'ponctual' : 'subscription',
        is_paid: !requiresPayment,
        is_ponctual: isPonctual,
        wizard_choice: data.wizard_choice || null,
        selected_aidant_id: data.selected_aidant_id || null,
        metadata: {
          requires_payment: requiresPayment,
          created_by: user.id,
          created_at: new Date().toISOString(),
          payment_amount: requiresPayment ? paymentAmount : null,
        }
      };

      const response = await api.post('/orders', orderData);
      const newOrder = response.data?.order || response.data;

      get().invalidateCache();
      await get().fetchOrders(true);

      set({ isLoading: false });

      return newOrder;
    } catch (error: any) {
      console.error('❌ Create order error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  confirmPayment: async (id: string, transactionId: string) => {
    try {
      set({ isLoading: true, error: null });

      const response = await api.post(`/orders/${id}/confirm-payment`, { transaction_id: transactionId });
      const order = response.data?.order || response.data;

      // ✅ OPTIMISTIC UPDATE
      set((state) => ({
        orders: state.orders.map(o => o.id === id ? order : o),
        currentOrder: state.currentOrder?.id === id ? order : state.currentOrder
      }));

      get().invalidateCache();
      await get().fetchOrders(true);

      set({ isLoading: false });
    } catch (error: any) {
      console.error('❌ Confirm payment error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // ============================================================
  // PRENDRE UNE COMMANDE (PRISE DE COMMANDE OPTIMISTE)
  // ============================================================
  takeOrder: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const response = await api.post(`/orders/${id}/take`);
      const order = response.data?.order || response.data;

      if (!order) {
        throw new Error('Erreur lors de la prise de commande');
      }

      // ✅ OPTIMISTIC UPDATE : Injecter directement l'aidant et le nouveau statut dans le state local
      set((state) => ({
        orders: state.orders.map(o => o.id === id ? order : o),
        currentOrder: state.currentOrder?.id === id ? order : state.currentOrder
      }));

      // Vider radicalement le cache local pour forcer l'actualisation
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
    return get().takeOrder(id);
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
      toast.error(error.message);
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
      toast.error(error.message);
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
      toast.error(error.message);
      set({ isLoading: false });
    }
  },

  completeDelivery: async (id: string, proof_url?: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post(`/orders/${id}/complete`, { proof_url });
      const order = response.data?.order || response.data;
      
      set((state) => ({ orders: state.orders.map(o => o.id === id ? order : o) }));

      clearCachedOrders();
      await get().fetchOrders(true);
      set({ isLoading: false });
    } catch (error: any) {
      console.error('❌ Complete delivery error:', error);
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
      toast.error(error.message);
      set({ error: error.message, isLoading: false });
    }
  },

  updateOrderStatus: async (id: string, status: OrderStatus) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post(`/orders/${id}/status`, { status });
      const order = response.data?.order || response.data;

      // ✅ OPTIMISTIC UPDATE
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

  updateOrder: async (id: string, data: Partial<Order>) => {
    try {
      set({ isLoading: true, error: null });
      await api.put(`/orders/${id}`, data);
      
      clearCachedOrders();
      await get().fetchOrders(true);
      set({ isLoading: false });
    } catch (error: any) {
      console.error('❌ Update order error:', error);
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
    return state.orders.filter(o => o.aidant_id === user?.id);
  },

  getDeliveryOrders: () => {
    const state = get();
    return state.orders.filter(o => o.status === 'en_cours');
  },

  clearError: () => set({ error: null }),
}));
