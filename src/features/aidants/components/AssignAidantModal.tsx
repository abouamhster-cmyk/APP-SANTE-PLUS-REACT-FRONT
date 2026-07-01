// 📁 frontend/src/features/aidants/components/AssignAidantModal.tsx

import { useState } from 'react';
import { X, CheckCircle, AlertCircle, User, Users, UserPlus, Info } from 'lucide-react';
import { useAidantCatalogStore } from '@/stores/aidantCatalogStore';
import { toast } from 'react-hot-toast';

interface AssignAidantModalProps {
  isOpen: boolean;
  onClose: () => void;
  aidant: any;
  patients: any[];
  onSuccess: () => void;
  colors: any;
}

// ✅ TYPES D'ASSIGNATION AVEC DESCRIPTIONS
const ASSIGNMENT_TYPES = [
  { 
    value: 'permanente', 
    label: '📌 Permanente', 
    description: 'L\'aidant suit le patient sur le long terme',
    icon: '📌'
  },
  { 
    value: 'temporaire', 
    label: '⏳ Temporaire', 
    description: 'Pour une période définie (ex: convalescence)',
    icon: '⏳'
  },
  { 
    value: 'ponctuelle', 
    label: '⚡ Ponctuelle', 
    description: 'Pour une intervention unique',
    icon: '⚡'
  },
];

