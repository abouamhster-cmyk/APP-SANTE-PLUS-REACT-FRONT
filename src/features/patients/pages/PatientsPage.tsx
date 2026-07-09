// 📁 src/features/patients/pages/PatientsPage.tsx
 
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  UserPlus,
  ShieldAlert,
  RefreshCw,
  Users,
  UserCheck,
  Home,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Circle,
  XCircle,
  CheckCircle,
  User,
  UserMinus,
  Briefcase,
  Shield,
  X,
  Heart,
  Info,
} from 'lucide-react';

import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import { useAssignmentStore } from '@/stores/assignmentStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { Illustration } from '@/components/ui/Illustration';
import { PatientCard } from '@/components/patients/PatientCard';
import { PatientModal } from '../components/PatientModal';
import { useRefreshableData } from '@/hooks/useRefreshableData';
import { supabase } from '@/lib/supabase';
import { assignmentAPI } from '@/lib/api';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

// ============================================================
// TYPES & LOGIQUES
// ============================================================

interface Aidant {
  id: string;
  user_id: string;
  user: { id: string; full_name: string; email: string } | null;
  specialties: string[];
  available: boolean;
  status: string;
  is_verified: boolean;
  max_assignments: number;
  current_assignments: number;
}

interface FamilyAccount {
  id: string;
  full_name: string;
  email: string;
  patient_category: string | null;
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  category: string;
  family_id: string;
}

interface Assignment {
  id: string;
  aidant_user_id: string;
  target_type: 'patient' | 'personal' | 'family';
  target_id: string;
  assignment_type: string;
  status: string;
  priority: number;
  created_at: string;
}

interface AssignmentItem {
  id: string;
  type: 'account' | 'patient';
  familyId: string;
  familyName: string;
  targetId: string;
  targetName: string;
  targetType: 'personal_account' | 'patient' | 'family';
  category: string;
  isPersonal: boolean;
  priority: number;
  assignedAidantUserId?: string;
  assignedAidantName?: string;
  assignmentType?: string;
  assignmentId?: string;
}

interface ExpandedState {
  [key: string]: boolean;
}

const ASSIGNMENT_TYPES = [
  { value: 'primary', label: '📌 Permanente', color: '#10B981' },
  { value: 'temporary', label: '⏳ Temporaire', color: '#F59E0B' },
  { value: 'secondary', label: '⚡ Ponctuelle', color: '#3B82F6' },
];

const getCategoryLabel = (category: string): string => {
  if (category === 'maman_bebe') return '👶 Maman & Bébé';
  if (category === 'senior') return '👴 Senior';
  if (category === 'personal') return '👤 Personnel';
  return 'Non spécifié';
};

