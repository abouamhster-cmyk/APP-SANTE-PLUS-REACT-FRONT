// 📁 frontend/src/components/visits/VisitCard.tsx

import { memo, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Play,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  UserCheck,
  Users,
  Clock as ClockIcon,
  CreditCard,
  Package,
  Phone,
  Home,
  UserPlus,
  Zap,
  Shield,
  Loader2,
} from 'lucide-react';

import { Visit } from '@/types';
import { getThemeColors } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime, cn } from '@/utils/helpers';

// ============================================================
// TYPES
// ============================================================

interface VisitCardProps {
  visit: Visit;
  onClick?: () => void;
  onStart?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onView?: () => void;
  onApprove?: () => void;
  onRefuse?: () => void;
  onConvertToSubscription?: () => void;
  onPonctualPayment?: () => void;
  onShowAssignAidantModal?: () => void;
  onReassign?: () => void;
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
  isFinal?: boolean;
}> = {
  planifiee: {
    label: 'Planifiée',
    color: '#4CAF50',
    bg: '#4CAF5015',
    icon: <Calendar size={12} />,
    progress: 20,
    nextActions: ['Approuver', 'Refuser', 'Annuler'],
  },
  en_attente: {
    label: 'En attente',
    color: '#FF9800',
    bg: '#FF980015',
    icon: <ClockIcon size={12} />,
    progress: 15,
    nextActions: ['Approuver', 'Refuser', 'Annuler'],
  },
  acceptee: {
    label: 'Acceptée',
    color: '#2196F3',
    bg: '#2196F315',
    icon: <CheckCircle size={12} />,
    progress: 40,
    nextActions: ['Démarrer', 'Annuler'],
  },
  en_cours: {
    label: 'En cours',
    color: '#2196F3',
    bg: '#2196F315',
    icon: <Play size={12} />,
    progress: 60,
    nextActions: ['Terminer'],
  },
  terminee: {
    label: 'Terminée',
    color: '#9C27B0',
    bg: '#9C27B015',
    icon: <CheckCircle size={12} />,
    progress: 80,
    nextActions: ['Valider', 'Refuser'],
  },
  validee: {
    label: 'Validée',
    color: '#4CAF50',
    bg: '#4CAF5015',
    icon: <CheckCircle size={12} />,
    progress: 100,
    isFinal: true,
    nextActions: [],
  },
  annulee: {
    label: 'Annulée',
    color: '#F44336',
    bg: '#F4433615',
    icon: <XCircle size={12} />,
    progress: 0,
    isFinal: true,
    nextActions: [],
  },
  refusee: {
    label: 'Refusée',
    color: '#F44336',
    bg: '#F4433615',
    icon: <XCircle size={12} />,
    progress: 0,
    isFinal: true,
    nextActions: ['Réassigner'],
  },
  expire: {
    label: 'Expirée',
    color: '#795548',
    bg: '#79554815',
    icon: <AlertCircle size={12} />,
    progress: 0,
    isFinal: true,
    nextActions: ['Réassigner'],
  },
  replanifiee: {
    label: 'Replanifiée',
    color: '#FF5722',
    bg: '#FF572215',
    icon: <Calendar size={12} />,
    progress: 20,
    nextActions: ['Approuver', 'Refuser'],
  },
  no_show: {
    label: 'Absent',
    color: '#795548',
    bg: '#79554815',
    icon: <XCircle size={12} />,
    progress: 0,
    isFinal: true,
    nextActions: ['Réassigner'],
  },
  // ✅ NOUVEAUX STATUTS
  attente_paiement: {
    label: '💳 En attente paiement',
    color: '#8b5cf6',
    bg: '#8b5cf615',
    icon: <CreditCard size={12} />,
    progress: 5,
    nextActions: ['Payer'],
  },
  brouillon: {
    label: '💳 Paiement requis',
    color: '#F59E0B',
    bg: '#F59E0B15',
    icon: <CreditCard size={12} />,
    progress: 5,
    nextActions: ['Payer', 'Convertir', 'Annuler'],
  },
  en_attente_aidant: {
    label: '🦸 En attente aidant',
    color: '#FF5722',
    bg: '#FF572215',
    icon: <UserPlus size={12} />,
    progress: 10,
    nextActions: ['Assigner', 'Annuler'],
  },
};

