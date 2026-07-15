// 📁 src/stores/locationStore.ts
// ✅ STORE GPS COMPLET : INTÉGRATION DES FILTRES DE RAPPORTS RÉELS (END_TIME & UPDATED_AT) POUR LE RADAR

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './authStore';
import api from '@/lib/api';

interface LocationState {
  locations: {
    patients: any[];
    aidants: any[];
    families: any[]; 
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

// Coordonnées par défaut (Cotonou)
const DEFAULT_LAT = 6.3703;
const DEFAULT_LNG = 2.3912;

export const useLocationStore = create<LocationState>((set, get) => ({
  locations: { patients: [], aidants: [], families: [] },
  activeVisits: [],
  activeOrders: [],
  isLoading: false,
  error: null,
  subscription: null,
  watchId: null,

  fetchActiveVisits: async () => {
    if (get().isLoading) return;

    try {
      set({ isLoading: true, error: null });
      
      const { profile } = useAuthStore.getState();
      const isAdmin = profile?.role === 'admin' || profile?.role === 'coordinator';

      // 1️⃣ Récupérer les visites et commandes
      const [visitsResponse, ordersResponse] = await Promise.all([
        api.get('/visits'),
        api.get('/orders')
      ]);

      const allVisits = visitsResponse.data || [];
      const allOrders = ordersResponse.data || [];

      const todayStr = new Date().toISOString().split('T')[0];

      // ✅ CORRECTIF FILTRE VISITES : On se base sur end_time (date de fin réelle) pour inclure les visites terminées aujourd'hui !
      const activeVisits = allVisits.filter((v: any) => 
        v.status === 'en_cours' || 
        ((v.status === 'terminee' || v.status === 'validee') && v.end_time?.startsWith(todayStr))
      );

      // ✅ CORRECTIF FILTRE COMMANDES : On se base sur updated_at (date de livraison réelle) pour inclure les livraisons faites aujourd'hui !
      const activeOrders = allOrders.filter((o: any) => 
        o.status === 'en_cours' || 
        ((o.status === 'livree' || o.status === 'validee') && o.updated_at?.startsWith(todayStr))
      );

      // Extraire tous les IDs uniques de comptes familles (user_id) et d'aidants concernés
      const familyUserIds = [...new Set([
        ...activeVisits.map((v: any) => v.user_id),
        ...activeOrders.map((o: any) => o.user_id)
      ].filter(Boolean))];

      const aidantIds = [...new Set([
        ...activeVisits.map((v: any) => v.aidant_id),
        ...activeOrders.map((o: any) => o.aidant_id)
      ].filter(Boolean))];

      // 2️⃣ Récupérer les profils correspondants pour obtenir leurs coordonnées GPS réelles de connexion
      let profilesMap: Record<string, any> = {};
      const allProfileIds = [...new Set([...familyUserIds, ...aidantIds])];
      
      if (allProfileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, last_latitude, last_longitude, address, role')
          .in('id', allProfileIds);

        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
        }
      }

      // 3️⃣ Construire la liste des aidants avec leurs coordonnées réelles (SANS COORDONNÉES PAR DÉFAUT)
      const aidants = Object.values(profilesMap)
        .filter((p: any) => p.role === 'aidant' || aidantIds.includes(p.id))
        .map((p: any) => ({
          id: p.id,
          full_name: p.full_name,
          latitude: p.last_latitude ? Number(p.last_latitude) : null,
          longitude: p.last_longitude ? Number(p.last_longitude) : null,
        }))
        .filter((a: any) => a.latitude !== null && a.longitude !== null);

      // 4️⃣ Construire la liste des bénéficiaires/patients basés sur les coordonnées de leur compte famille respectif
      const patientsMap: Record<string, any> = {};

      activeVisits.forEach((v: any) => {
        const familyProfile = profilesMap[v.user_id];
        if (familyProfile && familyProfile.last_latitude && familyProfile.last_longitude) {
          patientsMap[v.patient_id || v.id] = {
            id: v.patient_id || v.id,
            first_name: v.patient?.first_name || v.target_name || 'Bénéficiaire',
            last_name: v.patient?.last_name || '',
            address: v.address || familyProfile.address || 'Adresse',
            latitude: Number(familyProfile.last_latitude),
            longitude: Number(familyProfile.last_longitude),
          };
        }
      });

      activeOrders.forEach((o: any) => {
        const familyProfile = profilesMap[o.user_id];
        if (familyProfile && familyProfile.last_latitude && familyProfile.last_longitude) {
          patientsMap[o.patient_id || o.id] = {
            id: o.patient_id || o.id,
            first_name: o.patient?.first_name || o.target_name || 'Bénéficiaire',
            last_name: o.patient?.last_name || '',
            address: o.address || familyProfile.address || 'Adresse',
            latitude: Number(familyProfile.last_latitude),
            longitude: Number(familyProfile.last_longitude),
          };
        }
      });

      const patients = Object.values(patientsMap);

      // 5️⃣ Pour l'admin, charger TOUS les comptes utilisateurs familles actifs avec leur position réelle
      let families: any[] = [];
      if (isAdmin) {
        const { data: familyProfiles, error: familyError } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, last_latitude, last_longitude, address')
          .eq('role', 'family');

        if (!familyError && familyProfiles) {
          families = familyProfiles
            .map((f: any) => ({
              id: f.id,
              full_name: f.full_name,
              email: f.email,
              phone: f.phone,
              address: f.address || 'Adresse non spécifiée',
              latitude: f.last_latitude ? Number(f.last_latitude) : null,
              longitude: f.last_longitude ? Number(f.last_longitude) : null,
            }))
            .filter((f: any) => f.latitude !== null && f.longitude !== null);
        }
      }

      set({ 
        activeVisits, 
        activeOrders,
        locations: { patients, aidants, families },
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
