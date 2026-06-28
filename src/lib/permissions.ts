// 📁 src/lib/permissions.ts
 
import { UserRole } from '@/types';

// =============================================
// PERMISSIONS PAR RÔLE
// =============================================
export const PERMISSIONS = {
  family: {
    canViewPatients: true,
    canCreatePatients: true,
    canEditPatients: true,
    canDeletePatients: false,
    canViewVisits: true,
    canCreateVisits: true,
    canEditVisits: true,
    canStartVisits: false,
    canCompleteVisits: false,
    canValidateVisits: false,
    canApproveVisits: false,
    canRefuseVisits: false,
    canCancelVisits: true,
    canCreateOrders: true,
    canViewOrders: true,
    canEditOrders: true,
    canManageOrders: false,
    canTakeOrders: false,
    canDeliverOrders: false,
    canSendMessages: true,
    canViewMessages: true,
    canViewBilling: true,
    canManageSubscription: true,
    canViewMap: true,
    canViewEducation: true,
    canManageProfile: true,
    canViewStats: false,
    canManageUsers: false,
    canViewRegistrations: false,
    canProcessRegistrations: false,
    canManageAidants: false,
    canManageCoordinators: false,
    canManageOffers: false,
    canManageSettings: false,
    canViewLogs: false,
  },
  
  aidant: {
    canViewPatients: true,
    canCreatePatients: false,
    canEditPatients: false,
    canDeletePatients: false,
    canViewVisits: true,
    canCreateVisits: false,
    canEditVisits: false,
    canStartVisits: true,
    canCompleteVisits: true,
    canValidateVisits: false,
    canApproveVisits: true,
    canRefuseVisits: true,
    canCancelVisits: false,
    canCreateOrders: false,
    canViewOrders: true,
    canEditOrders: false,
    canManageOrders: false,
    canTakeOrders: true,
    canDeliverOrders: true,
    canSendMessages: true,
    canViewMessages: true,
    canViewBilling: false,
    canManageSubscription: false,
    canViewMap: true,
    canViewEducation: false,
    canManageProfile: true,
    canViewStats: false,
    canManageUsers: false,
    canViewRegistrations: false,
    canProcessRegistrations: false,
    canManageAidants: false,
    canManageCoordinators: false,
    canManageOffers: false,
    canManageSettings: false,
    canViewLogs: false,
  },
  
  coordinator: {
    canViewPatients: true,
    canCreatePatients: true,
    canEditPatients: true,
    canDeletePatients: true,
    canViewVisits: true,
    canCreateVisits: true,
    canEditVisits: true,
    canStartVisits: false,
    canCompleteVisits: false,
    canValidateVisits: true,
    canApproveVisits: false,
    canRefuseVisits: false,
    canCancelVisits: true,
    canCreateOrders: false,
    canViewOrders: true,
    canEditOrders: true,
    canManageOrders: true,
    canTakeOrders: false,
    canDeliverOrders: false,
    canSendMessages: true,
    canViewMessages: true,
    canViewBilling: true,
    canManageSubscription: true,
    canViewMap: true,
    canViewEducation: false,
    canManageProfile: true,
    canViewStats: true,
    canManageUsers: true,
    canViewRegistrations: true,
    canProcessRegistrations: true,
    canManageAidants: true,
    canManageCoordinators: false,
    canManageOffers: true,
    canManageSettings: false,
    canViewLogs: false,
  },
  
  admin: {
    canViewPatients: true,
    canCreatePatients: true,
    canEditPatients: true,
    canDeletePatients: true,
    canViewVisits: true,
    canCreateVisits: true,
    canEditVisits: true,
    canStartVisits: false,
    canCompleteVisits: false,
    canValidateVisits: true,
    canApproveVisits: false,
    canRefuseVisits: false,
    canCancelVisits: true,
    canCreateOrders: false,
    canViewOrders: true,
    canEditOrders: true,
    canManageOrders: true,
    canTakeOrders: false,
    canDeliverOrders: false,
    canSendMessages: true,
    canViewMessages: true,
    canViewBilling: true,
    canManageSubscription: true,
    canViewMap: true,
    canViewEducation: false,
    canManageProfile: true,
    canViewStats: true,
    canManageUsers: true,
    canViewRegistrations: true,
    canProcessRegistrations: true,
    canManageAidants: true,
    canManageCoordinators: true,
    canManageOffers: true,
    canManageSettings: true,
    canViewLogs: true,
  },
};

