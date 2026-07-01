// 📁 src/features/discharge/components/DischargeRequestModalContent.tsx
// 📌 Contenu de la demande de sortie d'hôpital (sans wrapper modal)

import { useState } from 'react';
import { X, Hospital, Calendar, Clock, Stethoscope, User, MapPin, CheckCircle } from 'lucide-react';
import { useDischargeStore } from '@/stores/dischargeStore';
import { useTerminology } from '@/hooks/useTerminology';
import toast from 'react-hot-toast';

interface DischargeRequestModalContentProps {
  patients: any[];
  onSuccess: () => void;
  onCancel: () => void;
  colors: any;
}

export const DischargeRequestModalContent = ({
  patients,
  onSuccess,
  onCancel,
  colors,
}: DischargeRequestModalContentProps) => {
  const { createDischarge } = useDischargeStore();

  const {
    singular,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    hospital_name: '',
    hospital_service: '',
    doctor_name: '',
    discharge_date: '',
    discharge_time: '',
  });

  const getPatientLabel = () => {
    if (isFamily) return 'Proche';
    if (isAidant) return 'Personne accompagnée';
    if (isAdminOrCoordinator) return 'Bénéficiaire';
    return 'Patient';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patient_id) {
      toast.error(`Veuillez sélectionner un${getPatientLabel().startsWith('B') ? ' ' : 'e '}${getPatientLabel().toLowerCase()}`);
      return;
    }

    if (!formData.hospital_name.trim()) {
      toast.error('Veuillez renseigner le nom de l\'hôpital');
      return;
    }

    if (!formData.discharge_date) {
      toast.error('Veuillez renseigner la date de sortie');
      return;
    }

    setIsSubmitting(true);
    try {
      await createDischarge(formData);
      onSuccess();
    } catch (error) {
      toast.error('Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-4">
      {/* Patient / Proche */}
      <div>
        <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: colors.text }}>
          {getPatientLabel()} *
        </label>
        <select
          value={formData.patient_id}
          onChange={(e) => setFormData(prev => ({ ...prev, patient_id: e.target.value }))}
          required
          className="w-full px-4 py-3 rounded-2xl border bg-gray-50/40 outline-none text-sm transition-all focus:bg-white font-medium focus:border-transparent focus:ring-1"
          style={{
            borderColor: colors.border,
            color: colors.text,
            '--tw-ring-color': colors.primary
          } as any}
        >
          <option value="">Sélectionner un{getPatientLabel().startsWith('B') ? ' ' : 'e '}{getPatientLabel().toLowerCase()}</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.first_name} {patient.last_name}
            </option>
          ))}
        </select>
      </div>

      {/* Hôpital */}
      <div>
        <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: colors.text }}>
          Nom de l'hôpital *
        </label>
        <div className="relative">
          <Hospital className="absolute left-4 top-1/2 -translate-y-1/2 size-4" style={{ color: colors.text + '50' }} />
          <input
            type="text"
            value={formData.hospital_name}
            onChange={(e) => setFormData(prev => ({ ...prev, hospital_name: e.target.value }))}
            placeholder="Ex: CNHU, Hôpital de zone..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl border bg-gray-50/40 outline-none text-sm transition-all focus:bg-white font-medium focus:border-transparent focus:ring-1"
            style={{
              borderColor: colors.border,
              color: colors.text,
              '--tw-ring-color': colors.primary
            } as any}
            required
          />
        </div>
      </div>

      {/* Service */}
      <div>
        <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: colors.text }}>
          Service
        </label>
        <div className="relative">
          <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 size-4" style={{ color: colors.text + '50' }} />
          <input
            type="text"
            value={formData.hospital_service}
            onChange={(e) => setFormData(prev => ({ ...prev, hospital_service: e.target.value }))}
            placeholder="Ex: Médecine interne, Chirurgie, Maternité..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl border bg-gray-50/40 outline-none text-sm transition-all focus:bg-white font-medium focus:border-transparent focus:ring-1"
            style={{
              borderColor: colors.border,
              color: colors.text,
              '--tw-ring-color': colors.primary
            } as any}
          />
        </div>
      </div>

      {/* Médecin */}
      <div>
        <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: colors.text }}>
          Médecin référent
        </label>
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4" style={{ color: colors.text + '50' }} />
          <input
            type="text"
            value={formData.doctor_name}
            onChange={(e) => setFormData(prev => ({ ...prev, doctor_name: e.target.value }))}
            placeholder="Dr. Nom du médecin"
            className="w-full pl-11 pr-4 py-3 rounded-2xl border bg-gray-50/40 outline-none text-sm transition-all focus:bg-white font-medium focus:border-transparent focus:ring-1"
            style={{
              borderColor: colors.border,
              color: colors.text,
              '--tw-ring-color': colors.primary
            } as any}
          />
        </div>
      </div>

      {/* Date et heure */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: colors.text }}>
            Date de sortie *
          </label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 size-4" style={{ color: colors.text + '50' }} />
            <input
              type="date"
              value={formData.discharge_date}
              onChange={(e) => setFormData(prev => ({ ...prev, discharge_date: e.target.value }))}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border bg-gray-50/40 outline-none text-sm transition-all focus:bg-white font-medium focus:border-transparent focus:ring-1"
              style={{
                borderColor: colors.border,
                color: colors.text,
                '--tw-ring-color': colors.primary
              } as any}
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: colors.text }}>
            Heure de sortie
          </label>
          <div className="relative">
            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 size-4" style={{ color: colors.text + '50' }} />
            <input
              type="time"
              value={formData.discharge_time}
              onChange={(e) => setFormData(prev => ({ ...prev, discharge_time: e.target.value }))}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border bg-gray-50/40 outline-none text-sm transition-all focus:bg-white font-medium focus:border-transparent focus:ring-1"
              style={{
                borderColor: colors.border,
                color: colors.text,
                '--tw-ring-color': colors.primary
              } as any}
            />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 rounded-2xl border border-gray-100" style={{ background: colors.primary + '05' }}>
        <p className="text-xs font-medium leading-relaxed" style={{ color: colors.text + '80' }}>
          📋 Une fois votre demande validée, un coordinateur vous contactera pour planifier l'accompagnement.
        </p>
      </div>

      {/* Boutons */}
      <div className="flex gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl font-bold text-sm border transition-colors hover:bg-gray-50"
          style={{ borderColor: colors.border, color: colors.text }}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: colors.primary }}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Envoi...
            </>
          ) : (
            <>
              <CheckCircle size={16} />
              Envoyer la demande
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default DischargeRequestModalContent;
