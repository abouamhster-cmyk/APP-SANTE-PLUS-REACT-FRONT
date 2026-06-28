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
  
  fetchOrders: () => Promise<void>;
  fetchOrderById: (id: string) => Promise<void>;
  createOrder: (data: Partial<Order>) => Promise<Order>;
  updateOrder: (id: string, data: Partial<Order>) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  
  // ✅ NOUVELLES MÉTHODES
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
  clearError: () => void;
}

const notifyStatusChange = async (orderId: string, status: OrderStatus) => {
  try {
    const { data: order } = await supabase
      .from('commandes')
      .select('family_id, patient_id, aidant_id')
      .eq('id', orderId)
      .single();

    if (!order) return;

    const statusLabels: Record<OrderStatus, string> = {
      creee: 'créée',
      en_cours: 'en cours',
      livree: 'livrée',
      validee: 'validée',
      annulee: 'annulée',
    };

    await supabase.from('notifications').insert({
      user_id: order.family_id,
      title: '📦 Mise à jour commande',
      body: `Votre commande est maintenant ${statusLabels[status] || status}`,
      type: 'commande',
      data: { order_id: orderId, status },
    });

    if (status === 'livree' && order.aidant_id) {
      const { data: aidant } = await supabase
        .from('aidants')
        .select('user_id')
        .eq('id', order.aidant_id)
        .single();

      if (aidant) {
        await supabase.from('notifications').insert({
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

  // ✅ Vérifier si l'utilisateur peut gérer les commandes
  canManageOrders: () => {
    const { profile } = useAuthStore.getState();
    return profile?.role === 'admin' || profile?.role === 'coordinator';
  },

  // =============================================
  // FETCH ORDERS - FILTRÉ PAR RÔLE
  // =============================================
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
      console.error('❌ Fetch orders error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // =============================================
  // FETCH ORDER BY ID
  // =============================================
  fetchOrderById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
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
  // CREATE ORDER - AVEC VÉRIFICATION PERMISSIONS
  // =============================================
  createOrder: async (data: Partial<Order>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      // ❌ Les aidants ne peuvent pas créer de commandes
      if (profile?.role === 'aidant') {
        throw new Error('Les aidants ne peuvent pas créer de commandes');
      }

      const isPonctual = data.order_type === 'ponctual' || false;
      let status: OrderStatus = 'creee';
      let requiresPayment = false;

      if (isPonctual) {
        status = 'attente_paiement';
        requiresPayment = true;
      }

      // Vérifier le quota si abonnement
      if (!isPonctual && data.patient_id) {
        const { data: subscription } = await supabase
          .from('abonnements')
          .select('id, remaining_orders, status')
          .eq('patient_id', data.patient_id)
          .eq('status', 'actif')
          .maybeSingle();

        if (subscription && subscription.remaining_orders <= 0) {
          status = 'attente_paiement';
          requiresPayment = true;
        }
      }

      const orderData = {
        patient_id: data.patient_id || null,
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
        metadata: {
          requires_payment: requiresPayment,
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

      // ✅ Notification selon le statut
      if (status === 'attente_paiement') {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: '💳 Commande en attente de paiement',
          body: `Votre commande "${data.description}" est en attente de paiement.`,
          type: 'commande',
          data: { order_id: newOrder.id, status: 'attente_paiement' },
        });
      } else {
        // ✅ Notifier l'aidant assigné ou tous les aidants disponibles
        if (newOrder.aidant_id) {
          await supabase.from('notifications').insert({
            user_id: newOrder.aidant_id,
            title: '🛒 Nouvelle commande à prendre',
            body: `Commande de ${family?.full_name || 'un client'} - ${data.description}`,
            type: 'commande',
            data: { order_id: newOrder.id, action: 'take' },
          });
        } else {
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
                body: `Commande de ${family?.full_name || 'un client'} - ${data.description}`,
                type: 'commande',
                data: { order_id: newOrder.id, action: 'take' },
              });
            }
          }
        }
      }

      set((state) => ({
        orders: [fullOrder, ...state.orders],
        isLoading: false,
      }));

      return fullOrder;
    } catch (error: any) {
      console.error('❌ Create order error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // ✅ CONFIRMER PAIEMENT
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
            body: `Commande de ${order.family_id} - ${order.description}`,
            type: 'commande',
            data: { order_id: id, action: 'take' },
          });
        }
      }

      set((state) => ({
        orders: state.orders.map(o => o.id === id ? { ...o, ...data } : o),
        currentOrder: data,
        isLoading: false,
      }));

      toast.success('✅ Paiement confirmé, commande disponible');
    } catch (error: any) {
      console.error('❌ Confirm payment error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // ✅ PRENDRE UNE COMMANDE (aidant)
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

      if (order.status !== 'creee' && order.status !== 'disponible') {
        throw new Error('Cette commande n\'est pas disponible');
      }

      // Vérifier que l'aidant est disponible
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

      // Notification à la famille
      if (order.family_id) {
        await supabase.from('notifications').insert({
          user_id: order.family_id,
          title: '✅ Commande prise en charge',
          body: `Un aidant a pris votre commande "${order.description}".`,
          type: 'commande',
          data: { order_id: id, status: 'en_cours' },
        });
      }

      set((state) => ({
        orders: state.orders.map(o => o.id === id ? { ...o, ...data } : o),
        currentOrder: data,
        isLoading: false,
      }));

      toast.success('✅ Commande prise en charge');
    } catch (error: any) {
      console.error('❌ Take order error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // =============================================
  // ACCEPT ORDER (alias pour takeOrder)
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

      set((state) => ({
        orders: state.orders.map(o => o.id === id ? { ...o, ...data } : o),
        isLoading: false,
      }));

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

      set((state) => ({
        orders: state.orders.map(o => o.id === id ? { ...o, ...data } : o),
        isLoading: false,
      }));

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

      set((state) => ({
        orders: state.orders.map(o => o.id === id ? { ...o, ...data } : o),
        isLoading: false,
      }));

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

      await notifyStatusChange(id, 'livree');

      set((state) => ({
        orders: state.orders.map(o => o.id === id ? { ...o, ...data } : o),
        isLoading: false,
      }));

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

      await notifyStatusChange(id, status);

      set((state) => ({
        orders: state.orders.map(o => o.id === id ? { ...o, ...order } : o),
        currentOrder: order,
        isLoading: false,
      }));
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

      set((state) => ({
        orders: state.orders.map(o => o.id === id ? { ...o, ...order } : o),
        currentOrder: order,
        isLoading: false,
      }));
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

      set((state) => ({
        orders: state.orders.filter(o => o.id !== id),
        isLoading: false,
      }));
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
