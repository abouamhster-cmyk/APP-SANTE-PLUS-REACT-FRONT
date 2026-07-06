// 📁 src/features/aidants/components/AssignAidantModalContent.tsx

import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  User, 
  Users, 
  Info, 
  X, 
  Star,
  Briefcase,
  MapPin,
  Clock,
  Shield,
  Zap,
  UserPlus,
  Loader2,
} from 'lucide-react';
import { useAidantCatalogStore } from '@/stores/aidantCatalogStore';
import { useAssignmentStore } from '@/stores/assignmentStore';
import { assignmentAPI } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// ============================================================
// CONSTANTES
// ============================================================

const ASSIGNMENT_TYPES_UI = [
  { 
    value: 'primary', 
    icon: '📌', 
    label: 'Permanente',
    description: 'Suivi sur le long terme',
    quota: 1,
  },
  { 
    value: 'temporary', 
    icon: '⏳', 
    label: 'Temporaire',
    description: 'Période définie',
    quota: 1,
  },
  { 
    value: 'secondary', 
    icon: '⚡', 
    label: 'Ponctuelle',
    description: 'Intervention unique',
    quota: 0,
  },
];

// ============================================================
// TYPES
// ============================================================

interface AssignAidantModalContentProps {
  aidant?: any;
  patients: any[];
  onSuccess: () => void;
  onCancel: () => void;
  colors: any;
  // ✅ NOUVEAUX PROPS
  targetType?: 'visit' | 'patient' | 'personal_account';
  targetId?: string;
  targetName?: string;
  currentAidantId?: string | null;
  allowForce?: boolean;
  onAssignAidant?: (aidantId: string, assignmentType: string, force?: boolean) => Promise<void>;
  isAdmin?: boolean;
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export const AssignAidantModalContent = ({
  aidant: initialAidant,
  patients,
  onSuccess,
  onCancel,
  colors,
  targetType = 'patient',
  targetId,
  targetName,
  currentAidantId,
  allowForce = false,
  onAssignAidant,
  isAdmin = false,
}: AssignAidantModalContentProps) => {
  const [selectedAidantId, setSelectedAidantId] = useState<string>(
    initialAidant?.id || initialAidant?.user_id || ''
  );
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [assignmentType, setAssignmentType] = useState('primary');
  const [targetTypeLocal, setTargetTypeLocal] = useState<'personal' | 'patient'>(
    patients.length > 0 ? 'patient' : 'personal'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [aidants, setAidants] = useState<any[]>([]);
  const [isLoadingAidants, setIsLoadingAidants] = useState(false);
  const [showForceOption, setShowForceOption] = useState(false);
  const [forceMode, setForceMode] = useState(false);

  const { fetchMyAssignments, fetchAidants } = useAidantCatalogStore();
  const { assignAidant: assignAidantStore } = useAssignmentStore();

  const hasPatients = patients.length > 0;

  // ============================================================
  // CHARGEMENT DES AIDANTS DISPONIBLES
  // ============================================================

  useEffect(() => {
    if (isAdmin && !initialAidant) {
      loadAvailableAidants();
    }
  }, [isAdmin, initialAidant]);

  const loadAvailableAidants = async () => {
    setIsLoadingAidants(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Token manquant');
      }

      const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';
      const response = await fetch(`${API_URL}/visits/available-aidants`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des aidants');
      }

      const result = await response.json();
      setAidants(result.data || []);
    } catch (error) {
      console.error('❌ Erreur chargement aidants:', error);
      toast.error('Erreur lors du chargement des aidants');
    } finally {
      setIsLoadingAidants(false);
    }
  };

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleSubmit = async () => {
    // ✅ Vérification : si patient, il faut sélectionner un patient
    if (targetTypeLocal === 'patient' && !selectedPatientId && targetType !== 'visit') {
      toast.error('Veuillez sélectionner un proche');
      return;
    }

    // ✅ Vérification : si visit, il faut un targetId
    if (targetType === 'visit' && !targetId) {
      toast.error('Cible de visite non spécifiée');
      return;
    }

    // ✅ Déterminer l'aidant à assigner
    let aidantUserId = selectedAidantId || initialAidant?.user_id || initialAidant?.id;
    if (!aidantUserId) {
      toast.error('Veuillez sélectionner un aidant');
      return;
    }

    setIsLoading(true);

    try {
      const { useAuthStore } = await import('@/stores/authStore');
      const user = useAuthStore.getState().user;
      
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // ✅ CAS SPÉCIAL : Assignation à une visite (Admin)
      if (targetType === 'visit' && targetId && onAssignAidant) {
        await onAssignAidant(
          aidantUserId, 
          assignmentType === 'primary' ? 'permanente' : 
          assignmentType === 'temporary' ? 'temporaire' : 'ponctuelle',
          forceMode
        );
        toast.success(`Aidant assigné à la visite ${targetName || ''}`);
        onSuccess();
        return;
      }

      // ✅ CAS 1 : Assignation directe (famille) avec patient ou personnel
      if (targetType === 'patient' || targetType === 'personal_account') {
        // Déterminer la cible
        const finalTargetType = targetTypeLocal === 'patient' ? 'patient' : 'personal_account';
        const finalTargetId = targetTypeLocal === 'patient' ? selectedPatientId : user.id;

        // ✅ Vérifier le quota si ce n'est pas une assignation ponctuelle
        if (assignmentType !== 'secondary' && !forceMode) {
          const selectedAidant = aidants.find(a => a.user_id === aidantUserId) || initialAidant;
          if (selectedAidant) {
            const current = selectedAidant.current_assignments || 0;
            const max = selectedAidant.max_assignments || 4;
            if (current >= max) {
              toast.error(`Cet aidant est complet (${current}/${max}). Utilisez le mode "Force" ou "Ponctuelle".`);
              return;
            }
          }
        }

        // ✅ Utiliser l'API d'assignation
        const result = await assignAidantStore({
          aidantUserId: aidantUserId,
          targetType: finalTargetType,
          targetId: finalTargetId,
          assignmentType: assignmentType === 'primary' ? 'primary' : 
                          assignmentType === 'temporary' ? 'temporary' : 'secondary',
          familyId: user.id,
        });

        if (!result.success) {
          throw new Error(result.error || 'Erreur lors de l\'assignation');
        }

        // ✅ Rafraîchir les données
        await Promise.all([
          fetchMyAssignments(),
          fetchAidants()
        ]);

        const targetNameDisplay = targetTypeLocal === 'patient' 
          ? patients.find(p => p.id === selectedPatientId)?.first_name || 'le patient'
          : 'votre compte personnel';

        toast.success(`Aidant assigné à ${targetNameDisplay} !`);
        onSuccess();
        return;
      }

      // ✅ CAS 2 : Assignation avec aidant spécifique (ancienne méthode)
      if (initialAidant) {
        // ✅ Vérifier le quota si ce n'est pas une assignation ponctuelle
        if (assignmentType !== 'secondary' && !forceMode) {
          const current = initialAidant.current_assignments || 0;
          const max = initialAidant.max_assignments || 4;
          if (current >= max) {
            toast.error(`Cet aidant est complet (${current}/${max}). Utilisez le mode "Force" ou "Ponctuelle".`);
            return;
          }
        }

        const result = await assignAidantStore({
          aidantUserId: aidantUserId,
          targetType: 'patient',
          targetId: selectedPatientId || user.id,
          assignmentType: assignmentType === 'primary' ? 'primary' : 
                          assignmentType === 'temporary' ? 'temporary' : 'secondary',
          familyId: user.id,
        });

        if (!result.success) {
          throw new Error(result.error || 'Erreur lors de l\'assignation');
        }

        await Promise.all([
          fetchMyAssignments(),
          fetchAidants()
        ]);

        toast.success('Aidant assigné avec succès !');
        onSuccess();
        return;
      }

      throw new Error('Mode d\'assignation non supporté');

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

  const getAidantDisplay = (aidant: any) => {
    const name = aidant.user?.full_name || aidant.full_name || 'Aidant';
    const rating = aidant.rating || aidant.avg_rating || 0;
    const missions = aidant.total_missions || 0;
    const current = aidant.current_assignments || 0;
    const max = aidant.max_assignments || 4;
    const isFull = current >= max;
    const availableSlots = max - current;

    return { name, rating, missions, current, max, isFull, availableSlots };
  };

  const getAidantStatus = (aidant: any) => {
    const { isFull, availableSlots } = getAidantDisplay(aidant);
    if (isFull) {
      return { label: 'Complet', color: 'text-red-500', bg: 'bg-red-50' };
    }
    if (availableSlots > 0) {
      return { label: `${availableSlots} place${availableSlots > 1 ? 's' : ''}`, color: 'text-green-500', bg: 'bg-green-50' };
    }
    return { label: 'Indisponible', color: 'text-gray-400', bg: 'bg-gray-50' };
  };

  const renderAidantSelection = () => {
    if (initialAidant) {
      const { name, rating, missions, current, max, isFull } = getAidantDisplay(initialAidant);
      const status = getAidantStatus(initialAidant);

      return (
        <div className="p-4 rounded-xl" style={{ background: colors.primary + '06' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0"
              style={{ background: colors.primary }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: colors.text }}>
                {name}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                <span className="flex items-center gap-0.5">
                  <Star size={12} className="text-yellow-400 fill-yellow-400" />
                  {rating.toFixed(1)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <Briefcase size={12} />
                  {missions} missions
                </span>
                <span>•</span>
                <span className={status.color}>
                  {status.label}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold" style={{ color: isFull ? '#ef4444' : colors.primary }}>
                {current}/{max}
              </p>
              <p className="text-[10px] text-gray-400">assignations</p>
            </div>
          </div>
        </div>
      );
    }

    if (isAdmin && aidants.length > 0) {
      return (
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.text }}>
            Sélectionner un aidant
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {aidants.map((aidant) => {
              const { name, rating, missions, current, max, isFull, availableSlots } = getAidantDisplay(aidant);
              const isSelected = (aidant.user_id || aidant.id) === selectedAidantId;
              const status = getAidantStatus(aidant);

              return (
                <button
                  key={aidant.id}
                  onClick={() => setSelectedAidantId(aidant.user_id || aidant.id)}
                  className={`w-full p-3 rounded-2xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-[--color-primary] bg-[--color-primary]04'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${isFull && !forceMode ? 'opacity-60' : ''}`}
                  style={{
                    borderColor: isSelected ? colors.primary : undefined,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: isFull && !forceMode ? '#9ca3af' : colors.primary }}
                      >
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate" style={{ color: colors.text }}>
                          {name}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <span className="flex items-center gap-0.5">
                            <Star size={10} className="text-yellow-400 fill-yellow-400" />
                            {rating.toFixed(1)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Briefcase size={10} />
                            {missions}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                            {isFull ? 'Complet' : `${availableSlots} place(s)`}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle size={16} style={{ color: colors.primary }} className="shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderPatientSelection = () => {
    if (targetType === 'visit') return null;
    if (!hasPatients) return null;
    if (targetTypeLocal === 'personal') return null;

    return (
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.text }}>
          <Users size={14} className="inline mr-1" />
          Sélectionner un proche
        </label>
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
      </div>
    );
  };

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================

  return (
    <div className="space-y-5 pb-4">

      {/* ============================================================
      HEADER AIDANT
      ============================================================ */}
      {renderAidantSelection()}

      {/* ============================================================
      CHOIX DESTINATAIRE (pour famille)
      ============================================================ */}
      {!isAdmin && !targetType && hasPatients && (
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.text }}>
            <User size={14} className="inline mr-1" />
            Pour qui ?
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setTargetTypeLocal('personal');
                setSelectedPatientId('');
              }}
              className={`p-3 rounded-xl text-xs font-bold transition text-center ${
                targetTypeLocal === 'personal'
                  ? 'text-white shadow-sm scale-[1.02]'
                  : 'border bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
              style={{
                background: targetTypeLocal === 'personal' ? colors.primary : 'transparent',
                borderColor: targetTypeLocal === 'personal' ? colors.primary : colors.border,
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
              onClick={() => setTargetTypeLocal('patient')}
              disabled={!hasPatients}
              className={`p-3 rounded-xl text-xs font-bold transition text-center ${
                targetTypeLocal === 'patient'
                  ? 'text-white shadow-sm scale-[1.02]'
                  : hasPatients
                    ? 'border bg-gray-50 text-gray-600 hover:bg-gray-100'
                    : 'opacity-50 cursor-not-allowed border bg-gray-100 text-gray-400'
              }`}
              style={{
                background: targetTypeLocal === 'patient' ? colors.primary : 'transparent',
                borderColor: targetTypeLocal === 'patient' ? colors.primary : colors.border,
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
      )}

      {/* ============================================================
      SÉLECTION PATIENT
      ============================================================ */}
      {renderPatientSelection()}

      {/* ============================================================
      TYPE D'ASSIGNATION
      ============================================================ */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.text }}>
          Type d'assignation
        </label>
        <div className="grid grid-cols-3 gap-2">
          {ASSIGNMENT_TYPES_UI.map((type) => {
            // 🔒 Admin peut voir "Ponctuelle" pour les visites
            // 🔒 Famille ne peut pas voir "Ponctuelle" si c'est une visite
            if (targetType === 'visit' && !isAdmin && type.value === 'secondary') return null;

            return (
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
                {type.quota === 0 && (
                  <div className="text-[7px] text-green-400 mt-0.5">⚡ Sans quota</div>
                )}
                {type.quota === 1 && (
                  <div className="text-[7px] text-yellow-400 mt-0.5">📌 1 quota</div>
                )}
              </button>
            );
          })}
        </div>

        {/* ✅ OPTION FORCE (ADMIN UNIQUEMENT) */}
        {allowForce && isAdmin && (
          <div className="mt-2 p-2 rounded-xl border border-orange-200 bg-orange-50">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={forceMode}
                onChange={(e) => setForceMode(e.target.checked)}
                className="w-4 h-4 rounded focus:ring-2"
                style={{ accentColor: colors.primary }}
              />
              <span className="text-xs font-bold text-orange-700 flex items-center gap-1">
                <Shield size={14} />
                👔 Mode Force (ignore le quota)
              </span>
            </label>
            <p className="text-[10px] text-orange-600 mt-0.5 ml-6">
              Permet d'assigner un aidant même s'il est complet (5/4, 6/4, etc.)
            </p>
          </div>
        )}
      </div>

      {/* ============================================================
      INFORMATION
      ============================================================ */}
      <div 
        className={`p-3 rounded-xl flex items-start gap-2 ${
          forceMode ? 'bg-orange-50 border border-orange-200' :
          'bg-blue-50 border border-blue-200'
        }`}
      >
        <Info size={16} className={forceMode ? 'text-orange-600' : 'text-blue-600'} />
        <div>
          <p className="text-xs font-medium" style={{ color: forceMode ? '#92400e' : '#065f46' }}>
            {forceMode 
              ? '👔 Mode Force activé - L\'aidant sera assigné même s\'il est complet'
              : targetType === 'visit' && isAdmin
                ? '👔 Assignation à une visite - L\'aidant gérera cette visite'
                : '✅ L\'aidant sera notifié de cette assignation'
            }
          </p>
          {targetType === 'visit' && isAdmin && !forceMode && (
            <p className="text-[10px] text-blue-600 mt-0.5">
              💡 Utilisez le mode "Force" pour assigner un aidant complet
            </p>
          )}
          {targetType === 'visit' && isAdmin && forceMode && (
            <p className="text-[10px] text-orange-600 mt-0.5">
              ⚠️ L'aidant pourra avoir plus de 4 assignations permanentes
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
            (targetTypeLocal === 'patient' && !selectedPatientId && targetType !== 'visit') ||
            (!selectedAidantId && !initialAidant) ||
            (isLoadingAidants)
          }
          className="flex-1 py-2.5 rounded-xl text-white font-bold transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ 
            background: (isLoading || (targetTypeLocal === 'patient' && !selectedPatientId && targetType !== 'visit') || (!selectedAidantId && !initialAidant)) 
              ? '#9CA3AF' 
              : colors.primary 
          }}
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <UserPlus size={16} />
              {targetType === 'visit' && isAdmin ? 'Assigner à la visite' : 'Assigner'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AssignAidantModalContent;
