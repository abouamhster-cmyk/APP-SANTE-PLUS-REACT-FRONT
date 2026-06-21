// 📁 src/components/orders/OrderCard.tsx
// 📌 Carte d'une commande - Cycle de vie simplifié

import { useState } from 'react';
import { Order } from '@/types';
import { getThemeColors } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatCurrency } from '@/utils/helpers';
import { Eye, Package, Truck, CheckCircle, XCircle, Clock, Image, Play } from 'lucide-react';

interface OrderCardProps {
  order: Order;
  onStatusChange?: (status: string) => void;
  onView?: () => void;
  onClick?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

export const OrderCard = ({ 
  order, 
  onStatusChange, 
  onView,
  onClick,
  showActions = false,
  compact = false 
}: OrderCardProps) => {
  const colors = getThemeColors('senior');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // ✅ Jargon dynamique selon le rôle
  const {
    singular,
    getCategoryLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  // ✅ Cycle de vie simplifié - Statuts
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'creee': return '#9E9E9E';
      case 'en_cours': return '#FF9800';
      case 'livree': return '#2196F3';
      case 'validee': return '#4CAF50';
      case 'annulee': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'creee': return '📝 Créée';
      case 'en_cours': return '🔄 En cours';
      case 'livree': return '📦 Livrée';
      case 'validee': return '✅ Validée';
      case 'annulee': return '❌ Annulée';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'creee': return <Package size={14} />;
      case 'en_cours': return <Play size={14} />;
      case 'livree': return <Truck size={14} />;
      case 'validee': return <CheckCircle size={14} />;
      case 'annulee': return <XCircle size={14} />;
      default: return <Package size={14} />;
    }
  };

  // ✅ Libellé dynamique pour le patient
  const getPatientLabel = () => {
    if (isFamily) return 'Proche';
    if (isAidant) return 'Personne accompagnée';
    if (isAdminOrCoordinator) return 'Bénéficiaire';
    return 'Patient';
  };

  // ✅ Vérifier si l'utilisateur peut agir sur la commande
  const canAccept = order.status === 'creee' && (isAidant || isAdminOrCoordinator);
  const canDeliver = order.status === 'en_cours' && (isAidant || isAdminOrCoordinator);
  const canCancel = (order.status === 'creee' || order.status === 'en_cours') && isAdminOrCoordinator;

  // ✅ Gestion du changement de statut avec protection
  const handleStatusChange = (status: string) => {
    if (isProcessing || !onStatusChange) return;
    setIsProcessing(true);
    onStatusChange(status);
    // Réactiver après un délai pour éviter les appels en boucle
    setTimeout(() => setIsProcessing(false), 3000);
  };

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
              className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center space-x-1"
              style={{ 
                background: getStatusColor(order.status) + '20',
                color: getStatusColor(order.status),
              }}
            >
              {getStatusIcon(order.status)}
              <span>{getStatusLabel(order.status)}</span>
            </span>
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
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              if (onView) onView(); 
            }}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition hover:opacity-80"
            style={{ background: colors.primary + '15', color: colors.primary }}
          >
            <Eye size={14} />
            <span>Détails</span>
          </button>
          
          {/* ✅ Actions simplifiées avec protection contre les appels en boucle */}
          {showActions && onStatusChange && (
            <>
              {/* 📝 Créée → Accepter (passe en cours) */}
              {canAccept && (
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleStatusChange('en_cours'); 
                  }}
                  disabled={isProcessing}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-white text-xs sm:text-sm font-medium transition hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#4CAF50' }}
                >
                  <Play size={14} />
                  <span>{isProcessing ? '...' : 'Accepter'}</span>
                </button>
              )}
              
              {/* 🔄 En cours → Livrer (passe en livrée) */}
              {canDeliver && (
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleStatusChange('livree'); 
                  }}
                  disabled={isProcessing}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-white text-xs sm:text-sm font-medium transition hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#2196F3' }}
                >
                  <Truck size={14} />
                  <span>{isProcessing ? '...' : 'Livrer'}</span>
                </button>
              )}
              
              {/* ❌ Annuler (pour admin/coord) */}
              {canCancel && (
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleStatusChange('annulee'); 
                  }}
                  disabled={isProcessing}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-white text-xs sm:text-sm font-medium transition hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#F44336' }}
                >
                  <XCircle size={14} />
                  <span>{isProcessing ? '...' : 'Annuler'}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-3">
        <div className="flex items-center space-x-1.5 text-xs sm:text-sm" style={{ color: colors.text + '80' }}>
          <span>📦 {order.type}</span>
        </div>
        <div className="flex items-center space-x-1.5 text-xs sm:text-sm" style={{ color: colors.text + '80' }}>
          <span>📍 {order.address.length > 20 ? order.address.slice(0, 20) + '...' : order.address}</span>
        </div>
        <div className="flex items-center space-x-1.5 text-xs sm:text-sm" style={{ color: colors.text + '80' }}>
          <span>💰 {formatCurrency(order.estimated_amount || 0)}</span>
        </div>
        <div className="flex items-center space-x-1.5 text-xs sm:text-sm" style={{ color: colors.text + '80' }}>
          <span>📅 {formatDate(order.created_at)}</span>
        </div>
      </div>

      {/* Prescription / Photo */}
      {order.prescription_url && (
        <div className="mt-3 flex items-center space-x-2">
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

      {/* ✅ Barre de progression simplifiée (3 étapes) */}
      {order.status !== 'annulee' && order.status !== 'validee' && (
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