// 📁 src/features/journal/components/VisitDetailsModal.tsx
// 📌 Modal de détails d'une visite

import { X, Calendar, Clock, User, MapPin, Image, Music, FileText, Star, CheckCircle, Award, Mic, Camera, FileCheck, Edit3 } from 'lucide-react';
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
    singular,
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

  // ✅ Icône selon le statut
  const getStatusIcon = (status: string) => {
    if (status === 'validee') {
      return <CheckCircle size={18} className="text-green-500" />;
    }
    if (status === 'en_cours') {
      return <Clock size={18} className="text-blue-500" />;
    }
    if (status === 'terminee') {
      return <FileCheck size={18} className="text-purple-500" />;
    }
    if (status === 'annulee') {
      return <X size={18} className="text-red-500" />;
    }
    return <Clock size={18} className="text-yellow-500" />;
  };

  const getStatusLabel = (status: string) => {
    if (status === 'validee') return 'Validée';
    if (status === 'en_cours') return 'En cours';
    if (status === 'terminee') return 'Terminée';
    if (status === 'annulee') return 'Annulée';
    if (status === 'planifiee') return 'Planifiée';
    return 'En attente';
  };

  const getStatusColor = (status: string) => {
    if (status === 'validee') return '#4CAF50';
    if (status === 'en_cours') return '#2196F3';
    if (status === 'terminee') return '#9C27B0';
    if (status === 'annulee') return '#F44336';
    if (status === 'planifiee') return '#4CAF50';
    return '#FF9800';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header - sticky */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b" style={{ borderColor: colors.primary + '20' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: colors.primary + '10', color: colors.primary }}
            >
              <FileCheck size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: colors.text }}>
                Détails de la visite
              </h2>
              <p className="text-sm" style={{ color: colors.text + '60' }}>
                {formatDate(visit.date)} à {visit.time}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-gray-100 transition"
          >
            <X size={22} style={{ color: colors.text }} />
          </button>
        </div>

        {/* Contenu - scrollable */}
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
              <div className="flex items-center gap-2 text-sm" style={{ color: colors.text + '60' }}>
                <User size={14} />
                <span>{getPatientLabel()}</span>
                <span className="opacity-40">•</span>
                <MapPin size={14} />
                <span>{visit.patient?.address || 'Adresse non renseignée'}</span>
              </div>
            </div>
          </div>

          {/* Infos visite */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
            <div className="flex items-center gap-2">
              <Calendar size={16} style={{ color: colors.primary }} />
              <span className="text-sm" style={{ color: colors.text }}>
                {formatDate(visit.date)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} style={{ color: colors.primary }} />
              <span className="text-sm" style={{ color: colors.text }}>
                {visit.time}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User size={16} style={{ color: colors.primary }} />
              <span className="text-sm" style={{ color: colors.text }}>
                {visit.aidant?.user?.full_name || 'Aidant non assigné'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(visit.status)}
              <span className="text-sm font-medium" style={{ color: getStatusColor(visit.status) }}>
                {getStatusLabel(visit.status)}
              </span>
            </div>
          </div>

          {/* Rating */}
          {visit.rating !== null && (
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#FEF3C7' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#F59E0B20' }}>
                <Star size={16} className="fill-yellow-500 text-yellow-500" />
              </div>
              <div>
                <span className="font-bold" style={{ color: colors.text }}>
                  {visit.rating}/5
                </span>
                {visit.feedback && (
                  <span className="text-sm text-gray-500 ml-2">
                    « {visit.feedback} »
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Actions réalisées */}
          {visit.actions && visit.actions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Edit3 size={16} style={{ color: colors.primary }} />
                <h4 className="font-bold" style={{ color: colors.text }}>
                  Actions réalisées
                </h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {visit.actions.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {visit.actions.map((action: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{ background: colors.primary + '10', color: colors.primary }}
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
              <div className="flex items-center gap-2 mb-3">
                <FileText size={16} style={{ color: colors.primary }} />
                <h4 className="font-bold" style={{ color: colors.text }}>
                  Notes de l'aidant
                </h4>
              </div>
              <div className="p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: colors.text + '80' }}>
                  {visit.notes}
                </p>
              </div>
            </div>
          )}

          {/* Photos */}
          {hasPhotos && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Camera size={16} style={{ color: colors.primary }} />
                <h4 className="font-bold" style={{ color: colors.text }}>
                  Photos
                </h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {visit.photos.length}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {visit.photos.map((photo: string, index: number) => (
                  <div 
                    key={index} 
                    className="aspect-square rounded-xl overflow-hidden bg-gray-100 border border-black/5 cursor-pointer hover:opacity-80 transition"
                    onClick={() => window.open(photo, '_blank')}
                  >
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
              <div className="flex items-center gap-2 mb-3">
                <Mic size={16} style={{ color: colors.primary }} />
                <h4 className="font-bold" style={{ color: colors.text }}>
                  Enregistrement audio
                </h4>
              </div>
              <div className="p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
                <audio controls className="w-full">
                  <source src={visit.audio_url} type="audio/webm" />
                  Votre navigateur ne supporte pas la lecture audio.
                </audio>
              </div>
            </div>
          )}
        </div>

        {/* Footer - sticky */}
        <div className="sticky bottom-0 bg-white border-t p-4" style={{ borderColor: colors.border }}>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold transition hover:opacity-80 flex items-center justify-center gap-2"
            style={{ background: colors.primary + '12', color: colors.primary }}
          >
            <X size={18} />
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
