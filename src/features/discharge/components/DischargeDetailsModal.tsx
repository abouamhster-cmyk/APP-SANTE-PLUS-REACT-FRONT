// 📁 src/features/discharge/components/DischargeDetailsModal.tsx
// 📌 Modal de détails d'une sortie d'hôpital

import { useState } from 'react';
import { X, Calendar, Clock, Hospital, Stethoscope, User, MapPin, CheckCircle, Edit, Save } from 'lucide-react';
import { useDischargeStore } from '@/stores/dischargeStore';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime } from '@/utils/helpers';
import toast from 'react-hot-toast';

interface DischargeDetailsModalProps {
  discharge: any;
  onClose: () => void;
  onUpdate: () => void;
  colors: any;
}

export const DischargeDetailsModal = ({ discharge, onClose, onUpdate, colors }: DischargeDetailsModalProps) => {
  const { updateDischarge, assignAidant, completeDischarge, cancelDischarge, updateStatus } = useDischargeStore();

  // ✅ Jargon dynamique selon le rôle
  const {
    singular,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState(discharge.coordinator_notes || '');
  const [satisfaction, setSatisfaction] = useState(discharge.satisfaction_rating || 0);
  const [comment, setComment] = useState(discharge.satisfaction_comment || '');

  // ✅ Libellé dynamique pour le patient
  const getPatientLabel = () => {
    if (isFamily) return 'Proche';
    if (isAidant) return 'Personne accompagnée';
    if (isAdminOrCoordinator) return 'Bénéficiaire';
    return 'Patient';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'assessing': return '#2196F3';
      case 'planned': return '#4CAF50';
      case 'in_progress': return '#FF5722';
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '📋 En attente';
      case 'assessing': return '🔍 Évaluation';
      case 'planned': return '📅 Planifiée';
      case 'in_progress': return '🚗 En cours';
      case 'completed': return '✅ Terminée';
      case 'cancelled': return '❌ Annulée';
      default: return status;
    }
  };

  const handleSaveNotes = async () => {
    setIsSubmitting(true);
    try {
      await updateDischarge(discharge.id, { coordinator_notes: notes });
      toast.success('Notes mises à jour');
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Confirmer la fin de la sortie ?')) return;
    setIsSubmitting(true);
    try {
      await completeDischarge(discharge.id, {
        satisfaction_rating: satisfaction,
        satisfaction_comment: comment,
        installation_notes: notes,
      });
      toast.success('Sortie terminée !');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error('Erreur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Motif de l\'annulation :');
    if (!reason) return;
    if (!window.confirm('Confirmer l\'annulation ?')) return;
    setIsSubmitting(true);
    try {
      await cancelDischarge(discharge.id, reason);
      toast.success('Sortie annulée');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error('Erreur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canComplete = discharge.status === 'in_progress' || discharge.status === 'planned';
  const canCancel = ['pending', 'assessing', 'planned'].includes(discharge.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-gray-100">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 flex items-center justify-between p-6 border-b" style={{ borderColor: colors.primary + '20' }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: colors.text }}>🏥 Détails de la sortie</h2>
            <p className="text-xs font-semibold mt-0.5" style={{ color: colors.text + '80' }}>
              {getPatientLabel()} : {discharge.patient?.first_name} {discharge.patient?.last_name}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600 transition-colors duration-150">
            <X size={20} />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-6">
          {/* Statut */}
          <div 
            className="flex items-center gap-3.5 p-4 rounded-2xl border border-l-4" 
            style={{ 
              backgroundColor: getStatusColor(discharge.status) + '08',
              borderColor: getStatusColor(discharge.status) + '20',
              borderLeftColor: getStatusColor(discharge.status)
            }}
          >
            <span className="text-2xl shrink-0">
              {discharge.status === 'pending' ? '📋' :
               discharge.status === 'assessing' ? '🔍' :
               discharge.status === 'planned' ? '📅' :
               discharge.status === 'in_progress' ? '🚗' :
               discharge.status === 'completed' ? '✅' : '❌'}
            </span>
            <div>
              <p className="font-bold text-sm" style={{ color: getStatusColor(discharge.status) }}>
                {getStatusLabel(discharge.status)}
              </p>
              {discharge.completed_at && (
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                  Terminée le {formatDate(discharge.completed_at)}
                </p>
              )}
            </div>
          </div>

          {/* Infos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem icon={<Hospital size={16} />} label="Hôpital" value={discharge.hospital_name} colors={colors} />
            <InfoItem icon={<Stethoscope size={16} />} label="Service" value={discharge.hospital_service || 'Non précisé'} colors={colors} />
            <InfoItem icon={<User size={16} />} label="Médecin" value={discharge.doctor_name || 'Non précisé'} colors={colors} />
            <InfoItem icon={<Calendar size={16} />} label="Date de sortie" value={formatDate(discharge.discharge_date)} colors={colors} />
            <InfoItem icon={<Clock size={16} />} label="Heure" value={discharge.discharge_time || 'Non précisée'} colors={colors} />
            <InfoItem icon={<User size={16} />} label="Aidant assigné" value={discharge.aidant?.user?.full_name || 'Non assigné'} colors={colors} />
          </div>

          {/* Notes */}
          {discharge.coordinator_notes && (
            <div className="p-4 rounded-2xl border border-gray-100" style={{ background: colors.primary + '05' }}>
              <p className="text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: colors.text }}>📝 Notes du coordinateur</p>
              <p className="text-sm leading-relaxed" style={{ color: colors.text + '90' }}>{discharge.coordinator_notes}</p>
            </div>
          )}

          {/* Évaluation */}
          {discharge.status === 'completed' && discharge.satisfaction_rating && (
            <div className="p-4 rounded-2xl border border-green-100" style={{ backgroundColor: '#4CAF5005' }}>
              <p className="text-xs font-bold mb-1.5 uppercase tracking-wider text-green-600">⭐ Évaluation de la prestation</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-green-600">
                  {discharge.satisfaction_rating} <span className="text-xs text-green-400 font-bold">/ 5</span>
                </span>
                {discharge.satisfaction_comment && (
                  <span className="text-xs text-gray-500 italic border-l border-green-100/50 pl-3">« {discharge.satisfaction_comment} »</span>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-5 border-t border-gray-100">
            {canComplete && (
              <button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: '#4CAF50' }}
              >
                <CheckCircle size={16} />
                Terminer la sortie
              </button>
            )}
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors hover:bg-red-50 flex items-center justify-center gap-2"
                style={{ color: '#F44336', border: '1px solid #F44336' }}
              >
                <X size={16} />
                Annuler
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================
// INFO ITEM
// =============================================

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  colors: any;
}

const InfoItem = ({ icon, label, value, colors }: InfoItemProps) => {
  return (
    <div className="flex items-start gap-3">
      <div 
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner" 
        style={{ backgroundColor: colors.primary + '0d', color: colors.primary }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-gray-800 truncate" style={{ color: colors.text }}>{value}</p>
      </div>
    </div>
  );
};
