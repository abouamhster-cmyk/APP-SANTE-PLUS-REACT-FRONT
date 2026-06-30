// 📁 src/features/admin/pages/AssignAidantPage.tsx

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore';
import { Loader2, CheckCircle, Users, RefreshCw, XCircle, Clock, AlertCircle } from 'lucide-react';
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

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  address: string;
  category: string;
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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [assignments, setAssignments] = useState<Record<string, { aidantUserId: string; type: string }>>({});
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

      // ✅ 1. Récupérer les aidants approuvés avec leurs assignations
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

      // ✅ 2. Récupérer les patients actifs
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('*')
        .eq('status', 'active');

      if (patientsError) throw patientsError;
      setPatients(patientsData || []);

      // ✅ 3. Récupérer les assignations existantes depuis patient_family_links
      const { data: existingAssignments, error: assignError } = await supabase
        .from('patient_family_links')
        .select('patient_id, family_id, relationship')
        .eq('is_primary', true);

      if (assignError) {
        console.error('❌ Erreur récupération assignations:', assignError);
      }

      const newAssignments: Record<string, { aidantUserId: string; type: string }> = {};
      if (existingAssignments) {
        for (const assign of existingAssignments) {
          // Trouver l'aidant correspondant à family_id
          const aidant = aidantsWithUser.find((a: any) => a.user_id === assign.family_id);
          if (aidant) {
            newAssignments[assign.patient_id] = {
              aidantUserId: aidant.user_id,
              type: assign.relationship || 'permanente',
            };
          }
        }
      }

      setAssignments(newAssignments);
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FONCTION D'ASSIGNATION AVEC TYPE
  const handleAssign = async (patientId: string, aidantUserId: string, assignmentType: string = 'permanente') => {
    if (!aidantUserId) {
      toast('Veuillez sélectionner un aidant', { icon: 'ℹ️' });
      return;
    }

    setIsSaving(true);
    try {
      console.log('🔍 Assignation - Début');
      console.log('🔍 Patient ID:', patientId);
      console.log('🔍 Aidant User ID:', aidantUserId);
      console.log('🔍 Type:', assignmentType);

      // ✅ 1. Trouver l'aidant par user_id
      const aidant = aidants.find(a => a.user_id === aidantUserId);
      if (!aidant) {
        toast.error('Aidant non trouvé');
        setIsSaving(false);
        return;
      }

      console.log('✅ Aidant trouvé:', aidant.id);

      const patient = patients.find(p => p.id === patientId);
      if (!patient) {
        toast.error('Patient non trouvé');
        setIsSaving(false);
        return;
      }

      console.log('✅ Patient trouvé:', patient.id);

      // ✅ 2. Vérifier si le patient est déjà assigné à cet aidant
      const { data: existing, error: checkError } = await supabase
        .from('patient_family_links')
        .select('id')
        .eq('patient_id', patientId)
        .eq('family_id', aidant.user_id)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Erreur vérification existante:', checkError);
      }

      if (existing) {
        toast(`✅ ${patient.first_name} ${patient.last_name} est déjà assigné à ${aidant.user?.full_name}`, { icon: 'ℹ️' });
        setIsSaving(false);
        return;
      }
 
      
      // ✅ 3. Compter les assignations actuelles de l'aidant
      const { count: currentCount, error: countError } = await supabase
        .from('patient_family_links')
        .select('id', { count: 'exact', head: true })
        .eq('family_id', aidant.user_id);
      
      if (countError) {
        console.error('❌ Erreur comptage:', countError);
      }
      
      // ✅ CORRECTION : currentCount peut être null
      const currentAssignments = currentCount || 0;
      const maxAssignments = aidant.max_assignments || 4;
      
      if (currentAssignments >= maxAssignments) {
        toast.error(`Cet aidant a déjà ${currentAssignments} assignations (maximum ${maxAssignments})`);
        setIsSaving(false);
        return;
      }
      
      // ✅ 4. Créer l'assignation dans patient_family_links
      const { data: newAssignment, error: insertError } = await supabase
        .from('patient_family_links')
        .insert({
          patient_id: patientId,
          family_id: aidant.user_id,
          is_primary: true,
          relationship: assignmentType,
          can_manage_visits: true,
          can_manage_orders: true,
          can_receive_notifications: true,
        })
        .select();
      
      if (insertError) {
        console.error('❌ Erreur insertion:', insertError);
        toast.error(`Erreur: ${insertError.message}`);
        setIsSaving(false);
        return;
      }
      
      // ✅ 5. Mettre à jour current_assignments
      await supabase
        .from('aidants')
        .update({
          current_assignments: currentAssignments + 1,
          available: (currentAssignments + 1) < maxAssignments,
          updated_at: new Date().toISOString(),
        })
        .eq('id', aidant.id);


      

      // ✅ 6. Mettre à jour l'état local
      setAssignments(prev => ({
        ...prev,
        [patientId]: { aidantUserId, type: assignmentType }
      }));

      // ✅ 7. Notification à l'aidant
      await supabase.from('notifications').insert({
        user_id: aidantUserId,
        title: '📋 Patient assigné',
        body: `Vous accompagnez à présent ${patient.first_name} ${patient.last_name} (${assignmentType}).`,
        type: 'system',
        data: { patient_id: patientId, assignment_type: assignmentType },
      });

      // ✅ 8. Synchroniser les patients chez l'aidant
      await syncAidantPatients();

      toast.success(`✅ ${patient.first_name} ${patient.last_name} assigné avec succès à ${aidant.user?.full_name} (${assignmentType})`);
      
      // ✅ 9. Rafraîchir les données
      await fetchData();
    } catch (error) {
      console.error('❌ Erreur assignation:', error);
      toast.error('Erreur lors de l\'assignation');
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ ASSIGNATION MULTIPLE AVEC TYPE
  const handleAssignAll = async (aidantUserId: string, assignmentType: string = 'permanente') => {
    if (!aidantUserId) {
      toast.error('Veuillez sélectionner un aidant');
      return;
    }

    const unassignedPatients = patients.filter(p => !assignments[p.id]);
    if (unassignedPatients.length === 0) {
      toast('Tous les patients sont déjà assignés', { icon: 'ℹ️' });
      return;
    }

    if (!window.confirm(`Assigner ${unassignedPatients.length} patient(s) à cet aidant avec le type "${assignmentType}" ?`)) return;

    setIsSaving(true);
    try {
      let successCount = 0;
      for (const patient of unassignedPatients) {
        await handleAssign(patient.id, aidantUserId, assignmentType);
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      toast.success(`✅ ${successCount} patient(s) assignés avec succès`);
      await fetchData();
    } catch (error) {
      console.error('Erreur assignation multiple:', error);
      toast.error('Erreur lors de l\'assignation multiple');
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="animate-spin text-gray-300" size={24} />
      </div>
    );
  }

  const assignedCount = Object.keys(assignments).length;
  const unassignedCount = patients.length - assignedCount;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* HEADER */}
      <section 
        className="relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all"
        style={{ background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.primary}12 100%)` }}
      >
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: colors.text }}>
            👥 Affectations patients
          </h1>
          <p className="text-xs mt-0.5" style={{ color: colors.textLight }}>
            Assignez des aidants professionnels disponibles aux personnes prises en charge
          </p>
          <div className="flex flex-wrap gap-3 mt-3">
            <span className="text-xs px-3 py-1 rounded-full" style={{ background: colors.primary + '12', color: colors.primary }}>
              {patients.length} patients au total
            </span>
            <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700">
              {assignedCount} assignés
            </span>
            {unassignedCount > 0 && (
              <span className="text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">
                {unassignedCount} non assignés
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ASSIGNATION MULTIPLE AVEC TYPE */}
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
              onClick={() => handleAssignAll(selectedAidant, selectedType)}
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
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-gray-400">
          Aucun patient actif
        </div>
      ) : (
        <div className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-black/5">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50/75">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Patient</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Catégorie</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Aidant Assigné</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: colors.border }}>
                {patients.map((patient) => {
                  const assignment = assignments[patient.id];
                  const isAssigned = !!assignment;
                  const aidant = aidants.find(a => a.user_id === assignment?.aidantUserId);

                  return (
                    <tr key={patient.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3 font-bold text-gray-800">
                        {patient.first_name} {patient.last_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs" style={{ 
                          background: patient.category === 'maman_bebe' ? '#fce4ec' : '#e8f5e9',
                          color: patient.category === 'maman_bebe' ? '#c62850' : '#2e7d32'
                        }}>
                          {patient.category === 'maman_bebe' ? '👶 Maman' : '👴 Senior'}
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
                            onChange={(e) => handleAssign(patient.id, e.target.value, selectedType)}
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
                                if (window.confirm(`Retirer l'assignation de ${patient.first_name} ${patient.last_name} ?`)) {
                                  await supabase
                                    .from('patient_family_links')
                                    .delete()
                                    .eq('patient_id', patient.id)
                                    .eq('family_id', aidant?.user_id);
                                  
                                  setAssignments(prev => {
                                    const newState = { ...prev };
                                    delete newState[patient.id];
                                    return newState;
                                  });
                                  
                                  await fetchData();
                                  toast.success('Assignation retirée');
                                }
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
