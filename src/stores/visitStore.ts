// 📁 src/stores/visitStore.ts
// ✅ VERSION CORRIGÉE - NOUVEAUX STATUTS ET MÉTHODES

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Visit, VisitStatus } from '@/types';
import { useAuthStore } from './authStore';
import toast from 'react-hot-toast';

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
  
  // ✅ NOUVEAUX STATUTS
  confirmPayment: (id: string, transactionId: string) => Promise<void>;
  approveVisit: (id: string) => Promise<void>;
  refuseVisit: (id: string, reason: string) => Promise<void>;
  reassignVisit: (id: string, newAidantId: string, assignmentType: string) => Promise<void>;
  startVisit: (id: string) => Promise<void>;
  completeVisit: (id: string, data: { actions: string[]; notes: string; photos?: string[] }) => Promise<void>;
  validateVisit: (id: string) => Promise<void>;
  cancelVisit: (id: string) => Promise<void>;
  
  getPendingVisits: () => Promise<Visit[]>;
  getVisitsNeedingReassign: () => Promise<Visit[]>;
  getVisitsByPatient: (patientId: string) => Promise<Visit[]>;
  canManageVisits: () => boolean;
  clearError: () => void;
}

export const useVisitStore = create<VisitState>((set, get) => ({
  visits: [],
  currentVisit: null,
  isLoading: false,
  error: null,

  // ✅ Vérifier si l'utilisateur peut gérer les visites
  canManageVisits: () => {
    const { profile } = useAuthStore.getState();
    return profile?.role === 'admin' || profile?.role === 'coordinator';
  },

  // =============================================
  // FETCH VISITES - FILTRÉ PAR RÔLE
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

      // Récupérer les relations
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

      const visitsWithRelations = (visits || []).map((visit) => ({
        ...visit,
        patient: visit.patient_id ? patientMap[visit.patient_id] || null : null,
        aidant: visit.aidant_id ? aidantMap[visit.aidant_id] || null : null,
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

      if (error) {
        if (error.code === 'PGRST116') {
          set({ error: 'Visite non trouvée', isLoading: false });
          return;
        }
        throw error;
      }

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

      const fullVisit = {
        ...visit,
        patient,
        aidant,
      };

      set({ currentVisit: fullVisit, isLoading: false });
    } catch (error: any) {
      console.error('❌ Fetch visit error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // =============================================
  // CREATE VISIT - AVEC VÉRIFICATION PERMISSIONS
  // =============================================
  createVisit: async (data: Partial<Visit>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      // ❌ Les aidants ne peuvent pas créer de visites
      if (profile?.role === 'aidant') {
        throw new Error('Les aidants ne peuvent pas créer de visites');
      }

      // Déterminer le statut initial
      const isPonctual = data.is_ponctual || false;
      let status: VisitStatus = 'planifiee';

      if (isPonctual) {
        status = 'attente_paiement';
      }

      // Vérifier le quota si abonnement
      if (!isPonctual && data.patient_id) {
        const { data: subscription } = await supabase
          .from('abonnements')
          .select('id, remaining_visits, status')
          .eq('patient_id', data.patient_id)
          .eq('status', 'actif')
          .maybeSingle();

        if (subscription && subscription.remaining_visits <= 0) {
          status = 'attente_paiement';
        }
      }

      const visitData = {
        patient_id: data.patient_id,
        aidant_id: data.aidant_id || null,
        coordinator_id: profile?.role === 'family' ? null : user.id,
        scheduled_date: data.scheduled_date,
        scheduled_time: data.scheduled_time,
        duration_minutes: data.duration_minutes || 60,
        status: status,
        actions: data.actions || [],
        notes: data.notes || null,
        is_urgent: data.is_urgent || false,
        visit_type: data.visit_type || 'ponctuelle',
        assignment_type: data.assignment_type || 'ponctuelle',
        requested_by: user.id,
        metadata: {
          created_by: user.id,
          created_at: new Date().toISOString(),
          is_ponctual: isPonctual,
          requires_payment: status === 'attente_paiement',
        }
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

      // ✅ Notification à l'aidant si assigné et pas en attente de paiement
      if (data.aidant_id && status !== 'attente_paiement') {
        await supabase.from('notifications').insert({
          user_id: data.aidant_id,
          title: '📅 Nouvelle visite à valider',
          body: `Visite pour ${patient?.first_name || 'Patient'} le ${newVisit.scheduled_date} à ${newVisit.scheduled_time}`,
          type: 'visite',
          data: { visit_id: newVisit.id, action: 'approve' },
        });
      }

      // ✅ Notification à la famille
      if (patient) {
        const { data: links } = await supabase
          .from('patient_family_links')
          .select('family_id')
          .eq('patient_id', patient.id);

        if (links) {
          for (const link of links) {
            const message = status === 'attente_paiement'
              ? `Visite planifiée pour ${patient.first_name} ${patient.last_name}. Paiement requis pour validation.`
              : `Visite planifiée pour ${patient.first_name} ${patient.last_name} le ${newVisit.scheduled_date}`;
            
            await supabase.from('notifications').insert({
              user_id: link.family_id,
              title: status === 'attente_paiement' ? '💳 Visite en attente de paiement' : '📅 Nouvelle visite planifiée',
              body: message,
              type: 'visite',
              data: { visit_id: newVisit.id, status: newVisit.status },
            });
          }
        }
      }

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
  // ✅ CONFIRMER PAIEMENT
  // =============================================
  confirmPayment: async (id: string, transactionId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data: visit, error: visitError } = await supabase
        .from('visites')
        .select('*')
        .eq('id', id)
        .single();

      if (visitError) throw visitError;

      if (visit.status !== 'attente_paiement') {
        throw new Error('Cette visite n\'est pas en attente de paiement');
      }

      const { data, error } = await supabase
        .from('visites')
        .update({
          status: 'planifiee',
          metadata: {
            ...(visit.metadata || {}),
            payment_confirmed_at: new Date().toISOString(),
            transaction_id: transactionId,
          }
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Notifier l'aidant
      if (visit.aidant_id) {
        await supabase.from('notifications').insert({
          user_id: visit.aidant_id,
          title: '📅 Visite validée - Paiement confirmé',
          body: `La visite est maintenant validée.`,
          type: 'visite',
          data: { visit_id: id, action: 'approve' },
        });
      }

      set((state) => ({
        visits: state.visits.map(v => v.id === id ? { ...v, ...data } : v),
        currentVisit: data,
        isLoading: false,
      }));

      toast.success('✅ Paiement confirmé, visite validée');
    } catch (error: any) {
      console.error('❌ Confirm payment error:', error);
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
      
      const { user, profile } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      // Vérifier que l'aidant est assigné
      const { data: visit, error: fetchError } = await supabase
        .from('visites')
        .select('*, patient:patients(*)')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (visit.aidant_id !== user.id) {
        throw new Error('Vous n\'êtes pas assigné à cette visite');
      }

      if (visit.status !== 'planifiee') {
        throw new Error('Cette visite ne peut pas être approuvée');
      }

      const { data, error } = await supabase
        .from('visites')
        .update({
          status: 'acceptee',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Notification à la famille
      if (visit.patient) {
        const { data: links } = await supabase
          .from('patient_family_links')
          .select('family_id')
          .eq('patient_id', visit.patient_id);

        if (links) {
          for (const link of links) {
            await supabase.from('notifications').insert({
              user_id: link.family_id,
              title: '✅ Visite acceptée',
              body: `L'aidant a accepté la visite pour ${visit.patient.first_name} ${visit.patient.last_name} le ${visit.scheduled_date}.`,
              type: 'visite',
              data: { visit_id: id, status: 'acceptee' },
            });
          }
        }
      }

      set((state) => ({
        visits: state.visits.map(v => v.id === id ? { ...v, ...data } : v),
        currentVisit: { ...state.currentVisit, ...data },
        isLoading: false,
      }));

      toast.success('✅ Visite approuvée');
    } catch (error: any) {
      console.error('❌ Approve visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
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

      const { data: visit, error: fetchError } = await supabase
        .from('visites')
        .select('*, patient:patients(*), aidant:aidants(*)')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (visit.aidant_id !== user.id) {
        throw new Error('Vous n\'êtes pas assigné à cette visite');
      }

      const { data, error } = await supabase
        .from('visites')
        .update({
          status: 'refusee',
          refused_by: user.id,
          refused_at: new Date().toISOString(),
          refusal_reason: reason || 'Non spécifié',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Notification à la famille
      if (visit.patient) {
        const { data: links } = await supabase
          .from('patient_family_links')
          .select('family_id')
          .eq('patient_id', visit.patient_id);

        if (links) {
          for (const link of links) {
            await supabase.from('notifications').insert({
              user_id: link.family_id,
              title: '❌ Visite refusée',
              body: `L'aidant a refusé la visite pour ${visit.patient.first_name} ${visit.patient.last_name}. Motif: ${reason || 'Non spécifié'}`,
              type: 'visite',
              data: { visit_id: id, status: 'refusee' },
            });
          }
        }
      }

      // Notification aux admins
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'coordinator']);

      if (admins) {
        for (const admin of admins) {
          await supabase.from('notifications').insert({
            user_id: admin.id,
            title: '⚠️ Visite refusée - Réassignation nécessaire',
            body: `L'aidant a refusé la visite pour ${visit.patient?.first_name} ${visit.patient?.last_name} le ${visit.scheduled_date}.`,
            type: 'alert',
            data: { visit_id: id, action: 'reassign' },
          });
        }
      }

      set((state) => ({
        visits: state.visits.map(v => v.id === id ? { ...v, ...data } : v),
        currentVisit: { ...state.currentVisit, ...data },
        isLoading: false,
      }));

      toast.error('❌ Visite refusée');
    } catch (error: any) {
      console.error('❌ Refuse visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // =============================================
  // ✅ RÉASSIGNER UNE VISITE (admin)
  // =============================================
  reassignVisit: async (id: string, newAidantId: string, assignmentType: string) => {
    try {
      set({ isLoading: true, error: null });

      const { user, profile } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      if (profile?.role !== 'admin' && profile?.role !== 'coordinator') {
        throw new Error('Non autorisé');
      }

      const { data: visit, error: fetchError } = await supabase
        .from('visites')
        .select('*, patient:patients(*)')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('visites')
        .update({
          aidant_id: newAidantId,
          status: 'planifiee',
          assignment_type: assignmentType || 'ponctuelle',
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
      await supabase.from('notifications').insert({
        user_id: newAidantId,
        title: '📅 Nouvelle visite assignée',
        body: `Vous avez été assigné à une visite le ${visit.scheduled_date} à ${visit.scheduled_time}.`,
        type: 'visite',
        data: { visit_id: id, action: 'approve' },
      });

      // Notification à l'ancien aidant
      if (visit.aidant_id && visit.aidant_id !== newAidantId) {
        await supabase.from('notifications').insert({
          user_id: visit.aidant_id,
          title: '🔄 Visite réassignée',
          body: `La visite du ${visit.scheduled_date} vous a été retirée.`,
          type: 'visite',
          data: { visit_id: id },
        });
      }

      set((state) => ({
        visits: state.visits.map(v => v.id === id ? { ...v, ...data } : v),
        currentVisit: { ...state.currentVisit, ...data },
        isLoading: false,
      }));

      toast.success('✅ Visite réassignée');
    } catch (error: any) {
      console.error('❌ Reassign visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // =============================================
  // START VISIT
  // =============================================
  startVisit: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: visit, error: fetchError } = await supabase
        .from('visites')
        .select('aidant_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (visit.aidant_id !== user.id) {
        throw new Error('Vous n\'êtes pas assigné à cette visite');
      }

      const now = new Date().toISOString();
      const { data, error } = await supabase
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
        visits: state.visits.map(v => v.id === id ? { ...v, ...data } : v),
        currentVisit: { ...state.currentVisit, ...data },
        isLoading: false,
      }));

      toast.success('🚀 Visite démarrée');
    } catch (error: any) {
      console.error('❌ Start visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // =============================================
  // COMPLETE VISIT
  // =============================================
  completeVisit: async (id: string, data: { actions: string[]; notes: string; photos?: string[] }) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: visit, error: fetchError } = await supabase
        .from('visites')
        .select('aidant_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (visit.aidant_id !== user.id) {
        throw new Error('Vous n\'êtes pas assigné à cette visite');
      }

      const now = new Date().toISOString();
      const updateData = {
        status: 'terminee',
        end_time: now,
        actions: data.actions || [],
        notes: data.notes || null,
        report: data.notes || null,
      };

      const { data: updatedVisit, error } = await supabase
        .from('visites')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        visits: state.visits.map(v => v.id === id ? { ...v, ...updatedVisit } : v),
        currentVisit: { ...state.currentVisit, ...updatedVisit },
        isLoading: false,
      }));

      toast.success('✅ Visite terminée, en attente de validation');
    } catch (error: any) {
      console.error('❌ Complete visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // =============================================
  // VALIDATE VISIT
  // =============================================
  validateVisit: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { profile } = useAuthStore.getState();
      if (profile?.role !== 'admin' && profile?.role !== 'coordinator') {
        throw new Error('Non autorisé');
      }

      const { data: visit, error: fetchError } = await supabase
        .from('visites')
        .select('status, patient_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (visit.status !== 'terminee') {
        throw new Error('Seules les visites terminées peuvent être validées');
      }

      const { data, error } = await supabase
        .from('visites')
        .update({
          status: 'validee',
          metadata: {
            validated_by: profile.id,
            validated_at: new Date().toISOString(),
          }
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // ✅ Décompter de l'abonnement (géré côté backend)
      // Notification à l'aidant
      if (data.aidant_id) {
        await supabase.from('notifications').insert({
          user_id: data.aidant_id,
          title: '✅ Visite validée',
          body: `La visite a été validée par l'administration.`,
          type: 'visite',
          data: { visit_id: id, status: 'validee' },
        });
      }

      set((state) => ({
        visits: state.visits.map(v => v.id === id ? { ...v, ...data } : v),
        currentVisit: { ...state.currentVisit, ...data },
        isLoading: false,
      }));

      toast.success('✅ Visite validée');
    } catch (error: any) {
      console.error('❌ Validate visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // =============================================
  // CANCEL VISIT
  // =============================================
  cancelVisit: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: visit, error: fetchError } = await supabase
        .from('visites')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Vérifier les permissions
      let canCancel = false;
      if (profile?.role === 'admin' || profile?.role === 'coordinator') {
        canCancel = true;
      } else if (profile?.role === 'family' && visit.patient_id) {
        const { data: link } = await supabase
          .from('patient_family_links')
          .select('id')
          .eq('family_id', user.id)
          .eq('patient_id', visit.patient_id)
          .maybeSingle();
        canCancel = !!link;
      }

      if (!canCancel) {
        throw new Error('Non autorisé à annuler cette visite');
      }

      const { data, error } = await supabase
        .from('visites')
        .update({
          status: 'annulee',
          metadata: {
            ...(visit.metadata || {}),
            cancelled_by: user.id,
            cancelled_at: new Date().toISOString(),
          }
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        visits: state.visits.map(v => v.id === id ? { ...v, ...data } : v),
        currentVisit: { ...state.currentVisit, ...data },
        isLoading: false,
      }));

      toast.success('Visite annulée');
    } catch (error: any) {
      console.error('❌ Cancel visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // =============================================
  // DELETE VISIT
  // =============================================
  deleteVisit: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { profile } = useAuthStore.getState();
      if (profile?.role !== 'admin' && profile?.role !== 'coordinator') {
        throw new Error('Non autorisé');
      }

      const { error } = await supabase
        .from('visites')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        visits: state.visits.filter(v => v.id !== id),
        isLoading: false,
      }));

      toast.success('Visite supprimée');
    } catch (error: any) {
      console.error('❌ Delete visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // =============================================
  // UPDATE VISIT
  // =============================================
  updateVisit: async (id: string, data: Partial<Visit>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { profile } = useAuthStore.getState();
      if (profile?.role !== 'admin' && profile?.role !== 'coordinator') {
        throw new Error('Non autorisé');
      }

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

      toast.success('Visite mise à jour');
    } catch (error: any) {
      console.error('❌ Update visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // =============================================
  // GET PENDING VISITS
  // =============================================
  getPendingVisits: async () => {
    try {
      set({ isLoading: true, error: null });

      const { user } = useAuthStore.getState();
      if (!user) {
        set({ isLoading: false });
        return [];
      }

      const { data: aidant } = await supabase
        .from('aidants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!aidant) {
        set({ isLoading: false });
        return [];
      }

      const { data, error } = await supabase
        .from('visites')
        .select(`
          *,
          patient:patients(*),
          aidant:aidants(*, user:profiles(*))
        `)
        .eq('aidant_id', aidant.id)
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
  // GET VISITS NEEDING REASSIGN
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
  // GET VISITS BY PATIENT
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

  clearError: () => set({ error: null }),
}));
