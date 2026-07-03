// 📁 src/features/admin/pages/AssignAidantPage.tsx

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { Loader2, CheckCircle, Users, RefreshCw, XCircle, Clock, AlertCircle, UserCircle, User, UserPlus, Info } from 'lucide-react';
import toast from 'react-hot-toast';

interface Aidant {
  id: string;
  user_id: string;
  user: {
    id: string;
    full_name: string;
    email: string;
  } | null;
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
}

const ASSIGNMENT_TYPES = [
  { value: 'primary', label: '📌 Permanente', color: '#10B981' },
  { value: 'temporary', label: '⏳ Temporaire', color: '#F59E0B' },
  { value: 'secondary', label: '⚡ Ponctuelle', color: '#3B82F6' },
];

// ✅ Interface pour afficher les items avec leur hiérarchie
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
  priority: number; // 1 = direct, 2 = compte, 3 = famille
  
  // Assignation actuelle
  assignedAidantUserId?: string;
  assignedAidantName?: string;
  assignmentType?: string;
  assignmentId?: string;
  // Source de l'assignation (pour affichage)
  assignmentSource?: 'direct' | 'account' | 'family' | 'none';
}

const AssignAidantPage = () => {
  const { profile, role, user } = useAuthStore();
  
  const [aidants, setAidants] = useState<Aidant[]>([]);
  const [familyAccounts, setFamilyAccounts] = useState<FamilyAccount[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAidant, setSelectedAidant] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('primary');

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // ✅ 1. Récupérer les aidants
      const { data: aidantsData } = await supabase
        .from('aidants')
        .select('*')
        .eq('status', 'approved')
        .eq('is_verified', true);

      const userIds = (aidantsData || []).map(a => a.user_id).filter(Boolean);
      let profilesMap: Record<string, any> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
        }
      }

      const aidantsWithUser = (aidantsData || []).map(aidant => ({
        ...aidant,
        user: aidant.user_id ? profilesMap[aidant.user_id] || null : null,
      }));
      setAidants(aidantsWithUser);

      // ✅ 2. Récupérer les comptes famille
      const { data: families } = await supabase
        .from('profiles')
        .select('id, full_name, email, patient_category')
        .eq('role', 'family');
      setFamilyAccounts(families || []);

      // ✅ 3. Récupérer les patients avec leur famille
      const { data: patientsData } = await supabase
        .from('patients')
        .select(`
          id, 
          first_name, 
          last_name, 
          category,
          patient_family_links!inner(family_id)
        `)
        .eq('status', 'active');
      
      const formattedPatients = (patientsData || []).map(p => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        category: p.category,
        family_id: p.patient_family_links?.[0]?.family_id || null,
      }));
      setPatients(formattedPatients);

      // ✅ 4. Récupérer les assignations existantes
      const { data: assignmentsData } = await supabase
        .from('aidant_assignments')
        .select('*')
        .eq('status', 'active');

      const assignmentsMap: Record<string, Assignment> = {};
      (assignmentsData || []).forEach((a) => {
        const key = `${a.target_type}_${a.target_id}`;
        assignmentsMap[key] = a;
      });
      setAssignments(assignmentsMap);

    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Construire la liste hiérarchique des items à afficher
  const buildAssignmentItems = (): AssignmentItem[] => {
    const items: AssignmentItem[] = [];

    // Pour chaque compte famille
    familyAccounts.forEach((family) => {
      // 1. Ajouter le compte lui-même (compte personnel) - PRIORITÉ 2
      const accountKey = `personal_account_${family.id}`;
      const accountAssignment = assignments[accountKey];
      
      items.push({
        id: `account_${family.id}`,
        type: 'account',
        familyId: family.id,
        familyName: family.full_name,
        targetId: family.id,
        targetName: `${family.full_name} (👤 Personnel)`,
        targetType: 'personal_account',
        category: 'personal',
        isPersonal: true,
        priority: 2,
        assignedAidantUserId: accountAssignment?.aidant_user_id,
        assignedAidantName: accountAssignment?.aidant_user_id 
          ? aidants.find(a => a.user_id === accountAssignment.aidant_user_id)?.user?.full_name 
          : undefined,
        assignmentType: accountAssignment?.assignment_type,
        assignmentId: accountAssignment?.id,
        assignmentSource: accountAssignment ? 'direct' : 'none',
      });

      // 2. Ajouter les patients de ce compte - PRIORITÉ 1 (direct)
      const familyPatients = patients.filter(p => p.family_id === family.id);
      familyPatients.forEach((patient) => {
        const patientKey = `patient_${patient.id}`;
        const patientAssignment = assignments[patientKey];
        
        // Déterminer la source de l'assignation
        let source: 'direct' | 'account' | 'family' | 'none' = 'none';
        if (patientAssignment) {
          source = 'direct';
        } else if (accountAssignment) {
          source = 'account'; // Hérité du compte
        } else {
          // Vérifier si la famille a un aidant (PRIORITÉ 3)
          const familyKey = `family_${family.id}`;
          const familyAssignment = assignments[familyKey];
          if (familyAssignment) {
            source = 'family';
          }
        }

        items.push({
          id: `patient_${patient.id}`,
          type: 'patient',
          familyId: family.id,
          familyName: family.full_name,
          targetId: patient.id,
          targetName: `${patient.first_name} ${patient.last_name}`,
          targetType: 'patient',
          category: patient.category,
          isPersonal: false,
          priority: 1,
          assignedAidantUserId: patientAssignment?.aidant_user_id,
          assignedAidantName: patientAssignment?.aidant_user_id
            ? aidants.find(a => a.user_id === patientAssignment.aidant_user_id)?.user?.full_name
            : undefined,
          assignmentType: patientAssignment?.assignment_type,
          assignmentId: patientAssignment?.id,
          assignmentSource: source,
        });
      });
    });

    return items;
  };

  const assignmentItems = buildAssignmentItems();

  const getCategoryLabel = (category: string) => {
    if (category === 'maman_bebe') return '👶 Maman & Bébé';
    if (category === 'senior') return '👴 Senior';
    if (category === 'personal') return '👤 Personnel';
    return 'Non spécifié';
  };

  const getAssignmentTypeLabel = (type: string) => {
    const found = ASSIGNMENT_TYPES.find(t => t.value === type);
    return found?.label || type;
  };

  const getAssignmentTypeColor = (type: string) => {
    const found = ASSIGNMENT_TYPES.find(t => t.value === type);
    return found?.color || '#9CA3AF';
  };

  // ✅ Obtenir l'aidant affiché (direct ou hérité)
  const getDisplayedAidant = (item: AssignmentItem) => {
    // Si l'item a une assignation directe
    if (item.assignedAidantUserId) {
      return {
        userId: item.assignedAidantUserId,
        name: item.assignedAidantName || 'Inconnu',
        type: item.assignmentType || 'primary',
        source: 'direct',
        sourceLabel: 'Assigné directement',
        sourceColor: '#10B981',
      };
    }

    // Si c'est un patient, vérifier l'héritage du compte
    if (item.type === 'patient') {
      const accountKey = `personal_account_${item.familyId}`;
      const accountAssignment = assignments[accountKey];
      
      if (accountAssignment) {
        const aidant = aidants.find(a => a.user_id === accountAssignment.aidant_user_id);
        return {
          userId: accountAssignment.aidant_user_id,
          name: aidant?.user?.full_name || 'Inconnu',
          type: accountAssignment.assignment_type || 'primary',
          source: 'account',
          sourceLabel: `Hérité du compte (${item.familyName})`,
          sourceColor: '#3B82F6',
        };
      }

      // Vérifier l'héritage de la famille (PRIORITÉ 3)
      const familyKey = `family_${item.familyId}`;
      const familyAssignment = assignments[familyKey];
      
      if (familyAssignment) {
        const aidant = aidants.find(a => a.user_id === familyAssignment.aidant_user_id);
        return {
          userId: familyAssignment.aidant_user_id,
          name: aidant?.user?.full_name || 'Inconnu',
          type: familyAssignment.assignment_type || 'primary',
          source: 'family',
          sourceLabel: `Hérité de la famille`,
          sourceColor: '#8B5CF6',
        };
      }
    }

    return null;
  };

  const handleAssign = async (item: AssignmentItem, aidantUserId: string, assignmentType: string) => {
    if (!aidantUserId) {
      toast('Veuillez sélectionner un aidant', { icon: 'ℹ️' });
      return;
    }

    setIsSaving(true);
    try {
      const aidant = aidants.find(a => a.user_id === aidantUserId);
      if (!aidant) {
        toast.error('Aidant non trouvé');
        setIsSaving(false);
        return;
      }

      // Vérifier le quota
      const { count: currentCount } = await supabase
        .from('aidant_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('aidant_user_id', aidantUserId)
        .eq('status', 'active');

      const maxAssignments = aidant.max_assignments || 4;
      if ((currentCount || 0) >= maxAssignments) {
        toast.error(`Cet aidant a déjà ${currentCount} assignations (maximum ${maxAssignments})`);
        setIsSaving(false);
        return;
      }

      // Déterminer la priorité selon le type
      let priority = 2; // compte par défaut
      if (item.type === 'patient') priority = 1;
      if (item.type === 'account') priority = 2;

      // Créer l'assignation
      const { data: newAssignment, error: insertError } = await supabase
        .from('aidant_assignments')
        .insert({
          aidant_user_id: aidantUserId,
          target_type: item.targetType,
          target_id: item.targetId,
          priority: priority,
          assignment_type: assignmentType,
          status: 'active',
          created_by: user?.id,
          reason: `Assigné à ${item.targetName}`,
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Erreur insertion:', insertError);
        toast.error(`Erreur: ${insertError.message}`);
        setIsSaving(false);
        return;
      }

      // Mettre à jour l'état local
      const key = `${item.targetType}_${item.targetId}`;
      setAssignments(prev => ({
        ...prev,
        [key]: {
          id: newAssignment.id,
          aidant_user_id: aidantUserId,
          target_type: item.targetType,
          target_id: item.targetId,
          assignment_type: assignmentType,
          status: 'active',
          priority: priority,
        } as Assignment,
      }));

      // Notification à l'aidant
      await supabase.from('notifications').insert({
        user_id: aidantUserId,
        title: item.isPersonal ? '📋 Compte personnel assigné' : '📋 Patient assigné',
        body: item.isPersonal
          ? `Vous accompagnez à présent ${item.familyName} (compte personnel)`
          : `Vous accompagnez à présent ${item.targetName} (${item.category})`,
        type: 'system',
        data: {
          assignment_id: newAssignment.id,
          target_id: item.targetId,
          target_type: item.targetType,
        },
      });

      // Notification au propriétaire du compte
      await supabase.from('notifications').insert({
        user_id: item.familyId,
        title: '✅ Aidant assigné',
        body: `Un aidant a été assigné à ${item.targetName}`,
        type: 'system',
        data: {
          assignment_id: newAssignment.id,
          aidant_id: aidant.id,
        },
      });

      toast.success(`✅ ${item.targetName} assigné à ${aidant.user?.full_name}`);

    } catch (error) {
      console.error('❌ Erreur assignation:', error);
      toast.error('Erreur lors de l\'assignation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevoke = async (item: AssignmentItem) => {
    const assignment = assignments[`${item.targetType}_${item.targetId}`];
    if (!assignment) return;

    if (!window.confirm(`Retirer l'assignation de ${item.targetName} ?`)) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('aidant_assignments')
        .update({
          status: 'inactive',
          reason: `Révoqué par admin (${user?.id})`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assignment.id);

      if (error) {
        console.error('❌ Erreur révocation:', error);
        toast.error(`Erreur: ${error.message}`);
        setIsSaving(false);
        return;
      }

      const key = `${item.targetType}_${item.targetId}`;
      setAssignments(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });

      toast.success(`✅ Assignation de ${item.targetName} retirée`);
    } catch (error) {
      console.error('❌ Erreur révocation:', error);
      toast.error('Erreur lors de la révocation');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="animate-spin text-gray-300" size={24} />
      </div>
    );
  }

  // ✅ Grouper les items par famille
  const groupedItems = assignmentItems.reduce((acc, item) => {
    if (!acc[item.familyId]) {
      acc[item.familyId] = {
        familyName: item.familyName,
        items: [],
      };
    }
    acc[item.familyId].items.push(item);
    return acc;
  }, {} as Record<string, { familyName: string; items: AssignmentItem[] }>);

  const assignedCount = assignmentItems.filter(item => item.assignedAidantUserId).length;
  const unassignedCount = assignmentItems.length - assignedCount;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 px-4 sm:px-6">
      
      {/* HEADER */}
      <section 
        className="relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all"
        style={{ background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.primary}12 100%)` }}
      >
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: colors.text }}>
            👥 Affectations
          </h1>
          <p className="text-xs mt-0.5" style={{ color: colors.textLight }}>
            Assignez des aidants professionnels aux comptes et à chaque patient individuellement
          </p>
          <div className="flex flex-wrap gap-3 mt-3">
            <span className="text-xs px-3 py-1 rounded-full" style={{ background: colors.primary + '12', color: colors.primary }}>
              {assignmentItems.length} bénéficiaires au total
            </span>
            <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700">
              {assignedCount} assignés
            </span>
            {unassignedCount > 0 && (
              <span className="text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">
                {unassignedCount} non assignés
              </span>
            )}
            <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700">
              {familyAccounts.length} comptes personnels
            </span>
          </div>
        </div>
      </section>

      {/* LÉGENDE DE PRIORITÉ */}
      <section className="bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-black/5">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="font-bold text-gray-500">Priorité d'assignation :</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-gray-600">Patient direct (Priorité 1)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-gray-600">Compte personnel (Priorité 2)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-500"></span>
            <span className="text-gray-600">Famille (Priorité 3)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gray-300"></span>
            <span className="text-gray-600">Non assigné</span>
          </div>
        </div>
      </section>

      {/* ASSIGNATION MULTIPLE */}
      {unassignedCount > 0 && (
        <section className="bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-black/5">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex-1 min-w-0 w-full">
              <select
                value={selectedAidant}
                onChange={(e) => setSelectedAidant(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border outline-none text-sm"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                <option value="">Sélectionner un aidant</option>
                {aidants.map((aidant) => (
                  <option key={aidant.id} value={aidant.user_id}>
                    {aidant.user?.full_name} {aidant.available ? '🟢' : '🔴'} - 
                    {aidant.specialties?.slice(0, 2).join(', ')}
                    {aidant.specialties?.length > 2 && '...'}
                    {` (${aidant.current_assignments || 0}/${aidant.max_assignments || 4})`}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-0 w-full">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border outline-none text-sm"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                {ASSIGNMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                if (!selectedAidant) {
                  toast.error('Veuillez sélectionner un aidant');
                  return;
                }
                const unassignedItems = assignmentItems.filter(item => !item.assignedAidantUserId);
                if (unassignedItems.length === 0) {
                  toast('Tous les bénéficiaires sont déjà assignés', { icon: 'ℹ️' });
                  return;
                }
                if (!window.confirm(`Assigner ${unassignedItems.length} bénéficiaire(s) à cet aidant avec le type "${selectedType}" ?`)) return;
                
                unassignedItems.forEach(item => {
                  handleAssign(item, selectedAidant, selectedType);
                });
              }}
              disabled={isSaving || !selectedAidant}
              className="px-4 py-2 rounded-xl text-white font-bold text-sm transition hover:opacity-90 disabled:opacity-50 whitespace-nowrap flex items-center gap-2"
              style={{ background: colors.primary }}
            >
              <Users size={16} />
              Assigner tout ({unassignedCount})
            </button>
          </div>
        </section>
      )}

      {/* TABLEAU DES ASSIGNATIONS - HIÉRARCHIQUE AVEC PRIORITÉ */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-black/5">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50/75">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Compte / Bénéficiaire</th>
                <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Aidant Assigné</th>
                <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Priorité</th>
                <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Type d'assignation</th>
                <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: colors.border }}>
              {Object.entries(groupedItems).map(([familyId, group]) => {
                // Vérifier si la famille a un aidant (PRIORITÉ 3)
                const familyKey = `family_${familyId}`;
                const familyAssignment = assignments[familyKey];
                const hasFamilyAidant = !!familyAssignment;

                return (
                  <React.Fragment key={familyId}>
                    {/* Ligne d'en-tête de la famille */}
                    <tr className="bg-gray-50/30">
                      <td colSpan={6} className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm" style={{ color: colors.primary }}>
                            👨‍👩‍👦 {group.familyName}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            ({group.items.filter(i => i.type === 'patient').length} patient{group.items.filter(i => i.type === 'patient').length > 1 ? 's' : ''})
                          </span>
                          {hasFamilyAidant && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 font-medium">
                              🏠 Aidant famille
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Lignes des items du compte */}
                    {group.items.map((item) => {
                      const displayedAidant = getDisplayedAidant(item);
                      const isAssigned = !!displayedAidant;
                      const isDirect = item.assignedAidantUserId !== undefined;
                      const isInherited = isAssigned && !isDirect;

                      // Couleur de la priorité
                      const priorityColor = item.priority === 1 ? '#10B981' : 
                                           item.priority === 2 ? '#3B82F6' : 
                                           item.priority === 3 ? '#8B5CF6' : '#9CA3AF';

                      return (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-gray-800 ${item.isPersonal ? 'text-blue-600' : ''}`}>
                                {item.isPersonal ? '👤 ' : ''}{item.targetName}
                              </span>
                              {item.isPersonal && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">
                                  Personnel
                                </span>
                              )}
                              {isInherited && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium flex items-center gap-0.5">
                                  <Info size={10} />
                                  Hérité
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs" style={{ 
                              background: item.category === 'maman_bebe' ? '#fce4ec' : 
                                         item.category === 'personal' ? '#e3f2fd' : '#e8f5e9',
                              color: item.category === 'maman_bebe' ? '#c62850' : 
                                     item.category === 'personal' ? '#1565c0' : '#2e7d32'
                            }}>
                              {getCategoryLabel(item.category)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isAssigned ? (
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <CheckCircle size={12} className="text-green-500" />
                                  <span className="font-semibold text-xs" style={{ color: colors.primary }}>
                                    {displayedAidant.name}
                                  </span>
                                  {aidants.find(a => a.user_id === displayedAidant.userId)?.available && (
                                    <span className="text-[8px] text-green-600">🟢 Dispo</span>
                                  )}
                                </div>
                                {isInherited && (
                                  <span className="text-[9px]" style={{ color: displayedAidant.sourceColor }}>
                                    {displayedAidant.sourceLabel}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">Non assigné</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ background: priorityColor }}></span>
                              <span className="text-xs" style={{ color: priorityColor }}>
                                {item.priority === 1 ? 'Patient direct' :
                                 item.priority === 2 ? 'Compte personnel' :
                                 item.priority === 3 ? 'Famille' : '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {isAssigned ? (
                              <span 
                                className="px-2 py-0.5 rounded-full text-[9px] font-medium"
                                style={{
                                  background: getAssignmentTypeColor(displayedAidant.type) + '20',
                                  color: getAssignmentTypeColor(displayedAidant.type),
                                }}
                              >
                                {getAssignmentTypeLabel(displayedAidant.type)}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1 flex-wrap">
                              <select
                                value={item.assignedAidantUserId || ''}
                                onChange={(e) => handleAssign(item, e.target.value, selectedType)}
                                disabled={isSaving}
                                className="px-2 py-1.5 rounded-lg border outline-none text-xs transition min-w-[100px]"
                                style={{ borderColor: colors.border, color: colors.text }}
                              >
                                <option value="">Sélectionner</option>
                                {aidants.map((aidant) => (
                                  <option key={aidant.id} value={aidant.user_id}>
                                    {aidant.user?.full_name} 
                                    {aidant.available ? ' 🟢' : ' 🔴'}
                                    {` (${aidant.current_assignments || 0}/${aidant.max_assignments || 4})`}
                                  </option>
                                ))}
                              </select>
                              {isDirect && item.assignedAidantUserId && (
                                <button
                                  onClick={() => handleRevoke(item)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 transition text-red-500"
                                  title="Retirer l'assignation"
                                >
                                  <XCircle size={14} />
                                </button>
                              )}
                              {isInherited && (
                                <button
                                  onClick={() => {
                                    // Créer une assignation directe pour remplacer l'héritage
                                    if (displayedAidant) {
                                      // Proposer de créer une assignation directe
                                      const confirmReplace = window.confirm(
                                        `Ce patient hérite actuellement de l'aidant du compte.\n\n` +
                                        `Voulez-vous créer une assignation directe avec ${displayedAidant.name} ?\n` +
                                        `(Cela remplacera l'héritage)`
                                      );
                                      if (confirmReplace) {
                                        handleAssign(item, displayedAidant.userId, displayedAidant.type);
                                      }
                                    }
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-blue-50 transition text-blue-500"
                                  title="Remplacer l'héritage par une assignation directe"
                                >
                                  <UserPlus size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AssignAidantPage;
