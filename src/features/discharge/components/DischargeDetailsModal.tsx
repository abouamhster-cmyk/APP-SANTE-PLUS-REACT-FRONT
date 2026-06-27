// 📁 src/features/discharge/components/DischargeDetailsModal.tsx
// 📌 Modal de détails d'une sortie d'hôpital (Version épurée)

import { useState } from 'react';
import { X, Calendar, Clock, Hospital, Stethoscope, User, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { useDischargeStore } from '@/stores/dischargeStore';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate } from '@/utils/helpers';
import toast from 'react-hot-toast';

interface DischargeDetailsModalProps {
  discharge: any;
  onClose: () => void;
  onUpdate: () => void;
  colors: any;
}

export const DischargeDetailsModal = ({ discharge, onClose, onUpdate, colors }: DischargeDetailsModalProps) => {
  const { completeDischarge, cancelDischarge } = useDischargeStore();
  const { isFamily, isAidant, isAdminOrCoordinator } = useTerminology();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const getPatientLabel = () => {
    if (isFamily) return 'Proche';
    if (isAidant) return 'Accompagné(e)';
    if (isAdminOrCoordinator) return 'Bénéficiaire';
    return 'Patient';
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending': return { label: 'En attente', color: '#f59e0b', bg: '#f59e0b10' };
      case 'planned': return { label: 'Planifiée', color: '#10b981', bg: '#10b98110' };
      case 'in_progress': return { label: 'En cours', color: '#3b82f6', bg: '#3b82f610' };
      case 'completed': return { label: 'Terminée', color: '#10b981', bg: '#10b98110' };
      case 'cancelled': return { label: 'Annulée', color: '#ef4444', bg: '#ef444410' };
      default: return { label: status, color: '#64748b', bg: '#f1f5f9' };
    }
  };

  const status = getStatusConfig(discharge.status);

  const handleComplete = async () => {
    if (!window.confirm('Confirmer la fin de cette sortie ?')) return;
    setIsSubmitting(true);
    try {
      await completeDischarge(discharge.id, { installation_notes: discharge.coordinator_notes });
      toast.success('Sortie enregistrée comme terminée');
      onUpdate();
      onClose();
    } catch { toast.error('Erreur'); } finally { setIsSubmitting(false); }
  };

  const handleCancel = async () => {
    const reason = prompt('Motif de l\'annulation :');
    if (!reason) return;
    setIsSubmitting(true);
    try {
      await cancelDischarge(discharge.id, reason);
      toast.success('Sortie annulée');
      onUpdate();
      onClose();
    } catch { toast.error('Erreur'); } finally { setIsSubmitting(false); }
  };

  const canComplete = discharge.status === 'in_progress' || discharge.status === 'planned';
  const canCancel = ['pending', 'assessing', 'planned'].includes(discharge.status);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-2">
          <div>
            <h2 className="text-lg font-extrabold" style={{ color: colors.text }}>Détails de la sortie</h2>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
              {getPatientLabel()} : {discharge.patient?.first_name} {discharge.patient?.last_name}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl transition"><X size={20} /></button>
        </div>

        {/* Contenu Scrollable */}
        <div className="p-6 overflow-y-auto space-y-5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full w-max text-[11px] font-bold" style={{ color: status.color, background: status.bg }}>
            {status.label}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InfoItem icon={<Hospital size={14} />} label="Établissement" value={discharge.hospital_name} />
            <InfoItem icon={<Stethoscope size={14} />} label="Service" value={discharge.hospital_service || '-'} />
            <InfoItem icon={<User size={14} />} label="Médecin" value={discharge.doctor_name || '-'} />
            <InfoItem icon={<Calendar size={14} />} label="Date prévue" value={formatDate(discharge.discharge_date)} />
          </div>

          {discharge.coordinator_notes && (
            <div className="p-4 rounded-2xl" style={{ background: colors.primary + '06' }}>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Notes de coordination</p>
              <p className="text-xs leading-relaxed text-gray-600">{discharge.coordinator_notes}</p>
            </div>
          )}

          {/* Actions */}
          {(canComplete || canCancel) && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              {canComplete && (
                <button onClick={handleComplete} disabled={isSubmitting} className="py-3 rounded-xl text-white text-xs font-bold transition hover:opacity-90 flex items-center justify-center gap-1.5" style={{ background: '#10b981' }}>
                  <CheckCircle size={14} /> Confirmer la sortie
                </button>
              )}
              {canCancel && (
                <button onClick={handleCancel} disabled={isSubmitting} className="py-3 rounded-xl text-xs font-bold transition border hover:bg-red-50 flex items-center justify-center gap-1.5" style={{ color: '#ef4444', borderColor: '#ef444440' }}>
                  <X size={14} /> Annuler
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InfoItem = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-2.5">
    <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-xs font-semibold text-gray-700 truncate">{value}</p>
    </div>
  </div>
);
