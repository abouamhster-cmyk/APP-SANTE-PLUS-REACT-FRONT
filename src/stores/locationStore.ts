// 📁 src/stores/locationStore.ts
// ✅ STORE GPS OPTIMISÉ POUR GOOGLE MAPS : SÉCURISATION DES COORDONNÉES ET SUIVI TEMPS RÉEL

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './authStore';

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

  fetchActiveVisits: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // 1️⃣ Récupérer visites et commandes en cours
      const { data: visits, error: visitError } = await supabase
        .from('visites')
        .select('*, patient:patients!visites_patient_id_fkey(*)')
        .eq('status', 'en_cours');

      const { data: orders, error: orderError } = await supabase
        .from('commandes')
        .select('*, patient:patients(*)')
        .eq('status', 'en_cours');

      if (visitError || orderError) throw visitError || orderError;

      // 2️⃣ Extraction des IDs pour enrichir
      const patientIds = [...new Set([...(visits || []), ...(orders || [])].map(item => item.patient_id).filter(Boolean))];
      const aidantIds = [...new Set([...(visits || []), ...(orders || [])].map(item => item.aidant_id).filter(Boolean))];

      // 3️⃣ Enrichir les patients
      let patientMap: Record<string, any> = {};
      if (patientIds.length > 0) {
        const { data: patientsData } = await supabase.from('patients').select('*').in('id', patientIds);
        patientMap = (patientsData || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      }

      // 4️⃣ Enrichir les aidants (avec leurs profils)
      let aidantMap: Record<string, any> = {};
      if (aidantIds.length > 0) {
        const { data: aidantsData } = await supabase.from('aidants').select('*, user:profiles!user_id(*)').in('id', aidantIds);
        aidantMap = (aidantsData || []).reduce((acc, a) => ({ ...acc, [a.id]: a }), {});
      }

      const visitsWithRelations = (visits || []).map(v => ({ ...v, patient: patientMap[v.patient_id], aidant: aidantMap[v.aidant_id] }));
      const ordersWithRelations = (orders || []).map(o => ({ ...o, patient: patientMap[o.patient_id], aidant: aidantMap[o.aidant_id] }));

      // 5️⃣ Construction des locations pour Google Maps
      // On s'assure que latitude/longitude sont des nombres, jamais undefined
      const patients = [
        ...visitsWithRelations.filter(v => v.patient).map(v => v.patient),
        ...ordersWithRelations.filter(o => o.patient).map(o => o.patient)
      ].map(p => ({
        ...p,
        latitude: Number(p.latitude) || DEFAULT_LAT,
        longitude: Number(p.longitude) || DEFAULT_LNG,
      }));

      const aidants = [
        ...visitsWithRelations.filter(v => v.aidant?.user).map(v => v.aidant.user),
        ...ordersWithRelations.filter(o => o.aidant?.user).map(o => o.aidant.user)
      ].map(u => ({
        id: u.id,
        full_name: u.full_name,
        latitude: Number(u.last_latitude) || DEFAULT_LAT,
        longitude: Number(u.last_longitude) || DEFAULT_LNG,
      })).filter((val, index, self) => val && self.findIndex(t => t.id === val.id) === index);

      set({ 
        activeVisits: visitsWithRelations,
        activeOrders: ordersWithRelations,
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
    if (subscription) supabase.removeChannel(subscription);
  },

  clearError: () => set({ error: null }),
}));
