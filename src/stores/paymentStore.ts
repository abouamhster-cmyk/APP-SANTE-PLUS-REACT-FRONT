// 📁 src/stores/paymentStore.ts
 

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Subscription, Payment } from '@/types';
import { useAuthStore } from './authStore';

// ✅ IMPORTER LES HELPERS
import {
  getPonctualPrice,
  getPonctualOrderPrice,
} from '@/lib/constants';

interface CreatePaymentData {
  amount: number;
  description?: string;
  plan_id?: string;
  abonnement_id?: string;
  email?: string | null;
  is_ponctual?: boolean;
  is_visit?: boolean;          
  visit_id?: string | null;      
  order_data?: any;
  patient_id?: string | null;
  target_type?: 'personal' | 'patient';
  target_name?: string;
  // ✅ NOUVEAU : type explicite pour le webhook
  metadata?: {
    type?: 'visit' | 'order' | 'subscription';
    is_ponctual?: boolean;
    is_visit?: boolean;
    visit_id?: string | null;
    order_data?: any;
  };
}

// =============================================
// HELPERS DE CACHE
// =============================================

const SUBSCRIPTIONS_CACHE_KEY = 'sante_plus_subscriptions_cache';
const PAYMENTS_CACHE_KEY = 'sante_plus_payments_cache';
const CACHE_DURATION = 60000; // 1 minute

const getCachedSubscriptions = (): { data: Subscription[]; timestamp: number } | null => {
  try {
    const cached = localStorage.getItem(SUBSCRIPTIONS_CACHE_KEY);
    if (cached) return JSON.parse(cached);
    return null;
  } catch { return null; }
};

const setCachedSubscriptions = (subscriptions: Subscription[]) => {
  try {
    localStorage.setItem(SUBSCRIPTIONS_CACHE_KEY, JSON.stringify({
      data: subscriptions,
      timestamp: Date.now(),
    }));
  } catch { /* ignore */ }
};

const clearCachedSubscriptions = () => {
  try {
    localStorage.removeItem(SUBSCRIPTIONS_CACHE_KEY);
    console.log('🗑️ Cache abonnements invalidé');
  } catch { /* ignore */ }
};

const getCachedPayments = (): { data: Payment[]; timestamp: number } | null => {
  try {
    const cached = localStorage.getItem(PAYMENTS_CACHE_KEY);
    if (cached) return JSON.parse(cached);
    return null;
  } catch { return null; }
};

const setCachedPayments = (payments: Payment[]) => {
  try {
    localStorage.setItem(PAYMENTS_CACHE_KEY, JSON.stringify({
      data: payments,
      timestamp: Date.now(),
    }));
  } catch { /* ignore */ }
};

const clearCachedPayments = () => {
  try {
    localStorage.removeItem(PAYMENTS_CACHE_KEY);
    console.log('🗑️ Cache paiements invalidé');
  } catch { /* ignore */ }
};

// =============================================
// STORE
// =============================================

interface PaymentState {
  subscriptions: Subscription[];
  payments: Payment[];
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  lastFetch: number | null;
  isCacheInvalidated: boolean;

  fetchSubscriptions: (force?: boolean) => Promise<void>;
  fetchPayments: (force?: boolean) => Promise<void>;
  createPayment: (data: CreatePaymentData) => Promise<any>;
  createPonctualPayment: (data: { amount: number; description: string; orderId?: string }) => Promise<any>;
  subscribeToOffer: (offreId: string, patientId?: string) => Promise<Subscription>;
  cancelSubscription: (subscriptionId: string) => Promise<void>;
  
