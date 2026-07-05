// 📁 src/lib/constants.ts
// VERSION CORRIGÉE - Suppression des IDs d'offres statiques
// Les offres sont désormais dynamiques (base de données)

import { Offer, OfferCategory } from '@/types';

export const APP_NAME = 'Santé Plus Services';
export const APP_SHORT_NAME = 'Santé Plus';
export const APP_DESCRIPTION = 'Accompagnement humain et coordination à domicile';

// =============================================
// LOGO CONFIGURATION - BRANDING OFFICIEL
// =============================================

export const LOGO_CONFIG = {
  senior: {
    icon: '/assets/images/logos/logo-general-icon.png',
    text: '/assets/images/logos/logo-general-text.png',
    whiteBg: '/assets/images/logos/logo-general-white-bg.png',
  },
  maman: {
    icon: '/assets/images/logos/logo-maman-icon.png',
    text: '/assets/images/logos/logo-maman-text.png',
    whiteBg: '/assets/images/logos/logo-maman-white-bg.jpeg',
  },
  aidant: {
    icon: '/assets/images/logos/logo-general-icon.png',
    text: '/assets/images/logos/logo-general-text.png',
    whiteBg: '/assets/images/logos/logo-general-white-bg.png',
  },
  coordinator: {
    icon: '/assets/images/logos/logo-general-icon.png',
    text: '/assets/images/logos/logo-general-text.png',
    whiteBg: '/assets/images/logos/logo-general-white-bg.png',
  },
  general: {
    icon: '/assets/images/logos/logo-general-icon.png',
    text: '/assets/images/logos/logo-general-text.png',
    whiteBg: '/assets/images/logos/logo-general-white-bg.png',
  },
};

export const getLogoByRole = (
  role?: string | null,
  patientCategory?: string | null
): { icon: string; text: string; whiteBg: string } => {
  if (role === 'family' && patientCategory === 'maman_bebe') {
    return LOGO_CONFIG.maman;
  }
  if (role === 'aidant') {
    return LOGO_CONFIG.aidant;
  }
  if (role === 'coordinator' || role === 'admin') {
    return LOGO_CONFIG.coordinator;
  }
  return LOGO_CONFIG.general;
};

// =============================================
// VISITE ACTIONS
// =============================================
export const VISIT_ACTIONS_SENIOR = [
  { id: 'presence', label: 'Présence', icon: '👤' },
  { id: 'aide_quotidien', label: 'Aide au quotidien', icon: '🤝' },
  { id: 'rappel_medicament', label: 'Rappel médicament', icon: '💊' },
  { id: 'verification_generale', label: 'Vérification générale', icon: '✅' },
  { id: 'accompagnement', label: 'Accompagnement', icon: '🚶' },
  { id: 'discussion', label: 'Discussion', icon: '💬' },
  { id: 'rangement_leger', label: 'Rangement léger', icon: '🧹' },
  { id: 'observation', label: 'Observation', icon: '👀' },
  { id: 'prise_constants', label: 'Prise des constants', icon: '🩺' },
  { id: 'aide_repas', label: 'Aide au repas', icon: '🍽️' },
];

export const VISIT_ACTIONS_MAMAN = [
  { id: 'aide_organisation', label: 'Aide organisation', icon: '📋' },
  { id: 'soutien_moral', label: 'Soutien moral', icon: '💝' },
  { id: 'aide_repas', label: 'Aide repas simple', icon: '🍲' },
  { id: 'observation_bebe', label: 'Observation bébé', icon: '👶' },
  { id: 'conseils', label: 'Conseils non médicaux', icon: '📖' },
  { id: 'accompagnement_retour', label: 'Accompagnement retour maison', icon: '🏠' },
  { id: 'presence_rassurante', label: 'Présence rassurante', icon: '🤗' },
  { id: 'coordination_familiale', label: 'Coordination familiale', icon: '👨‍👩‍👦' },
  { id: 'aide_allaitement', label: "Aide à l'allaitement", icon: '🍼' },
  { id: 'ecoute_active', label: 'Écoute active', icon: '👂' },
];

// =============================================
// ORDER TYPES
// =============================================
export const ORDER_TYPES = [
  { id: 'medicaments', label: 'Médicaments', icon: '💊' },
  { id: 'produits_bebe', label: 'Produits bébé', icon: '🧸' },
  { id: 'produits_hygiene', label: "Produits d'hygiène", icon: '🧴' },
  { id: 'courses', label: 'Courses simples', icon: '🛒' },
  { id: 'repas', label: 'Repas', icon: '🍲' },
  { id: 'autre', label: 'Autre demande', icon: '📝' },
];

// =============================================
// REGISTRATION FIELDS
// =============================================
export const REGISTRATION_FIELDS = {
  senior: {
    title: 'Repères utiles',
    description: 'Ces informations nous aident à mieux comprendre la situation.',
    fields: [
      { id: 'allergies', label: 'Allergies', type: 'text', placeholder: 'Aucune' },
      { id: 'treatments', label: 'Traitements en cours', type: 'text', placeholder: 'Aucun' },
      { id: 'conditions', label: 'Pathologies connues', type: 'text', placeholder: 'Aucune' },
      { id: 'medical_history', label: 'Antécédents médicaux', type: 'textarea', placeholder: 'Informations complémentaires...' },
    ],
  },
  maman_bebe: {
    title: 'Repères utiles',
    description: 'Ces informations nous aident à mieux comprendre votre situation.',
    fields: [
      { id: 'type_accouchement', label: "Type d'accouchement", type: 'select', options: ['Voie basse', 'Césarienne'] },
      { id: 'allaitement', label: 'Allaitement', type: 'select', options: ['Allaitement maternel', 'Biberon', 'Mixte'] },
      { id: 'notes', label: 'Notes importantes', type: 'textarea', placeholder: 'Fatigue, sommeil, besoins particuliers...' },
    ],
  },
};

