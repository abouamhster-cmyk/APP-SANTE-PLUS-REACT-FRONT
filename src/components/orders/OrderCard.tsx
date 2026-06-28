// 📁 src/components/orders/OrderCard.tsx
 
import { useState } from 'react';
import { Order } from '@/types';
import { getThemeColors } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatCurrency } from '@/utils/helpers';
import { Eye, Package, Truck, CheckCircle, XCircle, Clock, Image, Play, AlertCircle, ShoppingBag } from 'lucide-react';

interface OrderCardProps {
  order: Order;
  onStatusChange?: (status: string) => void;
  onTakeOrder?: () => void;
  onView?: () => void;
  onClick?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

export const OrderCard = ({ 
  order, 
  onStatusChange, 
  onTakeOrder,
  onView,
  onClick,
  showActions = false,
  compact = false 
}: OrderCardProps) => {
  const colors = getThemeColors('senior');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const {
    singular,
    getCategoryLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  // ✅ NOUVEAUX STATUTS
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'creee': return '#9E9E9E';
      case 'en_attente': return '#FF9800';
      case 'disponible': return '#F44336';
      case 'en_cours': return '#2196F3';
      case 'livree': return '#2196F3';
      case 'validee': return '#4CAF50';
      case 'annulee': return '#9E9E9E';
      case 'attente_paiement': return '#8b5cf6';
      default: return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'creee': return '📝 Créée';
      case 'en_attente': return '⏳ En attente';
      case 'disponible': return '🚨 Disponible';
      case 'en_cours': return '🔄 En cours';
      case 'livree': return '📦 Livrée';
      case 'validee': return '✅ Validée';
      case 'annulee': return '❌ Annulée';
      case 'attente_paiement': return '💳 En attente paiement';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'creee': return <Package size={14} />;
      case 'en_attente': return <Clock size={14} />;
      case 'disponible': return <AlertCircle size={14} />;
      case 'en_cours': return <Play size={14} />;
      case 'livree': return <Truck size={14} />;
      case 'validee': return <CheckCircle size={14} />;
      case 'annulee': return <XCircle size={14} />;
      case 'attente_paiement': return <ShoppingBag size={14} />;
      default: return <Package size={14} />;
    }
  };

  const isUrgent = order.status === 'disponible' || order.status === 'en_attente';
  const isPendingPayment = order.status === 'attente_paiement';
  const isAvailable = order.status === 'en_attente' || order.status === 'disponible';
  const isInProgress = order.status === 'en_cours';
  const isDelivered = order.status === 'livree';

  // ✅ Vérifier si l'utilisateur peut agir sur la commande
  const canTake = isAvailable && (isAidant || isAdminOrCoordinator);
  const canAccept = order.status === 'creee' && (isAidant || isAdminOrCoordinator);
  const canDeliver = isInProgress && (isAidant || isAdminOrCoordinator);
  const canCancel = (order.status === 'creee' || order.status === 'en_attente' || order.status === 'en_cours') && isAdminOrCoordinator;

  const handleStatusChange = (status: string) => {
    if (isProcessing || !onStatusChange) return;
    setIsProcessing(true);
    onStatusChange(status);
    setTimeout(() => setIsProcessing(false), 3000);
  };

  const handleTakeOrder = () => {
    if (isProcessing || !onTakeOrder) return;
    setIsProcessing(true);
    onTakeOrder();
    setTimeout(() => setIsProcessing(false), 3000);
  };

