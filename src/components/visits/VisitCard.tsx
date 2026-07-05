// 📁 src/components/visits/VisitCard.tsx
// VERSION CORRIGÉE - AFFICHAGE CLAIR DES VISITES
// ✅ Ajout du statut "brouillon" avec couleurs et icônes
// ✅ Affichage des informations de paiement
// ✅ Distinction claire entre visites avec/sans abonnement

import { Calendar, Clock, MapPin, User, Play, CheckCircle, XCircle, Eye, AlertCircle, UserCheck, Users, Clock as ClockIcon, CreditCard, UserPlus } from 'lucide-react';
import { Visit } from '@/types';
import { getThemeColors } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { formatDate } from '@/utils/helpers';
import { StatusBadge } from '@/components/ui/StatusBadge';

// ✅ IMPORTER LES HELPERS
import {
  isVisitDraft,
  isVisitPonctual,
  requiresVisitPayment,
  getVisitPaymentAmount,
  getDraftExpiryTime,
  isDraftExpired,
  canConvertDraftToSubscription,
  canPayVisitPonctual,
} from '@/utils/helpers';

// ✅ INTERFACE AVEC TOUTES LES PROPS
interface VisitCardProps {
  visit: Visit;
  onStart?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onView?: () => void;
  onClick?: () => void;
  onApprove?: () => void;
  onRefuse?: () => void;
  onConvertToSubscription?: () => void;  
  onPonctualPayment?: () => void;        
  onShowAssignAidantModal?: (visit: Visit) => void;
  showActions?: boolean;
  compact?: boolean;
}

