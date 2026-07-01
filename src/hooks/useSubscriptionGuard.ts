// 📁 src/hooks/useSubscriptionGuard.ts

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

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
}

export const useSubscriptionGuard = () => {
  const { user } = useAuthStore();
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
  });

  useEffect(() => {
    if (!user) {
      setStatus(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const checkSubscription = async () => {
      try {
        // ✅ Récupérer l'abonnement le plus récent du compte (user_id)
        const { data: subscriptions, error } = await supabase
          .from('abonnements')
          .select(`
            *,
            offre:offres(*)
          `)
          .eq('user_id', user.id)   // ✅ LIÉ AU COMPTE
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        const subscription = subscriptions?.[0] || null;

        // ✅ Pas d'abonnement du tout
        if (!subscription) {
          setStatus(prev => ({
            ...prev,
            hasActiveSubscription: false,
            isExpired: false,
            hasNeverSubscribed: true,
            remainingVisits: 0,
            remainingOrders: 0,
            subscription: null,
            totalVisits: 0,
            totalOrders: 0,
            startDate: null,
            endDate: null,
            isLoading: false,
          }));
          return;
        }

        // ✅ Vérifier si l'abonnement est actif
        const isActive = subscription.status === 'actif';
        const endDate = new Date(subscription.end_date);
        const today = new Date();
        const isExpired = subscription.status === 'expire' || endDate < today;

        // ✅ Si abonnement expiré mais pas encore marqué comme tel, le mettre à jour
        if (isExpired && subscription.status !== 'expire') {
          await supabase
            .from('abonnements')
            .update({ status: 'expire' })
            .eq('id', subscription.id);
        }

        setStatus(prev => ({
          ...prev,
          hasActiveSubscription: isActive && !isExpired,
          isExpired: isExpired,
          hasNeverSubscribed: false,
          remainingVisits: subscription.remaining_visits || 0,
          remainingOrders: subscription.remaining_orders || 0,
          totalVisits: subscription.total_visits || 0,
          totalOrders: subscription.total_orders || 0,
          subscription,
          startDate: subscription.start_date,
          endDate: subscription.end_date,
          isLoading: false,
        }));

      } catch (error) {
        console.error('❌ Check subscription error:', error);
        setStatus(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkSubscription();
  }, [user]);

  // ✅ Fonction pour vérifier une action spécifique
  const can = (action: 'visit' | 'order'): boolean => {
    const { hasActiveSubscription, remainingVisits, remainingOrders } = status;

    if (!hasActiveSubscription) return false;

    if (action === 'visit') {
      return remainingVisits > 0;
    }

    if (action === 'order') {
      return remainingOrders > 0;
    }

    return false;
  };

  // ✅ Fonction pour obtenir le message de blocage
  const getBlockMessage = (action: 'visit' | 'order'): { title: string; description: string; button: string } => {
    const { isExpired, hasNeverSubscribed, remainingVisits, remainingOrders } = status;

    if (isExpired) {
      return {
        title: '⏳ Abonnement expiré',
        description: 'Votre abonnement a expiré. Renouvelez-le pour continuer à utiliser nos services.',
        button: 'Renouveler mon abonnement',
      };
    }

    if (hasNeverSubscribed || !status.hasActiveSubscription) {
      return {
        title: '💳 Aucun abonnement actif',
        description: 'Vous devez souscrire à un abonnement pour accéder à cette fonctionnalité.',
        button: 'Voir les offres',
      };
    }

    if (action === 'visit' && remainingVisits === 0) {
      return {
        title: '📅 Plus de visites disponibles',
        description: 'Vous avez utilisé toutes vos visites. Pensez à renouveler votre abonnement.',
        button: 'Voir les offres',
      };
    }

    if (action === 'order' && remainingOrders === 0) {
      return {
        title: '🛒 Plus de commandes disponibles',
        description: 'Vous avez utilisé toutes vos commandes incluses. Pensez à renouveler votre abonnement.',
        button: 'Voir les offres',
      };
    }

    return {
      title: '🔒 Accès restreint',
      description: 'Vous devez avoir un abonnement actif pour accéder à cette fonctionnalité.',
      button: 'Voir les offres',
    };
  };

  return {
    ...status,
    can,
    getBlockMessage,
  };
};
