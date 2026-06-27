// 📁 src/stores/dischargeStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { HospitalDischarge, DischargeStatus } from '@/types';
import { useAuthStore } from './authStore';

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

  fetchDischarges: async (patientId?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) {
        set({ discharges: [], isLoading: false });
        return;
      }

      // ✅ ÉTAPE 1 : Récupérer les sorties
      let query = supabase.from('hospital_discharges').select('*');

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

      const { data: discharges, error } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;

      // ✅ ÉTAPE 2 : Récupérer les patients SEPAREMENT
      const patientIds = [...new Set(discharges?.map(d => d.patient_id).filter(Boolean))];
      let patientMap: Record<string, any> = {};

      if (patientIds.length > 0) {
        const { data: patients } = await supabase
          .from('patients')
          .select('*')
          .in('id', patientIds);
        if (patients) {
          patientMap = patients.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // ✅ ÉTAPE 3 : Récupérer les familles SEPAREMENT
      const familyIds = [...new Set(discharges?.map(d => d.family_id).filter(Boolean))];
      let familyMap: Record<string, any> = {};

      if (familyIds.length > 0) {
        const { data: families } = await supabase
          .from('profiles')
          .select('*')
          .in('id', familyIds);
        if (families) {
          familyMap = families.reduce((acc, f) => {
            acc[f.id] = f;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // ✅ ÉTAPE 4 : Récupérer les coordinateurs SEPAREMENT
      const coordinatorIds = [...new Set(discharges?.map(d => d.coordinator_id).filter(Boolean))];
      let coordinatorMap: Record<string, any> = {};

      if (coordinatorIds.length > 0) {
        const { data: coordinators } = await supabase
          .from('profiles')
          .select('*')
          .in('id', coordinatorIds);
        if (coordinators) {
          coordinatorMap = coordinators.reduce((acc, c) => {
            acc[c.id] = c;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // ✅ ÉTAPE 5 : Récupérer les aidants SEPAREMENT
      const aidantIds = [...new Set(discharges?.map(d => d.aidant_id).filter(Boolean))];
      let aidantMap: Record<string, any> = {};

      if (aidantIds.length > 0) {
        const { data: aidants } = await supabase
          .from('aidants')
          .select('*')
          .in('id', aidantIds);
        
        if (aidants) {
          const userIds = aidants.map(a => a.user_id).filter(Boolean);
          let profileMap: Record<string, any> = {};

          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('*')
              .in('id', userIds);
            if (profiles) {
              profileMap = profiles.reduce((acc, p) => {
                acc[p.id] = p;
                return acc;
              }, {} as Record<string, any>);
            }
          }

          aidantMap = aidants.reduce((acc, a) => {
            acc[a.id] = {
              ...a,
              user: a.user_id ? profileMap[a.user_id] || null : null,
            };
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // ✅ ÉTAPE 6 : Fusionner toutes les données
      const dischargesWithRelations = (discharges || []).map((discharge) => ({
        ...discharge,
        patient: discharge.patient_id ? patientMap[discharge.patient_id] || null : null,
        family: discharge.family_id ? familyMap[discharge.family_id] || null : null,
        coordinator: discharge.coordinator_id ? coordinatorMap[discharge.coordinator_id] || null : null,
        aidant: discharge.aidant_id ? aidantMap[discharge.aidant_id] || null : null,
      }));

      set({ discharges: dischargesWithRelations, isLoading: false });
    } catch (error: any) {
      console.error('❌ Fetch discharges error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  fetchDischargeById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: discharge, error } = await supabase
        .from('hospital_discharges')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      let patient = null;
      if (discharge.patient_id) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('*')
          .eq('id', discharge.patient_id)
          .single();
        patient = patientData;
      }

      let family = null;
      if (discharge.family_id) {
        const { data: familyData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', discharge.family_id)
          .single();
        family = familyData;
      }

      let coordinator = null;
      if (discharge.coordinator_id) {
        const { data: coordData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', discharge.coordinator_id)
          .single();
        coordinator = coordData;
      }

      let aidant = null;
      if (discharge.aidant_id) {
        const { data: aidantData } = await supabase
          .from('aidants')
          .select('*')
          .eq('id', discharge.aidant_id)
          .single();
        if (aidantData) {
          const { data: userData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', aidantData.user_id)
            .single();
          aidant = {
            ...aidantData,
            user: userData || null,
          };
        }
      }

      const fullDischarge = {
        ...discharge,
        patient,
        family,
        coordinator,
        aidant,
      };

      set({ currentDischarge: fullDischarge, isLoading: false });
    } catch (error: any) {
      console.error('❌ Fetch discharge error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

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
        .select()
        .single();

      if (error) throw error;

      let patient = null;
      if (discharge.patient_id) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('*')
          .eq('id', discharge.patient_id)
          .single();
        patient = patientData;
      }

      let family = null;
      if (discharge.family_id) {
        const { data: familyData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', discharge.family_id)
          .single();
        family = familyData;
      }

      const fullDischarge = {
        ...discharge,
        patient,
        family,
      };

      set((state) => ({
        discharges: [fullDischarge, ...state.discharges],
        currentDischarge: fullDischarge,
        isLoading: false,
      }));

      return fullDischarge;
    } catch (error: any) {
      console.error('❌ Create discharge error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

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
        .select()
        .single();

      if (error) throw error;

      // Récupérer les relations séparément
      let patient = null;
      if (discharge.patient_id) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('*')
          .eq('id', discharge.patient_id)
          .single();
        patient = patientData;
      }

      let family = null;
      if (discharge.family_id) {
        const { data: familyData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', discharge.family_id)
          .single();
        family = familyData;
      }

      let coordinator = null;
      if (discharge.coordinator_id) {
        const { data: coordData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', discharge.coordinator_id)
          .single();
        coordinator = coordData;
      }

      let aidant = null;
      if (discharge.aidant_id) {
        const { data: aidantData } = await supabase
          .from('aidants')
          .select('*')
          .eq('id', discharge.aidant_id)
          .single();
        if (aidantData) {
          const { data: userData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', aidantData.user_id)
            .single();
          aidant = {
            ...aidantData,
            user: userData || null,
          };
        }
      }

      const fullDischarge = {
        ...discharge,
        patient,
        family,
        coordinator,
        aidant,
      };

      set((state) => ({
        discharges: state.discharges.map(d => d.id === id ? fullDischarge : d),
        currentDischarge: fullDischarge,
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('❌ Update discharge error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

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
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        discharges: state.discharges.map(d => d.id === id ? { ...d, status } : d),
        currentDischarge: { ...state.currentDischarge, status },
        isLoading: false,
      }));

      await supabase.from('notifications').insert({
        user_id: discharge.family_id,
        title: '🔄 Mise à jour sortie d\'hôpital',
        body: `Le statut de la sortie est maintenant : ${status}`,
        type: 'system',
        data: { discharge_id: id, status },
      });
    } catch (error: any) {
      console.error('❌ Update status error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

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
        .select()
        .single();

      if (error) throw error;

      // Récupérer les relations
      let patient = null;
      if (discharge.patient_id) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('*')
          .eq('id', discharge.patient_id)
          .single();
        patient = patientData;
      }

      let aidant = null;
      if (discharge.aidant_id) {
        const { data: aidantData } = await supabase
          .from('aidants')
          .select('*')
          .eq('id', discharge.aidant_id)
          .single();
        if (aidantData) {
          const { data: userData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', aidantData.user_id)
            .single();
          aidant = {
            ...aidantData,
            user: userData || null,
          };
        }
      }

      const fullDischarge = {
        ...discharge,
        patient,
        aidant,
      };

      if (aidant?.user_id) {
        await supabase.from('notifications').insert({
          user_id: aidant.user_id,
          title: '📋 Nouvelle mission de sortie',
          body: `Vous avez été assigné à la sortie de ${patient?.first_name} ${patient?.last_name}`,
          type: 'system',
          data: { discharge_id: id },
        });
      }

      set((state) => ({
        discharges: state.discharges.map(d => d.id === id ? fullDischarge : d),
        currentDischarge: fullDischarge,
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('❌ Assign aidant error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

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
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        discharges: state.discharges.map(d => d.id === id ? { ...d, ...discharge } : d),
        currentDischarge: { ...state.currentDischarge, ...discharge },
        isLoading: false,
      }));

      await supabase.from('notifications').insert({
        user_id: discharge.family_id,
        title: '✅ Sortie d\'hôpital terminée',
        body: `La sortie de ${discharge.patient?.first_name} ${discharge.patient?.last_name} est terminée.`,
        type: 'system',
        data: { discharge_id: id },
      });
    } catch (error: any) {
      console.error('❌ Complete discharge error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

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
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        discharges: state.discharges.map(d => d.id === id ? { ...d, ...discharge } : d),
        currentDischarge: { ...state.currentDischarge, ...discharge },
        isLoading: false,
      }));

      await supabase.from('notifications').insert({
        user_id: discharge.family_id,
        title: '❌ Sortie d\'hôpital annulée',
        body: `La sortie a été annulée. Motif: ${reason}`,
        type: 'system',
        data: { discharge_id: id },
      });
    } catch (error: any) {
      console.error('❌ Cancel discharge error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
