// 📁 src/stores/patientStore.ts
 
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Patient } from '@/types';
import { useAuthStore } from './authStore';

interface PatientState {
  patients: Patient[];
  currentPatient: Patient | null;
  isLoading: boolean;
  error: string | null;
  
  fetchPatients: () => Promise<void>;
  fetchPatientById: (id: string) => Promise<void>;
  createPatient: (data: Partial<Patient>) => Promise<Patient>;
  updatePatient: (id: string, data: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  canManagePatients: () => boolean;
  clearError: () => void;
  syncAidantPatients: () => Promise<void>;
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: [],
  currentPatient: null,
  isLoading: false,
  error: null,

  canManagePatients: () => {
    const { profile } = useAuthStore.getState();
    return profile?.role === 'admin' || profile?.role === 'coordinator' || profile?.role === 'family';
  },

  fetchPatients: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) {
        set({ patients: [], isLoading: false });
        return;
      }

      let patientIds: string[] = [];

      if (profile?.role === 'family') {
        const { data: links } = await supabase
          .from('patient_family_links')
          .select('patient_id')
          .eq('family_id', user.id);

        patientIds = links?.map(l => l.patient_id) || [];
      } else if (profile?.role === 'aidant') {
        console.log('🔍 Récupération patients pour aidant:', user.id);
        
        const { data: aidant, error: aidantError } = await supabase
          .from('aidants')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (aidantError) {
          console.error('❌ Erreur récupération aidant:', aidantError);
          set({ patients: [], isLoading: false });
          return;
        }

        console.log('✅ Aidant trouvé:', aidant.id);

        const { data: assignments, error: assignError } = await supabase
          .from('patient_aidant_assignments')
          .select('patient_id')
          .eq('aidant_id', aidant.id)
          .eq('is_active', true);

        if (assignError) {
          console.error('❌ Erreur récupération assignations:', assignError);
        }

        console.log('📋 Assignations trouvées:', assignments?.length || 0);

        if (assignments && assignments.length > 0) {
          patientIds = assignments.map(a => a.patient_id).filter(Boolean);
        }

        if (patientIds.length === 0) {
          console.log('🔍 Aucune assignation, recherche via visites...');
          const { data: visits } = await supabase
            .from('visites')
            .select('patient_id')
            .eq('aidant_id', aidant.id)
            .not('patient_id', 'is', null);

          if (visits) {
            patientIds = [...new Set(visits.map(v => v.patient_id).filter(Boolean))];
          }
        }
      } else if (profile?.role === 'admin' || profile?.role === 'coordinator') {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        set({ patients: data || [], isLoading: false });
        return;
      }

