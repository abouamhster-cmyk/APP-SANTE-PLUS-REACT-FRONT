// 📁 src/features/admin/pages/AssignAidantPage.tsx

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore';
import { Loader2, CheckCircle, Users, RefreshCw, XCircle, Clock, AlertCircle, UserCircle } from 'lucide-react';
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

// ✅ TYPE CORRIGÉ : patient_name = string | undefined
interface PersonalAccount {
  id: string;
  full_name: string;
  email: string;
  category: 'personal' | 'senior' | 'maman_bebe';
  hasPatient: boolean;
  patient_id?: string | null;
  patient_name?: string;  // ✅ string | undefined
}

// ✅ TYPES D'ASSIGNATION
const ASSIGNMENT_TYPES = [
  { value: 'permanente', label: '📌 Permanente', color: '#10B981' },
  { value: 'temporaire', label: '⏳ Temporaire', color: '#F59E0B' },
  { value: 'ponctuelle', label: '⚡ Ponctuelle', color: '#3B82F6' },
];

const AssignAidantPage = () => {
  const { profile, role, user } = useAuthStore();
  const { syncAidantPatients } = usePatientStore();
  const [aidants, setAidants] = useState<Aidant[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [personalAccounts, setPersonalAccounts] = useState<PersonalAccount[]>([]);
  const [allItems, setAllItems] = useState<(any | PersonalAccount)[]>([]);
  const [assignments, setAssignments] = useState<Record<string, { aidantUserId: string; type: string; targetType: 'patient' | 'personal' }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAidant, setSelectedAidant] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('permanente');

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // ✅ 1. Récupérer les aidants
      const { data: aidantsData, error: aidantsError } = await supabase
        .from('aidants')
        .select('*')
        .eq('status', 'approved')
        .eq('is_verified', true);

      if (aidantsError) throw aidantsError;

      const userIds = (aidantsData || []).map((a: any) => a.user_id).filter(Boolean);
      let profilesMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (!profilesError && profiles) {
          profilesMap = profiles.reduce((acc: Record<string, any>, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
      }

      const aidantsWithUser = (aidantsData || []).map((aidant: any) => ({
        ...aidant,
        user: aidant.user_id ? profilesMap[aidant.user_id] || null : null,
      }));

      setAidants(aidantsWithUser);

      // ✅ 2. Récupérer les patients (proches)
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('*')
        .eq('status', 'active');

      if (patientsError) throw patientsError;
      setPatients(patientsData || []);

      // ✅ 3. Récupérer les comptes personnels (familles sans patient)
      const { data: families, error: familiesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, patient_category')
        .eq('role', 'family');

      if (familiesError) throw familiesError;

      const { data: links, error: linksError } = await supabase
        .from('patient_family_links')
        .select('family_id, patient_id');

      if (linksError) throw linksError;

      const familiesWithPatients = new Set(links?.map(l => l.family_id) || []);

      // patient_name: undefined au lieu de null
      const personalAccountsData: PersonalAccount[] = (families || [])
        .filter((f: any) => !familiesWithPatients.has(f.id))
        .map((f: any) => ({
          id: f.id,
          full_name: f.full_name || 'Compte personnel',
          email: f.email || '',
          category: f.patient_category === 'maman_bebe' ? 'maman_bebe' : 'personal',
          hasPatient: false,
          patient_id: null,
          patient_name: undefined, 
        }));

      setPersonalAccounts(personalAccountsData);

      // ✅ 4. Récupérer les assignations existantes
      const { data: existingAssignments, error: assignError } = await supabase
        .from('patient_family_links')
        .select('patient_id, family_id, relationship')
        .eq('is_primary', true);

      if (assignError) {
        console.error('❌ Erreur récupération assignations:', assignError);
      }

      const newAssignments: Record<string, { aidantUserId: string; type: string; targetType: 'patient' | 'personal' }> = {};
      
      if (existingAssignments) {
        for (const assign of existingAssignments) {
          const aidant = aidantsWithUser.find((a: any) => a.user_id === assign.family_id);
          if (aidant && assign.patient_id) {
            newAssignments[`patient_${assign.patient_id}`] = {
              aidantUserId: aidant.user_id,
              type: assign.relationship || 'permanente',
              targetType: 'patient',
            };
          }
        }
      }

      const { data: personalAssignments, error: personalAssignError } = await supabase
        .from('patient_family_links')
        .select('family_id, relationship')
        .is('patient_id', null)
        .eq('is_primary', true);

      if (!personalAssignError && personalAssignments) {
        for (const assign of personalAssignments) {
          const aidant = aidantsWithUser.find((a: any) => a.user_id === assign.family_id);
          if (aidant) {
            const account = personalAccountsData.find((p: any) => p.id === assign.family_id);
            if (account) {
              newAssignments[`personal_${account.id}`] = {
                aidantUserId: aidant.user_id,
                type: assign.relationship || 'permanente',
                targetType: 'personal',
              };
            }
          }
        }
      }

      setAssignments(newAssignments);

      // ✅ 5. Construire la liste complète
      const allItemsList = [
        ...(patientsData || []).map((p: any) => ({
          ...p,
          _type: 'patient',
          _id: `patient_${p.id}`,
          _displayName: `${p.first_name} ${p.last_name}`,
          _category: p.category || 'senior',
          _hasPatient: true,
        })),
        ...personalAccountsData.map((p: any) => ({
          ...p,
          _type: 'personal',
          _id: `personal_${p.id}`,
          _displayName: `${p.full_name} (👤 Personnel)`,
          _category: p.category || 'personal',
          _hasPatient: false,
          first_name: p.full_name,
          last_name: '',
        })),
      ];

      setAllItems(allItemsList);

    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Fonction d'assignation pour patient OU compte personnel
  const handleAssign = async (item: any, aidantUserId: string, assignmentType: string = 'permanente') => {
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

      const isPersonal = item._type === 'personal';
      const targetId = isPersonal ? item.id : item.id;
      const targetName = isPersonal ? item.full_name : `${item.first_name} ${item.last_name}`;
      const assignmentKey = isPersonal ? `personal_${targetId}` : `patient_${targetId}`;

      // ✅ Vérifier si déjà assigné
      const existing = assignments[assignmentKey];
      if (existing) {
        toast(`✅ ${targetName} est déjà assigné à ${aidant.user?.full_name}`, { icon: 'ℹ️' });
        setIsSaving(false);
        return;
      }

      // ✅ Compter les assignations actuelles
      const { count: currentCount, error: countError } = await supabase
        .from('patient_family_links')
        .select('id', { count: 'exact', head: true })
        .eq('family_id', aidant.user_id);

      if (countError) {
        console.error('❌ Erreur comptage:', countError);
      }

      const currentAssignments = currentCount || 0;
      const maxAssignments = aidant.max_assignments || 4;

      if (currentAssignments >= maxAssignments) {
        toast.error(`Cet aidant a déjà ${currentAssignments} assignations (maximum ${maxAssignments})`);
        setIsSaving(false);
        return;
      }

      // ✅ Créer l'assignation
      const insertData: any = {
        family_id: aidant.user_id,
        is_primary: true,
        relationship: assignmentType,
        can_manage_visits: true,
        can_manage_orders: true,
        can_receive_notifications: true,
      };

      // Pour un patient, ajouter patient_id
      if (!isPersonal) {
        insertData.patient_id = targetId;
      }
      // Pour un compte personnel, patient_id = null

      const { data: newAssignment, error: insertError } = await supabase
        .from('patient_family_links')
        .insert(insertData)
        .select();

      if (insertError) {
        console.error('❌ Erreur insertion:', insertError);
        toast.error(`Erreur: ${insertError.message}`);
        setIsSaving(false);
        return;
      }

      // ✅ Mettre à jour current_assignments
      await supabase
        .from('aidants')
        .update({
          current_assignments: currentAssignments + 1,
          available: (currentAssignments + 1) < maxAssignments,
          updated_at: new Date().toISOString(),
        })
        .eq('id', aidant.id);

      // ✅ Mettre à jour l'état local
      setAssignments(prev => ({
        ...prev,
        [assignmentKey]: { aidantUserId, type: assignmentType, targetType: isPersonal ? 'personal' : 'patient' }
      }));

      // ✅ Notification à l'aidant
      await supabase.from('notifications').insert({
        user_id: aidantUserId,
        title: isPersonal ? '📋 Compte personnel assigné' : '📋 Patient assigné',
        body: isPersonal
          ? `Vous accompagnez à présent ${targetName} (compte personnel, ${assignmentType})`
          : `Vous accompagnez à présent ${targetName} (${assignmentType})`,
        type: 'system',
        data: { 
          target_id: targetId,
          target_type: isPersonal ? 'personal' : 'patient',
          assignment_type: assignmentType 
        },
      });

      // ✅ Notification au propriétaire du compte
      await supabase.from('notifications').insert({
        user_id: isPersonal ? targetId : item.created_by || targetId,
        title: '✅ Aidant assigné',
        body: `Un aidant a été assigné à ${isPersonal ? 'votre compte personnel' : targetName}`,
        type: 'system',
        data: { aidant_id: aidant.id },
      });

      toast.success(`✅ ${targetName} assigné avec succès à ${aidant.user?.full_name} (${assignmentType})`);

      // ✅ Rafraîchir
      await fetchData();
    } catch (error) {
      console.error('❌ Erreur assignation:', error);
      toast.error('Erreur lors de l\'assignation');
    } finally {
      setIsSaving(false);
    }
  };

  const getAidantName = (userId: string) => {
    const aidant = aidants.find(a => a.user_id === userId);
    return aidant?.user?.full_name || 'Non assigné';
  };

  const getAssignmentTypeLabel = (type: string) => {
    const found = ASSIGNMENT_TYPES.find(t => t.value === type);
    return found?.label || type;
  };

  const getAssignmentTypeColor = (type: string) => {
    const found = ASSIGNMENT_TYPES.find(t => t.value === type);
    return found?.color || '#9CA3AF';
  };

  const getCategoryLabel = (category: string) => {
    if (category === 'maman_bebe') return '👶 Maman & Bébé';
    if (category === 'senior') return '👴 Senior';
    if (category === 'personal') return '👤 Personnel';
    return 'Non spécifié';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="animate-spin text-gray-300" size={24} />
      </div>
    );
  }

  const assignedCount = Object.keys(assignments).length;
  const unassignedCount = allItems.length - assignedCount;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
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
            Assignez des aidants professionnels aux patients ou aux comptes personnels
          </p>
          <div className="flex flex-wrap gap-3 mt-3">
            <span className="text-xs px-3 py-1 rounded-full" style={{ background: colors.primary + '12', color: colors.primary }}>
              {allItems.length} bénéficiaires au total
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
              {personalAccounts.length} comptes personnels
            </span>
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
                const unassignedItems = allItems.filter(item => !assignments[item._id]);
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

      {/* TABLEAU DES ASSIGNATIONS */}
      {aidants.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-gray-400">
          Aucun aidant approuvé et disponible
        </div>
      ) : allItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-gray-400">
          Aucun patient ou compte personnel
        </div>
      ) : (
        <div className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-black/5">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50/75">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Bénéficiaire</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Aidant Assigné</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: colors.border }}>
                {allItems.map((item) => {
                  const assignment = assignments[item._id];
                  const isAssigned = !!assignment;
                  const aidant = aidants.find(a => a.user_id === assignment?.aidantUserId);
                  const isPersonal = item._type === 'personal';

                  return (
                    <tr key={item._id} className="hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">
                            {item._displayName || item.full_name || `${item.first_name} ${item.last_name}`}
                          </span>
                          {isPersonal && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">
                              Personnel
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs" style={{ 
                          background: item._category === 'maman_bebe' ? '#fce4ec' : 
                                     item._category === 'personal' ? '#e3f2fd' : '#e8f5e9',
                          color: item._category === 'maman_bebe' ? '#c62850' : 
                                 item._category === 'personal' ? '#1565c0' : '#2e7d32'
                        }}>
                          {getCategoryLabel(item._category)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isAssigned ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle size={12} className="text-green-500" />
                            <span className="font-semibold text-xs" style={{ color: colors.primary }}>
                              {aidant?.user?.full_name || getAidantName(assignment.aidantUserId)}
                            </span>
                            {aidant?.available && (
                              <span className="text-[8px] text-green-600">🟢 Dispo</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Non assigné</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isAssigned ? (
                          <span 
                            className="px-2 py-0.5 rounded-full text-[9px] font-medium"
                            style={{
                              background: getAssignmentTypeColor(assignment.type) + '20',
                              color: getAssignmentTypeColor(assignment.type),
                            }}
                          >
                            {getAssignmentTypeLabel(assignment.type)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <select
                            value={assignment?.aidantUserId || ''}
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
                          {isAssigned && (
                            <button
                              onClick={async () => {
                                const name = item._displayName || item.full_name || 'bénéficiaire';
                                if (!window.confirm(`Retirer l'assignation de ${name} ?`)) return;
                                
                                // Supprimer l'assignation
                                const query = assignment.targetType === 'personal'
                                  ? supabase
                                      .from('patient_family_links')
                                      .delete()
                                      .eq('family_id', aidant?.user_id)
                                      .is('patient_id', null)
                                  : supabase
                                      .from('patient_family_links')
                                      .delete()
                                      .eq('patient_id', isPersonal ? null : item.id)
                                      .eq('family_id', aidant?.user_id);

                                await query;
                                
                                setAssignments(prev => {
                                  const newState = { ...prev };
                                  delete newState[item._id];
                                  return newState;
                                });
                                
                                await fetchData();
                                toast.success('Assignation retirée');
                              }}
                              className="p-1.5 rounded-lg hover:bg-red-50 transition text-red-500"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignAidantPage;
