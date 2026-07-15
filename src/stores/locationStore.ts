// 📁 src/stores/locationStore.ts
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './authStore';

interface LocationState {
  locations: { patients: any[]; aidants: any[] };
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
    // ✅ PROTECTION : Si déjà en chargement, on stoppe net
    if (get().isLoading) return;

    try {
      set({ isLoading: true, error: null });
      
      const { data: visits, error: vErr } = await supabase
        .from('visites')
        .select('*, patient:patients!visites_patient_id_fkey(*)')
        .eq('status', 'en_cours');

      const { data: orders, error: oErr } = await supabase
        .from('commandes')
        .select('*, patient:patients(*)')
        .eq('status', 'en_cours');

      if (vErr || oErr) throw vErr || oErr;

      set({ 
        activeVisits: visits || [], 
        activeOrders: orders || [],
        isLoading: false 
      });
    } catch (error: any) {
      console.error('❌ Fetch error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  updateLocation: async (lat: number, lng: number) => {
    const { user } = useAuthStore.getState();
    if (!user) return;
    await supabase.from('profiles').update({ last_latitude: lat, last_longitude: lng }).eq('id', user.id);
  },

  subscribeToLocations: () => {
    if (get().subscription) return; 

    const channel = supabase
      .channel('locations')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        // Logique de mise à jour légère
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

  startTracking: () => { /* ... votre logique existante ... */ },
  stopTracking: () => { /* ... votre logique existante ... */ },
  clearError: () => set({ error: null }),
}));
