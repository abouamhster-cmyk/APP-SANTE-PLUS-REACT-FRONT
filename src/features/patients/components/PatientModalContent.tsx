// 📁 src/features/patients/components/PatientModalContent.tsx
// 📌 Contenu du formulaire patient (sans wrapper modal)

import { useEffect, useState } from 'react';
import {
  MapPin,
  Phone,
  AlertCircle,
  User,
  Save,
  UserPlus,
  Edit,
  Calendar,
  UserCircle,
  Heart,
  Baby,
  FileText,
  Pill,
  Stethoscope,
  ShieldAlert,
} from 'lucide-react';

import { Patient, PatientCategory } from '@/types';
import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import { useTerminology } from '@/hooks/useTerminology';
import { useBranding } from '@/hooks/useBranding';
import toast from 'react-hot-toast';

interface PatientModalContentProps {
  mode: 'create' | 'edit';
  patient: Patient | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const PatientModalContent = ({
  mode,
  patient,
  onSuccess,
  onCancel,
}: PatientModalContentProps) => {
  const { createPatient, updatePatient, canManagePatients } = usePatientStore();
  const { profile } = useAuthStore();
  const brand = useBranding();
  const colors = brand.colors;
  
  const {
    singular,
    add,
    edit,
    created,
    updated,
    getCategoryLabel,
  } = useTerminology();

  const [isLoading, setIsLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(true);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    age: '',
    gender: 'male' as 'male' | 'female' | 'other',
    address: '',
    phone: '',
    emergency_contact: '',
    emergency_contact_name: '',
    category: 'senior' as PatientCategory,
    notes: '',
    allergies: '',
    treatments: '',
    conditions: '',
    medical_history: '',
  });

  useEffect(() => {
    const canManage = canManagePatients();
    if (profile?.role === 'aidant' || !canManage) {
      setIsAuthorized(false);
      toast.error('Vous n\'avez pas les droits pour gérer les patients');
      setTimeout(() => onCancel(), 1500);
      return;
    }
    setIsAuthorized(true);
  }, [profile, canManagePatients, onCancel]);

