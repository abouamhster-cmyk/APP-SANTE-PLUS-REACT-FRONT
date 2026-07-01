// 📁 src/stores/journalStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { JournalEntry, JournalStats } from '@/types';
import { useAuthStore } from './authStore';

// =============================================
// HELPERS DE CACHE
// =============================================

const JOURNAL_ENTRIES_CACHE_KEY = 'sante_plus_journal_entries_cache';
const JOURNAL_STATS_CACHE_KEY = 'sante_plus_journal_stats_cache';
const CACHE_DURATION = 60000; // 1 minute

const getCachedEntries = (): { data: JournalEntry[]; timestamp: number } | null => {
  try {
    const cached = localStorage.getItem(JOURNAL_ENTRIES_CACHE_KEY);
    if (cached) return JSON.parse(cached);
    return null;
  } catch { return null; }
};

const setCachedEntries = (entries: JournalEntry[]) => {
  try {
    localStorage.setItem(JOURNAL_ENTRIES_CACHE_KEY, JSON.stringify({
      data: entries,
      timestamp: Date.now(),
    }));
  } catch { /* ignore */ }
};

const clearCachedEntries = () => {
  try {
    localStorage.removeItem(JOURNAL_ENTRIES_CACHE_KEY);
    console.log('🗑️ Cache journal entries invalidé');
  } catch { /* ignore */ }
};

const getCachedStats = (): { data: JournalStats; timestamp: number } | null => {
  try {
    const cached = localStorage.getItem(JOURNAL_STATS_CACHE_KEY);
    if (cached) return JSON.parse(cached);
    return null;
  } catch { return null; }
};

const setCachedStats = (stats: JournalStats) => {
  try {
    localStorage.setItem(JOURNAL_STATS_CACHE_KEY, JSON.stringify({
      data: stats,
      timestamp: Date.now(),
    }));
  } catch { /* ignore */ }
};

const clearCachedStats = () => {
  try {
    localStorage.removeItem(JOURNAL_STATS_CACHE_KEY);
    console.log('🗑️ Cache journal stats invalidé');
  } catch { /* ignore */ }
};

// =============================================
// STORE
// =============================================

interface JournalState {
  entries: JournalEntry[];
  stats: JournalStats | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  lastFetch: number | null;
  isCacheInvalidated: boolean;
  
  fetchEntries: (force?: boolean, patientId?: string) => Promise<void>;
  fetchStats: (force?: boolean, patientId?: string) => Promise<void>;
  addRating: (visitId: string, rating: number, feedback: string) => Promise<void>;
  getEntriesByDate: (date: string) => JournalEntry[];
  getEntriesByWeek: () => { week: string; entries: JournalEntry[] }[];
  
  // ✅ GESTION DU CACHE
  invalidateCache: () => void;
  refresh: () => Promise<void>;
  