export const AssignAidantModal = ({
  isOpen,
  onClose,
  aidant,
  patients,
  onSuccess,
  colors,
}: AssignAidantModalProps) => {
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [assignmentType, setAssignmentType] = useState('permanente');
  const [isLoading, setIsLoading] = useState(false);
  const { assignAidant } = useAidantCatalogStore();

  // ✅ NOUVEAU : option "Pour moi"
  const [targetType, setTargetType] = useState<'personal' | 'patient'>('patient');

  if (!isOpen) return null;

 
  const handleSubmit = async () => {
    if (targetType === 'patient' && !selectedPatientId) {
      toast.error('Veuillez sélectionner un proche');
      return;
    }
  
    setIsLoading(true);
    try {
      // ✅ patientId = null si targetType === 'personal'
      const patientId = targetType === 'patient' ? selectedPatientId : null;
      // ✅ assignAidant accepte maintenant string | null
      await assignAidant(aidant.id, patientId, assignmentType);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'assignation');
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedTypeDescription = () => {
    const type = ASSIGNMENT_TYPES.find(t => t.value === assignmentType);
    return type?.description || '';
  };

  const remainingSlots = Math.max(0, (aidant.max_assignments || 4) - (aidant.active_assignments || 0));

  const hasPatients = patients.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: colors.primary + '20' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: colors.primary + '12', color: colors.primary }}
              >
                <UserPlus size={20} />
              </div>
              <div>
                <h3 className="font-bold" style={{ color: colors.text }}>
                  Assigner un aidant
                </h3>
                <p className="text-xs" style={{ color: colors.text + '50' }}>
                  {aidant.user?.full_name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-5 space-y-4">
          {/* Infos aidant */}
          <div className="p-3 rounded-xl" style={{ background: colors.primary + '05' }}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ background: colors.primary }}
              >
                {aidant.user?.full_name?.charAt(0) || 'A'}
              </div>
              <div>
                <p className="font-medium text-sm" style={{ color: colors.text }}>
                  {aidant.user?.full_name}
                </p>
                <p className="text-xs" style={{ color: colors.text + '50' }}>
                  {aidant.specialties?.join(', ') || 'Aucune spécialité'}
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs" style={{ color: colors.text + '50' }}>
              <span>⭐ {aidant.avg_rating || aidant.rating || 0}</span>
              <span>•</span>
              <span>📋 {aidant.total_missions || 0} missions</span>
              <span>•</span>
              <span>
                {aidant.active_assignments || 0}/{aidant.max_assignments || 4} actives
              </span>
              {remainingSlots > 0 && (
                <span className="text-green-600 font-bold">
                  ({remainingSlots} place{remainingSlots > 1 ? 's' : ''} disponible{remainingSlots > 1 ? 's' : ''})
                </span>
              )}
            </div>
          </div>

          {/* ✅ NOUVEAU : Choix du destinataire */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.text }}>
              <User size={14} className="inline mr-1" />
              Pour qui ?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('personal')}
                className={`p-2.5 rounded-xl text-xs font-bold transition text-center ${
                  targetType === 'personal'
                    ? 'text-white shadow-sm'
                    : 'border bg-gray-50 text-gray-600'
                }`}
                style={{
                  background: targetType === 'personal' ? colors.primary : 'transparent',
                  borderColor: targetType === 'personal' ? colors.primary : colors.border,
                }}
              >
                👤 Personnel
              </button>
              <button
                type="button"
                onClick={() => setTargetType('patient')}
                className={`p-2.5 rounded-xl text-xs font-bold transition text-center ${
                  targetType === 'patient'
                    ? 'text-white shadow-sm'
                    : 'border bg-gray-50 text-gray-600'
                }`}
                style={{
                  background: targetType === 'patient' ? colors.primary : 'transparent',
                  borderColor: targetType === 'patient' ? colors.primary : colors.border,
                }}
              >
                👨‍👩‍👦 Patient
              </button>
            </div>
          </div>

          {/* Sélection du patient (si targetType === 'patient') */}
          {targetType === 'patient' && (
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.text }}>
                <Users size={14} className="inline mr-1" />
                Sélectionner un proche
              </label>
              {hasPatients ? (
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border outline-none text-sm"
                  style={{ borderColor: colors.border, background: 'var(--color-background)' }}
                >
                  <option value="">Choisir un proche...</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name} ({patient.category})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 rounded-xl text-center" style={{ background: '#FEF2F2' }}>
                  <p className="text-sm text-red-600">
                    ⚠️ Vous n'avez pas encore de proche enregistré.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      window.location.href = '/app/patients';
                    }}
                    className="mt-2 text-sm font-medium hover:underline"
                    style={{ color: colors.primary }}
                  >
                    Ajouter un proche
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Type d'assignation */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.text }}>
              Type d'assignation
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ASSIGNMENT_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setAssignmentType(type.value)}
                  className={`p-2.5 rounded-xl text-xs font-bold transition-all ${
                    assignmentType === type.value
                      ? 'text-white shadow-sm scale-[1.02]'
                      : 'border hover:bg-gray-50'
                  }`}
                  style={{
                    background: assignmentType === type.value ? colors.primary : 'transparent',
                    borderColor: assignmentType === type.value ? colors.primary : colors.border,
                    color: assignmentType === type.value ? 'white' : colors.text,
                  }}
                >
                  <div className="text-base">{type.icon}</div>
                  {type.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] mt-1.5 text-gray-400 flex items-center gap-1">
              <Info size={12} />
              {getSelectedTypeDescription()}
            </p>
          </div>

          {/* Information */}
          <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: colors.primary + '08' }}>
            <AlertCircle size={16} style={{ color: colors.primary }} className="shrink-0 mt-0.5" />
            <p className="text-xs" style={{ color: colors.text + '70' }}>
              {aidant.is_available
                ? `L'aidant sera notifié de cette assignation. Vous pourrez suivre les missions dans votre espace.`
                : "⚠️ Cet aidant n'est pas disponible actuellement."}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t flex gap-3" style={{ borderColor: colors.border }}>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-medium border transition hover:bg-gray-50"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || (targetType === 'patient' && !selectedPatientId) || !aidant.is_available}
            className="flex-1 py-2.5 rounded-xl text-white font-bold transition hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              background: (isLoading || (targetType === 'patient' && !selectedPatientId) || !aidant.is_available) ? '#9CA3AF' : colors.primary 
            }}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle size={16} />
                Assigner
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignAidantModal;
