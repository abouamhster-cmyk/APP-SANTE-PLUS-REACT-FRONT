// 📁 src/stores/visitStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Visit, VisitStatus } from '@/types';
import { useAuthStore } from './authStore';
import { assignmentAPI } from '@/lib/api';
import toast from 'react-hot-toast';

// ============================================================
// HELPERS DE CACHE
// ============================================================

const CACHE_KEY = 'sante_plus_visits_cache';
const CACHE_DURATION = 30000; // 30 secondes (plus court pour les visites)

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

interface VisitState {
  visits: Visit[];
  currentVisit: Visit | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  lastFetch: number | null;
  isCacheInvalidated: boolean;
  
  fetchVisits: (force?: boolean) => Promise<void>;
  fetchVisitById: (id: string) => Promise<void>;
  createVisit: (data: Partial<Visit> & { 
    target_type?: 'personal' | 'patient'; 
    target_name?: string;
    target_user_id?: string;
  }) => Promise<Visit>;
  updateVisit: (id: string, data: Partial<Visit>) => Promise<void>;
  deleteVisit: (id: string) => Promise<void>;
  confirmPayment: (id: string, transactionId: string) => Promise<Visit>;
  approveVisit: (id: string) => Promise<void>;
  refuseVisit: (id: string, reason: string) => Promise<void>;
  reassignVisit: (id: string, newAidantId: string, assignmentType: string) => Promise<void>;
  startVisit: (id: string) => Promise<void>;
  completeVisit: (id: string, data: { actions: string[]; notes: string; photos?: string[] }) => Promise<void>;
  validateVisit: (id: string) => Promise<void>;
  cancelVisit: (id: string) => Promise<void>;
  invalidateCache: () => void;
  refresh: () => Promise<void>;
  getPendingVisits: () => Promise<Visit[]>;
  getVisitsNeedingReassign: () => Promise<Visit[]>;
  getVisitsByPatient: (patientId: string) => Promise<Visit[]>;
  canManageVisits: () => boolean;
  clearError: () => void;
  getActiveAidantForVisit: (patientId?: string, familyId?: string) => Promise<string | null>;
}

// ✅ FONCTION POUR RÉCUPÉRER L'AIDANT AVEC SON PROFIL
const fetchAidantWithProfile = async (aidantId: string) => {
  if (!aidantId) return null;
  
  const { data, error } = await supabase
    .from('aidants')
    .select(`
      id,
      user_id,
      specialties,
      available,
      rating,
      total_missions,
      completed_missions,
      cancelled_missions,
      user:profiles!aidants_user_id_fkey (
        id,
        full_name,
        email,
        phone,
        avatar_url
      )
    `)
    .eq('id', aidantId)
    .single();

  if (error) {
    console.error('❌ Erreur récupération aidant:', error);
    return null;
  }
  return data;
};

