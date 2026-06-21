// 📁 src/lib/constants.ts

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
  // Maman & Bébé → Logo Maman
  if (role === 'family' && patientCategory === 'maman_bebe') {
    return LOGO_CONFIG.maman;
  }
  
  // Aidant → Logo général (mais thème aidant)
  if (role === 'aidant') {
    return LOGO_CONFIG.aidant;
  }
  
  // Coordinator / Admin → Logo général
  if (role === 'coordinator' || role === 'admin') {
    return LOGO_CONFIG.coordinator;
  }
  
  // Senior ou défaut → Logo général
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
// SUBSCRIPTION PLANS - GRILLE TARIFAIRE OFFICIELLE
// =============================================

// 🟢 SANTÉ PLUS SERVICES (Senior)
const SENIOR_OFFERS: Offer[] = [
  {
    id: 'senior-essentiel',
    name: 'Essentiel',
    price: 100,
    period: 'mois',
    visitsPerWeek: 1,
    durationDays: 30,
    features: ['4 visites par mois', 'Suivi léger', 'Coordination simple'],
    badge: '🌱 Découverte',
    category: 'senior',
  },
  {
    id: 'senior-accompagnement',
    name: 'Accompagnement',
    price: 100,
    period: 'mois',
    visitsPerWeek: 2,
    durationDays: 30,
    features: ['8 visites par mois', 'Sortie hôpital', 'Convalescence', 'Suivi renforcé'],
    badge: '🏥 Convalescence',
    category: 'senior',
  },
  {
    id: 'senior-serenite',
    name: 'Sérénité Seniors',
    price: 100000,
    period: 'mois',
    visitsPerWeek: 3,
    durationDays: 30,
    features: ['12 visites par mois', 'Suivi régulier', 'Coordination avancée', 'Présence rassurante'],
    badge: '⭐ Populaire',
    category: 'senior',
  },
  {
    id: 'senior-privilege',
    name: 'Privilège Famille',
    price: 200000,
    period: 'mois',
    visitsPerWeek: null,
    durationDays: 30,
    features: ['Suivi illimité', 'Coordination totale', 'Disponibilité 24/7', 'Gestion de crise'],
    badge: '👑 Premium',
    category: 'senior',
  },
];

// 🩷 SANTÉ PLUS MAMAN & BÉBÉ
const MAMAN_OFFERS: Offer[] = [
  {
    id: 'maman-essentiel',
    name: 'Essentiel',
    price: 100,
    period: '2 semaines',
    visitsPerWeek: null,
    durationDays: 14,
    features: ['Découverte post-partum', 'Présence à domicile', 'Soutien de base'],
    badge: '🌱 Découverte',
    category: 'maman_bebe',
  },
  {
    id: 'maman-confort',
    name: 'Confort',
    price: 100,
    period: '3 semaines',
    visitsPerWeek: null,
    durationDays: 21,
    features: ['Accompagnement standard', 'Aide organisation', 'Soutien moral'],
    badge: '⭐ Populaire',
    category: 'maman_bebe',
  },
  {
    id: 'maman-serenite',
    name: 'Sérénité',
    price: 140000,
    period: '4 semaines',
    visitsPerWeek: null,
    durationDays: 28,
    features: ['Suivi rapproché premium', 'Présence quotidienne', 'Coordination familiale'],
    badge: '🌟 Premium',
    category: 'maman_bebe',
  },
  {
    id: 'maman-privilege',
    name: 'Privilège',
    price: 200000,
    period: '5 semaines',
    visitsPerWeek: null,
    durationDays: 35,
    features: ['Coaching complet', 'Diaspora', 'Accompagnement intensif', 'Disponibilité totale'],
    badge: '👑 Excellence',
    category: 'maman_bebe',
  },
];

