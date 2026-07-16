// 📁 frontend/src/components/orders/OrderCard.tsx

import { memo, useMemo, useCallback } from 'react';
import {
  Package,
  MapPin,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  ShoppingBag,
  Truck,
  CreditCard,
  UserCheck,
  Calendar,
  DollarSign,
  Play,
  Check,
  X,
  Users,
} from 'lucide-react';

import { Order } from '@/types';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatCurrency, cn } from '@/utils/helpers';

// ============================================================
// TYPES
// ============================================================

// ✅ Interface étendue pour gérer metadata - CORRIGÉE
interface ExtendedOrder extends Order {
  metadata?: {
    paid_at?: string;
    payment_completed?: boolean;
    ponctual_mode?: boolean;
    requires_payment?: boolean;
    payment_amount?: number;
    [key: string]: any;
  };
  is_ponctual?: boolean;
  is_paid?: boolean;
  order_type?: 'subscription' | 'ponctual';
}

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
  onStatusChange?: (status: string) => void;
  onTakeOrder?: () => void;
  onDeliver?: () => void;
  onCancel?: () => void;
  onView?: () => void;
  onShowAssignAidantModal?: () => void;
  showActions?: boolean;
  compact?: boolean;
  colors?: any;
}

// ============================================================
// CONFIGURATION DES STATUTS
// ============================================================

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
  progress: number;
  nextActions?: string[];
}> = {
  creee: {
    label: 'Créée',
    color: '#9E9E9E',
    bg: '#9E9E9E15',
    icon: <Package size={12} />,
    progress: 0,
    nextActions: ['Prendre', 'Annuler'],
  },
  en_attente: {
    label: 'En attente',
    color: '#F59E0B',
    bg: '#F59E0B15',
    icon: <Clock size={12} />,
    progress: 10,
    nextActions: ['Prendre', 'Annuler'],
  },
  disponible: {
    label: '🚨 Disponible',
    color: '#EF4444',
    bg: '#EF444415',
    icon: <AlertCircle size={12} />,
    progress: 15,
    nextActions: ['Prendre (Urgent)'],
  },
  en_cours: {
    label: 'En cours',
    color: '#3B82F6',
    bg: '#3B82F615',
    icon: <Truck size={12} />,
    progress: 40,
    nextActions: ['Livrer', 'Annuler'],
  },
  livree: {
    label: 'Livrée',
    color: '#3B82F6',
    bg: '#3B82F615',
    icon: <CheckCircle size={12} />,
    progress: 70,
    nextActions: ['Valider'],
  },
  validee: {
    label: 'Validée',
    color: '#4CAF50',
    bg: '#4CAF5015',
    icon: <CheckCircle size={12} />,
    progress: 100,
    nextActions: [],
  },
  annulee: {
    label: 'Annulée',
    color: '#EF4444',
    bg: '#EF444415',
    icon: <XCircle size={12} />,
    progress: 0,
    nextActions: [],
  },
  attente_paiement: {
    label: '💳 En attente paiement',
    color: '#8B5CF6',
    bg: '#8B5CF615',
    icon: <CreditCard size={12} />,
    progress: 5,
    nextActions: ['Payer'],
  },
};

