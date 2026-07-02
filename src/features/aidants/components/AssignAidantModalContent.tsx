// 📁 AssignAidantModalContent.tsx

import { useState } from 'react';
import { CheckCircle, AlertCircle, User, Users, Info } from 'lucide-react';
import { useAidantCatalogStore } from '@/stores/aidantCatalogStore';
import toast from 'react-hot-toast';

const ASSIGNMENT_TYPES = [
  { value: 'permanente', icon: '📌', label: 'Permanente' },
  { value: 'temporaire', icon: '⏳', label: 'Temporaire' },
  { value: 'ponctuelle', icon: '⚡', label: 'Ponctuelle' },
];

export const AssignAidantModalContent = ({
  aidant,
  patients,
  onSuccess,
  onCancel,
  colors,
}: any) => {
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [assignmentType, setAssignmentType] = useState('permanente');
  const [targetType, setTargetType] = useState<'personal' | 'patient'>('patient');
  const [isLoading, setIsLoading] = useState(false);

  const { assignAidant } = useAidantCatalogStore();
  const hasPatients = patients.length > 0;

  const handleSubmit = async () => {
    if (targetType === 'patient' && !selectedPatientId) {
      toast.error('Sélectionne un proche');
      return;
    }

    setIsLoading(true);
    try {
      await assignAidant(
        aidant.id,
        targetType === 'patient' ? selectedPatientId : null,
        assignmentType
      );
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* HEADER AIDANT (LIGHT VERSION) */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ background: colors.primary }}
        >
          {aidant.user?.full_name?.[0]}
        </div>

        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: colors.text }}>
            {aidant.user?.full_name}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {aidant.specialties?.join(', ') || '—'}
          </p>
        </div>

        <span className="text-[10px] text-gray-400">
          {aidant.active_assignments || 0}/{aidant.max_assignments || 4}
        </span>
      </div>

      {/* TARGET */}
      <div className="grid grid-cols-2 gap-2">
        {['personal', 'patient'].map((type) => (
          <button
            key={type}
            onClick={() => setTargetType(type as any)}
            className={`py-2 rounded-xl text-xs font-semibold transition ${
              targetType === type
                ? 'text-white'
                : 'border text-gray-500'
            }`}
            style={{
              background: targetType === type ? colors.primary : 'transparent',
              borderColor: colors.border,
            }}
          >
            {type === 'personal' ? '👤 Moi' : '👨‍👩‍👦 Patient'}
          </button>
        ))}
      </div>

      {/* SELECT PATIENT */}
      {targetType === 'patient' && (
        <div>
          {hasPatients ? (
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-sm"
              style={{ borderColor: colors.border }}
            >
              <option value="">Choisir...</option>
              {patients.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-red-500">
              Aucun proche disponible
            </p>
          )}
        </div>
      )}

      {/* TYPE */}
      <div className="grid grid-cols-3 gap-2">
        {ASSIGNMENT_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setAssignmentType(t.value)}
            className={`py-2 rounded-xl text-xs font-medium transition ${
              assignmentType === t.value
                ? 'text-white'
                : 'border text-gray-500'
            }`}
            style={{
              background: assignmentType === t.value ? colors.primary : 'transparent',
              borderColor: colors.border,
            }}
          >
            <div>{t.icon}</div>
            {t.label}
          </button>
        ))}
      </div>

      {/* INFO LIGHT */}
      <div className="flex items-start gap-2 text-[11px] text-gray-500">
        <Info size={12} />
        {aidant.is_available
          ? 'Notification envoyée à l’aidant'
          : 'Aidant indisponible'}
      </div>

      {/* ACTIONS */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-xl border text-sm"
          style={{ borderColor: colors.border }}
        >
          Annuler
        </button>

        <button
          onClick={handleSubmit}
          disabled={
            isLoading ||
            (targetType === 'patient' && !selectedPatientId) ||
            !aidant.is_available
          }
          className="flex-1 py-2 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1"
          style={{
            background: colors.primary,
            opacity:
              isLoading ||
              (targetType === 'patient' && !selectedPatientId)
                ? 0.5
                : 1,
          }}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <CheckCircle size={14} />
              Assigner
            </>
          )}
        </button>
      </div>
    </div>
  );
};
