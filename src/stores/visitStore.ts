import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Visit } from '@/types';
import { useAuthStore } from './authStore';

interface VisitState {
  visits: Visit[];
  currentVisit: Visit | null;
  isLoading: boolean;
  error: string | null;
  
  fetchVisits: () => Promise<void>;
  fetchVisitById: (id: string) => Promise<void>;
  createVisit: (data: Partial<Visit>) => Promise<Visit>;
  updateVisit: (id: string, data: Partial<Visit>) => Promise<void>;
  deleteVisit: (id: string) => Promise<void>;
  startVisit: (id: string) => Promise<void>;
  completeVisit: (id: string, data: { actions: string[]; notes: string; photos?: string[] }) => Promise<void>;
  validateVisit: (id: string) => Promise<void>;
  cancelVisit: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useVisitStore = create<VisitState>((set, get) => ({
  visits: [],
  currentVisit: null,
  isLoading: false,
  error: null,

  fetchVisits: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) {
        set({ visits: [], isLoading: false });
        return;
      }

      // ✅ SIMPLIFICATION : Récupérer d'abord les visites
      let query = supabase.from('visites').select('*');

      if (profile?.role === 'family') {
        const { data: links } = await supabase
          .from('patient_family_links')
          .select('patient_id')
          .eq('family_id', user.id);

        const patientIds = links?.map(l => l.patient_id) || [];
        if (patientIds.length > 0) {
          query = query.in('patient_id', patientIds);
        } else {
          set({ visits: [], isLoading: false });
          return;
        }
      } else if (profile?.role === 'aidant') {
        const { data: aidant } = await supabase
          .from('aidants')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (aidant) {
          query = query.eq('aidant_id', aidant.id);
        } else {
          set({ visits: [], isLoading: false });
          return;
        }
      }

      const { data: visits, error } = await query.order('scheduled_date', { ascending: true });

      if (error) throw error;

      // ✅ Récupérer les données associées séparément
      const visitsWithRelations = await Promise.all(
        (visits || []).map(async (visit) => {
          let patient = null;
          if (visit.patient_id) {
            const { data: patientData } = await supabase
              .from('patients')
              .select('*')
              .eq('id', visit.patient_id)
              .single();
            patient = patientData;
          }

          let aidant = null;
          if (visit.aidant_id) {
            const { data: aidantData } = await supabase
              .from('aidants')
              .select('*, user:profiles(*)')
              .eq('id', visit.aidant_id)
              .single();
            aidant = aidantData;
          }

          let coordinator = null;
          if (visit.coordinator_id) {
            const { data: coordData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', visit.coordinator_id)
              .single();
            coordinator = coordData;
          }

          return {
            ...visit,
            patient,
            aidant,
            coordinator,
          };
        })
      );

      set({ visits: visitsWithRelations || [], isLoading: false });
    } catch (error: any) {
      console.error('Fetch visits error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  fetchVisitById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: visit, error } = await supabase
        .from('visites')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Récupérer les relations
      let patient = null;
      if (visit.patient_id) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('*')
          .eq('id', visit.patient_id)
          .single();
        patient = patientData;
      }

      let aidant = null;
      if (visit.aidant_id) {
        const { data: aidantData } = await supabase
          .from('aidants')
          .select('*, user:profiles(*)')
          .eq('id', visit.aidant_id)
          .single();
        aidant = aidantData;
      }

      let coordinator = null;
      if (visit.coordinator_id) {
        const { data: coordData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', visit.coordinator_id)
          .single();
        coordinator = coordData;
      }

      const fullVisit = {
        ...visit,
        patient,
        aidant,
        coordinator,
      };

      set({ currentVisit: fullVisit, isLoading: false });
    } catch (error: any) {
      console.error('Fetch visit error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  createVisit: async (data: Partial<Visit>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const visitData = {
        patient_id: data.patient_id,
        aidant_id: data.aidant_id || null,
        coordinator_id: user.id,
        scheduled_date: data.scheduled_date,
        scheduled_time: data.scheduled_time,
        duration_minutes: data.duration_minutes || 60,
        status: 'planifiee',
        actions: data.actions || [],
        notes: data.notes || null,
        is_urgent: data.is_urgent || false,
      };

      const { data: newVisit, error } = await supabase
        .from('visites')
        .insert(visitData)
        .select()
        .single();

      if (error) throw error;

      // Récupérer les relations
      let patient = null;
      if (newVisit.patient_id) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('*')
          .eq('id', newVisit.patient_id)
          .single();
        patient = patientData;
      }

      const fullVisit = {
        ...newVisit,
        patient,
      };

      set((state) => ({
        visits: [fullVisit, ...state.visits],
        isLoading: false,
      }));

      return fullVisit;
    } catch (error: any) {
      console.error('Create visit error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateVisit: async (id: string, data: Partial<Visit>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: visit, error } = await supabase
        .from('visites')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        visits: state.visits.map(v => v.id === id ? { ...v, ...visit } : v),
        currentVisit: { ...state.currentVisit, ...visit },
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Update visit error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteVisit: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { error } = await supabase
        .from('visites')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        visits: state.visits.filter(v => v.id !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Delete visit error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  startVisit: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const now = new Date().toISOString();
      const { data: visit, error } = await supabase
        .from('visites')
        .update({
          status: 'en_cours',
          start_time: now,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        visits: state.visits.map(v => v.id === id ? { ...v, ...visit } : v),
        currentVisit: { ...state.currentVisit, ...visit },
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Start visit error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  completeVisit: async (id: string, data: { actions: string[]; notes: string; photos?: string[] }) => {
    try {
      set({ isLoading: true, error: null });
      
      const now = new Date().toISOString();
      const updateData = {
        status: 'terminee',
        end_time: now,
        actions: data.actions || [],
        notes: data.notes || null,
        report: data.notes || null,
      };

      const { data: visit, error } = await supabase
        .from('visites')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        visits: state.visits.map(v => v.id === id ? { ...v, ...visit } : v),
        currentVisit: { ...state.currentVisit, ...visit },
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Complete visit error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  validateVisit: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: visit, error } = await supabase
        .from('visites')
        .update({ status: 'validee' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        visits: state.visits.map(v => v.id === id ? { ...v, ...visit } : v),
        currentVisit: { ...state.currentVisit, ...visit },
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Validate visit error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  cancelVisit: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: visit, error } = await supabase
        .from('visites')
        .update({ status: 'annulee' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        visits: state.visits.map(v => v.id === id ? { ...v, ...visit } : v),
        currentVisit: { ...state.currentVisit, ...visit },
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Cancel visit error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));