// 📁 src/features/aidants/components/AidantCard.tsx
 
import { memo, useMemo, useCallback } from 'react';
import {
  Star,
  MapPin,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Users,
  UserCheck,
  Trash2,
} from 'lucide-react';
import { AidantProfile } from '@/types/aidant';
import { cn } from '@/utils/helpers';
import { useBranding } from '@/hooks/useBranding';

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
  onRevoke?: () => void;
  colors?: any;
  compact?: boolean;
  showActions?: boolean;
  showQuota?: boolean;
  showOrderQuota?: boolean;
  isAssigned?: boolean;
  assignedTargetName?: string | null;
}

export const AidantCard = memo(({
  aidant,
  onClick,
  onAssign,
  colors: propColors,
  compact = false,
  showActions = true,
  showQuota = true,
  isAssigned = false,
  assignedTargetName = null,
  onRevoke,
}: AidantCardProps) => {
  const brand = useBranding();
  const colors = propColors || brand.colors;

  const status = useMemo(() => {
    const current = aidant.current_assignments || 0;
    const max = aidant.max_assignments || 4;
    const isFull = current >= max;
    const isAvailable = aidant.is_available !== undefined ? aidant.is_available : aidant.available;

    if (isAssigned) {
      return { 
        label: 'Mon aidant', 
        icon: <UserCheck size={12} />, 
        color: 'text-blue-600 bg-blue-50/60 border-blue-100', 
      };
    }
    if (!isAvailable) {
      return { 
        label: 'Indisponible', 
        icon: <AlertCircle size={12} />, 
        color: 'text-red-500 bg-red-50/60 border-red-100', 
      };
    }
    if (isFull) {
      return { 
        label: 'Complet', 
        icon: <Clock size={12} />, 
        color: 'text-orange-500 bg-orange-50/60 border-orange-100', 
      };
    }
    return { 
      label: 'Disponible', 
      icon: <CheckCircle size={12} />, 
      color: 'text-green-600 bg-green-50/60 border-green-100', 
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

  const name = useMemo(() => aidant.user?.full_name || 'Aidant', [aidant.user]);
  const rating = useMemo(() => aidant.avg_rating || aidant.rating || 0, [aidant]);
  const missions = useMemo(() => aidant.total_missions || 0, [aidant.total_missions]);
  const zones = useMemo(() => aidant.zones?.slice(0, 2).join(', ') || '—', [aidant.zones]);
  const responseTime = useMemo(() => aidant.average_response_time || '~5', [aidant.average_response_time]);

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

  // RENDU VERSION COMPACTE
  if (compact) {
    return (
      <div
        onClick={handleClick}
        className={cn(
          "w-full bg-white rounded-2xl border p-3.5 transition-all cursor-pointer",
          "hover:shadow-md active:scale-[0.99]",
          isAssigned && "border-blue-200 bg-blue-50/10"
        )}
        style={{ borderColor: isAssigned ? '#3B82F6' : colors.primary + '20' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
            style={{ background: isAssigned ? '#3B82F6' : colors.primary }}
          >
            {name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm truncate" style={{ color: colors.text }}>
              {name}
            </h4>
            <p className="text-[10px] font-semibold truncate mt-0.5" style={{ color: colors.textLight }}>
              {isAssigned ? `📌 Assigné à ${assignedTargetName || 'votre compte'}` : `${zones}`}
            </p>
          </div>

          {showActions && isAssigned && onRevoke && (
            <button
              onClick={handleRevoke}
              className="px-2.5 h-8 rounded-xl text-red-500 border border-red-200 bg-red-50/50 text-xs font-bold shrink-0 transition hover:bg-red-50"
            >
              Libérer
            </button>
          )}

          {showActions && !isAssigned && canBeAssigned && (
            <button
              onClick={handleAssign}
              className="px-3 h-8 rounded-xl text-white text-xs font-bold shrink-0 transition hover:opacity-85"
              style={{ background: colors.primary }}
            >
              Choisir
            </button>
          )}
        </div>
      </div>
    );
  }

  // RENDU VERSION CATALOGUE COMPLÈTE
  return (
    <div
      onClick={handleClick}
      className={cn(
        "w-full bg-white rounded-[2rem] border p-5 transition-all cursor-pointer shadow-sm",
        "hover:shadow-md active:scale-[0.99]",
        isAssigned && "border-blue-200 bg-blue-50/10"
      )}
      style={{ borderColor: isAssigned ? '#3B82F6' : colors.primary + '15' }}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shrink-0 border border-white/10"
          style={{ background: isAssigned ? '#3B82F6' : colors.primary }}
        >
          {name.charAt(0).toUpperCase()}
        </div>

        {/* Infos principales */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-black text-base truncate" style={{ color: colors.text }}>
                {name}
              </h3>
              <div className="flex items-center gap-2 text-xs mt-0.5 flex-wrap font-semibold" style={{ color: colors.textLight }}>
                <span className="flex items-center gap-0.5">
                  <Star size={12} className="text-yellow-400 fill-yellow-400" />
                  {rating.toFixed(1)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Briefcase size={12} />
                  {missions} missions
                </span>
              </div>
            </div>

            <span className={cn(
              "text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 font-bold border",
              status.color
            )}>
              {status.icon}
              {status.label}
            </span>
          </div>

          {/* Spécialités */}
          {aidant.specialties && aidant.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {aidant.specialties.slice(0, 3).map((spec) => (
                <span
                  key={spec}
                  className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: colors.primary + '10', color: colors.primary }}
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

      {/* METADATA SECONDAIRES */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] font-semibold border-t pt-3.5" style={{ color: colors.textLight, borderColor: colors.primary + '10' }}>
        <div className="flex items-center gap-1 min-w-0">
          <MapPin size={13} className="text-gray-400 shrink-0" />
          <span className="truncate">{zones}</span>
        </div>

        <div className="flex items-center gap-1 justify-center">
          <Clock size={13} className="text-gray-400 shrink-0" />
          <span>~{responseTime} min</span>
        </div>

        <div className="flex items-center gap-1 justify-end">
          <User size={13} className="text-gray-400 shrink-0" />
          <span>{assignmentQuota.current}/{assignmentQuota.max} missions</span>
        </div>
      </div>

      {/* JAUGE DE QUOTAS */}
      <div className="mt-4">
        {showQuota && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1 font-bold uppercase tracking-wider" style={{ color: colors.textLight }}>
                <Users size={12} />
                Assignations
              </span>
              <span className="font-extrabold" style={{ color: getProgressColor(assignmentQuota.percentage) }}>
                {assignmentQuota.current}/{assignmentQuota.max}
              </span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
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

      {/* Badge d'assignation stable sans effet clignotant agressif */}
      {isAssigned && (
        <div className="mt-4 p-3 rounded-2xl text-[11px] bg-blue-50 border border-blue-100 text-blue-800 font-bold flex items-center gap-1.5">
          📌 Cet aidant est assigné à : <strong>{assignedTargetName || 'votre compte personnel'}</strong>
        </div>
      )}

      {/* BOUTONS ACTIONS */}
      {showActions && (
        <div className="mt-4 flex gap-2 pt-4 border-t" style={{ borderColor: colors.primary + '10' }}>
          <button
            onClick={handleClick}
            className="flex-1 h-10 rounded-xl text-xs font-bold border transition hover:bg-gray-50 flex items-center justify-center gap-1"
            style={{ borderColor: colors.primary + '20', color: colors.text }}
          >
            <User size={14} />
            Voir le profil
          </button>

          {isAssigned && onRevoke ? (
            <button
              onClick={handleRevoke}
              className="flex-1 h-10 rounded-xl text-red-500 border border-red-200 bg-red-50/50 hover:bg-red-50 text-xs font-bold transition flex items-center justify-center gap-1"
            >
              <Trash2 size={14} />
              Libérer cet aidant
            </button>
          ) : canBeAssigned ? (
            <button
              onClick={handleAssign}
              className="flex-1 h-10 rounded-xl text-white text-xs font-bold transition hover:opacity-90 flex items-center justify-center gap-1"
              style={{ background: colors.primary }}
            >
              <UserCheck size={14} />
              Choisir cet aidant
            </button>
          ) : (
            <button
              disabled
              className="flex-1 h-10 rounded-xl text-xs font-semibold cursor-not-allowed bg-gray-100 text-gray-400 flex items-center justify-center gap-1"
            >
              <AlertCircle size={14} />
              Complet / Indisponible
            </button>
          )}
        </div>
      )}
    </div>
  );
});

AidantCard.displayName = 'AidantCard';
export default AidantCard;