const getCategoryColor = (category: string): string => {
  if (category === 'maman_bebe') return '#db4a6d';
  if (category === 'senior') return '#10b981';
  if (category === 'personal') return '#3b82f6';
  return '#9ca3af';
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export const PatientsPage = () => {
  const navigate = useNavigate();
  const { profile, role, user } = useAuthStore();
  const { fetchAssignments } = useAssignmentStore();

  const {
    singular,
    add,
    list,
    empty,
    emptyAction,
    getCountLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const { 
    patients, 
    isLoading: patientsLoading, 
    fetchPatients, 
    deletePatient, 
    canManagePatients, 
    syncAidantPatients,
  } = usePatientStore();

  // ============================================================
  // ÉTATS LOCALISÉS
  // ============================================================
  const [aidants, setAidants] = useState<Aidant[]>([]);
  const [familyAccounts, setFamilyAccounts] = useState<FamilyAccount[]>([]);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [assignmentsMap, setAssignmentsMap] = useState<Record<string, Assignment>>({});
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isSyncing, setIsSyncing] = useState(false);

  // States pour le nouveau modal contextuel d'assignation individuelle
  const [showRowAssignModal, setShowRowAssignModal] = useState(false);
  const [selectedItemToAssign, setSelectedItemToAssign] = useState<AssignmentItem | null>(null);
  const [modalAidant, setModalAidant] = useState('');
  const [modalType, setModalType] = useState('primary');
  const [modalForce, setModalForce] = useState(false);

  const colors = getThemeColors(getThemeByRole(role as any, profile?.patient_category as any));
  const canManage = canManagePatients();
  const isAdmin = isAdminOrCoordinator;

  // ============================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================

  const fetchAllData = useCallback(async () => {
    if (!isAdmin) {
      await fetchPatients();
      return;
    }

    setIsLoadingAssignments(true);
    try {
      await fetchPatients(true);
      
      const { data: familiesData, error: familiesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, patient_category')
        .eq('role', 'family')
        .order('full_name');

      if (familiesError) throw familiesError;
      setFamilyAccounts(familiesData || []);

      const { data: aidantsData } = await supabase
        .from('aidants')
        .select('*')
        .eq('status', 'approved')
        .eq('is_verified', true);

      const userIds = (aidantsData || []).map(a => a.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap: any = {};
      profiles?.forEach(p => (profileMap[p.id] = p));

      setAidants(
        (aidantsData || []).map(a => ({
          ...a,
          user: profileMap[a.user_id] || null,
        }))
      );

      const { data: patientsData } = await supabase
        .from('patients')
        .select('id, first_name, last_name, category, patient_family_links(family_id)');

      setAllPatients(
        (patientsData || []).map(p => ({
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          category: p.category,
          family_id: p.patient_family_links?.[0]?.family_id || '',
        }))
      );

      const response = await assignmentAPI.adminGetAll();
      const assignmentsData = response.data?.data || [];
      const mapAssign: any = {};
      
      assignmentsData?.forEach((a: any) => {
        if (a.status === 'active') {
          const key = `${a.target_type}_${a.target_id}`;
          mapAssign[key] = a;
        }
      });
      setAssignmentsMap(mapAssign);

    } catch (error) {
      console.error('❌ Erreur fetchAllData:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoadingAssignments(false);
    }
  }, [isAdmin, fetchPatients]);

  const assignmentItems = useMemo(() => {
    if (!isAdmin) return [];

    return familyAccounts.flatMap(family => {
      const accountKey = `personal_${family.id}`;
      const accountAssignment = assignmentsMap[accountKey];

      let accountAidantName = '';
      if (accountAssignment?.aidant_user_id) {
        const aidant = aidants.find(a => a.user_id === accountAssignment.aidant_user_id);
        accountAidantName = aidant?.user?.full_name || 'Aidant';
      }

      const accountItem: AssignmentItem = {
        id: accountKey,
        type: 'account',
        familyId: family.id,
        familyName: family.full_name,
        targetId: family.id,
        targetName: `${family.full_name}`,
        targetType: 'personal_account',
        category: 'personal',
        isPersonal: true,
        priority: 2,
        assignedAidantUserId: accountAssignment?.aidant_user_id || undefined,
        assignedAidantName: accountAidantName,
        assignmentType: accountAssignment?.assignment_type,
        assignmentId: accountAssignment?.id,
      };

      const familyPatients = allPatients.filter(p => p.family_id === family.id);
      const patientItems: AssignmentItem[] = familyPatients.map(p => {
        const key = `patient_${p.id}`;
        const a = assignmentsMap[key];

        let aidantName = '';
        if (a?.aidant_user_id) {
          const aidant = aidants.find(ad => ad.user_id === a.aidant_user_id);
          aidantName = aidant?.user?.full_name || 'Aidant';
        }

        return {
          id: key,
          type: 'patient' as const,
          familyId: family.id,
          familyName: family.full_name,
          targetId: p.id,
          targetName: `${p.first_name} ${p.last_name}`,
          targetType: 'patient' as const,
          category: p.category,
          isPersonal: false,  
          priority: 1,
          assignedAidantUserId: a?.aidant_user_id || undefined,
          assignedAidantName: aidantName,
          assignmentType: a?.assignment_type,
          assignmentId: a?.id,
        };
      });

      return [accountItem, ...patientItems];
    });
  }, [isAdmin, familyAccounts, allPatients, assignmentsMap, aidants]);

  const filteredItems = useMemo(() => {
    if (!isAdmin) return [];

    let items = assignmentItems;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(item =>
        item.targetName.toLowerCase().includes(term) ||
        item.familyName.toLowerCase().includes(term) ||
        (item.assignedAidantName && item.assignedAidantName.toLowerCase().includes(term))
      );
    }

    if (categoryFilter !== 'all') {
      items = items.filter(item => {
        if (categoryFilter === 'personal') return item.isPersonal;
        return item.category === categoryFilter;
      });
    }

    return items;
  }, [isAdmin, assignmentItems, searchTerm, categoryFilter]);

  const grouped = useMemo(() => {
    if (!isAdmin) return {};

    return filteredItems.reduce((acc: any, item) => {
      acc[item.familyId] = acc[item.familyId] || {
        name: item.familyName,
        items: [],
      };
      acc[item.familyId].items.push(item);
      return acc;
    }, {});
  }, [isAdmin, filteredItems]);

  const stats = useMemo(() => {
    if (!isAdmin) {
      return {
        totalBeneficiaires: patients.length,
        assignedCount: 0,
        unassignedCount: patients.length,
        totalFamilies: 0,
        patientsCount: patients.length,
      };
    }

    const totalFamilies = familyAccounts.length;
    const totalPatients = allPatients.length;
    const totalBeneficiaires = totalFamilies + totalPatients;
    
    const assignedCount = assignmentItems.filter(i => i.assignedAidantUserId).length;
    const unassignedCount = totalBeneficiaires - assignedCount;

    return {
      totalBeneficiaires,
      assignedCount,
      unassignedCount,
      totalFamilies,
      patientsCount: totalPatients,
    };
  }, [isAdmin, assignmentItems, familyAccounts, allPatients, patients]);

  const filteredPatients = useMemo(() => {
    if (isAdmin) return [];
    
    const search = searchTerm.trim().toLowerCase();
    const category = categoryFilter;

    return patients.filter((patient: any) => {
      const matchSearch =
        !search ||
        patient.first_name?.toLowerCase().includes(search) ||
        patient.last_name?.toLowerCase().includes(search) ||
        patient.address?.toLowerCase().includes(search);

      const matchCategory =
        category === 'all' || patient.category === category;

      return matchSearch && matchCategory;
    });
  }, [isAdmin, patients, searchTerm, categoryFilter]);

  const toggleExpand = (familyId: string) => {
    setExpanded(prev => ({ ...prev, [familyId]: !prev[familyId] }));
  };

  // ============================================================
  // GESTION DU MODAL D'ASSIGNATION CONTEXTUEL INDIVIDUEL
  // ============================================================

  const handleOpenRowAssignModal = (item: AssignmentItem) => {
    setSelectedItemToAssign(item);
    setModalAidant('');
    setModalType('primary');
    setModalForce(false);
    setShowRowAssignModal(true);
  };

  const handleConfirmRowAssign = async () => {
    if (!selectedItemToAssign) return;
    if (!modalAidant) {
      toast.error('Veuillez sélectionner un aidant dans la liste');
      return;
    }

    setIsProcessing(true);

    try {
      await assignmentAPI.adminForceAssign({
        aidantUserId: modalAidant,
        targetType: selectedItemToAssign.targetType,
        targetId: selectedItemToAssign.targetId,
        familyId: selectedItemToAssign.familyId,
        assignmentType: modalType,
        reason: `Rattachement administratif contextuel par ${profile?.full_name}`,
        expiresAt: null,
        force: modalForce,
      });

      toast.success(`Intervenant rattaché à ${selectedItemToAssign.targetName} avec succès !`);
      setShowRowAssignModal(false);
      setSelectedItemToAssign(null);
      await fetchAllData();
    } catch (error: any) {
      console.error('❌ Erreur assignation:', error);
      if (error.message?.includes('AIDANT_FULL') || error.message?.includes('quota')) {
        toast.error('Cet aidant a atteint son quota. Activez "Forcer l\'assignation" pour continuer.');
      } else {
        toast.error(error.message || 'Erreur lors de l\'attribution');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevoke = async (item: AssignmentItem) => {
    if (!item.assignmentId) {
      toast.error('Assignation introuvable');
      return;
    }

    if (!window.confirm(`Retirer l'assignation de ${item.targetName} ?`)) return;

    setProcessingId(item.id);
    setIsProcessing(true);

    try {
      await assignmentAPI.revoke(item.assignmentId, `Révocation de l'intervenant par l'administration`);
      toast.success(`Intervenant retiré de la fiche de ${item.targetName}`);
      await fetchAllData();
    } catch (error: any) {
      console.error('❌ Erreur révocation:', error);
      toast.error(error.message || 'Erreur lors du retrait de l\'aidant');
    } finally {
      setIsProcessing(false);
      setProcessingId(null);
    }
  };

  // ============================================================
  // LOGIQUE PATIENTS / PROCHES COMPTE FAMILLE
  // ============================================================

  const handleDelete = async (id: string) => {
    if (!canManage) {
      toast.error('Droits d\'édition insuffisants.');
      return;
    }

    if (!window.confirm(`Confirmez-vous le retrait définitif de ce proche ?`)) return;

    try {
      await deletePatient(id);
      toast.success('Bénéficiaire supprimé avec succès.');
      await fetchAllData();
    } catch (error: any) {
      console.error('❌ Erreur suppression:', error);
      toast.error(error.message || `Une erreur est survenue lors de la suppression`);
    }
  };

  const handleEdit = (patient: any) => {
    if (!canManage) {
      toast.error('Droits d\'édition insuffisants.');
      return;
    }
    setSelectedPatient(patient);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    if (!canManage) {
      toast.error('Droits d\'édition insuffisants.');
      return;
    }
    setSelectedPatient(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    if (isAidant) {
      syncAidantPatients();
    } else {
      fetchAllData();
    }
    setIsModalOpen(false);
  };

  const { refreshAll, isRefreshing } = useRefreshableData({
    onRefresh: async () => {
      if (isAidant) {
        await syncAidantPatients();
      } else {
        await fetchAllData();
      }
    },
    onError: () => {
      toast.error('Mise à jour impossible. Réseau instable.');
    },
  });

  useEffect(() => {
    const loadData = async () => {
      if (isAidant) {
        await syncAidantPatients();
      } else {
        await fetchAllData();
      }
    };
    loadData();
  }, [role, user?.id]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data: aidant, error: aidantError } = await supabase
        .from('aidants')
        .select('id, user_id, is_verified, status')
        .eq('user_id', user?.id)
        .single();
      
      if (aidantError || !aidant) {
        toast.error('Fiche aidant introuvable.');
        setIsSyncing(false);
        return;
      }

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('aidant_assignments')
        .select('target_id, target_type')
        .eq('aidant_user_id', aidant.user_id)
        .eq('status', 'active')
        .eq('target_type', 'patient');

      if (assignmentsError) console.error(assignmentsError);

      const patientIds = assignmentsData?.map(a => a.target_id).filter(Boolean) || [];

      if (patientIds.length === 0) {
        const { data: links, error: linksError } = await supabase
          .from('patient_family_links')
          .select('patient_id')
          .eq('family_id', aidant.user_id);

        if (!linksError && links) {
          const ids = links.map(l => l.patient_id).filter(Boolean);
          patientIds.push(...ids);
        }
      }

      if (patientIds.length === 0) {
        toast('Aucun bénéficiaire rattaché à votre compte.', { icon: '🦸' });
        usePatientStore.setState({ patients: [] });
        setIsSyncing(false);
        return;
      }

      const { data: directPatients, error: patientsError } = await supabase
        .from('patients')
        .select('*')
        .in('id', patientIds);
      
      if (patientsError) throw patientsError;

      if (directPatients && directPatients.length > 0) {
        usePatientStore.setState({ patients: directPatients });
        toast.success(`${directPatients.length} patient(s) synchronisé(s) en direct !`);
      } else {
        toast('Aucune donnée active à synchroniser.', { icon: 'ℹ️' });
        usePatientStore.setState({ patients: [] });
      }
    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
      toast.error('Erreur de synchronisation réseau');
    } finally {
      setIsSyncing(false);
    }
  };

  const isLoading = patientsLoading || isLoadingAssignments;

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-6 p-4">
        <div className="h-20 bg-white dark:bg-[#17231d] rounded-3xl animate-pulse flex items-center justify-between px-6">
          <div className="space-y-2 w-1/3">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-full w-3/4"></div>
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-1/2"></div>
          </div>
          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-white dark:bg-[#17231d] rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-28 bg-white dark:bg-[#17231d] rounded-3xl animate-pulse border border-gray-100 dark:border-[#2c3f35] p-5" />
          ))}
        </div>
      </div>
    );
  }

  const modalSelectedAidantObj = aidants.find(a => a.user_id === modalAidant);
  const isSelectedAidantFull = modalSelectedAidantObj && (modalSelectedAidantObj.current_assignments >= modalSelectedAidantObj.max_assignments);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-28 px-4 sm:px-6">
      
      {/* HEADER DE LA PAGE ÉPURÉ */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-[#2c3f35]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
              <Users size={18} />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
              {isAdmin ? 'Bénéficiaires & Familles' : list}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {isAdmin 
              ? 'Supervision des dossiers d\'accompagnement et suivi des rattachements d\'aidants.' 
              : 'Consultez les fiches de vos proches pris en charge par nos équipes.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            onClick={refreshAll}
            disabled={isLoading || isSyncing || isRefreshing}
            className="w-10 h-10 rounded-2xl border bg-white dark:bg-[#17231d] border-gray-100 dark:border-[#2c3f35] flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[#24362d] transition text-gray-500"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          </button>

          {canManage && !isAdmin && patients.length > 0 && (
            <button
              onClick={handleAdd}
              className="inline-flex px-4 py-2.5 rounded-2xl text-xs font-black text-white transition hover:opacity-90 shrink-0 items-center gap-2 shadow-md"
              style={{ background: colors.primary }}
            >
              <Plus size={15} />
              {add}
            </button>
          )}

          {isAidant && !canManage && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100/60 dark:border-amber-900/30 shadow-sm shrink-0">
              <ShieldAlert size={14} className="text-amber-500" />
              <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wide">Lecture Seule</span>
            </div>
          )}
        </div>
      </section>

      {/* METRICS CARDS (SYNTHÉTIQUES & MODERNES) */}
      {isAdmin && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-[#17231d] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-[#2c3f35] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-[#24362d] text-gray-500 dark:text-gray-300 shrink-0"><Users size={16} /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Total Profils</p>
              <p className="text-base font-extrabold text-gray-800 dark:text-gray-100 mt-0.5">{stats.totalBeneficiaires}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-[#17231d] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-[#2c3f35] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50 dark:bg-[#1d2d25] text-emerald-600 dark:text-emerald-400 shrink-0"><CheckCircle size={16} /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Profils Assignés</p>
              <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.assignedCount}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-[#17231d] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-[#2c3f35] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50 dark:bg-[#2c322c] text-amber-600 dark:text-amber-400 shrink-0"><AlertCircle size={16} /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Non Assignés</p>
              <p className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{stats.unassignedCount}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-[#17231d] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-[#2c3f35] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-[#1a2620] text-blue-600 dark:text-blue-400 shrink-0"><Home size={16} /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Familles</p>
              <p className="text-base font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">{stats.totalFamilies}</p>
            </div>
          </div>
        </section>
      )}

      {/* RECHERCHE ET FILTRAGE SEGMENTÉ */}
      <section className="bg-white dark:bg-[#17231d] rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-[#2c3f35] flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isAdmin ? "Rechercher par nom, famille, aidant..." : "Rechercher par nom, adresse..."}
            className="w-full pl-10 pr-4 py-2 rounded-xl border text-xs outline-none transition focus:ring-1 bg-gray-50/50 dark:bg-[#1d2d25]/50 border-gray-100 dark:border-[#2c3f35]"
            style={{ color: colors.text }}
          />
        </div>
        
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 text-xs rounded-xl border bg-gray-50 dark:bg-[#1d2d25] outline-none focus:ring-1 shrink-0 sm:w-48 border-gray-100 dark:border-[#2c3f35]"
          style={{ color: colors.text }}
        >
          <option value="all">Toutes les catégories</option>
          <option value="senior">👴 Seniors</option>
          <option value="maman_bebe">👶 Mamans & Bébés</option>
          {isAdmin && <option value="personal">👤 Comptes personnels</option>}
        </select>
      </section>

      {/* BANNIÈRE DE SYNCHRONISATION (AIDANTS) */}
      {isAidant && (
        <div className="bg-amber-50/40 dark:bg-amber-950/15 rounded-2xl p-4 border border-amber-100 dark:border-amber-900/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Mise à jour de vos attributions d'accès</p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              Si un coordinateur vient de vous affecter un nouveau bénéficiaire, synchronisez votre planning local.
            </p>
          </div>
          
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm border bg-white dark:bg-[#17231d] border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-400"
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Chargement...' : 'Mettre à jour'}
          </button>
        </div>
      )}

      {/* ZONE PRINCIPALE DE CONTENU */}
      {isAdmin ? (
        Object.keys(grouped).length === 0 ? (
          <section className="bg-white dark:bg-[#17231d] rounded-2xl py-14 px-4 text-center border border-gray-100 dark:border-[#2c3f35] max-w-md mx-auto space-y-4">
            <Illustration 
              type={searchTerm || categoryFilter !== 'all' ? 'search' : 'users'} 
              size="md" 
              className="mx-auto opacity-35"
            />
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100">
                {searchTerm || categoryFilter !== 'all' ? 'Aucun dossier correspondant' : 'Aucune fiche bénéficiaire'}
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-400">
                {searchTerm || categoryFilter !== 'all' ? 'Essayez de réinitialiser la recherche.' : 'Les fiches d’inscriptions apparaîtront ici.'}
              </p>
            </div>
          </section>
        ) : (
          /* DOSSIERS FAMILIAUX (ADMIN COLLAPSIBLE) */
          <div className="space-y-4">
            {Object.entries(grouped).map(([familyId, group]: any) => {
              const isExpanded = expanded[familyId] !== false;
              const familyItems = group.items;
              const hasUnassigned = familyItems.some((i: AssignmentItem) => !i.assignedAidantUserId);

              return (
                <div 
                  key={familyId} 
                  className="bg-white dark:bg-[#17231d] rounded-2xl border border-gray-100 dark:border-[#2c3f35] overflow-hidden shadow-sm transition-all"
                >
                  {/* EN-TÊTE DU DOSSIER FAMILIAL */}
                  <div
                    className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/30 dark:hover:bg-[#24362d]/25 transition"
                    onClick={() => toggleExpand(familyId)}
                    style={{ background: hasUnassigned ? colors.primary + '04' : 'transparent' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-1 rounded-lg bg-gray-100/50 dark:bg-[#1d2d25] text-gray-400 shrink-0">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                      <div className="min-w-0">
                        <span className="font-extrabold text-xs sm:text-sm text-gray-800 dark:text-gray-200">
                          👨‍👩‍👦 Famille {group.name}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold bg-gray-50 dark:bg-[#1d2d25] px-1.5 py-0.5 rounded border border-gray-100 dark:border-[#2c3f35]">
                            {familyItems.filter((i: AssignmentItem) => i.type === 'patient').length} proche(s)
                          </span>
                          {hasUnassigned && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-bold border border-amber-100/40 dark:border-amber-900/20 flex items-center gap-1">
                              • En attente d'aidant
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold shrink-0 hidden sm:inline-block">
                      {familyItems.filter((i: AssignmentItem) => i.assignedAidantUserId).length} / {familyItems.length} Rattachés
                    </span>
                  </div>

                  {/* LISTE DES MEMBRES DU DOSSIER */}
                  {isExpanded && (
                    <div className="px-5 pb-4 space-y-3 relative">
                      <div className="absolute left-[31px] top-0 bottom-4 w-px bg-gray-100 dark:bg-[#2c3f35] z-0" />
                      
                      {familyItems.map((item: AssignmentItem) => {
                        const isAssigned = !!item.assignedAidantUserId;
                        const isAccount = item.type === 'account';
                        const categoryColor = getCategoryColor(item.category);
                        const categoryLabel = getCategoryLabel(item.category);
                        const isProcessingItem = processingId === item.id;

                        return (
                          <div 
                            key={item.id} 
                            className="pl-7 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gray-50/30 hover:bg-gray-50 dark:bg-[#111a15]/10 dark:hover:bg-[#1d2d25]/20 rounded-2xl border border-transparent hover:border-gray-100/50 dark:hover:border-[#2c3f35]/50 transition-all"
                          >
                            <div className="absolute left-[12px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border border-gray-200 dark:border-[#2c3f35] bg-white dark:bg-[#17231d] z-10" />

                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="shrink-0 mt-0.5">
                                {item.priority === 1 ? (
                                  <span className="text-[8px] font-black text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/20 px-1.5 py-0.5 rounded">PROCHE</span>
                                ) : (
                                  <span className="text-[8px] font-black text-blue-700 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/20 px-1.5 py-0.5 rounded">TITULAIRE</span>
                                )}
                              </div>

                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-xs sm:text-sm text-gray-800 dark:text-gray-100 truncate">
                                    {item.targetName}
                                  </span>
                                  <span 
                                    className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                                    style={{ background: categoryColor + '12', color: categoryColor }}
                                  >
                                    {categoryLabel}
                                  </span>
                                  {isAssigned && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-100/40 dark:border-emerald-900/20 shrink-0 flex items-center gap-1">
                                      <CheckCircle size={10} />
                                      {item.assignedAidantName}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                                  {isAccount ? 'Compte de facturation' : 'Bénéficiaire d\'accompagnement'}
                                  {item.assignmentType && (
                                    <span className="ml-1 opacity-70">
                                      ({ASSIGNMENT_TYPES.find(t => t.value === item.assignmentType)?.label || item.assignmentType})
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                              {isAssigned ? (
                                <button
                                  onClick={() => handleRevoke(item)}
                                  disabled={isProcessingItem || isProcessing}
                                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-red-500 bg-white dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 shadow-sm hover:bg-red-50 dark:hover:bg-red-950/20 transition disabled:opacity-50"
                                >
                                  {isProcessingItem ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <UserMinus size={12} />
                                  )}
                                  Désassigner
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenRowAssignModal(item)}
                                  disabled={isProcessingItem || isProcessing}
                                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[10px] font-bold transition hover:opacity-85 shadow-sm"
                                  style={{ background: colors.primary }}
                                >
                                  <UserPlus size={12} />
                                  Assigner l'aidant
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* VUE BÉNÉFICIAIRE / AIDANT EN GRILLE DE CARTES */
        filteredPatients.length > 0 ? (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((patient: any) => (
              <div key={patient.id} className="min-w-0 max-w-full overflow-hidden">
                <PatientCard
                  patient={patient}
                  onClick={() => navigate(`/app/patients/${patient.id}`)}
                  onEdit={canManage ? () => handleEdit(patient) : undefined}
                  onDelete={canManage ? () => handleDelete(patient.id) : undefined}
                  showActions={canManage}
                  compact
                />
              </div>
            ))}
          </section>
        ) : (
          <section className="bg-white dark:bg-[#17231d] rounded-2xl py-14 px-4 text-center border border-gray-100 dark:border-[#2c3f35] max-w-md mx-auto space-y-4">
            <Illustration 
              type={searchTerm || categoryFilter !== 'all' ? 'search' : 'users'} 
              size="md" 
              className="mx-auto opacity-35"
            />
            
            <div className="space-y-1">
              <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm">
                {searchTerm || categoryFilter !== 'all' ? 'Aucun résultat trouvé' : empty}
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-400">
                {searchTerm || categoryFilter !== 'all' ? 'Essayez de modifier votre filtre de recherche.' : emptyAction}
              </p>
            </div>

            {searchTerm || categoryFilter !== 'all' ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-gray-100 dark:border-[#2c3f35] hover:bg-gray-50 dark:hover:bg-[#24362d]"
                style={{ color: colors.text }}
              >
                Réinitialiser les filtres
              </button>
            ) : (
              canManage && (
                <button
                  onClick={handleAdd}
                  className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-white font-black text-xs transition hover:opacity-90 shadow-md"
                  style={{ background: colors.primary }}
                >
                  <Plus size={14} />
                  {add}
                </button>
              )
            )}
          </section>
        )
      )}

      {/* LÉGENDE DE RÔLES DISCRÈTE (FOOTER) */}
      {isAdmin && Object.keys(grouped).length > 0 && (
        <div className="bg-white dark:bg-[#17231d] rounded-2xl p-4 border border-gray-100 dark:border-[#2c3f35] flex items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-wrap items-center gap-4 text-[10px]">
            <span className="font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Légende :</span>
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded"><Circle size={6} fill="#10b981" /> Proche rattaché</span>
            <span className="flex items-center gap-1 text-blue-700 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded"><Circle size={6} fill="#3b82f6" /> Titulaire principal</span>
          </div>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold flex items-center gap-1.5">
            {isProcessing && <Loader2 size={12} className="animate-spin text-emerald-600" />}
            {isProcessing ? 'Synchronisation...' : '🟢 Système synchronisé'}
          </span>
        </div>
      )}

      {/* ACCÈS RAPIDE FLOUTÉ MOBILE */}
      {canManage && !isAdmin && patients.length > 0 && (
        <button
          onClick={handleAdd}
          className="sm:hidden fixed bottom-24 right-5 z-40 w-12 h-12 rounded-full text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          style={{ 
            background: colors.primary,
            boxShadow: `0 8px 24px -6px ${colors.primary}`
          }}
          aria-label={add}
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      )}

      {/* ============================================================
          🆕 ASSIGNATION CONTEXTUELLE INDIVIDUELLE (MODAL PREMIUM)
          ============================================================ */}
      {showRowAssignModal && selectedItemToAssign && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowRowAssignModal(false); }}
        >
          <div className="bg-white dark:bg-[#17231d] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 border border-gray-100 dark:border-[#2c3f35]">
            {/* Header */}
            <div className="flex items-start justify-between border-b dark:border-[#2c3f35] pb-3.5">
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-gray-800 dark:text-gray-100">Attribuer un intervenant</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">Bénéficiaire : <strong className="text-gray-700 dark:text-gray-300">{selectedItemToAssign.targetName}</strong></p>
              </div>
              <button 
                onClick={() => setShowRowAssignModal(false)}
                className="w-8 h-8 rounded-full bg-gray-50 dark:bg-[#24362d] flex items-center justify-center text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition border dark:border-[#2c3f35]"
              >
                <X size={15} />
              </button>
            </div>

            {/* Formulaire */}
            <div className="space-y-4">
              
              {/* Sélection */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Intervenant qualifié</label>
                <select
                  value={modalAidant}
                  onChange={(e) => setModalAidant(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border outline-none text-xs font-semibold focus:ring-1 bg-white dark:bg-[#1d2d25] border-gray-100 dark:border-[#2c3f35]"
                  style={{ color: colors.text }}
                >
                  <option value="">Choisir un aidant dans la liste</option>
                  {aidants.map(a => {
                    const isFull = a.current_assignments >= a.max_assignments;
                    return (
                      <option key={a.id} value={a.user_id}>
                        {isFull ? '🔴 ' : '🟢 '} {a.user?.full_name || 'Aidant'} — Charge ({a.current_assignments}/{a.max_assignments})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Status de quota */}
              {modalSelectedAidantObj && (
                <div className={cn(
                  "p-3 rounded-xl flex items-center justify-between border text-[11px] font-semibold",
                  isSelectedAidantFull ? "bg-red-50/50 border-red-200/50 text-red-700 dark:text-red-400 dark:bg-red-950/20" : "bg-emerald-50/50 border-emerald-200/50 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-950/20"
                )}>
                  <span>Quota assignations : {modalSelectedAidantObj.current_assignments}/{modalSelectedAidantObj.max_assignments}</span>
                  <span>{isSelectedAidantFull ? 'Quota max atteint' : 'Disponible'}</span>
                </div>
              )}

              {/* Contrat */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Contrat d'accompagnement</label>
                <select
                  value={modalType}
                  onChange={(e) => setModalType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border outline-none text-xs font-semibold focus:ring-1 bg-white dark:bg-[#1d2d25] border-gray-100 dark:border-[#2c3f35]"
                  style={{ color: colors.text }}
                >
                  {ASSIGNMENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Option Forçage de quota */}
              {isSelectedAidantFull && (
                <div className="p-4 bg-amber-50/40 dark:bg-amber-950/15 rounded-xl border border-amber-100/50 dark:border-amber-900/30 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                      Cet aidant a déjà atteint sa limite d'heures ou d'accompagnements (4/4). Souhaitez-vous forcer l'assignation ?
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-amber-100/50 dark:border-amber-900/20">
                    <input
                      type="checkbox"
                      id="force_checkbox"
                      checked={modalForce}
                      onChange={(e) => setModalForce(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 bg-white dark:bg-[#1d2d25] border-gray-100 dark:border-[#2c3f35]"
                    />
                    <label htmlFor="force_checkbox" className="text-xs font-black text-amber-950 dark:text-amber-200 cursor-pointer select-none">
                      Forcer le rattachement
                    </label>
                  </div>
                </div>
              )}

            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t dark:border-[#2c3f35]">
              <button
                type="button"
                onClick={() => setShowRowAssignModal(false)}
                className="py-2.5 rounded-xl font-bold border border-gray-100 dark:border-[#2c3f35] bg-white dark:bg-[#17231d] hover:bg-gray-50 dark:hover:bg-[#24362d] transition text-xs sm:text-sm text-center"
                style={{ color: colors.text }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmRowAssign}
                disabled={isProcessing || (!modalForce && isSelectedAidantFull)}
                className="py-2.5 rounded-xl text-white font-bold transition hover:opacity-90 flex items-center justify-center gap-1.5 text-xs sm:text-sm disabled:opacity-55 disabled:cursor-not-allowed shadow-md"
                style={{ background: colors.primary }}
              >
                {isProcessing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AJOUT / ÉDITION DE PATIENT */}
      <PatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        patient={selectedPatient}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default PatientsPage;
