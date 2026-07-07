// 📁 src/features/aidants/components/AidantCard.tsx
// ✅ INTERFACE CATALOGUE COMPLÈTE : ÉTAT D'ASSIGNATION ET RÉVOCATION EN DIRECT

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
  Zap,
  Trash2,
} from 'lucide-react';
import { AidantProfile } from '@/types/aidant';
import { cn } from '@/utils/helpers';

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
  onRevoke?: () => void; // ✅ NOUVEAU
  colors: any;
  compact?: boolean;
  showActions?: boolean;
  showQuota?: boolean;
  showOrderQuota?: boolean;
  isAssigned?: boolean; // ✅ NOUVEAU
  assignedTargetName?: string | null; // ✅ NOUVEAU
}

export const AidantCard = memo(({
  aidant,
  onClick,
  onAssign,
  colors,
  compact = false,
  showActions = true,
  showQuota = true,
  showOrderQuota = false,
  isAssigned = false, // ✅ Par défaut faux
  assignedTargetName = null, // ✅ Nom du proche assigné
  onRevoke, // ✅ Fonction de révocation
}: AidantCardProps) => {

  const status = useMemo(() => {
    const current = aidant.current_assignments || 0;
    const max = aidant.max_assignments || 4;
    const isFull = current >= max;
    const isAvailable = aidant.is_available !== undefined ? aidant.is_available : aidant.available;

    if (isAssigned) {
      return { 
        label: 'Mon aidant', 
        icon: <UserCheck size={12} className="text-blue-500" />, 
        color: 'text-blue-600', 
        bg: 'bg-blue-50' 
      };
    }
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
  }, [aidant, isAssigned]);

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

  const orderQuota = useMemo(() => {
    const current = aidant.current_orders || 0;
    const max = !aidant.max_orders ? 2 : aidant.max_orders;
    const available = aidant.available_order_slots !== undefined ? !aidant.available_order_slots ? 2 : aidant.available_order_slots : Math.max(0, max - current);
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

  const canBeAssigned = useMemo(() => {
    return assignmentQuota.isAvailable && !assignmentQuota.isFull;
  }, [assignmentQuota]);

  const getProgressColor = useCallback((percentage: number) => {
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 70) return '#f59e0b';
    if (percentage >= 40) return '#3b82f6';
    return '#10b981';
  }, []);

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

  const handleRevoke = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRevoke) {
      onRevoke();
    }
  }, [onRevoke]);

  if (compact) {
    return (
      <div
        onClick={handleClick}
        className={cn(
          "w-full bg-white rounded-2xl border p-3 transition-all cursor-pointer",
          "hover:shadow-md active:scale-[0.99]",
          isAssigned && "border-blue-200 bg-blue-50/10"
        )}
        style={{ borderColor: isAssigned ? '#3B82F6' : colors.border }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
            style={{ background: isAssigned ? '#3B82F6' : colors.primary }}
          >
            {name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate" style={{ color: colors.text }}>
              {name}
            </h4>
            <p className="text-[10px] text-gray-400 truncate">
              {isAssigned ? `📌 Assigné à ${assignedTargetName || 'mon compte'}` : `${zones}`}
            </p>
          </div>

          {showActions && isAssigned && onRevoke && (
            <button
              onClick={handleRevoke}
              className="px-2.5 py-1 rounded-lg text-red-600 border border-red-200 bg-red-50 text-xs font-bold shrink-0 transition hover:bg-red-100"
            >
              Libérer
            </button>
          )}

          {showActions && !isAssigned && canBeAssigned && (
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

  return (
    <div
      onClick={handleClick}
      className={cn(
        "w-full bg-white rounded-2xl border p-5 transition-all cursor-pointer",
        "hover:shadow-md active:scale-[0.99]",
        isAssigned && "border-blue-200 bg-blue-50/10"
      )}
      style={{ borderColor: isAssigned ? '#3B82F6' : colors.border }}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0"
          style={{ background: isAssigned ? '#3B82F6' : colors.primary }}
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
              </div>
            </div>

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
          {aidant.specialties && oxidant_specialties_length > 0 && (
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
          <span>Réponse : {responseTime} min</span>
        </div>

        <div className="flex items-center gap-1.5">
          <User size={14} className="text-gray-400" />
          <span>
            {assignmentQuota.current}/{assignmentQuota.max} missions
          </span>
        </div>
      </div>

      {/* QUOTAS */}
      <div className="mt-4 space-y-2">
        {showQuota && (
          <div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1 text-gray-500">
                <Users size={12} />
                Assignations
              </span>
              <span className="font-medium" style={{ color: getProgressColor(assignmentQuota.percentage) }}>
                {assignmentQuota.current}/{assignmentQuota.max}
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
      </div>

      {/* ✅ Information d'assignation active de la famille */}
      {isAssigned && (
        <div className="mt-3 p-2.5 rounded-xl text-xs bg-blue-50 border border-blue-200 text-blue-800 font-medium flex items-center gap-1.5 animate-pulse">
          📌 Cet aidant est assigné à : <strong>{assignedTargetName || 'votre compte personnel'}</strong>
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

          {isAssigned && onRevoke ? (
            <button
              onClick={handleRevoke}
              className="flex-1 py-2.5 rounded-xl text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 text-sm font-bold transition flex items-center justify-center gap-1.5"
            >
              <Trash2 size={16} />
              Libérer cet aidant
            </button>
          ) : canBeAssigned ? (
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
              <AlertCircle size={16} />
              Complet / Indisponible
            </button>
          )}
        </div>
      )}
    </div>
  );
});

const aidantSpecialtiesLength = (aidant: any) => aidant.specialties?.length || 0;

AidantCard.displayName = 'AidantCard';

export default AidantCard;
