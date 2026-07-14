// 📁 src/stores/dischargeStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { HospitalDischarge, DischargeStatus } from '@/types';
import { useAuthStore } from './authStore';

 
// =============================================
// HELPERS DE CACHE
// =============================================

const DISCHARGES_CACHE_KEY = 'sante_plus_discharges_cache';
const CACHE_DURATION = 60000; // 1 minute

const getCachedDischarges = (): { data: HospitalDischarge[]; timestamp: number } | null => {
  try {
    const cached = localStorage.getItem(DISCHARGES_CACHE_KEY);
    if (cached) return JSON.parse(cached);
    return null;
  } catch { return null; }
};

const setCachedDischarges = (discharges: HospitalDischarge[]) => {
  try {
    localStorage.setItem(DISCHARGES_CACHE_KEY, JSON.stringify({
      data: discharges,
      timestamp: Date.now(),
    }));
  } catch { /* ignore */ }
};

const clearCachedDischarges = () => {
  try {
    localStorage.removeItem(DISCHARGES_CACHE_KEY);
    console.log('🗑️ Cache sorties d\'hôpital invalidé');
  } catch { /* ignore */ }
};

// =============================================
// STORE
// =============================================

interface DischargeState {
  discharges: HospitalDischarge[];
  currentDischarge: HospitalDischarge | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  lastFetch: number | null;
  isCacheInvalidated: boolean;
  
  fetchDischarges: (force?: boolean, patientId?: string) => Promise<void>;
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
  
  // ✅ GESTION DU CACHE
  invalidateCache: () => void;
  refresh: () => Promise<void>;
  
  clearError: () => void;
}

