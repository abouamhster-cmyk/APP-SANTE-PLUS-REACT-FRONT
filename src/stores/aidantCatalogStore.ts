// 📁 src/stores/aidantCatalogStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './authStore';  
import { 
  AidantProfile, 
  AidantFilters, 
  DEFAULT_FILTERS,
  AidantCatalogState
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

interface AidantWithQuota extends AidantProfile {
  current_assignments: number;
  max_assignments: number;
  available_slots: number;
  is_available: boolean;
  current_orders: number;
  max_orders: number;
  available_order_slots: number;
  can_take_orders: boolean;
}

interface AidantCatalogStore extends AidantCatalogState {
  aidantsWithQuota: AidantWithQuota[];
  isLoadingQuota: boolean;
  quotaFilters: {
    minSlots?: number;
    maxSlots?: number;
    onlyAvailable?: boolean;
    onlyCanTakeOrders?: boolean;
  };
  
  getAvailableForFamily: (familyId: string, filters?: any) => Promise<AidantWithQuota[]>;
  getAidantsWithQuota: (filters?: any) => Promise<AidantWithQuota[]>;
  getAidantsByAvailability: (available: boolean) => Promise<AidantWithQuota[]>;
  getAidantsWithOrderCapacity: () => Promise<AidantWithQuota[]>;
  getAidantQuotaById: (aidantId: string) => Promise<{
    currentAssignments: number;
    maxAssignments: number;
    currentOrders: number;
    maxOrders: number;
  } | null>;
  refreshQuota: () => Promise<void>;
  
  fetchAidants: (filters?: Partial<AidantFilters>) => Promise<void>;
  fetchAidantById: (id: string) => Promise<void>;
  fetchMyAssignments: () => Promise<void>;
  assignAidant: (aidantId: string, patientId: string | null, assignmentType?: string) => Promise<void>;
  revokeAssignment: (assignmentId: string) => Promise<void>;
  setFilters: (filters: Partial<AidantFilters>) => void;
  clearError: () => void;
  reset: () => void;
}

export const useAidantCatalogStore = create<AidantCatalogStore>((set, get) => ({
  aidants: [],
  selectedAidant: null,
  assignments: [],
  isLoading: false,
  error: null,
  filters: { ...DEFAULT_FILTERS },
  totalCount: 0,

  aidantsWithQuota: [],
  isLoadingQuota: false,
  quotaFilters: {
    onlyAvailable: true,
    onlyCanTakeOrders: false,
  },

  getAvailableForFamily: async (familyId: string, filters = {}) => {
    try {
      set({ isLoadingQuota: true, error: null });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) throw new Error('Token de session manquant');

      const params = new URLSearchParams({
        familyId,
        ...filters,
      });

      const response = await fetch(`${API_BASE_URL}/visits/available-aidants?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du chargement des aidants');
      }

      const result = await response.json();
      const aidants = result.data || [];

      const enrichedAidants = await Promise.all(
        aidants.map(async (aidant: any) => {
          const quota = await get().getAidantQuotaById(aidant.id);
          return {
            ...aidant,
            current_assignments: quota?.currentAssignments || 0,
            max_assignments: quota?.maxAssignments || 4,
            available_slots: Math.max(0, (quota?.maxAssignments || 4) - (quota?.currentAssignments || 0)),
            is_available: aidant.available && (quota?.currentAssignments || 0) < (quota?.maxAssignments || 4),
            current_orders: quota?.currentOrders || 0,
            max_orders: quota?.maxOrders || 2,
            available_order_slots: Math.max(0, (quota?.maxOrders || 2) - (quota?.currentOrders || 0)),
            can_take_orders: (quota?.currentOrders || 0) < (quota?.maxOrders || 2),
          };
        })
      );

      set({
        aidantsWithQuota: enrichedAidants,
        isLoadingQuota: false,
      });

      return enrichedAidants;
    } catch (error: any) {
      console.error('❌ getAvailableForFamily error:', error);
      set({ error: error.message, isLoadingQuota: false });
      return [];
    }
  },

  getAidantsWithQuota: async (filters = {}) => {
    try {
      set({ isLoadingQuota: true, error: null });

      const { data: aidants, error: aidantsError } = await supabase
        .from('aidants')
        .select(`
          *,
          user:profiles!aidants_user_id_fkey(
            id,
            full_name,
            email,
            phone,
            avatar_url
          )
        `)
        .eq('status', 'approved')
        .eq('is_verified', true);

      if (aidantsError) throw aidantsError;

      const enrichedAidants = await Promise.all(
        (aidants || []).map(async (aidant: any) => {
          const quota = await get().getAidantQuotaById(aidant.id);
          return {
            ...aidant,
            current_assignments: quota?.currentAssignments || 0,
            max_assignments: quota?.maxAssignments || 4,
            available_slots: Math.max(0, (quota?.maxAssignments || 4) - (quota?.currentAssignments || 0)),
            is_available: aidant.available && (quota?.currentAssignments || 0) < (quota?.maxAssignments || 4),
            current_orders: quota?.currentOrders || 0,
            max_orders: quota?.maxOrders || 2,
            available_order_slots: Math.max(0, (quota?.maxOrders || 2) - (quota?.currentOrders || 0)),
            can_take_orders: (quota?.currentOrders || 0) < (quota?.maxOrders || 2),
          };
        })
      );

      let filtered = enrichedAidants;
      if (filters.onlyAvailable !== false) {
        filtered = filtered.filter(a => a.is_available);
      }
      if (filters.onlyCanTakeOrders) {
        filtered = filtered.filter(a => a.can_take_orders);
      }
      set({
        aidantsWithQuota: filtered,
        isLoadingQuota: false,
      });

      return filtered;
    } catch (error: any) {
      console.error('❌ getAidantsWithQuota error:', error);
      set({ error: error.message, isLoadingQuota: false });
      return [];
    }
  },

  getAidantsByAvailability: async (available: boolean) => {
    return await get().getAidantsWithQuota({ onlyAvailable: available });
  },

  getAidantsWithOrderCapacity: async () => {
    return await get().getAidantsWithQuota({ onlyCanTakeOrders: true });
  },

  getAidantQuotaById: async (aidantId: string) => {
    try {
      const { data: aidant, error: aidantError } = await supabase
        .from('aidants')
        .select('id, user_id, current_assignments, max_assignments, current_orders, max_orders')
        .eq('id', aidantId)
        .single();

      if (aidantError) return null;

      const { count: activeAssignments } = await supabase
        .from('aidant_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('aidant_user_id', aidant.user_id)
        .eq('status', 'active');

      const { count: activeOrders } = await supabase
        .from('commandes')
        .select('id', { count: 'exact', head: true })
        .eq('aidant_id', aidantId)
        .in('status', ['en_cours', 'livree']);

      return {
        currentAssignments: activeAssignments || aidant.current_assignments || 0,
        maxAssignments: aidant.max_assignments || 4,
        currentOrders: activeOrders || aidant.current_orders || 0,
        maxOrders: aidant.max_orders || 2,
      };
    } catch (error) {
      console.error('❌ getAidantQuotaById error:', error);
      return null;
    }
  },

  refreshQuota: async () => {
    const state = get();
    if (state.aidantsWithQuota.length > 0) {
      await state.getAidantsWithQuota(state.quotaFilters);
    }
    await state.fetchAidants();
  },

  fetchAidants: async (filters = {}) => {
    try {
      set({ isLoading: true, error: null });
      const currentFilters = { ...get().filters, ...filters };
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) throw new Error('Token de session manquant');

      const params = new URLSearchParams();
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await fetch(`${API_BASE_URL}/aidants/catalog?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du chargement des aidants');
      }

      const result = await response.json();

      const enrichedAidants = await Promise.all(
        (result.data || []).map(async (aidant: any) => {
          const quota = await get().getAidantQuotaById(aidant.id);
          return {
            ...aidant,
            current_assignments: quota?.currentAssignments || 0,
            max_assignments: quota?.maxAssignments || 4,
            available_slots: Math.max(0, (quota?.maxAssignments || 4) - (quota?.currentAssignments || 0)),
            is_available: aidant.available && (quota?.currentAssignments || 0) < (quota?.maxAssignments || 4),
            current_orders: quota?.currentOrders || 0,
            max_orders: quota?.maxOrders || 2,
            available_order_slots: Math.max(0, (quota?.maxOrders || 2) - (quota?.currentOrders || 0)),
            can_take_orders: (quota?.currentOrders || 0) < (quota?.maxOrders || 2),
          };
        })
      );

      set({
        aidants: enrichedAidants,
        isLoading: false,
        totalCount: result.count || enrichedAidants.length,
      });
    } catch (error: any) {
      console.error('❌ Fetch aidants error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  fetchAidantById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data: aidant, error } = await supabase
        .from('aidants')
        .select(`
          *,
          user:profiles!aidants_user_id_fkey(
            id,
            full_name,
            email,
            phone,
            avatar_url
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const quota = await get().getAidantQuotaById(aidant.id);
      const enrichedAidant = {
        ...aidant,
        current_assignments: quota?.currentAssignments || 0,
        max_assignments: quota?.maxAssignments || 4,
        available_slots: Math.max(0, (quota?.maxAssignments || 4) - (quota?.currentAssignments || 0)),
        is_available: aidant.available && (quota?.currentAssignments || 0) < (quota?.maxAssignments || 4),
        current_orders: quota?.currentOrders || 0,
        max_orders: quota?.maxOrders || 2,
        available_order_slots: Math.max(0, (quota?.maxOrders || 2) - (quota?.currentOrders || 0)),
        can_take_orders: (quota?.currentOrders || 0) < (quota?.maxOrders || 2),
      };

      set({
        selectedAidant: enrichedAidant,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('❌ Fetch aidant by ID error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  fetchMyAssignments: async () => {
    try {
      set({ isLoading: true, error: null });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) throw new Error('Token de session manquant');

      const { profile } = useAuthStore.getState();
      let endpoint = '/assignments';
      if (profile?.role === 'family') {
        endpoint = '/assignments/my';
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du chargement des assignations');
      }

      const result = await response.json();

      const formattedAssignments = (result.data || []).map((assignment: any) => ({
        id: assignment.id,
        patient_id: assignment.target_type === 'patient' ? assignment.target_id : null,
        family_id: assignment.target_id,
        is_primary: assignment.assignment_type === 'primary',
        relationship: assignment.assignment_type,
        created_at: assignment.created_at,
        target_type: assignment.target_type,
        patient: assignment.target_patient || null,
        family: assignment.target_profile || null,
        aidant: assignment.aidant || null,
        is_personal: assignment.target_type === 'personal_account',
        target_name: assignment.target_type === 'patient' 
          ? `${assignment.target_patient?.first_name || ''} ${assignment.target_patient?.last_name || ''}`.trim()
          : assignment.target_profile?.full_name || 'Compte personnel',
      }));

      set({
        assignments: formattedAssignments,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('❌ Fetch assignments error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  assignAidant: async (aidantId: string, patientId: string | null = null, assignmentType = 'permanente') => {
    try {
      set({ isLoading: true, error: null });

      const { profile } = useAuthStore.getState();
      
      // 🔒 Bloquer les tentatives des familles
      if (profile?.role === 'family') {
        throw new Error("L'attribution d'un aidant est gérée par l'administration de Santé Plus. Veuillez les contacter.");
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) throw new Error('Token de session manquant');

      const quota = await get().getAidantQuotaById(aidantId);
      if (quota && assignmentType === 'permanente' && quota.currentAssignments >= quota.maxAssignments) {
        throw new Error(`Cet aidant a déjà ${quota.currentAssignments}/${quota.maxAssignments} assignations`);
      }

      const targetType = patientId ? 'patient' : 'personal_account';
      const targetId = patientId || (await supabase.auth.getUser()).data.user?.id;

      const assignmentTypeMap: Record<string, string> = {
        'permanente': 'primary',
        'temporaire': 'temporary',
        'ponctuelle': 'secondary',
      };
      const newAssignmentType = assignmentTypeMap[assignmentType] || 'primary';

      const payload = {
        aidantUserId: aidantId,
        targetType,
        targetId,
        assignmentType: newAssignmentType,
        reason: patientId ? `Assignation au patient ${patientId}` : 'Assignation personnelle',
      };

      const response = await fetch(`${API_BASE_URL}/assignments`, {
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

      await get().fetchMyAssignments();
      await get().fetchAidants();
      await get().refreshQuota();

      set({ isLoading: false });
      return result.data;
    } catch (error: any) {
      console.error('❌ Assign aidant error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  revokeAssignment: async (assignmentId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { profile } = useAuthStore.getState();
      
      // 🔒 Bloquer les tentatives des familles
      if (profile?.role === 'family') {
        throw new Error("Seule l'administration de Santé Plus peut révoquer ou modifier une assignation.");
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) throw new Error('Token de session manquant');

      const response = await fetch(`${API_BASE_URL}/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la révocation');
      }

      const result = await response.json();

      await get().fetchMyAssignments();
      await get().fetchAidants();
      await get().refreshQuota();

      set({ isLoading: false });
      return result.data;
    } catch (error: any) {
      console.error('❌ Revoke assignment error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  setFilters: (filters: Partial<AidantFilters>) => {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
    get().fetchAidants();
  },

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
      aidantsWithQuota: [],
      isLoadingQuota: false,
      quotaFilters: {
        onlyAvailable: true,
        onlyCanTakeOrders: false,
      },
    });
  },
}));