const getStatusConfig = (status: string) => {
  return STATUS_CONFIG[status] || STATUS_CONFIG['planifiee'];
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export const VisitCard = memo(({
  visit,
  onClick,
  onStart,
  onComplete,
  onCancel,
  onView,
  onApprove,
  onRefuse,
  onConvertToSubscription,
  onPonctualPayment,
  onShowAssignAidantModal,
  onReassign,
  showActions = false,
  compact = false,
  colors: propColors,
}: VisitCardProps) => {
  const { isFamily, isAidant, isAdminOrCoordinator } = useTerminology();
  const colors = propColors || getThemeColors('senior');

  // ============================================================
  // CALCULS MEMOISÉS
  // ============================================================

  const statusConfig = useMemo(() => getStatusConfig(visit.status), [visit.status]);

  const isPendingApproval = useMemo(() => {
    return visit.status === 'planifiee' || visit.status === 'en_attente';
  }, [visit.status]);

  const isAccepted = useMemo(() => visit.status === 'acceptee', [visit.status]);
  const isInProgress = useMemo(() => visit.status === 'en_cours', [visit.status]);
  const isCompleted = useMemo(() => visit.status === 'terminee', [visit.status]);
  const isExpired = useMemo(() => visit.status === 'expire', [visit.status]);
  const isRefused = useMemo(() => visit.status === 'refusee', [visit.status]);
  const isDraft = useMemo(() => visit.status === 'brouillon', [visit.status]);
  const isWaitingAidant = useMemo(() => visit.status === 'en_attente_aidant', [visit.status]);
  const isPendingPayment = useMemo(() => visit.status === 'attente_paiement', [visit.status]);
  const isUrgent = useMemo(() => visit.is_urgent === true, [visit.is_urgent]);

  const isPonctual = useMemo(() => {
    return visit.metadata?.is_ponctual === true ||
           visit.metadata?.ponctual_mode === true ||
           visit.visit_type === 'ponctuelle';
  }, [visit]);

  const requiresPayment = useMemo(() => {
    return isDraft && visit.metadata?.requires_payment === true;
  }, [isDraft, visit]);

  const canConvertToSubscription = useMemo(() => {
    return isDraft && visit.metadata?.requires_payment === true;
  }, [isDraft, visit]);

  // ✅ Nom du patient
  const patientName = useMemo(() => {
    if (visit.patient) {
      return `${visit.patient.first_name} ${visit.patient.last_name}`;
    }
    return visit.target_name || 'Patient';
  }, [visit]);

  // ✅ Nom de l'aidant
  const aidantName = useMemo(() => {
    if (visit.aidant?.user?.full_name) {
      return visit.aidant.user.full_name;
    }
    if (visit.aidant?.full_name) {
      return visit.aidant.full_name;
    }
    return 'Non assigné';
  }, [visit]);

  // ✅ Adresse
  const address = useMemo(() => {
    return visit.patient?.address || 'Adresse non renseignée';
  }, [visit]);

  // ✅ Catégorie
  const category = useMemo(() => {
    if (visit.patient?.category === 'maman_bebe') return '👶 Maman & Bébé';
    if (visit.patient?.category === 'senior') return '👴 Senior';
    if (visit.target_type === 'personal') return '👤 Personnel';
    return 'Non spécifié';
  }, [visit]);

  // ✅ Durée
  const duration = useMemo(() => {
    return visit.duration_minutes || 60;
  }, [visit]);

  // ✅ Expiration du brouillon
  const draftExpiry = useMemo(() => {
    if (!isDraft || !visit.draft_expires_at) return null;
    const expiry = new Date(visit.draft_expires_at);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    if (diff <= 0) return 'Expiré';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  }, [isDraft, visit]);

  // ✅ Montant du paiement
  const paymentAmount = useMemo(() => {
    if (visit.metadata?.payment_amount) return visit.metadata.payment_amount;
    if (visit.payment_amount) return visit.payment_amount;
    return 7500; // Prix par défaut
  }, [visit]);

  // ✅ Barre de progression
  const progress = useMemo(() => {
    return statusConfig.progress || 0;
  }, [statusConfig]);

  // ✅ Actions disponibles
  const canStart = useMemo(() => {
    return isAccepted && (isAidant || isAdminOrCoordinator);
  }, [isAccepted, isAidant, isAdminOrCoordinator]);

  const canComplete = useMemo(() => {
    return isInProgress && isAidant;
  }, [isInProgress, isAidant]);

  const canCancel = useMemo(() => {
    return (isPendingApproval || isAccepted || isDraft || isWaitingAidant) &&
           (isAdminOrCoordinator || isFamily);
  }, [isPendingApproval, isAccepted, isDraft, isWaitingAidant, isAdminOrCoordinator, isFamily]);

  const canApprove = useMemo(() => {
    return isPendingApproval && isAidant;
  }, [isPendingApproval, isAidant]);

  const canRefuse = useMemo(() => {
    return isPendingApproval && isAidant;
  }, [isPendingApproval, isAidant]);

  const canPay = useMemo(() => {
    return (isDraft || isPendingPayment) && isFamily && requiresPayment;
  }, [isDraft, isPendingPayment, isFamily, requiresPayment]);

  const canAssignAidant = useMemo(() => {
    return isWaitingAidant && isAdminOrCoordinator;
  }, [isWaitingAidant, isAdminOrCoordinator]);

  const canReassign = useMemo(() => {
    return (isExpired || isRefused) && isAdminOrCoordinator;
  }, [isExpired, isRefused, isAdminOrCoordinator]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleClick = useCallback(() => {
    if (onClick) onClick();
  }, [onClick]);

  const handleApprove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onApprove) onApprove();
  }, [onApprove]);

  const handleRefuse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRefuse) onRefuse();
  }, [onRefuse]);

  const handleStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onStart) onStart();
  }, [onStart]);

  const handleComplete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onComplete) onComplete();
  }, [onComplete]);

  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCancel) onCancel();
  }, [onCancel]);

  const handleView = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onView) onView();
  }, [onView]);

  const handleConvertToSubscription = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onConvertToSubscription) onConvertToSubscription();
  }, [onConvertToSubscription]);

  const handlePonctualPayment = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPonctualPayment) onPonctualPayment();
  }, [onPonctualPayment]);

  const handleAssignAidant = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShowAssignAidantModal) onShowAssignAidantModal();
  }, [onShowAssignAidantModal]);

  const handleReassign = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onReassign) onReassign();
  }, [onReassign]);

  // ============================================================
  // RENDU - VERSION COMPACTE
  // ============================================================

  if (compact) {
    return (
      <div
        onClick={handleClick}
        className={cn(
          "bg-white rounded-xl p-3 border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer",
          isUrgent ? "animate-pulse-slow" : "",
          isWaitingAidant ? "border-dashed" : ""
        )}
        style={{
          borderLeftColor: isUrgent ? '#F44336' : statusConfig.color,
          borderColor: isWaitingAidant ? '#FF572240' : 'transparent',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm truncate" style={{ color: colors.text }}>
                {patientName}
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
              {isWaitingAidant && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-orange-100 text-orange-600 flex items-center gap-0.5 shrink-0">
                  <UserPlus size={10} />
                  En attente aidant
                </span>
              )}
              {isDraft && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-yellow-100 text-yellow-600 flex items-center gap-0.5 shrink-0">
                  <CreditCard size={10} />
                  {requiresPayment ? `${paymentAmount.toLocaleString()} FCFA` : 'Brouillon'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs mt-1 text-gray-400 flex-wrap">
              <span className="flex items-center gap-0.5">
                <Calendar size={11} />
                {formatDate(visit.scheduled_date)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Clock size={11} />
                {visit.scheduled_time} ({duration} min)
              </span>
              {visit.aidant && (
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
            {!statusConfig.isFinal && progress > 0 && (
              <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%`, background: statusConfig.color }}
                />
              </div>
            )}

            {/* ✅ Expiration du brouillon */}
            {isDraft && draftExpiry && (
              <p className="text-[9px] text-yellow-600 mt-1 flex items-center gap-0.5">
                <Clock size={10} />
                Expire dans {draftExpiry}
              </p>
            )}
          </div>

          {/* ✅ Actions compactes */}
          <div className="flex items-center gap-1 shrink-0">
            {showActions && (
              <>
                {/* AIDANT : Approuver/Refuser */}
                {canApprove && (
                  <>
                    <button
                      onClick={handleApprove}
                      className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                      style={{ background: '#4CAF50' }}
                      title="Approuver"
                    >
                      <CheckCircle size={12} />
                    </button>
                    <button
                      onClick={handleRefuse}
                      className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                      style={{ background: '#F44336' }}
                      title="Refuser"
                    >
                      <XCircle size={12} />
                    </button>
                  </>
                )}

                {/* AIDANT : Démarrer */}
                {canStart && (
                  <button
                    onClick={handleStart}
                    className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                    style={{ background: '#4CAF50' }}
                    title="Démarrer"
                  >
                    <Play size={12} />
                  </button>
                )}

                {/* AIDANT : Terminer */}
                {canComplete && (
                  <button
                    onClick={handleComplete}
                    className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                    style={{ background: '#2196F3' }}
                    title="Terminer"
                  >
                    <CheckCircle size={12} />
                  </button>
                )}

                {/* FAMILLE : Payer */}
                {canPay && (
                  <button
                    onClick={handlePonctualPayment}
                    className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                    style={{ background: '#8b5cf6' }}
                    title={`Payer ${paymentAmount.toLocaleString()} FCFA`}
                  >
                    <CreditCard size={12} />
                  </button>
                )}

                {/* FAMILLE : Convertir avec abonnement */}
                {canConvertToSubscription && (
                  <button
                    onClick={handleConvertToSubscription}
                    className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                    style={{ background: '#10B981' }}
                    title="Utiliser mon abonnement"
                  >
                    <Package size={12} />
                  </button>
                )}

                {/* ADMIN : Assigner un aidant */}
                {canAssignAidant && (
                  <button
                    onClick={handleAssignAidant}
                    className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                    style={{ background: '#FF5722' }}
                    title="Assigner un aidant"
                  >
                    <UserPlus size={12} />
                  </button>
                )}

                {/* ADMIN : Réassigner */}
                {canReassign && (
                  <button
                    onClick={handleReassign}
                    className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                    style={{ background: '#FF5722' }}
                    title="Réassigner"
                  >
                    <Shield size={12} />
                  </button>
                )}

                {/* ADMIN/FAMILLE : Annuler */}
                {canCancel && (
                  <button
                    onClick={handleCancel}
                    className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                    style={{ background: '#F44336' }}
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
        isUrgent ? "animate-pulse-slow" : "",
        isWaitingAidant ? "border-dashed" : ""
      )}
      style={{
        borderLeftColor: isUrgent ? '#F44336' : statusConfig.color,
        borderColor: isWaitingAidant ? '#FF572240' : 'transparent',
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
              {isPonctual ? <Zap size={16} /> : <Calendar size={16} />}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate" style={{ color: colors.text }}>
                {patientName}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                <span className="flex items-center gap-0.5">
                  <MapPin size={12} />
                  {address}
                </span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <User size={12} />
                  {category}
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
          {isPonctual && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-orange-100 text-orange-600 flex items-center gap-1 shrink-0">
              <Zap size={12} />
              Ponctuelle
            </span>
          )}
          {isDraft && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-600 flex items-center gap-1 shrink-0">
              <CreditCard size={12} />
              {requiresPayment ? `${paymentAmount.toLocaleString()} FCFA` : 'Brouillon'}
            </span>
          )}
          {isWaitingAidant && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-orange-100 text-orange-600 flex items-center gap-1 shrink-0">
              <UserPlus size={12} />
              En attente aidant
            </span>
          )}
        </div>
      </div>

      {/* ============================================================
      INFORMATIONS
      ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
        <InfoItem
          icon={<Calendar size={14} />}
          label="Date"
          value={formatDate(visit.scheduled_date)}
          color={colors.primary}
        />
        <InfoItem
          icon={<Clock size={14} />}
          label="Horaire"
          value={`${visit.scheduled_time} (${duration} min)`}
          color={colors.primary}
        />
        <InfoItem
          icon={<UserCheck size={14} />}
          label="Aidant"
          value={aidantName}
          color={visit.aidant_id ? '#4CAF50' : '#F44336'}
        />
        <InfoItem
          icon={<Clock size={14} />}
          label="Statut"
          value={statusConfig.label}
          color={statusConfig.color}
        />
      </div>

      {/* ============================================================
      BADGES SUPPLÉMENTAIRES
      ============================================================ */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {visit.visit_type === 'permanente' && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-blue-100 text-blue-600 flex items-center gap-0.5">
            <Users size={10} />
            Permanente
          </span>
        )}
        {visit.is_recurring && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-purple-100 text-purple-600 flex items-center gap-0.5">
            <Calendar size={10} />
            Récurrente
          </span>
        )}
        {visit.subscription_id && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-green-100 text-green-600 flex items-center gap-0.5">
            <Package size={10} />
            Avec abonnement
          </span>
        )}
        {visit.metadata?.auto_assigned_aidant && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-blue-100 text-blue-600 flex items-center gap-0.5">
            <Zap size={10} />
            Auto-assigné
          </span>
        )}
      </div>

      {/* ============================================================
      BARRE DE PROGRESSION
      ============================================================ */}
      {!statusConfig.isFinal && progress > 0 && (
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
      EXPIRATION DU BROUILLON
      ============================================================ */}
      {isDraft && draftExpiry && (
        <div className="mt-3 p-2 rounded-lg bg-yellow-50 border border-yellow-200 flex items-center gap-2">
          <Clock size={14} className="text-yellow-600" />
          <p className="text-xs text-yellow-700 font-medium">
            Expire dans {draftExpiry} • {requiresPayment ? `Paiement de ${paymentAmount.toLocaleString()} FCFA requis` : 'Validez votre visite'}
          </p>
        </div>
      )}

      {/* ============================================================
      VISITE EN ATTENTE D'AIDANT
      ============================================================ */}
      {isWaitingAidant && (
        <div className="mt-3 p-2 rounded-lg bg-orange-50 border border-orange-200 flex items-center gap-2">
          <UserPlus size={14} className="text-orange-600" />
          <p className="text-xs text-orange-700 font-medium">
            En attente d'aidant • L'administration a été notifiée
          </p>
        </div>
      )}

      {/* ============================================================
      NOTES
      ============================================================ */}
      {visit.notes && (
        <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
          <p className="text-xs text-gray-600 italic">"{visit.notes}"</p>
        </div>
      )}

      {/* ============================================================
      ACTIONS
      ============================================================ */}
      {showActions && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
          {/* AIDANT : Approuver/Refuser */}
          {canApprove && (
            <>
              <button
                onClick={handleApprove}
                className="flex-1 min-w-[80px] px-3 py-1.5 rounded-xl text-white text-xs font-bold transition hover:opacity-80 flex items-center justify-center gap-1"
                style={{ background: '#4CAF50' }}
              >
                <CheckCircle size={12} />
                Approuver
              </button>
              <button
                onClick={handleRefuse}
                className="flex-1 min-w-[80px] px-3 py-1.5 rounded-xl text-white text-xs font-bold transition hover:opacity-80 flex items-center justify-center gap-1"
                style={{ background: '#F44336' }}
              >
                <XCircle size={12} />
                Refuser
              </button>
            </>
          )}

          {/* AIDANT : Démarrer */}
          {canStart && (
            <button
              onClick={handleStart}
              className="flex-1 min-w-[80px] px-3 py-1.5 rounded-xl text-white text-xs font-bold transition hover:opacity-80 flex items-center justify-center gap-1"
              style={{ background: '#4CAF50' }}
            >
              <Play size={12} />
              Démarrer
            </button>
          )}

          {/* AIDANT : Terminer */}
          {canComplete && (
            <button
              onClick={handleComplete}
              className="flex-1 min-w-[80px] px-3 py-1.5 rounded-xl text-white text-xs font-bold transition hover:opacity-80 flex items-center justify-center gap-1"
              style={{ background: '#2196F3' }}
            >
              <CheckCircle size={12} />
              Terminer
            </button>
          )}

          {/* FAMILLE : Payer */}
          {canPay && (
            <button
              onClick={handlePonctualPayment}
              className="flex-1 min-w-[80px] px-3 py-1.5 rounded-xl text-white text-xs font-bold transition hover:opacity-80 flex items-center justify-center gap-1"
              style={{ background: '#8b5cf6' }}
            >
              <CreditCard size={12} />
              Payer {paymentAmount.toLocaleString()} FCFA
            </button>
          )}

          {/* FAMILLE : Convertir avec abonnement */}
          {canConvertToSubscription && (
            <button
              onClick={handleConvertToSubscription}
              className="flex-1 min-w-[80px] px-3 py-1.5 rounded-xl text-white text-xs font-bold transition hover:opacity-80 flex items-center justify-center gap-1"
              style={{ background: '#10B981' }}
            >
              <Package size={12} />
              Utiliser abonnement
            </button>
          )}

          {/* ADMIN : Assigner un aidant */}
          {canAssignAidant && (
            <button
              onClick={handleAssignAidant}
              className="flex-1 min-w-[80px] px-3 py-1.5 rounded-xl text-white text-xs font-bold transition hover:opacity-80 flex items-center justify-center gap-1"
              style={{ background: '#FF5722' }}
            >
              <UserPlus size={12} />
              Assigner
            </button>
          )}

          {/* ADMIN : Réassigner */}
          {canReassign && (
            <button
              onClick={handleReassign}
              className="flex-1 min-w-[80px] px-3 py-1.5 rounded-xl text-white text-xs font-bold transition hover:opacity-80 flex items-center justify-center gap-1"
              style={{ background: '#FF5722' }}
            >
              <Shield size={12} />
              Réassigner
            </button>
          )}

          {/* ADMIN/FAMILLE : Annuler */}
          {canCancel && (
            <button
              onClick={handleCancel}
              className="flex-1 min-w-[80px] px-3 py-1.5 rounded-xl text-white text-xs font-bold transition hover:opacity-80 flex items-center justify-center gap-1"
              style={{ background: '#F44336' }}
            >
              <XCircle size={12} />
              Annuler
            </button>
          )}

          {/* Voir détails */}
          {onView && (
            <button
              onClick={handleView}
              className="flex-1 min-w-[80px] px-3 py-1.5 rounded-xl text-xs font-bold border transition hover:bg-gray-50 flex items-center justify-center gap-1"
              style={{ borderColor: colors.border, color: colors.text }}
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

VisitCard.displayName = 'VisitCard';

export default VisitCard;
