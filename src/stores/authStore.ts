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
  isAidant: () => boolean;
  isFamily: () => boolean;
  isAdminOrCoordinator: () => boolean;
}

const initialState = {
  user: null,
  profile: null,
  role: null,
  isAuthenticated: false,
};

let isInitializing = false;

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

const profileCache = new Map<string, { data: Profile; timestamp: number }>();
const CACHE_DURATION = 60000;

const fetchProfileSafe = async (userId: string): Promise<Profile | null> => {
  try {
    const cached = profileCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('✅ Profil récupéré depuis le cache');
      return cached.data;
    }

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

      isAidant: () => {
        const { profile } = get();
        return profile?.role === 'aidant';
      },

      isFamily: () => {
        const { profile } = get();
        return profile?.role === 'family';
      },

      isAdminOrCoordinator: () => {
        const { profile } = get();
        return profile?.role === 'admin' || profile?.role === 'coordinator';
      },

      initialize: async () => {
        const state = get();

        if (state.isInitializing || isInitializing) {
          console.log('ℹ️ Auth already initializing, skipping...');
          return;
        }

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

          const fallbackProfile = makeFallbackProfile(session.user);

          set({
            user: session.user,
            profile: fallbackProfile,
            role: fallbackProfile.role ? (fallbackProfile.role as UserRole) : 'family',
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
            isInitializing: false,
          });

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

      logout: async () => {
        try {
          await supabase.auth.signOut();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
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

      switchRole: async (role: UserRole) => {
        const { user, profile } = get();

        if (!user) {
          throw new Error('No user');
        }

        // ❌ Les aidants ne peuvent pas changer de rôle
        if (profile?.role === 'aidant') {
          throw new Error('Les aidants ne peuvent pas changer de rôle');
        }

        const allowedRoles = ['family', 'coordinator'];
        if (role === 'admin' && profile?.role !== 'admin') {
          throw new Error('Non autorisé à passer en admin');
        }

        if (!allowedRoles.includes(role) && role !== 'admin') {
          throw new Error('Rôle invalide');
        }

        const { error } = await supabase
          .from('profiles')
          .update({ role })
          .eq('id', user.id);

        if (error) {
          console.error('Switch role error:', error);
          throw error;
        }

        profileCache.delete(user.id);

        const newProfile = await fetchProfileSafe(user.id);

        if (!newProfile) {
          throw new Error('Profil introuvable après changement de rôle');
        }

        set({
          role,
          profile: newProfile,
        });
      },

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

let authListenerInitialized = false;

supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('🔐 Auth state change:', event, session?.user?.id);

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
    const currentProfile =
      currentState.profile?.id === session.user.id ? currentState.profile : null;

    const fallbackProfile =
      currentProfile || makeFallbackProfile(session.user);

    useAuthStore.setState({
      user: session.user,
      profile: fallbackProfile,
      role: fallbackProfile.role ? (fallbackProfile.role as UserRole) : 'family',
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      isInitializing: false,
    });

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
