// 📁 src/features/discharge/components/DischargeRequestModal.tsx
// 📌 Modal de demande de sortie d'hôpital  

import { useState } from 'react';
import { X, Hospital, Calendar, Clock, Stethoscope, User, CheckCircle, Loader2 } from 'lucide-react';
import { useDischargeStore } from '@/stores/dischargeStore';
import { useTerminology } from '@/hooks/useTerminology';
import toast from 'react-hot-toast';

interface DischargeRequestModalProps {
  patients: any[];
  onClose: () => void;
  onSuccess: () => void;
  colors: any;
}

export const DischargeRequestModal = ({ patients, onClose, onSuccess, colors }: DischargeRequestModalProps) => {
  const { createDischarge } = useDischargeStore();
  const { isFamily, isAidant, isAdminOrCoordinator } = useTerminology();

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
    if (!formData.patient_id) return toast.error(`Sélectionnez un ${getPatientLabel().toLowerCase()}`);
    if (!formData.hospital_name.trim()) return toast.error("Nom de l'hôpital requis");
    if (!formData.discharge_date) return toast.error("Date de sortie requise");

    setIsSubmitting(true);
    try {
      await createDischarge(formData);
      toast.success('Demande transmise avec succès');
      onSuccess();
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-2">
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: colors.text }}>Demande de sortie</h2>
            <p className="text-xs text-gray-400 font-medium">Planifiez votre retour à domicile sereinement</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl transition"><X size={20} /></button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: colors.text }}>{getPatientLabel()} *</label>
            <select
              value={formData.patient_id}
              onChange={(e) => setFormData(prev => ({ ...prev, patient_id: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border outline-none text-xs focus:ring-1 transition"
              style={{ borderColor: colors.border, background: '#f9f9f9', color: colors.text }}
            >
              <option value="">Sélectionner...</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField icon={<Hospital size={16}/>} label="Nom de l'hôpital *" value={formData.hospital_name} onChange={(v) => setFormData(prev => ({...prev, hospital_name: v}))} placeholder="Ex: CNHU" />
            <InputField icon={<Stethoscope size={16}/>} label="Service" value={formData.hospital_service} onChange={(v) => setFormData(prev => ({...prev, hospital_service: v}))} placeholder="Ex: Chirurgie" />
            <InputField icon={<User size={16}/>} label="Médecin référent" value={formData.doctor_name} onChange={(v) => setFormData(prev => ({...prev, doctor_name: v}))} placeholder="Dr. Nom" />
            <InputField type="date" icon={<Calendar size={16}/>} label="Date de sortie *" value={formData.discharge_date} onChange={(v) => setFormData(prev => ({...prev, discharge_date: v}))} />
          </div>

          <div className="p-3.5 rounded-2xl text-[11px]" style={{ background: colors.primary + '08', color: colors.text + '90' }}>
            📋 Une fois validée, un coordinateur vous contactera pour organiser l'accompagnement.
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl text-white font-bold transition hover:opacity-95 flex items-center justify-center gap-2"
            style={{ background: colors.primary }}
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
            {isSubmitting ? 'Envoi...' : 'Envoyer la demande'}
          </button>
        </form>
      </div>
    </div>
  );
};

interface InputFieldProps { icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; }
const InputField = ({ icon, label, value, onChange, placeholder, type = "text" }: InputFieldProps) => (
  <div>
    <label className="block text-xs font-bold mb-1.5 opacity-80">{label}</label>
    <div className="relative">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-3 rounded-2xl border outline-none text-xs focus:ring-1 transition"
        style={{ borderColor: '#e5e7eb', background: '#f9f9f9' }}
      />
    </div>
  </div>
);
