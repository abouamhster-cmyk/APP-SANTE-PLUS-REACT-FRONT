// 📁 src/components/visits/VisitCard.tsx
// 📌 Carte d'une visite 

import { Calendar, Clock, MapPin, User, Play, CheckCircle, XCircle, Eye, AlertCircle, UserCheck, Users } from 'lucide-react';
import { Visit } from '@/types';
import { getThemeColors } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate } from '@/utils/helpers';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Illustration } from '@/components/ui/Illustration';

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

  // ✅ Version compacte
  if (compact) {
    return (
      <div 
        className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all border-l-4 cursor-pointer"
        style={{ borderLeftColor: getStatusColor(visit.status) }}
        onClick={onClick}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm truncate" style={{ color: colors.text }}>
                {visit.patient?.first_name} {visit.patient?.last_name}
              </p>
              <span 
                className="px-1.5 py-0.5 rounded-full text-[9px] font-medium"
                style={{ 
                  background: getStatusColor(visit.status) + '20',
                  color: getStatusColor(visit.status),
                }}
              >
                {getStatusLabel(visit.status)}
              </span>
              {visit.is_urgent && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium flex items-center gap-0.5" style={{ background: '#F44336' + '15', color: '#F44336' }}>
                  <AlertCircle size={10} />
                  Urgent
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs mt-1" style={{ color: colors.text + '50' }}>
              <span className="flex items-center gap-0.5">
                <Calendar size={11} />
                {formatDate(visit.scheduled_date)}
              </span>
              <span className="flex items-center gap-0.5">
                <Clock size={11} />
                {visit.scheduled_time}
              </span>
              {visit.aidant && (
                <span className="flex items-center gap-0.5">
                  <UserCheck size={11} />
                  {visit.aidant.user?.full_name || 'Non assigné'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {showActions && visit.status === 'planifiee' && onStart && (isAidant || isAdminOrCoordinator) && (
              <button
                onClick={(e) => { e.stopPropagation(); onStart(); }}
                className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                style={{ background: '#4CAF50' }}
                title="Démarrer"
              >
                <Play size={14} />
              </button>
            )}
            {showActions && visit.status === 'en_cours' && onComplete && (isAidant || isAdminOrCoordinator) && (
              <button
                onClick={(e) => { e.stopPropagation(); onComplete(); }}
                className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                style={{ background: '#2196F3' }}
                title="Terminer"
              >
                <CheckCircle size={14} />
              </button>
            )}
            {onView && (
              <button
                onClick={(e) => { e.stopPropagation(); onView(); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                style={{ color: colors.primary }}
                title="Détails"
              >
                <Eye size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ✅ Version complète
  return (
    <div 
      className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border-l-4 cursor-pointer"
      style={{ borderLeftColor: getStatusColor(visit.status) }}
      onClick={onClick}
    >
      {/* En-tête */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold truncate" style={{ color: colors.text }}>
              {visit.patient?.first_name} {visit.patient?.last_name}
            </h3>
            <span 
              className="px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{ 
                background: getStatusColor(visit.status) + '20',
                color: getStatusColor(visit.status),
              }}
            >
              {getStatusLabel(visit.status)}
            </span>
            {visit.is_urgent && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: '#F44336' + '15', color: '#F44336' }}>
                <AlertCircle size={12} />
                Urgent
              </span>
            )}
          </div>
          {visit.aidant && (
            <div className="flex items-center gap-1.5 mt-1 text-xs" style={{ color: colors.text + '50' }}>
              <UserCheck size={13} />
              <span>{visit.aidant.user?.full_name || 'Non assigné'}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {showActions && visit.status === 'planifiee' && onStart && (isAidant || isAdminOrCoordinator) && (
            <button
              onClick={(e) => { e.stopPropagation(); onStart(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition hover:opacity-80"
              style={{ background: '#4CAF50' }}
            >
              <Play size={14} />
              Démarrer
            </button>
          )}
          {showActions && visit.status === 'en_cours' && onComplete && (isAidant || isAdminOrCoordinator) && (
            <button
              onClick={(e) => { e.stopPropagation(); onComplete(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition hover:opacity-80"
              style={{ background: '#2196F3' }}
            >
              <CheckCircle size={14} />
              Terminer
            </button>
          )}
          {showActions && visit.status === 'planifiee' && onCancel && isAdminOrCoordinator && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancel(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition hover:opacity-80"
              style={{ background: '#F44336' }}
            >
              <XCircle size={14} />
              Annuler
            </button>
          )}
          {onView && (
            <button
              onClick={(e) => { e.stopPropagation(); onView(); }}
              className="p-2 rounded-lg hover:bg-gray-100 transition"
              style={{ color: colors.primary }}
            >
              <Eye size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Informations */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div className="flex items-center gap-2 text-sm" style={{ color: colors.text + '70' }}>
          <Calendar size={15} className="opacity-60" />
          <span>{formatDate(visit.scheduled_date)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: colors.text + '70' }}>
          <Clock size={15} className="opacity-60" />
          <span>{visit.scheduled_time}</span>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: colors.text + '70' }}>
          <MapPin size={15} className="opacity-60" />
          <span className="truncate">{visit.patient?.address}</span>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: colors.text + '70' }}>
          <User size={15} className="opacity-60" />
          <span className="truncate">{visit.aidant?.user?.full_name || 'Non assigné'}</span>
        </div>
      </div>

      {/* Notes */}
      {visit.notes && (
        <div className="mt-3 p-3 rounded-xl" style={{ background: colors.primary + '05' }}>
          <p className="text-sm" style={{ color: colors.text + '70' }}>{visit.notes}</p>
        </div>
      )}

      {/* Badge de type si présent */}
      {visit.visit_type && visit.visit_type !== 'ponctuelle' && (
        <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: colors.primary }}>
          {visit.visit_type === 'permanente' ? (
            <>
              <Users size={13} />
              <span>Visite permanente</span>
            </>
          ) : visit.visit_type === 'intervalle' ? (
            <>
              <Calendar size={13} />
              <span>Visite sur intervalle</span>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};
