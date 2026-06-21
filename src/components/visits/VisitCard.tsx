import { Calendar, Clock, MapPin, User, Play, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Visit } from '@/types';
import { getThemeColors } from '@/lib/permissions';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planifiee': return '#4CAF50';
      case 'en_attente': return '#FF9800';
      case 'en_cours': return '#2196F3';
      case 'terminee': return '#9C27B0';
      case 'validee': return '#4CAF50';
      case 'annulee': return '#F44336';
      case 'replanifiee': return '#FF5722';
      case 'no_show': return '#795548';
      default: return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planifiee': return 'Planifiée';
      case 'en_attente': return 'En attente';
      case 'en_cours': return 'En cours';
      case 'terminee': return 'Terminée';
      case 'validee': return 'Validée';
      case 'annulee': return 'Annulée';
      case 'replanifiee': return 'Replanifiée';
      case 'no_show': return 'Absent';
      default: return status;
    }
  };

  return (
    <div 
      className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all border-l-4 cursor-pointer hover:border-[var(--color-primary)]/50"
      style={{ borderLeftColor: getStatusColor(visit.status) }}
      onClick={onClick}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold truncate" style={{ color: colors.text }}>
            {visit.patient?.first_name} {visit.patient?.last_name}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-1">
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
        
        {/* ✅ Actions selon le rôle */}
        {showActions && (
          <div className="flex flex-wrap gap-2">
            {visit.status === 'planifiee' && onStart && (
              <button
                onClick={(e) => { e.stopPropagation(); onStart(); }}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-white text-xs sm:text-sm font-medium transition hover:opacity-80"
                style={{ background: '#4CAF50' }}
              >
                <Play size={14} />
                <span>Démarrer</span>
              </button>
            )}
            {visit.status === 'en_cours' && onComplete && (
              <button
                onClick={(e) => { e.stopPropagation(); onComplete(); }}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-white text-xs sm:text-sm font-medium transition hover:opacity-80"
                style={{ background: '#2196F3' }}
              >
                <CheckCircle size={14} />
                <span>Terminer</span>
              </button>
            )}
            {visit.status === 'planifiee' && onCancel && (
              <button
                onClick={(e) => { e.stopPropagation(); onCancel(); }}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-white text-xs sm:text-sm font-medium transition hover:opacity-80"
                style={{ background: '#F44336' }}
              >
                <XCircle size={14} />
                <span>Annuler</span>
              </button>
            )}
            {onView && (
              <button
                onClick={(e) => { e.stopPropagation(); onView(); }}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition hover:opacity-80"
                style={{ background: colors.primary + '15', color: colors.primary }}
              >
                <Eye size={14} />
                <span>Détails</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-3">
        <div className="flex items-center space-x-1.5 text-xs sm:text-sm" style={{ color: colors.text + '80' }}>
          <Calendar size={14} />
          <span>{formatDate(visit.scheduled_date)}</span>
        </div>
        <div className="flex items-center space-x-1.5 text-xs sm:text-sm" style={{ color: colors.text + '80' }}>
          <Clock size={14} />
          <span>{visit.scheduled_time}</span>
        </div>
        <div className="flex items-center space-x-1.5 text-xs sm:text-sm" style={{ color: colors.text + '80' }}>
          <MapPin size={14} />
          <span className="truncate">{visit.patient?.address}</span>
        </div>
        <div className="flex items-center space-x-1.5 text-xs sm:text-sm" style={{ color: colors.text + '80' }}>
          <User size={14} />
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