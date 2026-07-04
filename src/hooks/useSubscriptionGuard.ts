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
  role: string | null;
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
  });

  useEffect(() => {
    if (!user) {
      setStatus(prev => ({ ...prev, isLoading: false, role: role }));
      return;
    }

    const checkSubscription = async () => {
      try {
        console.log('🔍 Vérification abonnement pour:', user.id, 'Rôle:', role);

        // ✅ CAS 1 : AIDANT
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
          });
          return;
        }

        // ✅ CAS 2 : ADMIN / COORDINATEUR
        if (role === 'admin' || role === 'coordinator') {
          console.log('👔 Admin/Coord détecté - Pas de vérification d\'abonnement');
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
          });
          return;
        }

        // ✅ CAS 3 : FAMILLE
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
            setStatus(prev => ({ ...prev, isLoading: false, role: role }));
            return;
          }

          const subscription = subscriptions?.[0] || null;

          if (!subscription) {
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
            });
            return;
          }

          const isActive = subscription.status === 'actif';
          const endDate = new Date(subscription.end_date);
          const today = new Date();
          const isExpired = subscription.status === 'expire' || endDate < today;

          if (isExpired && subscription.status !== 'expire') {
            await supabase
              .from('abonnements')
              .update({ status: 'expire' })
              .eq('id', subscription.id);
          }

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
          });
          return;
        }

        // ✅ CAS 4 : AUTRE RÔLE
        console.log('⚠️ Rôle non reconnu:', role, '- Vérification standard');
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
          console.error('❌ Erreur:', error);
          setStatus(prev => ({ ...prev, isLoading: false, role: role }));
          return;
        }

        const subscription = subscriptions?.[0] || null;

        if (!subscription) {
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
          });
          return;
        }

        const isActive = subscription.status === 'actif';
        const endDate = new Date(subscription.end_date);
        const today = new Date();
        const isExpired = subscription.status === 'expire' || endDate < today;

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
        });

      } catch (error) {
        console.error('❌ Check subscription error:', error);
        setStatus(prev => ({ ...prev, isLoading: false, role: role }));
      }
    };

    checkSubscription();
  }, [user, role]);

  // ✅ Fonction pour vérifier une action spécifique
  const can = (action: 'visit' | 'order'): boolean => {
    const { hasActiveSubscription, remainingVisits, remainingOrders, role } = status;

    if (role === 'aidant' || role === 'admin' || role === 'coordinator') {
      return true;
    }

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
  const getBlockMessage = (action: 'visit' | 'order'): { 
    title: string; 
    description: string; 
    button: string;
    showPonctual?: boolean;
  } => {
    const { isExpired, hasNeverSubscribed, remainingVisits, remainingOrders, role } = status;

    if (role === 'aidant' || role === 'admin' || role === 'coordinator') {
      return {
        title: '✅ Accès autorisé',
        description: 'Vous avez tous les droits pour effectuer cette action.',
        button: 'Continuer',
        showPonctual: false,
      };
    }

    if (isExpired) {
      return {
        title: '⏳ Abonnement expiré',
        description: 'Votre abonnement a expiré. Renouvelez-le pour continuer à utiliser nos services.',
        button: 'Renouveler mon abonnement',
        showPonctual: true,
      };
    }

    if (hasNeverSubscribed || !status.hasActiveSubscription) {
      return {
        title: '💳 Aucun abonnement actif',
        description: 'Vous devez souscrire à un abonnement pour accéder à cette fonctionnalité.',
        button: 'Voir les offres',
        showPonctual: true,
      };
    }

    if (action === 'visit' && remainingVisits === 0) {
      return {
        title: '📅 Plus de visites disponibles',
        description: 'Vous avez utilisé toutes vos visites. Pensez à renouveler votre abonnement ou passez en mode ponctuel.',
        button: 'Voir les offres',
        showPonctual: true,
      };
    }

    if (action === 'order' && remainingOrders === 0) {
      return {
        title: '🛒 Plus de commandes disponibles',
        description: 'Vous avez utilisé toutes vos commandes incluses. Pensez à renouveler votre abonnement ou passez en mode ponctuel.',
        button: 'Voir les offres',
        showPonctual: true,
      };
    }

    return {
      title: '🔒 Accès restreint',
      description: 'Vous devez avoir un abonnement actif pour accéder à cette fonctionnalité.',
      button: 'Voir les offres',
      showPonctual: true,
    };
  };

  return {
    ...status,
    can,
    getBlockMessage,
    isAidant: status.role === 'aidant',
    isAdminOrCoordinator: status.role === 'admin' || status.role === 'coordinator',
    isFamily: status.role === 'family',
  };
};