  clearError: () => void;
}

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: [],
  stats: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  lastFetch: null,
  isCacheInvalidated: false,

  // ✅ Invalider le cache
  invalidateCache: () => {
    clearCachedEntries();
    clearCachedStats();
    set({ 
      isCacheInvalidated: true,
      isInitialized: false,
      lastFetch: null,
    });
    console.log('🔄 Cache journal invalidé');
  },

  // ✅ Rafraîchir forcé
  refresh: async () => {
    get().invalidateCache();
    await get().fetchEntries(true);
    await get().fetchStats(true);
  },

  // =============================================
  // FETCH ENTRIES - AVEC CACHE
  // =============================================
  fetchEntries: async (force = false, patientId?: string) => {
    const state = get();
    
    if (state.isLoading) {
      console.log('ℹ️ Déjà en cours de chargement, skip...');
      return;
    }

    if (state.isCacheInvalidated) {
      force = true;
    }

    // Si un patientId est fourni, on force le rafraîchissement
    if (patientId) {
      force = true;
    }

    if (!force && state.lastFetch && (Date.now() - state.lastFetch < CACHE_DURATION)) {
      console.log('📦 Utilisation du cache mémoire journal entries');
      return;
    }

    if (!force) {
      const cached = getCachedEntries();
      if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        console.log('📦 Utilisation du cache localStorage journal entries');
        set({ 
          entries: cached.data, 
          isLoading: false, 
          isInitialized: true,
          lastFetch: cached.timestamp,
          isCacheInvalidated: false,
        });
        return;
      }
    }

    try {
      set({ isLoading: true, error: null, isCacheInvalidated: false });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) {
        set({ entries: [], isLoading: false, isInitialized: true });
        return;
      }

      // ✅ ÉTAPE 1 : Récupérer les visites
      let query = supabase
        .from('visites')
        .select('*')
        .in('status', ['terminee', 'validee']);

      if (profile?.role === 'family') {
        const { data: links } = await supabase
          .from('patient_family_links')
          .select('patient_id')
          .eq('family_id', user.id);

        const patientIds = links?.map(l => l.patient_id) || [];
        if (patientIds.length > 0) {
          query = query.in('patient_id', patientIds);
        } else {
          set({ entries: [], isLoading: false, isInitialized: true });
          return;
        }
      }

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data: visits, error } = await query
        .order('scheduled_date', { ascending: false })
        .order('scheduled_time', { ascending: false });

      if (error) throw error;

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

      // ✅ ÉTAPE 4 : Récupérer les photos SEPAREMENT
      const visitIds = visits?.map(v => v.id) || [];
      let photosMap: Record<string, any[]> = {};

      if (visitIds.length > 0) {
        const { data: photos } = await supabase
          .from('visite_photos')
          .select('*')
          .in('visite_id', visitIds);
        if (photos) {
          photosMap = photos.reduce((acc, p) => {
            if (!acc[p.visite_id]) acc[p.visite_id] = [];
            acc[p.visite_id].push(p);
            return acc;
          }, {} as Record<string, any[]>);
        }
      }

      // ✅ ÉTAPE 5 : Fusionner toutes les données
      const entries: JournalEntry[] = (visits || []).map((visit: any) => {
        const photos = photosMap[visit.id] || [];
        return {
          id: visit.id,
          visit_id: visit.id,
          visit: visit,
          patient_id: visit.patient_id,
          proche_id: visit.patient_id,
          patient: visit.patient_id ? patientMap[visit.patient_id] || null : null,
          proche: visit.patient_id ? patientMap[visit.patient_id] || null : null,
          aidant_id: visit.aidant_id,
          aidant: visit.aidant_id ? aidantMap[visit.aidant_id] || null : null,
          date: visit.scheduled_date,
          time: visit.scheduled_time,
          actions: visit.actions || [],
          notes: visit.notes || visit.report || null,
          photos: photos.map((p: any) => p.photo_url) || [],
          audio_url: visit.metadata?.audio_url || null,
          status: visit.status,
          rating: visit.family_rating || null,
          feedback: visit.family_feedback || null,
          created_at: visit.created_at,
          updated_at: visit.updated_at,
        };
      });

      // ✅ Mettre en cache
      setCachedEntries(entries);
      
      set({ 
        entries, 
        isLoading: false,
        isInitialized: true,
        lastFetch: Date.now(),
        isCacheInvalidated: false,
      });
    } catch (error: any) {
      console.error('❌ Fetch journal entries error:', error);
      
      // En cas d'erreur, utiliser le cache
      const cached = getCachedEntries();
      if (cached && cached.data.length > 0) {
        set({
          entries: cached.data,
          isLoading: false,
          isInitialized: true,
          lastFetch: cached.timestamp,
          error: error.message || 'Erreur de chargement (cache utilisé)',
          isCacheInvalidated: false,
        });
      } else {
        set({ error: error.message, isLoading: false, isInitialized: true });
      }
    }
  },

  // =============================================
  // FETCH STATS - AVEC CACHE
  // =============================================
  fetchStats: async (force = false, patientId?: string) => {
    const state = get();
    
    if (state.isLoading) {
      console.log('ℹ️ Déjà en cours de chargement, skip...');
      return;
    }

    if (state.isCacheInvalidated) {
      force = true;
    }

    if (patientId) {
      force = true;
    }

    if (!force && state.lastFetch && (Date.now() - state.lastFetch < CACHE_DURATION)) {
      console.log('📦 Utilisation du cache mémoire journal stats');
      return;
    }

    if (!force) {
      const cached = getCachedStats();
      if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        console.log('📦 Utilisation du cache localStorage journal stats');
        set({ 
          stats: cached.data, 
          isLoading: false, 
          isInitialized: true,
          lastFetch: cached.timestamp,
          isCacheInvalidated: false,
        });
        return;
      }
    }

    try {
      const { entries } = get();
      
      const validatedEntries = entries.filter(e => e.status === 'validee');
      const totalVisits = entries.length;
      const validatedVisits = validatedEntries.length;
      const pendingVisits = entries.filter(e => e.status === 'terminee').length;
      
      const ratings = validatedEntries.filter(e => e.rating !== null).map(e => e.rating || 0);
      const averageRating = ratings.length > 0 
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
        : 0;

      const aidants = new Set(entries.map(e => e.aidant_id).filter(Boolean));
      
      const weeks: Record<string, number> = {};
      entries.forEach(entry => {
        const date = new Date(entry.date);
        const week = `${date.getFullYear()}-W${getWeekNumber(date)}`;
        weeks[week] = (weeks[week] || 0) + 1;
      });

      const visitsByWeek = Object.entries(weeks).map(([week, count]) => ({
        week,
        count,
      }));

      const actionsFreq: Record<string, number> = {};
      entries.forEach(entry => {
        entry.actions.forEach(action => {
          actionsFreq[action] = (actionsFreq[action] || 0) + 1;
        });
      });

      const actionsFrequency = Object.entries(actionsFreq)
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const stats: JournalStats = {
        total_visits: totalVisits,
        validated_visits: validatedVisits,
        pending_visits: pendingVisits,
        average_rating: averageRating,
        total_aidants: aidants.size,
        visits_by_week: visitsByWeek,
        actions_frequency: actionsFrequency,
      };

      // ✅ Mettre en cache
      setCachedStats(stats);
      
      set({
        stats,
        isLoading: false,
        isInitialized: true,
        lastFetch: Date.now(),
        isCacheInvalidated: false,
      });
    } catch (error: any) {
      console.error('❌ Fetch stats error:', error);
      
      const cached = getCachedStats();
      if (cached && cached.data) {
        set({
          stats: cached.data,
          isLoading: false,
          isInitialized: true,
          lastFetch: cached.timestamp,
          error: error.message || 'Erreur de chargement (cache utilisé)',
          isCacheInvalidated: false,
        });
      } else {
        set({ error: error.message, isLoading: false, isInitialized: true });
      }
    }
  },

  // =============================================
  // ADD RATING - AVEC INVALIDATION DE CACHE
  // =============================================
  addRating: async (visitId: string, rating: number, feedback: string) => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Non connecté');

      const { error } = await supabase
        .from('visites')
        .update({
          family_rating: rating,
          family_feedback: feedback,
          updated_at: new Date().toISOString(),
        })
        .eq('id', visitId);

      if (error) throw error;

      // ✅ INVALIDER LE CACHE
      get().invalidateCache();
      await get().fetchEntries(true);
      await get().fetchStats(true);

      // Mise à jour locale immédiate
      set((state) => ({
        entries: state.entries.map(entry =>
          entry.visit_id === visitId
            ? { ...entry, rating, feedback }
            : entry
        ),
      }));
    } catch (error: any) {
      console.error('❌ Add rating error:', error);
      set({ error: error.message });
      throw error;
    }
  },

  getEntriesByDate: (date: string) => {
    const { entries } = get();
    return entries.filter(entry => entry.date === date);
  },

  getEntriesByWeek: () => {
    const { entries } = get();
    const weeks: Record<string, JournalEntry[]> = {};
    
    entries.forEach(entry => {
      const date = new Date(entry.date);
      const week = `${date.getFullYear()}-W${getWeekNumber(date)}`;
      if (!weeks[week]) weeks[week] = [];
      weeks[week].push(entry);
    });

    return Object.entries(weeks)
      .map(([week, entries]) => ({ week, entries }))
      .sort((a, b) => b.week.localeCompare(a.week));
  },

  clearError: () => set({ error: null }),
}));

function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}
