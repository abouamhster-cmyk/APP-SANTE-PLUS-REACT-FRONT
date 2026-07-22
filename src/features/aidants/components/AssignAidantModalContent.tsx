// 📁 src/features/aidants/components/AssignAidantModalContent.tsx
 
import { useState, useEffect } from 'react';
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

const ASSIGNMENT_TYPES_UI = [
  { 
    value: 'secondary', 
    icon: '⚡', 
    label: 'Ponctuelle',
    description: 'Intervention unique',
  },
  { 
    value: 'primary', 
    icon: '📌', 
    label: 'Permanente',
    description: 'Suivi sur le long terme',
  },
];

interface AssignAidantModalContentProps {
  aidant?: any;
  patients?: any[];
  onSuccess: () => void;
  onCancel: () => void;
  colors?: any;
  targetType?: 'visit' | 'patient' | 'personal_account' | 'order' | 'family';
  targetId?: string;
  targetName?: string;
  currentAidantId?: string | null;
  allowForce?: boolean;
  onAssignAidant?: (aidantId: string, assignmentType: string, force?: boolean) => Promise<void>;
  isAdmin?: boolean;
}

export const AssignAidantModalContent = ({
  aidant: initialAidant,
  patients = [],
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
  const [assignmentType, setAssignmentType] = useState('primary'); 
  
  const hasPatients = patients.length > 0;
  const [targetTypeLocal, setTargetTypeLocal] = useState<'personal' | 'patient'>(
    hasPatients ? 'patient' : 'personal'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [aidants, setAidants] = useState<any[]>([]);
  const [isLoadingAidants, setIsLoadingAidants] = useState(false);
  const [forceMode, setForceMode] = useState(false);
  const [permanentAidantId, setPermanentAidantId] = useState<string | null>(null);

  const { fetchMyAssignments, fetchAidants } = useAidantCatalogStore();
  const { assignAidant: assignAidantStore } = useAssignmentStore();

  useEffect(() => {
    if (isAdmin && !initialAidant) {
      loadAvailableAidants();
    }
  }, [isAdmin, initialAidant]);

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
          const aidantData = data.aidant as any;
          const permanentUserId = Array.isArray(aidantData)
            ? aidantData[0]?.user_id
            : aidantData?.user_id;

          setPermanentAidantId(permanentUserId);
          if (permanentUserId) {
            setSelectedAidantId(permanentUserId);
          }
        }
      } catch (err) {
        console.warn('⚠️ Impossible de charger l’intervenant permanent');
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
    let aidantUserId = selectedAidantId || initialAidant?.user_id || initialAidant?.id;
    if (!aidantUserId) {
      toast.error('Veuillez sélectionner un aidant');
      return;
    }

    setIsLoading(true);

    try {
      const { useAuthStore } = await import('@/stores/authStore');
      const currentUser = useAuthStore.getState().user;
      
      if (!currentUser) throw new Error('Utilisateur non connecté');

      // ✅ 1. SI CALLBACK D'ASSIGNATION FOURNI (EX: PATIENTS PAGE)
      if (onAssignAidant && targetId) {
        await onAssignAidant(
          aidantUserId, 
          assignmentType === 'primary' ? 'primary' : 'secondary', 
          forceMode
        );
        onSuccess();
        return;
      }

      // ✅ 2. FIX CLEF : Utiliser le targetId transmis (ex: Neville) et NON L'ADMIN !
      const finalTargetType = isAdmin
        ? (targetType === 'personal_account' || targetType === 'personal' ? 'personal_account' : 'patient')
        : (targetTypeLocal === 'patient' ? 'patient' : 'personal_account');

      const finalTargetId = isAdmin
        ? (targetId || (targetTypeLocal === 'patient' ? selectedPatientId : currentUser.id))
        : (targetTypeLocal === 'patient' ? selectedPatientId : currentUser.id);

      const finalFamilyId = isAdmin ? (targetId || currentUser.id) : currentUser.id;

      const result = await assignAidantStore({
        aidantUserId: aidantUserId,
        targetType: finalTargetType as any,
        targetId: finalTargetId, // ✅ ID de Neville Bouchardyu
        assignmentType: assignmentType === 'primary' ? 'primary' : 'secondary',
        familyId: finalFamilyId,
        force: forceMode, 
      } as any);

      if (!result.success) {
        throw new Error(result.message || 'Erreur lors de l\'assignation');
      }

      await Promise.all([
        fetchMyAssignments(),
        fetchAidants()
      ]);

      toast.success(`Aidant assigné avec succès !`);
      onSuccess();

    } catch (error: any) {
      console.error('❌ Erreur d\'assignation:', error);
      toast.error(error.message || 'Erreur lors de l\'assignation');
    } finally {
      setIsLoading(false);
    }
  };

  const availableAidants = aidants || [];

  return (
    <div className="space-y-4 max-w-full">
      
      {/* SÉLECTION DE L'AIDANT */}
      {isAdmin && availableAidants.length > 0 && (
        <div className="space-y-1">
          <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500">
            Sélectionner un aidant pour {targetName || 'le bénéficiaire'}
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
              const displayName = isPermanent 
                ? `⭐ ${aidant.user?.full_name || aidant.full_name} (Permanent de ce compte)`
                : aidant.user?.full_name || aidant.full_name;

              const currentLoad = aidant.current_assignments || 0;
              const maxLoad = aidant.max_assignments || 4;

              return (
                <option key={aidant.id} value={aidant.user_id || aidant.id}>
                  {displayName} — Charge ({currentLoad}/{maxLoad})
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* TYPE D'ASSIGNATION */}
      <div className="space-y-1.5">
        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500">
          Type d'assignation
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ASSIGNMENT_TYPES_UI.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setAssignmentType(type.value)}
              className={`p-2.5 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center border w-full ${
                assignmentType === type.value ? 'text-white shadow-sm font-extrabold' : 'bg-gray-50 text-gray-500'
              }`}
              style={{
                background: assignmentType === type.value ? colors.primary : 'transparent',
                borderColor: assignmentType === type.value ? colors.primary : colors.primary + '25',
              }}
            >
              <span>{type.icon} {type.label}</span>
              <span className="text-[8px] opacity-80 truncate mt-0.5">{type.description}</span>
            </button>
          ))}
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
                👔 Forcer le rattachement (Ignorer quota)
              </span>
            </label>
          </div>
        )}
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
          disabled={isLoading || !selectedAidantId}
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
