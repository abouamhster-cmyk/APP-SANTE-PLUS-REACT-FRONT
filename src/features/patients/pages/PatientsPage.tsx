// 📁 src/features/patients/pages/PatientsPage.tsx
// ✅ PAGE MEMBRES & ATTRIBUTIONS : NETTOYAGE RESPONSIVE MOBILE SANS DOUBLONS ET RESOLUTION DES ERREURS TS2552 ET TS2304

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
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { Illustration } from '@/components/ui/Illustration';
import { PatientCard } from '@/components/patients/PatientCard';
import { PatientModal } from '../components/PatientModal';
import { useRefreshableData } from '@/hooks/useRefreshableData';
import { supabase } from '@/lib/supabase';
import { assignmentAPI } from '@/lib/api';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

// ✅ IMPORTATION DE LA MODALE UNIFIÉE (Résout définitivement le décalage de calque à la racine sur mobile !) [23]
import { AssignAidantModal } from '@/features/aidants/components/AssignAidantModal';

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
  // ✅ CORRIGÉ (TS2304) : Ajout de la variable "user" détruite du store d'authentification [24]
  const { profile, role, user } = useAuthStore();
  const brand = useBranding();
  const colors = brand.colors;
  const { fetchAssignments } = useAssignmentStore();

  const {
    singular,
    add,
    empty,
    emptyAction,
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

  // États d'assignation
  const [showRowAssignModal, setShowRowAssignModal] = useState(false);
  const [selectedItemToAssign, setSelectedItemToAssign] = useState<AssignmentItem | null>(null);

  // ÉTATS DE PULL-TO-REFRESH MOBILE
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startTouchY = useRef(0);

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

   useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

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

  const getCategoryLabel = (category: string): string => {
    if (category === 'maman_bebe') return '👶 Maman & Bébé';
    if (category === 'senior') return '👴 Senior';
    if (category === 'personal') return '👤 Personnel';
    return 'Non spécifié';
  };

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
    setShowRowAssignModal(true);
  };

  const handleAssignSuccess = () => {
    setShowRowAssignModal(false);
    setSelectedItemToAssign(null);
    fetchAllData();
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

  const fetchAllDataMemo = useCallback(async () => {
    await fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    const loadData = async () => {
      if (isAidant) {
        await syncAidantPatients();
      } else {
        await fetchAllDataMemo();
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

      {/* HEADER ÉDITORIAL */}
      <section className="relative overflow-hidden bg-white/60 border rounded-2xl p-6 text-center shadow-sm backdrop-blur-md" style={{ borderColor: colors.primary + '15' }}>
        <div className="space-y-1.5 relative z-10">
          <h1 className="text-base sm:text-lg font-black tracking-tight" style={{ color: colors.text }}>
            {isAdmin ? 'Membres & Attributions' : 'Mes proches'}
          </h1>
          <p className="text-xs max-w-sm mx-auto leading-relaxed" style={{ color: colors.textLight }}>
            {isAdmin 
              ? 'Supervision complète des fiches d\'interventions et charges des aidants.' 
              : 'Retrouvez les fiches d\'identité et de suivi de vos proches accompagnés.'}
          </p>
        </div>

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

      {/* WIDGET BENTO D'ACTIVITÉ */}
      {isAdmin && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between h-36" style={{ borderColor: colors.primary + '15' }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textLight }}>Activité active</span>
              <Users size={16} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-3xl font-black tracking-tight" style={{ color: colors.text }}>{stats.totalBeneficiaires}</p>
              <p className="text-xs font-medium mt-1.5" style={{ color: colors.textLight }}>Bénéficiaires & comptes enregistrés</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between h-36" style={{ borderColor: colors.primary + '15' }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textLight }}>Suivi d'attributions</span>
              <UserCheck size={16} className="text-blue-500" />
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-xl font-black" style={{ color: colors.text }}>{stats.assignedCount} rattachés</p>
                <p className="text-[10px] font-bold" style={{ color: colors.gold || '#c9a84c' }}>{stats.unassignedCount} libres</p>
              </div>
              <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden flex">
                <div 
                  className="h-full transition-all duration-500 rounded-full" 
                  style={{ 
                    width: `${(stats.assignedCount / (stats.totalBeneficiaires || 1)) * 100}%`,
                    background: colors.primary 
                  }} 
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between h-36" style={{ borderColor: colors.primary + '15' }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textLight }}>Foyers enregistrés</span>
              <Home size={16} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-3xl font-black tracking-tight" style={{ color: colors.text }}>{stats.totalFamilies}</p>
              <p className="text-xs font-medium mt-1.5" style={{ color: colors.textLight }}>Foyers familiaux sous contrat</p>
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
            className="w-full h-11 pl-11 pr-4 rounded-xl border outline-none text-xs font-semibold focus:border-emerald-500/50 transition-all shadow-sm"
            style={{ borderColor: colors.primary + '20', color: colors.text }}
          />
        </div>
        
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-11 px-4 rounded-xl border outline-none text-xs font-semibold shrink-0 sm:w-48 shadow-sm cursor-pointer focus:border-emerald-500/50 transition-all"
          style={{ borderColor: colors.primary + '20', color: colors.text }}
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
          <section className="bg-white rounded-2xl py-16 px-4 text-center border max-w-md mx-auto space-y-4" style={{ borderColor: colors.primary + '15' }}>
            <Illustration type={searchTerm || categoryFilter !== 'all' ? 'search' : 'users'} size="md" className="mx-auto opacity-35" />
            <div className="space-y-1">
              <h3 className="font-bold text-sm" style={{ color: colors.text }}>Aucun dossier correspondant</h3>
              <p className="text-xs" style={{ color: colors.textLight }}>Veuillez modifier ou réinitialiser vos filtres de recherche.</p>
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
                  className="bg-white rounded-2xl border shadow-sm p-6 space-y-4 transition-all duration-300 hover:shadow-md"
                  style={{ borderColor: colors.primary + '15' }}
                >
                  <div className="flex items-start justify-between gap-3 border-b pb-4" style={{ borderColor: colors.primary + '10' }}>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textLight }}>Dossier de suivi</span>
                      <h3 className="font-extrabold text-sm truncate mt-1" style={{ color: colors.text }}>
                        Foyer {group.name}
                      </h3>
                    </div>
                    {hasUnassigned ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border" style={{ backgroundColor: colors.gold + '15', color: colors.gold, borderColor: colors.gold + '30' }}>
                        Rattachement requis
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border" style={{ backgroundColor: colors.primary + '10', color: colors.primary, borderColor: colors.primary + '20' }}>
                        Attributions complètes ({familyItems.length})
                      </span>
                    )}
                  </div>

                  <div className="divide-y" style={{ borderColor: colors.primary + '10' }}>
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
                                <span className="font-bold text-xs truncate" style={{ color: colors.text }}>
                                  {item.targetName}
                                </span>
                                {isAssigned && (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md border flex items-center gap-1" style={{ backgroundColor: colors.primary + '10', color: colors.primary, borderColor: colors.primary + '20' }}>
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors.primary }} />
                                    {item.assignedAidantName}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-bold block mt-1 uppercase tracking-wide" style={{ color: colors.textLight }}>
                                {isAccount ? 'Responsable légal' : 'Proche accompagné'}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isAssigned ? (
                              <button
                                onClick={() => handleRevoke(item)}
                                disabled={isProcessingItem || isProcessing}
                                className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-all border"
                                style={{ borderColor: colors.primary + '15' }}
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
          <section className="bg-white/40 rounded-2xl py-16 px-6 text-center border max-w-sm mx-auto flex flex-col items-center justify-center gap-4 backdrop-blur-sm shadow-sm" style={{ borderColor: colors.primary + '15' }}>
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
              <Users size={20} />
            </div>
            
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm" style={{ color: colors.text }}>{empty}</h3>
              <p className="text-xs" style={{ color: colors.textLight }}>{emptyAction}</p>
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

       {showRowAssignModal && selectedItemToAssign && (
        <AssignAidantModal
          isOpen={showRowAssignModal}
          onClose={handleAssignSuccess}
          targetType={selectedItemToAssign.targetType === 'personal_account' ? 'personal_account' : 'patient'}
          targetId={selectedItemToAssign.targetId}
          targetName={selectedItemToAssign.targetName}
          onSuccess={handleAssignSuccess}
          currentAidantId={selectedItemToAssign.assignedAidantUserId}
          colors={colors}
          allowForce={true}
          onAssignAidant={async (aidantUserId, assignmentType, force) => {
            // Appeler l'API de force assignation administrative [30]
            await assignmentAPI.adminForceAssign({
              aidantUserId,
              targetType: selectedItemToAssign.targetType,
              targetId: selectedItemToAssign.targetId,
              familyId: selectedItemToAssign.familyId,
              assignmentType,
              reason: `Rattachement administratif contextuel par ${profile?.full_name}`,
              expiresAt: null,
              force: force || false,
            });
          }}
          isAdmin={true}
        />
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
