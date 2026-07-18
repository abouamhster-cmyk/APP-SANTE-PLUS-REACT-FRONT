// 📁 src/components/orders/OrderCard.tsx
// ✅ ORDER CARD : VERSION COMPLÈTE AVEC TOUS LES BADGES ET LOGIQUES D'AFFICHAGE

import { memo, useMemo, useCallback } from 'react';
import { 
  Package, MapPin, Clock, User, CheckCircle, XCircle, Eye, AlertCircle, 
  ShoppingBag, Truck, CreditCard, UserCheck, Calendar, DollarSign, Play, 
  Users, UserPlus, Info 
} from 'lucide-react';
import { Order } from '@/types';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatCurrency, cn } from '@/utils/helpers';

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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode; progress: number }> = {
  creee: { label: 'Créée', color: '#9E9E9E', bg: '#9E9E9E15', icon: <Package size={10} />, progress: 0 },
  en_attente: { label: 'En attente', color: '#F59E0B', bg: '#F59E0B15', icon: <Clock size={10} />, progress: 10 },
  disponible: { label: '🚨 Disponible', color: '#EF4444', bg: '#EF444415', icon: <AlertCircle size={10} />, progress: 15 },
  en_cours: { label: 'En cours', color: '#3B82F6', bg: '#3B82F615', icon: <Play size={10} />, progress: 40 },
  livree: { label: 'Livrée (En attente)', color: '#3B82F6', bg: '#3B82F615', icon: <Truck size={10} />, progress: 70 },
  validee: { label: 'Validée', color: '#4CAF50', bg: '#4CAF5015', icon: <CheckCircle size={10} />, progress: 100 },
  annulee: { label: 'Annulée', color: '#9E9E9E', bg: '#9E9E9E15', icon: <XCircle size={10} />, progress: 0 },
  attente_paiement: { label: '💳 Paiement requis', color: '#8B5CF6', bg: '#8B5CF615', icon: <CreditCard size={10} />, progress: 5 },
};

const getStatusConfig = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG['creee'];

export const OrderCard = memo(({
  order: orderProp,
  onClick,
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

  const order = orderProp as ExtendedOrder;
  const statusConfig = useMemo(() => getStatusConfig(order.status), [order.status]);

  const isPonctual = useMemo(() => order.order_type === 'ponctual' || order.is_ponctual === true || order.metadata?.ponctual_mode === true, [order]);
  const isUrgent = useMemo(() => order.status === 'disponible', [order]);
  const isInProgress = useMemo(() => order.status === 'en_cours', [order.status]);
  const isAvailable = useMemo(() => ['creee', 'en_attente', 'disponible'].includes(order.status), [order.status]);
  const isCompleted = useMemo(() => ['validee', 'annulee'].includes(order.status), [order.status]);
  const isPendingPayment = useMemo(() => order.status === 'attente_paiement', [order.status]);

  const patientName = useMemo(() => {
    if (order.patient) return `${order.patient.first_name} ${order.patient.last_name}`;
    if (order.family?.full_name) return order.family.full_name;
    return order.target_name || 'Client';
  }, [order]);

  const aidantName = useMemo(() => (order.aidant?.user?.full_name || 'Non assigné'), [order]);
  const amount = useMemo(() => order.estimated_amount || order.final_amount || 0, [order]);
  const itemsCount = useMemo(() => order.items?.length || 0, [order]);
  const progress = useMemo(() => statusConfig.progress || 0, [statusConfig]);

  const handleAction = useCallback((e: React.MouseEvent, action: (() => void) | undefined) => {
    e.stopPropagation();
    if (action) action();
  }, []);

  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white rounded-3xl p-5 shadow-sm border transition-all cursor-pointer hover:shadow-md",
        isUrgent ? "border-l-4 border-l-red-500" : ""
      )}
      style={{ borderColor: colors.primary + '15' }}
    >
      <div className="flex justify-between items-start gap-4">
        {/* En-tête avec Icone */}
        <div className="flex items-start gap-3 min-w-0">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" 
            style={{ background: statusConfig.bg, color: statusConfig.color }}
          >
            {isPonctual ? <ShoppingBag size={20} /> : <Package size={20} />}
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-sm truncate" style={{ color: colors.text }}>
              {order.description || 'Commande'}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: colors.textLight }}>
              {patientName} • {formatCurrency(amount)}
            </p>
          </div>
        </div>

        {/* Badges de statut */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 uppercase tracking-wider" style={{ background: statusConfig.bg, color: statusConfig.color }}>
            {statusConfig.icon} {statusConfig.label}
          </span>
          {isUrgent && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-600">Urgent</span>}
        </div>
      </div>

      {/* Détails supplémentaires */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs" style={{ color: colors.textLight }}>
        <span className="flex items-center gap-1.5"><MapPin size={14} /> {order.address || 'Adresse non spécifiée'}</span>
        <span className="flex items-center gap-1.5"><UserCheck size={14} /> {aidantName}</span>
      </div>

      {/* Barre de progression */}
      {!isCompleted && (
        <div className="mt-4 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full transition-all duration-500" style={{ width: `${Math.min(progress, 100)}%`, background: statusConfig.color }} />
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t" style={{ borderColor: colors.primary + '15' }}>
          {isAvailable && isAidant && (
            <button onClick={(e) => handleAction(e, onTakeOrder)} className="flex-1 py-2 rounded-xl text-white font-bold text-xs" style={{ background: isUrgent ? '#EF4444' : '#F59E0B' }}>
              {isUrgent ? 'Prendre (Urgent)' : 'Prendre'}
            </button>
          )}
          {isInProgress && isAidant && (
            <button onClick={(e) => handleAction(e, onDeliver)} className="flex-1 py-2 rounded-xl text-white font-bold text-xs bg-blue-500">
              Livrer
            </button>
          )}
          {isAdminOrCoordinator && isAvailable && onShowAssignAidantModal && (
            <button onClick={(e) => handleAction(e, onShowAssignAidantModal)} className="flex-1 py-2 rounded-xl text-white font-bold text-xs bg-orange-600">
              Assigner
            </button>
          )}
          {(isAdminOrCoordinator || isFamily) && !isCompleted && (
            <button onClick={(e) => handleAction(e, onCancel)} className="py-2 px-4 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-100">
              Annuler
            </button>
          )}
          <button onClick={(e) => handleAction(e, onView)} className="p-2 rounded-xl border border-gray-100 hover:bg-gray-50 text-gray-400">
            <Eye size={16} />
          </button>
        </div>
      )}
    </div>
  );
});

OrderCard.displayName = 'OrderCard';
