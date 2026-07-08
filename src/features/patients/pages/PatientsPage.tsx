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
  UserX,
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
import toast from 'react-hot-toast';

// ============================================================
// TYPES & LOGIQUES STATIQUES
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
  target_type: 'patient' | 'personal_account' | 'family' | 'personal';
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

const PatientsPage = () => {
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
  const [selectedAidant, setSelectedAidant] = useState('');
  const [selectedType, setSelectedType] = useState('primary');
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isSyncing, setIsSyncing] = useState(false);

  const colors = getThemeColors(getThemeByRole(role as any, profile?.patient_category as any));
  const canManage = canManagePatients();
  const isAdmin = isAdminOrCoordinator;

  // ============================================================
  // CHARGEMENT SYNCHRONE ET ALIGNÉ DES DONNÉES DE L'ADMIN
  // ============================================================

  const fetchAllData = useCallback(async () => {
    if (!isAdmin) {
      await fetchPatients();
      return;
    }

    setIsLoadingAssignments(true);
    try {
      await fetchPatients(true);

      // ✅ 1. CHARGER EXPLICITEMENT LES COMPTES FAMILLES
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, patient_category')
        .eq('role', 'family')
        .order('full_name');

      if (profilesError) throw profilesError;
      setFamilyAccounts(profilesData || []);
      
      // ✅ 2. CHARGER LES AIDANTS SÉLECTIONNABLES
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

      // ✅ 3. CHARGER TOUS LES PATIENTS ET LEURS LIENS
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

      // ✅ 4. CHARGER ET MAPPER LES ASSIGNATIONS ACTIVES UNIQUEMENT
      const response = await assignmentAPI.adminGetAll();
      const assignmentsData = response.data?.data || [];
      const mapAssign: any = {};
      
      assignmentsData?.forEach((a: any) => {
        const key = `${a.target_type}_${a.target_id}`;
        
        // ✅ FILTRE STRUCTURÉ : On ne mappe que les assignations physiquement actives
        if (a.status === 'active') {
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

  // ============================================================
  // CONSTITUTION DES ITEMS D'AFFICHAGE ET RACCORDEMENT DES CLEFS
  // ============================================================

  const assignmentItems = useMemo(() => {
    if (!isAdmin) return [];

    return familyAccounts.flatMap(family => {
      // ✅ ALIGNEMENT CLÉ DE RECHERCHE : 'personal_FAMILY_ID' pour correspondre au retour de l'API
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
  // ACTIONS D'ASSIGNATIONS (ADMIN)
  // ============================================================

  const handleAssign = async (item: AssignmentItem) => {
    if (!selectedAidant) {
      toast.error('Veuillez sélectionner un aidant');
      return;
    }

    setProcessingId(item.id);
    setIsProcessing(true);

    try {
      await assignmentAPI.create({
        aidantUserId: selectedAidant,
        targetType: item.targetType,
        targetId: item.targetId,
        assignmentType: selectedType,
        reason: `Assignation d'un bénéficiaire depuis l'administration`,
        expiresAt: null,
      });

      toast.success(`${item.targetName} rattaché(e) avec succès !`);
      await fetchAllData();
    } catch (error: any) {
      console.error('❌ Erreur assignation:', error);
      toast.error(error.message || 'Erreur lors de l\'assignation de l\'aidant');
    } finally {
      setIsProcessing(false);
      setProcessingId(null);
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

  const handleAssignAll = async () => {
    if (!selectedAidant) {
      toast.error('Veuillez d\'abord choisir un aidant à attribuer');
      return;
    }

    const unassigned = assignmentItems.filter(item => !item.assignedAidantUserId);
    if (unassigned.length === 0) {
      toast('Tous les bénéficiaires de la liste sont déjà rattachés', { icon: 'ℹ️' });
      return;
    }

    if (!window.confirm(`Voulez-vous assigner l'ensemble des ${unassigned.length} bénéficiaires non attribués à cet aidant ?`)) return;

    setIsProcessing(true);

    try {
      for (const item of unassigned) {
        await assignmentAPI.create({
          aidantUserId: selectedAidant,
          targetType: item.targetType,
          targetId: item.targetId,
          assignmentType: selectedType,
          reason: `Assignation groupée d'administration`,
          expiresAt: null,
        });
      }

      toast.success(`${unassigned.length} bénéficiaire(s) rattachés à l'aidant !`);
      await fetchAllData();
    } catch (error: any) {
      console.error('❌ Erreur assignation groupée:', error);
      toast.error('Erreur lors du rattachement groupé');
    } finally {
      setIsProcessing(false);
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
      
      if (patientsError) {
        throw patientsError;
      }

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
      <div className="w-full max-w-5xl mx-auto space-y-4 p-4">
        <div className="h-20 bg-white rounded-3xl animate-pulse shadow-sm" />
        <div className="h-10 bg-white rounded-2xl animate-pulse w-2/3" />
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-24 bg-white rounded-3xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 pb-32 px-4 sm:px-6">
      
      {/* HEADER */}
      <section className="bg-white rounded-[1.75rem] p-5 shadow-sm border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase mb-2 tracking-wider"
            style={{
              background: colors.primary + '12',
              color: colors.primary,
            }}
          >
            <Users size={12} />
            {isAdmin ? 'Espace Administration' : 'Mes Accompagnements'}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-800" style={{ color: colors.text }}>
            {isAdmin ? 'Bénéficiaires & Familles' : list}
          </h1>
          <p className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-1">
            <span>
              {isAdmin 
                ? `${stats.totalBeneficiaires} profils listés • ${stats.totalFamilies} comptes familles`
                : getCountLabel(patients.length)
              }
            </span>
            {isAidant && <span className="text-amber-600 font-semibold">• Profils attribués uniquement</span>}
            {isAdmin && stats.unassignedCount > 0 && (
              <span className="text-red-500 font-extrabold flex items-center gap-1">
                • ⚠️ {stats.unassignedCount} profil(s) en attente d'aidant
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 justify-end">
          <button
            onClick={refreshAll}
            disabled={isLoading || isSyncing || isRefreshing}
            className="w-10 h-10 rounded-2xl border bg-white flex items-center justify-center hover:bg-gray-50 transition text-gray-500 shrink-0"
            style={{ borderColor: colors.border }}
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          </button>

          {canManage && !isAdmin && patients.length > 0 && (
            <button
              onClick={handleAdd}
              className="hidden sm:inline-flex px-4 py-2.5 rounded-2xl text-xs font-black text-white transition hover:opacity-90 shrink-0 items-center gap-2 shadow-md"
              style={{ background: colors.primary }}
            >
              <Plus size={15} />
              {add}
            </button>
          )}

          {isAidant && !canManage && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-50 border border-amber-100/60 shadow-sm shrink-0">
              <ShieldAlert size={14} className="text-amber-500" />
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-wide">Lecture Seule</span>
            </div>
          )}
        </div>
      </section>

      {/* METRICS CARDS (ADMIN) */}
      {isAdmin && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-black/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gray-50 text-gray-500"><Users size={20} /></div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Bénéficiaires</p>
              <p className="text-lg font-black text-gray-800 mt-0.5">{stats.totalBeneficiaires}</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-black/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-600"><CheckCircle size={20} /></div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Profils Assignés</p>
              <p className="text-lg font-black text-emerald-600 mt-0.5">{stats.assignedCount}</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-black/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-amber-50 text-amber-600"><AlertCircle size={20} /></div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Non Assignés</p>
              <p className="text-lg font-black text-amber-600 mt-0.5">{stats.unassignedCount}</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-black/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-blue-50 text-blue-600"><Home size={20} /></div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Comptes Familles</p>
              <p className="text-lg font-black text-blue-600 mt-0.5">{stats.totalFamilies}</p>
            </div>
          </div>
        </section>
      )}

      {/* RECHERCHE ET FILTRAGE COMPACT */}
      <section className="bg-white rounded-[2rem] p-3 shadow-sm border border-black/5 flex flex-col md:flex-row gap-3 w-full min-w-0">
        <div className="relative flex-1 min-w-0 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isAdmin ? "Rechercher une famille, un proche ou un aidant..." : "Rechercher par nom, adresse..."}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs outline-none transition focus:ring-1 bg-gray-50/50"
            style={{ borderColor: colors.border, color: colors.text }}
          />
        </div>
        
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2.5 text-xs rounded-2xl border bg-gray-50 outline-none focus:ring-1 shrink-0 md:w-52"
          style={{ borderColor: colors.border, color: colors.text }}
        >
          <option value="all">Tous les profils</option>
          <option value="senior">👴 Seniors</option>
          <option value="maman_bebe">👶 Mamans & Bébés</option>
          {isAdmin && <option value="personal">👤 Comptes personnels uniquement</option>}
        </select>
      </section>

      {/* BARRE D'ATTRIBUTION ADMINISTRATIVE (ADMIN) */}
      {isAdmin && stats.totalBeneficiaires > 0 && (
        <section className="bg-white rounded-[2rem] p-4 shadow-sm border border-black/5 space-y-3">
          <div className="flex items-center gap-2 mb-1 border-b pb-2 dark:border-gray-100">
            <UserPlus size={16} style={{ color: colors.primary }} />
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">Rattachement d'aidants en masse</h3>
          </div>
          <div className="flex flex-col md:flex-row gap-2.5">
            <div className="flex-1">
              <select
                value={selectedAidant}
                onChange={e => setSelectedAidant(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                <option value="">Sélectionner un aidant qualifié</option>
                {aidants.map(a => (
                  <option key={a.id} value={a.user_id}>
                    {`🦸 ${a.user?.full_name || 'Aidant'} — ${a.available ? '🟢 Libre' : '🔴 Indisponible'} (${a.current_assignments || 0}/${a.max_assignments || 4})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:w-52">
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border outline-none text-xs focus:ring-1"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                {ASSIGNMENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleAssignAll}
              disabled={!selectedAidant || isProcessing || stats.unassignedCount === 0}
              className="px-5 py-2.5 rounded-2xl text-white font-black text-xs flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shrink-0"
              style={{ background: colors.primary }}
            >
              <UserPlus size={14} />
              Attribuer à tous ({stats.unassignedCount})
            </button>
          </div>
        </section>
      )}

      {/* PANNEAU SYNCHRONISATION AIDANTS */}
      {isAidant && (
        <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
          <div className="min-w-0">
            <p className="text-xs font-bold text-amber-900">Mise à jour de vos attributions d'accès</p>
            <p className="text-[10px] text-amber-600 mt-0.5">
              Si vous venez d\'être rattaché à un nouveau patient par le coordinateur, cliquez pour synchroniser.
            </p>
          </div>
          
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full sm:w-auto px-4 py-2 rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm border bg-white"
            style={{ borderColor: colors.primary + '25', color: colors.primary }}
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Synchronisation...' : 'Mettre à jour'}
          </button>
        </div>
      )}

      {/* AFFICHAGE DU CONTENU CENTRAL */}
      {isAdmin ? (
        Object.keys(grouped).length === 0 ? (
          <section className="bg-white rounded-[2rem] py-16 px-4 text-center border border-black/5">
            <Illustration 
              type={searchTerm || categoryFilter !== 'all' ? 'search' : 'users'} 
              size="md" 
              className="mx-auto mb-4 opacity-35"
            />
            <h3 className="font-bold text-sm" style={{ color: colors.text }}>
              {searchTerm || categoryFilter !== 'all' ? 'Aucun résultat correspondant' : 'Aucune fiche bénéficiaire enregistrée'}
            </h3>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">
              {searchTerm || categoryFilter !== 'all' ? 'Veuillez modifier ou réinitialiser vos termes de recherche.' : 'Les fiches d’inscriptions complétées apparaîtront ici.'}
            </p>
          </section>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([familyId, group]: any) => {
              const isExpanded = expanded[familyId] !== false;
              const familyItems = group.items;
              const hasUnassigned = familyItems.some((i: AssignmentItem) => !i.assignedAidantUserId);

              return (
                <div key={familyId} className="bg-white rounded-3xl border overflow-hidden shadow-sm hover:shadow-md transition-all duration-200" style={{ borderColor: colors.border }}>
                  
                  {/* EN-TÊTE COMPTE FAMILLE */}
                  <div
                    className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
                    onClick={() => toggleExpand(familyId)}
                    style={{ background: hasUnassigned ? colors.primary + '04' : 'transparent' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1 rounded-xl bg-gray-100/60 text-gray-400 shrink-0">
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                      <div className="min-w-0">
                        <span className="font-extrabold text-sm block sm:inline text-gray-800" style={{ color: colors.text }}>
                          👨‍👩‍👦 Famille {group.name}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 mt-1 sm:mt-0 sm:inline-flex sm:ml-2">
                          <span className="text-[10px] text-gray-400 font-semibold bg-gray-50 px-2 py-0.5 rounded-md border">
                            {familyItems.filter((i: AssignmentItem) => i.type === 'patient').length} proche(s)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CORPS DE L'ACCORDÉON */}
                  {isExpanded && (
                    <div className="border-t divide-y dark:divide-[#2c3f35]" style={{ borderColor: colors.border + '30' }}>
                      {familyItems.map((item: AssignmentItem) => {
                        const isAssigned = !!item.assignedAidantUserId;

                        return (
                          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 bg-white dark:bg-[#17231d]/30">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded border",
                                  item.isPersonal 
                                    ? "text-blue-600 bg-blue-50/50 border-blue-100" 
                                    : "text-emerald-600 bg-emerald-50/50 border-emerald-100"
                                )}>
                                  {item.isPersonal ? '👤 TITULAIRE' : '👶 PROCHE'}
                                </span>
                                <p className="font-extrabold text-sm text-gray-800 dark:text-gray-100">
                                  {item.targetName}
                                </p>
                              </div>
                              
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {item.isPersonal ? 'Compte de facturation' : `Proche — ${getCategoryLabel(item.category)}`}
                              </p>

                              {/* Affichage de l'aidant assigné */}
                              {isAssigned && (
                                <p className="text-xs text-emerald-600 font-bold mt-1.5 flex items-center gap-1.5">
                                  <CheckCircle size={14} className="text-emerald-500" />
                                  <span>Rattaché à : <strong>{item.assignedAidantName}</strong> ({item.assignmentType === 'primary' ? 'Permanent' : 'Temporaire'})</span>
                                </p>
                              )}
                            </div>

                            {/* Actions d'assignation */}
                            <div className="flex items-center gap-2 shrink-0">
                              {isAssigned ? (
                                <button
                                  onClick={(e) => handleRevoke(item)}
                                  disabled={isProcessing}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-red-500 font-bold text-xs bg-red-50 hover:bg-red-100 transition border border-red-100"
                                >
                                  {processingId === item.id ? (
                                    <Loader2 className="animate-spin" size={14} />
                                  ) : (
                                    <UserMinus size={14} />
                                  )}
                                  <span>Dérattacher</span>
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => handleAssign(item)}
                                  disabled={!selectedAidant || isProcessing}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs transition hover:opacity-90 disabled:opacity-55 disabled:cursor-not-allowed shadow-md"
                                  style={{ background: (!selectedAidant || isProcessing) ? '#cbd5e1' : colors.primary }}
                                >
                                  {processingId === item.id ? (
                                    <Loader2 className="animate-spin" size={14} />
                                  ) : (
                                    <UserPlus size={14} />
                                  )}
                                  <span>Rattacher l'aidant</span>
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
        // 👨‍👩‍👦 VUE COMPTE FAMILLE / AIDANT
        filteredPatients.length > 0 ? (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full min-w-0">
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
          <section className="bg-white rounded-3xl py-14 px-4 text-center border border-black/5">
            <Illustration 
              type={searchTerm || categoryFilter !== 'all' ? 'search' : 'users'} 
              size="md" 
              className="mx-auto mb-4 opacity-35"
            />

            <h3 className="font-bold text-gray-700 text-sm">
              {searchTerm || categoryFilter !== 'all' ? 'Aucun résultat trouvé' : empty}
            </h3>

            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">
              {searchTerm || categoryFilter !== 'all' ? 'Essayez d\'ajuster vos mots-clés ou de réinitialiser le filtre.' : emptyAction}
            </p>

            {searchTerm || categoryFilter !== 'all' ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                }}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-black text-xs transition border border-gray-200 hover:bg-gray-50"
                style={{ color: colors.text }}
              >
                Réinitialiser la recherche
              </button>
            ) : (
              canManage && (
                <button
                  onClick={handleAdd}
                  className="mt-4 inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-2xl text-white font-black text-xs transition hover:opacity-90 shadow-md"
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

      {/* LÉGENDE DE PRIORISATION */}
      {isAdmin && Object.keys(grouped).length > 0 && (
        <div className="bg-white rounded-2xl p-3 border border-black/5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-wrap items-center gap-3 text-[10px]">
            <span className="font-bold text-gray-400 uppercase tracking-wider">Légende :</span>
            <span className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100"><Circle size={7} fill="#10b981" /> P1 - Patient Proche</span>
            <span className="flex items-center gap-1 text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100"><Circle size={7} fill="#3b82f6" /> P2 - Compte Principal</span>
          </div>
          <span className="text-[10px] text-gray-400 font-semibold ml-auto flex items-center gap-1.5">
            {isProcessing && <Loader2 size={12} className="animate-spin text-emerald-600" />}
            {isProcessing ? 'Traitement réseau...' : '🟢 Prêt'}
          </span>
        </div>
      )}

      {canManage && !isAdmin && patients.length > 0 && (
        <button
          onClick={handleAdd}
          className="sm:hidden fixed bottom-24 right-4 z-40 w-12 h-12 rounded-2xl text-white shadow-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: colors.primary }}
          aria-label={add}
        >
          <Plus size={22} />
        </button>
      )}

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
