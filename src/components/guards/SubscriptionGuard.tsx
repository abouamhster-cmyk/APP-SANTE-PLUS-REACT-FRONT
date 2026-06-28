// 📁 src/components/guards/SubscriptionGuard.tsx
 
import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { ShieldAlert, CreditCard, ArrowRight, Calendar, ShoppingBag, AlertCircle } from 'lucide-react';

interface SubscriptionGuardProps {
  children: ReactNode;
  action: 'visit' | 'order' | 'all';
  fallback?: ReactNode;
  showMessage?: boolean;
  className?: string;
}

export const SubscriptionGuard = ({
  children,
  action,
  fallback,
  showMessage = true,
  className = '',
}: SubscriptionGuardProps) => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const { 
    hasActiveSubscription, 
    isExpired, 
    remainingVisits, 
    remainingOrders, 
    isLoading,
    can,
    getBlockMessage,
    hasNeverSubscribed,
  } = useSubscriptionGuard();

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ✅ Vérifier l'accès
  let hasAccess = false;
  if (action === 'all') {
    hasAccess = hasActiveSubscription;
  } else if (action === 'visit') {
    hasAccess = can('visit');
  } else if (action === 'order') {
    hasAccess = can('order');
  }

  // ✅ Si fallback fourni, l'utiliser
  if (!hasAccess && fallback) {
    return <>{fallback}</>;
  }

  // ✅ Si pas d'accès et pas de fallback, afficher le message
  if (!hasAccess) {
    if (!showMessage) return null;

    const message = getBlockMessage(action === 'all' ? 'visit' : action);

    const getIcon = () => {
      if (action === 'visit') return <Calendar size={32} />;
      if (action === 'order') return <ShoppingBag size={32} />;
      return <ShieldAlert size={32} />;
    };

    // ✅ Si l'utilisateur n'a jamais souscrit ou abonnement expiré
    const showRenewButton = isExpired || hasNeverSubscribed;

    return (
      <div className={`bg-white rounded-2xl p-8 text-center shadow-sm border border-black/5 max-w-md mx-auto ${className}`}>
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" 
          style={{ background: colors.primary + '15' }}
        >
          <div style={{ color: colors.primary }}>
            {getIcon()}
          </div>
        </div>
        
        <h3 className="text-lg font-bold" style={{ color: colors.text }}>
          {message.title}
        </h3>
        
        <p className="text-sm mt-2" style={{ color: colors.text + '70' }}>
          {message.description}
        </p>

        {/* ✅ Afficher le nombre de visites/commandes restantes */}
        {(isExpired || hasActiveSubscription) && (
          <div className="mt-3 flex justify-center gap-4 text-sm">
            <span style={{ color: colors.text + '50' }}>
              📅 {remainingVisits} visites
            </span>
            <span style={{ color: colors.text + '50' }}>
              🛒 {remainingOrders} commandes
            </span>
          </div>
        )}

        {/* ✅ Proposer le mode ponctuel si abonnement actif mais quota épuisé */}
        {hasActiveSubscription && remainingVisits === 0 && action === 'visit' && (
          <div className="mt-3 p-3 rounded-xl bg-orange-50 border border-orange-200">
            <p className="text-xs text-orange-700 flex items-center justify-center gap-1">
              <AlertCircle size={14} />
              <span>Quota de visites épuisé. Passez en mode ponctuel ou renouvelez.</span>
            </p>
          </div>
        )}

        {hasActiveSubscription && remainingOrders === 0 && action === 'order' && (
          <div className="mt-3 p-3 rounded-xl bg-orange-50 border border-orange-200">
            <p className="text-xs text-orange-700 flex items-center justify-center gap-1">
              <AlertCircle size={14} />
              <span>Quota de commandes épuisé. Passez en mode ponctuel ou renouvelez.</span>
            </p>
          </div>
        )}
        
        <button
          onClick={() => navigate('/app/billing')}
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm transition hover:opacity-90"
          style={{ background: colors.primary }}
        >
          <CreditCard size={16} />
          {showRenewButton ? 'Voir les offres' : message.button}
          <ArrowRight size={16} />
        </button>

        {/* ✅ Bouton mode ponctuel si quota épuisé */}
        {hasActiveSubscription && (remainingVisits === 0 || remainingOrders === 0) && (
          <button
            onClick={() => {
              if (action === 'visit') {
                // Rediriger vers la page de planification avec mode ponctuel
                navigate('/app/visits/create?mode=ponctual');
              } else {
                navigate('/app/orders/create?mode=ponctual');
              }
            }}
            className="mt-2 inline-flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition hover:opacity-80 border"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            💳 Mode ponctuel
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};
