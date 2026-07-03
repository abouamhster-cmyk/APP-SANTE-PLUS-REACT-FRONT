// 📁 src/features/admin/pages/AssignAidantPage.tsx
// ✅ Version corrigée - Utilisation de l'API backend

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  UserPlus,
  User,
  Users as UsersIcon,
  Home,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Circle,
  Check,
  X,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { assignmentAPI } from '@/lib/api';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
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

const AssignAidantPage = () => {
  const { profile, role, user } = useAuthStore();
  const colors = getThemeColors(getThemeByRole(role, profile?.patient_category as any));

  // ============================================================
  // ÉTATS
  // ============================================================

  const [aidants, setAidants] = useState<Aidant[]>([]);
  const [familyAccounts, setFamilyAccounts] = useState<FamilyAccount[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAidant, setSelectedAidant] = useState('');
  const [selectedType, setSelectedType] = useState('primary');
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [searchTerm, setSearchTerm] = useState('');

  // ============================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================

  const fetchData = async () => {
    setIsLoading(true);

    try {
      // 1. Aidants - Direct Supabase (public)
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

      // 2. Familles - Direct Supabase (public)
      const { data: families } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'family');
      setFamilyAccounts(families || []);

      // 3. Patients - Direct Supabase (public)
      const { data: patientsData } = await supabase
        .from('patients')
        .select(`
          id, first_name, last_name, category,
          patient_family_links!inner(family_id)
        `);

      setPatients(
        (patientsData || []).map(p => ({
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          category: p.category,
          family_id: p.patient_family_links?.[0]?.family_id,
        }))
      );

      // 4. Assignations - ✅ Utiliser l'API backend
      try {
        const response = await assignmentAPI.adminGetAll();
        const assignmentsData = response.data?.data || [];
        
        const mapAssign: any = {};
        assignmentsData?.forEach((a: any) => {
          mapAssign[`${a.target_type}_${a.target_id}`] = a;
        });
        setAssignments(mapAssign);
      } catch (apiError) {
        console.error('❌ Erreur récupération assignations via API:', apiError);
        // Fallback: tableau vide
        setAssignments({});
      }
    } catch (error) {
      console.error('❌ Erreur fetchData:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ============================================================
  // CONSTRUCTION DE LA LISTE HIÉRARCHIQUE
  // ============================================================

  const assignmentItems = familyAccounts.flatMap(family => {
    const accountKey = `personal_account_${family.id}`;
    const accountAssignment = assignments[accountKey];

    // Récupérer le nom de l'aidant assigné au compte
    let accountAidantName = '';
    if (accountAssignment?.aidant_user_id) {
      const aidant = aidants.find(a => a.user_id === accountAssignment.aidant_user_id);
      accountAidantName = aidant?.user?.full_name || '';
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
      assignedAidantUserId: accountAssignment?.aidant_user_id,
      assignedAidantName: accountAidantName,
      assignmentType: accountAssignment?.assignment_type,
      assignmentId: accountAssignment?.id,
    };

    const familyPatients = patients.filter(p => p.family_id === family.id);
    const patientItems = familyPatients.map(p => {
      const key = `patient_${p.id}`;
      const a = assignments[key];

      let aidantName = '';
      if (a?.aidant_user_id) {
        const aidant = aidants.find(ad => ad.user_id === a.aidant_user_id);
        aidantName = aidant?.user?.full_name || '';
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
        assignedAidantUserId: a?.aidant_user_id,
        assignedAidantName: aidantName,
        assignmentType: a?.assignment_type,
        assignmentId: a?.id,
      };
    });

    return [accountItem, ...patientItems];
  });

  // ============================================================
  // FILTRAGE
  // ============================================================

  const filteredItems = assignmentItems.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.targetName.toLowerCase().includes(term) ||
      item.familyName.toLowerCase().includes(term) ||
      (item.assignedAidantName && item.assignedAidantName.toLowerCase().includes(term))
    );
  });

  // ============================================================
  // GROUPEMENT PAR FAMILLE
  // ============================================================

  const grouped = filteredItems.reduce((acc: any, item) => {
    acc[item.familyId] = acc[item.familyId] || {
      name: item.familyName,
      items: [],
    };
    acc[item.familyId].items.push(item);
    return acc;
  }, {});

  // ============================================================
  // TOGGLE EXPAND
  // ============================================================

  const toggleExpand = (familyId: string) => {
    setExpanded(prev => ({ ...prev, [familyId]: !prev[familyId] }));
  };

  // ============================================================
  // HANDLERS - ✅ UTILISATION DE L'API
  // ============================================================

  const handleAssign = async (item: AssignmentItem) => {
    if (!selectedAidant) {
      toast.error('Veuillez sélectionner un aidant');
      return;
    }

    setIsProcessing(true);
    try {
      // ✅ Utiliser l'API d'assignation
      await assignmentAPI.create({
        aidantUserId: selectedAidant,
        targetType: item.targetType,
        targetId: item.targetId,
        assignmentType: selectedType,
        reason: `Assigné par admin ${user?.email || 'admin'}`,
        expiresAt: null,
      });

      toast.success(`✅ ${item.targetName} assigné avec succès`);
      await fetchData();
    } catch (error: any) {
      console.error('❌ Erreur assignation:', error);
      toast.error(error.message || 'Erreur lors de l\'assignation');
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

    setIsProcessing(true);
    try {
      // ✅ Utiliser l'API de révocation
      await assignmentAPI.revoke(item.assignmentId, `Révoqué par ${user?.email || 'admin'}`);

      toast.success(`✅ Assignation de ${item.targetName} retirée`);
      await fetchData();
    } catch (error: any) {
      console.error('❌ Erreur révocation:', error);
      toast.error(error.message || 'Erreur lors de la révocation');
    } finally {
      setIsProcessing(false);
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

      toast.success(`✅ ${unassigned.length} bénéficiaire(s) assignés`);
      await fetchData();
    } catch (error: any) {
      console.error('❌ Erreur assignation en masse:', error);
      toast.error(error.message || 'Erreur lors de l\'assignation');
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================================
  // STATISTIQUES
  // ============================================================

  const totalItems = assignmentItems.length;
  const assignedCount = assignmentItems.filter(i => i.assignedAidantUserId).length;
  const unassignedCount = totalItems - assignedCount;
  const totalFamilies = familyAccounts.length;

  // ============================================================
  // RENDU
  // ============================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: colors.primary }} />
          <p className="text-sm text-gray-500">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">

      {/* ============================================================
      HEADER
      ============================================================ */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-black/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight" style={{ color: colors.text }}>
              👥 Affectations
            </h1>
            <p className="text-xs mt-0.5 text-gray-400">
              Gérez les aidants assignés aux comptes et aux patients
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={isProcessing}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border bg-white hover:bg-gray-50 flex items-center gap-1.5 shrink-0"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>

        {/* STATS */}
        <div className="flex flex-wrap gap-3 mt-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <Users size={14} />
            {totalItems} bénéficiaires
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <UserCheck size={14} />
            {assignedCount} assignés
          </div>
          {unassignedCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
              <UserX size={14} />
              {unassignedCount} non assignés
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Home size={14} />
            {totalFamilies} comptes
          </div>
        </div>
      </div>

      {/* ============================================================
      BARRE D'ACTION
      ============================================================ */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-black/5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <select
              value={selectedAidant}
              onChange={e => setSelectedAidant(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border outline-none text-sm focus:ring-1"
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

          <div className="sm:w-52">
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border outline-none text-sm focus:ring-1"
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
            disabled={!selectedAidant || isProcessing || unassignedCount === 0}
            className="px-4 py-2 rounded-xl text-white font-bold text-sm flex items-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: colors.primary }}
          >
            <UserPlus size={16} />
            Assigner tout ({unassignedCount})
          </button>
        </div>

        {/* RECHERCHE */}
        <div className="mt-3">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher un compte ou un bénéficiaire..."
            className="w-full px-3.5 py-2 rounded-xl border outline-none text-sm"
            style={{ borderColor: colors.border, color: colors.text }}
          />
        </div>
      </div>

      {/* ============================================================
      LISTE DES ASSIGNATIONS
      ============================================================ */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-black/5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: colors.primary + '12' }}>
            <Users size={28} style={{ color: colors.primary }} />
          </div>
          <h3 className="font-bold text-sm" style={{ color: colors.text }}>
            Aucun bénéficiaire trouvé
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {searchTerm ? 'Aucun résultat ne correspond à votre recherche' : 'Aucun compte ou patient disponible'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([familyId, group]: any) => {
            const isExpanded = expanded[familyId] !== false;
            const familyItems = group.items;
            const hasUnassigned = familyItems.some((i: AssignmentItem) => !i.assignedAidantUserId);

            return (
              <div key={familyId} className="bg-white rounded-3xl border overflow-hidden shadow-sm" style={{ borderColor: colors.border }}>
                
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

                      return (
                        <div key={item.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-gray-50/50 transition">
                          
                          {/* INFO GAUCHE */}
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Indicateur de priorité */}
                            <div className="flex items-center gap-1 shrink-0">
                              {item.priority === 1 && (
                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                                  P1
                                </span>
                              )}
                              {item.priority === 2 && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                                  P2
                                </span>
                              )}
                              {item.priority === 3 && (
                                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">
                                  P3
                                </span>
                              )}
                            </div>

                            {/* Nom et type */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm truncate" style={{ color: colors.text }}>
                                  {isAccount ? '👤 ' : ''}{item.targetName}
                                </span>
                                <span 
                                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                                  style={{ 
                                    background: categoryColor + '20', 
                                    color: categoryColor 
                                  }}
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
                                    Assigné
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
                                disabled={isProcessing}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                              >
                                <XCircle size={14} />
                                Désassigner
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAssign(item)}
                                disabled={!selectedAidant || isProcessing}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition hover:opacity-80 disabled:opacity-50"
                                style={{ background: colors.primary }}
                              >
                                <UserPlus size={14} />
                                Assigner
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
      )}

      {/* ============================================================
      LÉGENDE
      ============================================================ */}
      <div className="bg-white rounded-3xl p-4 border border-black/5">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="font-medium text-gray-500">Légende des priorités :</span>
          <span className="flex items-center gap-1 text-green-600"><Circle size={8} fill="#10b981" /> P1 - Patient (priorité max)</span>
          <span className="flex items-center gap-1 text-blue-600"><Circle size={8} fill="#3b82f6" /> P2 - Compte personnel (fallback)</span>
          <span className="flex items-center gap-1 text-purple-600"><Circle size={8} fill="#8b5cf6" /> P3 - Famille (dernier fallback)</span>
        </div>
      </div>

    </div>
  );
};

export default AssignAidantPage;
