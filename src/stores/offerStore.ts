// 📁 src/stores/offerStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Offer } from '@/types';

interface OfferState {
  offers: Offer[];
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  
  // Actions
  fetchOffers: () => Promise<void>;
  getOfferById: (id: string) => Offer | undefined;
  getOffersByCategory: (category: Offer['category']) => Offer[];
  getPonctualOffers: () => Offer[];
  getSubscriptionOffers: () => Offer[];
  refresh: () => Promise<void>;
}

// ✅ Clé pour le cache localStorage
const OFFERS_CACHE_KEY = 'sante_plus_offers_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useOfferStore = create<OfferState>((set, get) => ({
  offers: [],
  isLoading: false,
  error: null,
  isInitialized: false,

  fetchOffers: async () => {
    try {
      set({ isLoading: true, error: null });

      // ✅ Vérifier le cache
      const cached = localStorage.getItem(OFFERS_CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            console.log('📦 Offres chargées depuis le cache');
            set({ 
              offers: data, 
              isLoading: false, 
              isInitialized: true 
            });
            return;
          }
        } catch (e) {
          console.warn('Cache invalide, rechargement...');
        }
      }

      console.log('🔄 Chargement des offres depuis la base de données...');

      const { data, error } = await supabase
        .from('offres')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      // ✅ Transformer les données
      const offers: Offer[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        type: item.type || 'mensuelle',
        description: item.description,
        price: item.price || 0,
        period: item.type === 'ponctuelle' ? 'intervention' : (item.type || 'mois'),
        visitsPerWeek: item.visits_per_week || null,
        durationDays: item.duration_days || null,
        features: item.features || [],
        badge: item.badge || null,
        is_active: item.is_active ?? true,
        is_public: item.is_public ?? true,
        display_order: item.display_order || 0,
        created_at: item.created_at,
        updated_at: item.updated_at,
        total_visits: item.total_visits || item.visits_per_month || null,
        visits_per_month: item.visits_per_month || null,
        total_orders: item.total_orders || null,
      }));

      // ✅ Mettre en cache
      localStorage.setItem(OFFERS_CACHE_KEY, JSON.stringify({
        data: offers,
        timestamp: Date.now(),
      }));

      console.log(`✅ ${offers.length} offres chargées`);

      set({ 
        offers, 
        isLoading: false, 
        isInitialized: true,
        error: null 
      });

    } catch (error: any) {
      console.error('❌ Fetch offers error:', error);
      set({ 
        error: error.message, 
        isLoading: false,
        isInitialized: true 
      });
    }
  },

  getOfferById: (id: string) => {
    const { offers } = get();
    return offers.find(offer => offer.id === id);
  },

  getOffersByCategory: (category: Offer['category']) => {
    const { offers } = get();
    return offers.filter(offer => offer.category === category);
  },

  getPonctualOffers: () => {
    const { offers } = get();
    return offers.filter(offer => 
      offer.category === 'ponctuelle' || 
      offer.type === 'ponctuelle' ||
      offer.id.startsWith('ponctual-')
    );
  },

  getSubscriptionOffers: () => {
    const { offers } = get();
    return offers.filter(offer => 
      offer.category !== 'ponctuelle' && 
      offer.type !== 'ponctuelle' &&
      !offer.id.startsWith('ponctual-')
    );
  },

  refresh: async () => {
    // ✅ Forcer le rechargement (vider le cache)
    localStorage.removeItem(OFFERS_CACHE_KEY);
    await get().fetchOffers();
  },
}));
