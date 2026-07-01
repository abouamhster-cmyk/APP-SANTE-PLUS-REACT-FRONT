// 📁 src/lib/constants.ts
// VERSION PRODUCTION - Offres dynamiques avec fallback UUID réels

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
// 🟢 GRILLE TARIFAIRE COMPLÈTE - SANTÉ PLUS SERVICES (Senior)
// Basée sur la grille officielle
// =============================================

const SENIOR_OFFERS: Offer[] = [
  {
    id: '34e37740-85bc-4839-a2b6-2a073a80606e',
    name: 'Essentiel',
    price: 45000,
    period: 'mois',
    visitsPerWeek: 1,
    durationDays: 30,
    features: ['4 visites par mois', 'Suivi léger', 'Coordination simple'],
    badge: '🌱 Découverte',
    category: 'senior',
    total_visits: 4,
    total_orders: 2,
  },
  {
    id: '9c69961c-577f-4130-9e67-4fb18d29e82a',
    name: 'Accompagnement',
    price: 80000,
    period: 'mois',
    visitsPerWeek: 2,
    durationDays: 30,
    features: ['8 visites par mois', 'Sortie hôpital', 'Convalescence', 'Suivi renforcé'],
    badge: '🏥 Convalescence',
    category: 'senior',
    total_visits: 8,
    total_orders: 3,
  },
  {
    id: 'db103aad-36b3-419e-92a7-b48f5712cd32',
    name: 'Sérénité Seniors',
    price: 100000,
    period: 'mois',
    visitsPerWeek: 3,
    durationDays: 30,
    features: ['12 visites par mois', 'Suivi régulier', 'Coordination avancée', 'Présence rassurante'],
    badge: '⭐ Populaire',
    category: 'senior',
    total_visits: 12,
    total_orders: 4,
  },
  {
    id: '61ad4bbf-4e29-43a8-b284-bdb54a704be9',
    name: 'Privilège Famille',
    price: 200000,
    period: 'mois',
    visitsPerWeek: null,
    durationDays: 30,
    features: ['Suivi illimité', 'Coordination totale', 'Disponibilité 24/7', 'Gestion de crise'],
    badge: '👑 Premium',
    category: 'senior',
    total_visits: 30,
    total_orders: 10,
  },
  {
    id: 'e96fbc17-663e-4474-a0db-a9b141a9d768',
    name: 'Suivi Régulier',
    price: 60000,
    period: 'mois',
    visitsPerWeek: 3,
    durationDays: 30,
    features: ['Visites régulières', 'Suivi personnalisé', 'Coordination familiale', 'Rapports détaillés', 'Communication continue'],
    badge: '🌟 Populaire',
    category: 'senior',
    total_visits: 4,
    total_orders: 4,
  },
  {
    id: '70730419-579c-4447-a0d6-b9d336373bd0',
    name: 'Accompagnement Complet',
    price: 150000,
    period: 'mois',
    visitsPerWeek: 5,
    durationDays: 30,
    features: ['Organisation complète', 'Suivi rapproché', 'Coordination avancée', 'Communication continue', 'Présence renforcée', 'Gestion des urgences'],
    badge: '🌟 Complet',
    category: 'senior',
    total_visits: 8,
    total_orders: 4,
  },
];

// =============================================
// 🩷 GRILLE TARIFAIRE COMPLÈTE - SANTÉ PLUS MAMAN & BÉBÉ
// Basée sur la grille officielle
// =============================================

const MAMAN_OFFERS: Offer[] = [
  {
    id: '7ae364f9-9304-4315-a4ea-f9c8d2222967',
    name: 'Essentiel',
    price: 65000,
    period: '2 semaines',
    visitsPerWeek: null,
    durationDays: 14,
    features: ['Découverte post-partum', 'Présence à domicile', 'Soutien de base'],
    badge: '🌱 Découverte',
    category: 'maman_bebe',
    total_visits: 8,
    total_orders: 2,
  },
  {
    id: '7c4713ef-92ff-449d-90be-4a938118ff60',
    name: 'Confort',
    price: 100000,
    period: '3 semaines',
    visitsPerWeek: null,
    durationDays: 21,
    features: ['Accompagnement standard', 'Aide organisation', 'Soutien moral'],
    badge: '⭐ Populaire',
    category: 'maman_bebe',
    total_visits: 12,
    total_orders: 3,
  },
  {
    id: '73d68dcc-8855-4fdb-b242-836a348f6bf0',
    name: 'Sérénité',
    price: 140000,
    period: '4 semaines',
    visitsPerWeek: null,
    durationDays: 28,
    features: ['Suivi rapproché premium', 'Présence quotidienne', 'Coordination familiale'],
    badge: '🌟 Premium',
    category: 'maman_bebe',
    total_visits: 16,
    total_orders: 4,
  },
  {
    id: '8123f570-bfbe-4fbf-bcf4-4f9f5d72c364',
    name: 'Privilège',
    price: 200000,
    period: '5 semaines',
    visitsPerWeek: null,
    durationDays: 35,
    features: ['Coaching complet', 'Diaspora', 'Accompagnement intensif', 'Disponibilité totale'],
    badge: '👑 Excellence',
    category: 'maman_bebe',
    total_visits: 20,
    total_orders: 5,
  },
  {
    id: 'cb775e9c-892d-493f-bdfd-70f92427bde9',
    name: 'Pack Essentiel',
    price: 50000,
    period: 'mois',
    visitsPerWeek: 2,
    durationDays: 30,
    features: ['2 visites/semaine', 'Accompagnement simple', 'Soutien de base', 'Suivi régulier'],
    badge: null,
    category: 'maman_bebe',
    total_visits: 4,
    total_orders: 4,
  },
  {
    id: '9d36f439-8b38-45d2-97df-761c8efe95a6',
    name: 'Pack Confort',
    price: 85000,
    period: 'mois',
    visitsPerWeek: 4,
    durationDays: 30,
    features: ['3-4 visites/semaine', 'Suivi renforcé', 'Aide à l\'organisation', 'Soutien personnalisé', 'Coordination familiale'],
    badge: '⭐ Populaire',
    category: 'maman_bebe',
    total_visits: 4,
    total_orders: 4,
  },
  {
    id: '99482191-5833-49dc-be80-2e53d8d11afe',
    name: 'Pack Sérénité',
    price: 150000,
    period: 'mois',
    visitsPerWeek: 6,
    durationDays: 30,
    features: ['Présence quasi quotidienne', 'Organisation complète', 'Soutien intensif', 'Coordination continue', 'Gestion des urgences'],
    badge: '🌟 Complet',
    category: 'maman_bebe',
    total_visits: 12,
    total_orders: 4,
  },
];