  useEffect(() => {
    if (patient && mode === 'edit') {
      setFormData({
        first_name: patient.first_name || '',
        last_name: patient.last_name || '',
        age: patient.age?.toString() || '',
        gender: (patient.gender as 'male' | 'female' | 'other') || 'male',
        address: patient.address || '',
        phone: patient.phone || '',
        emergency_contact: patient.emergency_contact || '',
        emergency_contact_name: patient.emergency_contact_name || '',
        category: patient.category || 'senior',
        notes: patient.notes || '',
        allergies: patient.allergies || '',
        treatments: patient.treatments || '',
        conditions: patient.conditions || '',
        medical_history: patient.medical_history || '',
      });
      return;
    }

    setFormData({
      first_name: '',
      last_name: '',
      age: '',
      gender: 'male',
      address: '',
      phone: '',
      emergency_contact: '',
      emergency_contact_name: '',
      category: 'senior',
      notes: '',
      allergies: '',
      treatments: '',
      conditions: '',
      medical_history: '',
    });
  }, [patient, mode]);

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canManagePatients() || profile?.role === 'aidant') {
      toast.error('Vous n\'avez pas les droits pour effectuer cette action');
      return;
    }

    if (!formData.first_name.trim()) {
      toast.error('Veuillez renseigner le prénom');
      return;
    }

    if (!formData.last_name.trim()) {
      toast.error('Veuillez renseigner le nom');
      return;
    }

    if (!formData.address.trim()) {
      toast.error('Veuillez renseigner l’adresse ou le quartier');
      return;
    }

    setIsLoading(true);

    try {
      const data: Partial<Patient> = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        gender: formData.gender,
        address: formData.address.trim(),
        phone: formData.phone.trim() || null,
        emergency_contact: formData.emergency_contact.trim() || null,
        emergency_contact_name: formData.emergency_contact_name.trim() || null,
        category: formData.category,
        notes: formData.notes.trim() || null,
        allergies: formData.allergies.trim() || null,
        treatments: formData.treatments.trim() || null,
        conditions: formData.conditions.trim() || null,
        medical_history: formData.medical_history.trim() || null,
      };

      if (mode === 'create') {
        await createPatient(data);
        toast.success(created);
      } else if (patient) {
        await updatePatient(patient.id, data);
        toast.success(updated);
      }

      onSuccess();
    } catch (error: any) {
      console.error(`❌ Erreur enregistrement ${singular}:`, error);
      toast.error(error.message || `Erreur lors de l'enregistrement`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: colors.primary + '15' }}>
          <ShieldAlert size={32} style={{ color: colors.primary }} />
        </div>
        <h3 className="text-lg font-bold" style={{ color: colors.text }}>
          ⛔ Accès non autorisé
        </h3>
        <p className="text-sm mt-2" style={{ color: colors.textLight }}>
          Vous n'avez pas les droits pour gérer les patients.
        </p>
        <button
          onClick={onCancel}
          className="mt-4 px-6 py-2 rounded-xl text-white font-bold"
          style={{ background: colors.primary }}
        >
          Retour
        </button>
      </div>
    );
  }

  const modalTitle = mode === 'create' ? add : edit;
  const modalDescription = mode === 'create'
    ? 'Renseignez les informations utiles.'
    : `Mettez à jour les informations du ${singular}.`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-4">
      {/* IDENTITÉ */}
      <section className="space-y-4">
        <SectionHeader
          title="Identité"
          description="Informations principales."
          colors={colors}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Prénom"
            required
            value={formData.first_name}
            onChange={(value) => updateField('first_name', value)}
            colors={colors}
          />

          <InputField
            label="Nom"
            required
            value={formData.last_name}
            onChange={(value) => updateField('last_name', value)}
            colors={colors}
          />

          <InputField
            label="Âge"
            type="number"
            min="0"
            value={formData.age}
            onChange={(value) => updateField('age', value)}
            colors={colors}
            icon={<Calendar size={18} />}
          />

          <SelectField
            label="Sexe"
            value={formData.gender}
            onChange={(value) =>
              updateField('gender', value as 'male' | 'female' | 'other')
            }
            colors={colors}
          >
            <option value="male">Homme</option>
            <option value="female">Femme</option>
            <option value="other">Autre</option>
          </SelectField>
        </div>
      </section>

      {/* CONTACT */}
      <section className="space-y-4">
        <SectionHeader
          title="Adresse et contact"
          description="Coordonnées utiles pour l’accompagnement."
          colors={colors}
        />

        <InputField
          label="Adresse / Quartier"
          required
          value={formData.address}
          onChange={(value) => updateField('address', value)}
          colors={colors}
          icon={<MapPin size={18} />}
          placeholder="Quartier, maison, repère..."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Téléphone"
            value={formData.phone}
            onChange={(value) => updateField('phone', value)}
            colors={colors}
            icon={<Phone size={18} />}
            type="tel"
          />

          <InputField
            label="Contact d’urgence"
            value={formData.emergency_contact}
            onChange={(value) =>
              updateField('emergency_contact', value)
            }
            colors={colors}
            icon={<Phone size={18} />}
            type="tel"
          />

          <div className="sm:col-span-2">
            <InputField
              label="Nom du contact d’urgence"
              value={formData.emergency_contact_name}
              onChange={(value) =>
                updateField('emergency_contact_name', value)
              }
              colors={colors}
              icon={<User size={18} />}
              placeholder="Nom ou lien familial"
            />
          </div>
        </div>
      </section>

      {/* SERVICE */}
      <section className="space-y-4">
        <SectionHeader
          title="Service"
          description="Type d’accompagnement souhaité."
          colors={colors}
        />

        <SelectField
          label="Type de service"
          value={formData.category}
          onChange={(value) =>
            updateField('category', value as PatientCategory)
          }
          colors={colors}
        >
          <option value="senior">
            <div className="flex items-center gap-2">
              <User size={14} />
              Senior
            </div>
          </option>
          <option value="maman_bebe">
            <div className="flex items-center gap-2">
              <Heart size={14} />
              Maman & Bébé
            </div>
          </option>
        </SelectField>
      </section>

      {/* INFOS UTILES */}
      <section className="space-y-4">
        <SectionHeader
          title="Informations utiles"
          description="Repères importants pour l’équipe."
          colors={colors}
        />

        <TextareaField
          label="Notes"
          value={formData.notes}
          onChange={(value) => updateField('notes', value)}
          colors={colors}
          icon={<FileText size={18} />}
          placeholder="Habitudes, précautions, préférences..."
          rows={3}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Allergies"
            value={formData.allergies}
            onChange={(value) => updateField('allergies', value)}
            colors={colors}
            icon={<AlertCircle size={18} />}
            placeholder="Aucune"
          />

          <InputField
            label="Traitements"
            value={formData.treatments}
            onChange={(value) => updateField('treatments', value)}
            colors={colors}
            icon={<Pill size={18} />}
            placeholder="Aucun"
          />
        </div>

        <InputField
          label="Conditions particulières"
          value={formData.conditions}
          onChange={(value) => updateField('conditions', value)}
          colors={colors}
          icon={<Stethoscope size={18} />}
          placeholder="Mobilité, alimentation, surveillance..."
        />

        <TextareaField
          label="Historique / contexte"
          value={formData.medical_history}
          onChange={(value) => updateField('medical_history', value)}
          colors={colors}
          icon={<FileText size={18} />}
          placeholder="Contexte utile pour l’équipe..."
          rows={3}
        />
      </section>

      <div
        className="flex items-start gap-3 p-4 rounded-2xl"
        style={{ background: colors.primary + '10' }}
      >
        <AlertCircle
          size={20}
          style={{ color: colors.primary }}
          className="shrink-0 mt-0.5"
        />
        <p
          className="text-xs leading-relaxed"
          style={{ color: colors.textLight }}
        >
          Santé Plus Services est un service d'accompagnement non
          médical. Ces informations servent à mieux organiser le suivi
          et l’assistance.
        </p>
      </div>

      {/* Boutons */}
      <div className="flex gap-3 pt-4 border-t" style={{ borderColor: colors.primary + '15' }}>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-2xl font-bold border transition hover:bg-gray-50 disabled:opacity-50"
          style={{
            borderColor: colors.primary + '20',
            color: colors.text,
          }}
        >
          Annuler
        </button>

        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 py-3 rounded-2xl text-white font-bold transition hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: colors.primary }}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Save size={18} />
              {mode === 'create' ? 'Ajouter' : 'Mettre à jour'}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