export const VisitCard = ({ 
  visit, 
  onStart, 
  onComplete, 
  onCancel, 
  onView,
  onClick,
  onApprove,
  onRefuse,
  onConvertToSubscription,  
  onPonctualPayment,
  onShowAssignAidantModal,         
  showActions = false,
  compact = false 
}: VisitCardProps) => {
  const colors = getThemeColors('senior');
  const { isFamily, isAidant, isAdminOrCoordinator } = useTerminology();
  const { hasActiveSubscription, remainingVisits } = useSubscriptionGuard();

  // ✅ FONCTION POUR OBTENIR LE NOM DE L'AIDANT
  const getAidantName = () => {
    if (visit.aidant?.user?.full_name) {
      return visit.aidant.user.full_name;
    }
    return 'Non assigné';
  };

  // ✅ UTILISATION DES HELPERS
  const isDraft = isVisitDraft(visit);
  const isPonctual = isVisitPonctual(visit);
  const requiresPayment = requiresVisitPayment(visit);
  const paymentAmount = getVisitPaymentAmount(visit);
  const draftExpiry = getDraftExpiryTime(visit);
  const isExpiredDraft = isDraftExpired(visit);
  const canConvert = canConvertDraftToSubscription(visit, hasActiveSubscription, remainingVisits);
  const canPay = canPayVisitPonctual(visit);

  // ✅ Déterminer si l'aidant peut être assigné
  const canAssignAidant = (isAdminOrCoordinator || isAidant) && 
    (visit.status === 'expire' || visit.status === 'refusee' || 
     ((visit.status === 'planifiee' || visit.status === 'en_attente') && !visit.aidant_id));

  // ✅ NOUVEAUX STATUTS AVEC BROUILLON
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planifiee': return '#4CAF50';
      case 'en_attente': return '#FF9800';
      case 'acceptee': return '#2196F3';
      case 'en_cours': return '#2196F3';
      case 'terminee': return '#9C27B0';
      case 'validee': return '#4CAF50';
      case 'annulee': return '#F44336';
      case 'refusee': return '#F44336';
      case 'expire': return '#795548';
      case 'replanifiee': return '#FF5722';
      case 'no_show': return '#795548';
      case 'brouillon': return '#F59E0B'; // ✅ Couleur orange
      default: return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planifiee': return 'Planifiée';
      case 'en_attente': return 'En attente';
      case 'acceptee': return 'Acceptée';
      case 'en_cours': return 'En cours';
      case 'terminee': return 'Terminée';
      case 'validee': return 'Validée';
      case 'annulee': return 'Annulée';
      case 'refusee': return 'Refusée';
      case 'expire': return 'Expirée';
      case 'replanifiee': return 'Replanifiée';
      case 'no_show': return 'Absent';
      case 'brouillon': return '💳 En attente paiement'; // ✅ Libellé clair
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planifiee': return <Calendar size={12} />;
      case 'en_attente': return <ClockIcon size={12} />;
      case 'acceptee': return <CheckCircle size={12} />;
      case 'en_cours': return <Play size={12} />;
      case 'terminee': return <CheckCircle size={12} />;
      case 'validee': return <CheckCircle size={12} />;
      case 'annulee': return <XCircle size={12} />;
      case 'refusee': return <XCircle size={12} />;
      case 'expire': return <AlertCircle size={12} />;
      case 'brouillon': return <CreditCard size={12} />; // ✅ Icône crédit
      default: return <ClockIcon size={12} />;
    }
  };

  const isPendingApproval = visit.status === 'planifiee' || visit.status === 'en_attente';
  const isAccepted = visit.status === 'acceptee';
  const isInProgress = visit.status === 'en_cours';
  const isExpired = visit.status === 'expire';
  const isRefused = visit.status === 'refusee';
  const isCompleted = visit.status === 'terminee' || visit.status === 'validee';

  // ✅ Version compacte
  if (compact) {
    return (
      <div 
        className={`bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all border-l-4 cursor-pointer ${
          isDraft ? 'border-yellow-400' : ''
        }`}
        style={{ borderLeftColor: getStatusColor(visit.status) }}
        onClick={onClick}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm truncate" style={{ color: colors.text }}>
                {visit.patient?.first_name} {visit.patient?.last_name}
              </p>
              <span 
                className="px-1.5 py-0.5 rounded-full text-[9px] font-medium flex items-center gap-0.5"
                style={{ 
                  background: getStatusColor(visit.status) + '20',
                  color: getStatusColor(visit.status),
                }}
              >
                {getStatusIcon(visit.status)}
                {getStatusLabel(visit.status)}
              </span>
              {visit.is_urgent && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium flex items-center gap-0.5" style={{ background: '#F44336' + '15', color: '#F44336' }}>
                  <AlertCircle size={10} />
                  Urgent
                </span>
              )}
              {isExpired && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium flex items-center gap-0.5 bg-red-100 text-red-600">
                  <AlertCircle size={10} />
                  Expirée
                </span>
              )}
              {isDraft && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium flex items-center gap-0.5 bg-yellow-100 text-yellow-700 animate-pulse">
                  <CreditCard size={10} />
                  Paiement requis
                </span>
              )}
              {isExpiredDraft && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium flex items-center gap-0.5 bg-red-100 text-red-600">
                  <AlertCircle size={10} />
                  Expiré
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs mt-1" style={{ color: colors.text + '50' }}>
              <span className="flex items-center gap-0.5">
                <Calendar size={11} />
                {formatDate(visit.scheduled_date)}
              </span>
              <span className="flex items-center gap-0.5">
                <Clock size={11} />
                {visit.scheduled_time}
              </span>
              {visit.aidant && (
                <span className="flex items-center gap-0.5">
                  <UserCheck size={11} />
                  {getAidantName()}
                </span>
              )}
            </div>
            {/* ✅ AFFICHAGE MONTANT ET EXPIRATION POUR BROUILLON */}
            {isDraft && (
              <div className="flex items-center gap-2 text-[10px] mt-0.5" style={{ color: colors.text + '50' }}>
                <span className="text-yellow-600">💳 {paymentAmount.toLocaleString()} FCFA</span>
                {draftExpiry && (
                  <span className={`${isExpiredDraft ? 'text-red-500' : 'text-gray-400'}`}>
                    • Expire dans {draftExpiry}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* ✅ BOUTON BROUILLON : Valider avec abonnement OU Payer */}
            {showActions && isDraft && onConvertToSubscription && onPonctualPayment && (
              canConvert ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onConvertToSubscription(); }}
                  className="px-2 py-1.5 rounded-lg text-white text-xs font-medium flex items-center gap-1 transition hover:opacity-80"
                  style={{ background: '#10B981' }}
                  title={`Valider avec l'abonnement (${remainingVisits} restantes)`}
                >
                  <CheckCircle size={12} />
                  Valider
                </button>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); onPonctualPayment(); }}
                  className="px-2 py-1.5 rounded-lg text-white text-xs font-medium flex items-center gap-1 transition hover:opacity-80 animate-pulse"
                  style={{ background: '#F59E0B' }}
                  title={`Payer ${paymentAmount} FCFA`}
                >
                  <CreditCard size={12} />
                  Payer
                </button>
              )
            )}

            {/* ✅ AIDANT : Approuver/Refuser */}
            {showActions && isPendingApproval && isAidant && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onApprove?.(); }}
                  className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                  style={{ background: '#4CAF50' }}
                  title="Approuver"
                >
                  <CheckCircle size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onRefuse?.(); }}
                  className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                  style={{ background: '#F44336' }}
                  title="Refuser"
                >
                  <XCircle size={14} />
                </button>
              </>
            )}

            {/* ✅ AIDANT : Démarrer une visite acceptée */}
            {showActions && isAccepted && isAidant && (
              <button
                onClick={(e) => { e.stopPropagation(); onStart?.(); }}
                className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                style={{ background: '#4CAF50' }}
                title="Démarrer"
              >
                <Play size={14} />
              </button>
            )}

            {/* ✅ AIDANT : Terminer une visite en cours */}
            {showActions && isInProgress && isAidant && (
              <button
                onClick={(e) => { e.stopPropagation(); onComplete?.(); }}
                className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                style={{ background: '#2196F3' }}
                title="Terminer"
              >
                <CheckCircle size={14} />
              </button>
            )}

            {/* ✅ ADMIN : Assigner un aidant */}
            {showActions && canAssignAidant && onShowAssignAidantModal && (
              <button
                onClick={(e) => { e.stopPropagation(); onShowAssignAidantModal(visit); }}
                className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                style={{ background: '#8B5CF6' }}
                title="Assigner un aidant"
              >
                <UserPlus size={14} />
              </button>
            )}

            {/* ✅ ADMIN/FAMILLE : Annuler */}
            {showActions && (isPendingApproval || isAccepted || isDraft) && (isAdminOrCoordinator || isFamily) && (
              <button
                onClick={(e) => { e.stopPropagation(); onCancel?.(); }}
                className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                style={{ background: '#F44336' }}
                title="Annuler"
              >
                <XCircle size={14} />
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

        {/* ✅ Info visites restantes */}
        {isDraft && canConvert && (
          <div className="mt-1.5 text-[10px] text-green-600 flex items-center gap-1">
            <CheckCircle size={10} />
            <span>{remainingVisits} visite(s) restante(s) sur votre abonnement</span>
          </div>
        )}

        {/* ✅ Info expiration du brouillon */}
        {isDraft && isExpiredDraft && (
          <div className="mt-1.5 text-[10px] text-red-500 flex items-center gap-1">
            <AlertCircle size={10} />
            <span>Brouillon expiré - Veuillez recréer la visite</span>
          </div>
        )}
      </div>
    );
  }

  // ✅ Version complète
  return (
    <div 
      className={`bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border-l-4 cursor-pointer ${
        isDraft ? 'border-yellow-400' : ''
      }`}
      style={{ borderLeftColor: getStatusColor(visit.status) }}
      onClick={onClick}
    >
      {/* En-tête */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold truncate" style={{ color: colors.text }}>
              {visit.patient?.first_name} {visit.patient?.last_name}
            </h3>
            <span 
              className="px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1"
              style={{ 
                background: getStatusColor(visit.status) + '20',
                color: getStatusColor(visit.status),
              }}
            >
              {getStatusIcon(visit.status)}
              {getStatusLabel(visit.status)}
            </span>
            {visit.is_urgent && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: '#F44336' + '15', color: '#F44336' }}>
                <AlertCircle size={12} />
                Urgent
              </span>
            )}
            {isExpired && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-600">
                <AlertCircle size={12} />
                Expirée
              </span>
            )}
            {isDraft && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-700 animate-pulse">
                <CreditCard size={12} />
                En attente paiement
              </span>
            )}
            {isExpiredDraft && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-600">
                <AlertCircle size={12} />
                Expiré
              </span>
            )}
          </div>
          {visit.aidant && (
            <div className="flex items-center gap-1.5 mt-1 text-xs" style={{ color: colors.text + '50' }}>
              <UserCheck size={13} />
              <span>{getAidantName()}</span>
            </div>
          )}
          {isDraft && (
            <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: colors.text + '50' }}>
              <CreditCard size={12} />
              <span>Montant: {paymentAmount.toLocaleString()} FCFA</span>
              {draftExpiry && (
                <span className={`${isExpiredDraft ? 'text-red-500' : 'text-gray-400'}`}>
                  • Expire dans {draftExpiry}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {/* ✅ BOUTON BROUILLON : Valider avec abonnement OU Payer */}
          {showActions && isDraft && onConvertToSubscription && onPonctualPayment && (
            canConvert ? (
              <button
                onClick={(e) => { e.stopPropagation(); onConvertToSubscription(); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold transition hover:opacity-90"
                style={{ background: '#10B981' }}
              >
                <CheckCircle size={16} />
                ✅ Valider avec l'abonnement
                <span className="text-xs opacity-75 ml-1">
                  ({remainingVisits} restantes)
                </span>
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onPonctualPayment(); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold transition hover:opacity-90 animate-pulse"
                style={{ background: '#F59E0B' }}
              >
                <CreditCard size={16} />
                💳 Payer {paymentAmount.toLocaleString()} FCFA
              </button>
            )
          )}

          <div className="flex items-center gap-1.5">
            {/* ✅ AIDANT : Approuver/Refuser */}
            {showActions && isPendingApproval && isAidant && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onApprove?.(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition hover:opacity-80"
                  style={{ background: '#4CAF50' }}
                >
                  <CheckCircle size={14} />
                  Approuver
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onRefuse?.(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition hover:opacity-80"
                  style={{ background: '#F44336' }}
                >
                  <XCircle size={14} />
                  Refuser
                </button>
              </>
            )}

            {/* ✅ AIDANT : Démarrer une visite acceptée */}
            {showActions && isAccepted && isAidant && (
              <button
                onClick={(e) => { e.stopPropagation(); onStart?.(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition hover:opacity-80"
                style={{ background: '#4CAF50' }}
              >
                <Play size={14} />
                Démarrer
              </button>
            )}

            {/* ✅ AIDANT : Terminer une visite en cours */}
            {showActions && isInProgress && isAidant && (
              <button
                onClick={(e) => { e.stopPropagation(); onComplete?.(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition hover:opacity-80"
                style={{ background: '#2196F3' }}
              >
                <CheckCircle size={14} />
                Terminer
              </button>
            )}

            {/* ✅ ADMIN : Assigner un aidant */}
            {showActions && canAssignAidant && onShowAssignAidantModal && (
              <button
                onClick={(e) => { e.stopPropagation(); onShowAssignAidantModal(visit); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition hover:opacity-80"
                style={{ background: '#8B5CF6' }}
              >
                <UserPlus size={14} />
                Assigner
              </button>
            )}

            {/* ✅ ADMIN/FAMILLE : Annuler */}
            {showActions && (isPendingApproval || isAccepted || isDraft) && (isAdminOrCoordinator || isFamily) && (
              <button
                onClick={(e) => { e.stopPropagation(); onCancel?.(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition hover:opacity-80"
                style={{ background: '#F44336' }}
              >
                <XCircle size={14} />
                Annuler
              </button>
            )}

            {onView && (
              <button
                onClick={(e) => { e.stopPropagation(); onView(); }}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
                style={{ color: colors.primary }}
              >
                <Eye size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Informations */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div className="flex items-center gap-2 text-sm" style={{ color: colors.text + '70' }}>
          <Calendar size={15} className="opacity-60" />
          <span>{formatDate(visit.scheduled_date)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: colors.text + '70' }}>
          <Clock size={15} className="opacity-60" />
          <span>{visit.scheduled_time}</span>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: colors.text + '70' }}>
          <MapPin size={15} className="opacity-60" />
          <span className="truncate">{visit.patient?.address}</span>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: colors.text + '70' }}>
          <User size={15} className="opacity-60" />
          <span className="truncate">{getAidantName()}</span>
        </div>
      </div>

      {/* Notes */}
      {visit.notes && (
        <div className="mt-3 p-3 rounded-xl" style={{ background: colors.primary + '05' }}>
          <p className="text-sm" style={{ color: colors.text + '70' }}>{visit.notes}</p>
        </div>
      )}

      {/* Badge de type */}
      {visit.visit_type && visit.visit_type !== 'ponctuelle' && (
        <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: colors.primary }}>
          {visit.visit_type === 'permanente' ? (
            <>
              <Users size={13} />
              <span>Visite permanente</span>
            </>
          ) : visit.visit_type === 'intervalle' ? (
            <>
              <Calendar size={13} />
              <span>Visite sur intervalle</span>
            </>
          ) : null}
        </div>
      )}

      {/* ✅ Badge d'expiration */}
      {isExpired && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2 rounded-lg">
          <AlertCircle size={14} />
          <span>Expirée - Réassignation nécessaire</span>
        </div>
      )}

      {/* ✅ Info visites restantes pour brouillon */}
      {isDraft && canConvert && (
        <div className="mt-3 flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded-lg">
          <CheckCircle size={14} />
          <span>✅ {remainingVisits} visite(s) restante(s) sur votre abonnement</span>
        </div>
      )}

      {/* ✅ Info expiration du brouillon */}
      {isDraft && isExpiredDraft && (
        <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg">
          <AlertCircle size={14} />
          <span>⚠️ Brouillon expiré - Veuillez recréer la visite</span>
        </div>
      )}

      {/* ✅ Info paiement requis (si brouillon mais pas encore expiré) */}
      {isDraft && !isExpiredDraft && !canConvert && (
        <div className="mt-3 flex items-center gap-2 text-xs text-yellow-600 bg-yellow-50 p-2 rounded-lg">
          <CreditCard size={14} />
          <span>💳 Paiement requis - {paymentAmount.toLocaleString()} FCFA</span>
          {draftExpiry && (
            <span className="text-yellow-500">• Expire dans {draftExpiry}</span>
          )}
        </div>
      )}
    </div>
  );
};
