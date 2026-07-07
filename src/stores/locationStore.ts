// 📁 src/stores/locationStore.ts
// ✅ GESTION DES POSITIONS GPS - DOUBLE SUIVI (VISITES + LIVRAISONS DE COMMANDES)

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './authStore';

 
interface LocationState {
  locations: {
    patients: any[];
    aidants: any[];
  };
  activeVisits: any[];
  activeOrders: any[]; // ✅ NOUVEAU
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
  activeOrders: [],
  isLoading: false,
  error: null,
  subscription: null,
  watchId: null,

  fetchActiveVisits: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // 1️⃣ Récupérer les visites en cours
      const { data: visits, error: visitError } = await supabase
        .from('visites')
        .select(`
          *,
          patient:patients!visites_patient_id_fkey(*)
        `)
        .eq('status', 'en_cours');

      if (visitError) throw visitError;

      // 2️⃣ Récupérer les commandes en cours de livraison
      const { data: orders, error: orderError } = await supabase
        .from('commandes')
        .select(`
          *,
          patient:patients(*)
        `)
        .eq('status', 'en_cours');

      if (orderError) throw orderError;

      // 3️⃣ Fusionner et enrichir les patients concernés par les visites + livraisons
      const patientIds = [
        ...new Set([
          ...(visits?.map(v => v.patient_id) || []),
          ...(orders?.map(o => o.patient_id) || [])
        ].filter(Boolean))
      ];
      
      let patientMap: Record<string, any> = {};
      if (patientIds.length > 0) {
        const { data: patientsData } = await supabase
          .from('patients')
          .select('*')
          .in('id', patientIds);
        if (patientsData) {
          patientMap = patientsData.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // 4️⃣ Enrichir les aidants concernés
      const aidantIds = [
        ...new Set([
          ...(visits?.map(v => v.aidant_id) || []),
          ...(orders?.map(o => o.aidant_id) || [])
        ].filter(Boolean))
      ];

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

      // 5️⃣ Fusionner les relations complètes
      const visitsWithRelations = (visits || []).map((visit) => ({
        ...visit,
        patient: visit.patient_id ? patientMap[visit.patient_id] || null : null,
        aidant: visit.aidant_id ? aidantMap[visit.aidant_id] || null : null,
      }));

      const ordersWithRelations = (orders || []).map((order) => ({
        ...order,
        patient: order.patient_id ? patientMap[order.patient_id] || null : null,
        aidant: order.aidant_id ? aidantMap[order.aidant_id] || null : null,
      }));

      set({ 
        activeVisits: visitsWithRelations || [], 
        activeOrders: ordersWithRelations || [],
        isLoading: false 
      });

      // 6️⃣ Extraire les positions réelles des patients
      const patients = [
        ...visitsWithRelations.filter(v => v.patient).map(v => v.patient),
        ...ordersWithRelations.filter(o => o.patient).map(o => o.patient)
      ].map(p => ({
        id: p.id,
        ...p,
        latitude: p.latitude || 6.3703,
        longitude: p.longitude || 2.3912,
      }));

      // 7️⃣ Extraire les positions GPS réelles des aidants actifs
      const aidants = [
        ...visitsWithRelations.filter(v => v.aidant?.user).map(v => v.aidant.user),
        ...ordersWithRelations.filter(o => o.aidant?.user).map(o => o.aidant.user)
      ].map(p => ({
        id: p.id,
        full_name: p.full_name,
        latitude: p.last_latitude || 6.3703,
        longitude: p.last_longitude || 2.3912,
      }));

      set({
        locations: { 
          patients, 
          aidants: aidants.filter((a, index, self) => a !== null && self.findIndex(t => t.id === a.id) === index) 
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
          // Si l'aidant est en cours de visite
          const { data: activeVisit } = await supabase
            .from('visites')
            .select('id')
            .eq('aidant_id', aidant.id)
            .eq('status', 'en_cours')
            .maybeSingle();

          if (activeVisit) {
            await supabase
              .from('visites')
              .update({ location_start: { lat, lng } })
              .eq('id', activeVisit.id);
          }

          // Si l'aidant est en cours de livraison de commande
          const { data: activeOrder } = await supabase
            .from('commandes')
            .select('id, metadata')
            .eq('aidant_id', aidant.id)
            .eq('status', 'en_cours')
            .maybeSingle();

          if (activeOrder) {
            const updatedMetadata = {
              ...(activeOrder.metadata || {}),
              location_start: activeOrder.metadata?.location_start || { lat, lng }
            };

            await supabase
              .from('commandes')
              .update({ metadata: updatedMetadata })
              .eq('id', activeOrder.id);
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
