// 📁 src/stores/patientStore.ts
// ✅ STORE PATIENTS : SYNCHRONISATION DES ASSIGNATIONS ACTIVES (PATIENTS & COMPTES EN DIRECT COHÉRENTS)

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Patient } from '@/types';
import { useAuthStore } from './authStore';

// ============================================================
// TYPES
// ============================================================

interface PatientState {
  patients: Patient[];
  currentPatient: Patient | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  lastFetch: number | null;
  isCacheInvalidated: boolean;
  
  // Actions
  fetchPatients: (force?: boolean) => Promise<void>;
  fetchPatientById: (id: string) => Promise<void>;
  createPatient: (data: Partial<Patient>) => Promise<Patient>;
  updatePatient: (id: string, data: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  canManagePatients: () => boolean;
  clearError: () => void;
  syncAidantPatients: () => Promise<void>;
  reset: () => void;
  invalidateCache: () => void;
  refresh: () => Promise<void>;
  getActiveAidantForPatient: (patientId: string) => Promise<string | null>;
}

// ============================================================
// CONSTANTES
// ============================================================

const CACHE_DURATION = 60000; // 1 minute
const CACHE_KEY = 'sante_plus_patients_cache';

// ============================================================
// HELPERS
// ============================================================

const getCachedPatients = (): { data: Patient[]; timestamp: number } | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  } catch {
    return null;
  }
};

const setCachedPatients = (patients: Patient[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: patients,
      timestamp: Date.now(),
    }));
  } catch {
    // Ignorer les erreurs de cache
  }
};

const clearCachedPatients = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('🗑️ Cache patients invalidé');
  } catch {
    // Ignorer
  }
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