// =============================================
// 🟢 PRIX DES VISITES PONCTUELLES - UNIQUE SOURCE DE VÉRITÉ
// =============================================

/**
 * Grille tarifaire des visites ponctuelles
 * Utilisée par le frontend ET le backend (via import)
 */
export const VISIT_PONCTUAL_PRICES: Record<string, number> = {
  '30': 5000,
  '45': 6000,
  '60': 7500,
  '90': 10000,
  '120': 12500,
};

export const DEFAULT_VISIT_PRICE = 7500;

/**
 * Calcule le prix d'une visite ponctuelle en fonction de sa durée
 * @param durationMinutes - Durée en minutes (30, 45, 60, 90, 120)
 * @returns Prix en FCFA
 */
export const getPonctualPrice = (durationMinutes: number = 60): number => {
  const price = VISIT_PONCTUAL_PRICES[durationMinutes.toString()];
  if (price) return price;
  return Math.round((durationMinutes / 60) * DEFAULT_VISIT_PRICE);
};

/**
 * Calcule le prix d'une commande ponctuelle
 * @param items - Liste des articles (optionnel)
 * @returns Prix estimé en FCFA
 */
export const getPonctualOrderPrice = (items?: Array<{ quantity: number; price: number }>): number => {
  if (items && items.length > 0) {
    const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    if (total > 0) return total;
  }
  return 2500; // Prix minimum pour une commande ponctuelle
};



// =============================================
// GET LOGO BY THEME
// =============================================

export const getLogoByTheme = (
  theme: 'senior' | 'maman' | 'aidant' | 'coordinator' | 'general'
): { icon: string; text: string; whiteBg: string } => {
  switch (theme) {
    case 'maman':
      return LOGO_CONFIG.maman;
    case 'aidant':
      return LOGO_CONFIG.aidant;
    case 'coordinator':
      return LOGO_CONFIG.coordinator;
    case 'senior':
    default:
      return LOGO_CONFIG.senior;
  }
};

// =============================================
// HELPERS DE COMPATIBILITÉ (pour la transition)
// =============================================

/**
 * @deprecated - Utiliser getPonctualPrice() à la place
 * Gardé pour compatibilité avec le code existant
 */
export const getPonctualPriceLegacy = getPonctualPrice;

/**
 * Vérifie si un service est ponctuel (sans abonnement)
 * @param serviceType - 'visit' | 'order'
 * @param hasActiveSubscription - L'utilisateur a-t-il un abonnement actif ?
 * @param remainingQuota - Quota restant (visites ou commandes)
 * @returns true si le service doit être payé (ponctuel)
 */
export const requiresPonctualPayment = (
  serviceType: 'visit' | 'order',
  hasActiveSubscription: boolean,
  remainingQuota: number
): boolean => {
  // ✅ Si l'utilisateur a un abonnement avec des quotas restants → Pas de paiement
  if (hasActiveSubscription && remainingQuota > 0) {
    return false;
  }
  // ✅ Sinon → Paiement requis
  return true;
};

/**
 * Retourne le statut approprié pour une visite en fonction de l'abonnement
 * @param hasActiveSubscription - L'utilisateur a-t-il un abonnement actif ?
 * @param remainingVisits - Visites restantes
 * @returns 'planifiee' | 'brouillon'
 */
export const getVisitStatusForCreation = (
  hasActiveSubscription: boolean,
  remainingVisits: number
): 'planifiee' | 'brouillon' => {
  if (hasActiveSubscription && remainingVisits > 0) {
    return 'planifiee';
  }
  return 'brouillon';
};

/**
 * Retourne le statut approprié pour une commande en fonction de l'abonnement
 * @param hasActiveSubscription - L'utilisateur a-t-il un abonnement actif ?
 * @param remainingOrders - Commandes restantes
 * @returns 'creee' | 'attente_paiement'
 */
export const getOrderStatusForCreation = (
  hasActiveSubscription: boolean,
  remainingOrders: number
): 'creee' | 'attente_paiement' => {
  if (hasActiveSubscription && remainingOrders > 0) {
    return 'creee';
  }
  return 'attente_paiement';
};

// =============================================
// EXPORT PAR DÉFAUT
// =============================================

export default {
  APP_NAME,
  APP_SHORT_NAME,
  APP_DESCRIPTION,
  LOGO_CONFIG,
  getLogoByRole,
  VISIT_ACTIONS_SENIOR,
  VISIT_ACTIONS_MAMAN,
  ORDER_TYPES,
  REGISTRATION_FIELDS,
  VISIT_PONCTUAL_PRICES,
  DEFAULT_VISIT_PRICE,
  getPonctualPrice,
  getPonctualOrderPrice,
  getLogoByTheme,
  requiresPonctualPayment,
  getVisitStatusForCreation,
  getOrderStatusForCreation,
};
