// 📁 src/stores/offerStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Offer } from '@/types';

interface OfferState {
  offers: Offer[];
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  lastUpdated: number | null;

  // Actions
  fetchOffers: () => Promise<void>;
  getOfferById: (id: string) => Offer | undefined;
  getOffersByCategory: (category: Offer['category']) => Offer[];
  getPonctualOffers: () => Offer[];
  getSubscriptionOffers: () => Offer[];
  refresh: () => Promise<void>;
  clearCache: () => void;
}

// ✅ Clé pour le cache localStorage
const OFFERS_CACHE_KEY = 'sante_plus_offers_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ✅ URL de l'API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

export const useOfferStore = create<OfferState>((set, get) => ({
  offers: [],
  isLoading: false,
  error: null,
  isInitialized: false,
  lastUpdated: null,

  fetchOffers: async () => {
    const { isInitialized, lastUpdated } = get();

    // ✅ Si déjà initialisé et que le cache est récent, ne pas recharger
    if (isInitialized && lastUpdated && Date.now() - lastUpdated < CACHE_DURATION) {
      console.log('📦 Offres déjà chargées et récentes');
      return;
    }

    try {
      set({ isLoading: true, error: null });

      // ✅ Vérifier le cache localStorage
      const cached = localStorage.getItem(OFFERS_CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            console.log('📦 Offres chargées depuis le cache localStorage');
            set({
              offers: data,
              isLoading: false,
              isInitialized: true,
              lastUpdated: timestamp,
              error: null,
            });
            return;
          }
        } catch (e) {
          console.warn('Cache invalide, rechargement...');
        }
      }

      console.log('🔄 Chargement des offres depuis la base de données...');

      // ✅ Appel API
      const response = await fetch(`${API_BASE_URL}/offers`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors du chargement des offres');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur inconnue');
      }

      const offers: Offer[] = result.data || [];

      // ✅ Mettre en cache localStorage
      localStorage.setItem(OFFERS_CACHE_KEY, JSON.stringify({
        data: offers,
        timestamp: Date.now(),
      }));

      console.log(`✅ ${offers.length} offres chargées`);

      set({
        offers,
        isLoading: false,
        isInitialized: true,
        lastUpdated: Date.now(),
        error: null,
      });

    } catch (error: any) {
      console.error('❌ Fetch offers error:', error);

      // ✅ En cas d'erreur, essayer d'utiliser le cache même expiré
      const cached = localStorage.getItem(OFFERS_CACHE_KEY);
      if (cached) {
        try {
          const { data } = JSON.parse(cached);
          if (data && data.length > 0) {
            console.warn('⚠️ Utilisation du cache expiré en cas d\'erreur');
            set({
              offers: data,
              isLoading: false,
              isInitialized: true,
              error: error.message,
            });
            return;
          }
        } catch (e) {
          console.warn('Cache invalide');
        }
      }

      set({
        error: error.message,
        isLoading: false,
        isInitialized: true,
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
      offer.id?.startsWith('ponctual-') ||
      offer.id === 'b4b01a84-1b0c-4973-9e58-43945c1c4991' ||
      offer.id === '6e4ba26d-98c5-4e29-a129-f33a828f0b44'
    );
  },

  getSubscriptionOffers: () => {
    const { offers } = get();
    return offers.filter(offer =>
      offer.category !== 'ponctuelle' &&
      offer.type !== 'ponctuelle' &&
      !offer.id?.startsWith('ponctual-')
    );
  },

  refresh: async () => {
    // ✅ Forcer le rechargement (vider le cache)
    localStorage.removeItem(OFFERS_CACHE_KEY);
    await get().fetchOffers();
  },

  clearCache: () => {
    localStorage.removeItem(OFFERS_CACHE_KEY);
    set({
      offers: [],
      isInitialized: false,
      lastUpdated: null,
    });
  },
}));
