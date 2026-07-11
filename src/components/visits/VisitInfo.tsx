// 📁 src/components/visits/VisitInfo.tsx
// ✅ COMPOSANT DE SÉCURITÉ GESTION DE L'ADRESSE SPÉCIFIQUE DE LA VISITE HIERARCHISÉE

import { Visit } from '@/types';
import { formatDate, formatTime } from '@/utils/helpers';

interface VisitInfoProps {
  visit: Visit;
}

/**
 * Retourne le nom à afficher pour une visite
 */
export const getVisitDisplayName = (visit: Visit): string => {
  if (!visit) return 'Visite';
  if (visit.patient) {
    return `${visit.patient.first_name} ${visit.patient.last_name}`;
  }
  if (visit.target_name) {
    return visit.target_name;
  }
  if (visit.target_type === 'personal') {
    return 'Personnel';
  }
  return 'Visite';
};

/**
 * Retourne l'adresse à afficher pour une visite
 * ✅ CORRECTIF DE PRIORITÉ : Priorise l'adresse de la visite 'visit.address' sur l'adresse par défaut du proche
 */
export const getVisitDisplayAddress = (visit: Visit): string => {
  if (!visit) return 'Adresse non renseignée';
  if (visit.address && visit.address.trim() !== '') {
    return visit.address;
  }
  if (visit.patient?.address) {
    return visit.patient.address;
  }
  if (visit.target_type === 'personal') {
    return 'Adresse personnelle';
  }
  return 'Adresse non renseignée';
};

/**
 * Retourne la catégorie à afficher pour une visite
 */
export const getVisitDisplayCategory = (visit: Visit): string => {
  if (!visit) return 'Non spécifié';
  if (visit.patient?.category === 'maman_bebe') {
    return '👶 Maman & Bébé';
  }
  if (visit.patient?.category === 'senior') {
    return '👴 Senior';
  }
  if (visit.target_type === 'personal') {
    return '👤 Personnel';
  }
  return 'Non spécifié';
};

/**
 * Retourne le type de destinataire
 */
export const getVisitDisplayType = (visit: Visit): string => {
  if (!visit) return 'Visite';
  if (visit.patient) {
    return 'Proche';
  }
  if (visit.target_type === 'personal') {
    return '👤 Personnel';
  }
  return 'Visite';
};

/**
 * Retourne le nom de l'aidant ou 'Non assigné'
 */
export const getVisitDisplayAidant = (visit: Visit): string => {
  if (!visit) return 'Non assigné';
  if (visit.aidant?.user?.full_name) {
    return visit.aidant.user.full_name;
  }
  return 'Non assigné';
};

/**
 * Retourne la note de l'aidant ou 'N/A'
 */
export const getVisitDisplayRating = (visit: Visit): string => {
  if (!visit) return 'N/A';
  if (visit.aidant?.rating !== undefined && visit.aidant?.rating !== null) {
    return `${visit.aidant.rating} ⭐`;
  }
  return 'N/A';
};

/**
 * Retourne le nombre de missions de l'aidant ou 'N/A'
 */
export const getVisitDisplayMissions = (visit: Visit): string => {
  if (!visit) return 'N/A';
  if (visit.aidant?.total_missions !== undefined && visit.aidant?.total_missions !== null) {
    return `${visit.aidant.total_missions} missions`;
  }
  return 'N/A';
};

/**
 * Retourne les informations complètes de l'aidant
 */
export const getVisitAidantInfo = (visit: Visit) => {
  if (!visit) {
    return {
      name: 'Non assigné',
      rating: 'N/A',
      missions: 'N/A',
      specialties: [],
    };
  }
  
  return {
    name: getVisitDisplayAidant(visit),
    rating: getVisitDisplayRating(visit),
    missions: getVisitDisplayMissions(visit),
    specialties: visit.aidant?.specialties || [],
  };
};

