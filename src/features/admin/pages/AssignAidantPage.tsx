// 📁 src/features/admin/pages/AssignAidantPage.tsx
 
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
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
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  address: string;
  category: string;
}

const AssignAidantPage = () => {
  const { profile, role } = useAuthStore();
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

      // ✅ ÉTAPE 1 : Récupérer les aidants approuvés
      const { data: aidantsData, error: aidantsError } = await supabase
        .from('aidants')
        .select('*')
        .eq('status', 'approved')
        .eq('is_verified', true);

      if (aidantsError) throw aidantsError;

      // ✅ ÉTAPE 2 : Récupérer les profils des aidants séparément
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

      // ✅ ÉTAPE 3 : Fusionner les données
      const aidantsWithUser = (aidantsData || []).map((aidant: any) => ({
        ...aidant,
        user: aidant.user_id ? profilesMap[aidant.user_id] || null : null,
      }));

      setAidants(aidantsWithUser);

      // ✅ ÉTAPE 4 : Récupérer les patients actifs
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('*')
        .eq('status', 'active');

      if (patientsError) throw patientsError;
      setPatients(patientsData || []);

      // ✅ ÉTAPE 5 : Récupérer les assignations existantes
      const { data: links, error: linksError } = await supabase
        .from('patient_family_links')
        .select('patient_id, family_id');

      if (!linksError && links) {
        const assignments: Record<string, string> = {};
        for (const link of links) {
          const isAidant = aidantsWithUser.some((a: any) => a.user_id === link.family_id);
          if (isAidant) {
            assignments[link.patient_id] = link.family_id;
          }
        }
        setAssignments(assignments);
      }

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
      // ✅ Vérifier si un lien existe déjà
      const { data: existingLink } = await supabase
        .from('patient_family_links')
        .select('id')
        .eq('patient_id', patientId)
        .maybeSingle();

      if (existingLink) {
        // Mettre à jour le lien existant
        const { error } = await supabase
          .from('patient_family_links')
          .update({ family_id: aidantUserId })
          .eq('patient_id', patientId);

        if (error) throw error;
      } else {
        // Créer un nouveau lien
        const { error } = await supabase
          .from('patient_family_links')
          .insert({
            patient_id: patientId,
            family_id: aidantUserId,
            is_primary: true,
            can_manage_visits: true,
            can_manage_orders: true,
            can_receive_notifications: true,
          });

        if (error) throw error;
      }

      // Mettre à jour l'état local
      setAssignments(prev => ({ ...prev, [patientId]: aidantUserId }));

      // ✅ Notification à l'aidant
      const aidant = aidants.find(a => a.user_id === aidantUserId);
      const patient = patients.find(p => p.id === patientId);

      await supabase.from('notifications').insert({
        user_id: aidantUserId,
        title: '📋 Nouveau patient assigné',
        body: `Vous avez été assigné à ${patient?.first_name} ${patient?.last_name}. Vous pouvez maintenant voir ses missions.`,
        type: 'system',
      });

      toast.success(`✅ Aidant assigné à ${patient?.first_name} ${patient?.last_name}`);

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
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent" style={{ borderColor: colors.primary }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <h1 className="text-2xl font-black" style={{ color: colors.text }}>
          👥 Assigner les aidants aux patients
        </h1>
        <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
          {aidants.length} aidant(s) disponibles • {patients.length} patient(s)
        </p>
      </section>

      {aidants.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-black/5">
          <p className="text-lg font-medium" style={{ color: colors.text }}>Aucun aidant approuvé</p>
          <p className="text-sm text-gray-500 mt-1">Les aidants doivent être approuvés avant de pouvoir être assignés</p>
        </div>
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-black/5">
          <p className="text-lg font-medium" style={{ color: colors.text }}>Aucun patient actif</p>
          <p className="text-sm text-gray-500 mt-1">Ajoutez des patients avant de pouvoir les assigner</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-black/5">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: colors.primary + '04' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.text + '60' }}>
                    Patient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.text + '60' }}>
                    Adresse
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.text + '60' }}>
                    Aidant assigné
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.text + '60' }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: colors.border }}>
                {patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: colors.text }}>
                        {patient.first_name} {patient.last_name}
                      </p>
                      <p className="text-xs text-gray-500">{patient.category}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">{patient.address}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium" style={{ color: assignments[patient.id] ? '#4CAF50' : '#9E9E9E' }}>
                        {assignments[patient.id] ? getAidantName(assignments[patient.id]) : 'Non assigné'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={assignments[patient.id] || ''}
                        onChange={(e) => handleAssign(patient.id, e.target.value)}
                        disabled={isSaving}
                        className="px-3 py-2 rounded-xl border outline-none text-sm"
                        style={{
                          borderColor: colors.border,
                          color: colors.text,
                        }}
                      >
                        <option value="">Aucun aidant</option>
                        {aidants.map((aidant) => (
                          <option key={aidant.id} value={aidant.user_id}>
                            {aidant.user?.full_name || 'Inconnu'} {aidant.available ? '🟢' : '🔴'}
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
