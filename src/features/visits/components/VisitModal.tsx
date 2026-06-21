// 📁 src/features/visits/components/VisitModal.tsx
// 📌 Modal de planification d'une visite

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, AlertCircle } from 'lucide-react';
import { Visit, Patient } from '@/types';
import { useVisitStore } from '@/stores/visitStore';
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
  const [isLoading, setIsLoading] = useState(false);
  const colors = getThemeColors('senior');

  // ✅ Jargon dynamique selon le rôle
  const {
    singular,        // "proche" / "personne accompagnée" / "bénéficiaire"
    getCategoryLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

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
    }
  }, [visit, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.patient_id) {
        toast.error(`Veuillez sélectionner un${singular.startsWith('béné') ? ' ' : 'e '}${singular}`);
        setIsLoading(false);
        return;
      }

      const data = {
        patient_id: formData.patient_id,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        duration_minutes: formData.duration_minutes,
        notes: formData.notes || null,
        is_urgent: formData.is_urgent,
        actions: [],
      };

      if (mode === 'create') {
        await createVisit(data);
      } else if (visit) {
        await updateVisit(visit.id, data);
      }
      onSuccess();
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: colors.primary + '20' }}>
          <h2 className="text-xl font-semibold" style={{ color: colors.text }}>
            {mode === 'create' ? 'Planifier une visite' : 'Modifier la visite'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X size={24} />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Patient / Proche */}
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
                required
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
              La visite sera notifiée à l'aidant et à la famille.
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
              disabled={isLoading}
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