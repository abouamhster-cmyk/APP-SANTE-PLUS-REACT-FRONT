// 📁 frontend/src/utils/helpers.ts
// ✅ MODULE D'HELPERS DE FORMULAIRE COMPLET : MISE EN PRIORITÉ DE L'ADRESSE SPÉCIFIQUE DE VISITE

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Visit } from '@/types';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// =============================================
// TAILWIND MERGE
// =============================================
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// =============================================
// FORMATAGE DE DATE (SÉCURISÉ MOBILE & SAFARI)
// =============================================
export const formatDate = (date: string | Date) => {
  if (date instanceof Date) {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  if (typeof date === 'string') {
    const cleanDate = date.replace(/-/g, '/');
    const d = new Date(cleanDate);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }

    const dRaw = new Date(date);
    if (!isNaN(dRaw.getTime())) {
      return dRaw.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  }

  return 'Date invalide';
};

/**
 * Calcule la distance totale parcourue (en kilomètres) à partir de la trajectoire d'une visite
 */
export const calculateTotalVisitDistance = (locationTrack: any[] | null | undefined): number => {
  if (!locationTrack || !Array.isArray(locationTrack) || locationTrack.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < locationTrack.length - 1; i++) {
    const p1 = locationTrack[i];
    const p2 = locationTrack[i + 1];
    
    const R = 6371; // Rayon de la Terre en km
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    totalDistance += R * c;
  }

  return totalDistance;
};

// =============================================
// FORMATAGE D'HEURE (SÉCURISÉ CONTRE LES "Invalid Date" SUR MOBILE)
// =============================================
export const formatTime = (time: string | Date) => {
  if (time instanceof Date) {
    return time.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  
  if (typeof time === 'string') {
    if (time.includes(':')) {
      const parts = time.split(':');
      if (parts.length >= 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
      }
    }
    
    const d = new Date(time);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }
  
  return '00:00';
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
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '+1 $2 $3 $4 $5');
  }
  return phone;
};

// =============================================
// STATUS HELPERS UNIFIÉS
// =============================================
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
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
    brouillon: '#F59E0B',
    attente_paiement: '#8b5cf6',
    creee: '#9E9E9E',
    disponible: '#F44336',
    livree: '#2196F3',
    valide: '#4CAF50',
    echoue: '#F44336',
    rembourse: '#9E9E9E',
    en_attente_de_confirmation: '#FF9800',
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
    brouillon: 'En attente paiement',
    attente_paiement: 'Paiement en attente',
    creee: 'Créée',
    disponible: 'Disponible',
    livree: 'Livrée',
    valide: 'Validé',
    echoue: 'Échoué',
    rembourse: 'Remboursé',
    en_attente_de_confirmation: 'En attente de confirmation',
    actif: 'Actif',
    suspendu: 'Suspendu',
    en_cours_de_renouvellement: 'En cours de renouvellement',
    info_requise: 'Info requise',
    en_cours_de_traitement: 'En cours de traitement',
  };
  return labels[status] || status;
};

// =============================================
// VISITE DISPLAY HELPERS
// =============================================
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

