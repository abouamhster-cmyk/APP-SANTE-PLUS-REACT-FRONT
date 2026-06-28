// 📁 src/features/admin/pages/AssignAidantPage.tsx
 
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';
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
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  address: string;
  category: string;
}

// ✅ Interface pour les assignations existantes
interface ExistingAssignment {
  patient_id: string;
  aidant_id: string;
}

const AssignAidantPage = () => {
  const { profile, role, user } = useAuthStore();
  const [aidants, setAidants] = useState<Aidant[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // ✅ 1. Récupérer les aidants approuvés
      const { data: aidantsData, error: aidantsError } = await supabase
        .from('aidants')
        .select('*')
        .eq('status', 'approved')
        .eq('is_verified', true);

      if (aidantsError) throw aidantsError;

      // Récupérer les profils des aidants
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

      // ✅ 3. Récupérer les assignations existantes via patient_aidant_assignments
      const { data: existingAssignments, error: assignError } = await supabase
        .from('patient_aidant_assignments')
        .select('patient_id, aidant_id')
        .eq('is_active', true);

      if (assignError) {
        console.error('❌ Erreur récupération assignations:', assignError);
      }

      const newAssignments: Record<string, string> = {};
      if (existingAssignments) {
        for (const assign of existingAssignments) {
          // Convertir aidant_id en user_id pour l'affichage
          const aidant = aidantsWithUser.find((a: any) => a.id === assign.aidant_id);
          if (aidant) {
            newAssignments[assign.patient_id] = aidant.user_id;
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

  const handleAssign = async (patientId: string, aidantUserId: string) => {
    setIsSaving(true);
    try {
      // ✅ 1. Trouver l'aidant par user_id
      const aidant = aidants.find(a => a.user_id === aidantUserId);
      if (!aidant) {
        toast.error('Aidant non trouvé');
        setIsSaving(false);
        return;
      }

      // ✅ 2. Vérifier si une assignation existe déjà
      const { data: existing } = await supabase
        .from('patient_aidant_assignments')
        .select('id')
        .eq('patient_id', patientId)
        .eq('aidant_id', aidant.id)
        .eq('is_active', true)
        .maybeSingle();

      if (existing) {
        toast.info('Cet aidant est déjà assigné à ce patient');
        setIsSaving(false);
        return;
      }

      // ✅ 3. Désactiver les anciennes assignations pour ce patient
      await supabase
        .from('patient_aidant_assignments')
        .update({ is_active: false })
        .eq('patient_id', patientId);

      // ✅ 4. Créer la nouvelle assignation
      const { error } = await supabase
        .from('patient_aidant_assignments')
        .insert({
          patient_id: patientId,
          aidant_id: aidant.id,
          assigned_by: user?.id,
          assignment_type: 'permanente',
          is_active: true,
        });

      if (error) throw error;

      // ✅ 5. Mettre à jour l'état local
      setAssignments(prev => ({ ...prev, [patientId]: aidantUserId }));

      // ✅ 6. Notification à l'aidant
      const patient = patients.find(p => p.id === patientId);
      if (aidantUserId && patient) {
        await supabase.from('notifications').insert({
          user_id: aidantUserId,
          title: '📋 Patient assigné',
          body: `Vous accompagnez à présent ${patient.first_name} ${patient.last_name}.`,
          type: 'system',
          data: { patient_id: patientId },
        });
      }

      toast.success(`✅ ${patient?.first_name} assigné avec succès`);
      
      // ✅ 7. Rafraîchir les données
      await fetchData();
    } catch (error) {
      console.error('Erreur assignation:', error);
      toast.error('Erreur lors de l\'assignation');
    } finally {
      setIsSaving(false);
    }
  };

  const getAidantName = (userId: string) => {
    const aidant = aidants.find(a => a.user_id === userId);
    return aidant?.user?.full_name || 'Non assigné';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="animate-spin text-gray-300" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
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
        </div>
      </section>

      {aidants.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-gray-400">
          Aucun aidant approuvé et disponible
        </div>
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-gray-400">
          Aucun patient actif
        </div>
      ) : (
        <div className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50/75">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Patient</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Adresse</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Aidant Assigné</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Modifier l'affectation</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: colors.border }}>
                {patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3 font-bold text-gray-800">{patient.first_name} {patient.last_name}</td>
                    <td className="px-4 py-3 text-gray-500">{patient.address}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-xs" style={{ color: assignments[patient.id] ? '#10b981' : '#94a3b8' }}>
                        {assignments[patient.id] ? getAidantName(assignments[patient.id]) : 'Aucun aidant'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={assignments[patient.id] || ''}
                        onChange={(e) => handleAssign(patient.id, e.target.value)}
                        disabled={isSaving}
                        className="px-2 py-1.5 rounded-lg border outline-none text-xs transition"
                        style={{ borderColor: colors.border, color: colors.text }}
                      >
                        <option value="">Sélectionner</option>
                        {aidants.map((aidant) => (
                          <option key={aidant.id} value={aidant.user_id}>
                            {aidant.user?.full_name} {aidant.available ? '🟢' : '🔴'}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignAidantPage;
