// 📁 src/features/admin/pages/AssignAidantPage.tsx

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

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
}

const ASSIGNMENT_TYPES = [
  { value: 'primary', label: '📌 Permanente' },
  { value: 'temporary', label: '⏳ Temporaire' },
  { value: 'secondary', label: '⚡ Ponctuelle' },
];

const AssignAidantPage = () => {
  const { profile, role, user } = useAuthStore();

  const [aidants, setAidants] = useState<Aidant[]>([]);
  const [familyAccounts, setFamilyAccounts] = useState<FamilyAccount[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAidant, setSelectedAidant] = useState('');
  const [selectedType, setSelectedType] = useState('primary');

  const colors = getThemeColors(getThemeByRole(role, profile?.patient_category as any));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);

    const { data: aidantsData } = await supabase
      .from('aidants')
      .select('*')
      .eq('status', 'approved')
      .eq('is_verified', true);

    const userIds = (aidantsData || []).map(a => a.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    const map: any = {};
    profiles?.forEach(p => (map[p.id] = p));

    setAidants(
      (aidantsData || []).map(a => ({
        ...a,
        user: map[a.user_id] || null,
      }))
    );

    const { data: families } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'family');

    setFamilyAccounts(families || []);

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

    const { data: assignmentsData } = await supabase
      .from('aidant_assignments')
      .select('*')
      .eq('status', 'active');

    const mapAssign: any = {};
    assignmentsData?.forEach(a => {
      mapAssign[`${a.target_type}_${a.target_id}`] = a;
    });

    setAssignments(mapAssign);
    setIsLoading(false);
  };

  const assignmentItems = familyAccounts.flatMap(family => {
    const accountKey = `personal_account_${family.id}`;
    const accountAssignment = assignments[accountKey];

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
    };

    const familyPatients = patients.filter(p => p.family_id === family.id);

    const patientItems = familyPatients.map(p => {
      const key = `patient_${p.id}`;
      const a = assignments[key];

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
      };
    });

    return [accountItem, ...patientItems];
  });

  const handleAssign = async (item: AssignmentItem) => {
    if (!selectedAidant) return;

    await supabase.from('aidant_assignments').insert({
      aidant_user_id: selectedAidant,
      target_type: item.targetType,
      target_id: item.targetId,
      assignment_type: selectedType,
      status: 'active',
      created_by: user?.id,
    });

    fetchData();
    toast.success('Assigné');
  };

  const handleRevoke = async (item: AssignmentItem) => {
    const key = `${item.targetType}_${item.targetId}`;
    const a = assignments[key];
    if (!a) return;

    await supabase
      .from('aidant_assignments')
      .update({ status: 'inactive' })
      .eq('id', a.id);

    fetchData();
    toast.success('Retiré');
  };

  if (isLoading) return <div className="p-10 text-center">Chargement...</div>;

  const grouped = assignmentItems.reduce((acc: any, item) => {
    acc[item.familyId] = acc[item.familyId] || {
      name: item.familyName,
      items: [],
    };
    acc[item.familyId].items.push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div className="bg-white border rounded-xl p-4">
        <h1 className="text-lg font-semibold">Affectations</h1>
      </div>

      {/* ACTION */}
      <div className="bg-white border rounded-xl p-4 flex gap-2">
        <select
          value={selectedAidant}
          onChange={e => setSelectedAidant(e.target.value)}
          className="border px-3 py-2 rounded-md flex-1"
        >
          <option value="">Aidant</option>
          {aidants.map(a => (
            <option key={a.id} value={a.user_id}>
              {a.user?.full_name}
            </option>
          ))}
        </select>

        <select
          value={selectedType}
          onChange={e => setSelectedType(e.target.value)}
          className="border px-3 py-2 rounded-md"
        >
          {ASSIGNMENT_TYPES.map(t => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* LIST */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([id, group]: any) => (
          <div key={id} className="bg-white border rounded-xl">

            <div className="px-4 py-3 border-b bg-gray-50">
              <p className="font-medium">{group.name}</p>
            </div>

            <div className="divide-y">
              {group.items.map((item: AssignmentItem) => (
                <div key={item.id} className="px-4 py-3 flex justify-between items-center">

                  <div>
                    <p className="text-sm">{item.targetName}</p>
                    <p className="text-xs text-gray-400">
                      {item.type === 'patient' ? 'Patient' : 'Compte'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">

                    {item.assignedAidantUserId ? (
                      <button
                        onClick={() => handleRevoke(item)}
                        className="text-red-500 text-xs"
                      >
                        Retirer
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAssign(item)}
                        className="text-blue-500 text-xs"
                      >
                        Assigner
                      </button>
                    )}

                  </div>

                </div>
              ))}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};

export default AssignAidantPage;
