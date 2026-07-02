// 📁 frontend/src/features/aidants/components/AidantCard.tsx

import { memo, useMemo, useCallback } from 'react';
import {
  Star,
  MapPin,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Award,
} from 'lucide-react';
import { AidantProfile } from '@/types/aidant';
import { cn } from '@/utils/helpers';

// ============================================================
// TYPES
// ============================================================

interface AidantCardProps {
  aidant: AidantProfile;
  onClick: () => void;
  onAssign: () => void;
  colors: any;
  compact?: boolean;
  showActions?: boolean;
}

// ============================================================
// COMPOSANT
// ============================================================

export const AidantCard = memo(({
  aidant,
  onClick,
  onAssign,
  colors,
  compact = false,
  showActions = true
}: AidantCardProps) => {

  // ============================================================
  // CALCULS MEMOISÉS
  // ============================================================

  const status = useMemo(() => {
    if (!aidant.is_available) {
      return { 
        label: 'Indisponible', 
        icon: <AlertCircle size={12} />, 
        color: 'text-red-500', 
        bg: 'bg-red-50' 
      };
    }
    if (aidant.active_assignments >= aidant.max_assignments) {
      return { 
        label: 'Complet', 
        icon: <Clock size={12} />, 
        color: 'text-orange-500', 
        bg: 'bg-orange-50' 
      };
    }
    return { 
      label: 'Disponible', 
      icon: <CheckCircle size={12} />, 
      color: 'text-green-500', 
      bg: 'bg-green-50' 
    };
  }, [aidant.is_available, aidant.active_assignments, aidant.max_assignments]);

  const name = useMemo(() => aidant.user?.full_name || 'Aidant', [aidant.user]);
  const rating = useMemo(() => aidant.avg_rating || 0, [aidant.avg_rating]);
  const missions = useMemo(() => aidant.total_missions || 0, [aidant.total_missions]);
  const zones = useMemo(() => aidant.zones?.slice(0, 2).join(', ') || '—', [aidant.zones]);
  const remaining = useMemo(() => Math.max(0, aidant.max_assignments - aidant.active_assignments), [aidant.max_assignments, aidant.active_assignments]);
  const responseTime = useMemo(() => aidant.average_response_time || '~5', [aidant.average_response_time]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  }, [onClick]);

  const handleAssign = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (aidant.is_available && remaining > 0) {
      onAssign();
    }
  }, [aidant.is_available, remaining, onAssign]);

  // ============================================================
  // RENDU
  // ============================================================

  // Version compacte
  if (compact) {
    return (
      <div
        onClick={handleClick}
        className={cn(
          "w-full bg-white rounded-2xl border p-3 transition-all cursor-pointer",
          "hover:shadow-md active:scale-[0.99]"
        )}
        style={{ borderColor: colors.border }}
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
            style={{ background: colors.primary }}
          >
            {name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate" style={{ color: colors.text }}>
              {name}
            </h4>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="flex items-center gap-0.5">
                <Star size={10} className="text-yellow-400 fill-yellow-400" />
                {rating.toFixed(1)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Briefcase size={10} />
                {missions}
              </span>
              <span>•</span>
              <span className={cn("text-[10px]", status.color)}>
                {status.label}
              </span>
            </div>
          </div>

          {showActions && remaining > 0 && aidant.is_available && (
            <button
              onClick={handleAssign}
              className="px-3 py-1 rounded-lg text-white text-xs font-bold shrink-0"
              style={{ background: colors.primary }}
            >
              Choisir
            </button>
          )}
        </div>
      </div>
    );
  }

  // Version complète
  return (
    <div
      onClick={handleClick}
      className={cn(
        "w-full bg-white rounded-2xl border p-5 transition-all cursor-pointer",
        "hover:shadow-md active:scale-[0.99]"
      )}
      style={{ borderColor: colors.border }}
    >
      {/* ============================================================
      HEADER
      ============================================================ */}
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0"
          style={{ background: colors.primary }}
        >
          {name.charAt(0).toUpperCase()}
        </div>

        {/* Infos principales */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-base truncate" style={{ color: colors.text }}>
                {name}
              </h3>
              <div className="flex items-center gap-2 text-xs mt-0.5 text-gray-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Star size={13} className="text-yellow-400 fill-yellow-400" />
                  {rating.toFixed(1)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Briefcase size={13} />
                  {missions} missions
                </span>
                {aidant.experience_years > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Award size={13} />
                      {aidant.experience_years} ans
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Status badge */}
            <span className={cn(
              "text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1.5 shrink-0 font-medium",
              status.bg,
              status.color
            )}>
              {status.icon}
              {status.label}
            </span>
          </div>

          {/* Spécialités */}
          {aidant.specialties && aidant.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {aidant.specialties.slice(0, 3).map((spec) => (
                <span
                  key={spec}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ background: colors.primary + '12', color: colors.primary }}
                >
                  {spec}
                </span>
              ))}
              {aidant.specialties.length > 3 && (
                <span className="text-[10px] text-gray-400">
                  +{aidant.specialties.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
      INFOS SECONDAIRES
      ============================================================ */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <MapPin size={14} className="text-gray-400" />
          <span className="truncate">{zones}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-gray-400" />
          <span>Temps de réponse : {responseTime} min</span>
        </div>

        <div className="flex items-center gap-1.5">
          <User size={14} className="text-gray-400" />
          <span>
            {aidant.active_assignments || 0}/{aidant.max_assignments || 4} missions
            {remaining > 0 && ` (${remaining} places)`}
          </span>
        </div>
      </div>

      {/* ============================================================
      BIO (si présente)
      ============================================================ */}
      {aidant.bio && (
        <div className="mt-3 p-3 rounded-xl text-xs italic" style={{ background: colors.primary + '05' }}>
          "{aidant.bio}"
        </div>
      )}

      {/* ============================================================
      ACTIONS
      ============================================================ */}
      {showActions && (
        <div className="mt-4 flex gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
          <button
            onClick={handleClick}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition hover:bg-gray-50"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            Voir le profil
          </button>

          {aidant.is_available && remaining > 0 ? (
            <button
              onClick={handleAssign}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90"
              style={{ background: colors.primary }}
            >
              ✅ Choisir cet aidant
            </button>
          ) : (
            <button
              disabled
              className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-not-allowed bg-gray-100 text-gray-400"
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

export default AidantCard;
