import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
    en_cours: '#2196F3',
    terminee: '#9C27B0',
    validee: '#4CAF50',
    annulee: '#F44336',
    replanifiee: '#FF5722',
    no_show: '#795548',
    // Commandes
    creee: '#9E9E9E',
    acceptee: '#2196F3',
    en_preparation: '#FF9800',
    en_livraison: '#FF5722',
    livree: '#4CAF50',
    refusee: '#F44336',
    // Paiements - en_attente est déjà défini ci-dessus
    valide: '#4CAF50',
    echoue: '#F44336',
    rembourse: '#9E9E9E',
    en_attente_de_confirmation: '#FF9800',
    // Abonnements
    actif: '#4CAF50',
    expire: '#F44336',
    suspendu: '#FF9800',
    en_cours_de_renouvellement: '#2196F3',
  };
  return colors[status] || '#9E9E9E';
};

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    // Visites
    planifiee: 'Planifiée',
    en_cours: 'En cours',
    terminee: 'Terminée',
    validee: 'Validée',
    annulee: 'Annulée',
    replanifiee: 'Replanifiée',
    no_show: 'Absent',
    // Commandes
    creee: 'Créée',
    acceptee: 'Acceptée',
    en_preparation: 'En préparation',
    en_livraison: 'En livraison',
    livree: 'Livrée',
    refusee: 'Refusée',
    // Paiements - en_attente est déjà défini ci-dessus
    valide: 'Validé',
    echoue: 'Échoué',
    rembourse: 'Remboursé',
    en_attente_de_confirmation: 'En attente de confirmation',
    // Abonnements
    actif: 'Actif',
    expire: 'Expiré',
    suspendu: 'Suspendu',
    en_cours_de_renouvellement: 'En cours de renouvellement',
  };
  return labels[status] || status;
};