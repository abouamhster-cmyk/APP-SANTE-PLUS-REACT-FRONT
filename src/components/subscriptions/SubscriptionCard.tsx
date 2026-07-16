// 📁 src/components/subscriptions/SubscriptionCard.tsx
// 📌 Carte d'abonnement - LIÉE AU COMPTE

import { useState } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, TrendingUp, Package, Calendar as CalendarIcon, User } from 'lucide-react';
import { Subscription } from '@/types';
import { formatDate } from '@/utils/helpers';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';

interface SubscriptionCardProps {
  subscription: Subscription;
  colors?: any;
  onRenew?: () => void;
  onCancel?: () => void;
  onManageDays?: () => void; 
}

export const SubscriptionCard = ({ 
  subscription, 
  colors: propColors, 
  onRenew, 
  onCancel,
  onManageDays, 
}: SubscriptionCardProps) => {
  const brand = useBranding();
  const colors = propColors || brand.colors;
  
  const {
    singular,
    getCategoryLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const [isLoading, setIsLoading] = useState(false);

  const isActive = subscription.status === 'actif';
  const isExpired = subscription.status === 'expire';
  const isPending = subscription.status === 'en_attente';

  const getPatientLabel = () => {
    if (isFamily) return 'Proche';
    if (isAidant) return 'Personne accompagnée';
    if (isAdminOrCoordinator) return 'Bénéficiaire';
    return 'Patient';
  };

  const hasPatient = subscription.patient_id;
  const targetType = hasPatient ? 'patient' : 'personal';
  const targetLabel = hasPatient ? getPatientLabel() : 'Personnel';
  const targetName = hasPatient 
    ? `${subscription.patient?.first_name || ''} ${subscription.patient?.last_name || ''}` 
    : subscription.user?.full_name || 'Compte';

  const progressVisits = subscription.total_visits > 0 
    ? (subscription.used_visits / subscription.total_visits) * 100 
    : 0;

  const progressOrders = subscription.total_orders > 0 
    ? (subscription.used_orders / subscription.total_orders) * 100 
    : 0;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border transition hover:shadow-md" style={{ borderColor: colors.primary + '20' }}>
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold" style={{ color: colors.text }}>
              {subscription.offre?.name || 'Abonnement'}
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                isActive ? 'bg-green-100 text-green-600' :
                isExpired ? 'bg-red-100 text-red-600' :
                'bg-yellow-100 text-yellow-600'
              }`}
            >
              {isActive ? '✅ Actif' :
               isExpired ? '❌ Expiré' :
               '⏳ En attente'}
            </span>
          </div>
          <p className="text-sm" style={{ color: colors.textLight }}>
            {getCategoryLabel(subscription.offre?.category || 'senior')}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-xs" style={{ color: colors.textLight }}>
            <User size={12} style={{ color: colors.primary }} />
            <span>
              {targetLabel}: {targetName || 'Non spécifié'}
            </span>
            {targetType === 'personal' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                Personnel
              </span>
            )}
          </div>
        </div>
        <p className="text-xl font-bold" style={{ color: colors.primary }}>
          {subscription.offre?.price?.toLocaleString()} FCFA
        </p>
      </div>

      {/* Période */}
      <div className="flex items-center gap-4 mt-2 text-sm" style={{ color: colors.textLight }}>
        <span className="flex items-center gap-1">
          <Calendar size={14} />
          {formatDate(subscription.start_date)} → {formatDate(subscription.end_date)}
        </span>
        {subscription.auto_renew && (
          <span className="text-xs" style={{ color: colors.primary }}>🔄 Renouvellement auto</span>
        )}
      </div>

      {/* Visites restantes */}
      <div className="mt-4 p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: colors.text }}>
              📅 Visites
            </p>
            <p className="text-2xl font-bold" style={{ color: colors.primary }}>
              {subscription.remaining_visits || 0}
            </p>
            <p className="text-xs" style={{ color: colors.textLight }}>
              sur {subscription.total_visits || 0} au total
            </p>
          </div>
          <div className="w-20 h-20 relative">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="30"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="6"
              />
              <circle
                cx="40"
                cy="40"
                r="30"
                fill="none"
                stroke={colors.primary}
                strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 30}`}
                strokeDashoffset={`${2 * Math.PI * 30 * (1 - progressVisits / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold" style={{ color: colors.primary }}>
                {Math.round(progressVisits)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Commandes restantes */}
      {subscription.total_orders > 0 && (
        <div className="mt-3 p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: colors.text }}>
                🛒 Commandes incluses
              </p>
              <p className="text-lg font-bold" style={{ color: colors.primary }}>
                {subscription.remaining_orders || 0}
              </p>
              <p className="text-xs" style={{ color: colors.textLight }}>
                sur {subscription.total_orders || 0} au total
              </p>
            </div>
            <div className="w-16 h-16 relative">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="22"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="5"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="22"
                  fill="none"
                  stroke={colors.gold || '#c9a84c'}
                  strokeWidth="5"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - progressOrders / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold" style={{ color: colors.gold || '#c9a84c' }}>
                  {Math.round(progressOrders)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-4">
        {isActive && (
          <>
            <button
              onClick={onRenew}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl text-white font-medium text-sm transition hover:opacity-80 disabled:opacity-50"
              style={{ background: colors.primary }}
            >
              Renouveler
            </button>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="py-2.5 px-4 rounded-xl font-medium text-sm transition hover:bg-red-50"
              style={{ color: '#EF4444', border: '1px solid #EF4444' }}
            >
              Annuler
            </button>
          </>
        )}
        {isExpired && (
          <button
            onClick={onRenew}
            className="flex-1 py-2.5 rounded-xl text-white font-medium text-sm transition hover:opacity-80"
            style={{ background: colors.primary }}
          >
            🔄 Réactiver
          </button>
        )}
      </div>

      {/* Bouton "Gérer les jours" */}
      {isActive && onManageDays && (
        <button
          onClick={onManageDays}
          className="w-full mt-3 py-2.5 rounded-xl font-medium text-sm transition hover:opacity-80 flex items-center justify-center gap-2"
          style={{ background: colors.primary + '15', color: colors.primary }}
        >
          <CalendarIcon size={16} />
          📅 Gérer les jours de visite
        </button>
      )}

      {/* Date d'expiration */}
      {isActive && (
        <p className="text-xs text-center mt-3" style={{ color: colors.textLight }}>
          Expire le {formatDate(subscription.end_date)}
        </p>
      )}
    </div>
  );
};
