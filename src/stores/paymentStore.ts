// 📁 src/stores/paymentStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Subscription, Payment } from '@/types';
import { useAuthStore } from './authStore';

interface CreatePaymentData {
  amount: number;
  description?: string;
  plan_id?: string;
  abonnement_id?: string;
  email?: string | null;
  is_ponctual?: boolean;
  order_data?: any;
}

interface PaymentState {
  subscriptions: Subscription[];
  payments: Payment[];
  isLoading: boolean;
  error: string | null;

  fetchSubscriptions: () => Promise<void>;
  fetchPayments: () => Promise<void>;
  createPayment: (data: CreatePaymentData) => Promise<any>;
  createPonctualPayment: (data: { amount: number; description: string; orderId?: string }) => Promise<any>;
  subscribeToOffer: (offreId: string, patientId?: string) => Promise<Subscription>;
  cancelSubscription: (subscriptionId: string) => Promise<void>;
  clearError: () => void;
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://sante-plus-backend-main.onrender.com/api';

export const usePaymentStore = create<PaymentState>((set, get) => ({
  subscriptions: [],
  payments: [],
  isLoading: false,
  error: null,

  fetchSubscriptions: async () => {
    try {
      set({ isLoading: true, error: null });

      const { user } = useAuthStore.getState();

      if (!user) {
        set({ subscriptions: [], isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('abonnements')
        .select(`
          *,
          offre:offres(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({
        subscriptions: data || [],
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Fetch subscriptions error:', error);
      set({
        error: error?.message || 'Erreur lors du chargement des abonnements',
        isLoading: false,
      });
    }
  },

  fetchPayments: async () => {
    try {
      set({ isLoading: true, error: null });

      const { user } = useAuthStore.getState();

      if (!user) {
        set({ payments: [], isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('paiements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const paymentsWithUser = await Promise.all(
        (data || []).map(async (payment) => {
          if (payment.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', payment.user_id)
              .maybeSingle();
            return { ...payment, user: profile };
          }
          return payment;
        })
      );

      set({
        payments: paymentsWithUser || [],
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Fetch payments error:', error);
      set({
        error: error?.message || 'Erreur lors du chargement des paiements',
        isLoading: false,
      });
    }
  },

  createPayment: async (data: CreatePaymentData) => {
    try {
      set({ isLoading: true, error: null });

      const { user, profile } = useAuthStore.getState();

      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Session expirée');
      }

      const amount = Number(data.amount || 0);

      if (!amount || amount <= 0) {
        throw new Error('Montant invalide');
      }

      const isPonctual = data.is_ponctual || false;

      console.log('📤 Envoi paiement avec is_ponctual:', isPonctual);
      console.log('📤 Envoi paiement avec abonnement_id:', data.abonnement_id);
      console.log('📤 Envoi paiement avec order_data:', data.order_data);

      const response = await fetch(`${API_BASE_URL}/billing/generate-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          // ✅ CRITIQUE : abonnement_id = UUID ou null
          abonnement_id: isPonctual ? null : (data.abonnement_id || data.plan_id || null),
          plan_id: data.plan_id || null,
          montant: amount,
          amount,
          description: data.description || 'Abonnement Santé Plus',
          email_client: data.email || profile?.email || user.email,
          customer_email: data.email || profile?.email || user.email,
          customer_name: profile?.full_name || user.email,
          user_id: user.id,
          is_ponctual: isPonctual,
          order_data: data.order_data || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || result?.message || 'Erreur paiement');
      }

      const paymentUrl = result?.payment_url || result?.url || result?.checkout_url;

      if (!paymentUrl) {
        throw new Error("Le lien de paiement n'a pas été généré");
      }

      // Enregistrer le paiement
      const { data: payment, error: dbError } = await supabase
        .from('paiements')
        .insert({
          user_id: user.id,
          amount,
          method: 'fedapay',
          reference: String(result.transaction_id),
          status: 'en_attente',
          abonnement_id: isPonctual ? null : (data.abonnement_id || data.plan_id || null),
          metadata: {
            description: data.description,
            plan_id: data.plan_id || null,
            transaction_id: String(result.transaction_id),
            payment_url: paymentUrl,
            is_ponctual: isPonctual,
            order_data: data.order_data || null,
          },
        })
        .select()
        .single();

      if (dbError) {
        console.warn('⚠️ Erreur sauvegarde paiement:', dbError);
      }

      set({ isLoading: false });

      return {
        success: true,
        payment_url: paymentUrl,
        transaction_id: result.transaction_id,
        reference: result.reference,
      };
    } catch (error: any) {
      console.error('Create payment error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  createPonctualPayment: async (data: { amount: number; description: string; orderId?: string }) => {
    try {
      set({ isLoading: true, error: null });

      const { user, profile } = useAuthStore.getState();

      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Session expirée');
      }

      const response = await fetch(`${API_BASE_URL}/billing/generate-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          montant: data.amount,
          amount: data.amount,
          description: data.description,
          email_client: profile?.email || user.email,
          customer_email: profile?.email || user.email,
          customer_name: profile?.full_name || user.email,
          order_id: data.orderId || null,
          is_ponctual: true,
          abonnement_id: null,
          plan_id: null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || result?.message || 'Erreur paiement');
      }

      const paymentUrl = result?.payment_url || result?.url || result?.checkout_url;

      if (!paymentUrl) {
        throw new Error("Le lien de paiement n'a pas été généré");
      }

      const { data: payment, error: dbError } = await supabase
        .from('paiements')
        .insert({
          user_id: user.id,
          amount: data.amount,
          method: 'fedapay',
          reference: String(result.transaction_id),
          status: 'en_attente',
          commande_id: data.orderId || null,
          abonnement_id: null,
          metadata: {
            description: data.description,
            transaction_id: String(result.transaction_id),
            payment_url: paymentUrl,
            is_ponctual: true,
          },
        })
        .select()
        .single();

      if (dbError) {
        console.warn('⚠️ Erreur sauvegarde paiement:', dbError);
      }

      let paymentWithUser = payment;
      if (payment?.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', payment.user_id)
          .maybeSingle();
        paymentWithUser = { ...payment, user: profileData };
      }

      if (paymentWithUser) {
        set((state) => ({
          payments: [paymentWithUser, ...state.payments],
        }));
      }

      set({ isLoading: false });

      return {
        success: true,
        payment_url: paymentUrl,
        transaction_id: result.transaction_id,
        reference: result.reference,
      };
    } catch (error: any) {
      console.error('Create ponctual payment error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  subscribeToOffer: async (offreId: string, patientId?: string) => {
    try {
      set({ isLoading: true, error: null });

      const { user } = useAuthStore.getState();

      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      const { data: offre, error: offreError } = await supabase
        .from('offres')
        .select('*')
        .eq('id', offreId)
        .single();

      if (offreError) throw offreError;

      if (!offre) {
        throw new Error('Offre non trouvée');
      }

      const startDate = new Date();
      const endDate = new Date();

      switch (offre.type) {
        case 'trimestrielle':
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case 'annuelle':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        case 'mensuelle':
        default:
          endDate.setMonth(endDate.getMonth() + 1);
          break;
      }

      const { data: subscription, error } = await supabase
        .from('abonnements')
        .insert({
          user_id: user.id,
          patient_id: patientId || null,
          offre_id: offreId,
          status: 'en_attente',
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          auto_renew: true,
          total_visits: offre.total_visits || offre.visits_per_month || 0,
          remaining_visits: offre.total_visits || offre.visits_per_month || 0,
          total_orders: offre.total_orders || 0,
          remaining_orders: offre.total_orders || 0,
        })
        .select(`
          *,
          offre:offres(*)
        `)
        .single();

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Abonnement en attente',
        body: `Votre abonnement ${offre.name} est en attente de confirmation de paiement`,
        type: 'paiement',
        data: {
          subscription_id: subscription.id,
        },
      });

      set((state) => ({
        subscriptions: [subscription, ...state.subscriptions],
        isLoading: false,
      }));

      return subscription;
    } catch (error: any) {
      console.error('Subscribe error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  cancelSubscription: async (subscriptionId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('abonnements')
        .update({ status: 'annule' })
        .eq('id', subscriptionId)
        .select(`
          *,
          offre:offres(*)
        `)
        .single();

      if (error) throw error;

      const { user } = useAuthStore.getState();

      if (user) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Abonnement annulé',
          body: `Votre abonnement ${data.offre?.name || ''} a été annulé`,
          type: 'paiement',
        });
      }

      set((state) => ({
        subscriptions: state.subscriptions.map((sub) =>
          sub.id === subscriptionId ? data : sub
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Cancel subscription error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
