import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Patient } from '@/types';
import { useAuthStore } from './authStore';

// 📌 Ce store gère les proches (patients) 👨‍👩‍👦
// Les noms de variables restent "patient" pour la compatibilité avec Supabase

interface PatientState {
  patients: Patient[];          // 📌 Liste des proches
  currentPatient: Patient | null; // 📌 Proche actuellement sélectionné
  isLoading: boolean;
  error: string | null;
  
  fetchPatients: () => Promise<void>;      // 📌 Récupérer les proches
  fetchPatientById: (id: string) => Promise<void>; // 📌 Récupérer un proche
  createPatient: (data: Partial<Patient>) => Promise<Patient>; // 📌 Créer un proche
  updatePatient: (id: string, data: Partial<Patient>) => Promise<void>; // 📌 Modifier un proche
  deletePatient: (id: string) => Promise<void>; // 📌 Supprimer un proche
  clearError: () => void;
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: [],
  currentPatient: null,
  isLoading: false,
  error: null,

  // 📌 Récupérer tous les proches
  fetchPatients: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) {
        set({ patients: [], isLoading: false });
        return;
      }

      // Récupérer les proches liés à la famille
      const { data: links } = await supabase
        .from('patient_family_links')
        .select('patient_id')
        .eq('family_id', user.id);

      const patientIds = links?.map(l => l.patient_id) || [];

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
      set({ patients: data || [], isLoading: false });
    } catch (error: any) {
      console.error('❌ Erreur récupération des proches:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // 📌 Récupérer un proche par son ID
  fetchPatientById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      set({ currentPatient: data, isLoading: false });
    } catch (error: any) {
      console.error('❌ Erreur récupération du proche:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // 📌 Créer un nouveau proche
  createPatient: async (data: Partial<Patient>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

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

  // 📌 Modifier un proche
  updatePatient: async (id: string, data: Partial<Patient>) => {
    try {
      set({ isLoading: true, error: null });
      
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

  // 📌 Supprimer un proche
  deletePatient: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      await supabase
        .from('patient_family_links')
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