// 📁 src/stores/patientStore.ts
// ✅ STORE PATIENTS : SYNCHRONISATION DES ASSIGNATIONS ACTIVES (PATIENTS & COMPTES EN DIRECT)

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
  // FETCH PATIENTS - VERSION CORRIGÉE ET ADAPTÉE
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

      // 👨‍👩‍👦 FAMILLE → Ses patients (via liens)
      else if (profile?.role === 'family') {
        console.log('👨‍👩‍👦 Famille - Récupération des patients liés');
        console.log('🔍 Family ID:', user.id);
        
        // ✅ 1. Récupérer les patients via patient_family_links
        const { data: links, error: linksError } = await supabase
          .from('patient_family_links')
          .select('patient_id')
          .eq('family_id', user.id);

        if (linksError) {
          console.error('❌ Erreur récupération liens famille:', linksError);
        }

        const patientIdsFromLinks = links?.map(l => l.patient_id).filter(Boolean) || [];
        console.log('📋 Patient IDs depuis patient_family_links:', patientIdsFromLinks);

        // ✅ 2. Si la famille a des patients
        if (patientIdsFromLinks.length > 0) {
          const { data, error } = await supabase
            .from('patients')
            .select('*')
            .in('id', patientIdsFromLinks)
            .order('created_at', { ascending: false });

          if (error) throw error;
          patientsData = data || [];
          console.log(`✅ ${patientsData.length} patients récupérés pour la famille`);
        } else {
          // Aucun patient pour ce compte
          set({ patients: [], isLoading: false, isInitialized: true });
          return;
        }
      }

      // 🦸 AIDANT → Patients et comptes personnels assignés (Foyer)
      else if (profile?.role === 'aidant') {
        console.log('🦸 Aidant - Résolution des assignations de dossiers');
        
        // Récupérer les assignations actives
        const { data: assignments, error: assignmentsError } = await supabase
          .from('aidant_assignments')
          .select('target_type, target_id')
          .eq('aidant_user_id', user.id)
          .eq('status', 'active');

        if (assignmentsError) throw assignmentsError;

        if (!assignments || assignments.length === 0) {
          set({ patients: [], isLoading: false, isInitialized: true });
          return;
        }

        const patientIds = assignments
          .filter((a: any) => a.target_type === 'patient')
          .map((a: any) => a.target_id);

        const personalAccountIds = assignments
          .filter((a: any) => a.target_type === 'personal_account' || a.target_type === 'personal')
          .map((a: any) => a.target_id);

        let finalPatients: Patient[] = [];

        // Charger les patients rattachés
        if (patientIds.length > 0) {
          const { data, error } = await supabase
            .from('patients')
            .select('*')
            .in('id', patientIds);

          if (!error && data) {
            finalPatients = [...data];
          }
        }

        // Charger les profils de comptes personnels (suivis directement sans proches)
        if (personalAccountIds.length > 0) {
          const { data: dbProfiles, error: dbProfilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone, avatar_url, patient_category')
            .in('id', personalAccountIds);
          
          if (!dbProfilesError && dbProfiles) {
            const mappedProfiles = dbProfiles.map(p => ({
              id: p.id,
              first_name: p.full_name,
              last_name: '(Compte Personnel)', // Distinction visuelle claire d'abonné
              age: null,
              gender: null,
              address: 'Adresse du compte de l\'abonné',
              phone: p.phone,
              emergency_contact: null,
              emergency_contact_name: null,
              category: (p.patient_category as any) || 'senior',
              status: 'active' as const,
              notes: 'Abonné suivi en direct sur son compte personnel',
              allergies: null,
              treatments: null,
              conditions: null,
              medical_history: null,
              preferred_language: 'fr',
              special_requirements: null,
              created_by: p.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));
            finalPatients = [...finalPatients, ...mappedProfiles];
          }
        }

        patientsData = finalPatients;
        console.log(`✅ ${patientsData.length} bénéficiaires consolidés pour l'aidant`);
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
          // ✅ FALLBACK COMPTE : Si le bénéficiaire n'est pas dans la table patients, charger son profil de compte personnel
          const { data: userProfile, error: profileErr } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone, avatar_url, patient_category')
            .eq('id', id)
            .single();

          if (!profileErr && userProfile) {
            const mappedProfile: Patient = {
              id: userProfile.id,
              first_name: userProfile.full_name,
              last_name: '(Compte Personnel)',
              age: null,
              gender: null,
              address: 'Adresse du compte de l\'abonné',
              phone: userProfile.phone,
              category: (userProfile.patient_category as any) || 'senior',
              status: 'active',
              notes: 'Abonné suivi en direct sur son compte personnel',
              preferred_language: 'fr',
              emergency_contact: null,
              emergency_contact_name: null,
              allergies: null,
              treatments: null,
              conditions: null,
              medical_history: null,
              special_requirements: null,
              created_by: userProfile.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            set({ currentPatient: mappedProfile, isLoading: false });
            return;
          }

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
        const { data: link } = await supabase
          .from('patient_family_links')
          .select('id')
          .eq('family_id', user.id)
          .eq('patient_id', id)
          .maybeSingle();
        hasAccess = !!link;
      } else if (profile?.role === 'aidant') {
        const { data: assignment } = await supabase
          .from('aidant_assignments')
          .select('id')
          .eq('aidant_user_id', user.id)
          .eq('target_id', id)
          .eq('status', 'active')
          .maybeSingle();

        if (assignment) {
          hasAccess = true;
        } else {
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
  // CREATE PATIENT - AVEC INVALIDATION DE CACHE - SANS TOAST
  // ============================================================
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

  // ============================================================
  // UPDATE PATIENT - AVEC INVALIDATION DE CACHE - SANS TOAST
  // ============================================================
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

  // ============================================================
  // DELETE PATIENT - AVEC INVALIDATION DE CACHE - SANS TOAST
  // ============================================================
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
