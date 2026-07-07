// 📁 src/components/visits/VisitCard.tsx (Version Refactorisée)

import { memo } from 'react';
import { MapPin, Clock } from 'lucide-react';
import { Visit } from '@/types';
import { formatDate } from '@/utils/helpers';

// ============================================================
// TYPES
// ============================================================

interface VisitCardProps {
  visit: Visit;
  onClick?: () => void;
  compact?: boolean;
}

// ============================================================
// CONFIGURATION DES STATUTS
// ============================================================

const getStatusConfig = (status: string) => {
  const configs: Record<string, { color: string; bg: string; label: string }> = {
    planifiee: { color: '#4CAF50', bg: '#4CAF5015', label: 'Planifiée' },
    en_attente: { color: '#FF9800', bg: '#FF980015', label: 'En attente' },
    acceptee: { color: '#2196F3', bg: '#2196F315', label: 'Acceptée' },
    en_cours: { color: '#2196F3', bg: '#2196F315', label: 'En cours' },
    terminee: { color: '#9C27B0', bg: '#9C27B015', label: 'Terminée' },
    validee: { color: '#4CAF50', bg: '#4CAF5015', label: 'Validée' },
    annulee: { color: '#F44336', bg: '#F4433615', label: 'Annulée' },
    refusee: { color: '#F44336', bg: '#F4433615', label: 'Refusée' },
    expire: { color: '#795548', bg: '#79554815', label: 'Expirée' },
    replanifiee: { color: '#FF5722', bg: '#FF572215', label: 'Replanifiée' },
    no_show: { color: '#795548', bg: '#79554815', label: 'Absent' },
    brouillon: { color: '#F59E0B', bg: '#F59E0B15', label: '💳 Paiement requis' },
    attente_paiement: { color: '#8b5cf6', bg: '#8b5cf615', label: 'En attente paiement' },
    en_attente_aidant: { color: '#FF5722', bg: '#FF572215', label: '🦸 En attente aidant' },
  };
  return configs[status] || configs['planifiee'];
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export const VisitCard = memo(({ visit, onClick, compact = false }: VisitCardProps) => {
  const statusConfig = getStatusConfig(visit.status);

  // Version compacte pour les listes
  if (compact) {
    return (
      <div 
        onClick={onClick}
        className="group relative bg-white border border-gray-100 rounded-2xl p-3 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.98]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center font-bold text-[--color-primary] text-sm shrink-0">
              {visit.patient?.first_name?.[0] || 'U'}
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-sm truncate text-gray-900">
                {visit.patient?.first_name} {visit.patient?.last_name}
              </h4>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="flex items-center gap-0.5">
                  <Clock size={11} />
                  {visit.scheduled_time}
                </span>
                <span className="text-gray-300">•</span>
                <span 
                  className="px-1.5 py-0.5 rounded-full text-[9px] font-medium"
                  style={{ background: statusConfig.bg, color: statusConfig.color }}
                >
                  {statusConfig.label}
                </span>
              </div>
            </div>
          </div>
          <button className="text-[--color-primary] font-bold text-sm hover:underline shrink-0">
            Détails →
          </button>
        </div>
      </div>
    );
  }

  // Version complète
  return (
    <div 
      onClick={onClick}
      className="group relative bg-white border border-gray-100 rounded-3xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer active:scale-[0.98]"
    >
      <div className="flex justify-between items-start mb-4">
        {/* En-tête : Badge Status discret + Type */}
        <span 
          className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ background: statusConfig.bg, color: statusConfig.color }}
        >
          {statusConfig.label}
        </span>
        <span className="text-gray-400 text-xs font-medium">
          {formatDate(visit.scheduled_date)}
        </span>
      </div>

      {/* Corps : Nom + Lieu */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center font-bold text-[--color-primary] text-lg">
          {visit.patient?.first_name?.[0] || 'U'}
        </div>
        <div>
          <h3 className="font-black text-gray-900 text-lg">
            {visit.patient?.first_name} {visit.patient?.last_name}
          </h3>
          <p className="text-gray-500 text-sm flex items-center gap-1">
            <MapPin size={12} /> {visit.patient?.address || 'Adresse non renseignée'}
          </p>
        </div>
      </div>

      {/* Pied : Horaire et Bouton Action */}
      <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-700 font-medium">
          <Clock size={16} className="text-[--color-primary]" />
          <span>{visit.scheduled_time}</span>
          <span className="text-xs text-gray-400 font-normal">
            ({visit.duration_minutes || 60} min)
          </span>
        </div>
        <button className="text-[--color-primary] font-bold text-sm hover:underline">
          Détails →
        </button>
      </div>
    </div>
  );
});

VisitCard.displayName = 'VisitCard';

export default VisitCard;