// ✅ CORRECTIF DE PRIORITÉ : On lit d'abord 'visit.address' spécifique avant d'utiliser l'adresse par défaut du profil patient.
export const getVisitDisplayAddress = (visit: Visit | null | undefined): string => {
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

export const getVisitDisplayAidant = (visit: Visit | null | undefined): string => {
  if (!visit) return 'Non assigné';
  if (visit.aidant?.user?.full_name) {
    return visit.aidant.user.full_name;
  }
  return 'Non assigné';
};

// =============================================
// BROUILLON HELPERS (VISITES PONCTUELLES)
// =============================================
export const isVisitDraft = (visit: Visit | null | undefined): boolean => {
  if (!visit) return false;
  return visit.status === 'brouillon';
};

export const isVisitPonctual = (visit: Visit | null | undefined): boolean => {
  if (!visit) return false;
  return visit.metadata?.is_ponctual === true || 
         visit.metadata?.is_draft === true ||
         visit.visit_type === 'ponctuelle' ||
         visit.metadata?.ponctual_mode === true;
};

export const requiresVisitPayment = (visit: Visit | null | undefined): boolean => {
  if (!visit) return false;
  return visit.metadata?.requires_payment === true || isVisitDraft(visit);
};

export const getVisitPaymentAmount = (visit: Visit | null | undefined): number => {
  if (!visit) return 0;
  if (visit.metadata?.payment_amount) {
    return visit.metadata.payment_amount;
  }
  return 7500;
};

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

export const isDraftExpired = (visit: Visit | null | undefined): boolean => {
  if (!visit || !isVisitDraft(visit)) return false;
  if (!visit.draft_expires_at) return false;
  
  const expiry = new Date(visit.draft_expires_at);
  const now = new Date();
  return expiry.getTime() <= now.getTime();
};

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

export const canPayVisitPonctual = (
  visit: Visit | null | undefined
): boolean => {
  if (!visit) return false;
  if (!isVisitDraft(visit)) return false;
  return true;
};

// =============================================
// COMMANDE HELPERS
// =============================================
export const isOrderPendingPayment = (order: any | null | undefined): boolean => {
  if (!order) return false;
  return order.status === 'attente_paiement';
};

export const isOrderPonctual = (order: any | null | undefined): boolean => {
  if (!order) return false;
  return order.order_type === 'ponctual' || 
         order.is_ponctual === true || 
         order.metadata?.ponctual_mode === true;
};

export const requiresOrderPayment = (order: any | null | undefined): boolean => {
  if (!order) return false;
  return isOrderPendingPayment(order) || 
         (isOrderPonctual(order) && !order.is_paid);
};

export const isOrderPaid = (order: any | null | undefined): boolean => {
  if (!order) return false;
  return order.is_paid === true || 
         order.metadata?.payment_completed === true ||
         order.metadata?.paid_at !== undefined;
};

export const getOrderPaymentAmount = (order: any | null | undefined): number => {
  if (!order) return 0;
  if (order.metadata?.payment_amount) {
    return order.metadata.payment_amount;
  }
  if (order.estimated_amount) {
    return order.estimated_amount;
  }
  return 2500;
};

// =============================================
// VISITE STATUS HELPERS
// =============================================
export const isVisitCompleted = (visit: Visit | null | undefined): boolean => {
  if (!visit) return false;
  return visit.status === 'terminee';
};

export const isVisitValidated = (visit: Visit | null | undefined): boolean => {
  if (!visit) return false;
  return visit.status === 'validee';
};

export const canStartVisit = (visit: Visit | null | undefined): boolean => {
  if (!visit) return false;
  return visit.status === 'acceptee' || visit.status === 'planifiee';
};

export const canCompleteVisit = (visit: Visit | null | undefined): boolean => {
  if (!visit) return false;
  return visit.status === 'en_cours';
};

export const canCancelVisit = (visit: Visit | null | undefined): boolean => {
  if (!visit) return false;
  return ['planifiee', 'en_attente', 'brouillon'].includes(visit.status);
};

export const canApproveVisit = (visit: Visit | null | undefined): boolean => {
  if (!visit) return false;
  return visit.status === 'planifiee';
};

export const isVisitUsingSubscription = (visit: Visit | null | undefined): boolean => {
  if (!visit) return false;
  return visit.metadata?.subscription_id !== null && 
         visit.metadata?.subscription_id !== undefined && 
         visit.metadata?.subscription_used === true;
};

export const isVisitPonctualMode = (visit: Visit | null | undefined): boolean => {
  if (!visit) return false;
  return visit.metadata?.ponctual_mode === true || 
         visit.metadata?.is_ponctual === true;
};

// =============================================
// ABONNEMENT HELPERS
// =============================================
export const isSubscriptionActive = (subscription: any | null | undefined): boolean => {
  if (!subscription) return false;
  if (subscription.status !== 'actif') return false;

  const today = new Date();
  const endDate = new Date(subscription.end_date);
  return endDate >= today;
};

export const hasAvailableVisits = (subscription: any | null | undefined): boolean => {
  if (!subscription) return false;
  if (!isSubscriptionActive(subscription)) return false;
  return (subscription.remaining_visits || 0) > 0;
};

export const hasAvailableOrders = (subscription: any | null | undefined): boolean => {
  if (!subscription) return false;
  if (!isSubscriptionActive(subscription)) return false;
  return (subscription.remaining_orders || 0) > 0;
};

// =============================================
// SOFT DELETE
// =============================================
const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

export const softDeleteVisit = async (visitId: string): Promise<boolean> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) throw new Error('Non authentifié');

    const response = await fetch(`${API_URL}/visits/${visitId}/soft-delete`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ deleted_at: new Date().toISOString() }),
    });

    if (!response.ok) throw new Error('Erreur lors de la suppression');

    return true;
  } catch (error) {
    console.error('❌ Soft delete error:', error);
    toast.error('Erreur lors de la suppression');
    return false;
  }
};

// ============================================================
// ✅ UNIQUE : DECODEUR GPS GOOGLE MAPS CORRIGÉ & ENCAPSULÉ
// ============================================================
export const extractCoordinatesFromGoogleMaps = (text: string): { lat: number; lng: number } | null => {
  if (!text) return null;

  const regexAt = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
  const regexQuery = /[?&](?:q|query|saddr|daddr|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/;
  const regexRaw = /^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/;

  let match = text.match(regexAt);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }

  match = text.match(regexQuery);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }

  match = text.match(regexRaw);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }

  return null;
};

// =============================================
// EXPORT PAR DÉFAUT
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
  isOrderPaid,
  getOrderPaymentAmount,
  isVisitCompleted,
  isVisitValidated,
  canStartVisit,
  canCompleteVisit,
  canCancelVisit,
  canApproveVisit,
  isVisitUsingSubscription,
  isVisitPonctualMode,
  softDeleteVisit,
  isSubscriptionActive,
  hasAvailableVisits,
  hasAvailableOrders,
  extractCoordinatesFromGoogleMaps,  
};
