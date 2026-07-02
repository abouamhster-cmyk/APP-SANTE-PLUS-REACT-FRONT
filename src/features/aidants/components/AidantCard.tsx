// 📁 AidantCard.tsx

import { memo, useMemo, useCallback } from 'react';
import {
  Star,
  MapPin,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Clock,
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

export const AidantCard = memo(({
  aidant,
  onClick,
  onAssign,
  colors,
  compact = false,
  showActions = true
}: AidantCardProps) => {

  const status = useMemo(() => {
    if (!aidant.is_available) {
      return { label: 'Indisponible', icon: <AlertCircle size={12} />, color: 'text-red-500', bg: 'bg-red-50' };
    }
    if (aidant.active_assignments >= aidant.max_assignments) {
      return { label: 'Complet', icon: <Clock size={12} />, color: 'text-orange-500', bg: 'bg-orange-50' };
    }
    return { label: 'Disponible', icon: <CheckCircle size={12} />, color: 'text-green-500', bg: 'bg-green-50' };
  }, [aidant]);

  const name = aidant.user?.full_name || 'Aidant';
  const rating = aidant.avg_rating || 0;
  const missions = aidant.total_missions || 0;
  const zones = aidant.zones?.slice(0, 2).join(', ') || '—';

  const remaining = Math.max(0, aidant.max_assignments - aidant.active_assignments);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  }, [onClick]);

  const handleAssign = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (aidant.is_available && remaining > 0) {
      onAssign();
    }
  }, [aidant, remaining]);

  return (
    <div
      onClick={handleClick}
      className={cn(
        "w-full bg-white rounded-2xl border p-4 transition-all",
        "hover:shadow-md active:scale-[0.99]",
      )}
      style={{ borderColor: colors.border }}
    >

      {/* HEADER */}
      <div className="flex items-center gap-3">

        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0"
          style={{ background: colors.primary }}
        >
          {name.charAt(0).toUpperCase()}
        </div>

        {/* Infos principales */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate" style={{ color: colors.text }}>
            {name}
          </h3>

          {/* rating + missions */}
          <div className="flex items-center gap-2 text-xs mt-1 flex-wrap text-gray-500">
            <span className="flex items-center gap-1">
              <Star size={12} className="text-yellow-400 fill-yellow-400" />
              {rating.toFixed(1)}
            </span>

            <span className="flex items-center gap-1">
              <Briefcase size={12} />
              {missions}
            </span>
          </div>
        </div>

        {/* STATUS */}
        <div className={cn(
          "text-[10px] px-2 py-1 rounded-full flex items-center gap-1 shrink-0",
          status.bg,
          status.color
        )}>
          {status.icon}
          {status.label}
        </div>
      </div>

      {/* INFOS SECONDAIRES */}
      <div className="mt-3 flex flex-col gap-1 text-xs text-gray-500">

        <div className="flex items-center gap-1 truncate">
          <MapPin size={12} />
          {zones}
        </div>

        <div className="flex items-center gap-1">
          <Clock size={12} />
          {aidant.average_response_time || '~5'} min
        </div>

        <div className="flex items-center gap-1">
          {remaining > 0
            ? `${remaining} places dispo`
            : 'Aucune place'}
        </div>
      </div>

      {/* ACTIONS */}
      {showActions && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleClick}
            className="flex-1 py-2 rounded-lg text-sm border"
            style={{ borderColor: colors.border }}
          >
            Profil
          </button>

          {aidant.is_available && remaining > 0 ? (
            <button
              onClick={handleAssign}
              className="flex-1 py-2 rounded-lg text-white text-sm"
              style={{ background: colors.primary }}
            >
              Choisir
            </button>
          ) : (
            <button
              disabled
              className="flex-1 py-2 rounded-lg text-sm bg-gray-200 text-gray-400"
            >
              Indisponible
            </button>
          )}
        </div>
      )}

    </div>
  );
});

AidantCard.displayName = 'AidantCard';