/**
 * Retourne le statut de la visite avec son libellé et sa couleur
 */
export const getVisitStatusInfo = (status: string) => {
  const statusMap: Record<string, { label: string; color: string; icon: string }> = {
    planifiee: { label: 'Planifiée', color: '#4CAF50', icon: '📅' },
    en_attente: { label: 'En attente', color: '#FF9800', icon: '⏳' },
    acceptee: { label: 'Acceptée', color: '#2196F3', icon: '✅' },
    en_cours: { label: 'En cours', color: '#2196F3', icon: '🔄' },
    terminee: { label: 'Terminée', color: '#9C27B0', icon: '📝' },
    validee: { label: 'Validée', color: '#4CAF50', icon: '✔️' },
    annulee: { label: 'Annulée', color: '#F44336', icon: '❌' },
    refusee: { label: 'Refusée', color: '#F44336', icon: '🚫' },
    expire: { label: 'Expirée', color: '#795548', icon: '⏰' },
    replanifiee: { label: 'Replanifiée', color: '#FF5722', icon: '🔄' },
    no_show: { label: 'Absent', color: '#795548', icon: '🚫' },
    brouillon: { label: 'En attente paiement', color: '#F59E0B', icon: '💳' },
    attente_paiement: { label: 'Paiement en attente', color: '#8b5cf6', icon: '💳' },
  };

  return statusMap[status] || { label: status, color: '#9E9E9E', icon: '📌' };
};

/**
 * Retourne le nom du patient ou 'Patient inconnu'
 */
export const getVisitPatientName = (visit: Visit): string => {
  if (!visit) return 'Patient inconnu';
  if (visit.patient) {
    return `${visit.patient.first_name} ${visit.patient.last_name}`;
  }
  if (visit.target_name) {
    return visit.target_name;
  }
  return 'Patient inconnu';
};

/**
 * Retourne l'ID du patient ou null
 */
export const getVisitPatientId = (visit: Visit): string | null => {
  if (!visit) return null;
  return visit.patient?.id || null;
};

/**
 * Vérifie si la visite est une visite personnelle (sans patient)
 */
export const isPersonalVisit = (visit: Visit): boolean => {
  if (!visit) return false;
  return visit.target_type === 'personal' || !visit.patient_id;
};

/**
 * Vérifie si la visite est assignée à un aidant
 */
export const isVisitAssigned = (visit: Visit): boolean => {
  if (!visit) return false;
  return !!visit.aidant_id;
};

/**
 * Vérifie si la visite est urgente
 */
export const isVisitUrgent = (visit: Visit): boolean => {
  if (!visit) return false;
  return visit.is_urgent === true;
};

/**
 * Vérifie si la visite est en brouillon (paiement requis)
 */
export const isVisitDraft = (visit: Visit): boolean => {
  if (!visit) return false;
  return visit.status === 'brouillon';
};

/**
 * Vérifie si la visite est terminée (en attente de validation)
 */
export const isVisitCompleted = (visit: Visit): boolean => {
  if (!visit) return false;
  return visit.status === 'terminee';
};

/**
 * Vérifie si la visite est validée
 */
export const isVisitValidated = (visit: Visit): boolean => {
  if (!visit) return false;
  return visit.status === 'validee';
};

/**
 * Vérifie si la visite peut être démarrée (acceptée ou planifiée)
 */
export const canStartVisit = (visit: Visit): boolean => {
  if (!visit) return false;
  return visit.status === 'acceptee' || visit.status === 'planifiee';
};

/**
 * Vérifie si la visite peut être complétée (en cours)
 */
export const canCompleteVisit = (visit: Visit): boolean => {
  if (!visit) return false;
  return visit.status === 'en_cours';
};

/**
 * Vérifie si la visite peut être annulée (planifiée, en attente ou brouillon)
 */
export const canCancelVisit = (visit: Visit): boolean => {
  if (!visit) return false;
  return ['planifiee', 'en_attente', 'brouillon'].includes(visit.status);
};

