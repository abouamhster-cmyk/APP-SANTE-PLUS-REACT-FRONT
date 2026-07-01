// 📁 src/features/visits/components/VisitModal.tsx
// 📌 Modal de planification d'une visite - AVEC OPTION PERSONNEL

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, AlertCircle, Users, UserCircle } from 'lucide-react';
import { Visit, Patient } from '@/types';
import { useVisitStore } from '@/stores/visitStore';
import { useAuthStore } from '@/stores/authStore';
import { useTerminology } from '@/hooks/useTerminology';
import { getThemeColors } from '@/lib/permissions';
import toast from 'react-hot-toast';

interface VisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  visit: Visit | null;
  patients: Patient[];
  onSuccess: () => void;
}

export const VisitModal = ({ isOpen, onClose, mode, visit, patients, onSuccess }: VisitModalProps) => {
  const { createVisit, updateVisit } = useVisitStore();
  const { profile } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const colors = getThemeColors('senior');

  // ✅ Jargon dynamique selon le rôle
  const {
    singular,
    getCategoryLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  // ✅ NOUVEAU : Type de cible (Personnel ou Patient)
  const [targetType, setTargetType] = useState<'personal' | 'patient'>('personal');

  const [formData, setFormData] = useState({
    patient_id: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 60,
    notes: '',
    is_urgent: false,
  });

  useEffect(() => {
    if (visit && mode === 'edit') {
      setFormData({
        patient_id: visit.patient_id || '',
        scheduled_date: visit.scheduled_date || '',
        scheduled_time: visit.scheduled_time || '',
        duration_minutes: visit.duration_minutes || 60,
        notes: visit.notes || '',
        is_urgent: visit.is_urgent || false,
      });
      // ✅ Si la visite a un patient, passer en mode patient
      if (visit.patient_id) {
        setTargetType('patient');
      } else {
        setTargetType('personal');
      }
    } else {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toTimeString().slice(0, 5);
      setFormData({
        patient_id: '',
        scheduled_date: today,
        scheduled_time: now,
        duration_minutes: 60,
        notes: '',
        is_urgent: false,
      });
      // ✅ Par défaut, si l'utilisateur a des patients, proposer les deux options
      // Sinon, forcer "Personnel"
      if (patients.length === 0) {
        setTargetType('personal');
      } else {
        setTargetType('personal');
      }
    }
  }, [visit, mode, patients.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // ✅ Vérifier si un patient est sélectionné quand le mode est "patient"
      if (targetType === 'patient' && !formData.patient_id) {
        toast.error(`Veuillez sélectionner un${singular.startsWith('béné') ? ' ' : 'e '}${singular}`);
        setIsLoading(false);
        return;
      }

      // ✅ Déterminer target_type et target_name
      const finalTargetType = targetType;
      const finalTargetName = targetType === 'personal' 
        ? (profile?.full_name || 'Personnel')
        : null;

      const data = {
        patient_id: targetType === 'patient' ? formData.patient_id : null,
        target_type: finalTargetType,
        target_name: finalTargetName,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        duration_minutes: formData.duration_minutes,
        notes: formData.notes || null,
        is_urgent: formData.is_urgent,
        actions: [],
      };

      console.log('📤 Création visite avec données:', data);

      if (mode === 'create') {
        await createVisit(data as any);
      } else if (visit) {
        await updateVisit(visit.id, data as any);
      }
      onSuccess();
    } catch (error: any) {
      console.error('❌ Erreur visite:', error);
      toast.error(error?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const hasPatients = patients.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl border border-black/5">
        {/* En-tête */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: colors.primary + '20' }}>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: colors.text }}>
              {mode === 'create' ? 'Planifier une visite' : 'Modifier la visite'}
            </h2>
            <p className="text-xs" style={{ color: colors.text + '50' }}>
              {targetType === 'personal' ? '👤 Visite personnelle' : `👨‍👩‍👦 Visite pour un ${singular}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X size={24} />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* ✅ NOUVEAU : Choix du destinataire */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text }}>
              Pour qui ?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('personal')}
                className={`p-3 rounded-xl text-xs font-bold transition text-center ${
                  targetType === 'personal'
                    ? 'text-white shadow-sm scale-[1.02]'
                    : 'border bg-gray-50 text-gray-600'
                }`}
                style={{
                  background: targetType === 'personal' ? colors.primary : 'transparent',
                  borderColor: targetType === 'personal' ? colors.primary : colors.border,
                }}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <UserCircle size={16} />
                  <span>👤 Personnel</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setTargetType('patient')}
                disabled={!hasPatients}
                className={`p-3 rounded-xl text-xs font-bold transition text-center ${
                  targetType === 'patient'
                    ? 'text-white shadow-sm scale-[1.02]'
                    : hasPatients
                      ? 'border bg-gray-50 text-gray-600 hover:bg-gray-100'
                      : 'opacity-50 cursor-not-allowed border bg-gray-100 text-gray-400'
                }`}
                style={{
                  background: targetType === 'patient' ? colors.primary : 'transparent',
                  borderColor: targetType === 'patient' ? colors.primary : colors.border,
                }}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Users size={16} />
                  <span>{isFamily ? 'Proche' : isAidant ? 'Personne accompagnée' : 'Bénéficiaire'}</span>
                </div>
              </button>
            </div>
            {!hasPatients && targetType === 'patient' && (
              <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                Aucun proche enregistré. Ajoutez-en un d'abord.
              </p>
            )}
          </div>

          {/* Patient / Proche (uniquement si targetType === 'patient') */}
          {targetType === 'patient' && hasPatients && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                {isFamily ? 'Proche' : isAidant ? 'Personne accompagnée' : 'Bénéficiaire'} *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-5" style={{ color: colors.text + '40' }} />
                <select
                  value={formData.patient_id}
                  onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border outline-none transition focus:ring-2"
                  style={{
                    borderColor: colors.border || '#e5e0d8',
                    background: 'var(--color-background, #f5f0e8)',
                    color: colors.text,
                  }}
                  required={targetType === 'patient'}
                >
                  <option value="">Sélectionner un{singular.startsWith('béné') ? ' ' : 'e '}{singular}</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name} - {getCategoryLabel(patient.category)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ✅ Si targetType === 'personal', afficher le nom du compte */}
          {targetType === 'personal' && (
            <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: colors.primary + '05' }}>
              <UserCircle size={20} style={{ color: colors.primary }} />
              <div>
                <p className="text-sm font-medium" style={{ color: colors.text }}>
                  {profile?.full_name || 'Personnel'}
                </p>
                <p className="text-[10px]" style={{ color: colors.text + '50' }}>
                  Visite personnelle - sans proche
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-5" style={{ color: colors.text + '40' }} />
                <input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border outline-none transition focus:ring-2"
                  style={{
                    borderColor: colors.border || '#e5e0d8',
                    background: 'var(--color-background, #f5f0e8)',
                    color: colors.text,
                  }}
                  required
                />
              </div>
            </div>

            {/* Heure */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Heure *</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-5" style={{ color: colors.text + '40' }} />
                <input
                  type="time"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border outline-none transition focus:ring-2"
                  style={{
                    borderColor: colors.border || '#e5e0d8',
                    background: 'var(--color-background, #f5f0e8)',
                    color: colors.text,
                  }}
                  required
                />
              </div>
            </div>
          </div>

          {/* Durée */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Durée (minutes)</label>
            <select
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
              className="w-full px-4 py-3 rounded-xl border outline-none transition focus:ring-2"
              style={{
                borderColor: colors.border || '#e5e0d8',
                background: 'var(--color-background, #f5f0e8)',
                color: colors.text,
              }}
            >
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 heure</option>
              <option value="90">1h30</option>
              <option value="120">2 heures</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border outline-none transition focus:ring-2 resize-none"
              style={{
                borderColor: colors.border || '#e5e0d8',
                background: 'var(--color-background, #f5f0e8)',
                color: colors.text,
              }}
              rows={3}
              placeholder="Informations complémentaires..."
            />
          </div>

          {/* Urgent */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.is_urgent}
              onChange={(e) => setFormData({ ...formData, is_urgent: e.target.checked })}
              className="w-4 h-4 rounded"
              style={{ accentColor: colors.primary }}
            />
            <label className="text-sm font-medium" style={{ color: colors.text }}>
              ⚠️ Visite urgente
            </label>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start space-x-2 p-3 rounded-xl" style={{ background: colors.primary + '10' }}>
            <AlertCircle size={20} style={{ color: colors.primary }} className="flex-shrink-0 mt-0.5" />
            <p className="text-xs" style={{ color: colors.text + '80' }}>
              {targetType === 'personal'
                ? 'La visite personnelle sera notifiée à l\'aidant assigné à votre compte.'
                : 'La visite sera notifiée à l\'aidant et à la famille du proche.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-medium border transition hover:bg-gray-50"
              style={{ borderColor: colors.border || '#e5e0d8', color: colors.text }}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl text-white font-medium transition hover:opacity-80 flex items-center justify-center"
              style={{ background: colors.primary }}
              disabled={isLoading || (targetType === 'patient' && !formData.patient_id)}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                mode === 'create' ? 'Planifier' : 'Mettre à jour'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
