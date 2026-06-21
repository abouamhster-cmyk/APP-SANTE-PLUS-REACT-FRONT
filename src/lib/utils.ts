import { type ClassValue, clsx } from 'clsx';
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

export const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    planifiee: '#4CAF50',
    en_attente: '#FF9800',
    en_cours: '#2196F3',
    terminee: '#9C27B0',
    validee: '#4CAF50',
    annulee: '#F44336',
    creee: '#9E9E9E',
    acceptee: '#2196F3',
    en_preparation: '#FF9800',
    en_livraison: '#FF5722',
    livree: '#4CAF50',
    valide: '#4CAF50',
    echoue: '#F44336',
    rembourse: '#9E9E9E',
  };
  return colors[status] || '#9E9E9E';
};

export const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    planifiee: 'Planifiée',
    en_attente: 'En attente',
    en_cours: 'En cours',
    terminee: 'Terminée',
    validee: 'Validée',
    annulee: 'Annulée',
    creee: 'Créée',
    acceptee: 'Acceptée',
    en_preparation: 'En préparation',
    en_livraison: 'En livraison',
    livree: 'Livrée',
    valide: 'Validé',
    echoue: 'Échoué',
    rembourse: 'Remboursé',
  };
  return labels[status] || status;
};

export const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export const capitalizeFirstLetter = (text: string) => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));