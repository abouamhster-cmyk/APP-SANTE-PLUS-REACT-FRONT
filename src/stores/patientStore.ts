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
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: [],
  currentPatient: null,
  isLoading: false,
  error: null,

  // ✅ Vérifier si l'utilisateur peut gérer les patients
  canManagePatients: () => {
    const { profile } = useAuthStore.getState();
    return profile?.role === 'admin' || profile?.role === 'coordinator' || profile?.role === 'family';
  },

  // ✅ Récupérer les patients - FILTRÉ PAR RÔLE
  fetchPatients: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) {
        set({ patients: [], isLoading: false });
        return;
      }

      let patientIds: string[] = [];

      // 👨‍👩‍👦 FAMILLE → Ses patients via patient_family_links
      if (profile?.role === 'family') {
        const { data: links } = await supabase
          .from('patient_family_links')
          .select('patient_id')
          .eq('family_id', user.id);

        patientIds = links?.map(l => l.patient_id) || [];
      }
      
      // 🦸 AIDANT → Patients assignés via les visites
      else if (profile?.role === 'aidant') {
        const { data: aidant, error: aidantError } = await supabase
          .from('aidants')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!aidantError && aidant) {
          const { data: visits } = await supabase
            .from('visites')
            .select('patient_id')
            .eq('aidant_id', aidant.id)
            .not('patient_id', 'is', null);

          if (visits) {
            patientIds = [...new Set(visits.map(v => v.patient_id).filter(Boolean))];
          }
        }
      }
      
      // 👔 ADMIN / COORDINATEUR → Tous les patients
      else if (profile?.role === 'admin' || profile?.role === 'coordinator') {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        set({ patients: data || [], isLoading: false });
        return;
      }

      // Si aucun patient trouvé
      if (patientIds.length === 0) {
        set({ patients: [], isLoading: false });
        return;
      }

      // Récupérer les patients
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .in('id', patientIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ patients: data || [], isLoading: false });
    } catch (error: any) {
      console.error('❌ Erreur récupération des proches:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // ✅ Récupérer un patient par ID - AVEC VÉRIFICATION PERMISSIONS
  fetchPatientById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) {
        set({ isLoading: false });
        return;
      }

      // Récupérer le patient
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

      // Vérifier les permissions
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

  // ✅ Créer un patient - SEULS ADMIN/COORDINATEUR/FAMILLE
  createPatient: async (data: Partial<Patient>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      // ❌ Les aidants ne peuvent pas créer de patients
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

      // Créer le lien famille-patient
      await supabase
        .from('patient_family_links')
        .insert({
          patient_id: patient.id,
          family_id: user.id,
          is_primary: true,
        });

      // Mettre à jour la catégorie du profil
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

  // ✅ Modifier un patient - SEULS ADMIN/COORDINATEUR OU FAMILLE PROPRIÉTAIRE
  updatePatient: async (id: string, data: Partial<Patient>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      // ❌ Les aidants ne peuvent pas modifier les patients
      if (profile?.role === 'aidant') {
        throw new Error('Les aidants ne peuvent pas modifier les patients');
      }

      // Vérifier les permissions
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

  // ✅ Supprimer un patient - SEULS ADMIN/COORDINATEUR
  deletePatient: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { profile } = useAuthStore.getState();

      // ❌ Seuls admin/coord peuvent supprimer
      if (profile?.role !== 'admin' && profile?.role !== 'coordinator') {
        throw new Error('Non autorisé à supprimer des patients');
      }

      // Supprimer les liens familiaux
      await supabase
        .from('patient_family_links')
        .delete()
        .eq('patient_id', id);

      // Supprimer le patient
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
