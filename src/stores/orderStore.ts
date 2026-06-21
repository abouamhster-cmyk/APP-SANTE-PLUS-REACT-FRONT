// 📁 src/stores/orderStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types';
import { useAuthStore } from './authStore';
import toast from 'react-hot-toast';

interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  error: string | null;
  
  // Méthodes existantes
  fetchOrders: () => Promise<void>;
  fetchOrderById: (id: string) => Promise<void>;
  createOrder: (data: Partial<Order>) => Promise<Order>;
  updateOrder: (id: string, data: Partial<Order>) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  clearError: () => void;
  
  // ✅ Nouvelles méthodes pour les aidants
  acceptOrder: (id: string) => Promise<void>;
  prepareOrder: (id: string) => Promise<void>;
  markOrderReady: (id: string) => Promise<void>;
  startDelivery: (id: string, location?: { lat: number; lng: number }) => Promise<void>;
  completeDelivery: (id: string, proof_url?: string) => Promise<void>;
  getAssignedOrders: () => Order[];
  getAvailableOrders: () => Order[];
  getDeliveryOrders: () => Order[];
}

// ✅ Fonction de notification de statut simplifiée
const notifyStatusChange = async (orderId: string, status: OrderStatus) => {
  try {
    const { data: order } = await supabase
      .from('commandes')
      .select('family_id, patient_id, aidant_id')
      .eq('id', orderId)
      .single();

    if (!order) return;

    // ✅ Utiliser uniquement les statuts valides
    const statusLabels: Record<OrderStatus, string> = {
      creee: 'créée',
      en_cours: 'en cours',
      livree: 'livrée',
      validee: 'validée',
      annulee: 'annulée',
    };

    // Notification à la famille
    await supabase
      .from('notifications')
      .insert({
        user_id: order.family_id,
        title: '📦 Mise à jour commande',
        body: `Votre commande est maintenant ${statusLabels[status] || status}`,
        type: 'commande',
        data: { order_id: orderId, status },
      });

    // Notification à l'aidant si livrée
    if (status === 'livree') {
      const { data: aidant } = await supabase
        .from('aidants')
        .select('user_id')
        .eq('id', order.aidant_id)
        .single();

      if (aidant) {
        await supabase
          .from('notifications')
          .insert({
            user_id: aidant.user_id,
            title: '✅ Commande livrée',
            body: 'La commande a été livrée avec succès !',
            type: 'commande',
            data: { order_id: orderId, status },
          });
      }
    }
  } catch (error) {
    console.error('Notify status change error:', error);
  }
};

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  currentOrder: null,
  isLoading: false,
  error: null,

  fetchOrders: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) {
        set({ orders: [], isLoading: false });
        return;
      }

      let query = supabase.from('commandes').select('*');

      if (profile?.role === 'family') {
        query = query.eq('family_id', user.id);
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

      // Récupérer les relations
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

      set({ orders: ordersWithRelations || [], isLoading: false });
    } catch (error: any) {
      console.error('Fetch orders error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  fetchOrderById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: order, error } = await supabase
        .from('commandes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

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
      console.error('Fetch order error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // ✅ MODIFIÉ : Support des commandes ponctuelles
  createOrder: async (data: Partial<Order>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      // ✅ Si c'est une commande ponctuelle et qu'elle est déjà payée, ne pas décrémenter l'abonnement
      const isPonctual = data.order_type === 'ponctual';
      const isPaid = data.is_paid || false;

      const orderData = {
        patient_id: data.patient_id || null,
        family_id: user.id,
        aidant_id: data.aidant_id || null,
        type: data.type || 'autre',
        description: data.description || 'Commande',
        address: data.address || 'Adresse non spécifiée',
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        status: 'creee' as OrderStatus,
        estimated_amount: data.estimated_amount || null,
        final_amount: data.final_amount || null,
        delivery_fee: data.delivery_fee || null,
        tip_amount: data.tip_amount || null,
        items: data.items || [],
        prescription_url: data.prescription_url || null,
        delivery_notes: data.delivery_notes || null,
        // ✅ Ajout des champs pour les commandes ponctuelles
        order_type: isPonctual ? 'ponctual' : 'subscription',
        is_paid: isPaid,
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

      set((state) => ({
        orders: [fullOrder, ...state.orders],
        isLoading: false,
      }));

      return fullOrder;
    } catch (error: any) {
      console.error('Create order error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateOrder: async (id: string, data: Partial<Order>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: order, error } = await supabase
        .from('commandes')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        orders: state.orders.map(o => o.id === id ? { ...o, ...order } : o),
        currentOrder: order,
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Update order error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

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

      await notifyStatusChange(id, status);

      set((state) => ({
        orders: state.orders.map(o => o.id === id ? { ...o, ...order } : o),
        currentOrder: order,
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Update order status error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteOrder: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { error } = await supabase
        .from('commandes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        orders: state.orders.filter(o => o.id !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Delete order error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  // ✅ NOUVELLES MÉTHODES POUR AIDANTS

  acceptOrder: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: aidant } = await supabase
        .from('aidants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!aidant) throw new Error('Aidant non trouvé');

      // ✅ Passer directement en "en_cours" (acceptée)
      const { data: order, error } = await supabase
        .from('commandes')
        .update({ 
          aidant_id: aidant.id,
          status: 'en_cours' as OrderStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await notifyStatusChange(id, 'en_cours');

      set((state) => ({
        orders: state.orders.map(o => o.id === id ? { ...o, ...order } : o),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Accept order error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  prepareOrder: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // ✅ Garder "en_cours" car c'est déjà l'état après acceptation
      // On pourrait ajouter une étape "en_preparation" mais on reste simple
      const { data: order, error } = await supabase
        .from('commandes')
        .update({ 
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast.success('📦 Commande en préparation');

      set((state) => ({
        orders: state.orders.map(o => o.id === id ? { ...o, ...order } : o),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Prepare order error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  markOrderReady: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // ✅ Garder "en_cours" (prêt à être livré)
      const { data: order, error } = await supabase
        .from('commandes')
        .update({ 
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast.success('✅ Commande prête à être livrée');

      set((state) => ({
        orders: state.orders.map(o => o.id === id ? { ...o, ...order } : o),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Mark order ready error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  startDelivery: async (id: string, location?: { lat: number; lng: number }) => {
    try {
      set({ isLoading: true, error: null });
      
      // ✅ Garder "en_cours" (en livraison)
      const updateData: any = { 
        updated_at: new Date().toISOString(),
      };

      if (location) {
        updateData.delivery_location = location;
      }

      const { data: order, error } = await supabase
        .from('commandes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast.success('🚚 Commande en livraison');

      set((state) => ({
        orders: state.orders.map(o => o.id === id ? { ...o, ...order } : o),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Start delivery error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  completeDelivery: async (id: string, proof_url?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const updateData: any = { 
        status: 'livree' as OrderStatus,
        updated_at: new Date().toISOString(),
      };

      if (proof_url) {
        updateData.proof_url = proof_url;
      }

      const { data: order, error } = await supabase
        .from('commandes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await notifyStatusChange(id, 'livree');

      set((state) => ({
        orders: state.orders.map(o => o.id === id ? { ...o, ...order } : o),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Complete delivery error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getAssignedOrders: () => {
    const { user } = useAuthStore.getState();
    const state = get();
    return state.orders.filter(o => o.aidant_id === user?.id);
  },

  getAvailableOrders: () => {
    const state = get();
    // ✅ Utiliser "creee" car "en_attente" n'existe pas
    return state.orders.filter(o => o.status === 'creee');
  },

  getDeliveryOrders: () => {
    const state = get();
    // ✅ Utiliser "en_cours" pour les commandes en livraison
    return state.orders.filter(o => o.status === 'en_cours');
  },
}));