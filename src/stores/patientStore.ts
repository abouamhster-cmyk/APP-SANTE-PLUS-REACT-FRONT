// 📁 src/stores/patientStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Patient } from '@/types';
import { useAuthStore } from './authStore';
import { assignmentAPI } from '@/lib/api';

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

      const familyId = user.id;
      const response = await assignmentAPI.getActive('patient', patientId, familyId);
      
      if (response.data?.success && response.data?.data?.aidant_id) {
        return response.data.data.aidant_id;
      }
      return null;
    } catch (error) {
      console.error('❌ getActiveAidantForPatient error:', error);
      return null;
    }
  },

  // ============================================================
  // FETCH PATIENTS - AVEC FORCE REFRESH
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
      
      const { user, profile } = useAuthStore.getState();
      
      console.log('🔍 fetchPatients - Début (force:', force, ')');
      console.log('🔍 User ID:', user?.id);
      console.log('🔍 Role:', profile?.role);

      if (!user) {
        console.log('⚠️ Aucun utilisateur connecté');
        set({ patients: [], isLoading: false, isInitialized: true });
        return;
      }

      let patientsData: Patient[] = [];

      // 👔 ADMIN / COORDINATEUR → Tous les patients
      if (profile?.role === 'admin' || profile?.role === 'coordinator') {
        console.log('👔 Admin/Coord - Récupération de tous les patients');
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        patientsData = data || [];
        console.log(`✅ ${patientsData.length} patients récupérés pour admin`);
      }

      // 👨‍👩‍👦 FAMILLE → Ses patients via les assignations
      else if (profile?.role === 'family') {
        console.log('👨‍👩‍👦 Famille - Récupération des patients liés');
        console.log('🔍 Family ID:', user.id);
        
        // ✅ Récupérer les patients via les assignations
        // Récupérer les assignations où la famille est la cible (target_id = user.id)
        const { data: assignments, error: assignmentsError } = await supabase
          .from('aidant_assignments')
          .select('target_id, target_type')
          .eq('target_type', 'patient')
          .eq('status', 'active')
          .eq('target_id', user.id);

        if (assignmentsError) {
          console.error('❌ Erreur récupération assignations:', assignmentsError);
        }

        const patientIdsFromAssignments = assignments?.map(a => a.target_id).filter(Boolean) || [];

        // ✅ Fallback: récupérer via patient_family_links (pour compatibilité)
        const { data: links, error: linksError } = await supabase
          .from('patient_family_links')
          .select('patient_id')
          .eq('family_id', user.id);

        if (linksError) {
          console.error('❌ Erreur récupération liens famille:', linksError);
        }

        const patientIdsFromLinks = links?.map(l => l.patient_id).filter(Boolean) || [];

        // Fusionner les deux sources
        const allPatientIds = [...new Set([...patientIdsFromAssignments, ...patientIdsFromLinks])];
        console.log('📋 Patient IDs trouvés:', allPatientIds);

        if (allPatientIds.length === 0) {
          console.log('ℹ️ Aucun patient lié à cette famille');
          set({ patients: [], isLoading: false, isInitialized: true });
          return;
        }

        // Récupérer les patients
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .in('id', allPatientIds)
          .order('created_at', { ascending: false });

        if (error) throw error;
        patientsData = data || [];
        console.log(`✅ ${patientsData.length} patients récupérés pour la famille`);
      }

      // 🦸 AIDANT → Patients assignés via les assignations
      else if (profile?.role === 'aidant') {
        console.log('🦸 Aidant - Récupération des patients assignés');
        
        // ✅ Récupérer les patients via les assignations
        const { data: assignments, error: assignmentsError } = await supabase
          .from('aidant_assignments')
          .select('target_id')
          .eq('aidant_user_id', user.id)
          .eq('target_type', 'patient')
          .eq('status', 'active');

        if (assignmentsError) {
          console.error('❌ Erreur récupération assignations aidant:', assignmentsError);
        }

        let patientIds = assignments?.map(a => a.target_id).filter(Boolean) || [];

        // Fallback: via patient_family_links
        if (patientIds.length === 0) {
          const { data: links, error: linksError } = await supabase
            .from('patient_family_links')
            .select('patient_id')
            .eq('family_id', user.id);

          if (!linksError && links) {
            const ids = links.map(l => l.patient_id).filter(Boolean);
            patientIds.push(...ids);
          }
        }

        console.log('📋 Patient IDs trouvés pour aidant:', patientIds);

        if (patientIds.length === 0) {
          console.log('ℹ️ Aucun patient assigné à cet aidant');
          set({ patients: [], isLoading: false, isInitialized: true });
          return;
        }

        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .in('id', patientIds)
          .order('created_at', { ascending: false });

        if (error) throw error;
        patientsData = data || [];
        console.log(`✅ ${patientsData.length} patients récupérés pour l'aidant`);
      }

      // Fallback
      else {
        console.log('⚠️ Rôle non reconnu, récupération de tous les patients');
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        patientsData = data || [];
      }

      // ✅ Mettre à jour le cache
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

      console.log(`✅ ${patientsData.length} patients chargés avec succès`);

    } catch (error: any) {
      console.error('❌ Erreur récupération des patients:', error);
      
      // ✅ En cas d'erreur, essayer d'utiliser le cache
      const cached = getCachedPatients();
      if (cached && cached.data.length > 0) {
        console.log('⚠️ Utilisation du cache en cas d\'erreur');
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
  // SYNC AIDANT PATIENTS - AVEC NOUVEAU SYSTÈME
  // ============================================================
  syncAidantPatients: async () => {
    try {
      const { user, profile } = useAuthStore.getState();
      if (!user || profile?.role !== 'aidant') {
        console.log('⚠️ Pas un aidant ou non connecté');
        set({ patients: [], isLoading: false });
        return;
      }

      console.log('🔄 Synchronisation des patients pour aidant:', user.id);

      // ✅ Récupérer les patients via les assignations
      const { data: assignments, error: assignmentsError } = await supabase
        .from('aidant_assignments')
        .select('target_id')
        .eq('aidant_user_id', user.id)
        .eq('target_type', 'patient')
        .eq('status', 'active');

      if (assignmentsError) {
        console.error('❌ Erreur récupération assignations:', assignmentsError);
      }

      let patientIds = assignments?.map(a => a.target_id).filter(Boolean) || [];

      // Fallback: via patient_family_links
      if (patientIds.length === 0) {
        const { data: links, error: linksError } = await supabase
          .from('patient_family_links')
          .select('patient_id')
          .eq('family_id', user.id);

        if (!linksError && links) {
          patientIds = links.map(l => l.patient_id).filter(Boolean);
        }
      }

      console.log('📋 Patient IDs trouvés:', patientIds);

      if (patientIds.length === 0) {
        console.log('ℹ️ Aucun patient assigné à cet aidant');
        set({ patients: [], isLoading: false });
        return;
      }

      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('*')
        .in('id', patientIds);

      if (patientsError) {
        console.error('❌ Erreur récupération patients:', patientsError);
        set({ patients: [], isLoading: false });
        return;
      }

      console.log(`✅ ${patients?.length || 0} patients synchronisés`);
      
      // ✅ Mettre à jour le cache
      setCachedPatients(patients || []);
      set({ 
        patients: patients || [], 
        isLoading: false,
        lastFetch: Date.now(),
        isCacheInvalidated: false,
      });
      
      return;
    } catch (error) {
      console.error('❌ Sync aidant patients error:', error);
      set({ patients: [], isLoading: false });
      return;
    }
  },

  // ============================================================
  // FETCH PATIENT BY ID
  // ============================================================
  fetchPatientById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) {
        set({ isLoading: false });
        return;
      }

      // ✅ Vérifier si le patient est déjà dans le cache
      const state = get();
      const cachedPatient = state.patients.find(p => p.id === id);
      if (cachedPatient) {
        console.log('📦 Patient trouvé dans le cache');
        set({ currentPatient: cachedPatient, isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          set({ error: 'Patient non trouvé', isLoading: false });
          return;
        }
        throw error;
      }

      // ✅ Vérifier les permissions
      let hasAccess = false;

      if (profile?.role === 'admin' || profile?.role === 'coordinator') {
        hasAccess = true;
      } else if (profile?.role === 'family') {
        // Vérifier via les assignations
        const { data: assignment } = await supabase
          .from('aidant_assignments')
          .select('id')
          .eq('target_type', 'patient')
          .eq('target_id', id)
          .eq('status', 'active')
          .maybeSingle();

        if (assignment) {
          hasAccess = true;
        } else {
          // Fallback: via patient_family_links
          const { data: link } = await supabase
            .from('patient_family_links')
            .select('id')
            .eq('family_id', user.id)
            .eq('patient_id', id)
            .maybeSingle();
          hasAccess = !!link;
        }
      } else if (profile?.role === 'aidant') {
        // Vérifier via les assignations
        const { data: assignment } = await supabase
          .from('aidant_assignments')
          .select('id')
          .eq('aidant_user_id', user.id)
          .eq('target_type', 'patient')
          .eq('target_id', id)
          .eq('status', 'active')
          .maybeSingle();

        if (assignment) {
          hasAccess = true;
        } else {
          // Fallback: via patient_family_links
          const { data: link } = await supabase
            .from('patient_family_links')
            .select('id')
            .eq('family_id', user.id)
            .eq('patient_id', id)
            .maybeSingle();
          hasAccess = !!link;
        }
      }

      if (!hasAccess) {
        set({ error: 'Accès non autorisé à ce patient', isLoading: false });
        return;
      }

      set({ currentPatient: data, isLoading: false });
    } catch (error: any) {
      console.error('❌ Erreur récupération du proche:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // ============================================================
  // CREATE PATIENT - AVEC INVALIDATION DE CACHE
  // ============================================================
  createPatient: async (data: Partial<Patient>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      if (profile?.role === 'aidant') {
        throw new Error('Les aidants ne peuvent pas créer de patients');
      }

      // ✅ Créer le patient
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

      // ✅ Lier le patient à la famille (via patient_family_links pour compatibilité)
      await supabase
        .from('patient_family_links')
        .insert({
          patient_id: patient.id,
          family_id: user.id,
          is_primary: true,
        });

      // ✅ Mettre à jour la catégorie du profil
      if (data.category) {
        await supabase
          .from('profiles')
          .update({ patient_category: data.category })
          .eq('id', user.id);
      }

      // ✅ INVALIDER LE CACHE
      get().invalidateCache();

      // ✅ Recharger les données
      await get().fetchPatients(true);

      set({ isLoading: false });

      return patient;
    } catch (error: any) {
      console.error('❌ Erreur création du proche:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // ============================================================
  // UPDATE PATIENT - AVEC INVALIDATION DE CACHE
  // ============================================================
  updatePatient: async (id: string, data: Partial<Patient>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      if (profile?.role === 'aidant') {
        throw new Error('Les aidants ne peuvent pas modifier les patients');
      }

      // ✅ Vérifier les permissions
      let canEdit = false;

      if (profile?.role === 'admin' || profile?.role === 'coordinator') {
        canEdit = true;
      } else if (profile?.role === 'family') {
        // Vérifier via les assignations
        const { data: assignment } = await supabase
          .from('aidant_assignments')
          .select('id')
          .eq('target_type', 'patient')
          .eq('target_id', id)
          .eq('status', 'active')
          .maybeSingle();

        if (assignment) {
          canEdit = true;
        } else {
          // Fallback: via patient_family_links
          const { data: link } = await supabase
            .from('patient_family_links')
            .select('id')
            .eq('family_id', user.id)
            .eq('patient_id', id)
            .maybeSingle();
          canEdit = !!link;
        }
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

      // ✅ INVALIDER LE CACHE
      get().invalidateCache();

      // ✅ Recharger les données
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

  // ============================================================
  // DELETE PATIENT - AVEC INVALIDATION DE CACHE
  // ============================================================
  deletePatient: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { profile } = useAuthStore.getState();

      if (profile?.role !== 'admin' && profile?.role !== 'coordinator') {
        throw new Error('Non autorisé à supprimer des patients');
      }

      // ✅ Supprimer les assignations liées
      await supabase
        .from('aidant_assignments')
        .delete()
        .eq('target_type', 'patient')
        .eq('target_id', id);

      // ✅ Supprimer les liens
      await supabase
        .from('patient_family_links')
        .delete()
        .eq('patient_id', id);

      await supabase
        .from('patient_aidant_assignments')
        .delete()
        .eq('patient_id', id);

      // ✅ Supprimer le patient
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // ✅ INVALIDER LE CACHE
      get().invalidateCache();

      // ✅ Recharger les données
      await get().fetchPatients(true);

      set({ isLoading: false });
    } catch (error: any) {
      console.error('❌ Erreur suppression du proche:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // ============================================================
  // UTILITIES
  // ============================================================
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
      
      // ✅ Invalider le cache
      usePatientStore.getState().invalidateCache();
      
      // Attendre que l'utilisateur soit complètement chargé
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

// ============================================================
// EXPORT PAR DÉFAUT
// ============================================================

export default usePatientStore;
