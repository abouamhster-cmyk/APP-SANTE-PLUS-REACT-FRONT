// 📁 src/utils/helpers.ts
 

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Visit } from '@/types';

// =============================================
// TAILWIND MERGE
// =============================================
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// =============================================
// FORMATAGE DE DATE
// =============================================
export const formatDate = (date: string | Date) => {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const formatTime = (date: string | Date) => {
  const d = new Date(date);
  return d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateTime = (date: string | Date) => {
  return `${formatDate(date)} à ${formatTime(date)}`;
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount);
};

// =============================================
// TEXTES
// =============================================
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
};

export const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
};

export const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export const capitalizeFirstLetter = (text: string) => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// =============================================
// ÂGE
// =============================================
export const getAge = (birthDate: string | Date) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export const formatPhoneNumber = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 8) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '+229 $1 $2 $3 $4');
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '+$1 $2 $3 $4 $5');
  }
  return phone;
};

// =============================================
// STATUS HELPERS
// =============================================
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    // Visites
    planifiee: '#4CAF50',
    en_attente: '#FF9800',
    acceptee: '#2196F3',
    en_cours: '#2196F3',
    terminee: '#9C27B0',
    validee: '#4CAF50',
    annulee: '#F44336',
    refusee: '#F44336',
    expire: '#795548',
    replanifiee: '#FF5722',
    no_show: '#795548',
    brouillon: '#F59E0B', // ✅ Couleur orange pour le brouillon
    attente_paiement: '#8b5cf6',
    // Commandes
    creee: '#9E9E9E',
    disponible: '#F44336',
    en_cours: '#2196F3',
    livree: '#2196F3',
    valide: '#4CAF50',
    echoue: '#F44336',
    rembourse: '#9E9E9E',
    en_attente_de_confirmation: '#FF9800',
    // Abonnements
    actif: '#4CAF50',
    suspendu: '#FF9800',
    en_cours_de_renouvellement: '#2196F3',
    info_requise: '#2196F3',
    en_cours_de_traitement: '#9C27B0',
  };
  return colors[status] || '#9E9E9E';
};

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    // Visites
    planifiee: 'Planifiée',
    en_attente: 'En attente',
    acceptee: 'Acceptée',
    en_cours: 'En cours',
    terminee: 'Terminée',
    validee: 'Validée',
    annulee: 'Annulée',
    refusee: 'Refusée',
    expire: 'Expirée',
    replanifiee: 'Replanifiée',
    no_show: 'Absent',
    brouillon: '💳 Paiement requis', // ✅ Libellé clair
    attente_paiement: 'En attente paiement',
    // Commandes
    creee: 'Créée',
    disponible: 'Disponible',
    en_cours: 'En cours',
    livree: 'Livrée',
    valide: 'Validé',
    echoue: 'Échoué',
    rembourse: 'Remboursé',
    en_attente_de_confirmation: 'En attente de confirmation',
    // Abonnements
    actif: 'Actif',
    suspendu: 'Suspendu',
    en_cours_de_renouvellement: 'En cours de renouvellement',
    info_requise: 'Info requise',
    en_cours_de_traitement: 'En cours de traitement',
  };
  return labels[status] || status;
};

// =============================================
// ✅ VISITE DISPLAY HELPERS
// =============================================

/**
 * Retourne le nom à afficher pour une visite
 * - Si patient existe → nom du patient
 * - Si visite personnelle → target_name
 * - Sinon → 'Personnel'
 */
