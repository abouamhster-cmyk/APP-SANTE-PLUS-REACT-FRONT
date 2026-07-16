// 📁 src/components/ui/StatusBadge.tsx

import { ReactNode } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Play, 
  Package, 
  Truck, 
  ShoppingBag,
  CreditCard,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useBranding } from '@/hooks/useBranding';

interface StatusBadgeProps {
  status: string;
  type?: 'visit' | 'order' | 'payment' | 'subscription' | 'discharge';
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

// Couleurs de statut (conservées pour la cohérence des badges)
const STATUS_CONFIG: Record<string, { icon: ReactNode; color: string; bg: string; label: string }> = {
  // Visites
  planifiee: { icon: <Calendar size={12} />, color: '#4CAF50', bg: '#4CAF5015', label: 'Planifiée' },
  en_attente: { icon: <Clock size={12} />, color: '#F59E0B', bg: '#F59E0B15', label: 'En attente' },
  en_cours: { icon: <Play size={12} />, color: '#3B82F6', bg: '#3B82F615', label: 'En cours' },
  terminee: { icon: <CheckCircle size={12} />, color: '#8B5CF6', bg: '#8B5CF615', label: 'Terminée' },
  validee: { icon: <CheckCircle size={12} />, color: '#4CAF50', bg: '#4CAF5015', label: 'Validée' },
  annulee: { icon: <XCircle size={12} />, color: '#EF4444', bg: '#EF444415', label: 'Annulée' },
  refusee: { icon: <XCircle size={12} />, color: '#EF4444', bg: '#EF444415', label: 'Refusée' },
  replanifiee: { icon: <Calendar size={12} />, color: '#F59E0B', bg: '#F59E0B15', label: 'Replanifiée' },
  no_show: { icon: <XCircle size={12} />, color: '#795548', bg: '#79554815', label: 'Absent' },
  expire: { icon: <AlertCircle size={12} />, color: '#795548', bg: '#79554815', label: 'Expirée' },
  brouillon: { icon: <CreditCard size={12} />, color: '#F59E0B', bg: '#F59E0B15', label: 'En attente paiement' },
  en_attente_aidant: { icon: <UserPlus size={12} />, color: '#FF5722', bg: '#FF572215', label: 'En attente aidant' },
  
  // Commandes
  creee: { icon: <Package size={12} />, color: '#9E9E9E', bg: '#9E9E9E15', label: 'Créée' },
  disponible: { icon: <AlertCircle size={12} />, color: '#EF4444', bg: '#EF444415', label: 'Disponible' },
  livree: { icon: <Truck size={12} />, color: '#3B82F6', bg: '#3B82F615', label: 'Livrée' },
  attente_paiement: { icon: <CreditCard size={12} />, color: '#8B5CF6', bg: '#8B5CF615', label: 'En attente paiement' },
  
  // Paiements
  valide: { icon: <CheckCircle size={12} />, color: '#4CAF50', bg: '#4CAF5015', label: 'Validé' },
  echoue: { icon: <XCircle size={12} />, color: '#EF4444', bg: '#EF444415', label: 'Échoué' },
  rembourse: { icon: <CheckCircle size={12} />, color: '#9E9E9E', bg: '#9E9E9E15', label: 'Remboursé' },
  
  // Abonnements
  actif: { icon: <CheckCircle size={12} />, color: '#4CAF50', bg: '#4CAF5015', label: 'Actif' },
  suspendu: { icon: <AlertCircle size={12} />, color: '#F59E0B', bg: '#F59E0B15', label: 'Suspendu' },
};

// Fallback
const FALLBACK_CONFIG = { 
  icon: <AlertCircle size={12} />, 
  color: '#9E9E9E', 
  bg: '#9E9E9E15', 
  label: 'Inconnu' 
};

export const StatusBadge = ({ 
  status, 
  type, 
  className, 
  showIcon = true, 
  size = 'md' 
}: StatusBadgeProps) => {
  const brand = useBranding();
  const colors = brand.colors;
  const config = STATUS_CONFIG[status] || FALLBACK_CONFIG;
  
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        sizeClasses[size],
        className
      )}
      style={{
        background: config.bg,
        color: config.color,
      }}
    >
      {showIcon && config.icon}
      {config.label}
    </span>
  );
};

export default StatusBadge;
