// 📁 frontend/src/features/aidants/components/AidantCard.tsx

import { Star, MapPin, Clock, Briefcase, CheckCircle, AlertCircle, User } from 'lucide-react';
import { AidantProfile } from '@/types/aidantCatalog';

interface AidantCardProps {
  aidant: AidantProfile;
  onClick: () => void;
  onAssign: () => void;
  colors: any;
  compact?: boolean;
}

export const AidantCard = ({ aidant, onClick, onAssign, colors, compact = false }: AidantCardProps) => {
  const getSpecialtyLabel = (specialty: string) => {
    const labels: Record<string, string> = {
      senior: '👴 Senior',
      maman_bebe: '👶 Maman & Bébé',
      accompagnement: '🤝 Accompagnement',
      autre: '📝 Autre',
    };
    return labels[specialty] || specialty;
  };

  const getStatusBadge = () => {
    if (!aidant.is_available) {
      return { label: 'Indisponible', icon: <AlertCircle size={14} />, color: '#EF4444', bg: '#FEF2F2' };
    }
    if (aidant.active_assignments >= aidant.max_assignments) {
      return { label: 'Complet', icon: <AlertCircle size={14} />, color: '#F59E0B', bg: '#FFFBEB' };
    }
    return { label: 'Disponible', icon: <CheckCircle size={14} />, color: '#10B981', bg: '#ECFDF5' };
  };

  const status = getStatusBadge();

  return (
    <div
      className="bg-white rounded-2xl p-5 shadow-sm border transition-all duration-200 cursor-pointer hover:shadow-md"
      style={{ borderColor: colors.border }}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0"
          style={{ background: colors.primary }}
        >
          {aidant.user?.full_name?.charAt(0) || 'A'}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-base truncate" style={{ color: colors.text }}>
                {aidant.user?.full_name}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs flex items-center gap-1" style={{ color: colors.text + '60' }}>
                  <Star size={12} className="fill-yellow-400 text-yellow-400" />
                  {aidant.avg_rating || aidant.rating || 0} ({aidant.total_reviews || 0} avis)
                </span>
                <span className="text-xs text-gray-300">•</span>
                <span className="text-xs flex items-center gap-1" style={{ color: colors.text + '60' }}>
                  <Briefcase size={12} />
                  {aidant.total_missions || 0} missions
                </span>
              </div>
            </div>

            {/* Badge de disponibilité */}
            <span
              className="px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0"
              style={{ background: status.bg, color: status.color }}
            >
              {status.icon}
              {status.label}
            </span>
          </div>

          {/* Spécialités */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {aidant.specialties?.slice(0, 2).map((spec) => (
              <span
                key={spec}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ background: colors.primary + '12', color: colors.primary }}
              >
                {getSpecialtyLabel(spec)}
              </span>
            ))}
            {aidant.specialties?.length > 2 && (
              <span className="text-[10px] text-gray-400">+{aidant.specialties.length - 2}</span>
            )}
          </div>

          {/* Zones et infos */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs" style={{ color: colors.text + '50' }}>
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {aidant.zones?.slice(0, 2).join(', ')}
              {aidant.zones?.length > 2 && ` +${aidant.zones.length - 2}`}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {aidant.average_response_time || '~5'} min
            </span>
            <span className="flex items-center gap-1">
              <User size={12} />
              {aidant.active_assignments || 0}/{aidant.max_assignments || 4} missions
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-4 pt-4 border-t" style={{ borderColor: colors.border }}>
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="flex-1 py-2 rounded-xl text-sm font-medium border transition hover:bg-gray-50"
          style={{ borderColor: colors.border, color: colors.text }}
        >
          Voir profil
        </button>
        {aidant.is_available && aidant.active_assignments < aidant.max_assignments && (
          <button
            onClick={(e) => { e.stopPropagation(); onAssign(); }}
            className="flex-1 py-2 rounded-xl text-white text-sm font-medium transition hover:opacity-90"
            style={{ background: colors.primary }}
          >
            ✅ Choisir
          </button>
        )}
        {!aidant.is_available && (
          <button
            disabled
            className="flex-1 py-2 rounded-xl text-sm font-medium opacity-50 cursor-not-allowed"
            style={{ background: '#E5E7EB', color: '#9CA3AF' }}
          >
            Indisponible
          </button>
        )}
      </div>
    </div>
  );
};
