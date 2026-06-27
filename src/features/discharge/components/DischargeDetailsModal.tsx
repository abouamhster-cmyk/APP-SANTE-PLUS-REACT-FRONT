// 📁 src/features/discharge/components/DischargeDetailsModal.tsx // 📌 Modal de
détails d'une sortie d'hôpital

import { useState } from 'react'; import { X, Calendar, Clock, Hospital,
Stethoscope, User, MapPin, CheckCircle, Edit, Save } from 'lucide-react'; import
{ useDischargeStore } from '@/stores/dischargeStore'; import { useTerminology }
from '@/hooks/useTerminology'; import { formatDate, formatTime } from
'@/utils/helpers'; import toast from 'react-hot-toast';

interface DischargeDetailsModalProps { discharge: any; onClose: () => void;
onUpdate: () => void; colors: any; }

export const DischargeDetailsModal = ({ discharge, onClose, onUpdate, colors }:
DischargeDetailsModalProps) => { const { updateDischarge, assignAidant,
completeDischarge, cancelDischarge, updateStatus } = useDischargeStore();

// ✅ Jargon dynamique selon le rôle const { singular, // "proche" / "personne
accompagnée" / "bénéficiaire" isFamily, isAidant, isAdminOrCoordinator, } =
useTerminology();

const [isEditing, setIsEditing] = useState(false); const [isSubmitting,
setIsSubmitting] = useState(false); const [notes, setNotes] =
useState(discharge.coordinator_notes || ''); const [satisfaction,
setSatisfaction] = useState(discharge.satisfaction_rating || 0); const [comment,
setComment] = useState(discharge.satisfaction_comment || '');

// ✅ Libellé dynamique pour le patient const getPatientLabel = () => { if
(isFamily) return 'Proche'; if (isAidant) return 'Personne accompagnée'; if
(isAdminOrCoordinator) return 'Bénéficiaire'; return 'Patient'; };

const getStatusColor = (status: string) => { switch (status) { case 'pending':
return '#FF9800'; case 'assessing': return '#2196F3'; case 'planned': return
'#4CAF50'; case 'in_progress': return '#FF5722'; case 'completed': return
'#4CAF50'; case 'cancelled': return '#F44336'; default: return '#9E9E9E'; } };

const getStatusLabel = (status: string) => { switch (status) { case 'pending':
return '📋 En attente'; case 'assessing': return '🔍 Évaluation'; case 'planned':
return '📅 Planifiée'; case 'in_progress': return '🚗 En cours'; case 'completed':
return '✅ Terminée'; case 'cancelled': return '❌ Annulée'; default: return
status; } };

const handleSaveNotes = async () => { setIsSubmitting(true); try { await
updateDischarge(discharge.id, { coordinator_notes: notes });
toast.success('Notes mises à jour'); setIsEditing(false); onUpdate(); } catch
(error) { toast.error('Erreur lors de la mise à jour'); } finally {
setIsSubmitting(false); } };

const handleComplete = async () => { if (!window.confirm('Confirmer la fin de la
sortie ?')) return; setIsSubmitting(true); try { await
completeDischarge(discharge.id, { satisfaction_rating: satisfaction,
satisfaction_comment: comment, installation_notes: notes, });
toast.success('Sortie terminée !'); onUpdate(); onClose(); } catch (error) {
toast.error('Erreur'); } finally { setIsSubmitting(false); } };

const handleCancel = async () => { const reason = prompt('Motif de l'annulation
:'); if (!reason) return; if (!window.confirm('Confirmer l'annulation ?'))
return; setIsSubmitting(true); try { await cancelDischarge(discharge.id,
reason); toast.success('Sortie annulée'); onUpdate(); onClose(); } catch (error)
{ toast.error('Erreur'); } finally { setIsSubmitting(false); } };

const canComplete = discharge.status === 'in_progress' || discharge.status ===
'planned'; const canCancel = ['pending', 'assessing',
'planned'].includes(discharge.status);

return (   {/* Header */} <div className="sticky top-0 bg-white z-10 flex
items-center justify-between p-6 border-b" style={{ borderColor: colors.primary
+ '20' }}>  <h2 className="text-xl font-bold" style={{ color: colors.text }}> 🏥
Détails de la sortie  <p className="text-sm" style={{ color: colors.text + '60'
}}> {getPatientLabel()} : {discharge.patient?.first_name}
{discharge.patient?.last_name}      

    {/* Contenu */}
    <div className="p-6 space-y-6">
      {/* Statut */}
      <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: getStatusColor(discharge.status) + '10' }}>
        <span className="text-2xl">
          {discharge.status === 'pending' ? '📋' :
           discharge.status === 'assessing' ? '🔍' :
           discharge.status === 'planned' ? '📅' :
           discharge.status === 'in_progress' ? '🚗' :
           discharge.status === 'completed' ? '✅' : '❌'}
        </span>
        <div>
          <p className="font-bold" style={{ color: getStatusColor(discharge.status) }}>
            {getStatusLabel(discharge.status)}
          </p>
          {discharge.completed_at && (
            <p className="text-xs" style={{ color: colors.text + '50' }}>
              Terminée le {formatDate(discharge.completed_at)}
            </p>
          )}
        </div>
      </div>

      {/* Infos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoItem icon={<Hospital size={18} />} label="Hôpital" value={discharge.hospital_name} />
        <InfoItem icon={<Stethoscope size={18} />} label="Service" value={discharge.hospital_service || 'Non précisé'} />
        <InfoItem icon={<User size={18} />} label="Médecin" value={discharge.doctor_name || 'Non précisé'} />
        <InfoItem icon={<Calendar size={18} />} label="Date de sortie" value={formatDate(discharge.discharge_date)} />
        <InfoItem icon={<Clock size={18} />} label="Heure" value={discharge.discharge_time || 'Non précisée'} />
        <InfoItem icon={<User size={18} />} label="Aidant assigné" value={discharge.aidant?.user?.full_name || 'Non assigné'} />
      </div>

      {/* Notes */}
      {discharge.coordinator_notes && (
        <div className="p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
          <p className="text-sm font-bold mb-1" style={{ color: colors.text }}>📝 Notes du coordinateur</p>
          <p className="text-sm" style={{ color: colors.text + '70' }}>{discharge.coordinator_notes}</p>
        </div>
      )}

      {/* Évaluation */}
      {discharge.status === 'completed' && discharge.satisfaction_rating && (
        <div className="p-4 rounded-xl" style={{ background: '#4CAF5010' }}>
          <p className="text-sm font-bold mb-1" style={{ color: '#4CAF50' }}>⭐ Évaluation</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-green-600">{discharge.satisfaction_rating}/5</span>
            {discharge.satisfaction_comment && (
              <span className="text-sm text-gray-500">« {discharge.satisfaction_comment} »</span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
        {canComplete && (
          <button
            onClick={handleComplete}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-xl text-white font-bold transition hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: '#4CAF50' }}
          >
            <CheckCircle size={18} />
            Terminer la sortie
          </button>
        )}
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-xl font-bold transition hover:bg-red-50 flex items-center justify-center gap-2"
            style={{ color: '#F44336', border: '1px solid #F44336' }}
          >
            <X size={18} />
            Annuler
          </button>
        )}
      </div>
    </div>
  </div>
</div>

); };

// ============================================= // INFO ITEM //
=============================================

interface InfoItemProps { icon: React.ReactNode; label: string; value: string; }

const InfoItem = ({ icon, label, value }: InfoItemProps) => { return (   {icon} 
 {label} {value}   ); };
