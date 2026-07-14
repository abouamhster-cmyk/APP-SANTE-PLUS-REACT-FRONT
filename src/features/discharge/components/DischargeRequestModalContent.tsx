// 📁 src/features/discharge/components/DischargeRequestModalContent.tsx
// ✅ FORMULAIRE SORTIE : SELECTION COMPTE PROCHE OU PERSONNEL ET CAPTURE DU WIZARD AVEC ATTRIBUTION D'ERREUR SECURISEE

import { useState } from 'react';
import { Hospital, Calendar, Clock, Stethoscope, User, CheckCircle } from 'lucide-react';
import { useVisitStore } from '@/stores/visitStore';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { useTerminology } from '@/hooks/useTerminology';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

interface DischargeRequestModalContentProps {
  patients: any[];
  onSuccess: () => void;
  onPaymentRequired: (visit: any) => void;
  onWizardRequired: (wizardData: any, pendingData: any) => void; 
  onCancel: () => void;
  colors: any;
}

export const DischargeRequestModalContent = ({
  patients,
  onSuccess,
  onPaymentRequired,
  onWizardRequired,
  onCancel,
  colors,
}: DischargeRequestModalContentProps) => {
  const { createVisit } = useVisitStore();
  const { hasActiveSubscription } = useSubscriptionGuard();

  const {
    getCategoryLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetType, setTargetType] = useState<'personal' | 'patient'>('personal'); 
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

    if (targetType === 'patient' && !formData.patient_id) {
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
    
    // CONSTRUCTION DU PAYLOAD UNIFIÉ
    const payload = {
      patient_id: targetType === 'patient' ? formData.patient_id : null,
      scheduled_date: formData.discharge_date,
      scheduled_time: formData.discharge_time || '10:00:00',
      duration_minutes: 120, // Une sortie dure généralement 2h
      notes: `🏥 SORTIE HÔPITAL - Hôpital : ${formData.hospital_name.trim()}. Service : ${formData.hospital_service.trim() || 'Non renseigné'}. Médecin : ${formData.doctor_name.trim() || 'Non renseigné'}.`,
      is_urgent: false,
      is_ponctual: !hasActiveSubscription, // Si pas d'abonnement, c'est un achat ponctuel payant
      target_type: targetType, 
      metadata: {
        is_discharge: true, // Tag d'aiguillage
        hospital_name: formData.hospital_name.trim(),
        hospital_service: formData.hospital_service.trim() || null,
        doctor_name: formData.doctor_name.trim() || null,
        discharge_date: formData.discharge_date,
        discharge_time: formData.discharge_time || '10:00:00',
      }
    };

    try {
      const response = await createVisit(payload);

      // Si le processus exige un paiement à l'acte
      if (response.requires_payment || response.status === 'brouillon') {
        onPaymentRequired(response);
      } else {
        toast.success('Demande de sortie d\'hôpital créée avec succès !');
        onSuccess();
      }
    } catch (error: any) {
      console.error('Erreur création sortie:', error);
      
      // ✅ CORRECTIF DE PRIORITÉ : Interroger en premier la réponse de l'API (response.data) avant le code générique d'Axios
      const errCode = error.response?.data?.code || error.code;
      const wizardData = error.response?.data?.wizard || error.wizard;

      // REBOND SECURISE WIZARD : Si aucun aidant permanent n'est rattaché, fermer la demande et ouvrir le Wizard
      if (errCode === 'WIZARD_REQUIRED' || errCode === 'ALL_AIDANTS_FULL') {
        onWizardRequired(wizardData, payload);
      } else {
        toast.error(error.message || 'Erreur lors de la création de la demande');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-4 max-w-xl mx-auto">
      {/* Pour qui est cette sortie d'hôpital (Sélecteur mobile confortable) */}
      <div>
        <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: colors.text }}>
          Bénéficiaire de la sortie *
        </label>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            onClick={() => {
              setTargetType('personal');
              setFormData(prev => ({ ...prev, patient_id: '' }));
            }}
            className={cn(
              "h-11 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5",
              targetType === 'personal'
                ? "text-white"
                : "bg-gray-50 text-gray-500 hover:bg-gray-100"
            )}
            style={{
              background: targetType === 'personal' ? colors.primary : 'transparent',
              borderColor: targetType === 'personal' ? colors.primary : colors.border,
            }}
          >
            👤 Pour moi-même
          </button>
          <button
            type="button"
            onClick={() => {
              setTargetType('patient');
              if (patients.length > 0) {
                setFormData(prev => ({ ...prev, patient_id: patients[0].id }));
              }
            }}
            className={cn(
              "h-11 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5",
              targetType === 'patient'
                ? "text-white"
                : "bg-gray-50 text-gray-500 hover:bg-gray-100"
            )}
            style={{
              background: targetType === 'patient' ? colors.primary : 'transparent',
              borderColor: targetType === 'patient' ? colors.primary : colors.border,
            }}
          >
            👨‍👩‍👦 Un proche
          </button>
        </div>

        {targetType === 'patient' && (
          <select
            value={formData.patient_id}
            onChange={(e) => setFormData(prev => ({ ...prev, patient_id: e.target.value }))}
            required={targetType === 'patient'}
            className="w-full h-11 px-4 rounded-xl border bg-gray-50/40 outline-none text-xs font-bold cursor-pointer"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            <option value="">Sélectionner un proche</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.first_name} {patient.last_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Hôpital */}
      <div>
        <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: colors.text }}>
          Nom de l'hôpital *
        </label>
        <div className="relative">
          <Hospital className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={formData.hospital_name}
            onChange={(e) => setFormData(prev => ({ ...prev, hospital_name: e.target.value }))}
            placeholder="Ex: CNHU, Hôpital de zone..."
            className="w-full h-11 pl-11 pr-4 rounded-xl border bg-gray-50/40 outline-none text-xs transition-all focus:bg-white font-medium focus:border-transparent focus:ring-1"
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
          <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={formData.hospital_service}
            onChange={(e) => setFormData(prev => ({ ...prev, hospital_service: e.target.value }))}
            placeholder="Ex: Médecine interne, Chirurgie, Maternité..."
            className="w-full h-11 pl-11 pr-4 rounded-xl border bg-gray-50/40 outline-none text-xs transition-all focus:bg-white font-medium focus:border-transparent focus:ring-1"
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
          <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={formData.doctor_name}
            onChange={(e) => setFormData(prev => ({ ...prev, doctor_name: e.target.value }))}
            placeholder="Dr. Nom du médecin"
            className="w-full h-11 pl-11 pr-4 rounded-xl border outline-none text-xs transition-all focus:bg-white font-medium focus:border-transparent focus:ring-1"
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
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={formData.discharge_date}
              onChange={(e) => setFormData(prev => ({ ...prev, discharge_date: e.target.value }))}
              className="w-full h-11 pl-11 pr-4 rounded-xl border bg-gray-50/40 outline-none text-xs transition-all focus:bg-white font-medium focus:border-transparent focus:ring-1"
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
            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
            <input
              type="time"
              value={formData.discharge_time}
              onChange={(e) => setFormData(prev => ({ ...prev, discharge_time: e.target.value }))}
              className="w-full h-11 pl-11 pr-4 rounded-xl border bg-gray-50/40 outline-none text-xs transition-all focus:bg-white font-medium focus:border-transparent focus:ring-1"
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
          📋 En tant que processus unifié de visite, cette demande consommera 1 crédit de votre forfait d'accompagnement ou activera une validation d'aidant.
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
