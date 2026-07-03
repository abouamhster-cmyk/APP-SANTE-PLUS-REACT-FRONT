// 📁 src/features/admin/pages/AssignAidantPage.tsx

import React, { useEffect, useState } from 'react';   
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { Loader2, CheckCircle, Users, XCircle, UserPlus, Info } from 'lucide-react';
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

      const { data: families } = await supabase
        .from('profiles')
        .select('id, full_name, email, patient_category')
        .eq('role', 'family');
      setFamilyAccounts(families || []);

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

  const buildAssignmentItems = (): AssignmentItem[] => {
    const items: AssignmentItem[] = [];

    familyAccounts.forEach((family) => {
      const accountKey = `personal_account_${family.id}`;
      const accountAssignment = assignments[accountKey];
      
      items.push({
        id: `account_${family.id}`,
        type: 'account',
        familyId: family.id,
        familyName: family.full_name,
        targetId: family.id,
        targetName: `${family.full_name} (Personnel)`,
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

      const familyPatients = patients.filter(p => p.family_id === family.id);
      familyPatients.forEach((patient) => {
        const patientKey = `patient_${patient.id}`;
        const patientAssignment = assignments[patientKey];
        
        let source: 'direct' | 'account' | 'family' | 'none' = 'none';
        if (patientAssignment) {
          source = 'direct';
        } else if (accountAssignment) {
          source = 'account';
        } else {
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
    if (category === 'maman_bebe') return 'Maman & Bébé';
    if (category === 'senior') return 'Senior';
    if (category === 'personal') return 'Personnel';
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

  const getDisplayedAidant = (item: AssignmentItem) => {
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

      let priority = 2;
      if (item.type === 'patient') priority = 1;
      if (item.type === 'account') priority = 2;

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

      toast.success(`Assignation de ${item.targetName} retirée`);
    } catch (error) {
      console.error('❌ Erreur révocation:', error);
      toast.error('Erreur lors de la révocation');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px] w-full">
        <Loader2 className="animate-spin text-gray-300" size={24} />
      </div>
    );
  }

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
    <div className="space-y-5 max-w-6xl mx-auto pb-12 px-4 sm:px-6">
      
      {/* ============================================================
      HEADER COMPACT
      ============================================================ */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
        <div>
          <h1 className="text-xl font-black text-gray-800" style={{ color: colors.text }}>
            👥 Affectation des aidants
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Assignez des aidants professionnels aux comptes personnels et aux proches suivis.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl bg-gray-100 text-gray-600">
            {assignmentItems.length} Bénéficiaires
          </span>
          <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl bg-green-50 text-green-700 border border-green-100">
            {assignedCount} Assignés
          </span>
          {unassignedCount > 0 && (
            <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 animate-pulse">
              {unassignedCount} Non assignés
            </span>
          )}
        </div>
      </section>

      {/* ============================================================
      OUTIL D'ASSIGNATION RAPIDE ET GROUPÉE
      ============================================================ */}
      {unassignedCount > 0 && (
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
          <div className="flex flex-col sm:flex-row gap-2.5 items-center w-full min-w-0">
            <div className="flex-1 w-full min-w-0">
              <select
                value={selectedAidant}
                onChange={(e) => setSelectedAidant(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border outline-none bg-gray-50/50 transition focus:bg-white"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                <option value="">Sélectionner un aidant d'office...</option>
                {aidants.map((aidant) => (
                  <option key={aidant.id} value={aidant.user_id}>
                    {aidant.user?.full_name} {aidant.available ? '🟢' : '🔴'} - 
                    {aidant.specialties?.slice(0, 2).join(', ')}
                    {` (${aidant.current_assignments || 0}/${aidant.max_assignments || 4})`}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex-1 w-full min-w-0">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border outline-none bg-gray-50/50 transition focus:bg-white"
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
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-white font-bold text-xs transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
              style={{ background: colors.primary }}
            >
              <Users size={14} />
              Assigner tout ({unassignedCount})
            </button>
          </div>
        </section>
      )}

      {/* ============================================================
      TABLEAU DE SYNTHÈSE DES AFFECTATIONS
      ============================================================ */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-black/5 w-full min-w-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[700px]">
            <thead className="bg-gray-50/60 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3.5 font-bold text-gray-400 uppercase tracking-wider">Compte / Bénéficiaire</th>
                <th className="px-4 py-3.5 font-bold text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3.5 font-bold text-gray-400 uppercase tracking-wider">Aidant Assigné</th>
                <th className="px-4 py-3.5 font-bold text-gray-400 uppercase tracking-wider">Hiérarchie</th>
                <th className="px-4 py-3.5 font-bold text-gray-400 uppercase tracking-wider">Type de contrat</th>
                <th className="px-4 py-3.5 font-bold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-50">
              {Object.entries(groupedItems).map(([familyId, group]) => {
                const familyKey = `family_${familyId}`;
                const familyAssignment = assignments[familyKey];
                const hasFamilyAidant = !!familyAssignment;

                return (
                  <React.Fragment key={familyId}>
                    {/* En-tête de groupe de famille */}
                    <tr className="bg-gray-50/20 font-bold border-t border-gray-100/50">
                      <td colSpan={6} className="px-4 py-2.5 text-gray-700">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">👨‍👩‍👦 Groupe : <strong>{group[0]?.label || 'Compte'}</strong></span>
                          {hasFamilyAidant && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] bg-purple-50 text-purple-700 font-bold border border-purple-100">
                              Aidant groupé actif
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Liste des bénéficiaires du groupe */}
                    {group.map((beneficiary) => {
                      const isOwnAccount = beneficiary.type === 'personal';
                      const assignedAidant = getAssignedAidant(beneficiary, Object.values(assignments));
                      const isPinned = !!assignedAidant;

                      return (
                        <tr key={beneficiary.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-800">
                            {beneficiary.first_name ? `${beneficiary.first_name} ${beneficiary.last_name}` : beneficiary.full_name}
                          </td>
                          
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-500">
                              {isOwnAccount ? 'Compte principal' : getCategoryLabel(beneficiary.category)}
                            </span>
                          </td>
                          
                          <td className="px-4 py-3 font-semibold">
                            {assignedAidant ? (
                              <div className="flex items-center gap-1.5 text-gray-800">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                {assignedAidant.user?.full_name || 'Utilisateur'}
                              </div>
                            ) : (
                              <span className="text-gray-400 font-medium">Non assigné</span>
                            )}
                          </td>
                          
                          <td className="px-4 py-3 font-semibold">
                            <span 
                              className="text-[10px] font-bold" 
                              style={{ color: isPinned ? colors.primary : '#9ca3af' }}
                            >
                              {isPinned ? '📌 Haute priorité' : '—'}
                            </span>
                          </td>
                          
                          <td className="px-4 py-3 font-medium text-gray-500">
                            {isPinned ? 'Contrat d\'accompagnement' : '—'}
                          </td>
                          
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {/* Sélecteur d'aidant pour ligne */}
                              <select
                                value={assignedAidant?.user_id || ''}
                                onChange={(e) => handleAssign(beneficiary, e.target.value, selectedType)}
                                disabled={isSaving}
                                className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border outline-none bg-gray-50 hover:bg-white transition cursor-pointer"
                                style={{ borderColor: colors.border, color: colors.text }}
                              >
                                <option value="">Assigner...</option>
                                {aidants.map((aidant) => (
                                  <option key={aidant.id} value={aidant.user_id}>
                                    {aidant.user?.full_name}
                                    {` (${aidant.current_assignments || 0}/${aidant.max_assignments || 4})`}
                                  </option>
                                ))}
                              </select>

                              {isPinned && (
                                <button
                                  onClick={() => handleRevoke(beneficiary)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition shrink-0"
                                  title="Révoquer l'assignation de l'aidant"
                                >
                                  <XCircle size={14} />
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

// =============================================
// FONCTIONS UTILITAIRES DE MAPPAGE INTERNE
// =============================================
const getAssignedAidant = (item: AssignmentItem, assignments: any[]) => {
  if (!assignments || assignments.length === 0) return null;

  // Si c'est un proche patient
  if (item.type === 'patient') {
    const match = assignments.find(
      (a) => a.target_type === 'patient' && a.target_id === item.targetId && a.status === 'active'
    );
    return match ? match : null;
  }

  // Si c'est un compte personnel principal
  const match = assignments.find(
    (a) => a.target_type === 'personal_account' && a.target_id === item.targetId && a.status === 'active'
  );
  return match ? match : null;
};

export default AssignAidantPage;
