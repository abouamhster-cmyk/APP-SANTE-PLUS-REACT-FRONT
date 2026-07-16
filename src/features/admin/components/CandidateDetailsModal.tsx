// 📁 src/features/admin/components/CandidateDetailsModal.tsx

import { InfoRow } from '@/components/ui/InfoRow';
import { useBranding } from '@/hooks/useBranding';
import { formatDate } from '@/utils/helpers';
import { MapPin, Calendar, Briefcase, Phone, Mail, User, CheckCircle, XCircle, Clock, X, Check } from 'lucide-react';

interface CandidateDetailsModalProps {
  candidate: any;
  onApprove: () => void;
  onReject: () => void;
  colors?: any;
  isProcessing: boolean;
}

export const CandidateDetailsModal = ({
  candidate,
  onApprove,
  onReject,
  colors: propColors,
  isProcessing,
}: CandidateDetailsModalProps) => {
  const brand = useBranding();
  const colors = propColors || brand.colors;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-4 pb-4 border-b" style={{ borderColor: colors.primary + '15' }}>
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0"
          style={{ background: colors.primary }}
        >
          {candidate.user?.full_name?.charAt(0) || 'A'}
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold truncate" style={{ color: colors.text }}>
            {candidate.user?.full_name || 'Candidat'}
          </h3>
          <p className="text-sm" style={{ color: colors.textLight }}>
            Soumis le {formatDate(candidate.created_at)}
          </p>
        </div>
      </div>

      {/* Grille d'informations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoRow 
          label="📧 Email" 
          value={candidate.user?.email || 'Non renseigné'} 
        />
        <InfoRow 
          label="📱 Téléphone" 
          value={candidate.user?.phone || 'Non renseigné'} 
        />
        <InfoRow 
          label="📍 Adresse" 
          value={candidate.address || 'Non renseignée'} 
        />
        <InfoRow 
          label="📅 Date de naissance" 
          value={candidate.birth_date ? formatDate(candidate.birth_date) : 'Non renseignée'} 
        />
        <InfoRow 
          label="💼 Expérience" 
          value={`${candidate.experience_years || 0} an${candidate.experience_years > 1 ? 's' : ''}`} 
        />
        <InfoRow 
          label="🟢 Disponibilité" 
          value={candidate.available ? '🟢 Disponible' : '🔴 Indisponible'} 
          color={candidate.available ? '#4CAF50' : '#EF4444'}
        />
      </div>

      {/* Spécialités */}
      <div>
        <h4 className="text-sm font-bold mb-2" style={{ color: colors.text }}>
          🎯 Spécialités
        </h4>
        <div className="flex flex-wrap gap-2">
          {candidate.specialties?.map((spec: string) => (
            <span
              key={spec}
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: colors.primary + '10', color: colors.primary }}
            >
              {spec === 'maman_bebe' ? '👶 Maman & Bébé' :
               spec === 'senior' ? '👴 Senior' :
               spec === 'accompagnement' ? '🤝 Accompagnement' :
               spec === 'autre' ? '📝 Autre' :
               spec}
            </span>
          ))}
          {(!candidate.specialties || candidate.specialties.length === 0) && (
            <span className="text-xs" style={{ color: colors.textLight }}>Aucune spécialité renseignée</span>
          )}
        </div>
      </div>

      {/* Zones d'intervention */}
      <div>
        <h4 className="text-sm font-bold mb-2" style={{ color: colors.text }}>
          📍 Zones d'intervention
        </h4>
        <div className="flex flex-wrap gap-2">
          {candidate.zones?.map((zone: string) => (
            <span
              key={zone}
              className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100" style={{ color: colors.textLight }}
            >
              {zone}
            </span>
          ))}
          {(!candidate.zones || candidate.zones.length === 0) && (
            <span className="text-xs" style={{ color: colors.textLight }}>Aucune zone renseignée</span>
          )}
        </div>
      </div>

      {/* Bio */}
      {candidate.bio && (
        <div className="p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
          <h4 className="text-sm font-bold mb-1" style={{ color: colors.text }}>
            📝 Présentation
          </h4>
          <p className="text-sm italic leading-relaxed" style={{ color: colors.textLight }}>
            "{candidate.bio}"
          </p>
        </div>
      )}

      {/* Statut */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium" style={{ color: colors.text }}>
          Statut :
        </span>
        <span
          className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"
          style={{
            background: candidate.status === 'pending' ? '#F59E0B15' :
                       candidate.status === 'approved' ? '#4CAF5015' : '#EF444415',
            color: candidate.status === 'pending' ? '#F59E0B' :
                   candidate.status === 'approved' ? '#4CAF50' : '#EF4444',
          }}
        >
          {candidate.status === 'pending' && <Clock size={12} />}
          {candidate.status === 'approved' && <CheckCircle size={12} />}
          {candidate.status === 'rejected' && <XCircle size={12} />}
          {candidate.status === 'pending' ? 'En attente' :
           candidate.status === 'approved' ? '✅ Approuvé' : '❌ Refusé'}
        </span>
      </div>

      {/* Boutons d'action */}
      {candidate.status === 'pending' && (
        <div className="flex gap-3 pt-4 border-t" style={{ borderColor: colors.primary + '15' }}>
          <button
            onClick={onReject}
            disabled={isProcessing}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-red-200 text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={16} />
            Refuser
          </button>
          <button
            onClick={onApprove}
            disabled={isProcessing}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: colors.primary }}
          >
            <Check size={16} />
            Approuver
          </button>
        </div>
      )}
    </div>
  );
};

export default CandidateDetailsModal;