export const getVisitDisplayName = (visit: Visit | null | undefined): string => {
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
 * - Si patient a une adresse → adresse du patient
 * - Si visite personnelle → 'Adresse personnelle'
 * - Sinon → 'Adresse non renseignée'
 */
export const getVisitDisplayAddress = (visit: Visit | null | undefined): string => {
  if (!visit) return 'Adresse non renseignée';
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
export const getVisitDisplayCategory = (visit: Visit | null | undefined): string => {
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
export const getVisitDisplayType = (visit: Visit | null | undefined): string => {
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
export const getVisitDisplayAidant = (visit: Visit | null | undefined): string => {
  if (!visit) return 'Non assigné';
  if (visit.aidant?.user?.full_name) {
    return visit.aidant.user.full_name;
  }
  return 'Non assigné';
};

// =============================================
// ✅ BROUILLON HELPERS (NOUVEAUX)
// =============================================

/**
 * Vérifie si une visite est un brouillon (en attente de paiement)
 */
export const isVisitDraft = (visit: Visit | null | undefined): boolean => {
  if (!visit) return false;
  return visit.status === 'brouillon';
};

/**
 * Vérifie si une visite est ponctuelle (payée à l'unité)
 */
export const isVisitPonctual = (visit: Visit | null | undefined): boolean => {
  if (!visit) return false;
  return visit.metadata?.is_ponctual === true || 
         visit.metadata?.is_draft === true ||
         visit.visit_type === 'ponctuelle';
};

/**
 * Vérifie si une visite nécessite un paiement
 */
export const requiresVisitPayment = (visit: Visit | null | undefined): boolean => {
  if (!visit) return false;
  return visit.metadata?.requires_payment === true || isVisitDraft(visit);
};

/**
 * Retourne le montant du paiement pour une visite ponctuelle
 */
export const getVisitPaymentAmount = (visit: Visit | null | undefined): number => {
  if (!visit) return 0;
  if (visit.metadata?.payment_amount) {
    return visit.metadata.payment_amount;
  }
  // ✅ Utiliser le helper de constants.ts via import
  // Note: Pour éviter la dépendance circulaire, on importe getPonctualPrice
  // dans le fichier qui appelle cette fonction
  return 7500; // Valeur par défaut
};

/**
 * Retourne le temps restant avant l'expiration d'un brouillon
 */
export const getDraftExpiryTime = (visit: Visit | null | undefined): string | null => {
  if (!visit || !isVisitDraft(visit)) return null;
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

/**
 * Vérifie si un brouillon est expiré
 */
export const isDraftExpired = (visit: Visit | null | undefined): boolean => {
  if (!visit || !isVisitDraft(visit)) return false;
  if (!visit.draft_expires_at) return false;
  
  const expiry = new Date(visit.draft_expires_at);
  const now = new Date();
  return expiry.getTime() <= now.getTime();
};

/**
 * Vérifie si une visite peut être convertie depuis un brouillon
 * (utilise l'abonnement)
 */
export const canConvertDraftToSubscription = (
  visit: Visit | null | undefined,
  hasActiveSubscription: boolean,
  remainingVisits: number
): boolean => {
  if (!visit) return false;
  if (!isVisitDraft(visit)) return false;
  if (!hasActiveSubscription) return false;
  if (remainingVisits <= 0) return false;
  return true;
};

/**
 * Vérifie si une visite peut être payée en mode ponctuel
 */
export const canPayVisitPonctual = (
  visit: Visit | null | undefined
): boolean => {
  if (!visit) return false;
  if (!isVisitDraft(visit)) return false;
  return true;
};

// =============================================
// ✅ COMMANDE HELPERS (NOUVEAUX)
// =============================================

/**
 * Vérifie si une commande est en attente de paiement
 */
export const isOrderPendingPayment = (order: any | null | undefined): boolean => {
  if (!order) return false;
  return order.status === 'attente_paiement';
};

/**
 * Vérifie si une commande est ponctuelle
 */
export const isOrderPonctual = (order: any | null | undefined): boolean => {
  if (!order) return false;
  return order.order_type === 'ponctual' || order.is_ponctual === true;
};

/**
 * Vérifie si une commande nécessite un paiement
 */
export const requiresOrderPayment = (order: any | null | undefined): boolean => {
  if (!order) return false;
  return isOrderPendingPayment(order) || 
         (isOrderPonctual(order) && !order.is_paid);
};

// =============================================
// ✅ VISITE STATUS HELPERS (COMPLÉMENTAIRES)
// =============================================

/**
 * Vérifie si la visite est terminée (en attente de validation)
 */
export const isVisitCompleted = (visit: Visit | null | undefined): boolean => {
  if (!visit) return false;
  return visit.status === 'terminee';
};

/**
 * Vérifie si la visite est validée
 */
export const isVisitValidated = (visit: Visit | null | undefined): boolean => {
  if (!visit) return false;
  return visit.status === 'validee';
};

/**
 * Vérifie si la visite peut être démarrée (acceptée ou planifiée)
 */
export const canStartVisit = (visit: Visit | null | undefined): boolean => {
  if (!visit) return false;
  return visit.status === 'acceptee' || visit.status === 'planifiee';
};

/**
 * Vérifie si la visite peut être complétée (en cours)
 */
export const canCompleteVisit = (visit: Visit | null | undefined): boolean => {
  if (!visit) return false;
  return visit.status === 'en_cours';
};

/**
 * Vérifie si la visite peut être annulée
 */
export const canCancelVisit = (visit: Visit | null | undefined): boolean => {
  if (!visit) return false;
  return ['planifiee', 'en_attente', 'brouillon'].includes(visit.status);
};

/**
 * Vérifie si la visite peut être approuvée (planifiée)
 */
export const canApproveVisit = (visit: Visit | null | undefined): boolean => {
  if (!visit) return false;
  return visit.status === 'planifiee';
};

// =============================================
// ✅ EXPORT PAR DÉFAUT
// =============================================
 

export default {
  cn,
  formatDate,
  formatTime,
  formatDateTime,
  formatCurrency,
  getGreeting,
  getInitials,
  truncateText,
  capitalizeFirstLetter,
  sleep,
  getAge,
  formatPhoneNumber,
  getStatusColor,
  getStatusLabel,
  getVisitDisplayName,
  getVisitDisplayAddress,
  getVisitDisplayCategory,
  getVisitDisplayType,
  getVisitDisplayAidant,
  isVisitDraft,
  isVisitPonctual,
  requiresVisitPayment,
  getVisitPaymentAmount,
  getDraftExpiryTime,
  isDraftExpired,
  canConvertDraftToSubscription,
  canPayVisitPonctual,
  isOrderPendingPayment,
  isOrderPonctual,
  requiresOrderPayment,
  isVisitCompleted,
  isVisitValidated,
  canStartVisit,
  canCompleteVisit,
  canCancelVisit,
  canApproveVisit,
};
