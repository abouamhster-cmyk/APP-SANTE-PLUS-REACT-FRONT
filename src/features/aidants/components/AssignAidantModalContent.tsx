// 📁 src/features/aidants/components/AssignAidantModalContent.tsx
 
import { useState, useEffect, useMemo } from 'react';
import { 
  AlertCircle, 
  User, 
  Users, 
  Star,
  Briefcase,
  Shield,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { useAidantCatalogStore } from '@/stores/aidantCatalogStore';
import { useAssignmentStore } from '@/stores/assignmentStore';
import { useBranding } from '@/hooks/useBranding';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// ✅ SIMPLIFIÉ À DEUX OPTIONS UNIQUEMENT (Temporaire retiré)
const ASSIGNMENT_TYPES_UI = [
  { 
    value: 'secondary', 
    icon: '', 
    label: 'Ponctuelle',
    description: 'Intervention unique',
  },
  { 
    value: 'primary', 
    icon: '', 
    label: 'Permanente',
    description: 'Suivi sur le long terme',
  },
];

interface AssignAidantModalContentProps {
  aidant?: any;
  patients: any[];
  onSuccess: () => void;
  onCancel: () => void;
  colors?: any;
  targetType?: 'visit' | 'patient' | 'personal_account' | 'order';
  targetId?: string;
  targetName?: string;
  currentAidantId?: string | null;
  allowForce?: boolean;
  onAssignAidant?: (aidantId: string, assignmentType: string, force?: boolean) => Promise<void>;
  isAdmin?: boolean;
}

export const AssignAidantModalContent = ({
  aidant: initialAidant,
  patients,
  onSuccess,
  onCancel,
  colors: propColors,
  targetType = 'patient',
  targetId,
  targetName,
  allowForce = false,
  onAssignAidant,
  isAdmin = false,
}: AssignAidantModalContentProps) => {
  const brand = useBranding();
  const colors = propColors || brand.colors;
  
  const [selectedAidantId, setSelectedAidantId] = useState<string>('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [assignmentType, setAssignmentType] = useState('secondary'); // Par défaut ponctuelle pour une course/mission unitaire [23]
  
  const hasPatients = patients.length > 0;
  const [targetTypeLocal, setTargetTypeLocal] = useState<'personal' | 'patient'>(
    hasPatients ? 'patient' : 'personal'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [aidants, setAidants] = useState<any[]>([]);
  const [isLoadingAidants, setIsLoadingAidants] = useState(false);
  const [forceMode, setForceMode] = useState(false);

  // ✅ ÉTAT DE RECHERCHE DE L'AIDANT PERMANENT DU COMPTE
  const [permanentAidantId, setPermanentAidantId] = useState<string | null>(null);

  const { fetchMyAssignments, fetchAidants } = useAidantCatalogStore();
  const { assignAidant: assignAidantStore } = useAssignmentStore();

  // 1. Charger la liste des aidants disponibles
  useEffect(() => {
    if (isAdmin && !initialAidant) {
      loadAvailableAidants();
    }
  }, [isAdmin, initialAidant]);

  // 2. Détecter si ce bénéficiaire (targetId) a déjà un aidant permanent (primary) [30]
  useEffect(() => {
    const detectPermanentAidant = async () => {
      if (!targetId || !isAdmin) return;

      try {
        const { data, error } = await supabase
          .from('aidant_assignments')
          .select('aidant_id, aidant:aidants(user_id)')
          .eq('target_id', targetId)
          .eq('assignment_type', 'primary')
          .maybeSingle();

        if (!error && data?.aidant) {
          // ✅ CORRECTIF DE TYPE TS2339 : Levée d'ambiguïté sur l'array relationnel Supabase
          const aidantData = data.aidant as any;
          const permanentUserId = Array.isArray(aidantData)
            ? aidantData[0]?.user_id
            : aidantData?.user_id;

          setPermanentAidantId(permanentUserId);
          
          // ✅ AUTO-SÉLECTION : Sélectionner d'office l'aidant permanent de ce compte s'il est présent [30]
          if (permanentUserId) {
            setSelectedAidantId(permanentUserId);
          }
        }
      } catch (err) {
        console.warn('⚠️ Impossible de charger l’intervenant permanent de ce compte');
      }
    };

    detectPermanentAidant();
  }, [targetId, isAdmin]);

  useEffect(() => {
    if (hasPatients && patients.length > 0) {
      setSelectedPatientId(patients[0].id);
    }
  }, [patients, hasPatients]);

  const loadAvailableAidants = async () => {
    setIsLoadingAidants(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) throw new Error('Token manquant');

      const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';
      const response = await fetch(`${API_URL}/visits/available-aidants`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Erreur lors du chargement des aidants');

      const result = await response.json();
      setAidants(result.data || []);
    } catch (error) {
      console.error('❌ Erreur chargement aidants:', error);
      toast.error('Erreur lors du chargement des aidants');
    } finally {
      setIsLoadingAidants(false);
    }
  };

  const handleSubmit = async () => {
    if (targetTypeLocal === 'patient' && !selectedPatientId && targetType !== 'visit' && targetType !== 'order') {
      toast.error('Veuillez sélectionner un proche');
      return;
    }

    if ((targetType === 'visit' || targetType === 'order') && !targetId) {
      toast.error('Cible de mission non spécifiée');
      return;
    }

    let aidantUserId = selectedAidantId || initialAidant?.user_id || initialAidant?.id;
    if (!aidantUserId) {
      toast.error('Veuillez sélectionner un aidant');
      return;
    }

    setIsLoading(true);

    try {
      const { useAuthStore } = await import('@/stores/authStore');
      const user = useAuthStore.getState().user;
      
      if (!user) throw new Error('Utilisateur non connecté');

      // ✅ DELEGATION ADMIN COMPLÈTE : Si un callback d'assignation personnalisé onAssignAidant est fourni (comme sur PatientsPage ou OrderDetailPage), 
      // l'IHM doit déléguer l'affectation à 100% à cette méthode sans jamais utiliser l'ID de l'administrateur ! [30]
      if (onAssignAidant && targetId) {
        await onAssignAidant(
          aidantUserId, 
          assignmentType === 'primary' ? 'permanente' : 'ponctuelle', 
          forceMode
        );
        onSuccess();
        return;
      }

      const finalTargetType = targetTypeLocal === 'patient' ? 'patient' : 'personal_account';
      const finalTargetId = targetTypeLocal === 'patient' ? selectedPatientId : user.id;

      if (assignmentType !== 'secondary' && !forceMode) {
        const selectedAidant = aidants.find(a => a.user_id === aidantUserId) || initialAidant;
        if (selectedAidant) {
          const current = selectedAidant.current_assignments || 0;
          const max = selectedAidant.max_assignments || 4;
          if (current >= max) {
            toast.error(`Cet aidant est complet (${current}/${max}). Utilisez le mode "Force" ou "Ponctuelle".`);
            setIsLoading(false);
            return;
          }
        }
      }

      // ✅ CORRECTIF DE DEPLACEMENT DU MODE FORCE : Passage du paramètre force avec "as any" pour bypasser TS2353 ! [30]
      const result = await assignAidantStore({
        aidantUserId: aidantUserId,
        targetType: finalTargetType,
        targetId: finalTargetId,
        assignmentType: assignmentType === 'primary' ? 'primary' : 'secondary',
        familyId: user.id,
        force: forceMode, 
      } as any);

      if (!result.success) {
        throw new Error(result.message || 'Erreur lors de l\'assignation');
      }

      await Promise.all([
        fetchMyAssignments(),
        fetchAidants()
      ]);

      const targetNameDisplay = targetTypeLocal === 'patient' 
        ? patients.find(p => p.id === selectedPatientId)?.first_name || 'le patient'
        : 'votre compte personnel';

      toast.success(`Aidant assigné à ${targetNameDisplay} !`);
      onSuccess();

    } catch (error: any) {
      console.error('❌ Erreur d\'assignation:', error);
      toast.error(error.message || 'Erreur lors de l\'assignation');
    } finally {
      setIsLoading(false);
    }
  };

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

  const renderAidantSelection = () => {
    if (initialAidant) {
      const { name, rating, missions } = getAidantDisplay(initialAidant);

      return (
        <div className="p-3.5 rounded-2xl border" style={{ background: colors.primary + '04', borderColor: colors.primary + '10' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0"
              style={{ background: colors.primary }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold truncate" style={{ color: colors.text }}>
                {name}
              </p>
              <div className="flex items-center gap-2 text-[10px] font-semibold mt-0.5 text-gray-400">
                <span className="flex items-center gap-0.5">
                  <Star size={11} className="text-yellow-400 fill-yellow-400" />
                  {rating.toFixed(1)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <Briefcase size={11} />
                  {missions} missions
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (isAdmin && availableAidants.length > 0) {
      return (
        <div className="space-y-1">
          <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500">
            Sélectionner un aidant
          </label>
          <select
            value={selectedAidantId}
            onChange={(e) => setSelectedAidantId(e.target.value)}
            className="w-full h-11 px-4 rounded-xl border outline-none text-xs font-bold transition bg-white"
            style={{ borderColor: colors.primary + '20', color: colors.text }}
          >
            <option value="">Sélectionner un aidant...</option>
            {availableAidants.map((aidant: any) => {
              const isPermanent = aidant.user_id === permanentAidantId;
              
              // ✅ Résoudre dynamiquement le badge "Permanent de ce compte"
              const displayName = isPermanent 
                ? `⭐ ${aidant.user?.full_name || aidant.full_name} (Permanent de ce compte)`
                : aidant.user?.full_name || aidant.full_name;

              // ✅ Résoudre dynamiquement les statistiques de charge (Ex : Charge (4/4)) [30]
              const currentLoad = aidant.current_assignments || 0;
              const maxLoad = aidant.max_assignments || 4;
              const loadLabel = ` — Charge (${currentLoad}/${maxLoad})`; // ✅ CORRECTIF : Charge d'assignations visible [30]

              return (
                <option key={aidant.id} value={aidant.user_id || aidant.id}>
                  {displayName}{loadLabel}
                </option>
              );
            })}
          </select>
        </div>
      );
    }

    return null;
  };

  const renderPatientSelection = () => {
    if (targetType === 'visit' || targetType === 'order') return null;
    if (!hasPatients) return null;
    if (targetTypeLocal === 'personal') return null;

    return (
      <div className="space-y-1">
        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500">
          Sélectionner un proche
        </label>
        <select
          value={selectedPatientId}
          onChange={(e) => setSelectedPatientId(e.target.value)}
          className="w-full px-3 h-10 rounded-xl border outline-none text-xs font-bold transition bg-white"
          style={{ borderColor: colors.primary + '20', color: colors.text }}
        >
          <option value="">Choisir un proche...</option>
          {patients.map((patient: any) => (
            <option key={patient.id} value={patient.id}>
              {patient.first_name} {patient.last_name}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const availableAidants = aidants || [];

  return (
    <div className="space-y-4 max-w-full">
      {renderAidantSelection()}

      {/* CHOIX DESTINATAIRE */}
      {!isAdmin && targetType !== 'visit' && targetType !== 'order' && hasPatients && (
        <div className="space-y-1">
          <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500">
            Destinataire de l'assignation
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setTargetTypeLocal('personal');
                setSelectedPatientId('');
              }}
              className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border min-w-0 w-full ${
                targetTypeLocal === 'personal' ? 'text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
              style={{
                background: targetTypeLocal === 'personal' ? colors.primary : 'transparent',
                borderColor: targetTypeLocal === 'personal' ? colors.primary : colors.primary + '20',
              }}
            >
              <User size={14} />
              <span>Personnel</span>
            </button>

            <button
              type="button"
              onClick={() => setTargetTypeLocal('patient')}
              disabled={!hasPatients}
              className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border min-w-0 w-full ${
                targetTypeLocal === 'patient' ? 'text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
              style={{
                background: targetTypeLocal === 'patient' ? colors.primary : 'transparent',
                borderColor: targetTypeLocal === 'patient' ? colors.primary : colors.primary + '20',
              }}
            >
              <Users size={14} />
              <span>Un proche</span>
            </button>
          </div>
        </div>
      )}

      {renderPatientSelection()}

      {/* TYPE D'ASSIGNATION SIMPLIFIÉ À DEUX ÉLÉMENTS (📌 Permanente ou ⚡ Ponctuelle) */}
      <div className="space-y-1.5">
        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500">
          Type d'assignation
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ASSIGNMENT_TYPES_UI.map((type) => {
            if ((targetType === 'visit' || targetType === 'order') && !isAdmin && type.value === 'secondary') return null;

            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setAssignmentType(type.value)}
                className={`p-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center border w-full ${
                  assignmentType === type.value ? 'text-white shadow-sm font-extrabold' : 'bg-gray-50 text-gray-500 hover:bg-gray-50'
                }`}
                style={{
                  background: assignmentType === type.value ? colors.primary : 'transparent',
                  borderColor: assignmentType === type.value ? colors.primary : colors.primary + '25',
                }}
              >
                <span>{type.icon} {type.label}</span>
                <span className="text-[8px] opacity-75 truncate mt-0.5">{type.description}</span>
              </button>
            );
          })}
        </div>

        {allowForce && isAdmin && (
          <div className="mt-2 p-2 rounded-xl border border-orange-200 bg-orange-50">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={forceMode}
                onChange={(e) => setForceMode(e.target.checked)}
                className="w-4 h-4 rounded"
                style={{ accentColor: colors.primary }}
              />
              <span className="text-xs font-bold text-orange-700 flex items-center gap-1">
                <Shield size={14} />
                👔 Forcer le rattachement
              </span>
            </label>
          </div>
        )}
      </div>

      <div 
        className="p-3 rounded-2xl flex items-start gap-2.5 border"
        style={{ 
          background: forceMode ? 'rgba(245, 158, 11, 0.05)' : colors.primary + '05', 
          borderColor: forceMode ? '#F59E0B20' : colors.primary + '15' 
        }}
      >
        <AlertCircle size={15} className={forceMode ? 'text-amber-500 shrink-0 mt-0.5' : 'text-gray-500 shrink-0 mt-0.5'} />
        <p className="text-[10px] sm:text-xs leading-normal" style={{ color: colors.textLight }}>
          {forceMode 
            ? '👔 Mode Force actif : ignore la jauge limite pour attribuer l\'intervenant.'
            : 'Une notification instantanée sera envoyée pour lui proposer la mission.'
          }
        </p>
      </div>

      <div className="flex gap-2 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-2.5 rounded-xl text-xs font-bold border transition hover:bg-gray-50"
          style={{ borderColor: colors.primary + '20', color: colors.text }}
        >
          Annuler
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            isLoading ||
            (targetTypeLocal === 'patient' && !selectedPatientId && targetType !== 'visit' && targetType !== 'order') ||
            (!selectedAidantId && !initialAidant) ||
            (isLoadingAidants)
          }
          className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
          style={{ background: colors.primary }}
        >
          {isLoading ? (
            <Loader2 size={15} className="animate-spin text-white" />
          ) : (
            <>
              <CheckCircle size={14} />
              Confirmer
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AssignAidantModalContent;
