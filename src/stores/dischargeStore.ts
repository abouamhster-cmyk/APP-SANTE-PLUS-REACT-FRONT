// 📁 src/stores/dischargeStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { HospitalDischarge, DischargeStatus } from '@/types';
import { useAuthStore } from './authStore';
import toast from 'react-hot-toast';

interface DischargeState {
  discharges: HospitalDischarge[];
  currentDischarge: HospitalDischarge | null;
  isLoading: boolean;
  error: string | null;
  
  fetchDischarges: (patientId?: string) => Promise<void>;
  fetchDischargeById: (id: string) => Promise<void>;
  createDischarge: (data: Partial<HospitalDischarge>) => Promise<HospitalDischarge>;
  updateDischarge: (id: string, data: Partial<HospitalDischarge>) => Promise<void>;
  updateStatus: (id: string, status: DischargeStatus) => Promise<void>;
  assignAidant: (id: string, aidantId: string) => Promise<void>;
  completeDischarge: (id: string, data: { 
    installation_notes?: string; 
    satisfaction_rating?: number; 
    satisfaction_comment?: string;
    recommendations?: string[];
  }) => Promise<void>;
  cancelDischarge: (id: string, reason: string) => Promise<void>;
  clearError: () => void;
}

export const useDischargeStore = create<DischargeState>((set, get) => ({
  discharges: [],
  currentDischarge: null,
  isLoading: false,
  error: null,

  // =============================================
  // FETCH DISCHARGES
  // =============================================
  fetchDischarges: async (patientId?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) {
        set({ discharges: [], isLoading: false });
        return;
      }

      let query = supabase
        .from('hospital_discharges')
        .select(`
          *,
          patient:patients(*),
          family:profiles!family_id(*),
          coordinator:profiles!coordinator_id(*),
          aidant:aidants(*, user:profiles(*))
        `);

      // Si c'est une famille, filtrer par ses patients
      if (profile?.role === 'family') {
        const { data: links } = await supabase
          .from('patient_family_links')
          .select('patient_id')
          .eq('family_id', user.id);

        const patientIds = links?.map(l => l.patient_id) || [];
        if (patientIds.length > 0) {
          query = query.in('patient_id', patientIds);
        } else {
          set({ discharges: [], isLoading: false });
          return;
        }
      }

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ discharges: data || [], isLoading: false });
    } catch (error: any) {
      console.error('❌ Fetch discharges error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // =============================================
  // FETCH DISCHARGE BY ID
  // =============================================
  fetchDischargeById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await supabase
        .from('hospital_discharges')
        .select(`
          *,
          patient:patients(*),
          family:profiles!family_id(*),
          coordinator:profiles!coordinator_id(*),
          aidant:aidants(*, user:profiles(*))
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      set({ currentDischarge: data, isLoading: false });
    } catch (error: any) {
      console.error('❌ Fetch discharge error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // =============================================
  // CREATE DISCHARGE
  // =============================================
  createDischarge: async (data: Partial<HospitalDischarge>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Non connecté');

      const { data: discharge, error } = await supabase
        .from('hospital_discharges')
        .insert({
          ...data,
          family_id: user.id,
          status: 'pending',
        })
        .select(`
          *,
          patient:patients(*),
          family:profiles!family_id(*)
        `)
        .single();

      if (error) throw error;

      // ✅ Notification aux coordinateurs
      const { data: coordinators } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['coordinator', 'admin']);

      if (coordinators) {
        for (const coordinator of coordinators) {
          await supabase.from('notifications').insert({
            user_id: coordinator.id,
            title: '📋 Nouvelle demande de sortie',
            body: `Demande de sortie pour ${discharge.patient?.first_name} ${discharge.patient?.last_name}`,
            type: 'system',
            data: { discharge_id: discharge.id },
          });
        }
      }

      set((state) => ({
        discharges: [discharge, ...state.discharges],
        currentDischarge: discharge,
        isLoading: false,
      }));

      return discharge;
    } catch (error: any) {
      console.error('❌ Create discharge error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // UPDATE DISCHARGE
  // =============================================
  updateDischarge: async (id: string, data: Partial<HospitalDischarge>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: discharge, error } = await supabase
        .from('hospital_discharges')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          patient:patients(*),
          family:profiles!family_id(*),
          coordinator:profiles!coordinator_id(*),
          aidant:aidants(*, user:profiles(*))
        `)
        .single();

      if (error) throw error;

      set((state) => ({
        discharges: state.discharges.map(d => d.id === id ? discharge : d),
        currentDischarge: discharge,
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('❌ Update discharge error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // UPDATE STATUS
  // =============================================
  updateStatus: async (id: string, status: DischargeStatus) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: discharge, error } = await supabase
        .from('hospital_discharges')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          patient:patients(*),
          family:profiles!family_id(*),
          coordinator:profiles!coordinator_id(*),
          aidant:aidants(*, user:profiles(*))
        `)
        .single();

      if (error) throw error;

      set((state) => ({
        discharges: state.discharges.map(d => d.id === id ? discharge : d),
        currentDischarge: discharge,
        isLoading: false,
      }));

      // ✅ Notification à la famille
      if (discharge.family_id) {
        await supabase.from('notifications').insert({
          user_id: discharge.family_id,
          title: '🔄 Mise à jour sortie d\'hôpital',
          body: `Le statut de la sortie est maintenant : ${status}`,
          type: 'system',
          data: { discharge_id: id, status },
        });
      }
    } catch (error: any) {
      console.error('❌ Update status error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // ASSIGN AIDANT
  // =============================================
  assignAidant: async (id: string, aidantId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: discharge, error } = await supabase
        .from('hospital_discharges')
        .update({ 
          aidant_id: aidantId,
          status: 'planned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          patient:patients(*),
          family:profiles!family_id(*),
          coordinator:profiles!coordinator_id(*),
          aidant:aidants(*, user:profiles(*))
        `)
        .single();

      if (error) throw error;

      // ✅ Notification à l'aidant
      if (discharge.aidant?.user_id) {
        await supabase.from('notifications').insert({
          user_id: discharge.aidant.user_id,
          title: '📋 Nouvelle mission de sortie',
          body: `Vous avez été assigné à la sortie de ${discharge.patient?.first_name} ${discharge.patient?.last_name}`,
          type: 'system',
          data: { discharge_id: id },
        });
      }

      // ✅ Notification à la famille
      if (discharge.family_id) {
        await supabase.from('notifications').insert({
          user_id: discharge.family_id,
          title: '🔄 Aidant assigné',
          body: `Un aidant a été assigné pour la sortie de ${discharge.patient?.first_name} ${discharge.patient?.last_name}`,
          type: 'system',
          data: { discharge_id: id },
        });
      }

      set((state) => ({
        discharges: state.discharges.map(d => d.id === id ? discharge : d),
        currentDischarge: discharge,
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('❌ Assign aidant error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // COMPLETE DISCHARGE
  // =============================================
  completeDischarge: async (id: string, data: { 
    installation_notes?: string; 
    satisfaction_rating?: number; 
    satisfaction_comment?: string;
    recommendations?: string[];
  }) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: discharge, error } = await supabase
        .from('hospital_discharges')
        .update({
          ...data,
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          patient:patients(*),
          family:profiles!family_id(*),
          coordinator:profiles!coordinator_id(*),
          aidant:aidants(*, user:profiles(*))
        `)
        .single();

      if (error) throw error;

      set((state) => ({
        discharges: state.discharges.map(d => d.id === id ? discharge : d),
        currentDischarge: discharge,
        isLoading: false,
      }));

      // ✅ Notification à la famille
      if (discharge.family_id) {
        await supabase.from('notifications').insert({
          user_id: discharge.family_id,
          title: '✅ Sortie d\'hôpital terminée',
          body: `La sortie de ${discharge.patient?.first_name} ${discharge.patient?.last_name} est terminée.`,
          type: 'system',
          data: { discharge_id: id },
        });
      }

      // ✅ Notification aux coordinateurs
      const { data: coordinators } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['coordinator', 'admin']);

      if (coordinators) {
        for (const coordinator of coordinators) {
          await supabase.from('notifications').insert({
            user_id: coordinator.id,
            title: '✅ Sortie d\'hôpital terminée',
            body: `La sortie de ${discharge.patient?.first_name} ${discharge.patient?.last_name} est terminée.`,
            type: 'system',
            data: { discharge_id: id },
          });
        }
      }

      toast.success('✅ Sortie d\'hôpital terminée');
    } catch (error: any) {
      console.error('❌ Complete discharge error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // CANCEL DISCHARGE
  // =============================================
  cancelDischarge: async (id: string, reason: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: discharge, error } = await supabase
        .from('hospital_discharges')
        .update({
          status: 'cancelled',
          coordinator_notes: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          patient:patients(*),
          family:profiles!family_id(*)
        `)
        .single();

      if (error) throw error;

      set((state) => ({
        discharges: state.discharges.map(d => d.id === id ? discharge : d),
        currentDischarge: discharge,
        isLoading: false,
      }));

      // ✅ Notification à la famille
      if (discharge.family_id) {
        await supabase.from('notifications').insert({
          user_id: discharge.family_id,
          title: '❌ Sortie d\'hôpital annulée',
          body: `La sortie a été annulée. Motif: ${reason}`,
          type: 'system',
          data: { discharge_id: id },
        });
      }

      // ✅ Notification aux coordinateurs
      const { data: coordinators } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['coordinator', 'admin']);

      if (coordinators) {
        for (const coordinator of coordinators) {
          await supabase.from('notifications').insert({
            user_id: coordinator.id,
            title: '❌ Sortie d\'hôpital annulée',
            body: `La sortie de ${discharge.patient?.first_name} ${discharge.patient?.last_name} a été annulée.`,
            type: 'system',
            data: { discharge_id: id },
          });
        }
      }

      toast.warning('❌ Sortie d\'hôpital annulée');
    } catch (error: any) {
      console.error('❌ Cancel discharge error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
