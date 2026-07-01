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
  });

  useEffect(() => {
    if (!user) {
      setStatus(prev => ({ ...prev, isLoading: false }));
      return;
    }

    // ✅ SOLUTION LONG TERME : Vérification par rôle
    const checkSubscription = async () => {
      try {
        console.log('🔍 Vérification abonnement pour:', user.id, 'Rôle:', role);

        // ✅ CAS 1 : AIDANT - Pas besoin d'abonnement
        if (role === 'aidant') {
          console.log('🦸 Aidant détecté - Pas de vérification d\'abonnement');
          setStatus({
            hasActiveSubscription: true, // ✅ Toujours actif pour les aidants
            isExpired: false,
            hasNeverSubscribed: false,
            remainingVisits: 999, // ✅ Illimité
            remainingOrders: 999, // ✅ Illimité
            subscription: null,
            isLoading: false,
            totalVisits: 999,
            totalOrders: 999,
            startDate: null,
            endDate: null,
          });
          return;
        }

        // ✅ CAS 2 : ADMIN / COORDINATEUR - Pas besoin d'abonnement
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
          });
          return;
        }

        // ✅ CAS 3 : FAMILLE - Vérifier l'abonnement
        if (role === 'family') {
          console.log('👨‍👩‍👦 Famille détectée - Vérification de l\'abonnement');

          // ✅ Récupérer l'abonnement le plus récent
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
            setStatus(prev => ({ ...prev, isLoading: false }));
            return;
          }

          const subscription = subscriptions?.[0] || null;

          // ✅ Pas d'abonnement du tout
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
            });
            return;
          }

          // ✅ Vérifier si l'abonnement est actif
          const isActive = subscription.status === 'actif';
          const endDate = new Date(subscription.end_date);
          const today = new Date();
          const isExpired = subscription.status === 'expire' || endDate < today;

          // ✅ Si abonnement expiré, le mettre à jour
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
          });
          return;
        }

        // ✅ CAS 4 : AUTRE RÔLE - Comportement par défaut
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
          setStatus(prev => ({ ...prev, isLoading: false }));
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
        });

      } catch (error) {
        console.error('❌ Check subscription error:', error);
        setStatus(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkSubscription();
  }, [user, role]);

  // ✅ Fonction pour vérifier une action spécifique
  const can = (action: 'visit' | 'order'): boolean => {
    const { hasActiveSubscription, remainingVisits, remainingOrders, role } = status;

    // ✅ Les aidants et admins peuvent toujours tout faire
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

    // ✅ Les aidants n'ont jamais de blocage
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
    // ✅ Helper pour savoir si l'utilisateur est un aidant
    isAidant: role === 'aidant',
    isAdminOrCoordinator: role === 'admin' || role === 'coordinator',
    isFamily: role === 'family',
  };
};
