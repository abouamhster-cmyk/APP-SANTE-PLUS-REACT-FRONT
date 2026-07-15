// 📁 src/stores/locationStore.ts
// ✅ STORE GPS OPTIMISÉ : APPELS VIA API REST POUR CONTOURNER LES RESTRICTIONS RLS EN PRODUCTION

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './authStore';
import api from '@/lib/api'; // 🟢 Import de l'instance API pour les requêtes REST sécurisées

interface LocationState {
  locations: {
    patients: any[];
    aidants: any[];
  };
  activeVisits: any[];
  activeOrders: any[];
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

// Coordonnées par défaut (Cotonou) en cas d'absence de données GPS
const DEFAULT_LAT = 6.3703;
const DEFAULT_LNG = 2.3912;

export const useLocationStore = create<LocationState>((set, get) => ({
  locations: { patients: [], aidants: [] },
  activeVisits: [],
  activeOrders: [],
  isLoading: false,
  error: null,
  subscription: null,
  watchId: null,

  // ✅ RECUPERATION VIA L'API REST (Résout les jointures d'aidants de manière robuste et sécurisée)
  fetchActiveVisits: async () => {
    if (get().isLoading) return;

    try {
      set({ isLoading: true, error: null });
      
      // Appel des routes REST du serveur (qui contournent les limitations RLS du client de base de données)
      const [visitsResponse, ordersResponse] = await Promise.all([
        api.get('/visits'),
        api.get('/orders')
      ]);

      const allVisits = visitsResponse.data || [];
      const allOrders = ordersResponse.data || [];

      // Filtrer uniquement les visites et commandes en cours de livraison/missions active ('en_cours')
      const activeVisits = allVisits.filter((v: any) => v.status === 'en_cours');
      const activeOrders = allOrders.filter((o: any) => o.status === 'en_cours');

      // Extraire et cartographier les patients et aidants concernés
      const patientsMap: Record<string, any> = {};
      const aidantsMap: Record<string, any> = {};

      activeVisits.forEach((v: any) => {
        if (v.patient) patientsMap[v.patient.id] = v.patient;
        if (v.aidant) aidantsMap[v.aidant.id] = v.aidant;
      });

      activeOrders.forEach((o: any) => {
        if (o.patient) patientsMap[o.patient.id] = o.patient;
        if (o.aidant) aidantsMap[o.aidant.id] = o.aidant;
      });

      const patients = Object.values(patientsMap).map((p: any) => ({
        ...p,
        latitude: Number(p.latitude) || DEFAULT_LAT,
        longitude: Number(p.longitude) || DEFAULT_LNG,
      }));

      const aidants = Object.values(aidantsMap).map((a: any) => ({
        id: a.user_id,
        full_name: a.user?.full_name || 'Intervenant',
        latitude: Number(a.user?.last_latitude) || DEFAULT_LAT,
        longitude: Number(a.user?.last_longitude) || DEFAULT_LNG,
      }));

      set({ 
        activeVisits, 
        activeOrders,
        locations: { patients, aidants },
        isLoading: false 
      });

    } catch (error: any) {
      console.error('❌ Fetch active items error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  startTracking: () => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => get().updateLocation(pos.coords.latitude, pos.coords.longitude),
      (err) => console.error("GPS Watch Error:", err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
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

      // Update Profile
      await supabase.from('profiles').update({
        last_latitude: lat,
        last_longitude: lng,
        last_location_update: new Date().toISOString(),
      }).eq('id', user.id);

      // Update Active Missions if Aidant
      if (role === 'aidant') {
        const { data: aidant } = await supabase.from('aidants').select('id').eq('user_id', user.id).single();
        if (aidant) {
          // Mise à jour de la localisation dans la visite active
          await supabase.from('visites').update({ location_start: { lat, lng } }).eq('aidant_id', aidant.id).eq('status', 'en_cours');
        }
      }
    } catch (error) {
      console.error('❌ Update location error:', error);
    }
  },

  subscribeToLocations: () => {
    if (get().subscription) return;

    const channel = supabase
      .channel('locations')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        set((state) => ({
          locations: {
            ...state.locations,
            aidants: state.locations.aidants.map((a: any) =>
              a.id === payload.new.id ? { ...a, latitude: payload.new.last_latitude, longitude: payload.new.last_longitude } : a
            ),
          },
        }));
      })
      .subscribe();
    set({ subscription: channel });
  },

  unsubscribeFromLocations: () => {
    const { subscription } = get();
    if (subscription) {
      supabase.removeChannel(subscription);
      set({ subscription: null });
    }
  },

  clearError: () => set({ error: null }),
}));
