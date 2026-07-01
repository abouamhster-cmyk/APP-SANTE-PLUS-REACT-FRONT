// 📁 src/stores/orderStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types';
import { useAuthStore } from './authStore';
import toast from 'react-hot-toast';

// =============================================
// STATUS LABELS
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
  createOrder: (data: Partial<Order> & { target_type?: 'personal' | 'patient'; target_name?: string }) => Promise<Order>;
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
  getAvailableOrders: () => Order[];
  getDeliveryOrders: () => Order[];
  canManageOrders: () => boolean;
  invalidateCache: () => void;
  refresh: () => Promise<void>;
  clearError: () => void;
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

  // =============================================
  // FETCH ORDERS - AVEC CACHE
  // =============================================
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

      let query = supabase.from('commandes').select('*');

      if (profile?.role === 'family') {
        // ✅ Récupérer les commandes du compte (user_id)
        query = query.eq('user_id', user.id);
      } else if (profile?.role === 'aidant') {
        const { data: aidant } = await supabase
          .from('aidants')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (aidant) {
          query = query.eq('aidant_id', aidant.id);
        } else {
          set({ orders: [], isLoading: false });
          return;
        }
      }

      const { data: orders, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const ordersWithRelations = await Promise.all(
        (orders || []).map(async (order) => {
          let patient = null;
          if (order.patient_id) {
            const { data: patientData } = await supabase
              .from('patients')
              .select('*')
              .eq('id', order.patient_id)
              .single();
            patient = patientData;
          }

          let family = null;
          if (order.family_id) {
            const { data: familyData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', order.family_id)
              .single();
            family = familyData;
          }

          let aidant = null;
          if (order.aidant_id) {
            const { data: aidantData } = await supabase
              .from('aidants')
              .select('*, user:profiles(*)')
              .eq('id', order.aidant_id)
              .single();
            aidant = aidantData;
          }

          return {
            ...order,
            patient,
            family,
            aidant,
          };
        })
      );

      setCachedOrders(ordersWithRelations);
      
      set({ 
        orders: ordersWithRelations || [], 
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

  // =============================================
  // FETCH ORDER BY ID
  // =============================================
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

      const { data: order, error } = await supabase
        .from('commandes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          set({ error: 'Commande non trouvée', isLoading: false });
          return;
        }
        throw error;
      }

      let patient = null;
      if (order.patient_id) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('*')
          .eq('id', order.patient_id)
          .single();
        patient = patientData;
      }

      let family = null;
      if (order.family_id) {
        const { data: familyData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', order.family_id)
          .single();
        family = familyData;
      }

      let aidant = null;
      if (order.aidant_id) {
        const { data: aidantData } = await supabase
          .from('aidants')
          .select('*, user:profiles(*)')
          .eq('id', order.aidant_id)
          .single();
        aidant = aidantData;
      }

      const fullOrder = {
        ...order,
        patient,
        family,
        aidant,
      };

      set({ currentOrder: fullOrder, isLoading: false });
    } catch (error: any) {
      console.error('❌ Fetch order error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // CREATE ORDER - AVEC TARGET_TYPE
  // =============================================
  createOrder: async (data: Partial<Order> & { target_type?: 'personal' | 'patient'; target_name?: string }) => {
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

      if (isPonctual) {
        status = 'attente_paiement';
      }

      // ✅ Vérifier le quota sur le COMPTE (pas sur le patient)
      if (!isPonctual) {
        const { data: subscription } = await supabase
          .from('abonnements')
          .select('id, remaining_orders, status')
          .eq('user_id', user.id)   // ✅ LIÉ AU COMPTE
          .eq('status', 'actif')
          .maybeSingle();

        if (!subscription || subscription.remaining_orders <= 0) {
          status = 'attente_paiement';
        }
      }

      const orderData = {
        user_id: user.id,              // ✅ COMPTE QUI PASSE LA COMMANDE
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
        is_paid: false,
        is_ponctual: isPonctual,
        metadata: {
          requires_payment: status === 'attente_paiement',
          created_by: user.id,
          created_at: new Date().toISOString(),
        }
      };

      const { data: newOrder, error } = await supabase
        .from('commandes')
        .insert(orderData)
        .select()
        .single();

      if (error) throw error;

      let patient = null;
      if (newOrder.patient_id) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('*')
          .eq('id', newOrder.patient_id)
          .single();
        patient = patientData;
      }

      const { data: family } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', newOrder.family_id)
        .single();

      const fullOrder = {
        ...newOrder,
        patient,
        family,
      };

      // ✅ Notifications avec target_name
      const targetDisplay = targetName || (patient ? `${patient.first_name} ${patient.last_name}` : 'Personnel');

      if (status === 'attente_paiement') {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: '💳 Commande en attente de paiement',
          body: `Votre commande "${data.description}" pour ${targetDisplay} est en attente de paiement.`,
          type: 'commande',
          data: { order_id: newOrder.id, status: 'attente_paiement' },
        });
      } else {
        // ✅ Notifier les aidants disponibles
        const { data: aidants } = await supabase
          .from('aidants')
          .select('user_id')
          .eq('available', true)
          .eq('is_verified', true);

        if (aidants && aidants.length > 0) {
          for (const aidant of aidants) {
            await supabase.from('notifications').insert({
              user_id: aidant.user_id,
              title: '🛒 Nouvelle commande disponible',
              body: `Commande de ${targetDisplay} - ${data.description}`,
              type: 'commande',
              data: { order_id: newOrder.id, action: 'take' },
            });
          }
        }
      }

      get().invalidateCache();
      await get().fetchOrders(true);

      set({ isLoading: false });

      return fullOrder;
    } catch (error: any) {
      console.error('❌ Create order error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // CONFIRMER PAIEMENT
  // =============================================
  confirmPayment: async (id: string, transactionId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data: order, error: orderError } = await supabase
        .from('commandes')
        .select('*')
        .eq('id', id)
        .single();

      if (orderError) throw orderError;

      if (order.status !== 'attente_paiement') {
        throw new Error('Cette commande n\'est pas en attente de paiement');
      }

      const { data, error } = await supabase
        .from('commandes')
        .update({
          status: 'creee',
          is_paid: true,
          metadata: {
            ...(order.metadata || {}),
            payment_confirmed_at: new Date().toISOString(),
            transaction_id: transactionId,
          }
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      get().invalidateCache();
      await get().fetchOrders(true);

      set({ 
        currentOrder: data,
        isLoading: false,
      });

      toast.success('✅ Paiement confirmé, commande disponible');
    } catch (error: any) {
      console.error('❌ Confirm payment error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // PRENDRE UNE COMMANDE
  // =============================================
  takeOrder: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: order, error: fetchError } = await supabase
        .from('commandes')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (order.status !== 'creee' && order.status !== 'en_attente' && order.status !== 'disponible') {
        throw new Error('Cette commande n\'est pas disponible');
      }

      const { data: aidant, error: aidantError } = await supabase
        .from('aidants')
        .select('id, available, is_verified')
        .eq('user_id', user.id)
        .single();

      if (aidantError || !aidant) {
        throw new Error('Aidant non trouvé');
      }

      if (!aidant.available || !aidant.is_verified) {
        throw new Error('Vous n\'êtes pas disponible ou vérifié');
      }

      const { data, error } = await supabase
        .from('commandes')
        .update({
          status: 'en_cours',
          aidant_id: aidant.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // ✅ Notification avec target_name
      const targetDisplay = order.target_name || 'un client';

      if (order.family_id) {
        await supabase.from('notifications').insert({
          user_id: order.family_id,
          title: '✅ Commande prise en charge',
          body: `Un aidant a pris votre commande "${order.description}" pour ${targetDisplay}.`,
          type: 'commande',
          data: { order_id: id, status: 'en_cours' },
        });
      }

      get().invalidateCache();
      await get().fetchOrders(true);

      set({ isLoading: false });
      toast.success('✅ Commande prise en charge');
    } catch (error: any) {
      console.error('❌ Take order error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // =============================================
  // ACCEPT ORDER (alias)
  // =============================================
  acceptOrder: async (id: string) => {
    return get().takeOrder(id);
  },

  // =============================================
  // PREPARE ORDER
  // =============================================
  prepareOrder: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: order, error: fetchError } = await supabase
        .from('commandes')
        .select('aidant_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (order.aidant_id !== user.id) {
        throw new Error('Vous n\'êtes pas assigné à cette commande');
      }

      const { data, error } = await supabase
        .from('commandes')
        .update({ 
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

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

  // =============================================
  // MARK ORDER READY
  // =============================================
  markOrderReady: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: order, error: fetchError } = await supabase
        .from('commandes')
        .select('aidant_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (order.aidant_id !== user.id) {
        throw new Error('Vous n\'êtes pas assigné à cette commande');
      }

      const { data, error } = await supabase
        .from('commandes')
        .update({ 
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

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

  // =============================================
  // START DELIVERY
  // =============================================
  startDelivery: async (id: string, location?: { lat: number; lng: number }) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: order, error: fetchError } = await supabase
        .from('commandes')
        .select('aidant_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (order.aidant_id !== user.id) {
        throw new Error('Vous n\'êtes pas assigné à cette commande');
      }

      const updateData: any = { 
        updated_at: new Date().toISOString(),
      };

      if (location) {
        updateData.delivery_location = location;
      }

      const { data, error } = await supabase
        .from('commandes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

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

  // =============================================
  // COMPLETE DELIVERY
  // =============================================
  completeDelivery: async (id: string, proof_url?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: order, error: fetchError } = await supabase
        .from('commandes')
        .select('aidant_id, family_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (order.aidant_id !== user.id) {
        throw new Error('Vous n\'êtes pas assigné à cette commande');
      }

      const updateData: any = { 
        status: 'livree' as OrderStatus,
        updated_at: new Date().toISOString(),
      };

      if (proof_url) {
        updateData.proof_url = proof_url;
      }

      const { data, error } = await supabase
        .from('commandes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

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

  // =============================================
  // UPDATE ORDER STATUS
  // =============================================
  updateOrderStatus: async (id: string, status: OrderStatus) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: order, error } = await supabase
        .from('commandes')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      get().invalidateCache();
      await get().fetchOrders(true);

      set({ 
        currentOrder: order,
        isLoading: false,
      });

      toast.success(`Commande ${STATUS_LABELS[status]}`);
    } catch (error: any) {
      console.error('❌ Update order status error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // UPDATE ORDER
  // =============================================
  updateOrder: async (id: string, data: Partial<Order>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { profile } = useAuthStore.getState();
      if (profile?.role !== 'admin' && profile?.role !== 'coordinator') {
        throw new Error('Non autorisé');
      }

      const { data: order, error } = await supabase
        .from('commandes')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

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

  // =============================================
  // DELETE ORDER
  // =============================================
  deleteOrder: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { profile } = useAuthStore.getState();
      if (profile?.role !== 'admin' && profile?.role !== 'coordinator') {
        throw new Error('Non autorisé');
      }

      const { error } = await supabase
        .from('commandes')
        .delete()
        .eq('id', id);

      if (error) throw error;

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

  // =============================================
  // GETTERS
  // =============================================
  getAssignedOrders: () => {
    const { user } = useAuthStore.getState();
    const state = get();
    return state.orders.filter(o => o.aidant_id === user?.id);
  },

  getAvailableOrders: () => {
    const state = get();
    return state.orders.filter(o => o.status === 'creee' || o.status === 'disponible');
  },

  getDeliveryOrders: () => {
    const state = get();
    return state.orders.filter(o => o.status === 'en_cours');
  },

  clearError: () => set({ error: null }),
}));
