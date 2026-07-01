// 📁 src/stores/visitStore.ts - VERSION COMPLÈTE CORRIGÉE
 
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Visit, VisitStatus } from '@/types';
import { useAuthStore } from './authStore';
import toast from 'react-hot-toast';

// ============================================================
// TYPES
// ============================================================

interface VisitState {
  visits: Visit[];
  currentVisit: Visit | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  lastFetch: number | null;
  isCacheInvalidated: boolean;
  
  // Actions
  fetchVisits: (force?: boolean) => Promise<void>;
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
  
  // ✅ GESTION DU CACHE
  invalidateCache: () => void;
  refresh: () => Promise<void>;
  
  getPendingVisits: () => Promise<Visit[]>;
  getVisitsNeedingReassign: () => Promise<Visit[]>;
  getVisitsByPatient: (patientId: string) => Promise<Visit[]>;
  canManageVisits: () => boolean;
  clearError: () => void;
}

// ============================================================
// HELPERS
// ============================================================

const CACHE_KEY = 'sante_plus_visits_cache';
const CACHE_DURATION = 60000; // 1 minute

const getCachedVisits = (): { data: Visit[]; timestamp: number } | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
    return null;
  } catch { return null; }
};

const setCachedVisits = (visits: Visit[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: visits,
      timestamp: Date.now(),
    }));
  } catch { /* ignore */ }
};

const clearCachedVisits = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('🗑️ Cache visites invalidé');
  } catch { /* ignore */ }
};

// ============================================================
// STORE
// ============================================================