/**
 * Vérifie si la visite peut être approuvée (planifiée)
 */
export const canApproveVisit = (visit: Visit): boolean => {
  if (!visit) return false;
  return visit.status === 'planifiee';
};

/**
 * Retourne le montant du paiement pour une visite ponctuelle
 */
export const getVisitPaymentAmount = (visit: Visit): number => {
  if (!visit) return 0;
  if (visit.metadata?.payment_amount) {
    return visit.metadata.payment_amount;
  }
  // Prix par défaut selon la durée
  const duration = visit.duration_minutes || 60;
  const prices: Record<number, number> = {
    30: 5000,
    45: 6000,
    60: 7500,
    90: 10000,
    120: 12500,
  };
  return prices[duration] || 7500;
};

/**
 * Retourne le temps restant avant l'expiration d'un brouillon
 */
export const getDraftExpiryTime = (visit: Visit): string | null => {
  if (!visit || visit.status !== 'brouillon') return null;
  if (!visit.draft_expires_at) return null;
  
  const expiry = new Date(visit.draft_expires_at);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  
  if (diff <= 0) return 'Expiré';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
};

// =============================================
// COMPOSANT VISUAL (Optionnel)
// =============================================

interface VisitInfoDisplayProps {
  visit: Visit;
  showAidant?: boolean;
  showAddress?: boolean;
  showCategory?: boolean;
  showPayment?: boolean;
  className?: string;
}

export const VisitInfoDisplay = ({
  visit,
  showAidant = true,
  showAddress = true,
  showCategory = true,
  showPayment = false,
  className = '',
}: VisitInfoDisplayProps) => {
  if (!visit) return null;

  const patientName = getVisitPatientName(visit);
  const aidantName = getVisitDisplayAidant(visit);
  const address = getVisitDisplayAddress(visit);
  const category = getVisitDisplayCategory(visit);
  const statusInfo = getVisitStatusInfo(visit.status);
  const isDraft = isVisitDraft(visit);
  const paymentAmount = getVisitPaymentAmount(visit);
  const expiryTime = getDraftExpiryTime(visit);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-500">👤</span>
        <span className="text-sm font-semibold text-gray-800">{patientName}</span>
        {category && (
          <span className="text-xs text-gray-400">({category})</span>
        )}
      </div>

      {showAidant && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">🦸</span>
          <span className="text-sm text-gray-700">{aidantName}</span>
        </div>
      )}

      {showAddress && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">📍</span>
          <span className="text-sm text-gray-600">{address}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-500">📌</span>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: statusInfo.color + '20', color: statusInfo.color }}
        >
          {statusInfo.icon} {statusInfo.label}
        </span>
        {isDraft && (
          <span className="text-xs text-amber-600">
            💳 {paymentAmount.toLocaleString()} FCFA
            {expiryTime && ` • Expire dans ${expiryTime}`}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>📅 {formatDate(visit.scheduled_date)}</span>
        <span>⏰ {visit.scheduled_time}</span>
        <span>⏱️ {visit.duration_minutes || 60} min</span>
      </div>
    </div>
  );
};

export default {
  getVisitDisplayName,
  getVisitDisplayAddress,
  getVisitDisplayCategory,
  getVisitDisplayType,
  getVisitDisplayAidant,
  getVisitDisplayRating,
  getVisitDisplayMissions,
  getVisitAidantInfo,
  getVisitStatusInfo,
  getVisitPatientName,
  getVisitPatientId,
  isPersonalVisit,
  isVisitAssigned,
  isVisitUrgent,
  isVisitDraft,
  isVisitCompleted,
  isVisitValidated,
  canStartVisit,
  canCompleteVisit,
  canCancelVisit,
  canApproveVisit,
  getVisitPaymentAmount,
  getDraftExpiryTime,
  VisitInfoDisplay,
};
