// 📁 src/components/visits/VisitCard.tsx
// 📌 Carte d'une visite

import { Calendar, Clock, MapPin, User, Play, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Visit } from '@/types';
import { getThemeColors } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate } from '@/utils/helpers';

interface VisitCardProps {
  visit: Visit;
  onStart?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onView?: () => void;
  onClick?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

export const VisitCard = ({ 
  visit, 
  onStart, 
  onComplete, 
  onCancel, 
  onView,
  onClick,
  showActions = false,
  compact = false 
}: VisitCardProps) => {
  const colors = getThemeColors('senior');
  
  // ✅ Jargon dynamique selon le rôle
  const { isFamily, isAidant, isAdminOrCoordinator } = useTerminology();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planifiee': return '#4CAF50';
      case 'en_cours': return '#FF9800';
      case 'terminee': return '#2196F3';
      case 'validee': return '#9C27B0';
      case 'annulee': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planifiee': return 'Planifiée';
      case 'en_cours': return 'En cours';
      case 'terminee': return 'Terminée';
      case 'validee': return 'Validée';
      case 'annulee': return 'Annulée';
      default: return status;
    }
  };

  return (
    <div 
      className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border-l-4 cursor-pointer hover:border-[var(--color-primary)]/50"
      style={{ borderLeftColor: getStatusColor(visit.status) }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
            {visit.patient?.first_name} {visit.patient?.last_name}
          </h3>
          <div className="flex items-center space-x-3 mt-1">
            <span 
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ 
                background: getStatusColor(visit.status) + '20',
                color: getStatusColor(visit.status),
              }}
            >
              {getStatusLabel(visit.status)}
            </span>
            {visit.is_urgent && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#F44336' + '20', color: '#F44336' }}>
                ⚠️ Urgent
              </span>
            )}
            {visit.aidant && (
              <span className="text-xs" style={{ color: colors.text + '60' }}>
                🧑‍⚕️ {visit.aidant.user?.full_name || 'Non assigné'}
              </span>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          {showActions && visit.status === 'planifiee' && onStart && (isAidant || isAdminOrCoordinator) && (
            <button
              onClick={(e) => { e.stopPropagation(); onStart(); }}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-white text-sm font-medium transition hover:opacity-80"
              style={{ background: '#4CAF50' }}
            >
              <Play size={16} />
              <span>Démarrer</span>
            </button>
          )}
          {showActions && visit.status === 'en_cours' && onComplete && (isAidant || isAdminOrCoordinator) && (
            <button
              onClick={(e) => { e.stopPropagation(); onComplete(); }}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-white text-sm font-medium transition hover:opacity-80"
              style={{ background: '#2196F3' }}
            >
              <CheckCircle size={16} />
              <span>Terminer</span>
            </button>
          )}
          {showActions && visit.status === 'planifiee' && onCancel && isAdminOrCoordinator && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancel(); }}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-white text-sm font-medium transition hover:opacity-80"
              style={{ background: '#F44336' }}
            >
              <XCircle size={16} />
              <span>Annuler</span>
            </button>
          )}
          {onView && (
            <button
              onClick={(e) => { e.stopPropagation(); onView(); }}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <Eye size={20} style={{ color: colors.text + '60' }} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div className="flex items-center space-x-2 text-sm" style={{ color: colors.text + '80' }}>
          <Calendar size={16} />
          <span>{formatDate(visit.scheduled_date)}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm" style={{ color: colors.text + '80' }}>
          <Clock size={16} />
          <span>{visit.scheduled_time}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm" style={{ color: colors.text + '80' }}>
          <MapPin size={16} />
          <span>{visit.patient?.address}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm" style={{ color: colors.text + '80' }}>
          <User size={16} />
          <span>{visit.aidant?.user?.full_name || 'Non assigné'}</span>
        </div>
      </div>

      {visit.notes && (
        <div className="mt-3 p-3 rounded-xl" style={{ background: colors.primary + '08' }}>
          <p className="text-sm" style={{ color: colors.text + '80' }}>{visit.notes}</p>
        </div>
      )}
    </div>
  );
};