// =============================================
// ⭐ PACKS CONFORT
// =============================================

const PACK_CONFORT_OFFERS: Offer[] = [
  {
    id: 'cfc4dd4c-5bf9-49e5-a28e-998cf92cff0b',
    name: 'Pack Confort Mensuel',
    price: 50000,
    period: 'mois',
    visitsPerWeek: null,
    durationDays: 30,
    features: ['Commandes illimitées', 'Support prioritaire', 'Suivi personnalisé', 'Messages illimités'],
    badge: '⭐ Populaire',
    category: 'pack_confort',
    total_visits: 0,
    total_orders: 999,
  },
  {
    id: 'ee102cda-2639-4c85-bc7c-9f57b83bf81a',
    name: 'Pack Confort Trimestriel',
    price: 135000,
    period: 'trimestre',
    visitsPerWeek: null,
    durationDays: 90,
    features: ['Commandes illimitées', 'Support prioritaire', 'Suivi personnalisé', 'Économie 10%', 'Messages illimités'],
    badge: '💰 Économie',
    category: 'pack_confort',
    total_visits: 0,
    total_orders: 999,
  },
  {
    id: '85818a8f-2674-4ea3-8d9a-211cf3c452f3',
    name: 'Pack Confort Annuel',
    price: 480000,
    period: 'an',
    visitsPerWeek: null,
    durationDays: 365,
    features: ['Commandes illimitées', 'Support prioritaire', 'Suivi personnalisé', 'Économie 20%', 'Messages illimités', 'Accès prioritaire'],
    badge: '💰 Meilleur rapport',
    category: 'pack_confort',
    total_visits: 0,
    total_orders: 999,
  },
];

// =============================================
// ⚡ INTERVENTIONS PONCTUELLES
// =============================================

const PONCTUAL_OFFERS: Offer[] = [
  {
    id: 'b4b01a84-1b0c-4973-9e58-43945c1c4991',
    name: 'Intervention Ponctuelle',
    price: 7500,
    period: 'intervention',
    visitsPerWeek: null,
    durationDays: 1,
    features: ['Présence à domicile', 'Coordination simple', 'Assistance ponctuelle', 'Durée : 2-3 heures'],
    badge: '⚡ Rapide',
    category: 'ponctuelle',
    total_visits: 4,
    total_orders: 4,
  },
  {
    id: '6e4ba26d-98c5-4e29-a129-f33a828f0b44',
    name: 'Intervention Ponctuelle',
    price: 7500,
    period: 'intervention',
    visitsPerWeek: null,
    durationDays: 1,
    features: ['Présence à domicile', 'Coordination simple', 'Assistance ponctuelle', 'Durée : 2-3 heures'],
    badge: '⚡ Rapide',
    category: 'ponctuelle',
    total_visits: 4,
    total_orders: 4,
  },
  {
    id: '5675ee69-7705-4687-8a7f-81c1501cae77',
    name: 'Pack Sortie Maternité Sérénité',
    price: 70000,
    period: 'intervention',
    visitsPerWeek: null,
    durationDays: 1,
    features: ['Accompagnement retour à domicile', 'Installation et mise en place', 'Coordination avec la famille', 'Durée : 3-4 heures'],
    badge: '👶 Nouveau',
    category: 'ponctuelle',
    total_visits: 12,
    total_orders: 4,
  },
  {
    id: '45ea11be-5ad8-40f9-bb09-0e274b777d30',
    name: 'Pack Sortie Maternité Sérénité',
    price: 70000,
    period: 'intervention',
    visitsPerWeek: null,
    durationDays: 1,
    features: ['Présence à domicile', 'Aide à l\'organisation', 'Soutien moral', 'Suivi personnalisé', 'Coordination familiale'],
    badge: '👶 Recommandé',
    category: 'ponctuelle',
    total_visits: 12,
    total_orders: 4,
  },
];

// =============================================
// EXPORTS - PLANS (Fallback)
// =============================================

export const PLANS = {
  senior: SENIOR_OFFERS,
  maman: MAMAN_OFFERS,
  pack_confort: PACK_CONFORT_OFFERS,
  ponctuelle: PONCTUAL_OFFERS,
};

// =============================================
// EXPORTS - OFFERS (Fallback)
// =============================================

export const OFFERS = {
  senior: SENIOR_OFFERS,
  maman_bebe: MAMAN_OFFERS,
  pack_confort: PACK_CONFORT_OFFERS,
  ponctuelle: PONCTUAL_OFFERS,
};

// =============================================
// HELPERS - Fallback
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
