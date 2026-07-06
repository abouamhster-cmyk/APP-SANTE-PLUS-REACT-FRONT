// 📁 src/hooks/useSubscriptionGuard.ts

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

// ✅ Importer les helpers de constants
import {
  getVisitStatusForCreation,
  getOrderStatusForCreation,
  requiresPonctualPayment,
} from '@/lib/constants';

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  isExpired: boolean;
  hasNeverSubscribed: boolean;
  remainingVisits: number;
  remainingOrders: number;
  subscription: any | null;
  isLoading: boolean;
  totalVisits: number;
  totalOrders: number;
  startDate: string | null;
  endDate: string | null;
  role: string | null;
  // ✅ Nouveaux champs
  canUsePonctual: boolean;
  visitStatus: 'planifiee' | 'brouillon';
  orderStatus: 'creee' | 'attente_paiement';
  needsRenewal: boolean;
}

export const useSubscriptionGuard = () => {
  const { user, profile, role } = useAuthStore();
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasActiveSubscription: false,
    isExpired: false,
    hasNeverSubscribed: false,
    remainingVisits: 0,
    remainingOrders: 0,
    subscription: null,
    isLoading: true,
    totalVisits: 0,
    totalOrders: 0,
    startDate: null,
    endDate: null,
    role: role,
    canUsePonctual: true,
    visitStatus: 'brouillon',
    orderStatus: 'attente_paiement',
    needsRenewal: false,
  });

  useEffect(() => {
    if (!user) {
      setStatus(prev => ({ 
        ...prev, 
        isLoading: false, 
        role: role,
        canUsePonctual: true,
      }));
      return;
    }

    const checkSubscription = async () => {
      try {
        console.log('🔍 Vérification abonnement pour:', user.id, 'Rôle:', role);

        // ✅ CAS 1 : ADMIN / COORDINATEUR → Accès illimité
        if (role === 'admin' || role === 'coordinator') {
          console.log('👔 Admin/Coord détecté - Accès illimité');
          setStatus({
            hasActiveSubscription: true,
            isExpired: false,
            hasNeverSubscribed: false,
            remainingVisits: Number.MAX_SAFE_INTEGER,
            remainingOrders: Number.MAX_SAFE_INTEGER,
            subscription: null,
            isLoading: false,
            totalVisits: Number.MAX_SAFE_INTEGER,
            totalOrders: Number.MAX_SAFE_INTEGER,
            startDate: null,
            endDate: null,
            role: role,
            canUsePonctual: false,
            visitStatus: 'planifiee',
            orderStatus: 'creee',
            needsRenewal: false,
          });
          return;
        }

        // ✅ CAS 2 : AIDANT → Pas de vérification d'abonnement
        if (role === 'aidant') {
          console.log('🦸 Aidant détecté - Pas de vérification d\'abonnement');
          setStatus({
            hasActiveSubscription: true,
            isExpired: false,
            hasNeverSubscribed: false,
            remainingVisits: 999,
            remainingOrders: 999,
            subscription: null,
            isLoading: false,
            totalVisits: 999,
            totalOrders: 999,
            startDate: null,
            endDate: null,
            role: role,
            canUsePonctual: false,
            visitStatus: 'planifiee',
            orderStatus: 'creee',
            needsRenewal: false,
          });
          return;
        }

        // ✅ CAS 3 : FAMILLE → Vérification de l'abonnement
        if (role === 'family') {
          console.log('👨‍👩‍👦 Famille détectée - Vérification de l\'abonnement');

          const { data: subscriptions, error } = await supabase
            .from('abonnements')
            .select(`
              *,
              offre:offres(*)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (error) {
            console.error('❌ Erreur récupération abonnement:', error);
            setStatus(prev => ({ 
              ...prev, 
              isLoading: false, 
              role: role,
              canUsePonctual: true,
            }));
            return;
          }

          const subscription = subscriptions?.[0] || null;

          // ❌ Pas d'abonnement → Mode ponctuel disponible
          if (!subscription) {
            console.log('❌ Aucun abonnement - Mode ponctuel');
            setStatus({
              hasActiveSubscription: false,
              isExpired: false,
              hasNeverSubscribed: true,
              remainingVisits: 0,
              remainingOrders: 0,
              subscription: null,
              isLoading: false,
              totalVisits: 0,
              totalOrders: 0,
              startDate: null,
              endDate: null,
              role: role,
              canUsePonctual: true,
              visitStatus: 'brouillon',
              orderStatus: 'attente_paiement',
              needsRenewal: false,
            });
            return;
          }

          const isActive = subscription.status === 'actif';
          const endDate = new Date(subscription.end_date);
          const today = new Date();
          const isExpired = subscription.status === 'expire' || endDate < today;

          // ✅ Mettre à jour le statut si expiré
          if (isExpired && subscription.status !== 'expire') {
            await supabase
              .from('abonnements')
              .update({ status: 'expire' })
              .eq('id', subscription.id);
          }

          // ✅ Déterminer si le renouvellement est nécessaire
          const needsRenewal = isExpired || subscription.remaining_visits <= 0 || subscription.remaining_orders <= 0;

          // ✅ Déterminer le statut pour les visites/commandes
          const visitStatus = (isActive && !isExpired && subscription.remaining_visits > 0) 
            ? 'planifiee' 
            : 'brouillon';
          
          const orderStatus = (isActive && !isExpired && subscription.remaining_orders > 0) 
            ? 'creee' 
            : 'attente_paiement';

          console.log('📊 Statut abonnement:', {
            isActive: isActive && !isExpired,
            remainingVisits: subscription.remaining_visits,
            remainingOrders: subscription.remaining_orders,
            visitStatus,
            orderStatus,
            needsRenewal,
          });

          setStatus({
            hasActiveSubscription: isActive && !isExpired,
            isExpired: isExpired,
            hasNeverSubscribed: false,
            remainingVisits: subscription.remaining_visits || 0,
            remainingOrders: subscription.remaining_orders || 0,
            subscription,
            isLoading: false,
            totalVisits: subscription.total_visits || 0,
            totalOrders: subscription.total_orders || 0,
            startDate: subscription.start_date,
            endDate: subscription.end_date,
            role: role,
            canUsePonctual: true, // ✅ Toujours disponible en fallback
            visitStatus: visitStatus,
            orderStatus: orderStatus,
            needsRenewal: needsRenewal,
          });
          return;
        }

        // ✅ CAS 4 : AUTRE RÔLE
        console.log('⚠️ Rôle non reconnu:', role);
        setStatus(prev => ({ 
          ...prev, 
          isLoading: false, 
          role: role,
          canUsePonctual: true,
        }));

      } catch (error) {
        console.error('❌ Check subscription error:', error);
        setStatus(prev => ({ 
          ...prev, 
          isLoading: false, 
          role: role,
          canUsePonctual: true,
        }));
      }
    };

    checkSubscription();
  }, [user, role]);

  // ============================================================
  // ✅ FONCTIONS UTILITAIRES
  // ============================================================

  /**
   * Vérifie si une action est disponible
   */
  const can = (action: 'visit' | 'order'): boolean => {
    const { hasActiveSubscription, remainingVisits, remainingOrders, role } = status;

    // Admin/Coord/Aidant ont toujours accès
    if (role === 'aidant' || role === 'admin' || role === 'coordinator') {
      return true;
    }

    // Famille → vérifier l'abonnement
    if (!hasActiveSubscription) return false;

    if (action === 'visit') {
      return remainingVisits > 0;
    }

    if (action === 'order') {
      return remainingOrders > 0;
    }

    return false;
  };

  /**
   * Vérifie si le mode ponctuel est disponible
   */
  const canUsePonctual = (): boolean => {
    const { role, hasActiveSubscription } = status;
    
    // Aidants et admins n'ont pas besoin du mode ponctuel
    if (role === 'aidant' || role === 'admin' || role === 'coordinator') {
      return false;
    }
    
    // Famille → toujours disponible si pas d'abonnement ou plus de crédit
    if (!hasActiveSubscription) return true;
    if (status.remainingVisits <= 0 || status.remainingOrders <= 0) return true;
    
    return true; // Toujours disponible en fallback
  };

  /**
   * Obtient le statut pour une visite
   */
  const getVisitStatus = (): 'planifiee' | 'brouillon' => {
    const { role, visitStatus } = status;
    
    if (role === 'aidant' || role === 'admin' || role === 'coordinator') {
      return 'planifiee';
    }
    
    return visitStatus;
  };

  /**
   * Obtient le statut pour une commande
   */
  const getOrderStatus = (): 'creee' | 'attente_paiement' => {
    const { role, orderStatus } = status;
    
    if (role === 'aidant' || role === 'admin' || role === 'coordinator') {
      return 'creee';
    }
    
    return orderStatus;
  };

  /**
   * Vérifie si un paiement est requis pour une action
   */
  const requiresPayment = (action: 'visit' | 'order'): boolean => {
    if (can(action)) return false;
    return true;
  };

  /**
   * Obtient le message d'action approprié
   */
  const getActionMessage = (action: 'visit' | 'order'): {
    title: string;
    description: string;
    button: string;
    showPonctual: boolean;
    showRenew: boolean;
  } => {
    const { isExpired, hasNeverSubscribed, remainingVisits, remainingOrders, role } = status;

    // Admin/Coord/Aidant → toujours autorisé
    if (role === 'aidant' || role === 'admin' || role === 'coordinator') {
      return {
        title: '✅ Accès autorisé',
        description: 'Vous pouvez effectuer cette action.',
        button: 'Continuer',
        showPonctual: false,
        showRenew: false,
      };
    }

    // Abonnement expiré
    if (isExpired) {
      return {
        title: '⏳ Abonnement expiré',
        description: 'Votre abonnement a expiré. Renouvelez-le pour continuer ou passez en mode ponctuel.',
        button: 'Renouveler',
        showPonctual: true,
        showRenew: true,
      };
    }

    // Pas d'abonnement
    if (hasNeverSubscribed || !status.hasActiveSubscription) {
      return {
        title: '💳 Aucun abonnement actif',
        description: 'Souscrivez un abonnement pour bénéficier de tarifs préférentiels ou utilisez le mode ponctuel.',
        button: 'Voir les offres',
        showPonctual: true,
        showRenew: false,
      };
    }

    // Plus de visites
    if (action === 'visit' && remainingVisits === 0) {
      return {
        title: '📅 Plus de visites disponibles',
        description: 'Vous avez utilisé toutes vos visites. Renouvelez votre abonnement ou passez en mode ponctuel.',
        button: 'Renouveler',
        showPonctual: true,
        showRenew: true,
      };
    }

    // Plus de commandes
    if (action === 'order' && remainingOrders === 0) {
      return {
        title: '🛒 Plus de commandes disponibles',
        description: 'Vous avez utilisé toutes vos commandes. Renouvelez votre abonnement ou passez en mode ponctuel.',
        button: 'Renouveler',
        showPonctual: true,
        showRenew: true,
      };
    }

    return {
      title: '✅ Accès autorisé',
      description: 'Vous pouvez effectuer cette action.',
      button: 'Continuer',
      showPonctual: false,
      showRenew: false,
    };
  };

  /**
   * Obtient le message de blocage (pour les modales)
   */
  const getBlockMessage = (action: 'visit' | 'order'): {
    title: string;
    description: string;
    button: string;
    showPonctual?: boolean;
  } => {
    const msg = getActionMessage(action);
    return {
      title: msg.title,
      description: msg.description,
      button: msg.button,
      showPonctual: msg.showPonctual,
    };
  };

  /**
   * Vérifie si l'utilisateur a un abonnement actif
   */
  const hasActiveSubscription = (): boolean => {
    return status.hasActiveSubscription;
  };

  /**
   * Vérifie si l'utilisateur a des visites disponibles
   */
  const hasAvailableVisits = (): boolean => {
    return status.hasActiveSubscription && status.remainingVisits > 0;
  };

  /**
   * Vérifie si l'utilisateur a des commandes disponibles
   */
  const hasAvailableOrders = (): boolean => {
    return status.hasActiveSubscription && status.remainingOrders > 0;
  };

  // ============================================================
  // RETOUR
  // ============================================================

  return {
    ...status,
     can,
    canUsePonctual: canUsePonctual(),
    getVisitStatus: getVisitStatus(),
    getOrderStatus: getOrderStatus(),
    requiresPayment: (action: 'visit' | 'order') => requiresPayment(action),
    getActionMessage,
    getBlockMessage,
    hasActiveSubscription: hasActiveSubscription(),
    hasAvailableVisits: hasAvailableVisits(),
    hasAvailableOrders: hasAvailableOrders(),
     isAidant: status.role === 'aidant',
    isAdminOrCoordinator: status.role === 'admin' || status.role === 'coordinator',
    isFamily: status.role === 'family',
  };
};
