// 📁 frontend/src/hooks/useOrder.ts
// ✅ HOOK DE COMMANDES COMPLET : INTEGRATION DE LA DOUBLE FACTURATION ET DES SERVICES DE SECURISATION DES ESPECES

import { useCallback, useMemo, useEffect, useState } from 'react';
import { useOrderStore } from '@/stores/orderStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types';
import toast from 'react-hot-toast';

// ============================================================
// TYPES ÉTENDUS
// ============================================================

interface ExtendedOrder extends Order {
  metadata?: {
    ponctual_mode?: boolean;
    is_ponctual?: boolean;
    delivery_payment_method?: 'online' | 'cash';
    cash_confirmation_status?: 'pending' | 'confirmed' | 'disputed' | 'auto_confirmed';
    [key: string]: any;
  };
  is_ponctual?: boolean;
  order_type?: 'subscription' | 'ponctual';
  purchase_amount?: number;
  withdrawal_operator?: string;
  withdrawal_fee?: number;
}

interface OrderQuota {
  current: number;
  max: number;
  available: number;
  canTake: boolean;
}

interface UseOrderOptions {
  autoFetch?: boolean;
  autoFetchQuota?: boolean;
}

interface UseOrderReturn {
  // État
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  quota: OrderQuota | null;
  isQuotaLoading: boolean;
  availableOrders: Order[];
  activeOrders: Order[];
  completedOrders: Order[];
  pendingPaymentOrders: Order[];
  ponctualOrders: Order[];
  stats: {
    total: number;
    pending: number;
    available: number;
    inProgress: number;
    delivered: number;
    validated: number;
    cancelled: number;
    pendingPayment: number;
    ponctual: number;
  };

  // Actions
  fetchOrders: (force?: boolean) => Promise<void>;
  fetchQuota: () => Promise<void>;
  takeOrder: (orderId: string) => Promise<boolean>;
  deliverOrder: (
    orderId: string, 
    proofUrl?: string, 
    location?: any, 
    deliveryFee?: number, 
    paymentMethod?: 'online' | 'cash', 
    cashAmountReceived?: number
  ) => Promise<boolean>;
  confirmCashPayment: (orderId: string, isConfirmed: boolean) => Promise<boolean>; // ✅ Ajouté
  cancelOrder: (orderId: string, reason?: string) => Promise<boolean>;
  validateOrder: (orderId: string, comment?: string) => Promise<boolean>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<boolean>;
  getOrderById: (orderId: string) => Order | undefined;
  getOrdersByPatient: (patientId: string) => Order[];
  getOrdersByStatus: (status: OrderStatus) => Order[];
  getAvailableOrders: () => Promise<Order[]>;
  refresh: () => Promise<void>;

  // Utilitaires
  canTakeOrder: boolean;
  getQuotaMessage: () => string;
  getQuotaColor: () => string;
  getAvailableCount: () => number;
  getPendingCount: () => number;
}

// ============================================================
// HOOK COMPOSANT
// ============================================================