      if (patientIds.length === 0) {
        set({ patients: [], isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .in('id', patientIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log(`✅ ${data?.length || 0} patients récupérés pour l'aidant`);
      set({ patients: data || [], isLoading: false });
    } catch (error: any) {
      console.error('❌ Erreur récupération des proches:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // ✅ syncAidantPatients - RETOURNE Promise<void>
  syncAidantPatients: async () => {
    try {
      const { user, profile } = useAuthStore.getState();
      if (!user || profile?.role !== 'aidant') {
        console.log('⚠️ Pas un aidant ou non connecté');
        set({ patients: [], isLoading: false });
        return;
      }

      console.log('🔄 Synchronisation des patients pour aidant:', user.id);

      const { data: aidant, error: aidantError } = await supabase
        .from('aidants')
        .select('id, user_id, is_verified, status')
        .eq('user_id', user.id)
        .single();

      if (aidantError) {
        console.error('❌ Erreur récupération aidant:', aidantError);
        set({ patients: [], isLoading: false });
        return;
      }

      console.log('✅ Aidant trouvé:', aidant.id);

      const { data: assignments, error: assignError } = await supabase
        .from('patient_aidant_assignments')
        .select('patient_id')
        .eq('aidant_id', aidant.id)
        .eq('is_active', true);

      if (assignError) {
        console.error('❌ Erreur récupération assignations:', assignError);
        set({ patients: [], isLoading: false });
        return;
      }

      console.log('📋 Assignations trouvées:', assignments?.length || 0);

      if (!assignments || assignments.length === 0) {
        console.log('ℹ️ Aucune assignation trouvée pour cet aidant');
        set({ patients: [], isLoading: false });
        return;
      }

      const patientIds = assignments.map(a => a.patient_id).filter(Boolean);

      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('*')
        .in('id', patientIds);

      if (patientsError) {
        console.error('❌ Erreur récupération patients:', patientsError);
        set({ patients: [], isLoading: false });
        return;
      }

      console.log(`✅ ${patients?.length || 0} patients synchronisés`);
      set({ patients: patients || [], isLoading: false });
      
      // ✅ NE PAS retourner de valeur
      return;
    } catch (error) {
      console.error('❌ Sync aidant patients error:', error);
      set({ patients: [], isLoading: false });
      return;
    }
  },

  fetchPatientById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) {
        set({ isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          set({ error: 'Patient non trouvé', isLoading: false });
          return;
        }
        throw error;
      }

      let hasAccess = false;

      if (profile?.role === 'admin' || profile?.role === 'coordinator') {
        hasAccess = true;
      } else if (profile?.role === 'family') {
        const { data: link } = await supabase
          .from('patient_family_links')
          .select('id')
          .eq('family_id', user.id)
          .eq('patient_id', id)
          .maybeSingle();
        hasAccess = !!link;
      } else if (profile?.role === 'aidant') {
        const { data: aidant } = await supabase
          .from('aidants')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (aidant) {
          const { data: assignment } = await supabase
            .from('patient_aidant_assignments')
            .select('id')
            .eq('aidant_id', aidant.id)
            .eq('patient_id', id)
            .eq('is_active', true)
            .maybeSingle();
          
          if (assignment) {
            hasAccess = true;
          } else {
            const { data: visit } = await supabase
              .from('visites')
              .select('id')
              .eq('aidant_id', aidant.id)
              .eq('patient_id', id)
              .limit(1)
              .maybeSingle();
            hasAccess = !!visit;
          }
        }
      }

      if (!hasAccess) {
        set({ error: 'Accès non autorisé à ce patient', isLoading: false });
        return;
      }

      set({ currentPatient: data, isLoading: false });
    } catch (error: any) {
      console.error('❌ Erreur récupération du proche:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  createPatient: async (data: Partial<Patient>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      if (profile?.role === 'aidant') {
        throw new Error('Les aidants ne peuvent pas créer de patients');
      }

      const { data: patient, error } = await supabase
        .from('patients')
        .insert({
          ...data,
          created_by: user.id,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('patient_family_links')
        .insert({
          patient_id: patient.id,
          family_id: user.id,
          is_primary: true,
        });

      if (data.category) {
        await supabase
          .from('profiles')
          .update({ patient_category: data.category })
          .eq('id', user.id);
      }

      set((state) => ({
        patients: [patient, ...state.patients],
        isLoading: false,
      }));

      return patient;
    } catch (error: any) {
      console.error('❌ Erreur création du proche:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updatePatient: async (id: string, data: Partial<Patient>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      if (profile?.role === 'aidant') {
        throw new Error('Les aidants ne peuvent pas modifier les patients');
      }

      let canEdit = false;

      if (profile?.role === 'admin' || profile?.role === 'coordinator') {
        canEdit = true;
      } else if (profile?.role === 'family') {
        const { data: link } = await supabase
          .from('patient_family_links')
          .select('id')
          .eq('family_id', user.id)
          .eq('patient_id', id)
          .maybeSingle();
        canEdit = !!link;
      }

      if (!canEdit) {
        throw new Error('Non autorisé à modifier ce patient');
      }

      const { data: patient, error } = await supabase
        .from('patients')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        patients: state.patients.map(p => p.id === id ? patient : p),
        currentPatient: patient,
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('❌ Erreur modification du proche:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deletePatient: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { profile } = useAuthStore.getState();

      if (profile?.role !== 'admin' && profile?.role !== 'coordinator') {
        throw new Error('Non autorisé à supprimer des patients');
      }

      await supabase
        .from('patient_family_links')
        .delete()
        .eq('patient_id', id);

      await supabase
        .from('patient_aidant_assignments')
        .delete()
        .eq('patient_id', id);

      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        patients: state.patients.filter(p => p.id !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('❌ Erreur suppression du proche:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
