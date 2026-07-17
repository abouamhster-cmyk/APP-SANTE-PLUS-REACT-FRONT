// 📁 src/stores/assignmentStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { 
  AssignmentState, 
  AssignmentFilters, 
  AssignAidantRequest,
  AssignAidantResponse,
  TargetType,
} from '@/types/assignment';
import { useAuthStore } from './authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

export const useAssignmentStore = create<AssignmentState>((set, get) => ({
  assignments: [],
  activeAidant: null,
  allAidants: [],
  isLoading: false,
  error: null,
  isInitialized: false,

  fetchAssignments: async (filters?: AssignmentFilters) => {
    try {
      set({ isLoading: true, error: null });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Token de session manquant');
      }

      const { profile } = useAuthStore.getState();
      
      let endpoint = '/assignments';
      
      if (profile?.role === 'family') {
        endpoint = '/assignments/my';
      } else if (profile?.role === 'admin' || profile?.role === 'coordinator') {
        endpoint = '/assignments';
      } else if (profile?.role === 'aidant') {
        endpoint = `/assignments/aidant/${profile.id}`;
      }

      const params = new URLSearchParams();
      if (filters?.targetType) params.append('targetType', filters.targetType);
      if (filters?.targetId) params.append('targetId', filters.targetId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.aidantUserId) params.append('aidantUserId', filters.aidantUserId);

      const url = `${API_BASE_URL}${endpoint}${params.toString() ? `?${params.toString()}` : ''}`;

      console.log(`📡 Fetch assignments: ${url}`);

      const response = await fetch(url, {
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
        isInitialized: true,
      });
    } catch (error: any) {
      console.error('❌ Fetch assignments error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  fetchActiveAidant: async (targetType: TargetType, targetId: string, familyId?: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Token de session manquant');
      }

      const params = new URLSearchParams({
        targetType,
        targetId,
      });
      if (familyId) params.append('familyId', familyId);

      const response = await fetch(`${API_BASE_URL}/assignments/active?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la récupération de l\'aidant actif');
      }

      const result = await response.json();

      set({
        activeAidant: result.data || null,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('❌ Fetch active aidant error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  fetchAllAidants: async (targetType: TargetType, targetId: string, familyId?: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Token de session manquant');
      }

      const params = new URLSearchParams({
        targetType,
        targetId,
      });
      if (familyId) params.append('familyId', familyId);

      const response = await fetch(`${API_BASE_URL}/assignments/all?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la récupération des aidants');
      }

      const result = await response.json();

      set({
        allAidants: result.data || [],
        isLoading: false,
      });
    } catch (error: any) {
      console.error('❌ Fetch all aidants error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  assignAidant: async (data: AssignAidantRequest): Promise<AssignAidantResponse> => {
    try {
      set({ isLoading: true, error: null });

      const { profile } = useAuthStore.getState();
      
      // 🔒 Bloquer les actions d'écriture pour les familles
      if (profile?.role === 'family') {
        throw new Error("L'attribution d'un aidant est gérée par l'administration de Santé Plus. Veuillez les contacter.");
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Token de session manquant');
      }

      const response = await fetch(`${API_BASE_URL}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'assignation');
      }

      const result = await response.json();

      await get().fetchAssignments();

      set({ isLoading: false });
      return result;
    } catch (error: any) {
      console.error('❌ Assign aidant error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  revokeAssignment: async (assignmentId: string, reason?: string) => {
    try {
      set({ isLoading: true, error: null });

      const { profile } = useAuthStore.getState();
      
      // 🔒 Bloquer les révocations pour les familles
      if (profile?.role === 'family') {
        throw new Error("Seule l'administration de Santé Plus peut révoquer ou modifier une assignation.");
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Token de session manquant');
      }

      const response = await fetch(`${API_BASE_URL}/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la révocation');
      }

      await get().fetchAssignments();

      set({ isLoading: false });
    } catch (error: any) {
      console.error('❌ Revoke assignment error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  checkAssignment: async (aidantUserId: string, targetType: TargetType, targetId: string): Promise<boolean> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        return false;
      }

      const params = new URLSearchParams({
        aidantUserId,
        targetType,
        targetId,
      });

      const response = await fetch(`${API_BASE_URL}/assignments/check?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.data?.is_assigned || false;
    } catch (error) {
      console.error('❌ Check assignment error:', error);
      return false;
    }
  },

  clearError: () => set({ error: null }),
  
  reset: () => {
    set({
      assignments: [],
      activeAidant: null,
      allAidants: [],
      isLoading: false,
      error: null,
      isInitialized: false,
    });
  },
}));
