// 📁 src/features/patients/pages/PatientsPage.tsx
// ✅ PAGE MEMBRES & ATTRIBUTIONS : NETTOYAGE RESPONSIVE MOBILE SANS DOUBLONS NI CHEVAUCHEMENTS

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  UserPlus,
  RefreshCw,
  Users,
  UserCheck,
  Home,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  User as UserIcon,
  UserMinus,
  Briefcase,
  Shield,
  X,
  Heart,
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

  const [showRowAssignModal, setShowRowAssignModal] = useState(false);
  const [selectedItemToAssign, setSelectedItemToAssign] = useState<AssignmentItem | null>(null);
  const [modalAidant, setModalAidant] = useState('');
  const [modalType, setModalType] = useState('primary');
  const [modalForce, setModalForce] = useState(false);

  // ÉTATS DE PULL-TO-REFRESH MOBILE
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startTouchY = useRef(0);

  const colors = getThemeColors(getThemeByRole(role as any, profile?.patient_category as any));
  const canManage = canManagePatients();
  const isAdmin = isAdminOrCoordinator;

  const fetchAllData = useCallback(async () => {
    if (!isAdmin) {
      await fetchPatients(true);
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

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startTouchY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    const currentY = e.touches[0].clientY;
    const diffY = currentY - startTouchY.current;

    if (diffY > 0 && window.scrollY === 0) {
      const resistance = Math.min(diffY * 0.38, 72);
      setPullY(resistance);
      if (e.cancelable) e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    setIsPulling(false);
    if (pullY >= 50) {
      toast.promise(
        (async () => {
          if (isAidant) {
            await syncAidantPatients();
          } else {
            await fetchAllData();
          }
        })(),
        {
          loading: 'Actualisation des profils...',
          success: 'Fiches synchronisées à jour !',
          error: 'Échec de synchronisation.',
        }
      );
    }
    setPullY(0);
  };

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

  const isLoading = patientsLoading || isLoadingAssignments;

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-6">
        <div className="h-28 bg-gray-100 dark:bg-gray-800/50 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 bg-gray-100 dark:bg-gray-800/30 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const modalSelectedAidantObj = aidants.find(a => a.user_id === modalAidant);
  const isSelectedAidantFull = modalSelectedAidantObj && (modalSelectedAidantObj.current_assignments >= modalSelectedAidantObj.max_assignments);

  return (
    <div 
      className="w-full max-w-5xl mx-auto space-y-6 pb-6 px-1 sm:px-0"  
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="w-full flex justify-center overflow-hidden transition-all duration-300 ease-out"
        style={{ 
          height: pullY > 0 ? `${pullY}px` : '0px',
          opacity: pullY > 0 ? Math.min(pullY / 45, 1) : 0
        }}
      >
        <div className="flex items-center gap-1.5 py-1 text-emerald-600 dark:text-emerald-400">
          <RefreshCw 
            size={13} 
            className={cn("transition-all", pullY >= 50 ? "rotate-180 animate-spin" : "")} 
            style={{ transform: pullY < 50 ? `rotate(${pullY * 3.6}deg)` : undefined }}
          />
          <span className="text-[10px] font-black uppercase tracking-wider">
            {pullY >= 50 ? 'Relâcher pour actualiser' : 'Tirer pour rafraîchir'}
          </span>
        </div>
      </div>

      {/* HEADER ÉDITORIAL DANS UN CADRE GLASSMORPHIC */}
      <section className="relative overflow-hidden bg-white/60 dark:bg-[#17231d]/60 border border-gray-100/80 dark:border-gray-800/40 rounded-2xl p-6 text-center shadow-sm backdrop-blur-md">
        <div className="space-y-1.5 relative z-10">
          <h1 className="text-base sm:text-lg font-black tracking-tight text-gray-800 dark:text-gray-100">
            {isAdmin ? 'Membres & Attributions' : 'Mes proches'}
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-sm mx-auto leading-relaxed">
            {isAdmin 
              ? 'Supervision complète des fiches d’interventions et charges des aidants.' 
              : 'Retrouvez les fiches d’identité et de suivi de vos proches accompagnés.'}
          </p>
        </div>

        {/* ✅ CORRECTIF DE SÉCURITÉ MOBILE : Bouton absolu de création masqué sur mobile (évite répétition / chevauchement) */}
        {canManage && !isAdmin && patients.length > 0 && (
          <button
            onClick={handleAdd}
            className="hidden sm:flex absolute top-4 right-4 h-8 px-3.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider text-white transition hover:opacity-90 items-center gap-1 shadow-sm"
            style={{ background: colors.primary }}
          >
            <Plus size={12} strokeWidth={2.5} />
            {add}
          </button>
        )}
      </section>

      {/* WIDGET BENTO D'ACTIVITÉ MODERNE */}
      {isAdmin && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#17231d] p-6 rounded-2xl border border-gray-100 dark:border-gray-800/60 shadow-sm flex flex-col justify-between h-36">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Activité active</span>
              <Users size={16} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-3xl font-black tracking-tight text-gray-900 dark:text-white leading-none">{stats.totalBeneficiaires}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1.5">Bénéficiaires & comptes enregistrés</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#17231d] p-6 rounded-2xl border border-gray-100 dark:border-gray-800/60 shadow-sm flex flex-col justify-between h-36">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Suivi d'attributions</span>
              <UserCheck size={16} className="text-blue-500" />
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-xl font-black text-gray-800 dark:text-gray-100 leading-none">{stats.assignedCount} rattachés</p>
                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 leading-none">{stats.unassignedCount} libres</p>
              </div>
              <div className="w-full h-1.5 bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500 rounded-full" 
                  style={{ width: `${(stats.assignedCount / (stats.totalBeneficiaires || 1)) * 100}%` }} 
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#17231d] p-6 rounded-2xl border border-gray-100 dark:border-gray-800/60 shadow-sm flex flex-col justify-between h-36">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Foyers enregistrés</span>
              <Home size={16} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-3xl font-black tracking-tight text-gray-800 dark:text-gray-100 leading-none">{stats.totalFamilies}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1.5">Foyers familiaux sous contrat</p>
            </div>
          </div>
        </section>
      )}

      {/* BARRE DE CONTRÔLES */}
      <section className="flex flex-col sm:flex-row gap-3 w-full">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isAdmin ? "Rechercher par nom de famille, proche, aidant..." : "Rechercher un membre..."}
            className="w-full h-11 pl-11 pr-4 rounded-xl border outline-none bg-white dark:bg-[#17231d] border-gray-100 dark:border-gray-800/60 text-xs font-semibold focus:border-emerald-500/50 transition-all shadow-sm"
            style={{ color: colors.text }}
          />
        </div>
        
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-11 px-4 rounded-xl border outline-none text-xs font-semibold bg-white dark:bg-[#17231d] border-gray-100 dark:border-gray-800/60 shrink-0 sm:w-48 shadow-sm cursor-pointer focus:border-emerald-500/50 transition-all"
          style={{ color: colors.text }}
        >
          <option value="all">Tous les profils</option>
          <option value="senior">👴 Seniors</option>
          <option value="maman_bebe">👶 Mamans & Bébés</option>
          {isAdmin && <option value="personal">👤 Comptes personnels</option>}
        </select>
      </section>

      {/* RENDU DES DOSSIERS EN GRILLE CARREE COHERENTE */}
      {isAdmin ? (
        Object.keys(grouped).length === 0 ? (
          <section className="bg-white dark:bg-[#17231d] rounded-2xl py-16 px-4 text-center border border-gray-100 dark:border-[#2c3f35] max-w-md mx-auto space-y-4">
            <Illustration type={searchTerm || categoryFilter !== 'all' ? 'search' : 'users'} size="md" className="mx-auto opacity-35" />
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100">Aucun dossier correspondant</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">Veuillez modifier ou réinitialiser vos filtres de recherche.</p>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(grouped).map(([familyId, group]: any) => {
              const familyItems = group.items;
              const hasUnassigned = familyItems.some((i: AssignmentItem) => !i.assignedAidantUserId);

              return (
                <div 
                  key={familyId} 
                  className="bg-white dark:bg-[#17231d] rounded-2xl border border-gray-100 dark:border-gray-800/60 shadow-sm p-6 space-y-4 transition-all duration-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-gray-100/50 dark:border-gray-800/30 pb-4">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Dossier de suivi</span>
                      <h3 className="font-extrabold text-sm text-gray-800 dark:text-gray-100 truncate mt-1">
                        Foyer {group.name}
                      </h3>
                    </div>
                    {hasUnassigned ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                        Rattachement requis
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                        Attributions complètes ({familyItems.length})
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-gray-100/50 dark:divide-gray-800/30">
                    {familyItems.map((item: AssignmentItem) => {
                      const isAssigned = !!item.assignedAidantUserId;
                      const isAccount = item.type === 'account';
                      const categoryColor = getCategoryColor(item.category);
                      const isProcessingItem = processingId === item.id;

                      return (
                        <div 
                          key={item.id} 
                          className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div 
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-inner"
                              style={{ 
                                background: isAccount ? '#f0f9ff' : categoryColor + '10', 
                                color: isAccount ? '#0284c7' : categoryColor 
                              }}
                            >
                              {item.targetName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">
                                  {item.targetName}
                                </span>
                                {isAssigned && (
                                  <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    {item.assignedAidantName}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold block mt-1 uppercase tracking-wide">
                                {isAccount ? 'Responsable légal' : 'Proche accompagné'}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isAssigned ? (
                              <button
                                onClick={() => handleRevoke(item)}
                                disabled={isProcessingItem || isProcessing}
                                className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-red-50 dark:bg-gray-800/40 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center justify-center transition-all border border-gray-100 dark:border-gray-800/30"
                                title="Désassigner l'aidant"
                              >
                                {isProcessingItem ? (
                                  <Loader2 size={13} className="animate-spin text-gray-400" />
                                ) : (
                                  <UserMinus size={13} />
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenRowAssignModal(item)}
                                disabled={isProcessingItem || isProcessing}
                                className="h-8 px-3 rounded-xl text-[10px] font-extrabold uppercase tracking-wider text-white transition-all duration-200 hover:opacity-90 flex items-center gap-1 shadow-sm"
                                style={{ background: colors.primary }}
                              >
                                <UserPlus size={11} strokeWidth={2.5} />
                                Rattacher
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
        /* VUE BÉNÉFICIAIRE COMPTE FAMILLE */
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
          /* CADRE VIDE */
          <section className="bg-white/40 dark:bg-[#17231d]/40 rounded-2xl py-16 px-6 text-center border border-gray-100 dark:border-gray-800/40 max-w-sm mx-auto flex flex-col items-center justify-center gap-4 backdrop-blur-sm shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-[#24362d] flex items-center justify-center text-gray-400">
              <Users size={20} />
            </div>
            
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-gray-800 dark:text-gray-100">{empty}</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs leading-relaxed">{emptyAction}</p>
            </div>

            {canManage && (
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-white font-bold text-xs transition hover:opacity-90 shadow-sm"
                style={{ background: colors.primary }}
              >
                <Plus size={13} strokeWidth={2.5} />
                {add}
              </button>
            )}
          </section>
        )
      )}

      {/* FOOTER DISCRET */}
      {isAdmin && Object.keys(grouped).length > 0 && (
        <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold text-center pt-4 tracking-wide uppercase">
          🟢 Système d'attributions d'intervenants Santé Plus Services — Synchronisé
        </div>
      )}

      {/* BOUTON ACCÈS RAPIDE FLOTTANT (MOBILES UNIQUEMENT) */}
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

      {/* ASSIGNATION CONTEXTUELLE INDIVIDUELLE */}
      {showRowAssignModal && selectedItemToAssign && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowRowAssignModal(false); }}
        >
          <div className="bg-white dark:bg-[#17231d] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 border border-gray-100 dark:border-gray-800/60 animate-fadeIn">
            <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800/40 pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Rattachement administratif</span>
                <h3 className="text-sm font-extrabold text-gray-800 dark:text-gray-100">Intervenant d'accompagnement</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Dossier : <strong className="text-gray-700 dark:text-gray-300 font-bold">{selectedItemToAssign.targetName}</strong></p>
              </div>
              <button 
                onClick={() => setShowRowAssignModal(false)}
                className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-gray-800/40 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all border border-gray-100 dark:border-gray-800/30"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Sélectionner un aidant qualifié</label>
                <select
                  value={modalAidant}
                  onChange={(e) => setModalAidant(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border outline-none text-xs font-semibold bg-gray-50 dark:bg-[#1d2d25] border-gray-100 dark:border-gray-800/60"
                  style={{ color: colors.text }}
                >
                  <option value="">Sélectionner un aidant</option>
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

              {modalSelectedAidantObj && (
                <div className={cn(
                  "p-3 rounded-xl flex items-center justify-between border text-[11px] font-semibold transition-all",
                  isSelectedAidantFull ? "bg-red-50/50 border-red-200/50 text-red-700 dark:text-red-400 dark:bg-red-950/20" : "bg-emerald-50/50 border-emerald-200/50 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-950/20"
                )}>
                  <span>Quota de l'intervenant : {modalSelectedAidantObj.current_assignments}/{modalSelectedAidantObj.max_assignments}</span>
                  <span>{isSelectedAidantFull ? 'Quota max atteint' : 'Disponible'}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Type de contrat d'accompagnement</label>
                <select
                  value={modalType}
                  onChange={(e) => setModalType(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border outline-none text-xs font-semibold bg-gray-50 dark:bg-[#1d2d25] border-gray-100 dark:border-gray-800/60"
                  style={{ color: colors.text }}
                >
                  {ASSIGNMENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {isSelectedAidantFull && (
                <div className="p-4 bg-amber-50/40 dark:bg-amber-950/10 rounded-xl border border-amber-100/50 dark:border-amber-900/30 space-y-3">
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
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-[#1d2d25] border-gray-100 dark:border-gray-800/60"
                    />
                    <label htmlFor="force_checkbox" className="text-xs font-bold text-amber-950 dark:text-amber-200 cursor-pointer select-none">
                      Forcer le rattachement
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-gray-800/40">
              <button
                type="button"
                onClick={() => setShowRowAssignModal(false)}
                className="h-11 rounded-xl font-bold border border-gray-100 dark:border-gray-800/60 bg-white dark:bg-[#17231d] hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-xs sm:text-sm text-center"
                style={{ color: colors.text }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmRowAssign}
                disabled={isProcessing || (!modalForce && isSelectedAidantFull)}
                className="h-11 rounded-xl text-white font-bold transition-all hover:opacity-90 flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
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
