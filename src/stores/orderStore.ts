// 📁 frontend/src/stores/orderStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types';
import { useAuthStore } from './authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

// ✅ IMPORTER LES HELPERS
import {
  getPonctualOrderPrice,
  getOrderStatusForCreation,
  requiresPonctualPayment,
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
    console.log('🗑️ Cache commandes invalidé');
  } catch { /* ignore */ }
};

// =============================================
// FONCTIONS UTILITAIRES
// =============================================

const getStatusLabel = (status: string): string => {
  return STATUS_LABELS[status as OrderStatus] || status;
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
  
  // 🆕 NOUVELLES FONCTIONS
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
    console.log('🔄 Cache commandes invalidé');
  },

  refresh: async () => {
    get().invalidateCache();
    await get().fetchOrders(true);
  },

  // ============================================================
  // 🆕 VÉRIFICATION DU QUOTA DE COMMANDES
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
    // Version synchrone pour l'affichage
    const state = get();
    const { user } = useAuthStore.getState();
    
    // Calculer à partir des commandes en cours
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
  // FETCH ORDERS - AVEC CACHE ET RÉCUPÉRATION DES AIDANTS
  // ============================================================
  fetchOrders: async (force = false) => {
    const state = get();
    
    if (state.isLoading) {
      console.log('ℹ️ Déjà en cours de chargement, skip...');
      return;
    }

    if (state.isCacheInvalidated) {
      force = true;
    }

    if (!force && state.lastFetch && (Date.now() - state.lastFetch < CACHE_DURATION)) {
      console.log('📦 Utilisation du cache mémoire commandes');
      return;
    }

    if (!force) {
      const cached = getCachedOrders();
      if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        console.log('📦 Utilisation du cache localStorage commandes');
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
      
      const { user, profile } = useAuthStore.getState();
      if (!user) {
        set({ orders: [], isLoading: false });
        return;
      }

      // ✅ Appel API
      const response = await api.get('/orders');
      const ordersData = response.data || [];

      // ✅ POUR LES FAMILLES : Forcer le rechargement des aidants
      let ordersWithFullRelations = ordersData;

      if (profile?.role === 'family' && ordersWithFullRelations.length > 0) {
        const aidantIds = [...new Set(
          ordersWithFullRelations
            .filter((o: any) => o.aidant_id)
            .map((o: any) => o.aidant_id)
        )];

        if (aidantIds.length > 0) {
          const { data: aidantsData } = await supabase
            .from('aidants')
            .select(`
              id,
              user_id,
              specialties,
              available,
              rating,
              total_missions,
              completed_missions,
              cancelled_missions,
              user:profiles!aidants_user_id_fkey (
                id,
                full_name,
                email,
                phone,
                avatar_url
              )
            `)
            .in('id', aidantIds);

          if (aidantsData) {
            const aidantMap = aidantsData.reduce((acc: any, a: any) => {
              acc[a.id] = a;
              return acc;
            }, {});

            ordersWithFullRelations = ordersWithFullRelations.map((order: any) => ({
              ...order,
              aidant: order.aidant_id ? aidantMap[order.aidant_id] || null : null,
            }));
          }
        }
      }

      setCachedOrders(ordersWithFullRelations);
      
      set({ 
        orders: ordersWithFullRelations || [], 
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

  // ============================================================
  // FETCH ORDER BY ID
  // ============================================================
  fetchOrderById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const state = get();
      const cachedOrder = state.orders.find(o => o.id === id);
      if (cachedOrder) {
        console.log('📦 Commande trouvée dans le cache');
        set({ currentOrder: cachedOrder, isLoading: false });
        return;
      }

      const response = await api.get(`/orders/${id}`);
      const order = response.data;

      if (!order) {
        set({ error: 'Commande non trouvée', isLoading: false });
        return;
      }

      // ✅ S'assurer que l'aidant a son profil
      if (order.aidant_id && !order.aidant?.user) {
        const { data: aidantData } = await supabase
          .from('aidants')
          .select(`
            id,
            user_id,
            specialties,
            available,
            rating,
            total_missions,
            completed_missions,
            cancelled_missions,
            user:profiles!aidants_user_id_fkey (
              id,
              full_name,
              email,
              phone,
              avatar_url
            )
          `)
          .eq('id', order.aidant_id)
          .single();

        if (aidantData) {
          order.aidant = aidantData;
        }
      }

      set({ currentOrder: order, isLoading: false });
    } catch (error: any) {
      console.error('❌ Fetch order error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // ============================================================
  // ✅ CREATE ORDER - AVEC SUPPORT WIZARD
  // ============================================================
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

      // ✅ Déterminer target_type et target_name
      const targetType = data.target_type || (data.patient_id ? 'patient' : 'personal');
      const targetName = data.target_name || (data.patient_id ? null : profile?.full_name || 'Personnel');

      const isPonctual = data.order_type === 'ponctual' || false;
      let status: OrderStatus = 'creee';
      let requiresPayment = false;
      let paymentAmount = 0;

      // ✅ LOGIQUE UNIFIÉE : Vérifier l'abonnement
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

      // ✅ Gestion du wizard
      const wizardChoice = data.wizard_choice || null;
      const selectedAidantId = data.selected_aidant_id || null;

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
        wizard_choice: wizardChoice,
        selected_aidant_id: selectedAidantId,
        metadata: {
          requires_payment: requiresPayment,
          created_by: user.id,
          created_at: new Date().toISOString(),
          payment_amount: requiresPayment ? paymentAmount : null,
          wizard_choice: wizardChoice || null,
          selected_aidant: selectedAidantId || null,
        }
      };

      const response = await api.post('/orders', orderData);
      const newOrder = response.data?.order || response.data;

      if (!newOrder) {
        throw new Error('Erreur lors de la création de la commande');
      }

      // ✅ Récupérer les relations
      let patient = null;
      if (newOrder.patient_id) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('*')
          .eq('id', newOrder.patient_id)
          .single();
        patient = patientData;
      }

      let family = null;
      if (newOrder.family_id) {
        const { data: familyData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', newOrder.family_id)
          .single();
        family = familyData;
      }

      const fullOrder = {
        ...newOrder,
        patient,
        family,
      };

      get().invalidateCache();
      await get().fetchOrders(true);

      // ✅ Notification si paiement requis
      if (requiresPayment) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: '💳 Paiement requis pour la commande',
          body: `Un paiement de ${paymentAmount} FCFA est requis pour valider votre commande "${data.description}".`,
          type: 'commande',
          data: { 
            order_id: newOrder.id, 
            status: 'attente_paiement', 
            action: 'pay',
            amount: paymentAmount,
          },
        });
      }

      set({ isLoading: false });

      return fullOrder;
    } catch (error: any) {
      console.error('❌ Create order error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // ============================================================
  // CONFIRMER PAIEMENT - ATTENTE_PAIEMENT → CREEE
  // ============================================================
  confirmPayment: async (id: string, transactionId: string) => {
    try {
      set({ isLoading: true, error: null });

      const response = await api.post(`/orders/${id}/confirm-payment`, { transaction_id: transactionId });
      const order = response.data;

      if (!order) {
        throw new Error('Erreur lors de la confirmation du paiement');
      }

      get().invalidateCache();
      await get().fetchOrders(true);

      set({ 
        currentOrder: order,
        isLoading: false,
      });

      toast.success('✅ Paiement confirmé, commande disponible');
    } catch (error: any) {
      console.error('❌ Confirm payment error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // ============================================================
  // 🆕 PRENDRE UNE COMMANDE - AVEC VÉRIFICATION QUOTA
  // ============================================================
  takeOrder: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      // ✅ Vérifier le quota avant de prendre
      const quotaCheck = await get().checkOrderQuota();
      if (!quotaCheck.canTake) {
        throw new Error(`Vous avez déjà ${quotaCheck.current} commande(s) en cours (maximum ${quotaCheck.max})`);
      }

      const response = await api.post(`/orders/${id}/take`);
      const order = response.data;

      if (!order) {
        throw new Error('Erreur lors de la prise de commande');
      }

      get().invalidateCache();
      await get().fetchOrders(true);

      set({ isLoading: false });
      toast.success('✅ Commande prise en charge');
      
      return order;
    } catch (error: any) {
      console.error('❌ Take order error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
      throw error;
    }
  },

  // ============================================================
  // ACCEPT ORDER (alias)
  // ============================================================
  acceptOrder: async (id: string) => {
    return get().takeOrder(id);
  },

  // ============================================================
  // PREPARE ORDER
  // ============================================================
  prepareOrder: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const response = await api.post(`/orders/${id}/prepare`);
      const order = response.data;

      if (!order) {
        throw new Error('Erreur lors de la préparation');
      }

      get().invalidateCache();
      await get().fetchOrders(true);

      set({ isLoading: false });
      toast.success('📦 Commande en préparation');
    } catch (error: any) {
      console.error('❌ Prepare order error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // MARK ORDER READY
  // ============================================================
  markOrderReady: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const response = await api.post(`/orders/${id}/ready`);
      const order = response.data;

      if (!order) {
        throw new Error('Erreur lors du marquage prêt');
      }

      get().invalidateCache();
      await get().fetchOrders(true);

      set({ isLoading: false });
      toast.success('✅ Commande prête à être livrée');
    } catch (error: any) {
      console.error('❌ Mark order ready error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // START DELIVERY
  // ============================================================
  startDelivery: async (id: string, location?: { lat: number; lng: number }) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const response = await api.post(`/orders/${id}/deliver`, { location });
      const order = response.data;

      if (!order) {
        throw new Error('Erreur lors du démarrage de la livraison');
      }

      get().invalidateCache();
      await get().fetchOrders(true);

      set({ isLoading: false });
      toast.success('🚚 Commande en livraison');
    } catch (error: any) {
      console.error('❌ Start delivery error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // COMPLETE DELIVERY - DÉCRÉMENTE current_orders
  // ============================================================
  completeDelivery: async (id: string, proof_url?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const response = await api.post(`/orders/${id}/complete`, { proof_url });
      const order = response.data;

      if (!order) {
        throw new Error('Erreur lors de la finalisation de la livraison');
      }

      get().invalidateCache();
      await get().fetchOrders(true);

      set({ isLoading: false });
      toast.success('✅ Commande livrée');
    } catch (error: any) {
      console.error('❌ Complete delivery error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // 🆕 AUTO-VALIDATION D'UNE COMMANDE
  // ============================================================
  autoValidateOrder: async (id: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Session expirée');
      }

      const response = await fetch(`${API_URL}/orders/${id}/auto-validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'auto-validation');
      }

      const result = await response.json();

      get().invalidateCache();
      await get().fetchOrders(true);

      set({ isLoading: false });
      toast.success('✅ Commande auto-validée');
    } catch (error: any) {
      console.error('❌ Auto-validate order error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // UPDATE ORDER STATUS
  // ============================================================
  updateOrderStatus: async (id: string, status: OrderStatus) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await api.post(`/orders/${id}/status`, { status });
      const order = response.data;

      if (!order) {
        throw new Error('Erreur lors de la mise à jour du statut');
      }

      get().invalidateCache();
      await get().fetchOrders(true);

      set({ 
        currentOrder: order,
        isLoading: false,
      });

      toast.success(`Commande ${getStatusLabel(status)}`);
    } catch (error: any) {
      console.error('❌ Update order status error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // ============================================================
  // UPDATE ORDER
  // ============================================================
  updateOrder: async (id: string, data: Partial<Order>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { profile } = useAuthStore.getState();
      if (profile?.role !== 'admin' && profile?.role !== 'coordinator') {
        throw new Error('Non autorisé');
      }

      const response = await api.put(`/orders/${id}`, data);
      const order = response.data;

      if (!order) {
        throw new Error('Erreur lors de la mise à jour');
      }

      get().invalidateCache();
      await get().fetchOrders(true);

      set({ isLoading: false });
      toast.success('Commande mise à jour');
    } catch (error: any) {
      console.error('❌ Update order error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // ============================================================
  // DELETE ORDER
  // ============================================================
  deleteOrder: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { profile } = useAuthStore.getState();
      if (profile?.role !== 'admin' && profile?.role !== 'coordinator') {
        throw new Error('Non autorisé');
      }

      await api.delete(`/orders/${id}`);

      get().invalidateCache();
      await get().fetchOrders(true);

      set({ isLoading: false });
      toast.success('Commande supprimée');
    } catch (error: any) {
      console.error('❌ Delete order error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // ============================================================
  // 🆕 RÉCUPÉRER LES COMMANDES DISPONIBLES (POUR AIDANTS)
  // ============================================================
  getAvailableOrders: async (): Promise<Order[]> => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) return [];

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Session expirée');
      }

      const response = await fetch(`${API_URL}/orders/available`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du chargement');
      }

      const result = await response.json();

      return result.data || [];
    } catch (error: any) {
      console.error('❌ getAvailableOrders error:', error);
      return [];
    }
  },

  // ============================================================
  // GETTERS
  // ============================================================
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