// =============================================
// HELPERS
// =============================================

export const hasPermission = (
  role: UserRole | null,
  permission: keyof typeof PERMISSIONS.family
): boolean => {
  if (!role) return false;
  const perm = PERMISSIONS[role as keyof typeof PERMISSIONS];
  return perm?.[permission] || false;
};

export const hasAnyPermission = (
  role: UserRole | null,
  permissions: (keyof typeof PERMISSIONS.family)[]
): boolean => {
  if (!role) return false;
  return permissions.some(p => hasPermission(role, p));
};

export const hasAllPermissions = (
  role: UserRole | null,
  permissions: (keyof typeof PERMISSIONS.family)[]
): boolean => {
  if (!role) return false;
  return permissions.every(p => hasPermission(role, p));
};

export const getUserRole = (profile: any): UserRole | null => {
  if (!profile) return null;
  return profile.role as UserRole;
};

export const canManagePatients = (role: UserRole | null): boolean => {
  return role === 'admin' || role === 'coordinator' || role === 'family';
};

export const canManageVisits = (role: UserRole | null): boolean => {
  return role === 'admin' || role === 'coordinator' || role === 'family';
};

export const canManageOrders = (role: UserRole | null): boolean => {
  return role === 'admin' || role === 'coordinator' || role === 'family';
};

export const isAdminOrCoordinator = (role: UserRole | null): boolean => {
  return role === 'admin' || role === 'coordinator';
};

export const isAidant = (role: UserRole | null): boolean => {
  return role === 'aidant';
};

export const isFamily = (role: UserRole | null): boolean => {
  return role === 'family';
};

// =============================================
// THÈMES PAR RÔLE
// =============================================

export type ThemeType = 'senior' | 'maman' | 'aidant' | 'coordinator';

export const getThemeByRole = (
  role: UserRole | null,
  patientCategory?: 'senior' | 'maman_bebe' | null
): ThemeType => {
  if (!role) return 'senior';
  
  if (role === 'admin' || role === 'coordinator') return 'coordinator';
  if (role === 'aidant') return 'aidant';
  
  if (role === 'family') {
    return patientCategory === 'maman_bebe' ? 'maman' : 'senior';
  }
  
  return 'senior';
};

// =============================================
// COULEURS DES THÈMES
// =============================================