// ============================================================
// STORE
// ============================================================

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: [],
  currentPatient: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  lastFetch: null,
  isCacheInvalidated: false,

  canManagePatients: () => {
    const { profile } = useAuthStore.getState();
    return profile?.role === 'admin' || profile?.role === 'coordinator' || profile?.role === 'family';
  },

  // ✅ Invalider le cache
  invalidateCache: () => {
    clearCachedPatients();
    set({ 
      isCacheInvalidated: true,
      isInitialized: false,
      lastFetch: null,
    });
    console.log('🔄 Cache patients invalidé');
  },

  // ✅ Rafraîchir forcé
  refresh: async () => {
    get().invalidateCache();
    await get().fetchPatients(true);
  },

  // ✅ Récupérer l'aidant actif pour un patient
  getActiveAidantForPatient: async (patientId: string): Promise<string | null> => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) return null;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) return null;

      const response = await fetch(`${API_BASE_URL}/assignments/active?targetType=patient&targetId=${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return null;

      const result = await response.json();
      return result.data?.aidant_id || null;
    } catch (error) {
      console.error('❌ getActiveAidantForPatient error:', error);
      return null;
    }
  },

  // ============================================================
  // FETCH PATIENTS - CHARGEMENT INTÉGRAL DEPUIS L'API REST (BYPASSE RLS)
  // ============================================================
  fetchPatients: async (force = false) => {
    const state = get();
    
    // ✅ Si déjà en cours de chargement, ne pas recharger
    if (state.isLoading) {
      console.log('ℹ️ Déjà en cours de chargement, skip...');
      return;
    }

    // ✅ Si cache invalidé, forcer le rechargement
    if (state.isCacheInvalidated) {
      force = true;
    }

    // ✅ Si cache valide et pas forcé, utiliser le cache
    if (!force && state.lastFetch && (Date.now() - state.lastFetch < CACHE_DURATION)) {
      console.log('📦 Utilisation du cache mémoire');
      return;
    }

    // ✅ Vérifier le cache localStorage
    if (!force) {
      const cached = getCachedPatients();
      if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        console.log('📦 Utilisation du cache localStorage');
        set({ 
          patients: cached.data, 
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
      
      const { user } = useAuthStore.getState();
      
      if (!user) {
        set({ patients: [], isLoading: false, isInitialized: true });
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Session expirée');
      }

      // ✅ APPEL REST UNIFIÉ : Le backend résout proprement toutes les permissions et mappings (patients + comptes personnels suivis)
      const response = await fetch(`${API_BASE_URL}/patients`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la récupération des bénéficiaires');
      }

      const patientsData: Patient[] = await response.json();

      // Mettre à jour le cache
      const timestamp = Date.now();
      setCachedPatients(patientsData);
      
      set({
        patients: patientsData,
        isLoading: false,
        isInitialized: true,
        lastFetch: timestamp,
        error: null,
        isCacheInvalidated: false,
      });

      console.log(`✅ ${patientsData.length} bénéficiaires chargés avec succès depuis l'API REST`);

    } catch (error: any) {
      console.error('❌ Erreur récupération des patients:', error);
      
      const cached = getCachedPatients();
      if (cached && cached.data.length > 0) {
        set({
          patients: cached.data,
          isLoading: false,
          isInitialized: true,
          lastFetch: cached.timestamp,
          error: error.message || 'Erreur de chargement (cache utilisé)',
          isCacheInvalidated: false,
        });
      } else {
        set({ 
          error: error.message || 'Erreur lors du chargement des patients', 
          isLoading: false,
          isInitialized: true,
          isCacheInvalidated: false,
        });
      }
    }
  },

  // ============================================================
  // SYNC AIDANT PATIENTS - UNIFIÉ SANS DOUBLONS DE LOGIQUE
  // ============================================================
  syncAidantPatients: async () => {
    try {
      const { user, profile } = useAuthStore.getState();
      if (!user || profile?.role !== 'aidant') {
        console.log('⚠️ Pas un aidant ou non connecté');
        set({ patients: [], isLoading: false });
        return;
      }

      console.log('🔄 Synchronisation forcée des patients pour aidant:', user.id);

      // ✅ Unifier l'appel via fetchPatients(true) pour consolider les deux univers (patients et abonnés directs)
      await get().fetchPatients(true);
    } catch (error) {
      console.error('❌ Sync aidant patients error:', error);
      set({ patients: [], isLoading: false });
    }
  },

  // ============================================================
  // FETCH PATIENT BY ID - APPEL REST SÉCURISÉ
  // ============================================================
  fetchPatientById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) {
        set({ isLoading: false });
        return;
      }

      const state = get();
      const cachedPatient = state.patients.find(p => p.id === id);
      if (cachedPatient) {
        console.log('📦 Patient trouvé dans le cache');
        set({ currentPatient: cachedPatient, isLoading: false });
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Session expirée');
      }

      const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Bénéficiaire non trouvé');
      }

      const data = await response.json();
      set({ currentPatient: data, isLoading: false });
    } catch (error: any) {
      console.error('❌ Erreur récupération du proche:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  createPatient: async (data: Partial<Patient>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

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

      await supabase
        .from('patient_family_links')
        .insert({
          patient_id: patient.id,
          family_id: user.id,
          is_primary: true,
        });

      if (data.category) {
        await supabase
          .from('profiles')
          .update({ patient_category: data.category })
          .eq('id', user.id);
      }

      get().invalidateCache();
      await get().fetchPatients(true);

      set({ isLoading: false });
      return patient;
    } catch (error: any) {
      console.error('❌ Erreur création du proche:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updatePatient: async (id: string, data: Partial<Patient>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      if (profile?.role === 'aidant') {
        throw new Error('Les aidants ne peuvent pas modifier les patients');
      }

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

      get().invalidateCache();
      await get().fetchPatients(true);

      set((state) => ({
        currentPatient: patient,
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('❌ Erreur modification du proche:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deletePatient: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { profile } = useAuthStore.getState();

      if (profile?.role !== 'admin' && profile?.role !== 'coordinator') {
        throw new Error('Non autorisé à supprimer des patients');
      }

      await supabase
        .from('aidant_assignments')
        .delete()
        .eq('target_type', 'patient')
        .eq('target_id', id);

      await supabase
        .from('patient_family_links')
        .delete()
        .eq('patient_id', id);

      await supabase
        .from('patient_aidant_assignments')
        .delete()
        .eq('patient_id', id);

      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      get().invalidateCache();
      await get().fetchPatients(true);

      set({ isLoading: false });
    } catch (error: any) {
      console.error('❌ Erreur suppression du proche:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  
  reset: () => {
    clearCachedPatients();
    set({
      patients: [],
      currentPatient: null,
      isLoading: false,
      error: null,
      isInitialized: false,
      lastFetch: null,
      isCacheInvalidated: false,
    });
  },
}));

// ============================================================
// LISTENER: Recharger les patients quand l'utilisateur change
// ============================================================

let previousUserId: string | null = null;

supabase.auth.onAuthStateChange((event, session) => {
  const userId = session?.user?.id || null;
  
  if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
    if (userId && userId !== previousUserId) {
      console.log('🔄 Auth changé, rechargement des patients...');
      previousUserId = userId;
      
      usePatientStore.getState().invalidateCache();
      
      setTimeout(() => {
        usePatientStore.getState().fetchPatients(true);
      }, 500);
    }
  }
  
  if (event === 'SIGNED_OUT') {
    console.log('🚪 Déconnexion, vidage des patients...');
    previousUserId = null;
    usePatientStore.getState().reset();
  }
});

export default usePatientStore;
