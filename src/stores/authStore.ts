// 📁 src/stores/authStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { Profile, UserRole } from '@/types';

interface AuthState {
  user: any | null;
  profile: Profile | null;
  role: UserRole | null;

  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isInitializing: boolean;

  setUser: (user: any | null, profile: Profile | null) => void;
  setRole: (role: UserRole) => void;
  setProfile: (profile: Profile) => void;

  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

const initialState = {
  user: null,
  profile: null,
  role: null,
  isAuthenticated: false,
};

// ✅ Flag pour éviter les doubles initialisations
let isInitializing = false;

// ✅ Timeout
const withTimeout = async <T,>(
  request: PromiseLike<T>,
  timeoutMs = 8000
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Timeout Supabase request'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([Promise.resolve(request), timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

// ✅ Fallback profil - TOUTES LES PROPRIÉTÉS REQUISES
const makeFallbackProfile = (user: any): Profile => {
  return {
    id: user.id,
    full_name:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Utilisateur',
    email: user.email || '',
    phone: user.user_metadata?.phone || null,
    role: (user.user_metadata?.role as UserRole) || 'family',
    avatar_url: null,
    patient_category: user.user_metadata?.patient_category || null,
    proche_category: user.user_metadata?.patient_category || null,
    last_latitude: null,
    last_longitude: null,
    last_location_update: null,
    is_active: true,
    email_verified: false,
    phone_verified: false,
    preferences: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

// ✅ Profil cache
const profileCache = new Map<string, { data: Profile; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

// ✅ fetchProfileSafe optimisé
const fetchProfileSafe = async (userId: string): Promise<Profile | null> => {
  try {
    // Vérifier le cache
    const cached = profileCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('✅ Profil récupéré depuis le cache');
      return cached.data;
    }

    // Requête légère - seulement les champs nécessaires
    const result = await withTimeout(
      supabase
        .from('profiles')
        .select('id, full_name, email, phone, role, is_active, patient_category, avatar_url, last_latitude, last_longitude, last_location_update, email_verified, phone_verified, preferences, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle(),
      5000
    );

    const { data, error } = result;

    if (error) {
      console.error('❌ Profile fetch error:', error);
      return null;
    }

    if (data) {
      // ✅ S'assurer que toutes les propriétés sont présentes
      const fullProfile: Profile = {
        id: data.id,
        full_name: data.full_name || '',
        email: data.email || '',
        phone: data.phone || null,
        role: data.role || 'family',
        avatar_url: data.avatar_url || null,
        patient_category: data.patient_category || null,
        proche_category: data.patient_category || null,
        last_latitude: data.last_latitude || null,
        last_longitude: data.last_longitude || null,
        last_location_update: data.last_location_update || null,
        is_active: data.is_active ?? true,
        email_verified: data.email_verified ?? false,
        phone_verified: data.phone_verified ?? false,
        preferences: data.preferences || {},
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
      };

      // Mettre en cache
      profileCache.set(userId, { data: fullProfile, timestamp: Date.now() });
      return fullProfile;
    }

    return null;
  } catch (error) {
    console.error('❌ Profile fetch error:', error);
    return null;
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      isLoading: true,
      isInitialized: false,
      isInitializing: false,

      setUser: (user, profile) => {
        console.log('📝 setUser:', user?.id || null, profile?.role || null);

        set({
          user,
          profile,
          role: profile?.role ? (profile.role as UserRole) : null,
          isAuthenticated: !!user,
          isLoading: false,
          isInitialized: true,
          isInitializing: false,
        });
      },

      setRole: (role) => {
        set({ role });
      },

      setProfile: (profile) => {
        set({
          profile,
          role: profile?.role ? (profile.role as UserRole) : null,
        });
      },

      // =============================================
      // INITIALIZE - AVEC VÉRIFICATION DE DOUBLE INIT
      // =============================================
      initialize: async () => {
        const state = get();

        // ✅ Vérifier si déjà initialisé ou en cours
        if (state.isInitializing || isInitializing) {
          console.log('ℹ️ Auth already initializing, skipping...');
          return;
        }

        // ✅ Vérifier si déjà initialisé avec succès
        if (state.isInitialized && state.isAuthenticated) {
          console.log('ℹ️ Auth already initialized, skipping...');
          return;
        }

        console.log('🔄 Initializing auth...');

        isInitializing = true;

        set({
          isLoading: true,
          isInitializing: true,
        });

        try {
          // 1. Récupérer la session
          const { data, error } = await withTimeout(
            supabase.auth.getSession(),
            8000
          );

          if (error) {
            console.error('❌ Session error:', error);
            set({
              user: null,
              profile: null,
              role: null,
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
              isInitializing: false,
            });
            isInitializing = false;
            return;
          }

          const session = data?.session;

          if (!session?.user) {
            console.log('ℹ️ No active session');
            set({
              user: null,
              profile: null,
              role: null,
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
              isInitializing: false,
            });
            isInitializing = false;
            return;
          }

          console.log('✅ Active session:', session.user.id);

          // 2. Créer un profil fallback IMMÉDIAT
          const fallbackProfile = makeFallbackProfile(session.user);

          // 3. CONNECTER L'UTILISATEUR IMMÉDIATEMENT
          set({
            user: session.user,
            profile: fallbackProfile,
            role: fallbackProfile.role ? (fallbackProfile.role as UserRole) : 'family',
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
            isInitializing: false,
          });

          // 4. CHARGER LE VRAI PROFIL EN ARRIÈRE-PLAN
          const profile = await fetchProfileSafe(session.user.id);

          if (profile) {
            set({
              profile,
              role: profile.role ? (profile.role as UserRole) : 'family',
              isAuthenticated: true,
            });
            console.log('✅ Profil récupéré avec succès');
          } else {
            console.warn('⚠️ Profil non récupéré, fallback conservé');
          }

        } catch (error) {
          console.error('❌ Auth initialization error:', error);

          // ✅ Si on a déjà un utilisateur, on garde le fallback
          const currentUser = get().user;
          if (currentUser) {
            const fallbackProfile = makeFallbackProfile(currentUser);
            set({
              user: currentUser,
              profile: fallbackProfile,
              role: fallbackProfile.role ? (fallbackProfile.role as UserRole) : 'family',
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
              isInitializing: false,
            });
            isInitializing = false;
            return;
          }

          set({
            user: null,
            profile: null,
            role: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
            isInitializing: false,
          });
        } finally {
          isInitializing = false;
          set({
            isLoading: false,
            isInitialized: true,
            isInitializing: false,
          });
          console.log('✅ Auth initialization finished');
        }
      },

      // =============================================
      // REFRESH PROFILE
      // =============================================
      refreshProfile: async () => {
        const { user } = get();

        if (!user) return;

        const profile = await fetchProfileSafe(user.id);

        if (!profile) {
          console.warn('⚠️ refreshProfile: profil non récupéré');
          return;
        }

        set({
          profile,
          role: profile.role ? (profile.role as UserRole) : 'family',
        });
      },

      // =============================================
      // LOGOUT
      // =============================================
      logout: async () => {
        try {
          await supabase.auth.signOut();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // ✅ Vider le cache
          profileCache.clear();
          localStorage.removeItem('auth-storage');

          set({
            ...initialState,
            isLoading: false,
            isInitialized: true,
            isInitializing: false,
          });

          window.location.href = '/login';
        }
      },

      // =============================================
      // SWITCH ROLE
      // =============================================
      switchRole: async (role: UserRole) => {
        const { user } = get();

        if (!user) {
          throw new Error('No user');
        }

        const { error } = await supabase
          .from('profiles')
          .update({ role })
          .eq('id', user.id);

        if (error) {
          console.error('Switch role error:', error);
          throw error;
        }

        // ✅ Vider le cache pour forcer le rechargement
        profileCache.delete(user.id);

        const profile = await fetchProfileSafe(user.id);

        if (!profile) {
          throw new Error('Profil introuvable après changement de rôle');
        }

        set({
          role,
          profile,
        });
      },

      // =============================================
      // UPDATE PROFILE
      // =============================================
      updateProfile: async (data: Partial<Profile>) => {
        const { user } = get();

        if (!user) {
          throw new Error('No user');
        }

        const { error } = await supabase
          .from('profiles')
          .update(data)
          .eq('id', user.id);

        if (error) {
          console.error('Update profile error:', error);
          throw error;
        }

        // ✅ Vider le cache
        profileCache.delete(user.id);

        set((state) => ({
          profile: state.profile ? { ...state.profile, ...data } : null,
        }));
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
        isInitialized: state.isInitialized,
      }),
    }
  )
);

// =============================================
// AUTH STATE CHANGE LISTENER - OPTIMISÉ
// =============================================
let authListenerInitialized = false;

supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('🔐 Auth state change:', event, session?.user?.id);

  // ✅ Éviter les doublons de traitement
  if (authListenerInitialized && event === 'SIGNED_IN') {
    console.log('ℹ️ Auth listener déjà initialisé, skip...');
    return;
  }

  if (event === 'SIGNED_OUT') {
    profileCache.clear();
    useAuthStore.setState({
      user: null,
      profile: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
      isInitializing: false,
    });
    authListenerInitialized = false;
    return;
  }

  if (session?.user) {
    const currentState = useAuthStore.getState();

    // ✅ Vérifier si le profil existe déjà
    const currentProfile =
      currentState.profile?.id === session.user.id ? currentState.profile : null;

    const fallbackProfile =
      currentProfile || makeFallbackProfile(session.user);

    // ✅ Connexion immédiate avec fallback
    useAuthStore.setState({
      user: session.user,
      profile: fallbackProfile,
      role: fallbackProfile.role ? (fallbackProfile.role as UserRole) : 'family',
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      isInitializing: false,
    });

    // ✅ Chargement du vrai profil en arrière-plan (seulement si pas déjà fait)
    if (!currentProfile) {
      const profile = await fetchProfileSafe(session.user.id);

      if (profile) {
        useAuthStore.setState({
          profile,
          role: profile.role ? (profile.role as UserRole) : 'family',
          isAuthenticated: true,
        });
      } else {
        console.warn('⚠️ Auth state: profil non récupéré, fallback conservé');
      }
    }

    authListenerInitialized = true;
  }
});