export const getThemeColors = (theme: ThemeType | string) => {
  switch (theme) {
    case 'maman':
      return {
        primary: '#e8436a',
        primaryDark: '#c62850',
        primaryLight: '#f06292',
        secondary: '#fce4ec',
        secondaryLight: '#fdf0f3',
        background: '#fff5f7',
        surface: '#ffffff',
        surfaceSoft: '#fff8f9',
        text: '#4a2c2c',
        textLight: '#8a6c6c',
        accent: '#e8436a',
        border: '#f8d4dc',
        gold: '#c9a84c',
        shadow: '0 4px 16px rgba(232, 67, 106, 0.12)',
        shadowHover: '0 8px 32px rgba(232, 67, 106, 0.2)',
        gradient: 'linear-gradient(135deg, #e8436a 0%, #c62850 100%)',
        logo: '/assets/images/logos/logo-maman-icon.png',
        logoText: '/assets/images/logos/logo-maman-text.png',
        banner: '/assets/images/banners/maman-banner.png',
        visitImage: '/assets/images/banners/maman-visit.png',
      };
      
    case 'aidant':
      return {
        primary: '#2c6e5c',
        primaryDark: '#1a4a3a',
        primaryLight: '#3a8a72',
        secondary: '#e8f0ed',
        secondaryLight: '#f0f5f2',
        background: '#f5faf8',
        surface: '#ffffff',
        surfaceSoft: '#f0f7f4',
        text: '#1a3a2e',
        textLight: '#5f766d',
        accent: '#3a8a72',
        border: '#dce8e4',
        gold: '#c9a84c',
        shadow: '0 4px 16px rgba(44, 110, 92, 0.08)',
        shadowHover: '0 8px 32px rgba(44, 110, 92, 0.12)',
        gradient: 'linear-gradient(135deg, #2c6e5c 0%, #1a4a3a 100%)',
        logo: '/assets/images/logos/logo-general-icon.png',
        logoText: '/assets/images/logos/logo-general-text.png',
        banner: '/assets/images/banners/aidant-banner.png',
        visitImage: '/assets/images/banners/aidant-visit.png',
      };
      
    case 'coordinator':
      return {
        primary: '#1a4a3a',
        primaryDark: '#0d2a22',
        primaryLight: '#2a6a4a',
        secondary: '#c9a84c',
        secondaryLight: '#dcc07a',
        background: '#f0f4f8',
        surface: '#ffffff',
        surfaceSoft: '#f5f8fb',
        text: '#1a2a3a',
        textLight: '#5f6f80',
        accent: '#c9a84c',
        border: '#dce4ec',
        gold: '#c9a84c',
        shadow: '0 4px 16px rgba(26, 74, 58, 0.08)',
        shadowHover: '0 8px 32px rgba(26, 74, 58, 0.12)',
        gradient: 'linear-gradient(135deg, #1a4a3a 0%, #0d2a22 100%)',
        logo: '/assets/images/logos/logo-general-icon.png',
        logoText: '/assets/images/logos/logo-general-text.png',
        banner: '/assets/images/banners/coord-banner.png',
        visitImage: '/assets/images/banners/coord-visit.png',
      };
      
    default: // senior
      return {
        primary: '#1a4a3a',
        primaryDark: '#0d2a22',
        primaryLight: '#2a6a4a',
        secondary: '#c9a84c',
        secondaryLight: '#dcc07a',
        background: '#f5f0e8',
        surface: '#ffffff',
        surfaceSoft: '#faf7f1',
        text: '#2d2d2d',
        textLight: '#6b7280',
        accent: '#c9a84c',
        border: '#e5e0d8',
        gold: '#c9a84c',
        shadow: '0 4px 16px rgba(26, 74, 58, 0.08)',
        shadowHover: '0 8px 32px rgba(26, 74, 58, 0.12)',
        gradient: 'linear-gradient(135deg, #1a4a3a 0%, #0d2a22 100%)',
        logo: '/assets/images/logos/logo-general-icon.png',
        logoText: '/assets/images/logos/logo-general-text.png',
        banner: '/assets/images/banners/senior-banner.png',
        visitImage: '/assets/images/banners/senior-visit.png',
      };
  }
};

// =============================================
// STATUS HELPERS - PRODUCTION
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
    attente_paiement: '#8b5cf6',
    // Commandes
    creee: '#9E9E9E',
    disponible: '#F44336',
    livree: '#2196F3',
    // Paiements
    valide: '#4CAF50',
    echoue: '#F44336',
    rembourse: '#9E9E9E',
    en_attente_de_confirmation: '#FF9800',
    // Abonnements
    actif: '#4CAF50',
    suspendu: '#FF9800',
    en_cours_de_renouvellement: '#2196F3',
    // Inscriptions
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
    attente_paiement: 'En attente paiement',
    // Commandes
    creee: 'Créée',
    disponible: 'Disponible',
    livree: 'Livrée',
    // Paiements
    valide: 'Validé',
    echoue: 'Échoué',
    rembourse: 'Remboursé',
    en_attente_de_confirmation: 'En attente de confirmation',
    // Abonnements
    actif: 'Actif',
    expire: 'Expiré',
    suspendu: 'Suspendu',
    en_cours_de_renouvellement: 'En cours de renouvellement',
    // Inscriptions
    info_requise: 'Info requise',
    en_cours_de_traitement: 'En cours de traitement',
  };
  return labels[status] || status;
};

// =============================================
// RÔLE LABELS
// =============================================

export const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    family: '👨‍👩‍👦 Famille',
    aidant: '🦸 Aidant',
    coordinator: '👔 Coordinateur',
    admin: '👑 Administrateur',
  };
  return labels[role] || role;
};

export const getRoleColor = (role: string): string => {
  const colors: Record<string, string> = {
    family: '#1a4a3a',
    aidant: '#2c6e5c',
    coordinator: '#1a4a3a',
    admin: '#1a4a3a',
  };
  return colors[role] || '#9E9E9E';
};
