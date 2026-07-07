// 📁 src/features/aidants/components/AidantCard.tsx
// ✅ SÉCURITÉ DE DISPONIBILITÉ : BOUTON ET BANDEAU SYNCHRONISÉS À 100%

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
  Users,
  ShoppingBag,
  UserCheck,
} from 'lucide-react';
import { AidantProfile } from '@/types/aidant';
import { cn } from '@/utils/helpers';

// ============================================================
// TYPES
// ============================================================

interface AidantCardProps {
  aidant: AidantProfile & {
    current_assignments?: number;
    max_assignments?: number;
    available_slots?: number;
    is_available?: boolean;
    current_orders?: number;
    max_orders?: number;
    available_order_slots?: number;
    can_take_orders?: boolean;
  };
  onClick: () => void;
  onAssign: () => void;
  colors: any;
  compact?: boolean;
  showActions?: boolean;
  showQuota?: boolean;
  showOrderQuota?: boolean;
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
  showActions = true,
  showQuota = true,
  showOrderQuota = false,
}: AidantCardProps) => {

  // ============================================================
  // CALCULS MEMOISÉS (Cohérence BDD + Quota)
  // ============================================================

  const status = useMemo(() => {
    const current = aidant.current_assignments || 0;
    const max = aidant.max_assignments || 4;
    const isFull = current >= max;
    const isAvailable = aidant.is_available !== undefined ? aidant.is_available : aidant.available;

    if (!isAvailable) {
      return { 
        label: 'Indisponible', 
        icon: <AlertCircle size={12} className="text-red-500" />, 
        color: 'text-red-500', 
        bg: 'bg-red-50' 
      };
    }
    if (isFull) {
      return { 
        label: 'Complet', 
        icon: <Clock size={12} className="text-orange-500" />, 
        color: 'text-orange-500', 
        bg: 'bg-orange-50' 
      };
    }
    return { 
      label: 'Disponible', 
      icon: <CheckCircle size={12} className="text-green-500" />, 
      color: 'text-green-500', 
      bg: 'bg-green-50' 
    };
  }, [aidant]);

  // ✅ Quota d'assignations
  const assignmentQuota = useMemo(() => {
    const current = aidant.current_assignments || 0;
    const max = aidant.max_assignments || 4;
    const available = aidant.available_slots !== undefined ? aidant.available_slots : Math.max(0, max - current);
    const isFull = current >= max;
    const isAvailable = aidant.is_available !== undefined ? aidant.is_available : aidant.available;

    return {
      current,
      max,
      available,
      isFull,
      isAvailable,
      percentage: max > 0 ? Math.round((current / max) * 100) : 0,
    };
  }, [aidant]);

  // ✅ Quota de commandes
  const orderQuota = useMemo(() => {
    const current = aidant.current_orders || 0;
    const max = !aidant.max_orders ? 2 : aidant.max_orders;
    const available = aidant.available_order_slots !== undefined ? aidant.available_order_slots : Math.max(0, max - current);
    const isFull = current >= max;
    const canTake = aidant.can_take_orders !== undefined ? aidant.can_take_orders : current < max;

    return {
      current,
      max,
      available,
      isFull,
      canTake,
      percentage: max > 0 ? Math.round((current / max) * 100) : 0,
    };
  }, [aidant]);

  const name = useMemo(() => aidant.user?.full_name || 'Aidant', [aidant.user]);
  const rating = useMemo(() => aidant.avg_rating || aidant.rating || 0, [aidant]);
  const missions = useMemo(() => aidant.total_missions || 0, [aidant.total_missions]);
  const zones = useMemo(() => aidant.zones?.slice(0, 2).join(', ') || '—', [aidant.zones]);
  const responseTime = useMemo(() => aidant.average_response_time || '~5', [aidant.average_response_time]);
  const experience = useMemo(() => aidant.experience_years || 0, [aidant.experience_years]);

  // ✅ Déterminer si l'aidant peut être assigné (Aligné sur le status du haut)
  const canBeAssigned = useMemo(() => {
    return assignmentQuota.isAvailable && !assignmentQuota.isFull;
  }, [assignmentQuota]);

  // ✅ Couleur de la barre de progression
  const getProgressColor = useCallback((percentage: number) => {
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 70) return '#f59e0b';
    if (percentage >= 40) return '#3b82f6';
    return '#10b981';
  }, []);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  }, [onClick]);

  const handleAssign = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (canBeAssigned) {
      onAssign();
    }
  }, [canBeAssigned, onAssign]);

  // ============================================================
  // RENDU - VERSION COMPACTE
  // ============================================================

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
            <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
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

            {/* Quota d'assignations (compact) */}
            {showQuota && (
              <div className="mt-1 flex items-center gap-1.5">
                <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(assignmentQuota.percentage, 100)}%`,
                      background: getProgressColor(assignmentQuota.percentage),
                    }}
                  />
                </div>
                <span className="text-[8px] text-gray-400 font-medium whitespace-nowrap">
                  {assignmentQuota.current}/{assignmentQuota.max}
                </span>
              </div>
            )}
          </div>

          {showActions && canBeAssigned && (
            <button
              onClick={handleAssign}
              className="px-3 py-1 rounded-lg text-white text-xs font-bold shrink-0 transition hover:opacity-80"
              style={{ background: colors.primary }}
            >
              Choisir
            </button>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDU - VERSION COMPLÈTE
  // ============================================================

  return (
    <div
      onClick={handleClick}
      className={cn(
        "w-full bg-white rounded-2xl border p-5 transition-all cursor-pointer",
        "hover:shadow-md active:scale-[0.99]"
      )}
      style={{ borderColor: colors.border }}
    >
      {/* HEADER */}
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
                {experience > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Award size={13} />
                      {experience} ans
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
                  {spec === 'maman_bebe' ? '👶 Maman & Bébé' :
                   spec === 'senior' ? '👴 Senior' :
                   spec === 'accompagnement' ? '🤝 Accompagnement' :
                   spec}
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

      {/* INFOS SECONDAIRES */}
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
          <Users size={14} className="text-gray-400" />
          <span>
            {assignmentQuota.current}/{assignmentQuota.max} missions
            {assignmentQuota.available > 0 && ` (${assignmentQuota.available} places)`}
          </span>
        </div>
      </div>

      {/* QUOTAS (Barres de progression) */}
      <div className="mt-4 space-y-2">
        {/* Quota d'assignations */}
        {showQuota && (
          <div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1 text-gray-500">
                <Users size={12} />
                Assignations
              </span>
              <span className="font-medium" style={{ color: getProgressColor(assignmentQuota.percentage) }}>
                {assignmentQuota.current}/{assignmentQuota.max}
                {assignmentQuota.available > 0 && (
                  <span className="text-gray-400 font-normal ml-1">
                    ({assignmentQuota.available} place{assignmentQuota.available > 1 ? 's' : ''})
                  </span>
                )}
              </span>
            </div>
            <div className="mt-0.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(assignmentQuota.percentage, 100)}%`,
                  background: getProgressColor(assignmentQuota.percentage),
                }}
              />
            </div>
          </div>
        )}

        {/* Quota de commandes */}
        {showOrderQuota && (
          <div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1 text-gray-500">
                <ShoppingBag size={12} />
                Commandes en cours
              </span>
              <span className="font-medium" style={{ color: orderQuota.canTake ? '#4CAF50' : '#F44336' }}>
                {orderQuota.current}/{orderQuota.max}
                {orderQuota.available > 0 && (
                  <span className="text-gray-400 font-normal ml-1">
                    ({orderQuota.available} place{orderQuota.available > 1 ? 's' : ''})
                  </span>
                )}
                {!orderQuota.canTake && (
                  <span className="text-red-500 font-normal ml-1">⚠️</span>
                )}
              </span>
            </div>
            <div className="mt-0.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(orderQuota.percentage, 100)}%`,
                  background: orderQuota.canTake ? '#3b82f6' : '#ef4444',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* BIO */}
      {aidant.bio && (
        <div className="mt-3 p-3 rounded-xl text-xs italic" style={{ background: colors.primary + '05' }}>
          "{aidant.bio}"
        </div>
      )}

      {/* ACTIONS */}
      {showActions && (
        <div className="mt-4 flex gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
          <button
            onClick={handleClick}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition hover:bg-gray-50 flex items-center justify-center gap-1.5"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            <User size={16} />
            Voir le profil
          </button>

          {canBeAssigned ? (
            <button
              onClick={handleAssign}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 flex items-center justify-center gap-1.5"
              style={{ background: colors.primary }}
            >
              <UserCheck size={16} />
              Choisir cet aidant
            </button>
          ) : (
            <button
              disabled
              className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-not-allowed bg-gray-100 text-gray-400 flex items-center justify-center gap-1.5"
            >
              {!assignmentQuota.isAvailable ? (
                <>
                  <AlertCircle size={16} />
                  Indisponible
                </>
              ) : assignmentQuota.isFull ? (
                <>
                  <Clock size={16} />
                  Complet
                </>
              ) : (
                <>
                  <AlertCircle size={16} />
                  Non disponible
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* FOOTER */}
      <div className="mt-3 pt-3 border-t flex flex-wrap items-center gap-3 text-[10px] text-gray-400" style={{ borderColor: colors.border + '40' }}>
        <span className="flex items-center gap-0.5">
          <Users size={10} />
          {assignmentQuota.current}/{assignmentQuota.max} assignations
        </span>
        {showOrderQuota && (
          <span className="flex items-center gap-0.5">
            <ShoppingBag size={10} />
            {orderQuota.current}/{orderQuota.max} commandes
          </span>
        )}
        <span className="flex items-center gap-0.5">
          <Star size={10} className="text-yellow-400 fill-yellow-400" />
          {rating.toFixed(1)}
        </span>
        {aidant.is_verified && (
          <span className="flex items-center gap-0.5 text-green-600">
            <CheckCircle size={10} />
            Vérifié
          </span>
        )}
      </div>
    </div>
  );
});

AidantCard.displayName = 'AidantCard';

export default AidantCard;