// ⭐ PACKS CONFORT
const PACK_CONFORT_OFFERS: Offer[] = [
  {
    id: 'pack-mensuel',
    name: 'Pack Confort Mensuel',
    price: 100,
    period: 'mois',
    visitsPerWeek: null,
    durationDays: 30,
    features: ['Commandes illimitées', 'Support prioritaire', 'Suivi personnalisé'],
    badge: '⭐ Populaire',
    category: 'pack_confort',
  },
  {
    id: 'pack-trimestriel',
    name: 'Pack Confort Trimestriel',
    price: 100,
    period: 'trimestre',
    visitsPerWeek: null,
    durationDays: 90,
    features: ['Commandes illimitées', 'Support prioritaire', 'Économie 10%'],
    badge: '💰 Économie',
    category: 'pack_confort',
  },
  {
    id: 'pack-annuel',
    name: 'Pack Confort Annuel',
    price: 480000,
    period: 'an',
    visitsPerWeek: null,
    durationDays: 365,
    features: ['Commandes illimitées', 'Support prioritaire', 'Économie 20%', 'Accès prioritaire'],
    badge: '💰 Meilleur rapport',
    category: 'pack_confort',
  },
];

// ⚡ INTERVENTIONS PONCTUELLES
const PONCTUAL_OFFERS: Offer[] = [
  {
    id: 'ponctuelle-base',
    name: 'Intervention Ponctuelle',
    price: 100,
    period: 'intervention',
    visitsPerWeek: null,
    durationDays: 1,
    features: [
      'Présence à domicile',
      'Coordination simple',
      'Assistance ponctuelle',
      'Durée : 2-3 heures'
    ],
    badge: '⚡ Rapide',
    category: 'ponctuelle',
  },
  {
    id: 'ponctuelle-sortie',
    name: "Sortie d'hôpital",
    price: 100,
    period: 'intervention',
    visitsPerWeek: null,
    durationDays: 1,
    features: [
      'Accompagnement retour à domicile',
      'Installation et mise en place',
      'Coordination avec la famille',
      'Durée : 3-4 heures'
    ],
    badge: '🏥 Sortie',
    category: 'ponctuelle',
  },
  {
    id: 'ponctuelle-urgence',
    name: 'Urgence',
    price: 100,
    period: 'intervention',
    visitsPerWeek: null,
    durationDays: 1,
    features: [
      'Intervention en urgence',
      'Disponibilité immédiate',
      'Coordination rapide',
      'Suivi personnalisé'
    ],
    badge: '🆘 Urgence',
    category: 'ponctuelle',
  },
];

// =============================================
// EXPORTS - PLANS (pour compatibilité)
// =============================================

export const PLANS = {
  senior: SENIOR_OFFERS,
  maman: MAMAN_OFFERS,
  pack_confort: PACK_CONFORT_OFFERS,
  ponctuelle: PONCTUAL_OFFERS,
};

// =============================================
// EXPORTS - OFFERS (nouvelle nomenclature)
// =============================================

export const OFFERS = {
  senior: SENIOR_OFFERS,
  maman_bebe: MAMAN_OFFERS,
  pack_confort: PACK_CONFORT_OFFERS,
  ponctuelle: PONCTUAL_OFFERS,
};

// =============================================
// HELPERS
// =============================================

export const getOffersByCategory = (category: OfferCategory): Offer[] => {
  return OFFERS[category] || [];
};

export const getAllOffers = (): Offer[] => {
  return [...SENIOR_OFFERS, ...MAMAN_OFFERS, ...PACK_CONFORT_OFFERS, ...PONCTUAL_OFFERS];
};

export const getOfferById = (id: string): Offer | undefined => {
  return getAllOffers().find(offer => offer.id === id);
};

export const getOfferPrice = (id: string): number => {
  const offer = getOfferById(id);
  return offer?.price || 0;
};

export const getOfferName = (id: string): string => {
  const offer = getOfferById(id);
  return offer?.name || 'Offre inconnue';
};

export const getOffersByCategoryType = (category: OfferCategory): Offer[] => {
  return OFFERS[category] || [];
};

// =============================================
// GET LOGO BY THEME
// =============================================

export const getLogoByTheme = (theme: 'senior' | 'maman' | 'aidant' | 'coordinator' | 'general'): { icon: string; text: string; whiteBg: string } => {
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