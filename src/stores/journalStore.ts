// 📁 src/stores/journalStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { JournalEntry, JournalStats } from '@/types';
import { useAuthStore } from './authStore';

interface JournalState {
  entries: JournalEntry[];
  stats: JournalStats | null;
  isLoading: boolean;
  error: string | null;
  
  fetchEntries: (patientId?: string) => Promise<void>;
  fetchStats: (patientId?: string) => Promise<void>;
  addRating: (visitId: string, rating: number, feedback: string) => Promise<void>;
  getEntriesByDate: (date: string) => JournalEntry[];
  getEntriesByWeek: () => { week: string; entries: JournalEntry[] }[];
  clearError: () => void;
}

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: [],
  stats: null,
  isLoading: false,
  error: null,

  fetchEntries: async (patientId?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) {
        set({ entries: [], isLoading: false });
        return;
      }

      let query = supabase
        .from('visites')
        .select(`
          *,
          patient:patients(*),
          aidant:aidants(*, user:profiles(*)),
          photos:visite_photos(*)
        `)
        .in('status', ['terminee', 'validee']);

      // Si c'est une famille, filtrer par ses patients
      if (profile?.role === 'family') {
        const { data: links } = await supabase
          .from('patient_family_links')
          .select('patient_id')
          .eq('family_id', user.id);

        const patientIds = links?.map(l => l.patient_id) || [];
        if (patientIds.length > 0) {
          query = query.in('patient_id', patientIds);
        } else {
          set({ entries: [], isLoading: false });
          return;
        }
      }

      // Si un patient spécifique est demandé
      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query
        .order('scheduled_date', { ascending: false })
        .order('scheduled_time', { ascending: false });

      if (error) throw error;

      // Transformer les données en JournalEntry avec proche_id et proche
      const entries: JournalEntry[] = (data || []).map((visit: any) => ({
        id: visit.id,
        visit_id: visit.id,
        visit: visit,
        patient_id: visit.patient_id,      // ✅ Gardé pour compatibilité
        proche_id: visit.patient_id,       // ✅ AJOUTÉ
        patient: visit.patient,            // ✅ Gardé pour compatibilité
        proche: visit.patient,             // ✅ AJOUTÉ
        aidant_id: visit.aidant_id,
        aidant: visit.aidant,
        date: visit.scheduled_date,
        time: visit.scheduled_time,
        actions: visit.actions || [],
        notes: visit.notes || visit.report || null,
        photos: visit.photos?.map((p: any) => p.photo_url) || [],
        audio_url: visit.metadata?.audio_url || null,
        status: visit.status,
        rating: visit.family_rating || null,
        feedback: visit.family_feedback || null,
        created_at: visit.created_at,
        updated_at: visit.updated_at,
      }));

      set({ entries, isLoading: false });
    } catch (error: any) {
      console.error('Fetch journal entries error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  fetchStats: async (patientId?: string) => {
    try {
      const { entries } = get();
      
      const validatedEntries = entries.filter(e => e.status === 'validee');
      const totalVisits = entries.length;
      const validatedVisits = validatedEntries.length;
      const pendingVisits = entries.filter(e => e.status === 'terminee').length;
      
      // Calculer la note moyenne
      const ratings = validatedEntries.filter(e => e.rating !== null).map(e => e.rating || 0);
      const averageRating = ratings.length > 0 
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
        : 0;

      // Compter les aidants uniques
      const aidants = new Set(entries.map(e => e.aidant_id).filter(Boolean));
      
      // Statistiques par semaine
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

      // Fréquence des actions
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

      set({
        stats: {
          total_visits: totalVisits,
          validated_visits: validatedVisits,
          pending_visits: pendingVisits,
          average_rating: averageRating,
          total_aidants: aidants.size,
          visits_by_week: visitsByWeek,
          actions_frequency: actionsFrequency,
        },
      });
    } catch (error: any) {
      console.error('Fetch stats error:', error);
      set({ error: error.message });
    }
  },

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

      // Mettre à jour l'état local
      set((state) => ({
        entries: state.entries.map(entry =>
          entry.visit_id === visitId
            ? { ...entry, rating, feedback }
            : entry
        ),
      }));

      // Mettre à jour les stats
      await get().fetchStats();
    } catch (error: any) {
      console.error('Add rating error:', error);
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

// Helper: Numéro de semaine
function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}