// 📁 src/components/visits/VisitTracker.tsx

import { useEffect, useState } from 'react';
import { Compass, Play, CheckCircle, Clock, MapPin, Loader2 } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';

interface VisitTrackerProps {
  visit: any;
  onStart: () => Promise<void>;
  onComplete: () => Promise<void>;
  isSubmitting?: boolean;
}

export const VisitTracker = ({
  visit,
  onStart,
  onComplete,
  isSubmitting = false,
}: VisitTrackerProps) => {
  const brand = useBranding();
  const colors = brand.colors;
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  // Calcul du chronomètre de mission en direct
  useEffect(() => {
    if (visit.status !== 'en_cours' || !visit.start_time) return;

    const interval = setInterval(() => {
      const start = new Date(visit.start_time).getTime();
      const now = Date.now();
      const diff = now - start;

      if (diff <= 0) return;

      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      const formatted = [
        String(hrs).padStart(2, '0'),
        String(mins).padStart(2, '0'),
        String(secs).padStart(2, '0'),
      ].join(':');

      setElapsedTime(formatted);
    }, 1000);

    return () => clearInterval(interval);
  }, [visit.status, visit.start_time]);

  const isPlanifiee = visit.status === 'planifiee' || visit.status === 'acceptee';
  const isInProgress = visit.status === 'en_cours';

  return (
    <div className="bg-white rounded-2xl p-4 border shadow-sm space-y-4" style={{ borderColor: colors.primary + '15' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ 
              background: isInProgress ? 'rgba(33, 150, 243, 0.1)' : 'rgba(74, 175, 80, 0.1)',
              color: isInProgress ? '#3B82F6' : '#4CAF50'
            }}
          >
            <Compass size={16} className={isInProgress ? 'animate-spin' : ''} style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm" style={{ color: colors.text }}>Suivi d'itinéraire GPS</h4>
            <p className="text-[10px]" style={{ color: colors.textLight }}>Position partagée en temps réel avec la famille</p>
          </div>
        </div>

        <span 
          className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
            isInProgress ? 'bg-blue-100 text-blue-600 animate-pulse' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {isInProgress ? '● En cours' : 'Prêt'}
        </span>
      </div>

      {/* Chronomètre */}
      {isInProgress && (
        <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-gray-400 animate-pulse" />
            <span className="text-xs font-semibold" style={{ color: colors.textLight }}>Temps de visite</span>
          </div>
          <span className="text-sm font-black tracking-wider font-mono" style={{ color: colors.text }}>
            {elapsedTime}
          </span>
        </div>
      )}

      {/* Position de départ */}
      {visit.location_start && (
        <div className="text-xs space-y-1" style={{ color: colors.textLight }}>
          <p className="flex items-center gap-1.5 font-medium">
            <MapPin size={12} className="text-green-500" />
            Départ enregistré : {visit.location_start.lat.toFixed(4)}, {visit.location_start.lng.toFixed(4)}
          </p>
          {visit.start_time && (
            <p className="text-[10px] pl-4" style={{ color: colors.textLight }}>
              Démarré le {new Date(visit.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}

      {/* Boutons de commande */}
      <div className="flex gap-2">
        {isPlanifiee && (
          <button
            onClick={onStart}
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition hover:opacity-90 shadow-sm"
            style={{ background: '#4CAF50' }}
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Play size={16} />
                Démarrer la visite (GPS actif)
              </>
            )}
          </button>
        )}

        {isInProgress && (
          <button
            onClick={onComplete}
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition hover:opacity-90 shadow-sm"
            style={{ background: colors.primary }}
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <CheckCircle size={16} />
                Terminer et faire le rapport
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default VisitTracker;