export const useDischargeStore = create<DischargeState>((set, get) => ({
  discharges: [],
  currentDischarge: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  lastFetch: null,
  isCacheInvalidated: false,

  // ✅ Invalider le cache
  invalidateCache: () => {
    clearCachedDischarges();
    set({ 
      isCacheInvalidated: true,
      isInitialized: false,
      lastFetch: null,
    });
    console.log('🔄 Cache sorties d\'hôpital invalidé');
  },

  // ✅ Rafraîchir forcé
  refresh: async () => {
    get().invalidateCache();
    await get().fetchDischarges(true);
  },

  // =============================================
  // FETCH DISCHARGES - AVEC CACHE - SANS TOAST
  // =============================================
  fetchDischarges: async (force = false, patientId?: string) => {
    const state = get();
    
    if (state.isLoading) {
      console.log('ℹ️ Déjà en cours de chargement, skip...');
      return;
    }

    if (state.isCacheInvalidated) {
      force = true;
    }

    // Si un patientId est fourni, on force le rafraîchissement
    if (patientId) {
      force = true;
    }

    if (!force && state.lastFetch && (Date.now() - state.lastFetch < CACHE_DURATION)) {
      console.log('📦 Utilisation du cache mémoire sorties');
      return;
    }

    if (!force) {
      const cached = getCachedDischarges();
      if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        console.log('📦 Utilisation du cache localStorage sorties');
        set({ 
          discharges: cached.data, 
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
        set({ discharges: [], isLoading: false, isInitialized: true });
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
          set({ discharges: [], isLoading: false, isInitialized: true });
          return;
        }
      }

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;

      const discharges = data || [];

      // ✅ Mettre en cache
      setCachedDischarges(discharges);
      
      set({ 
        discharges, 
        isLoading: false,
        isInitialized: true,
        lastFetch: Date.now(),
        isCacheInvalidated: false,
      });
    } catch (error: any) {
      console.error('❌ Fetch discharges error:', error);
      
      // En cas d'erreur, utiliser le cache
      const cached = getCachedDischarges();
      if (cached && cached.data.length > 0) {
        set({
          discharges: cached.data,
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

  // =============================================
  // FETCH DISCHARGE BY ID - AVEC CACHE
  // =============================================
  fetchDischargeById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // ✅ Vérifier dans le cache d'abord
      const state = get();
      const cachedDischarge = state.discharges.find(d => d.id === id);
      if (cachedDischarge) {
        console.log('📦 Sortie trouvée dans le cache');
        set({ currentDischarge: cachedDischarge, isLoading: false });
        return;
      }

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
  // CREATE DISCHARGE - AVEC INVALIDATION DE CACHE - SANS TOAST
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

      // ✅ INVALIDER LE CACHE
      get().invalidateCache();
      await get().fetchDischarges(true);

      // ✅ Notification aux coordinateurs (pas de toast)
      const { data: coordinators } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['coordinator', 'admin']);

      if (coordinators) {
        for (const coordinator of coordinators) {
          await supabase.from('notifications').insert({
            user_id: coordinator.id,
            title: ' Nouvelle demande de sortie',
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

      // ✅ SUPPRIMÉ : toast.success('Demande de sortie créée');
      return discharge;
    } catch (error: any) {
      console.error('❌ Create discharge error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // UPDATE DISCHARGE - AVEC INVALIDATION DE CACHE - SANS TOAST
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

      // ✅ INVALIDER LE CACHE
      get().invalidateCache();
      await get().fetchDischarges(true);

      set((state) => ({
        discharges: state.discharges.map(d => d.id === id ? discharge : d),
        currentDischarge: discharge,
        isLoading: false,
      }));

      // ✅ SUPPRIMÉ : toast.success('Sortie mise à jour');
    } catch (error: any) {
      console.error('❌ Update discharge error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // UPDATE STATUS - AVEC INVALIDATION DE CACHE - SANS TOAST
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

      // ✅ INVALIDER LE CACHE
      get().invalidateCache();
      await get().fetchDischarges(true);

      set((state) => ({
        discharges: state.discharges.map(d => d.id === id ? discharge : d),
        currentDischarge: discharge,
        isLoading: false,
      }));

      // ✅ Notification à la famille (pas de toast)
      if (discharge.family_id) {
        await supabase.from('notifications').insert({
          user_id: discharge.family_id,
          title: 'Mise à jour sortie d\'hôpital',
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
  // ASSIGN AIDANT - AVEC INVALIDATION DE CACHE - SANS TOAST
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

      // ✅ INVALIDER LE CACHE
      get().invalidateCache();
      await get().fetchDischarges(true);

      // ✅ Notification à l'aidant (pas de toast)
      if (discharge.aidant?.user_id) {
        await supabase.from('notifications').insert({
          user_id: discharge.aidant.user_id,
          title: 'Nouvelle mission de sortie',
          body: `Vous avez été assigné à la sortie de ${discharge.patient?.first_name} ${discharge.patient?.last_name}`,
          type: 'system',
          data: { discharge_id: id },
        });
      }

      // ✅ Notification à la famille (pas de toast)
      if (discharge.family_id) {
        await supabase.from('notifications').insert({
          user_id: discharge.family_id,
          title: 'Aidant assigné',
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

      // ✅ SUPPRIMÉ : toast.success('Aidant assigné');
    } catch (error: any) {
      console.error('❌ Assign aidant error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // COMPLETE DISCHARGE - AVEC INVALIDATION DE CACHE - SANS TOAST
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

      // ✅ INVALIDER LE CACHE
      get().invalidateCache();
      await get().fetchDischarges(true);

      set((state) => ({
        discharges: state.discharges.map(d => d.id === id ? discharge : d),
        currentDischarge: discharge,
        isLoading: false,
      }));

      // ✅ Notification à la famille (pas de toast)
      if (discharge.family_id) {
        await supabase.from('notifications').insert({
          user_id: discharge.family_id,
          title: 'Sortie d\'hôpital terminée',
          body: `La sortie de ${discharge.patient?.first_name} ${discharge.patient?.last_name} est terminée.`,
          type: 'system',
          data: { discharge_id: id },
        });
      }

      // ✅ Notification aux coordinateurs (pas de toast)
      const { data: coordinators } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['coordinator', 'admin']);

      if (coordinators) {
        for (const coordinator of coordinators) {
          await supabase.from('notifications').insert({
            user_id: coordinator.id,
            title: 'Sortie d\'hôpital terminée',
            body: `La sortie de ${discharge.patient?.first_name} ${discharge.patient?.last_name} est terminée.`,
            type: 'system',
            data: { discharge_id: id },
          });
        }
      }

      // ✅ SUPPRIMÉ : toast.success('✅ Sortie d\'hôpital terminée');
    } catch (error: any) {
      console.error('❌ Complete discharge error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // CANCEL DISCHARGE - AVEC INVALIDATION DE CACHE - SANS TOAST
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

      // ✅ INVALIDER LE CACHE
      get().invalidateCache();
      await get().fetchDischarges(true);

      set((state) => ({
        discharges: state.discharges.map(d => d.id === id ? discharge : d),
        currentDischarge: discharge,
        isLoading: false,
      }));

      // ✅ Notification à la famille (pas de toast)
      if (discharge.family_id) {
        await supabase.from('notifications').insert({
          user_id: discharge.family_id,
          title: 'Sortie d\'hôpital annulée',
          body: `La sortie a été annulée. Motif: ${reason}`,
          type: 'system',
          data: { discharge_id: id },
        });
      }

      // ✅ Notification aux coordinateurs (pas de toast)
      const { data: coordinators } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['coordinator', 'admin']);

      if (coordinators) {
        for (const coordinator of coordinators) {
          await supabase.from('notifications').insert({
            user_id: coordinator.id,
            title: 'Sortie d\'hôpital annulée',
            body: `La sortie de ${discharge.patient?.first_name} ${discharge.patient?.last_name} a été annulée.`,
            type: 'system',
            data: { discharge_id: id },
          });
        }
      }

      // ✅ SUPPRIMÉ : toast.error('Sortie d\'hôpital annulée');
    } catch (error: any) {
      console.error('❌ Cancel discharge error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
