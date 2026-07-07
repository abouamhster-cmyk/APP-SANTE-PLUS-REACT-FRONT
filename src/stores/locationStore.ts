// 📁 src/stores/locationStore.ts
// ✅ GESTION DES POSITIONS GPS ET DU TRACKING EN TEMPS RÉEL (COHÉRENT AVEC LA TRAJECTOIRE)

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

const DEFAULT_CENTER = { lat: 6.3703, lng: 2.3912 };

export const useLocationStore = create<LocationState>((set, get) => ({
  locations: { patients: [], aidants: [] },
  activeVisits: [],
  isLoading: false,
  error: null,
  subscription: null,
  watchId: null,

  // ============================================================
  // RECUPERER LES VISITES ET POSITIONS ACTIVES
  // ============================================================
  fetchActiveVisits: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // ✅ 1. Récupérer les visites en cours
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

      // ✅ 2. Récupérer les patients séparément
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

      // ✅ 3. Récupérer les aidants séparément avec leurs profils
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

      // ✅ 4. Fusionner les visites et les relations
      const visitsWithRelations = (visits || []).map((visit) => ({
        ...visit,
        patient: visit.patient_id ? patientMap[visit.patient_id] || null : null,
        aidant: visit.aidant_id ? aidantMap[visit.aidant_id] || null : null,
      }));

      set({ activeVisits: visitsWithRelations || [], isLoading: false });

      // ✅ 5. Extraire les coordonnées réelles des patients
      const patients = visitsWithRelations
        .filter(v => v.patient)
        .map(v => ({
          id: v.patient.id,
          ...v.patient,
          latitude: v.patient.latitude || DEFAULT_CENTER.lat,
          longitude: v.patient.longitude || DEFAULT_CENTER.lng,
        }));

      // ✅ 6. Extraire les coordonnées réelles de l'aidant (issues de son profile)
      const aidants = visitsWithRelations
        .filter(v => v.aidant?.user)
        .map(v => {
          const profileData = v.aidant.user;
          return {
            id: profileData.id,
            full_name: profileData.full_name,
            latitude: profileData.last_latitude || DEFAULT_CENTER.lat,
            longitude: profileData.last_longitude || DEFAULT_CENTER.lng,
          };
        });

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

  // ============================================================
  // ENREGISTREMENT GPS GENERAL DE L'AIDANT
  // ============================================================
  startTracking: () => {
    if (!navigator.geolocation) {
      console.warn('⚠️ La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await get().updateLocation(latitude, longitude);
      },
      (error) => {
        console.error('❌ Erreur de géolocalisation:', error);
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

      // 1. Mettre à jour la dernière position globale de l'aidant
      await supabase
        .from('profiles')
        .update({
          last_latitude: lat,
          last_longitude: lng,
          last_location_update: new Date().toISOString(),
        })
        .eq('id', user.id);

      // 2. Si l'utilisateur est un aidant actif, mettre à jour la visite en cours
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
            // Sauvegarder la position de départ de la visite si vide
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

  // ============================================================
  // ABONNEMENT EN DIRECT AUX CHANGEMENTS DE POSITION
  // ============================================================
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
          // Mise à jour de la position de l'aidant sur la carte en temps réel
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