// =============================================
// SOUS-COMPOSANTS
// =============================================

interface ColorsLike {
  primary: string;
  text: string;
  border?: string;
}

interface SectionHeaderProps {
  title: string;
  description: string;
  colors: ColorsLike;
}

const SectionHeader = ({ title, description, colors }: SectionHeaderProps) => {
  return (
    <div className="border-b pb-2" style={{ borderColor: colors.primary + '12' }}>
      <h3 className="font-black leading-tight" style={{ color: colors.text }}>
        {title}
      </h3>
      <p className="text-xs mt-0.5" style={{ color: colors.textLight }}>
        {description}
      </p>
    </div>
  );
};

interface InputFieldProps {
  label: string;
  value: string;
  colors: ColorsLike;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  icon?: React.ReactNode;
  min?: string;
}

const InputField = ({
  label,
  value,
  colors,
  onChange,
  type = 'text',
  required,
  placeholder,
  icon,
  min,
}: InputFieldProps) => {
  return (
    <div>
      <label
        className="block text-sm font-bold mb-1.5"
        style={{ color: colors.text }}
      >
        {label}
        {required ? ' *' : ''}
      </label>

      <div className="relative">
        {icon && (
          <div
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: colors.textLight }}
          >
            {icon}
          </div>
        )}

        <input
          type={type}
          value={value}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          className={`w-full ${icon ? 'pl-11' : 'pl-4'} pr-4 py-3 rounded-2xl border outline-none text-sm transition focus:ring-2`}
          style={{
            borderColor: colors.primary + '20',
            background: colors.background,
            color: colors.text,
          }}
        />
      </div>
    </div>
  );
};

interface SelectFieldProps {
  label: string;
  value: string;
  colors: ColorsLike;
  onChange: (value: string) => void;
  children: React.ReactNode;
}

const SelectField = ({
  label,
  value,
  colors,
  onChange,
  children,
}: SelectFieldProps) => {
  return (
    <div>
      <label
        className="block text-sm font-bold mb-1.5"
        style={{ color: colors.text }}
      >
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-2xl border outline-none text-sm transition focus:ring-2"
        style={{
          borderColor: colors.primary + '20',
          background: colors.background,
          color: colors.text,
        }}
      >
        {children}
      </select>
    </div>
  );
};

interface TextareaFieldProps {
  label: string;
  value: string;
  colors: ColorsLike;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  icon?: React.ReactNode;
}

const TextareaField = ({
  label,
  value,
  colors,
  onChange,
  placeholder,
  rows = 3,
  icon,
}: TextareaFieldProps) => {
  return (
    <div>
      <label
        className="block text-sm font-bold mb-1.5"
        style={{ color: colors.text }}
      >
        {label}
      </label>

      <div className="relative">
        {icon && (
          <div
            className="absolute left-3.5 top-3"
            style={{ color: colors.textLight }}
          >
            {icon}
          </div>
        )}

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className={`w-full ${icon ? 'pl-11' : 'pl-4'} pr-4 py-3 rounded-2xl border outline-none text-sm resize-none transition focus:ring-2`}
          style={{
            borderColor: colors.primary + '20',
            background: colors.background,
            color: colors.text,
          }}
        />
      </div>
    </div>
  );
};

export default PatientModalContent;
