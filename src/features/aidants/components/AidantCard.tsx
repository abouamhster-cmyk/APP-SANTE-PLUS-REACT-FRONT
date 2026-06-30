// 📁 frontend/src/features/aidants/components/AidantCard.tsx

import { memo, useCallback, useMemo } from 'react';
import { 
  Star, MapPin, Clock, Briefcase, CheckCircle, AlertCircle, 
  User, Phone, Mail, Calendar, Award, TrendingUp 
} from 'lucide-react';
import { AidantProfile } from '@/types/aidant';
import { cn } from '@/utils/helpers';

interface AidantCardProps {
  aidant: AidantProfile;
  onClick: () => void;
  onAssign: () => void;
  colors: any;
  compact?: boolean;
  showActions?: boolean;
}

// ✅ Utilisation de memo pour éviter les re-rendus inutiles
export const AidantCard = memo(({ 
  aidant, 
  onClick, 
  onAssign, 
  colors, 
  compact = false,
  showActions = true 
}: AidantCardProps) => {
  
  // ✅ Utilisation de useMemo pour les calculs coûteux
  const statusBadge = useMemo(() => {
    if (!aidant.is_available) {
      return { label: 'Indisponible', icon: <AlertCircle size={14} />, color: '#EF4444', bg: '#FEF2F2' };
    }
    if (aidant.active_assignments >= aidant.max_assignments) {
      return { label: 'Complet', icon: <AlertCircle size={14} />, color: '#F59E0B', bg: '#FFFBEB' };
    }
    return { label: 'Disponible', icon: <CheckCircle size={14} />, color: '#10B981', bg: '#ECFDF5' };
  }, [aidant.is_available, aidant.active_assignments, aidant.max_assignments]);

  const specialtyLabels = useMemo(() => ({
    senior: '👴 Senior',
    maman_bebe: '👶 Maman & Bébé',
    accompagnement: '🤝 Accompagnement',
    autre: '📝 Autre',
  }), []);

  const getSpecialtyLabel = useCallback((specialty: string) => {
    return specialtyLabels[specialty as keyof typeof specialtyLabels] || specialty;
  }, [specialtyLabels]);

  const displayName = useMemo(() => {
    return aidant.user?.full_name || 'Aidant inconnu';
  }, [aidant.user?.full_name]);

  const displayRating = useMemo(() => {
    return aidant.avg_rating || aidant.rating || 0;
  }, [aidant.avg_rating, aidant.rating]);

  const displayMissions = useMemo(() => {
    return aidant.total_missions || 0;
  }, [aidant.total_missions]);

  const displayZones = useMemo(() => {
    return aidant.zones?.slice(0, 2).join(', ') || 'Non renseigné';
  }, [aidant.zones]);

  const remainingSlots = useMemo(() => {
    return Math.max(0, aidant.max_assignments - aidant.active_assignments);
  }, [aidant.max_assignments, aidant.active_assignments]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  }, [onClick]);

  const handleAssign = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (aidant.is_available && remainingSlots > 0) {
      onAssign();
    }
  }, [aidant.is_available, remainingSlots, onAssign]);

  // ✅ État de chargement ou erreur
  if (!aidant) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5">
        <p className="text-center text-gray-400">Aidant non disponible</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white rounded-2xl p-5 shadow-sm border transition-all duration-200 cursor-pointer hover:shadow-md',
        compact ? 'p-3' : 'p-5'
      )}
      style={{ borderColor: colors.border }}
      onClick={handleClick}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0"
          style={{ background: colors.primary }}
        >
          {displayName.charAt(0).toUpperCase()}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-base truncate" style={{ color: colors.text }}>
                {displayName}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs flex items-center gap-1" style={{ color: colors.text + '60' }}>
                  <Star size={12} className="fill-yellow-400 text-yellow-400" />
                  {displayRating.toFixed(1)} ({aidant.total_reviews || 0} avis)
                </span>
                <span className="text-xs text-gray-300">•</span>
                <span className="text-xs flex items-center gap-1" style={{ color: colors.text + '60' }}>
                  <Briefcase size={12} />
                  {displayMissions} missions
                </span>
                {aidant.experience_years > 0 && (
                  <>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-xs flex items-center gap-1" style={{ color: colors.text + '60' }}>
                      <Award size={12} />
                      {aidant.experience_years} ans
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Badge de disponibilité */}
            <span
              className="px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0"
              style={{ background: statusBadge.bg, color: statusBadge.color }}
            >
              {statusBadge.icon}
              {statusBadge.label}
            </span>
          </div>

          {/* Spécialités */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {aidant.specialties?.slice(0, 3).map((spec) => (
              <span
                key={spec}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ background: colors.primary + '12', color: colors.primary }}
              >
                {getSpecialtyLabel(spec)}
              </span>
            ))}
            {aidant.specialties?.length > 3 && (
              <span className="text-[10px] text-gray-400">+{aidant.specialties.length - 3}</span>
            )}
          </div>

          {/* Zones et infos */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs" style={{ color: colors.text + '50' }}>
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {displayZones}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {aidant.average_response_time || '~5'} min
            </span>
            <span className="flex items-center gap-1">
              <User size={12} />
              {aidant.active_assignments || 0}/{aidant.max_assignments || 4} missions
              {remainingSlots > 0 && ` (${remainingSlots} places)`}
            </span>
          </div>
        </div>
      </div>

      {/* Actions - Conditionnelles */}
      {showActions && (
        <div className="flex gap-3 mt-4 pt-4 border-t" style={{ borderColor: colors.border }}>
          <button
            onClick={handleClick}
            className="flex-1 py-2 rounded-xl text-sm font-medium border transition hover:bg-gray-50"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            Voir profil
          </button>
          {aidant.is_available && remainingSlots > 0 ? (
            <button
              onClick={handleAssign}
              className="flex-1 py-2 rounded-xl text-white text-sm font-medium transition hover:opacity-90"
              style={{ background: colors.primary }}
            >
              ✅ Choisir
            </button>
          ) : (
            <button
              disabled
              className="flex-1 py-2 rounded-xl text-sm font-medium opacity-50 cursor-not-allowed"
              style={{ background: '#E5E7EB', color: '#9CA3AF' }}
            >
              {!aidant.is_available ? 'Indisponible' : 'Complet'}
            </button>
          )}
        </div>
      )}
    </div>
  );
});

AidantCard.displayName = 'AidantCard';
