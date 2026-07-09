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
  CheckCircle,
  User as UserIcon,
  UserMinus,
  Briefcase,
  Shield,
  X,
  Heart,
  Sparkles,
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
      <div className="w-full max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-[#2c3f35]">
          <div className="h-6 w-1/4 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        </div>
        <div className="h-32 bg-gray-100 dark:bg-gray-800/50 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 bg-gray-100 dark:bg-gray-800/30 rounded-3xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const modalSelectedAidantObj = aidants.find(a => a.user_id === modalAidant);
  const isSelectedAidantFull = modalSelectedAidantObj && (modalSelectedAidantObj.current_assignments >= modalSelectedAidantObj.max_assignments);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-7 pb-24 px-1 sm:px-0">
      
      {/* ============================================================
          HEADER ÉDITORIAL ULTRA-MODERNE
          ============================================================ */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-[#2c3f35]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">
            <Heart size={14} className="animate-pulse" />
            <span>Portail d'accompagnement</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: colors.text }}>
            {isAdmin ? 'Membres & Attributions' : list}
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xl">
            {isAdmin 
              ? 'Dossiers d’interventions, validation des proches et supervision des charges des aidants.' 
              : 'Retrouvez les fiches d’identité et de suivi médical de vos proches accompagnés.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <button
            onClick={refreshAll}
            disabled={isRefreshing}
            className="w-10 h-10 rounded-2xl bg-white dark:bg-[#17231d] border border-gray-100 dark:border-[#2c3f35] flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[#24362d] transition text-gray-500 shadow-sm"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          </button>

          {canManage && !isAdmin && patients.length > 0 && (
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black text-white hover:scale-[1.01] active:scale-[0.99] transition shadow-md"
              style={{ background: colors.primary }}
            >
              <Plus size={14} strokeWidth={2.5} />
              {add}
            </button>
          )}
        </div>
      </section>

      {/* ============================================================
          WIDGET BENTO D'ACTIVITÉ GLOBAL (ADMIN ONLY)
          ============================================================ */}
      {isAdmin && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Module 1 : Compteurs */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent dark:from-emerald-950/20 rounded-[2rem] p-6 border border-emerald-100/40 dark:border-emerald-900/10 shadow-sm flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Activité active</span>
              <Sparkles size={16} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">{stats.totalBeneficiaires}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Bénéficiaires & comptes rattachés</p>
            </div>
          </div>

          {/* Module 2 : Suivi d'Attribution */}
          <div className="bg-white dark:bg-[#17231d] rounded-[2rem] p-6 border border-gray-100 dark:border-[#2c3f35] shadow-sm flex flex-col justify-between h-36">
            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Taux d'attribution</span>
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-2xl font-black text-gray-800 dark:text-gray-100">{stats.assignedCount} rattachés</span>
                <span className="text-xs font-bold text-amber-500">{stats.unassignedCount} en attente</span>
              </div>
              {/* Sleek progress bar */}
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${(stats.assignedCount / (stats.totalBeneficiaires || 1)) * 100}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Module 3 : Structures familiales */}
          <div className="bg-white dark:bg-[#17231d] rounded-[2rem] p-6 border border-gray-100 dark:border-[#2c3f35] shadow-sm flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Unités familiales</span>
              <Home size={16} className="text-blue-500" />
            </div>
            <div>
              <p className="text-3xl font-black tracking-tight text-gray-800 dark:text-gray-100">{stats.totalFamilies}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Foyers enregistrés actifs</p>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
          BLOC RECHERCHE & CONTRÔLEUR FILTRE SEGMENTÉ
          ============================================================ */}
      <section className="bg-white/80 dark:bg-[#17231d]/80 backdrop-blur-md rounded-2xl p-2.5 shadow-sm border border-gray-100 dark:border-[#2c3f35] flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isAdmin ? "Rechercher par nom, famille, aidant..." : "Rechercher un proche..."}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border outline-none bg-gray-50/50 dark:bg-[#1d2d25]/50 border-gray-100/50 dark:border-[#2c3f35]"
            style={{ color: colors.text }}
          />
        </div>
        
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3.5 py-2 text-xs rounded-xl border bg-white dark:bg-[#1d2d25] outline-none focus:ring-1 shrink-0 sm:w-48 border-gray-100 dark:border-[#2c3f35]"
          style={{ color: colors.text }}
        >
          <option value="all">Tous les profils</option>
          <option value="senior">👴 Seniors uniquement</option>
          <option value="maman_bebe">👶 Mamans & Bébés</option>
          {isAdmin && <option value="personal">👤 Comptes personnels</option>}
        </select>
      </section>

      {/* SYNCHRONISATION AIDANTS (DISCRET & CHIC) */}
      {isAidant && (
        <div className="bg-amber-50/30 dark:bg-amber-950/10 rounded-2xl p-4 border border-amber-100/60 dark:border-amber-900/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Mise à jour de vos attributions d'accès</p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400">Pour actualiser la liste des bénéficiaires rattachés à votre planning.</p>
          </div>
          
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-4 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 bg-white dark:bg-[#1d2d25] text-amber-800 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30 shadow-sm"
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            Synchroniser
          </button>
        </div>
      )}

      {/* ============================================================
          RENDU DES DOSSIERS (ADMIN) OU DE LA GRILLE (FAMILLE/AIDANT)
          ============================================================ */}
      {isAdmin ? (
        Object.keys(grouped).length === 0 ? (
          <section className="bg-white dark:bg-[#17231d] rounded-[2rem] py-16 px-4 text-center border border-gray-100 dark:border-[#2c3f35]">
            <Illustration type={searchTerm || categoryFilter !== 'all' ? 'search' : 'users'} size="md" className="mx-auto opacity-35 mb-4" />
            <h3 className="font-extrabold text-sm text-gray-800 dark:text-gray-100">Aucun dossier correspondant</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Ajustez vos termes ou réinitialisez le filtre de recherche.</p>
          </section>
        ) : (
          /* DOSSIERS FAMILIAUX (PREMIUM BEN TO FEED) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(grouped).map(([familyId, group]: any) => {
              const isExpanded = expanded[familyId] !== false;
              const familyItems = group.items;
              const hasUnassigned = familyItems.some((i: AssignmentItem) => !i.assignedAidantUserId);

              return (
                <div 
                  key={familyId} 
                  className={cn(
                    "bg-white dark:bg-[#17231d] rounded-3xl border shadow-sm transition-all flex flex-col justify-between overflow-hidden",
                    hasUnassigned ? "border-amber-100 dark:border-amber-950/30 bg-amber-50/[0.02]" : "border-gray-100 dark:border-[#2c3f35]"
                  )}
                >
                  {/* EN-TÊTE DU DOSSIER */}
                  <div className="p-5 border-b border-gray-100/60 dark:border-[#2c3f35]/50 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Fiche Foyer</span>
                      <h3 className="font-black text-sm text-gray-800 dark:text-gray-100 truncate mt-0.5">
                        Famille {group.name}
                      </h3>
                    </div>
                    {hasUnassigned ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/40 dark:border-amber-900/20 animate-pulse">
                        Attribution requise
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-900/20">
                        Complet ({familyItems.length})
                      </span>
                    )}
                  </div>

                  {/* LISTE DES MEMBRES INTERNES (SANS ACCORDÉONS COMPLEXES) */}
                  <div className="p-4 space-y-3 flex-1 divide-y divide-gray-50 dark:divide-[#2c3f35]/40">
                    {familyItems.map((item: AssignmentItem, idx: number) => {
                      const isAssigned = !!item.assignedAidantUserId;
                      const isAccount = item.type === 'account';
                      const categoryColor = getCategoryColor(item.category);
                      const isProcessingItem = processingId === item.id;

                      return (
                        <div 
                          key={item.id} 
                          className={cn(
                            "flex items-center justify-between gap-3 pt-3",
                            idx === 0 ? "pt-0 border-t-0" : ""
                          )}
                        >
                          <div className="min-w-0 flex items-center gap-2.5">
                            {/* Chic Initials Avatar Circle */}
                            <div 
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0"
                              style={{ 
                                background: isAccount ? '#e0f2fe' : categoryColor + '12', 
                                color: isAccount ? '#0369a1' : categoryColor 
                              }}
                            >
                              {item.targetName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-xs text-gray-800 dark:text-gray-100 truncate">
                                  {item.targetName}
                                </span>
                                {isAssigned && (
                                  <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-1 py-0.5 rounded">
                                    {item.assignedAidantName}
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold block mt-0.5 uppercase tracking-wide">
                                {isAccount ? 'Titulaire principal' : 'Bénéficiaire d\'aide'}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isAssigned ? (
                              <button
                                onClick={() => handleRevoke(item)}
                                disabled={isProcessingItem || isProcessing}
                                className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 flex items-center justify-center transition border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                                title="Rétirer l'intervenant"
                              >
                                {isProcessingItem ? <Loader2 size={12} className="animate-spin" /> : <UserMinus size={12} />}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenRowAssignModal(item)}
                                disabled={isProcessingItem || isProcessing}
                                className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-white transition hover:opacity-90 flex items-center gap-1"
                                style={{ background: colors.primary }}
                              >
                                <UserPlus size={10} />
                                Assigner
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* VUE CLASSIQUE DE GRILLE POUR COMPTES FAMILLES */
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
          <section className="bg-white dark:bg-[#17231d] rounded-3xl py-14 px-4 text-center border border-gray-100 dark:border-[#2c3f35] max-w-md mx-auto space-y-4">
            <Illustration type={searchTerm || categoryFilter !== 'all' ? 'search' : 'users'} size="md" className="mx-auto opacity-35" />
            
            <div className="space-y-1">
              <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm">{empty}</h3>
              <p className="text-xs text-gray-400 dark:text-gray-400">{emptyAction}</p>
            </div>

            {canManage && (
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-white font-black text-xs transition hover:opacity-90 shadow-md"
                style={{ background: colors.primary }}
              >
                <Plus size={14} />
                {add}
              </button>
            )}
          </section>
        )
      )}

      {/* BOUTON FLOTTANT MOBILE (TACTILE & ERGONOMIQUE) */}
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
          🆕 ASSIGNATION CONTEXTUELLE INDIVIDUELLE (BOTTOM SHEET / MODAL)
          ============================================================ */}
      {showRowAssignModal && selectedItemToAssign && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowRowAssignModal(false); }}
        >
          <div className="bg-white dark:bg-[#17231d] rounded-[2rem] w-full max-w-md p-6 shadow-2xl space-y-4 border border-gray-100 dark:border-[#2c3f35] animate-slideUp">
            {/* Header */}
            <div className="flex items-start justify-between border-b dark:border-[#2c3f35] pb-3.5">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Rattachement</span>
                <h3 className="text-base font-extrabold text-gray-800 dark:text-gray-100">Intervenant à domicile</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">Pour : <strong className="text-gray-700 dark:text-gray-300">{selectedItemToAssign.targetName}</strong></p>
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Sélection de l'aidant</label>
                <select
                  value={modalAidant}
                  onChange={(e) => setModalAidant(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border outline-none text-xs font-semibold focus:ring-1 bg-white dark:bg-[#1d2d25] border-gray-100 dark:border-[#2c3f35]"
                  style={{ color: colors.text }}
                >
                  <option value="">Choisir un aidant qualifié</option>
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
                  isSelectedAidantFull ? "bg-red-50/50 border-red-200/50 text-red-700 dark:text-red-400 dark:bg-red-950/20 animate-pulse" : "bg-emerald-50/50 border-emerald-200/50 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-950/20"
                )}>
                  <span>Quota assignations : {modalSelectedAidantObj.current_assignments}/{modalSelectedAidantObj.max_assignments}</span>
                  <span>{isSelectedAidantFull ? 'Quota max atteint' : 'Disponible'}</span>
                </div>
              )}

              {/* Contrat */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Type d'engagement</label>
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

              {/* Option Forçage */}
              {isSelectedAidantFull && (
                <div className="p-4 bg-amber-50/40 dark:bg-amber-950/15 rounded-xl border border-amber-100/50 dark:border-amber-900/30 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                      Cet aidant est au maximum de sa charge d'accompagnements (4/4). Souhaitez-vous forcer l'assignation ?
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
