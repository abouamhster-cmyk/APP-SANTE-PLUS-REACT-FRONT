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

      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('*')
        .eq('status', 'active');

      if (patientsError) throw patientsError;
      setPatients(patientsData || []);

      const { data: links, error: linksError } = await supabase
        .from('patient_family_links')
        .select('patient_id, family_id');

      if (!linksError && links) {
        const newAssignments: Record<string, string> = {};
        for (const link of links) {
          const isAidant = aidantsWithUser.some((a: any) => a.user_id === link.family_id);
          if (isAidant) {
            newAssignments[link.patient_id] = link.family_id;
          }
        }
        setAssignments(newAssignments);
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
      const { data: existingLink } = await supabase
        .from('patient_family_links')
        .select('id')
        .eq('patient_id', patientId)
        .maybeSingle();

      if (existingLink) {
        const { error } = await supabase
          .from('patient_family_links')
          .update({ family_id: aidantUserId })
          .eq('patient_id', patientId);
        if (error) throw error;
      } else {
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

      setAssignments(prev => ({ ...prev, [patientId]: aidantUserId }));

      const patient = patients.find(p => p.id === patientId);
      if (aidantUserId && patient) {
        await supabase.from('notifications').insert({
          user_id: aidantUserId,
          title: '📋 Patient assigné',
          body: `Vous accompagnez à présent ${patient.first_name} ${patient.last_name}.`,
          type: 'system',
        });
      }
      toast.success(`✅ Mission assignée`);
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
      {/* Header */}
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
        <div className="bg-white rounded-3xl p-12 text-center text-gray-400">Aucun aidant approuvé et disponible</div>
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-gray-400">Aucun patient actif</div>
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
              <tbody className="divide-y animate-fadeIn" style={{ borderColor: colors.border }}>
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

