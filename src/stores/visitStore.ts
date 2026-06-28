// 📁 src/stores/visitStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Visit } from '@/types';
import { useAuthStore } from './authStore';
import toast from 'react-hot-toast';

interface VisitState {
  visits: Visit[];
  currentVisit: Visit | null;
  isLoading: boolean;
  error: string | null;
  
  // Méthodes existantes
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

  // ✅ NOUVELLES MÉTHODES
  approveVisit: (id: string) => Promise<void>;
  refuseVisit: (id: string, reason: string) => Promise<void>;
  reassignVisit: (id: string, newAidantId: string, assignmentType: string) => Promise<void>;
  getPendingVisits: () => Promise<Visit[]>;
  getVisitsNeedingReassign: () => Promise<Visit[]>;
  getVisitsByPatient: (patientId: string) => Promise<Visit[]>;
}

export const useVisitStore = create<VisitState>((set, get) => ({
  visits: [],
  currentVisit: null,
  isLoading: false,
  error: null,

  // =============================================
  // FETCH VISITES
  // =============================================
  fetchVisits: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) {
        set({ visits: [], isLoading: false });
        return;
      }

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

      // Récupérer les patients associés
      const patientIds = [...new Set(visits?.map(v => v.patient_id).filter(Boolean))];
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

      // Récupérer les aidants associés
      const aidantIds = [...new Set(visits?.map(v => v.aidant_id).filter(Boolean))];
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

      // Récupérer les coordinateurs associés
      const coordinatorIds = [...new Set(visits?.map(v => v.coordinator_id).filter(Boolean))];
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

      const visitsWithRelations = (visits || []).map((visit) => ({
        ...visit,
        patient: visit.patient_id ? patientMap[visit.patient_id] || null : null,
        aidant: visit.aidant_id ? aidantMap[visit.aidant_id] || null : null,
        coordinator: visit.coordinator_id ? coordinatorMap[visit.coordinator_id] || null : null,
      }));

      set({ visits: visitsWithRelations, isLoading: false });
    } catch (error: any) {
      console.error('❌ Fetch visits error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // =============================================
  // FETCH VISIT BY ID
  // =============================================
  fetchVisitById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: visit, error } = await supabase
        .from('visites')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

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
          .select('*')
          .eq('id', visit.aidant_id)
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
      console.error('❌ Fetch visit error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // =============================================
  // CREATE VISIT
  // =============================================
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
        status: data.status || 'planifiee',
        actions: data.actions || [],
        notes: data.notes || null,
        is_urgent: data.is_urgent || false,
        // ✅ Nouveaux champs
        visit_type: data.visit_type || 'ponctuelle',
        assignment_type: data.assignment_type || 'ponctuelle',
        recurrence_days: data.recurrence_days || null,
        recurrence_time: data.recurrence_time || null,
        intervalle_start: data.intervalle_start || null,
        intervalle_end: data.intervalle_end || null,
        is_recurring: data.is_recurring || false,
        requested_by: data.requested_by || user.id,
      };

      const { data: newVisit, error } = await supabase
        .from('visites')
        .insert(visitData)
        .select()
        .single();

      if (error) throw error;

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
      console.error('❌ Create visit error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // UPDATE VISIT
  // =============================================
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
      console.error('❌ Update visit error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // DELETE VISIT
  // =============================================
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
      console.error('❌ Delete visit error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // START VISIT
  // =============================================
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
      console.error('❌ Start visit error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // COMPLETE VISIT
  // =============================================
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
      console.error('❌ Complete visit error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // VALIDATE VISIT
  // =============================================
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
      console.error('❌ Validate visit error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // CANCEL VISIT
  // =============================================
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
      console.error('❌ Cancel visit error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // ✅ APPROUVER UNE VISITE (par l'aidant)
  // =============================================
  approveVisit: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      // Récupérer la visite pour avoir les infos du patient
      const { data: visit, error: fetchError } = await supabase
        .from('visites')
        .select(`
          *,
          patient:patients(*)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { data: updatedVisit, error } = await supabase
        .from('visites')
        .update({
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          status: 'validee',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Notification à la famille
      if (visit.patient?.created_by) {
        await supabase.from('notifications').insert({
          user_id: visit.patient.created_by,
          title: '✅ Visite acceptée',
          body: `L'aidant a accepté la visite du ${visit.scheduled_date} à ${visit.scheduled_time}.`,
          type: 'visite',
          data: { visit_id: id, status: 'validee' },
        });
      }

      set((state) => ({
        visits: state.visits.map(v => v.id === id ? { ...v, ...updatedVisit } : v),
        currentVisit: { ...state.currentVisit, ...updatedVisit },
        isLoading: false,
      }));

      toast.success('✅ Visite approuvée');
    } catch (error: any) {
      console.error('❌ Approve visit error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // ✅ REFUSER UNE VISITE (par l'aidant)
  // =============================================
  refuseVisit: async (id: string, reason: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      // Récupérer la visite pour avoir les infos
      const { data: visit, error: fetchError } = await supabase
        .from('visites')
        .select(`
          *,
          patient:patients(*),
          aidant:aidants(*, user:profiles(*))
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { data: updatedVisit, error } = await supabase
        .from('visites')
        .update({
          refused_by: user.id,
          refused_at: new Date().toISOString(),
          refusal_reason: reason,
          status: 'refusee',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Notification aux admins
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'coordinator']);

      if (admins) {
        for (const admin of admins) {
          await supabase.from('notifications').insert({
            user_id: admin.id,
            title: '❌ Visite refusée - Réassignation nécessaire',
            body: `L'aidant ${visit.aidant?.user?.full_name || 'Un aidant'} a refusé la visite de ${visit.patient?.first_name} ${visit.patient?.last_name} le ${visit.scheduled_date}. Motif: ${reason}`,
            type: 'alert',
            data: { visit_id: id, action: 'reassign' },
          });
        }
      }

      // Notification à la famille
      if (visit.patient?.created_by) {
        await supabase.from('notifications').insert({
          user_id: visit.patient.created_by,
          title: '❌ Visite refusée',
          body: `L'aidant a refusé la visite du ${visit.scheduled_date}. Motif: ${reason}`,
          type: 'visite',
          data: { visit_id: id, status: 'refusee' },
        });
      }

      set((state) => ({
        visits: state.visits.map(v => v.id === id ? { ...v, ...updatedVisit } : v),
        currentVisit: { ...state.currentVisit, ...updatedVisit },
        isLoading: false,
      }));

      toast.warning('❌ Visite refusée');
    } catch (error: any) {
      console.error('❌ Refuse visit error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // ✅ RÉASSIGNER UNE VISITE (par admin)
  // =============================================
  reassignVisit: async (id: string, newAidantId: string, assignmentType: string) => {
    try {
      set({ isLoading: true, error: null });

      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      // Récupérer la visite pour avoir les infos
      const { data: visit, error: fetchError } = await supabase
        .from('visites')
        .select(`
          *,
          patient:patients(*),
          aidant:aidants(*, user:profiles(*))
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { data: updatedVisit, error } = await supabase
        .from('visites')
        .update({
          aidant_id: newAidantId,
          status: 'planifiee',
          assignment_type: assignmentType,
          approved_at: null,
          refused_at: null,
          refusal_reason: null,
          assigned_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Notification au nouvel aidant
      if (newAidantId) {
        await supabase.from('notifications').insert({
          user_id: newAidantId,
          title: '📋 Nouvelle mission assignée',
          body: `Vous avez été assigné à la visite de ${visit.patient?.first_name} ${visit.patient?.last_name} le ${visit.scheduled_date} à ${visit.scheduled_time}.`,
          type: 'visite',
          data: { visit_id: id, action: 'approve' },
        });
      }

      // Notification à la famille
      if (visit.patient?.created_by) {
        await supabase.from('notifications').insert({
          user_id: visit.patient.created_by,
          title: '🔄 Nouvel aidant assigné',
          body: `Un nouvel aidant a été assigné pour la visite du ${visit.scheduled_date}.`,
          type: 'visite',
          data: { visit_id: id },
        });
      }

      // Notification à l'ancien aidant (si différent)
      if (visit.aidant_id && visit.aidant_id !== newAidantId) {
        await supabase.from('notifications').insert({
          user_id: visit.aidant_id,
          title: '🔄 Mission réassignée',
          body: `La visite de ${visit.patient?.first_name} ${visit.patient?.last_name} du ${visit.scheduled_date} vous a été retirée.`,
          type: 'visite',
          data: { visit_id: id },
        });
      }

      set((state) => ({
        visits: state.visits.map(v => v.id === id ? { ...v, ...updatedVisit } : v),
        currentVisit: { ...state.currentVisit, ...updatedVisit },
        isLoading: false,
      }));

      toast.success('✅ Visite réassignée avec succès');
    } catch (error: any) {
      console.error('❌ Reassign visit error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // ✅ RÉCUPÉRER LES VISITES EN ATTENTE D'APPROBATION
  // =============================================
  getPendingVisits: async () => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('visites')
        .select(`
          *,
          patient:patients(*),
          aidant:aidants(*, user:profiles(*))
        `)
        .eq('status', 'planifiee')
        .is('approved_at', null)
        .is('refused_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      set({ isLoading: false });
      return data || [];
    } catch (error: any) {
      console.error('❌ Get pending visits error:', error);
      set({ error: error.message, isLoading: false });
      return [];
    }
  },

  // =============================================
  // ✅ RÉCUPÉRER LES VISITES NÉCESSITANT UNE RÉASSIGNATION
  // =============================================
  getVisitsNeedingReassign: async () => {
    try {
      set({ isLoading: true, error: null });

      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data, error } = await supabase
        .from('visites')
        .select(`
          *,
          patient:patients(*),
          aidant:aidants(*, user:profiles(*))
        `)
        .or(`status.eq.refusee, and(status.eq.planifiee, created_at.lt.${twentyFourHoursAgo.toISOString()}, approved_at.is.null, refused_at.is.null)`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ isLoading: false });
      return data || [];
    } catch (error: any) {
      console.error('❌ Get visits needing reassign error:', error);
      set({ error: error.message, isLoading: false });
      return [];
    }
  },

  // =============================================
  // ✅ RÉCUPÉRER LES VISITES D'UN PATIENT
  // =============================================
  getVisitsByPatient: async (patientId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('visites')
        .select(`
          *,
          patient:patients(*),
          aidant:aidants(*, user:profiles(*))
        `)
        .eq('patient_id', patientId)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      set({ isLoading: false });
      return data || [];
    } catch (error: any) {
      console.error('❌ Get visits by patient error:', error);
      set({ error: error.message, isLoading: false });
      return [];
    }
  },

  // =============================================
  // CLEAR ERROR
  // =============================================
  clearError: () => set({ error: null }),
}));
