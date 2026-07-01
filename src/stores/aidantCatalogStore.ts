// 📁 src/stores/aidantCatalogStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { 
  AidantProfile, 
  AidantAssignment, 
  AidantFilters, 
  DEFAULT_FILTERS,
  AidantCatalogState
} from '@/types';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

export const useAidantCatalogStore = create<AidantCatalogState>((set, get) => ({
  // ============================================================
  // ÉTAT INITIAL
  // ============================================================
  aidants: [],
  selectedAidant: null,
  assignments: [],
  isLoading: false,
  error: null,
  filters: { ...DEFAULT_FILTERS },
  totalCount: 0,

  // ============================================================
  // FETCH AIDANTS AVEC FILTRES
  // ============================================================
  fetchAidants: async (filters = {}) => {
    try {
      set({ isLoading: true, error: null });

      const currentFilters = { ...get().filters, ...filters };
      
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Token manquant');
      }

      const params = new URLSearchParams();
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await fetch(`${API_BASE_URL}/aidants/catalog?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du chargement des aidants');
      }

      const result = await response.json();

      set({
        aidants: result.data || [],
        totalCount: result.count || 0,
        filters: { ...currentFilters },
        isLoading: false,
      });
    } catch (error: any) {
      console.error('❌ Fetch aidants error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message || 'Erreur lors du chargement des aidants');
    }
  },

  // ============================================================
  // FETCH AIDANT BY ID
  // ============================================================
  fetchAidantById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Token manquant');
      }

      const response = await fetch(`${API_BASE_URL}/aidants/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du chargement de l\'aidant');
      }

      const result = await response.json();

      set({
        selectedAidant: result.data,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('❌ Fetch aidant by ID error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message || 'Erreur lors du chargement de l\'aidant');
    }
  },

  // ============================================================
  // FETCH MY ASSIGNMENTS
  // ============================================================
  fetchMyAssignments: async () => {
    try {
      set({ isLoading: true, error: null });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Token manquant');
      }

      const response = await fetch(`${API_BASE_URL}/aidants/my-assignments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du chargement des assignations');
      }

      const result = await response.json();

      set({
        assignments: result.data || [],
        isLoading: false,
      });
    } catch (error: any) {
      console.error('❌ Fetch assignments error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // ============================================================
  // ASSIGN AIDANT - AVEC SUPPORT PERSONNEL (string | null)
  // ============================================================
  assignAidant: async (aidantId: string, patientId: string | null = null, assignmentType = 'permanente') => {
    try {
      set({ isLoading: true, error: null });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Token manquant');
      }

      // ✅ payload avec patientId optionnel
      const payload: any = {
        aidantId,
        assignmentType,
      };

      // ✅ patientId n'est ajouté que s'il est défini
      if (patientId) {
        payload.patientId = patientId;
      }

      console.log('📤 Assignation aidant avec payload:', payload);

      const response = await fetch(`${API_BASE_URL}/aidants/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'assignation');
      }

      const result = await response.json();

      toast.success('✅ Aidant assigné avec succès !');

      // Rafraîchir les données
      await get().fetchMyAssignments();
      await get().fetchAidants();

      set({ isLoading: false });
      return result.data;
    } catch (error: any) {
      console.error('❌ Assign aidant error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message || 'Erreur lors de l\'assignation');
      throw error;
    }
  },

  // ============================================================
  // REVOKE ASSIGNMENT
  // ============================================================
  revokeAssignment: async (assignmentId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Token manquant');
      }

      const response = await fetch(`${API_BASE_URL}/aidants/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la révocation');
      }

      const result = await response.json();

      toast.success('✅ Assignation révoquée');

      // Rafraîchir les données
      await get().fetchMyAssignments();
      await get().fetchAidants();

      set({ isLoading: false });
      return result.data;
    } catch (error: any) {
      console.error('❌ Revoke assignment error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message || 'Erreur lors de la révocation');
      throw error;
    }
  },

  // ============================================================
  // SET FILTERS
  // ============================================================
  setFilters: (filters: Partial<AidantFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
    get().fetchAidants();
  },

  // ============================================================
  // UTILITIES
  // ============================================================
  clearError: () => set({ error: null }),
  
  reset: () => {
    set({
      aidants: [],
      selectedAidant: null,
      assignments: [],
      isLoading: false,
      error: null,
      filters: { ...DEFAULT_FILTERS },
      totalCount: 0,
    });
  },
}));
