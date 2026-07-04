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
// TYPES
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
  target_type: 'patient' | 'personal_account' | 'family';
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

const PatientsPage = () => {
  const navigate = useNavigate();
  const { profile, role, user } = useAuthStore();
  const { fetchAssignments, assignments } = useAssignmentStore();

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
  // ÉTATS POUR L'ASSIGNATION
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
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const colors = getThemeColors(getThemeByRole(role as any, profile?.patient_category as any));
  const canManage = canManagePatients();
  const isAdmin = isAdminOrCoordinator;

  // ============================================================
  // CHARGEMENT DES DONNÉES COMPLÈTES (patients + comptes + aidants)
  // ============================================================

  const fetchAllData = useCallback(async () => {
    if (!isAdmin) {
      // Pour les familles/aidants, juste les patients
      await fetchPatients();
      return;
    }

    setIsLoadingAssignments(true);
    try {
      // 1. Patients existants (via patientStore)
      await fetchPatients(true);
      
      // 2. Aidants
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

      // 3. Familles (comptes)
      const { data: families } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'family');
      setFamilyAccounts(families || []);

      // 4. Patients complets avec leurs liens
      const { data: patientsData } = await supabase
        .from('patients')
        .select(`
          id, first_name, last_name, category,
          patient_family_links!inner(family_id)
        `);

      setAllPatients(
        (patientsData || []).map(p => ({
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          category: p.category,
          family_id: p.patient_family_links?.[0]?.family_id,
        }))
      );

      // 5. Assignations
      try {
        const response = await assignmentAPI.adminGetAll();
        const assignmentsData = response.data?.data || [];
        const mapAssign: any = {};
        assignmentsData?.forEach((a: any) => {
          const key = `${a.target_type}_${a.target_id}`;
          mapAssign[key] = a;
        });
        setAssignmentsMap(mapAssign);
      } catch (apiError) {
        console.error('❌ Erreur récupération assignations:', apiError);
        setAssignmentsMap({});
      }
    } catch (error) {
      console.error('❌ Erreur fetchAllData:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoadingAssignments(false);
    }
  }, [isAdmin, fetchPatients]);

  // ============================================================
  // CONSTRUCTION DE LA LISTE HIÉRARCHIQUE (admin seulement)
  // ============================================================

  const assignmentItems = useMemo(() => {
    if (!isAdmin) return [];

    return familyAccounts.flatMap(family => {
      const accountKey = `personal_account_${family.id}`;
      const accountAssignment = assignmentsMap[accountKey];

      let accountAidantName = '';
      if (accountAssignment?.aidant_user_id) {
        const aidant = aidants.find(a => a.user_id === accountAssignment.aidant_user_id);
        accountAidantName = aidant?.user?.full_name || 'Aidant';
      }

      const accountItem: AssignmentItem = {
        id: `account_${family.id}`,
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
      const patientItems = familyPatients.map(p => {
        const key = `patient_${p.id}`;
        const a = assignmentsMap[key];

        let aidantName = '';
        if (a?.aidant_user_id) {
          const aidant = aidants.find(ad => ad.user_id === a.aidant_user_id);
          aidantName = aidant?.user?.full_name || 'Aidant';
        }

        return {
          id: key,
          type: 'patient',
          familyId: family.id,
          familyName: family.full_name,
          targetId: p.id,
          targetName: `${p.first_name} ${p.last_name}`,
          targetType: 'patient',
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

  // ============================================================
  // FILTRAGE
  // ============================================================

  const filteredItems = useMemo(() => {
    if (!isAdmin) return [];

    let items = assignmentItems;

    // Filtre par recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(item =>
        item.targetName.toLowerCase().includes(term) ||
        item.familyName.toLowerCase().includes(term) ||
        (item.assignedAidantName && item.assignedAidantName.toLowerCase().includes(term))
      );
    }

    // Filtre par catégorie
    if (categoryFilter !== 'all') {
      items = items.filter(item => {
        if (categoryFilter === 'personal') return item.isPersonal;
        return item.category === categoryFilter;
      });
    }

    return items;
  }, [isAdmin, assignmentItems, searchTerm, categoryFilter]);

  // ============================================================
  // GROUPEMENT PAR FAMILLE
  // ============================================================

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

  // ============================================================
  // STATISTIQUES (admin)
  // ============================================================

  const stats = useMemo(() => {
    if (!isAdmin) {
      return {
        totalBeneficiaires: patients.length,
        assignedCount: 0,
        unassignedCount: 0,
        totalFamilies: 0,
        patientsCount: patients.length,
      };
    }

    const totalItems = assignmentItems.length;
    const assignedCount = assignmentItems.filter(i => i.assignedAidantUserId).length;
    const unassignedCount = totalItems - assignedCount;

    return {
      totalBeneficiaires: totalItems,
      assignedCount,
      unassignedCount,
      totalFamilies: familyAccounts.length,
      patientsCount: allPatients.length,
    };
  }, [isAdmin, assignmentItems, familyAccounts, allPatients, patients]);

  // ============================================================
  // TOGGLE EXPAND
  // ============================================================

  const toggleExpand = (familyId: string) => {
    setExpanded(prev => ({ ...prev, [familyId]: !prev[familyId] }));
  };

  // ============================================================
  // HANDLERS D'ASSIGNATION
  // ============================================================

  const handleAssign = async (item: AssignmentItem) => {
    if (!selectedAidant) {
      toast.error('Veuillez sélectionner un aidant');
      return;
    }

    setProcessingItems(prev => new Set(prev).add(item.id));
    setIsProcessing(true);

    try {
      await assignmentAPI.create({
        aidantUserId: selectedAidant,
        targetType: item.targetType,
        targetId: item.targetId,
        assignmentType: selectedType,
        reason: `Assigné par admin ${user?.email || 'admin'}`,
        expiresAt: null,
      });

      toast.success(`${item.targetName} assigné avec succès`);
      await fetchAllData();
    } catch (error: any) {
      console.error('❌ Erreur assignation:', error);
      toast.error(error.message || 'Erreur lors de l\'assignation');
    } finally {
      setIsProcessing(false);
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const handleRevoke = async (item: AssignmentItem) => {
    if (!item.assignmentId) {
      toast.error('Assignation introuvable');
      return;
    }

    if (!window.confirm(`Retirer l'assignation de ${item.targetName} ?`)) return;

    setProcessingItems(prev => new Set(prev).add(item.id));
    setIsProcessing(true);

    try {
      await assignmentAPI.revoke(item.assignmentId, `Révoqué par ${user?.email || 'admin'}`);
      toast.success(`Assignation de ${item.targetName} retirée`);
      await fetchAllData();
    } catch (error: any) {
      console.error('❌ Erreur révocation:', error);
      toast.error(error.message || 'Erreur lors de la révocation');
    } finally {
      setIsProcessing(false);
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const handleAssignAll = async () => {
    if (!selectedAidant) {
      toast.error('Veuillez sélectionner un aidant');
      return;
    }

    const unassigned = assignmentItems.filter(item => !item.assignedAidantUserId);
    if (unassigned.length === 0) {
      toast('Tous les bénéficiaires sont déjà assignés', { icon: 'ℹ️' });
      return;
    }

    if (!window.confirm(`Assigner ${unassigned.length} bénéficiaire(s) à cet aidant ?`)) return;

    const itemIds = unassigned.map(item => item.id);
    setProcessingItems(prev => new Set([...prev, ...itemIds]));
    setIsProcessing(true);

    try {
      for (const item of unassigned) {
        await assignmentAPI.create({
          aidantUserId: selectedAidant,
          targetType: item.targetType,
          targetId: item.targetId,
          assignmentType: selectedType,
          reason: `Assignation en masse par ${user?.email || 'admin'}`,
          expiresAt: null,
        });
      }

      toast.success(`${unassigned.length} bénéficiaire(s) assignés`);
      await fetchAllData();
    } catch (error: any) {
      console.error('❌ Erreur assignation en masse:', error);
      toast.error(error.message || 'Erreur lors de l\'assignation');
    } finally {
      setIsProcessing(false);
      setProcessingItems(new Set());
    }
  };

  // ============================================================
  // GESTION DES PATIENTS (héritée)
  // ============================================================

  const handleDelete = async (id: string) => {
    if (!canManage) {
      toast.error('Vous n\'avez pas les droits pour supprimer un patient');
      return;
    }

    if (!window.confirm(`Voulez-vous vraiment supprimer ce ${singular} ?`)) return;

    try {
      await deletePatient(id);
      toast.success(`${singular.charAt(0).toUpperCase() + singular.slice(1)} supprimé`);
      await fetchAllData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || `Erreur lors de la suppression`);
    }
  };

  const handleEdit = (patient: any) => {
    if (!canManage) {
      toast.error('Vous n\'avez pas les droits pour modifier un patient');
      return;
    }
    setSelectedPatient(patient);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    if (!canManage) {
      toast.error('Vous n\'avez pas les droits pour ajouter un patient');
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
    fetchAssignments();
    setIsModalOpen(false);
    toast.success(
      modalMode === 'create'
        ? `${singular.charAt(0).toUpperCase() + singular.slice(1)} ajouté`
        : 'Informations mises à jour'
    );
  };

  // ============================================================
  // ÉTATS LOCAUX
  // ============================================================

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isSyncing, setIsSyncing] = useState(false);

  // ✅ UTILISER le hook de rafraîchissement
  useRefreshableData({
    onRefresh: async () => {
      if (isAidant) {
        await syncAidantPatients();
      } else {
        await fetchAllData();
      }
      await fetchAssignments();
    },
    onError: () => toast.error('Erreur lors du rafraîchissement des données'),
  });

  // ✅ CHARGEMENT INITIAL
  useEffect(() => {
    const loadData = async () => {
      if (isAidant) {
        await syncAidantPatients();
      } else {
        await fetchAllData();
      }
      await fetchAssignments();
    };
    loadData();
  }, [role, user?.id]);

  // ✅ RECHARGE QUAND LE RÔLE CHANGE
  useEffect(() => {
    if (isAidant) {
      syncAidantPatients();
      fetchAssignments();
    }
  }, [isAidant]);

  const isLoading = patientsLoading || isLoadingAssignments;

  // ============================================================
  // SYNCHRONISATION (aidant)
  // ============================================================

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data: aidant, error: aidantError } = await supabase
        .from('aidants')
        .select('id, user_id, is_verified, status')
        .eq('user_id', user?.id)
        .single();
      
      if (aidantError || !aidant) {
        toast.error('Aidant non trouvé');
        setIsSyncing(false);
        return;
      }

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('aidant_assignments')
        .select('target_id, target_type')
        .eq('aidant_user_id', aidant.user_id)
        .eq('status', 'active')
        .eq('target_type', 'patient');

      if (assignmentsError) {
        console.error('❌ Erreur récupération assignations:', assignmentsError);
      }

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
        toast('Aucun patient assigné', { icon: 'ℹ️' });
        usePatientStore.setState({ patients: [] });
        setIsSyncing(false);
        return;
      }

      const { data: directPatients, error: patientsError } = await supabase
        .from('patients')
        .select('*')
        .in('id', patientIds);
      
      if (patientsError) {
        console.error('❌ Erreur récupération patients:', patientsError);
        toast.error('Erreur lors de la récupération des patients');
        setIsSyncing(false);
        return;
      }

      if (directPatients && directPatients.length > 0) {
        usePatientStore.setState({ patients: directPatients });
        toast.success(`${directPatients.length} patient(s) synchronisé(s)`);
      } else {
        toast('Aucun patient trouvé', { icon: 'ℹ️' });
        usePatientStore.setState({ patients: [] });
      }

      await fetchAssignments();
    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setIsSyncing(false);
    }
  };

  // ============================================================
  // RENDU
  // ============================================================

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-4 p-3 sm:p-4">
        <div className="h-16 bg-white rounded-2xl animate-pulse" />
        <div className="h-10 bg-white rounded-2xl animate-pulse w-2/3" />
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-24 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 pb-20 px-4 sm:px-6">
      
      {/* ============================================================
      EN-TÊTE
      ============================================================ */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
        <div>
          <h1 className="text-xl font-black text-gray-800" style={{ color: colors.text }}>
            {isAdmin ? '👥 Bénéficiaires' : list}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {isAdmin 
              ? `${stats.totalBeneficiaires} bénéficiaire${stats.totalBeneficiaires > 1 ? 's' : ''} • ${stats.totalFamilies} comptes`
              : getCountLabel(patients.length)
            }
            {isAidant && <span className="text-amber-600 font-semibold"> • Patients assignés uniquement</span>}
            {isAdmin && stats.unassignedCount > 0 && (
              <span className="ml-2 text-yellow-500 font-semibold">
                ⚠️ {stats.unassignedCount} non assigné{stats.unassignedCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
          <button
            onClick={() => {
              if (isAidant) {
                syncAidantPatients();
              } else {
                fetchAllData();
              }
              fetchAssignments();
              toast.success('Données actualisées');
            }}
            disabled={isLoading || isSyncing}
            className="p-2 rounded-xl border hover:bg-gray-50 transition text-gray-500 shrink-0"
            style={{ borderColor: colors.border }}
            title="Actualiser"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {canManage && !isAdmin && (
            <button
              onClick={handleAdd}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 shrink-0 flex items-center gap-1.5 shadow-sm"
              style={{ background: colors.primary }}
            >
              <Plus size={13} />
              {add}
            </button>
          )}

          {isAidant && !canManage && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-100">
              <ShieldAlert size={13} className="text-amber-500" />
              <span className="text-[10px] font-bold text-amber-700">Lecture seule</span>
            </div>
          )}
        </div>
      </section>

      {/* ============================================================
      STATS (admin seulement)
      ============================================================ */}
      {isAdmin && (
        <section className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <Users size={14} />
            {stats.totalBeneficiaires} bénéficiaires
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <UserCheck size={14} />
            {stats.assignedCount} assignés
          </div>
          {stats.unassignedCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
              <UserX size={14} />
              {stats.unassignedCount} non assignés
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Home size={14} />
            {stats.totalFamilies} comptes
          </div>
        </section>
      )}

      {/* ============================================================
      RECHERCHE + FILTRE
      ============================================================ */}
      <section className="bg-white rounded-2xl p-3 shadow-sm border border-black/5 flex flex-col sm:flex-row gap-2.5 w-full min-w-0">
        <div className="relative flex-1 min-w-0 w-full">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isAdmin ? "Rechercher un compte ou un bénéficiaire..." : "Rechercher par nom ou adresse..."}
            className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs outline-none transition focus:ring-1 focus:ring-offset-0 min-w-0"
            style={{ borderColor: colors.border, color: colors.text }}
          />
        </div>
        
        {isAdmin ? (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border bg-gray-50 outline-none focus:ring-2 shrink-0 sm:w-44"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            <option value="all">Toutes catégories</option>
            <option value="senior">👴 Seniors</option>
            <option value="maman_bebe">👶 Maman & Bébé</option>
            <option value="personal">👤 Comptes personnels</option>
          </select>
        ) : (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border bg-gray-50 outline-none focus:ring-2 shrink-0 sm:w-44"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            <option value="all">Toutes catégories</option>
            <option value="senior">Seniors</option>
            <option value="maman_bebe">Maman & Bébé</option>
          </select>
        )}
      </section>

      {/* ============================================================
      BARRE D'ASSIGNATION (admin seulement)
      ============================================================ */}
      {isAdmin && stats.totalBeneficiaires > 0 && (
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <select
                value={selectedAidant}
                onChange={e => setSelectedAidant(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border outline-none text-xs focus:ring-1"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                <option value="">Sélectionner un aidant</option>
                {aidants.map(a => (
                  <option key={a.id} value={a.user_id}>
                    {a.user?.full_name || 'Aidant'} 
                    {a.available ? ' 🟢' : ' 🔴'}
                    {` (${a.current_assignments || 0}/${a.max_assignments || 4})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:w-44">
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border outline-none text-xs focus:ring-1"
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
              className="px-3.5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              style={{ background: colors.primary }}
            >
              <UserPlus size={13} />
              Assigner tout ({stats.unassignedCount})
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
      SYNCHRONISATION (aidant seulement)
      ============================================================ */}
      {isAidant && (
        <div className="bg-amber-50/40 rounded-2xl p-4 border border-amber-100/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-amber-900">Synchronisation des assignations</p>
            <p className="text-[10px] text-amber-600 mt-0.5">
              Si vous ne voyez pas vos patients, synchronisez vos autorisations d'accès.
            </p>
          </div>
          
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm border bg-white"
            style={{ borderColor: colors.primary + '20', color: colors.primary }}
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Synchronisation...' : 'Synchroniser'}
          </button>
        </div>
      )}

      {/* ============================================================
      LISTE DES BÉNÉFICIAIRES (admin) / PATIENTS (famille/aidant)
      ============================================================ */}

      {isAdmin ? (
        // ✅ VUE ADMIN : Comptes + Patients hiérarchisés
        Object.keys(grouped).length === 0 ? (
          <div className="bg-white rounded-2xl py-12 px-4 text-center border border-black/5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: colors.primary + '12' }}>
              <Users size={28} style={{ color: colors.primary }} />
            </div>
            <h3 className="font-bold text-sm" style={{ color: colors.text }}>
              {searchTerm || categoryFilter !== 'all'
                ? 'Aucun bénéficiaire trouvé'
                : 'Aucun bénéficiaire enregistré'}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {searchTerm || categoryFilter !== 'all'
                ? 'Essayez de modifier vos critères de recherche.'
                : 'Les comptes et patients apparaîtront ici.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).map(([familyId, group]: any) => {
              const isExpanded = expanded[familyId] !== false;
              const familyItems = group.items;
              const hasUnassigned = familyItems.some((i: AssignmentItem) => !i.assignedAidantUserId);

              return (
                <div key={familyId} className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: colors.border }}>
                  
                  {/* EN-TÊTE FAMILLE */}
                  <div
                    className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => toggleExpand(familyId)}
                    style={{ background: hasUnassigned ? colors.primary + '04' : 'transparent' }}
                  >
                    <div className="flex items-center gap-3">
                      <button className="p-0.5">
                        {isExpanded ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm" style={{ color: colors.text }}>
                          👨‍👩‍👦 {group.name}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          ({familyItems.filter((i: AssignmentItem) => i.type === 'patient').length} patient{familyItems.filter((i: AssignmentItem) => i.type === 'patient').length > 1 ? 's' : ''})
                        </span>
                        {hasUnassigned && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                            ⚠️ {familyItems.filter((i: AssignmentItem) => !i.assignedAidantUserId).length} non assigné(s)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{familyItems.filter((i: AssignmentItem) => i.assignedAidantUserId).length} assigné(s)</span>
                    </div>
                  </div>

                  {/* LISTE DES ITEMS DU COMPTE */}
                  {isExpanded && (
                    <div className="divide-y" style={{ borderColor: colors.border }}>
                      {familyItems.map((item: AssignmentItem) => {
                        const isAssigned = !!item.assignedAidantUserId;
                        const isAccount = item.type === 'account';
                        const categoryColor = getCategoryColor(item.category);
                        const categoryLabel = getCategoryLabel(item.category);
                        const isProcessingItem = processingItems.has(item.id);

                        return (
                          <div key={item.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-gray-50/50 transition">
                            
                            {/* INFO GAUCHE */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex items-center gap-1 shrink-0">
                                {item.priority === 1 && (
                                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">P1</span>
                                )}
                                {item.priority === 2 && (
                                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">P2</span>
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm truncate" style={{ color: colors.text }}>
                                    {isAccount ? '👤 ' : ''}{item.targetName}
                                  </span>
                                  <span 
                                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                                    style={{ background: categoryColor + '20', color: categoryColor }}
                                  >
                                    {categoryLabel}
                                  </span>
                                  {isAccount && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium shrink-0">
                                      Compte
                                    </span>
                                  )}
                                  {isAssigned && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-600 font-medium shrink-0 flex items-center gap-0.5">
                                      <CheckCircle size={10} />
                                      Assigné à {item.assignedAidantName}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-gray-400 truncate">
                                  {isAccount ? 'Compte personnel' : `Patient de ${item.familyName}`}
                                  {isAssigned && item.assignedAidantName && ` • 🦸 ${item.assignedAidantName}`}
                                  {item.assignmentType && (
                                    <span className="ml-1 text-[9px] opacity-60">
                                      ({ASSIGNMENT_TYPES.find(t => t.value === item.assignmentType)?.label || item.assignmentType})
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* ACTIONS DROITE */}
                            <div className="flex items-center gap-2 shrink-0">
                              {isAssigned ? (
                                <button
                                  onClick={() => handleRevoke(item)}
                                  disabled={isProcessingItem || isProcessing}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isProcessingItem ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <XCircle size={14} />
                                  )}
                                  {isProcessingItem ? 'Traitement...' : 'Désassigner'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleAssign(item)}
                                  disabled={!selectedAidant || isProcessingItem || isProcessing}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                                  style={{ 
                                    background: (!selectedAidant || isProcessingItem || isProcessing) 
                                      ? '#9CA3AF' 
                                      : colors.primary 
                                  }}
                                >
                                  {isProcessingItem ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <UserPlus size={14} />
                                  )}
                                  {isProcessingItem ? 'Traitement...' : 'Assigner'}
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
        // ✅ VUE FAMILLE / AIDANT : Patients en cartes
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
          <section className="bg-white rounded-2xl py-12 px-4 text-center border border-black/5">
            <Illustration 
              type={searchTerm || categoryFilter !== 'all' ? 'search' : 'users'} 
              size="md" 
              className="mx-auto mb-3 opacity-30"
            />

            <h3 className="text-sm font-bold text-gray-700">
              {searchTerm || categoryFilter !== 'all'
                ? 'Aucun résultat trouvé'
                : empty}
            </h3>

            <p className="text-xs text-gray-400 mt-0.5">
              {searchTerm || categoryFilter !== 'all'
                ? 'Essayez de modifier vos critères de recherche.'
                : emptyAction}
            </p>

            {!searchTerm && categoryFilter === 'all' && canManage && (
              <button
                onClick={handleAdd}
                className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs"
                style={{ background: colors.primary }}
              >
                <UserPlus size={13} />
                {add}
              </button>
            )}
          </section>
        )
      )}

      {/* ============================================================
      LÉGENDE (admin seulement)
      ============================================================ */}
      {isAdmin && Object.keys(grouped).length > 0 && (
        <div className="bg-white rounded-2xl p-3 border border-black/5">
          <div className="flex flex-wrap items-center gap-3 text-[10px]">
            <span className="font-medium text-gray-500">Légende :</span>
            <span className="flex items-center gap-1 text-green-600"><Circle size={8} fill="#10b981" /> P1 - Patient</span>
            <span className="flex items-center gap-1 text-blue-600"><Circle size={8} fill="#3b82f6" /> P2 - Compte personnel</span>
            <span className="flex items-center gap-2 text-gray-400 ml-auto">
              {isProcessing && <Loader2 size={12} className="animate-spin" />}
              {isProcessing ? 'Traitement...' : 'Prêt'}
            </span>
          </div>
        </div>
      )}

      {/* ============================================================
      ACCÈS RAPIDE FLOUTÉ (MOBILE ONLY) - Famille seulement
      ============================================================ */}
      {canManage && !isAdmin && (
        <button
          onClick={handleAdd}
          className="sm:hidden fixed bottom-20 right-4 z-40 w-11 h-11 rounded-2xl text-white shadow-lg flex items-center justify-center active:scale-95 transition"
          style={{ background: colors.primary }}
          aria-label={add}
        >
          <Plus size={20} />
        </button>
      )}

      {/* MODAL PATIENT */}
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