  // ✅ Version compacte
  if (compact) {
    return (
      <div 
        className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all border-l-4 cursor-pointer"
        style={{ borderLeftColor: getStatusColor(order.status) }}
        onClick={onClick}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm truncate" style={{ color: colors.text }}>
                {order.description}
              </p>
              <span 
                className="px-1.5 py-0.5 rounded-full text-[9px] font-medium flex items-center gap-0.5"
                style={{ 
                  background: getStatusColor(order.status) + '20',
                  color: getStatusColor(order.status),
                }}
              >
                {getStatusIcon(order.status)}
                {getStatusLabel(order.status)}
              </span>
              {isUrgent && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium flex items-center gap-0.5 bg-red-100 text-red-600 animate-pulse">
                  <AlertCircle size={10} />
                  Urgent
                </span>
              )}
              {order.order_type === 'ponctual' && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-orange-100 text-orange-600">
                  💳 Ponctuelle
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs mt-1" style={{ color: colors.text + '50' }}>
              <span className="flex items-center gap-0.5">
                <Package size={11} />
                {order.type}
              </span>
              <span className="flex items-center gap-0.5">
                <Clock size={11} />
                {formatDate(order.created_at)}
              </span>
              {order.patient && (
                <span className="flex items-center gap-0.5">
                  <User size={11} />
                  {order.patient.first_name} {order.patient.last_name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* ✅ AIDANT : Prendre une commande disponible */}
            {showActions && canTake && (
              <button
                onClick={(e) => { e.stopPropagation(); handleTakeOrder(); }}
                disabled={isProcessing}
                className={`p-1.5 rounded-lg text-white transition hover:opacity-80 ${
                  order.status === 'disponible' ? 'animate-pulse' : ''
                }`}
                style={{ background: order.status === 'disponible' ? '#F44336' : '#FF9800' }}
                title={order.status === 'disponible' ? 'Prendre (Urgent)' : 'Prendre'}
              >
                {order.status === 'disponible' ? <AlertCircle size={14} /> : <Play size={14} />}
              </button>
            )}

            {/* ✅ AIDANT : Accepter une commande créée */}
            {showActions && canAccept && (
              <button
                onClick={(e) => { e.stopPropagation(); handleStatusChange('en_cours'); }}
                disabled={isProcessing}
                className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                style={{ background: '#4CAF50' }}
                title="Accepter"
              >
                <CheckCircle size={14} />
              </button>
            )}

            {/* ✅ AIDANT : Livrer une commande en cours */}
            {showActions && canDeliver && (
              <button
                onClick={(e) => { e.stopPropagation(); handleStatusChange('livree'); }}
                disabled={isProcessing}
                className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                style={{ background: '#2196F3' }}
                title="Livrer"
              >
                <Truck size={14} />
              </button>
            )}

            {onView && (
              <button
                onClick={(e) => { e.stopPropagation(); onView(); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                style={{ color: colors.primary }}
                title="Détails"
              >
                <Eye size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ✅ Indicateur d'urgence */}
        {isUrgent && (
          <div className="mt-2 text-[10px] text-red-600 flex items-center gap-1">
            <AlertCircle size={12} />
            <span>{order.status === 'disponible' ? 'Urgent - Disponible à tous' : 'En attente de prise (30min)'}</span>
          </div>
        )}
      </div>
    );
  }

  // ✅ Version complète
  return (
    <div 
      className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all border-l-4 cursor-pointer hover:border-[var(--color-primary)]/50"
      style={{ borderLeftColor: getStatusColor(order.status) }}
      onClick={onClick}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold truncate" style={{ color: colors.text }}>
            {order.description}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span 
              className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
              style={{ 
                background: getStatusColor(order.status) + '20',
                color: getStatusColor(order.status),
              }}
            >
              {getStatusIcon(order.status)}
              {getStatusLabel(order.status)}
            </span>
            {isUrgent && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 bg-red-100 text-red-600 animate-pulse">
                <AlertCircle size={12} />
                Urgent
              </span>
            )}
            {order.patient && (
              <span className="text-xs" style={{ color: colors.text + '60' }}>
                👤 {order.patient.first_name} {order.patient.last_name}
              </span>
            )}
            {order.order_type === 'ponctual' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                💳 Ponctuelle
              </span>
            )}
            {order.is_paid && order.order_type === 'ponctual' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600">
                ✅ Payée
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* ✅ AIDANT : Prendre une commande disponible */}
          {showActions && canTake && (
            <button
              onClick={(e) => { e.stopPropagation(); handleTakeOrder(); }}
              disabled={isProcessing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition hover:opacity-80 ${
                order.status === 'disponible' ? 'animate-pulse' : ''
              }`}
              style={{ background: order.status === 'disponible' ? '#F44336' : '#FF9800' }}
            >
              {order.status === 'disponible' ? <AlertCircle size={14} /> : <Play size={14} />}
              {order.status === 'disponible' ? 'Prendre (Urgent)' : 'Prendre'}
            </button>
          )}

          {/* ✅ AIDANT : Accepter une commande créée */}
          {showActions && canAccept && (
            <button
              onClick={(e) => { e.stopPropagation(); handleStatusChange('en_cours'); }}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition hover:opacity-80"
              style={{ background: '#4CAF50' }}
            >
              <CheckCircle size={14} />
              Accepter
            </button>
          )}

          {/* ✅ AIDANT : Livrer une commande en cours */}
          {showActions && canDeliver && (
            <button
              onClick={(e) => { e.stopPropagation(); handleStatusChange('livree'); }}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition hover:opacity-80"
              style={{ background: '#2196F3' }}
            >
              <Truck size={14} />
              Livrer
            </button>
          )}

          {/* ✅ ADMIN : Annuler */}
          {showActions && canCancel && (
            <button
              onClick={(e) => { e.stopPropagation(); handleStatusChange('annulee'); }}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition hover:opacity-80"
              style={{ background: '#F44336' }}
            >
              <XCircle size={14} />
              Annuler
            </button>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); if (onView) onView(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80"
            style={{ background: colors.primary + '15', color: colors.primary }}
          >
            <Eye size={14} />
            Détails
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-3">
        <div className="flex items-center gap-1.5 text-xs sm:text-sm" style={{ color: colors.text + '80' }}>
          <span>📦 {order.type}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs sm:text-sm" style={{ color: colors.text + '80' }}>
          <span>📍 {order.address.length > 20 ? order.address.slice(0, 20) + '...' : order.address}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs sm:text-sm" style={{ color: colors.text + '80' }}>
          <span>💰 {formatCurrency(order.estimated_amount || 0)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs sm:text-sm" style={{ color: colors.text + '80' }}>
          <span>📅 {formatDate(order.created_at)}</span>
        </div>
      </div>

      {/* Prescription */}
      {order.prescription_url && (
        <div className="mt-3 flex items-center gap-2">
          <Image size={16} style={{ color: colors.primary }} />
          <span className="text-xs" style={{ color: colors.primary }}>
            📎 Ordonnance jointe
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); window.open(order.prescription_url!, '_blank'); }}
            className="text-xs font-medium hover:underline"
            style={{ color: colors.primary }}
          >
            Voir
          </button>
        </div>
      )}

      {/* ✅ Indicateur d'urgence */}
      {isUrgent && (
        <div className="mt-3 p-2 rounded-lg flex items-center gap-2" style={{ 
          background: order.status === 'disponible' ? '#FEF2F2' : '#FFFBEB',
          border: order.status === 'disponible' ? '1px solid #FECACA' : '1px solid #FDE68A'
        }}>
          <AlertCircle size={16} style={{ color: order.status === 'disponible' ? '#F44336' : '#FF9800' }} />
          <span className="text-xs font-medium" style={{ color: order.status === 'disponible' ? '#F44336' : '#FF9800' }}>
            {order.status === 'disponible' 
              ? '🚨 Commande urgente - Disponible à tous les aidants' 
              : '⏳ En attente de prise - 30 minutes maximum'}
          </span>
        </div>
      )}

      {/* ✅ Barre de progression */}
      {order.status !== 'annulee' && order.status !== 'validee' && order.status !== 'attente_paiement' && (
        <div className="mt-4 flex items-center gap-2">
          {['creee', 'en_cours', 'livree'].map((status, index) => {
            const statusIndex = ['creee', 'en_cours', 'livree'].indexOf(status);
            const currentIndex = ['creee', 'en_cours', 'livree'].indexOf(order.status);
            const isDone = currentIndex >= statusIndex;

            return (
              <div key={status} className="flex items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                    isDone ? 'text-white' : 'bg-gray-200 text-gray-400'
                  }`}
                  style={{ background: isDone ? colors.primary : '#e5e7eb' }}
                >
                  {isDone ? <CheckCircle size={14} /> : index + 1}
                </div>
                {index < 2 && (
                  <div
                    className={`w-6 h-0.5 mx-1 transition-all ${
                      isDone && currentIndex > statusIndex ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
          <span className="text-xs ml-2" style={{ color: colors.text + '40' }}>
            {Math.round((['creee', 'en_cours', 'livree'].indexOf(order.status) + 1) / 3 * 100)}%
          </span>
        </div>
      )}

      {/* ✅ Info de validation automatique */}
      {order.status === 'livree' && (
        <div className="mt-3 text-xs text-blue-600 flex items-center gap-1">
          <Clock size={14} />
          <span>En attente de validation automatique (dans 12h)</span>
        </div>
      )}

      {/* ✅ Info de validation effectuée */}
      {order.status === 'validee' && (
        <div className="mt-3 text-xs text-green-600 flex items-center gap-1">
          <CheckCircle size={14} />
          <span>Validée automatiquement</span>
        </div>
      )}
    </div>
  );
};