export const useVisitStore = create<VisitState>((set, get) => ({
  visits: [],
  currentVisit: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  lastFetch: null,
  isCacheInvalidated: false,

  // ✅ Vérifier si l'utilisateur peut gérer les visites
  canManageVisits: () => {
    const { profile } = useAuthStore.getState();
    return profile?.role === 'admin' || profile?.role === 'coordinator';
  },

  // ✅ Invalider le cache
  invalidateCache: () => {
    clearCachedVisits();
    set({ 
      isCacheInvalidated: true,
      isInitialized: false,
      lastFetch: null,
    });
    console.log('🔄 Cache visites invalidé');
  },

  // ✅ Rafraîchir forcé
  refresh: async () => {
    get().invalidateCache();
    await get().fetchVisits(true);
  },

  // ============================================================
  // FETCH VISITES - AVEC CACHE
  // ============================================================
  fetchVisits: async (force = false) => {
    const state = get();
    
    if (state.isLoading) {
      console.log('ℹ️ Déjà en cours de chargement, skip...');
      return;
    }

    if (state.isCacheInvalidated) {
      force = true;
    }

    if (!force && state.lastFetch && (Date.now() - state.lastFetch < CACHE_DURATION)) {
      console.log('📦 Utilisation du cache mémoire visites');
      return;
    }

    if (!force) {
      const cached = getCachedVisits();
      if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        console.log('📦 Utilisation du cache localStorage visites');
        set({ 
          visits: cached.data, 
          isLoading: false, 
          isInitialized: true,
          lastFetch: cached.timestamp,
          isCacheInvalidated: false,
        });
        return;
      }
    }

    try {
      set({ isLoading: true, error: null, isCacheInvalidated: false });
      
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
          set({ visits: [], isLoading: false, isInitialized: true });
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
          set({ visits: [], isLoading: false, isInitialized: true });
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

      // ✅ Mettre en cache
      setCachedVisits(visitsWithRelations);
      
      set({ 
        visits: visitsWithRelations, 
        isLoading: false,
        isInitialized: true,
        lastFetch: Date.now(),
        isCacheInvalidated: false,
      });
    } catch (error: any) {
      console.error('❌ Fetch visits error:', error);
      
      // En cas d'erreur, utiliser le cache
      const cached = getCachedVisits();
      if (cached && cached.data.length > 0) {
        set({
          visits: cached.data,
          isLoading: false,
          isInitialized: true,
          lastFetch: cached.timestamp,
          error: error.message || 'Erreur de chargement (cache utilisé)',
          isCacheInvalidated: false,
        });
      } else {
        set({ error: error.message, isLoading: false, isInitialized: true });
      }
    }
  },

  // ============================================================
  // FETCH VISIT BY ID
  // ============================================================
  fetchVisitById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // ✅ Vérifier dans le cache d'abord
      const state = get();
      const cachedVisit = state.visits.find(v => v.id === id);
      if (cachedVisit) {
        console.log('📦 Visite trouvée dans le cache');
        set({ currentVisit: cachedVisit, isLoading: false });
        return;
      }

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

  // ============================================================
  // CREATE VISIT - AVEC INVALIDATION DE CACHE
  // ============================================================
  createVisit: async (data: Partial<Visit>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      if (profile?.role === 'aidant') {
        throw new Error('Les aidants ne peuvent pas créer de visites');
      }

      const isPonctual = data.visit_type === 'ponctuelle' || false;
      let status: VisitStatus = 'planifiee';

      if (isPonctual) {
        status = 'attente_paiement';
      }

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

      // ✅ INVALIDER LE CACHE
      get().invalidateCache();

      // ✅ Recharger les données
      await get().fetchVisits(true);

      // Notifications
      if (data.aidant_id && status !== 'attente_paiement') {
        await supabase.from('notifications').insert({
          user_id: data.aidant_id,
          title: '📅 Nouvelle visite à valider',
          body: `Visite pour ${patient?.first_name || 'Patient'} le ${newVisit.scheduled_date} à ${newVisit.scheduled_time}`,
          type: 'visite',
          data: { visit_id: newVisit.id, action: 'approve' },
        });
      }

      set({ isLoading: false });

      return fullVisit;
    } catch (error: any) {
      console.error('❌ Create visit error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // ============================================================
  // UPDATE VISIT - AVEC INVALIDATION DE CACHE
  // ============================================================
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

      // ✅ INVALIDER LE CACHE
      get().invalidateCache();
      await get().fetchVisits(true);

      set({ 
        currentVisit: { ...get().currentVisit, ...visit },
        isLoading: false,
      });

      toast.success('Visite mise à jour');
    } catch (error: any) {
      console.error('❌ Update visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // DELETE VISIT - AVEC INVALIDATION DE CACHE
  // ============================================================
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

      // ✅ INVALIDER LE CACHE
      get().invalidateCache();
      await get().fetchVisits(true);

      set({ isLoading: false });
      toast.success('Visite supprimée');
    } catch (error: any) {
      console.error('❌ Delete visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // ✅ CONFIRMER PAIEMENT - AVEC INVALIDATION DE CACHE
  // ============================================================
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

      // ✅ INVALIDER LE CACHE
      get().invalidateCache();
      await get().fetchVisits(true);

      set({ 
        currentVisit: data,
        isLoading: false,
      });

      toast.success('✅ Paiement confirmé, visite validée');
    } catch (error: any) {
      console.error('❌ Confirm payment error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // ✅ APPROUVER UNE VISITE - AVEC INVALIDATION DE CACHE
  // ============================================================
  approveVisit: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

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

      // ✅ INVALIDER LE CACHE
      get().invalidateCache();
      await get().fetchVisits(true);

      set({ isLoading: false });
      toast.success('✅ Visite approuvée');
    } catch (error: any) {
      console.error('❌ Approve visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // ✅ REFUSER UNE VISITE - AVEC INVALIDATION DE CACHE
  // ============================================================
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

      // ✅ INVALIDER LE CACHE
      get().invalidateCache();
      await get().fetchVisits(true);

      set({ isLoading: false });
      toast.error('❌ Visite refusée');
    } catch (error: any) {
      console.error('❌ Refuse visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // ✅ RÉASSIGNER UNE VISITE - AVEC INVALIDATION DE CACHE
  // ============================================================
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

      // ✅ INVALIDER LE CACHE
      get().invalidateCache();
      await get().fetchVisits(true);

      set({ isLoading: false });
      toast.success('✅ Visite réassignée');
    } catch (error: any) {
      console.error('❌ Reassign visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // START VISIT - AVEC INVALIDATION DE CACHE
  // ============================================================
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

      // ✅ INVALIDER LE CACHE
      get().invalidateCache();
      await get().fetchVisits(true);

      set({ isLoading: false });
      toast.success('🚀 Visite démarrée');
    } catch (error: any) {
      console.error('❌ Start visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // COMPLETE VISIT - AVEC INVALIDATION DE CACHE
  // ============================================================
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

      // ✅ INVALIDER LE CACHE
      get().invalidateCache();
      await get().fetchVisits(true);

      set({ isLoading: false });
      toast.success('✅ Visite terminée, en attente de validation');
    } catch (error: any) {
      console.error('❌ Complete visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // VALIDATE VISIT - AVEC INVALIDATION DE CACHE
  // ============================================================
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

      // ✅ INVALIDER LE CACHE
      get().invalidateCache();
      await get().fetchVisits(true);

      set({ isLoading: false });
      toast.success('✅ Visite validée');
    } catch (error: any) {
      console.error('❌ Validate visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // CANCEL VISIT - AVEC INVALIDATION DE CACHE
  // ============================================================
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

      // ✅ INVALIDER LE CACHE
      get().invalidateCache();
      await get().fetchVisits(true);

      set({ isLoading: false });
      toast.success('Visite annulée');
    } catch (error: any) {
      console.error('❌ Cancel visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // GET PENDING VISITS
  // ============================================================
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

  // ============================================================
  // GET VISITS NEEDING REASSIGN
  // ============================================================
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

  // ============================================================
  // GET VISITS BY PATIENT
  // ============================================================
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

// ============================================================
// EXPORT PAR DÉFAUT
// ============================================================

export default useVisitStore;
