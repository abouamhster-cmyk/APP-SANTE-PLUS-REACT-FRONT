// 📁 src/components/guards/SubscriptionGuard.tsx

import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { ShieldAlert, CreditCard, ArrowRight, Calendar, ShoppingBag } from 'lucide-react';

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

    // ✅ Icône dynamique
    const getIcon = () => {
      if (action === 'visit') return <Calendar size={32} />;
      if (action === 'order') return <ShoppingBag size={32} />;
      return <ShieldAlert size={32} />;
    };

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

        {/* ✅ Afficher le nombre de visites/commandes restantes si abonnement expiré */}
        {isExpired && (
          <div className="mt-3 flex justify-center gap-4 text-sm">
            <span style={{ color: colors.text + '50' }}>
              📅 {remainingVisits} visites
            </span>
            <span style={{ color: colors.text + '50' }}>
              🛒 {remainingOrders} commandes
            </span>
          </div>
        )}
        
        <button
          onClick={() => navigate('/app/billing')}
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm transition hover:opacity-90"
          style={{ background: colors.primary }}
        >
          <CreditCard size={16} />
          {message.button}
          <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  return <>{children}</>;
};