  invalidateCache: () => void;
  refresh: () => Promise<void>;
  clearError: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

export const usePaymentStore = create<PaymentState>((set, get) => ({
  subscriptions: [],
  payments: [],
  isLoading: false,
  error: null,
  isInitialized: false,
  lastFetch: null,
  isCacheInvalidated: false,

  invalidateCache: () => {
    clearCachedSubscriptions();
    clearCachedPayments();
    set({ 
      isCacheInvalidated: true,
      isInitialized: false,
      lastFetch: null,
    });
    console.log('🔄 Cache paiements invalidé');
  },

  refresh: async () => {
    get().invalidateCache();
    await Promise.all([
      get().fetchSubscriptions(true),
      get().fetchPayments(true),
    ]);
  },

  // =============================================
  // FETCH SUBSCRIPTIONS - AVEC CACHE
  // =============================================
  fetchSubscriptions: async (force = false) => {
    const state = get();
    
    if (state.isLoading) {
      console.log('ℹ️ Déjà en cours de chargement, skip...');
      return;
    }

    if (state.isCacheInvalidated) {
      force = true;
    }

    if (!force && state.lastFetch && (Date.now() - state.lastFetch < CACHE_DURATION)) {
      console.log('📦 Utilisation du cache mémoire abonnements');
      return;
    }

    if (!force) {
      const cached = getCachedSubscriptions();
      if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        console.log('📦 Utilisation du cache localStorage abonnements');
        set({ 
          subscriptions: cached.data, 
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
        set({ subscriptions: [], isLoading: false, isInitialized: true });
        return;
      }

      // ✅ Récupérer les abonnements du compte (user_id)
      const { data, error } = await supabase
        .from('abonnements')
        .select(`
          *,
          offre:offres(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const subscriptions = data || [];

      setCachedSubscriptions(subscriptions);
      
      set({
        subscriptions,
        isLoading: false,
        isInitialized: true,
        lastFetch: Date.now(),
        isCacheInvalidated: false,
      });
    } catch (error: any) {
      console.error('Fetch subscriptions error:', error);
      
      const cached = getCachedSubscriptions();
      if (cached && cached.data.length > 0) {
        set({
          subscriptions: cached.data,
          isLoading: false,
          isInitialized: true,
          lastFetch: cached.timestamp,
          error: error?.message || 'Erreur de chargement (cache utilisé)',
          isCacheInvalidated: false,
        });
      } else {
        set({
          error: error?.message || 'Erreur lors du chargement des abonnements',
          isLoading: false,
          isInitialized: true,
        });
      }
    }
  },

  // =============================================
  // FETCH PAYMENTS - AVEC CACHE
  // =============================================
  fetchPayments: async (force = false) => {
    const state = get();
    
    if (state.isLoading) {
      console.log('ℹ️ Déjà en cours de chargement, skip...');
      return;
    }

    if (state.isCacheInvalidated) {
      force = true;
    }

    if (!force && state.lastFetch && (Date.now() - state.lastFetch < CACHE_DURATION)) {
      console.log('📦 Utilisation du cache mémoire paiements');
      return;
    }

    if (!force) {
      const cached = getCachedPayments();
      if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        console.log('📦 Utilisation du cache localStorage paiements');
        set({ 
          payments: cached.data, 
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
        set({ payments: [], isLoading: false, isInitialized: true });
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

      const payments = paymentsWithUser || [];

      setCachedPayments(payments);
      
      set({
        payments,
        isLoading: false,
        isInitialized: true,
        lastFetch: Date.now(),
        isCacheInvalidated: false,
      });
    } catch (error: any) {
      console.error('Fetch payments error:', error);
      
      const cached = getCachedPayments();
      if (cached && cached.data.length > 0) {
        set({
          payments: cached.data,
          isLoading: false,
          isInitialized: true,
          lastFetch: cached.timestamp,
          error: error?.message || 'Erreur de chargement (cache utilisé)',
          isCacheInvalidated: false,
        });
      } else {
        set({
          error: error?.message || 'Erreur lors du chargement des paiements',
          isLoading: false,
          isInitialized: true,
        });
      }
    }
  },

  // =============================================
  // ✅ CREATE PAYMENT - LOGIQUE UNIFIÉE AVEC METADATA
  // =============================================
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
      const isVisit = data.is_visit || false;
      const visitId = data.visit_id || null;

       const patientId = data.patient_id || null;
      const targetType = data.target_type || (patientId ? 'patient' : 'personal');
      const targetName = data.target_name || profile?.full_name || user.email || 'Client';

      // ✅ DÉTERMINER LE TYPE EXPLICITE POUR LE WEBHOOK
      let type: 'visit' | 'order' | 'subscription' = 'subscription';
      if (isVisit) {
        type = 'visit';
      } else if (isPonctual && data.order_data) {
        type = 'order';
      } else if (isPonctual) {
        type = 'order';
      }

      console.log('📤 Envoi paiement avec is_ponctual:', isPonctual);
      console.log('📤 Envoi paiement avec is_visit:', isVisit);
      console.log('📤 Envoi paiement avec visit_id:', visitId);
      console.log('📤 Envoi paiement avec abonnement_id:', data.abonnement_id);
      console.log('📤 Envoi paiement avec patient_id:', patientId);
      console.log('📤 Envoi paiement avec target_type:', targetType);
      console.log('📤 Envoi paiement avec target_name:', targetName);
      console.log('📤 Envoi paiement avec type explicite:', type);

      const response = await fetch(`${API_BASE_URL}/billing/generate-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
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
          is_visit: isVisit,
          visit_id: visitId,
          order_data: data.order_data || null,
          patient_id: patientId,
          target_type: targetType,
          target_name: targetName,
          // ✅ AJOUTER LE TYPE EXPLICITE
          type: type,
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

      // ✅ Enregistrer le paiement avec les métadonnées complètes
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
            is_visit: isVisit,
            visit_id: visitId,
            order_data: data.order_data || null,
            patient_id: patientId,
            target_type: targetType,
            target_name: targetName,
            // ✅ AJOUTER LE TYPE EXPLICITE POUR LE WEBHOOK
            type: type,
          },
        })
        .select()
        .single();

      if (dbError) {
        console.warn('⚠️ Erreur sauvegarde paiement:', dbError);
      }

      get().invalidateCache();
      await Promise.all([
        get().fetchSubscriptions(true),
        get().fetchPayments(true),
      ]);

      set({ isLoading: false });

      return {
        success: true,
        payment_url: paymentUrl,
        transaction_id: result.transaction_id,
        reference: result.reference,
        // ✅ RETOURNER LE TYPE POUR LE FRONTEND
        type: type,
      };
    } catch (error: any) {
      console.error('Create payment error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // CREATE PONCTUAL PAYMENT - DÉPRÉCIÉ, UTILISER createPayment
  // =============================================
  createPonctualPayment: async (data: { amount: number; description: string; orderId?: string }) => {
    try {
      // ✅ REDIRIGER VERS createPayment
      const result = await get().createPayment({
        amount: data.amount,
        description: data.description,
        is_ponctual: true,
        order_data: data.orderId ? { order_id: data.orderId } : null,
      });
      
      return result;
    } catch (error: any) {
      console.error('Create ponctual payment error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // SUBSCRIBE TO OFFER - patient_id OPTIONNEL
  // =============================================
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

      // ✅ patient_id est optionnel
      const subscriptionData: any = {
        user_id: user.id,
        offre_id: offreId,
        status: 'en_attente',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        auto_renew: true,
        total_visits: offre.total_visits || offre.visits_per_month || 0,
        remaining_visits: offre.total_visits || offre.visits_per_month || 0,
        total_orders: offre.total_orders || 0,
        remaining_orders: offre.total_orders || 0,
      };

      // ✅ patient_id n'est ajouté que s'il est fourni
      if (patientId) {
        subscriptionData.patient_id = patientId;
      }

      const { data: subscription, error } = await supabase
        .from('abonnements')
        .insert(subscriptionData)
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

      get().invalidateCache();
      await get().fetchSubscriptions(true);

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

  // =============================================
  // CANCEL SUBSCRIPTION
  // =============================================
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

      get().invalidateCache();
      await get().fetchSubscriptions(true);

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
