// 📁 src/features/journal/components/VisitDetailsModal.tsx
// 📌 Modal de détails d'une visite

import { X, Calendar, Clock, User, MapPin, Image, Music, FileText, Star, CheckCircle } from 'lucide-react';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime } from '@/utils/helpers';

interface VisitDetailsModalProps {
  visit: any;
  onClose: () => void;
  colors: any;
}

export const VisitDetailsModal = ({ visit, onClose, colors }: VisitDetailsModalProps) => {
  // ✅ Jargon dynamique selon le rôle
  const {
    singular,        // "proche" / "personne accompagnée" / "bénéficiaire"
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const hasPhotos = visit.photos && visit.photos.length > 0;
  const hasAudio = visit.audio_url;

  // ✅ Libellé dynamique pour le patient
  const getPatientLabel = () => {
    if (isFamily) return 'Proche';
    if (isAidant) return 'Personne accompagnée';
    if (isAdminOrCoordinator) return 'Bénéficiaire';
    return 'Patient';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b" style={{ borderColor: colors.primary + '20' }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: colors.text }}>
              📋 Détails de la visite
            </h2>
            <p className="text-sm" style={{ color: colors.text + '60' }}>
              {formatDate(visit.date)} à {visit.time}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X size={24} />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-6">
          {/* Personne */}
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
              style={{ background: colors.primary }}
            >
              {visit.patient?.first_name?.[0]}{visit.patient?.last_name?.[0]}
            </div>
            <div>
              <h3 className="font-bold text-lg" style={{ color: colors.text }}>
                {visit.patient?.first_name} {visit.patient?.last_name}
              </h3>
              <p className="text-sm" style={{ color: colors.text + '60' }}>
                {getPatientLabel()} • {visit.patient?.address || 'Adresse non renseignée'}
              </p>
            </div>
          </div>

          {/* Infos visite */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
            <div className="flex items-center gap-2">
              <Calendar size={18} style={{ color: colors.primary }} />
              <span className="text-sm" style={{ color: colors.text }}>
                {formatDate(visit.date)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={18} style={{ color: colors.primary }} />
              <span className="text-sm" style={{ color: colors.text }}>
                {visit.time}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User size={18} style={{ color: colors.primary }} />
              <span className="text-sm" style={{ color: colors.text }}>
                {visit.aidant?.user?.full_name || 'Aidant non assigné'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={18} style={{ color: visit.status === 'validee' ? '#4CAF50' : '#FF9800' }} />
              <span className="text-sm" style={{ color: visit.status === 'validee' ? '#4CAF50' : '#FF9800' }}>
                {visit.status === 'validee' ? '✅ Validée' : '⏳ En attente'}
              </span>
            </div>
          </div>

          {/* Rating */}
          {visit.rating !== null && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-50">
              <Star className="fill-yellow-400 text-yellow-400" size={20} />
              <span className="font-bold" style={{ color: colors.text }}>
                {visit.rating}/5
              </span>
              {visit.feedback && (
                <span className="text-sm text-gray-500 ml-2">
                  « {visit.feedback} »
                </span>
              )}
            </div>
          )}

          {/* Actions réalisées */}
          {visit.actions && visit.actions.length > 0 && (
            <div>
              <h4 className="font-bold mb-2" style={{ color: colors.text }}>
                📝 Actions réalisées
              </h4>
              <div className="flex flex-wrap gap-2">
                {visit.actions.map((action: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{ background: colors.primary + '12', color: colors.primary }}
                  >
                    {action}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {visit.notes && (
            <div>
              <h4 className="font-bold mb-2" style={{ color: colors.text }}>
                📄 Notes de l'aidant
              </h4>
              <div className="p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
                <p className="text-sm whitespace-pre-wrap" style={{ color: colors.text + '80' }}>
                  {visit.notes}
                </p>
              </div>
            </div>
          )}

          {/* Photos */}
          {hasPhotos && (
            <div>
              <h4 className="font-bold mb-2" style={{ color: colors.text }}>
                📷 Photos ({visit.photos.length})
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {visit.photos.map((photo: string, index: number) => (
                  <div key={index} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-image.png';
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audio */}
          {hasAudio && (
            <div>
              <h4 className="font-bold mb-2" style={{ color: colors.text }}>
                🎙️ Enregistrement audio
              </h4>
              <div className="p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
                <audio controls className="w-full">
                  <source src={visit.audio_url} type="audio/webm" />
                  Votre navigateur ne supporte pas la lecture audio.
                </audio>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-4" style={{ borderColor: colors.border }}>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold transition hover:opacity-80"
            style={{ background: colors.primary + '15', color: colors.primary }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};