export const useVisitStore = create<VisitState>((set, get) => ({
  visits: [],
  currentVisit: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  lastFetch: null,
  isCacheInvalidated: false,

  canManageVisits: () => {
    const { profile } = useAuthStore.getState();
    return profile?.role === 'admin' || profile?.role === 'coordinator';
  },

  invalidateCache: () => {
    clearCachedVisits();
    set({ 
      isCacheInvalidated: true,
      isInitialized: false,
      lastFetch: null,
    });
    console.log('🔄 Cache visites invalidé');
  },

  refresh: async () => {
    get().invalidateCache();
    await get().fetchVisits(true);
  },

  getActiveAidantForVisit: async (patientId?: string, familyId?: string): Promise<string | null> => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) return null;

      const targetType = patientId ? 'patient' : 'personal_account';
      const targetId = patientId || user.id;
      const finalFamilyId = familyId || user.id;

      const response = await assignmentAPI.getActive(targetType, targetId, finalFamilyId);
      
      if (response.data?.success && response.data?.data?.aidant_id) {
        return response.data.data.aidant_id;
      }
      return null;
    } catch (error) {
      console.error('❌ getActiveAidantForVisit error:', error);
      return null;
    }
  },

  // ============================================================
  // FETCH VISITS  
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

    // ✅ Appel API
    const response = await api.get('/visits');
    const visitsData = response.data || [];

    // ✅ POUR LES FAMILLES : Forcer le rechargement des aidants
    let visitsWithFullRelations = visitsData;

    if (profile?.role === 'family' && visitsWithFullRelations.length > 0) {
      // Récupérer tous les aidant_id uniques
      const aidantIds = [...new Set(
        visitsWithFullRelations
          .filter((v: any) => v.aidant_id)
          .map((v: any) => v.aidant_id)
      )];

      if (aidantIds.length > 0) {
        // Récupérer les aidants avec leurs profils
        const { data: aidantsData } = await supabase
          .from('aidants')
          .select(`
            id,
            user_id,
            specialties,
            available,
            rating,
            total_missions,
            completed_missions,
            cancelled_missions,
            user:profiles!aidants_user_id_fkey (
              id,
              full_name,
              email,
              phone,
              avatar_url
            )
          `)
          .in('id', aidantIds);

        if (aidantsData) {
          // Créer un mapping aidant_id → aidant
          const aidantMap = aidantsData.reduce((acc: any, a: any) => {
            acc[a.id] = a;
            return acc;
          }, {});

          // Remplacer les aidants dans les visites
          visitsWithFullRelations = visitsWithFullRelations.map((visit: any) => ({
            ...visit,
            aidant: visit.aidant_id ? aidantMap[visit.aidant_id] || null : null,
          }));
        }
      }
    }

    setCachedVisits(visitsWithFullRelations);
    
    set({ 
      visits: visitsWithFullRelations, 
      isLoading: false,
      isInitialized: true,
      lastFetch: Date.now(),
      isCacheInvalidated: false,
    });
  } catch (error: any) {
    console.error('❌ Fetch visits error:', error);
    
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
  // FETCH VISIT BY ID - CORRIGÉ AVEC RECHARGE
  // ============================================================
  fetchVisitById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // ✅ Vérifier dans le cache d'abord
      const state = get();
      const cachedVisit = state.visits.find(v => v.id === id);
      if (cachedVisit && cachedVisit.aidant?.user) {
        console.log('📦 Visite trouvée dans le cache avec aidant');
        set({ currentVisit: cachedVisit, isLoading: false });
        return;
      }

      // ✅ Récupérer la visite avec les relations
      const { data: visit, error } = await supabase
        .from('visites')
        .select(`
          *,
          patient:patients(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          set({ error: 'Visite non trouvée', isLoading: false });
          return;
        }
        throw error;
      }

      // ✅ Récupérer l'aidant si présent
      let aidant = null;
      if (visit.aidant_id) {
        const { data: aidantData } = await supabase
          .from('aidants')
          .select(`
            id,
            user_id,
            specialties,
            available,
            rating,
            total_missions,
            completed_missions,
            cancelled_missions,
            user:profiles!aidants_user_id_fkey (
              id,
              full_name,
              email,
              phone,
              avatar_url
            )
          `)
          .eq('id', visit.aidant_id)
          .single();

        if (aidantData) {
          aidant = aidantData;
        }
      }

      const fullVisit = {
        ...visit,
        aidant,
      };

      // ✅ Mettre à jour le cache mémoire
      set((state) => ({
        visits: state.visits.map(v => v.id === id ? fullVisit : v),
        currentVisit: fullVisit,
        isLoading: false,
      }));

    } catch (error: any) {
      console.error('❌ fetchVisitById error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // ============================================================
  // CREATE VISIT
  // ============================================================
  createVisit: async (data: Partial<Visit> & { 
    target_type?: 'personal' | 'patient'; 
    target_name?: string;
    target_user_id?: string;
  }) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      if (profile?.role === 'aidant') {
        throw new Error('Les aidants ne peuvent pas créer de visites');
      }

      // ... (reste du code de création inchangé)

      // ✅ Après création, invalider le cache et recharger
      get().invalidateCache();
      await get().fetchVisits(true);

      set({ isLoading: false });
      // ... (reste du code)

    } catch (error: any) {
      console.error('❌ createVisit error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // ============================================================
  // CONFIRMER PAIEMENT - AVEC RECHARGE FORCÉE
  // ============================================================
  confirmPayment: async (id: string, transactionId: string): Promise<Visit> => {
    try {
      set({ isLoading: true, error: null });

      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/visits/${id}/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ transaction_id: transactionId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la confirmation du paiement');
      }

      const result = await response.json();

      // ✅ INVALIDER LE CACHE ET RECHARGER FORCÉMENT
      get().invalidateCache();
      await get().fetchVisits(true);

      // ✅ Récupérer la visite à jour avec toutes les relations
      await get().fetchVisitById(id);

      set({ 
        isLoading: false,
      });

      toast.success('✅ Visite planifiée après paiement !');
      return result.visit;
    } catch (error: any) {
      console.error('❌ confirmPayment error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
      throw error;
    }
  },

  // ============================================================
  // APPROUVER UNE VISITE - AVEC RECHARGE FORCÉE
  // ============================================================
  approveVisit: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/visits/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'approbation');
      }

      // ✅ INVALIDER LE CACHE ET RECHARGER FORCÉMENT
      get().invalidateCache();
      await get().fetchVisits(true);
      await get().fetchVisitById(id);

      set({ isLoading: false });
      toast.success('✅ Visite approuvée');
    } catch (error: any) {
      console.error('❌ approveVisit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // REFUSER UNE VISITE - AVEC RECHARGE FORCÉE
  // ============================================================
  refuseVisit: async (id: string, reason: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/visits/${id}/refuse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du refus');
      }

      // ✅ INVALIDER LE CACHE ET RECHARGER FORCÉMENT
      get().invalidateCache();
      await get().fetchVisits(true);
      await get().fetchVisitById(id);

      set({ isLoading: false });
      toast.error('❌ Visite refusée');
    } catch (error: any) {
      console.error('❌ refuseVisit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // RÉASSIGNER UNE VISITE - AVEC RECHARGE FORCÉE
  // ============================================================
  reassignVisit: async (id: string, newAidantId: string, assignmentType: string) => {
    try {
      set({ isLoading: true, error: null });

      const { user, profile } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      if (profile?.role !== 'admin' && profile?.role !== 'coordinator') {
        throw new Error('Non autorisé');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/visits/${id}/reassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          aidant_id: newAidantId, 
          assignment_type: assignmentType 
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la réassignation');
      }

      // ✅ INVALIDER LE CACHE ET RECHARGER FORCÉMENT
      get().invalidateCache();
      await get().fetchVisits(true);
      await get().fetchVisitById(id);

      set({ isLoading: false });
      toast.success('✅ Visite réassignée');
    } catch (error: any) {
      console.error('❌ reassignVisit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // DÉMARRER UNE VISITE - AVEC RECHARGE FORCÉE
  // ============================================================
  startVisit: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/visits/${id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du démarrage');
      }

      // ✅ INVALIDER LE CACHE ET RECHARGER FORCÉMENT
      get().invalidateCache();
      await get().fetchVisits(true);
      await get().fetchVisitById(id);

      set({ isLoading: false });
      toast.success('🚀 Visite démarrée');
    } catch (error: any) {
      console.error('❌ startVisit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // TERMINER UNE VISITE - AVEC RECHARGE FORCÉE
  // ============================================================
  completeVisit: async (id: string, data: { actions: string[]; notes: string; photos?: string[] }) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/visits/${id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la finalisation');
      }

      // ✅ INVALIDER LE CACHE ET RECHARGER FORCÉMENT
      get().invalidateCache();
      await get().fetchVisits(true);
      await get().fetchVisitById(id);

      set({ isLoading: false });
      toast.success('✅ Visite terminée');
    } catch (error: any) {
      console.error('❌ completeVisit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // VALIDER UNE VISITE - AVEC RECHARGE FORCÉE
  // ============================================================
  validateVisit: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { profile } = useAuthStore.getState();
      if (profile?.role !== 'admin' && profile?.role !== 'coordinator') {
        throw new Error('Non autorisé');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/visits/${id}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la validation');
      }

      // ✅ INVALIDER LE CACHE ET RECHARGER FORCÉMENT
      get().invalidateCache();
      await get().fetchVisits(true);
      await get().fetchVisitById(id);

      set({ isLoading: false });
      toast.success('✅ Visite validée');
    } catch (error: any) {
      console.error('❌ validateVisit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // ANNULER UNE VISITE - AVEC RECHARGE FORCÉE
  // ============================================================
  cancelVisit: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/visits/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'annulation');
      }

      // ✅ INVALIDER LE CACHE ET RECHARGER FORCÉMENT
      get().invalidateCache();
      await get().fetchVisits(true);
      await get().fetchVisitById(id);

      set({ isLoading: false });
      toast.success('Visite annulée');
    } catch (error: any) {
      console.error('❌ cancelVisit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // AUTRES MÉTHODES
  // ============================================================
  getPendingVisits: async () => {
    // ... (inchangé)
    return [];
  },

  getVisitsNeedingReassign: async () => {
    // ... (inchangé)
    return [];
  },

  getVisitsByPatient: async (patientId: string) => {
    // ... (inchangé)
    return [];
  },

  clearError: () => set({ error: null }),
}));
