// 📁 src/stores/locationStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './authStore';

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
    
    // ✅ Spécifier la clé étrangère explicite
    const { data: visits, error } = await supabase
      .from('visites')
      .select(`
        *,
        patient:patients!visites_patient_id_fkey(*)
      `)
      .eq('status', 'en_cours');

    if (error) {
      console.error('❌ Erreur fetch active visits:', error);
      set({ error: error.message, isLoading: false });
      return;
    }

      // ✅ ÉTAPE 2 : Récupérer les patients SEPAREMENT
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

      // ✅ ÉTAPE 3 : Récupérer les aidants SEPAREMENT
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

      // ✅ ÉTAPE 4 : Fusionner les données
      const visitsWithRelations = (visits || []).map((visit) => ({
        ...visit,
        patient: visit.patient_id ? patientMap[visit.patient_id] || null : null,
        aidant: visit.aidant_id ? aidantMap[visit.aidant_id] || null : null,
      }));

      set({ activeVisits: visitsWithRelations || [], isLoading: false });

      // ✅ ÉTAPE 5 : Positions des patients
      const patients = visitsWithRelations
        .filter(v => v.patient)
        .map(v => ({
          id: v.patient.id,
          ...v.patient,
          latitude: v.patient.latitude || 6.3703,
          longitude: v.patient.longitude || 2.3912,
        }));

      // ✅ ÉTAPE 6 : Positions des aidants
      const aidants = visitsWithRelations
        .filter(v => v.aidant?.user)
        .map(v => ({
          id: v.aidant.user.id,
          full_name: v.aidant.user.full_name,
          latitude: 6.36 + Math.random() * 0.02,
          longitude: 2.38 + Math.random() * 0.02,
        }));

      set({
        locations: { 
          patients, 
          aidants: aidants.filter(a => a !== null) 
        },
        isLoading: false,
      });
    } catch (error: any) {
      console.error('❌ Fetch active visits error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  startTracking: () => {
    if (!navigator.geolocation) {
      console.warn('⚠️ Geolocation not supported');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await get().updateLocation(latitude, longitude);
      },
      (error) => {
        console.error('❌ Geolocation error:', error);
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

      await supabase
        .from('profiles')
        .update({
          last_latitude: lat,
          last_longitude: lng,
          last_location_update: new Date().toISOString(),
        })
        .eq('id', user.id);

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
            .maybeSingle();

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
      console.error('❌ Update location error:', error);
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