export const useOrder = (options: UseOrderOptions = {}): UseOrderReturn => {
  const { autoFetch = true, autoFetchQuota = true } = options;

  const { user, profile } = useAuthStore();
  const isAidant = profile?.role === 'aidant';
  const isAdmin = profile?.role === 'admin' || profile?.role === 'coordinator';
  const isFamily = profile?.role === 'family';

  const {
    orders,
    isLoading: storeLoading,
    error: storeError,
    fetchOrders: storeFetchOrders,
    takeOrder: storeTakeOrder,
    completeDelivery: storeCompleteDelivery,
    confirmCashPayment: storeConfirmCashPayment, // Action store
    updateOrderStatus: storeUpdateStatus,
    getAvailableOrders: storeGetAvailableOrders,
    invalidateCache,
  } = useOrderStore();

  const [quota, setQuota] = useState<OrderQuota | null>(null);
  const [isQuotaLoading, setIsQuotaLoading] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);

  const isLoading = storeLoading || isQuotaLoading;
  const error = storeError;

  // ============================================================
  // RÉCUPÉRATION DU QUOTA
  // ============================================================

  const fetchQuota = useCallback(async () => {
    if (!isAidant || !user) {
      setQuota(null);
      return;
    }

    setIsQuotaLoading(true);
    try {
      const { data: aidant, error } = await supabase
        .from('aidants')
        .select('current_orders, max_orders')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('❌ fetchQuota error:', error);
        return;
      }

      const current = aidant?.current_orders || 0;
      const max = aidant?.max_orders || 2;
      const available = max - current;

      setQuota({
        current,
        max,
        available,
        canTake: current < max,
      });
    } catch (error) {
      console.error('❌ fetchQuota error:', error);
    } finally {
      setIsQuotaLoading(false);
    }
  }, [isAidant, user]);

  // ============================================================
  // RÉCUPÉRER LES COMMANDES DISPONIBLES (AIDANTS)
  // ============================================================

  const fetchAvailableOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('commandes')
        .select(`
          *,
          patient:patients(*),
          aidant:aidants!commandes_aidant_id_fkey(*, user:profiles(*))
        `)
        .in('status', ['creee', 'en_attente', 'disponible'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAvailableOrders(data || []);
      return data || [];
    } catch (error) {
      console.error('❌ fetchAvailableOrders error:', error);
      return [];
    }
  }, []);

  // ============================================================
  // EFFETS DE CHARGEMENT
  // ============================================================

  useEffect(() => {
    if (autoFetch) {
      storeFetchOrders();
    }
  }, [autoFetch, storeFetchOrders]);

  useEffect(() => {
    if (autoFetchQuota && isAidant) {
      fetchQuota();
    }
  }, [autoFetchQuota, isAidant, fetchQuota]);

  useEffect(() => {
    if (isAidant) {
      fetchAvailableOrders();
    }
  }, [isAidant, orders, fetchAvailableOrders]);

  // ============================================================
  // ACTIONS ET METHODES DU HOOK (AVEC PROTECTION GPS)
  // ============================================================

  const fetchOrders = useCallback(async (force = false) => {
    await storeFetchOrders(force);
    if (isAidant) {
      await fetchAvailableOrders();
      await fetchQuota();
    }
  }, [storeFetchOrders, isAidant, fetchAvailableOrders, fetchQuota]);

  // ✅ CAPTURE GPS SÉCURISÉE LORS DE LA PRISE DE COMMANDE DEPUIS LES GRILLES
  const takeOrder = useCallback(async (orderId: string): Promise<boolean> => {
    try {
      let startLat: number | null = null;
      let startLng: number | null = null;

      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 });
          });
          startLat = position.coords.latitude;
          startLng = position.coords.longitude;
          console.log(`📍 GPS Départ Commande Capturé (Hook) : ${startLat}, ${startLng}`);
        }
      } catch (e) {
        console.warn("⚠️ Impossible de capturer le GPS lors de la prise de commande depuis la grille");
      }

      await storeTakeOrder(orderId, startLat, startLng); 
      
      await fetchQuota();
      await fetchAvailableOrders();
      toast.success('Commande prise en charge ✅ (GPS enregistré)');
      return true;
    } catch (error: any) {
      console.error('❌ takeOrder error:', error);
      toast.error(error.message || 'Erreur lors de la prise de commande');
      return false;
    }
  }, [storeTakeOrder, fetchQuota, fetchAvailableOrders]);

  // ✅ APPEL DE FIN DE LIVRAISON AVEC DOUBLE MODALITE SÉCURISÉE (CASH OU LIGNE)
  const deliverOrder = useCallback(async (
    orderId: string,
    proofUrl?: string,
    location?: any,
    deliveryFee: number = 0,
    paymentMethod: 'online' | 'cash' = 'online',
    cashAmountReceived: number = 0
  ): Promise<boolean> => {
    try {
      await storeCompleteDelivery(orderId, {
        proof_url: proofUrl || null,
        delivery_fee: deliveryFee,
        payment_method: paymentMethod,
        cash_amount_received: cashAmountReceived,
        lat: location?.lat || null,
        lng: location?.lng || null,
      });

      await fetchOrders(true);
      if (isAidant) {
        await fetchQuota();
      }
      return true;
    } catch (error: any) {
      console.error('❌ deliverOrder error:', error);
      toast.error(error.message || 'Erreur lors de la livraison');
      return false;
    }
  }, [storeCompleteDelivery, fetchOrders, isAidant, fetchQuota]);

  // ✅ CONFIRMER OU CONTESTER LE CASH REÇU PAR LE LIVREUR
  const confirmCashPayment = useCallback(async (orderId: string, isConfirmed: boolean): Promise<boolean> => {
    try {
      await storeConfirmCashPayment(orderId, isConfirmed);
      await fetchOrders(true);
      return true;
    } catch (error: any) {
      console.error('❌ confirmCashPayment error:', error);
      toast.error(error.message || 'Erreur lors de la confirmation espèces');
      return false;
    }
  }, [storeConfirmCashPayment, fetchOrders]);

  const cancelOrder = useCallback(async (orderId: string, reason?: string): Promise<boolean> => {
    try {
      await storeUpdateStatus(orderId, 'annulee' as OrderStatus);
      
      await fetchOrders(true);
      if (isAidant) {
        await fetchQuota();
      }
      
      toast.success('Commande annulée');
      return true;
    } catch (error: any) {
      console.error('❌ cancelOrder error:', error);
      toast.error(error.message || 'Erreur lors de l\'annulation');
      return false;
    }
  }, [storeUpdateStatus, fetchOrders, isAidant, fetchQuota]);

  const validateOrder = useCallback(async (orderId: string, comment?: string): Promise<boolean> => {
    try {
      await storeUpdateStatus(orderId, 'validee' as OrderStatus);
      
      await fetchOrders(true);
      
      toast.success('Commande validée ✅');
      return true;
    } catch (error: any) {
      console.error('❌ validateOrder error:', error);
      toast.error(error.message || 'Erreur lors de la validation');
      return false;
    }
  }, [storeUpdateStatus, fetchOrders]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus): Promise<boolean> => {
    try {
      await storeUpdateStatus(orderId, status);
      
      await fetchOrders(true);
      if (isAidant && (status === 'annulee' || status === 'livree')) {
        await fetchQuota();
      }
      
      return true;
    } catch (error: any) {
      console.error('❌ updateOrderStatus error:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour');
      return false;
    }
  }, [storeUpdateStatus, fetchOrders, isAidant, fetchQuota]);

  const getOrderById = useCallback((orderId: string): Order | undefined => {
    return orders.find(o => o.id === orderId);
  }, [orders]);

  const getOrdersByPatient = useCallback((patientId: string): Order[] => {
    return orders.filter(o => o.patient_id === patientId);
  }, [orders]);

  const getOrdersByStatus = useCallback((status: OrderStatus): Order[] => {
    return orders.filter(o => o.status === status);
  }, [orders]);

  const refresh = useCallback(async () => {
    invalidateCache();
    await fetchOrders(true);
    if (isAidant) {
      await fetchQuota();
      await fetchAvailableOrders();
    }
  }, [invalidateCache, fetchOrders, isAidant, fetchQuota, fetchAvailableOrders]);

  // ============================================================
  // STATISTIQUES
  // ============================================================

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === 'en_attente').length,
    available: orders.filter(o => o.status === 'disponible').length,
    inProgress: orders.filter(o => o.status === 'en_cours').length,
    delivered: orders.filter(o => o.status === 'livree').length,
    validated: orders.filter(o => o.status === 'validee').length,
    cancelled: orders.filter(o => o.status === 'annulee').length,
    pendingPayment: orders.filter(o => o.status === 'attente_paiement').length,
    ponctual: orders.filter(o => {
      const ext = o as ExtendedOrder;
      return ext.order_type === 'ponctual' || 
             ext.is_ponctual === true || 
             (ext.metadata && ext.metadata.ponctual_mode === true);
    }).length,
  }), [orders]);

  const activeOrders = useMemo(() => {
    return orders.filter(o => ['creee', 'en_attente', 'en_cours'].includes(o.status));
  }, [orders]);

  const completedOrders = useMemo(() => {
    return orders.filter(o => ['livree', 'validee'].includes(o.status));
  }, [orders]);

  const pendingPaymentOrders = useMemo(() => {
    return orders.filter(o => o.status === 'attente_paiement');
  }, [orders]);

  const ponctualOrders = useMemo(() => {
    return orders.filter(o => {
      const ext = o as ExtendedOrder;
      return ext.order_type === 'ponctual' || 
             ext.is_ponctual === true || 
             (ext.metadata && ext.metadata.ponctual_mode === true);
    });
  }, [orders]);

  // ============================================================
  // UTILITAIRES DE RENSEIGNEMENT DE QUOTA
  // ============================================================

  const canTakeOrder = useMemo((): boolean => {
    if (!isAidant) return false;
    if (!quota) return false;
    return quota.canTake && stats.available > 0;
  }, [isAidant, quota, stats.available]);

  const getQuotaMessage = useCallback((): string => {
    if (!isAidant) return '';
    if (!quota) return 'Chargement du quota...';
    if (quota.canTake) {
      return `${quota.available} place${quota.available > 1 ? 's' : ''} disponible${quota.available > 1 ? 's' : ''}`;
    }
    return `Quota atteint (${quota.current}/${quota.max})`;
  }, [isAidant, quota]);

  const getQuotaColor = useCallback((): string => {
    if (!isAidant) return '#9CA3AF';
    if (!quota) return '#9CA3AF';
    return quota.canTake ? '#4CAF50' : '#F44336';
  }, [isAidant, quota]);

  const getAvailableCount = useCallback((): number => {
    return stats.available || 0;
  }, [stats.available]);

  const getPendingCount = useCallback((): number => {
    return stats.pending || 0;
  }, [stats.pending]);

  return {
    // État
    orders,
    isLoading,
    error,
    quota,
    isQuotaLoading,
    availableOrders,
    activeOrders,
    completedOrders,
    pendingPaymentOrders,
    ponctualOrders,
    stats,

    // Actions
    fetchOrders,
    fetchQuota,
    takeOrder,
    deliverOrder,
    confirmCashPayment, // ✅ Injecté
    cancelOrder,
    validateOrder,
    updateOrderStatus,
    getOrderById,
    getOrdersByPatient,
    getOrdersByStatus,
    getAvailableOrders: fetchAvailableOrders,
    refresh,

    // Utilitaires
    canTakeOrder,
    getQuotaMessage,
    getQuotaColor,
    getAvailableCount,
    getPendingCount,
  };
};

export default useOrder;