const getStatusConfig = (status: string) => {
  return STATUS_CONFIG[status] || STATUS_CONFIG['creee'];
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export const OrderCard = memo(({
  order: orderProp,
  onClick,
  onStatusChange,
  onTakeOrder,
  onDeliver,
  onCancel,
  onView,
  onShowAssignAidantModal,
  showActions = false,
  compact = false,
  colors: propColors,
}: OrderCardProps) => {
  const brand = useBranding();
  const colors = propColors || brand.colors;
  const { isFamily, isAidant, isAdminOrCoordinator } = useTerminology();

  // ✅ Caster l'order en ExtendedOrder pour accéder à metadata
  const order = orderProp as ExtendedOrder;

  // ============================================================
  // CALCULS MEMOISÉS
  // ============================================================

  const statusConfig = useMemo(() => getStatusConfig(order.status), [order.status]);

  const isPonctual = useMemo(() => {
    return order.order_type === 'ponctual' || 
           order.is_ponctual === true || 
           order.metadata?.ponctual_mode === true;
  }, [order]);

  const isPaid = useMemo(() => {
    return order.is_paid === true || 
           order.metadata?.paid_at !== undefined ||
           order.metadata?.payment_completed === true;
  }, [order]);

  const isPendingPayment = useMemo(() => {
    return order.status === 'attente_paiement';
  }, [order]);

  const isInProgress = useMemo(() => {
    return order.status === 'en_cours';
  }, [order]);

  const isDelivered = useMemo(() => {
    return order.status === 'livree';
  }, [order]);

  const isAvailable = useMemo(() => {
    return order.status === 'creee' || order.status === 'en_attente' || order.status === 'disponible';
  }, [order]);

  const isUrgent = useMemo(() => {
    return order.status === 'disponible';
  }, [order]);

  const isCompleted = useMemo(() => {
    return order.status === 'validee' || order.status === 'annulee';
  }, [order]);

  // ✅ Nom du patient/client
  const patientName = useMemo(() => {
    if (order.patient) {
      return `${order.patient.first_name} ${order.patient.last_name}`;
    }
    if (order.family?.full_name) {
      return order.family.full_name;
    }
    return order.target_name || 'Client';
  }, [order]);

  // ✅ Nom de l'aidant - CORRIGÉ
  const aidantName = useMemo(() => {
    if (order.aidant?.user?.full_name) {
      return order.aidant.user.full_name;
    }
    if (order.aidant && typeof order.aidant === 'object' && 'full_name' in order.aidant) {
      return (order.aidant as any).full_name;
    }
    return 'Non assigné';
  }, [order]);

  // ✅ Montant
  const amount = useMemo(() => {
    return order.estimated_amount || order.final_amount || 0;
  }, [order]);

  // ✅ Articles
  const itemsCount = useMemo(() => {
    return order.items?.length || 0;
  }, [order]);

  // ✅ Barre de progression
  const progress = useMemo(() => {
    return statusConfig.progress || 0;
  }, [statusConfig]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleClick = useCallback(() => {
    if (onClick) onClick();
  }, [onClick]);

  const handleTakeOrder = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTakeOrder) onTakeOrder();
  }, [onTakeOrder]);

  const handleDeliver = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeliver) onDeliver();
  }, [onDeliver]);

  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCancel) onCancel();
  }, [onCancel]);

  const handleView = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onView) onView();
  }, [onView]);

  const handleShowAssignAidant = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShowAssignAidantModal) onShowAssignAidantModal();
  }, [onShowAssignAidantModal]);

  // ============================================================
  // RENDU - VERSION COMPACTE
  // ============================================================

  if (compact) {
    return (
      <div
        onClick={handleClick}
        className={cn(
          "bg-white rounded-2xl p-3 border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer",
          isUrgent ? "animate-pulse-slow" : ""
        )}
        style={{ 
          borderLeftColor: isUrgent ? '#EF4444' : statusConfig.color,
          borderColor: isUrgent ? '#EF444430' : colors.primary + '15',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-sm truncate" style={{ color: colors.text }}>
                {order.description || 'Commande'}
              </p>
              <span
                className="px-1.5 py-0.5 rounded-full text-[9px] font-medium flex items-center gap-0.5 shrink-0"
                style={{
                  background: statusConfig.bg,
                  color: statusConfig.color,
                }}
              >
                {statusConfig.icon}
                {statusConfig.label}
              </span>
              {isUrgent && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-red-100 text-red-600 flex items-center gap-0.5 shrink-0 animate-pulse">
                  <AlertCircle size={10} />
                  Urgent
                </span>
              )}
              {isPonctual && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-orange-100 text-orange-600 flex items-center gap-0.5 shrink-0">
                  <CreditCard size={10} />
                  Ponctuelle
                </span>
              )}
              {isPendingPayment && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-purple-100 text-purple-600 flex items-center gap-0.5 shrink-0">
                  <CreditCard size={10} />
                  En attente paiement
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs mt-1 text-gray-400 flex-wrap">
              <span className="flex items-center gap-0.5">
                <User size={11} />
                {patientName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <DollarSign size={11} />
                {formatCurrency(amount)}
              </span>
              {itemsCount > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-0.5">
                    <ShoppingBag size={11} />
                    {itemsCount} article{itemsCount > 1 ? 's' : ''}
                  </span>
                </>
              )}
              {order.aidant_id && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-0.5">
                    <UserCheck size={11} />
                    {aidantName}
                  </span>
                </>
              )}
            </div>

            {/* ✅ Barre de progression */}
            {!isCompleted && !isPendingPayment && (
              <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%`, background: statusConfig.color }}
                />
              </div>
            )}
          </div>

          {/* ✅ Actions compactes */}
          <div className="flex items-center gap-1 shrink-0">
            {showActions && (
              <>
                {/* AIDANT : Prendre une commande disponible */}
                {isAvailable && isAidant && (
                  <button
                    onClick={handleTakeOrder}
                    className={`p-1.5 rounded-lg text-white transition hover:opacity-80 ${isUrgent ? 'animate-pulse' : ''}`}
                    style={{ background: isUrgent ? '#EF4444' : '#F59E0B' }}
                    title={isUrgent ? 'Prendre (Urgent)' : 'Prendre'}
                  >
                    <Play size={12} />
                  </button>
                )}

                {/* AIDANT : Livrer une commande en cours */}
                {isInProgress && isAidant && (
                  <button
                    onClick={handleDeliver}
                    className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                    style={{ background: '#3B82F6' }}
                    title="Livrer"
                  >
                    <Truck size={12} />
                  </button>
                )}

                {/* ADMIN : Assigner un aidant */}
                {isAdminOrCoordinator && (isAvailable || isPendingPayment) && onShowAssignAidantModal && (
                  <button
                    onClick={handleShowAssignAidant}
                    className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                    style={{ background: '#FF5722' }}
                    title="Assigner un aidant"
                  >
                    <Users size={12} />
                  </button>
                )}

                {/* ADMIN/FAMILLE : Annuler */}
                {(isAvailable || isInProgress) && (isAdminOrCoordinator || isFamily) && (
                  <button
                    onClick={handleCancel}
                    className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                    style={{ background: '#EF4444' }}
                    title="Annuler"
                  >
                    <XCircle size={12} />
                  </button>
                )}
              </>
            )}

            {onView && (
              <button
                onClick={handleView}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                style={{ color: colors.primary }}
                title="Détails"
              >
                <Eye size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDU - VERSION COMPLÈTE
  // ============================================================

  return (
    <div
      onClick={handleClick}
      className={cn(
        "bg-white rounded-2xl p-4 sm:p-5 border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer",
        isUrgent ? "animate-pulse-slow" : ""
      )}
      style={{ 
        borderLeftColor: isUrgent ? '#EF4444' : statusConfig.color,
        borderColor: isUrgent ? '#EF444430' : colors.primary + '15',
      }}
    >
      {/* ============================================================
      HEADER
      ============================================================ */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: statusConfig.bg, color: statusConfig.color }}
            >
              {isPonctual ? <CreditCard size={16} /> : <Package size={16} />}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate" style={{ color: colors.text }}>
                {order.description || 'Commande'}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                <span className="flex items-center gap-0.5">
                  <User size={12} />
                  {patientName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <MapPin size={12} />
                  {order.address || 'Adresse non spécifiée'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Statut */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="px-2.5 py-1 rounded-full text-[10px] font-medium flex items-center gap-1 shrink-0"
            style={{
              background: statusConfig.bg,
              color: statusConfig.color,
            }}
          >
            {statusConfig.icon}
            {statusConfig.label}
          </span>
          {isUrgent && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-red-100 text-red-600 flex items-center gap-1 shrink-0 animate-pulse">
              <AlertCircle size={12} />
              Urgent
            </span>
          )}
        </div>
      </div>

      {/* ============================================================
      INFORMATIONS
      ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
        <InfoItem
          icon={<DollarSign size={14} />}
          label="Montant"
          value={formatCurrency(amount)}
          color={colors.primary}
        />
        <InfoItem
          icon={<Package size={14} />}
          label="Articles"
          value={`${itemsCount} article${itemsCount > 1 ? 's' : ''}`}
          color={colors.primary}
        />
        <InfoItem
          icon={<Calendar size={14} />}
          label="Créée le"
          value={formatDate(order.created_at)}
          color={colors.primary}
        />
        <InfoItem
          icon={<UserCheck size={14} />}
          label="Aidant"
          value={aidantName}
          color={order.aidant_id ? '#4CAF50' : '#EF4444'}
        />
      </div>

      {/* ============================================================
      BADGES SUPPLÉMENTAIRES
      ============================================================ */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {isPonctual && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-orange-100 text-orange-600 flex items-center gap-0.5">
            <CreditCard size={10} />
            Mode ponctuel
          </span>
        )}
        {isPaid && isPonctual && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-green-100 text-green-600 flex items-center gap-0.5">
            <CheckCircle size={10} />
            Payée
          </span>
        )}
        {isPendingPayment && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-purple-100 text-purple-600 flex items-center gap-0.5">
            <CreditCard size={10} />
            En attente paiement
          </span>
        )}
        {order.order_type === 'subscription' && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-blue-100 text-blue-600 flex items-center gap-0.5">
            <Package size={10} />
            Avec abonnement
          </span>
        )}
        {order.is_auto_validated && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-gray-100 text-gray-600 flex items-center gap-0.5">
            <CheckCircle size={10} />
            Auto-validée
          </span>
        )}
      </div>

      {/* ============================================================
      BARRE DE PROGRESSION
      ============================================================ */}
      {!isCompleted && !isPendingPayment && (
        <div className="mt-3">
          <div className="flex justify-between text-[9px] text-gray-400 mb-0.5">
            <span>Progression</span>
            <span>{Math.min(progress, 100)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%`, background: statusConfig.color }}
            />
          </div>
        </div>
      )}

      {/* ============================================================
      ACTIONS
      ============================================================ */}
      {showActions && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t" style={{ borderColor: colors.primary + '15' }}>
          {/* AIDANT : Prendre une commande disponible */}
          {isAvailable && isAidant && (
            <button
              onClick={handleTakeOrder}
              className={`flex-1 min-w-[80px] px-3 py-1.5 rounded-xl text-white text-xs font-bold transition hover:opacity-80 flex items-center justify-center gap-1 ${isUrgent ? 'animate-pulse' : ''}`}
              style={{ background: isUrgent ? '#EF4444' : '#F59E0B' }}
            >
              {isUrgent ? <AlertCircle size={12} /> : <Play size={12} />}
              {isUrgent ? 'Prendre (Urgent)' : 'Prendre'}
            </button>
          )}

          {/* AIDANT : Livrer une commande en cours */}
          {isInProgress && isAidant && (
            <button
              onClick={handleDeliver}
              className="flex-1 min-w-[80px] px-3 py-1.5 rounded-xl text-white text-xs font-bold transition hover:opacity-80 flex items-center justify-center gap-1"
              style={{ background: '#3B82F6' }}
            >
              <Truck size={12} />
              Livrer
            </button>
          )}

          {/* ADMIN : Assigner un aidant */}
          {isAdminOrCoordinator && (isAvailable || isPendingPayment) && onShowAssignAidantModal && (
            <button
              onClick={handleShowAssignAidant}
              className="flex-1 min-w-[80px] px-3 py-1.5 rounded-xl text-white text-xs font-bold transition hover:opacity-80 flex items-center justify-center gap-1"
              style={{ background: '#FF5722' }}
            >
              <Users size={12} />
              Assigner
            </button>
          )}

          {/* ADMIN : Valider une commande livrée */}
          {isDelivered && isAdminOrCoordinator && onStatusChange && (
            <button
              onClick={(e) => { e.stopPropagation(); onStatusChange('validee'); }}
              className="flex-1 min-w-[80px] px-3 py-1.5 rounded-xl text-white text-xs font-bold transition hover:opacity-80 flex items-center justify-center gap-1"
              style={{ background: '#4CAF50' }}
            >
              <Check size={12} />
              Valider
            </button>
          )}

          {/* FAMILLE/ADMIN : Annuler */}
          {(isAvailable || isInProgress) && (isAdminOrCoordinator || isFamily) && (
            <button
              onClick={handleCancel}
              className="flex-1 min-w-[80px] px-3 py-1.5 rounded-xl text-white text-xs font-bold transition hover:opacity-80 flex items-center justify-center gap-1"
              style={{ background: '#EF4444' }}
            >
              <X size={12} />
              Annuler
            </button>
          )}

          {/* Voir détails */}
          {onView && (
            <button
              onClick={handleView}
              className="flex-1 min-w-[80px] px-3 py-1.5 rounded-xl text-xs font-bold border transition hover:bg-gray-50 flex items-center justify-center gap-1"
              style={{ borderColor: colors.primary + '25', color: colors.text }}
            >
              <Eye size={12} />
              Détails
            </button>
          )}
        </div>
      )}
    </div>
  );
});

// ============================================================
// SOUS-COMPOSANTS
// ============================================================

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

const InfoItem = ({ icon, label, value, color }: InfoItemProps) => {
  return (
    <div className="flex items-start gap-2">
      <div className="text-gray-400 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 font-medium">{label}</p>
        <p className="text-xs font-bold truncate" style={{ color }}>
          {value}
        </p>
      </div>
    </div>
  );
};

OrderCard.displayName = 'OrderCard';

export default OrderCard;
