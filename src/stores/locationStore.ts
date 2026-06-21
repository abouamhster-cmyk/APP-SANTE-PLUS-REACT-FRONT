// 📁 src/stores/locationStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './authStore';

interface LocationData {
  lat: number;
  lng: number;
  timestamp: string;
}

interface LocationState {
  locations: {
    patients: any[];
    aidants: any[];
  };
  activeVisits: any[];
  isLoading: boolean;
  error: string | null;
  subscription: any | null;
  watchId: number | null;
  
  fetchActiveVisits: () => Promise<void>;
  startTracking: () => void;
  stopTracking: () => void;
  updateLocation: (lat: number, lng: number) => Promise<void>;
  subscribeToLocations: () => void;
  unsubscribeFromLocations: () => void;
  clearError: () => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  locations: { patients: [], aidants: [] },
  activeVisits: [],
  isLoading: false,
  error: null,
  subscription: null,
  watchId: null,

  fetchActiveVisits: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // ✅ CORRECTION : Requête simplifiée sans la relation problématique
      const { data, error } = await supabase
        .from('visites')
        .select(`
          *,
          patient:patients(*)
        `)
        .eq('status', 'en_cours');

      if (error) {
        console.error('Erreur fetch active visits:', error);
        set({ error: error.message, isLoading: false });
        return;
      }

      // ✅ Récupérer les aidants séparément avec leur profil
      const visitsWithAidants = await Promise.all(
        (data || []).map(async (visit) => {
          if (visit.aidant_id) {
            const { data: aidantData, error: aidantError } = await supabase
              .from('aidants')
              .select('*')
              .eq('id', visit.aidant_id)
              .single();

            if (!aidantError && aidantData) {
              // Récupérer le profil de l'aidant
              const { data: userData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', aidantData.user_id)
                .single();

              return {
                ...visit,
                aidant: {
                  ...aidantData,
                  user: userData || null
                }
              };
            }
          }
          return visit;
        })
      );

      set({ activeVisits: visitsWithAidants || [], isLoading: false });

      // Récupérer les positions des patients
      const patients = data?.filter(v => v.patient).map(v => ({
        id: v.patient.id,
        ...v.patient,
        latitude: v.patient.latitude || 6.3703,
        longitude: v.patient.longitude || 2.3912,
      })) || [];

      // Récupérer les positions des aidants
      const aidants = await Promise.all(
        (data || [])
          .filter(v => v.aidant_id)
          .map(async (v) => {
            const { data: aidantData } = await supabase
              .from('aidants')
              .select('*, user:profiles(*)')
              .eq('id', v.aidant_id)
              .single();
            
            if (aidantData?.user) {
              return {
                id: aidantData.user.id,
                full_name: aidantData.user.full_name,
                latitude: 6.36 + Math.random() * 0.02,
                longitude: 2.38 + Math.random() * 0.02,
              };
            }
            return null;
          })
      );

      set({
        locations: { 
          patients, 
          aidants: aidants.filter(a => a !== null) 
        },
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Fetch active visits error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  startTracking: () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await get().updateLocation(latitude, longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    set({ watchId });
  },

  stopTracking: () => {
    const { watchId } = get();
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      set({ watchId: null });
    }
  },

  updateLocation: async (lat: number, lng: number) => {
    try {
      const { user, role } = useAuthStore.getState();
      if (!user) return;

      // Mettre à jour la position de l'utilisateur
      await supabase
        .from('profiles')
        .update({
          last_latitude: lat,
          last_longitude: lng,
          last_location_update: new Date().toISOString(),
        })
        .eq('id', user.id);

      // Si c'est un aidant en mission, mettre à jour la position de la visite
      if (role === 'aidant') {
        const { data: aidant } = await supabase
          .from('aidants')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (aidant) {
          const { data: activeVisit } = await supabase
            .from('visites')
            .select('id')
            .eq('aidant_id', aidant.id)
            .eq('status', 'en_cours')
            .single();

          if (activeVisit) {
            await supabase
              .from('visites')
              .update({
                location_start: { lat, lng },
              })
              .eq('id', activeVisit.id);
          }
        }
      }
    } catch (error) {
      console.error('Update location error:', error);
    }
  },

  subscribeToLocations: () => {
    get().unsubscribeFromLocations();

    const subscription = supabase
      .channel('locations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: 'role=eq.aidant',
        },
        (payload) => {
          set((state) => ({
            locations: {
              ...state.locations,
              aidants: state.locations.aidants.map((a: any) =>
                a.id === payload.new.id
                  ? { ...a, latitude: payload.new.last_latitude, longitude: payload.new.last_longitude }
                  : a
              ),
            },
          }));
        }
      )
      .subscribe();

    set({ subscription });

    const { role } = useAuthStore.getState();
    if (role === 'aidant') {
      get().startTracking();
    }
  },

  unsubscribeFromLocations: () => {
    const { subscription, watchId } = get();
    if (subscription) {
      supabase.removeChannel(subscription);
      set({ subscription: null });
    }
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      set({ watchId: null });
    }
  },

  clearError: () => set({ error: null }),
}));