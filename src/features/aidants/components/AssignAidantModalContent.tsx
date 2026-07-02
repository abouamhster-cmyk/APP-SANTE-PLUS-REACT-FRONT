// 📁 src/features/aidants/components/AssignAidantModalContent.tsx

import { useState } from 'react';
import { CheckCircle, AlertCircle, User, Users, Info, X } from 'lucide-react';
import { useAidantCatalogStore } from '@/stores/aidantCatalogStore';
import toast from 'react-hot-toast';

// ============================================================
// CONSTANTES
// ============================================================

const ASSIGNMENT_TYPES = [
  { 
    value: 'permanente', 
    icon: '📌', 
    label: 'Permanente',
    description: 'Suivi sur le long terme'
  },
  { 
    value: 'temporaire', 
    icon: '⏳', 
    label: 'Temporaire',
    description: 'Période définie'
  },
  { 
    value: 'ponctuelle', 
    icon: '⚡', 
    label: 'Ponctuelle',
    description: 'Intervention unique'
  },
];

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

interface AssignAidantModalContentProps {
  aidant: any;
  patients: any[];
  onSuccess: () => void;
  onCancel: () => void;
  colors: any;
}

export const AssignAidantModalContent = ({
  aidant,
  patients,
  onSuccess,
  onCancel,
  colors,
}: AssignAidantModalContentProps) => {
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [assignmentType, setAssignmentType] = useState('permanente');
  const [targetType, setTargetType] = useState<'personal' | 'patient'>('patient');
  const [isLoading, setIsLoading] = useState(false);

  const { assignAidant } = useAidantCatalogStore();
  const hasPatients = patients.length > 0;

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleSubmit = async () => {
    // ✅ Vérification : si patient, il faut sélectionner un patient
    if (targetType === 'patient' && !selectedPatientId) {
      toast.error('Veuillez sélectionner un proche');
      return;
    }

    // ✅ Vérification : si personnel, pas besoin de patient
    if (targetType === 'personal') {
      // ✅ Assignation personnelle - pas de patient
      setIsLoading(true);
      try {
        await assignAidant(
          aidant.id,
          null,  // ✅ patientId = null pour assignation personnelle
          assignmentType
        );
        toast.success('✅ Aidant assigné à votre compte personnel !');
        onSuccess();
      } catch (error: any) {
        console.error('❌ Assignation error:', error);
        toast.error(error.message || 'Erreur lors de l\'assignation');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // ✅ Assignation à un patient
    setIsLoading(true);
    try {
      await assignAidant(
        aidant.id,
        selectedPatientId,
        assignmentType
      );
      const patient = patients.find(p => p.id === selectedPatientId);
      toast.success(`✅ Aidant assigné à ${patient?.first_name || 'le patient'} !`);
      onSuccess();
    } catch (error: any) {
      console.error('❌ Assignation error:', error);
      toast.error(error.message || 'Erreur lors de l\'assignation');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // RENDU
  // ============================================================

  const remainingSlots = Math.max(0, (aidant.max_assignments || 4) - (aidant.active_assignments || 0));
  const isAvailable = aidant.is_available && remainingSlots > 0;

  return (
    <div className="space-y-5 pb-4">

      {/* ============================================================
      HEADER AIDANT
      ============================================================ */}
      <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: colors.primary + '06' }}>
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0"
          style={{ background: colors.primary }}
        >
          {aidant.user?.full_name?.charAt(0)?.toUpperCase() || 'A'}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: colors.text }}>
            {aidant.user?.full_name || 'Aidant'}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
            <span>⭐ {aidant.avg_rating || aidant.rating || 0}</span>
            <span>•</span>
            <span>📋 {aidant.total_missions || 0} missions</span>
            <span>•</span>
            <span className={isAvailable ? 'text-green-600' : 'text-red-500'}>
              {isAvailable ? '🟢 Disponible' : '🔴 Indisponible'}
            </span>
          </div>
          <p className="text-[10px] text-gray-400">
            {remainingSlots} place{remainingSlots > 1 ? 's' : ''} disponible{remainingSlots > 1 ? 's' : ''}
            ({aidant.active_assignments || 0}/{aidant.max_assignments || 4} actives)
          </p>
        </div>
      </div>

      {/* ============================================================
      CHOIX DESTINATAIRE
      ============================================================ */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.text }}>
          <User size={14} className="inline mr-1" />
          Pour qui ?
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setTargetType('personal');
              setSelectedPatientId('');
            }}
            className={`p-3 rounded-xl text-xs font-bold transition text-center ${
              targetType === 'personal'
                ? 'text-white shadow-sm scale-[1.02]'
                : 'border bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
            style={{
              background: targetType === 'personal' ? colors.primary : 'transparent',
              borderColor: targetType === 'personal' ? colors.primary : colors.border,
            }}
          >
            <div className="flex items-center justify-center gap-1.5">
              <User size={14} />
              <span>👤 Personnel</span>
            </div>
            <p className="text-[8px] opacity-70 mt-0.5">Pour votre compte</p>
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
              <Users size={14} />
              <span>👨‍👩‍👦 Patient</span>
            </div>
            <p className="text-[8px] opacity-70 mt-0.5">Pour un proche</p>
          </button>
        </div>
        {!hasPatients && (
          <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
            <AlertCircle size={12} />
            Aucun proche enregistré. Utilisez l'option "Personnel".
          </p>
        )}
      </div>

      {/* ============================================================
      SÉLECTION PATIENT
      ============================================================ */}
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
              className="w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm focus:ring-2 transition"
              style={{
                borderColor: colors.border,
                background: 'var(--color-background, #f5f0e8)',
                color: colors.text,
              }}
            >
              <option value="">Choisir un proche...</option>
              {patients.map((patient: any) => (
                <option key={patient.id} value={patient.id}>
                  {patient.first_name} {patient.last_name}
                  {patient.category && ` (${patient.category === 'maman_bebe' ? '👶' : '👴'})`}
                </option>
              ))}
            </select>
          ) : (
            <div className="p-3 rounded-xl text-center" style={{ background: '#FEF2F2' }}>
              <p className="text-sm text-red-600">
                ⚠️ Aucun proche enregistré.
              </p>
              <button
                onClick={() => {
                  onCancel();
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

      {/* ============================================================
      TYPE D'ASSIGNATION
      ============================================================ */}
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
              className={`p-2.5 rounded-xl text-xs font-bold transition-all text-center ${
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
              <div>{type.label}</div>
              <div className="text-[7px] opacity-60 mt-0.5">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================
      INFORMATION
      ============================================================ */}
      <div 
        className={`p-3 rounded-xl flex items-start gap-2 ${
          isAvailable ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
        }`}
      >
        <Info size={16} className={isAvailable ? 'text-green-600' : 'text-amber-600'} />
        <div>
          <p className="text-xs font-medium" style={{ color: isAvailable ? '#065f46' : '#92400e' }}>
            {isAvailable 
              ? '✅ L\'aidant sera notifié de cette assignation'
              : '⚠️ Cet aidant n\'est pas disponible actuellement'}
          </p>
          {isAvailable && targetType === 'personal' && (
            <p className="text-[10px] text-green-600 mt-0.5">
              Assignation directe à votre compte personnel
            </p>
          )}
          {isAvailable && targetType === 'patient' && selectedPatientId && (
            <p className="text-[10px] text-green-600 mt-0.5">
              Assignation au proche sélectionné
            </p>
          )}
        </div>
      </div>

      {/* ============================================================
      ACTIONS
      ============================================================ */}
      <div className="flex gap-3 pt-2 border-t" style={{ borderColor: colors.border }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-2.5 rounded-xl font-medium border transition hover:bg-gray-50 disabled:opacity-50"
          style={{ borderColor: colors.border, color: colors.text }}
        >
          Annuler
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            isLoading ||
            (targetType === 'patient' && !selectedPatientId) ||
            !isAvailable
          }
          className="flex-1 py-2.5 rounded-xl text-white font-bold transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ 
            background: (isLoading || (targetType === 'patient' && !selectedPatientId) || !isAvailable) 
              ? '#9CA3AF' 
              : colors.primary 
          }}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <CheckCircle size={16} />
              {targetType === 'personal' ? 'Assigner à mon compte' : 'Assigner'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AssignAidantModalContent;
