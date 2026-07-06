// 📁 frontend/src/stores/aidantCatalogStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { 
  AidantProfile, 
  AidantAssignment, 
  AidantFilters, 
  DEFAULT_FILTERS,
  AidantCatalogState
} from '@/types';
import { assignmentAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

// ============================================================
// TYPES
// ============================================================

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
  // 🆕 Nouveaux états
  aidantsWithQuota: AidantWithQuota[];
  isLoadingQuota: boolean;
  quotaFilters: {
    minSlots?: number;
    maxSlots?: number;
    onlyAvailable?: boolean;
    onlyCanTakeOrders?: boolean;
  };
  
  // 🆕 Nouvelles actions
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
  
  // Actions existantes (conservées)
  fetchAidants: (filters?: Partial<AidantFilters>) => Promise<void>;
  fetchAidantById: (id: string) => Promise<void>;
  fetchMyAssignments: () => Promise<void>;
  assignAidant: (aidantId: string, patientId: string | null, assignmentType?: string) => Promise<void>;
  revokeAssignment: (assignmentId: string) => Promise<void>;
  setFilters: (filters: Partial<AidantFilters>) => void;
  clearError: () => void;
  reset: () => void;
}

// ============================================================
// STORE
// ============================================================

export const useAidantCatalogStore = create<AidantCatalogStore>((set, get) => ({
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

  // 🆕 Nouveaux états
  aidantsWithQuota: [],
  isLoadingQuota: false,
  quotaFilters: {
    onlyAvailable: true,
    onlyCanTakeOrders: false,
  },

  // ============================================================
  // 🆕 GET AVAILABLE AIDANTS FOR FAMILY
  // ============================================================
  getAvailableForFamily: async (familyId: string, filters = {}) => {
    try {
      set({ isLoadingQuota: true, error: null });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Token manquant');
      }

      const params = new URLSearchParams({
        familyId,
        ...filters,
      });

      const response = await fetch(`${API_BASE_URL}/visits/available-aidants?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du chargement des aidants');
      }

      const result = await response.json();
      const aidants = result.data || [];

      // ✅ Enrichir avec les informations de quota
      const enrichedAidants = await Promise.all(
        aidants.map(async (aidant: any) => {
          const quota = await get().getAidantQuotaById(aidant.id);
          return {
            ...aidant,
            current_assignments: quota?.currentAssignments || 0,
            max_assignments: quota?.maxAssignments || 4,
            available_slots: Math.max(0, (quota?.maxAssignments || 4) - (quota?.currentAssignments || 0)),
            is_available: (quota?.currentAssignments || 0) < (quota?.maxAssignments || 4),
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
      toast.error(error.message || 'Erreur lors du chargement des aidants');
      return [];
    }
  },

  // ============================================================
  // 🆕 GET AIDANTS WITH QUOTA
  // ============================================================
  getAidantsWithQuota: async (filters = {}) => {
    try {
      set({ isLoadingQuota: true, error: null });

      // Récupérer tous les aidants
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

      // ✅ Enrichir avec les informations de quota
      const enrichedAidants = await Promise.all(
        (aidants || []).map(async (aidant: any) => {
          const quota = await get().getAidantQuotaById(aidant.id);
          return {
            ...aidant,
            current_assignments: quota?.currentAssignments || 0,
            max_assignments: quota?.maxAssignments || 4,
            available_slots: Math.max(0, (quota?.maxAssignments || 4) - (quota?.currentAssignments || 0)),
            is_available: (quota?.currentAssignments || 0) < (quota?.maxAssignments || 4),
            current_orders: quota?.currentOrders || 0,
            max_orders: quota?.maxOrders || 2,
            available_order_slots: Math.max(0, (quota?.maxOrders || 2) - (quota?.currentOrders || 0)),
            can_take_orders: (quota?.currentOrders || 0) < (quota?.maxOrders || 2),
          };
        })
      );

      // ✅ Appliquer les filtres
      let filtered = enrichedAidants;

      if (filters.onlyAvailable !== false) {
        filtered = filtered.filter(a => a.is_available);
      }

      if (filters.onlyCanTakeOrders) {
        filtered = filtered.filter(a => a.can_take_orders);
      }

      if (filters.minSlots) {
        filtered = filtered.filter(a => a.available_slots >= filters.minSlots);
      }

      if (filters.maxSlots) {
        filtered = filtered.filter(a => a.available_slots <= filters.maxSlots);
      }

      if (filters.minOrderSlots) {
        filtered = filtered.filter(a => a.available_order_slots >= filters.minOrderSlots);
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

  // ============================================================
  // 🆕 GET AIDANTS BY AVAILABILITY
  // ============================================================
  getAidantsByAvailability: async (available: boolean) => {
    try {
      const aidants = await get().getAidantsWithQuota({
        onlyAvailable: available,
      });
      return aidants;
    } catch (error: any) {
      console.error('❌ getAidantsByAvailability error:', error);
      return [];
    }
  },

  // ============================================================
  // 🆕 GET AIDANTS WITH ORDER CAPACITY
  // ============================================================
  getAidantsWithOrderCapacity: async () => {
    try {
      const aidants = await get().getAidantsWithQuota({
        onlyCanTakeOrders: true,
      });
      return aidants;
    } catch (error: any) {
      console.error('❌ getAidantsWithOrderCapacity error:', error);
      return [];
    }
  },

  // ============================================================
  // 🆕 GET AIDANT QUOTA BY ID
  // ============================================================
  getAidantQuotaById: async (aidantId: string) => {
    try {
      // 1. Récupérer l'aidant
      const { data: aidant, error: aidantError } = await supabase
        .from('aidants')
        .select('id, user_id, current_assignments, max_assignments, current_orders, max_orders')
        .eq('id', aidantId)
        .single();

      if (aidantError) {
        console.error('❌ getAidantQuotaById error:', aidantError);
        return null;
      }

      // 2. Compter les assignations actives (vérification supplémentaire)
      const { count: activeAssignments, error: countError } = await supabase
        .from('aidant_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('aidant_user_id', aidant.user_id)
        .eq('status', 'active');

      if (countError) {
        console.error('❌ Erreur comptage assignations:', countError);
      }

      // 3. Compter les commandes en cours
      const { count: activeOrders, error: ordersError } = await supabase
        .from('commandes')
        .select('id', { count: 'exact', head: true })
        .eq('aidant_id', aidantId)
        .in('status', ['en_cours', 'livree']);

      if (ordersError) {
        console.error('❌ Erreur comptage commandes:', ordersError);
      }

      return {
        currentAssignments: activeAssignments || aidant.current_assignments || 0,
        maxAssignments: aidant.max_assignments || 4,
        currentOrders: activeOrders || aidant.current_orders || 0,
        maxOrders: aidant.max_orders || 2,
      };
    } catch (error: any) {
      console.error('❌ getAidantQuotaById error:', error);
      return null;
    }
  },

  // ============================================================
  // 🆕 REFRESH QUOTA
  // ============================================================
  refreshQuota: async () => {
    try {
      const state = get();
      if (state.aidantsWithQuota.length > 0) {
        await state.getAidantsWithQuota(state.quotaFilters);
      }
      // Rafraîchir les aidants du catalogue aussi
      await state.fetchAidants();
    } catch (error: any) {
      console.error('❌ refreshQuota error:', error);
    }
  },

  // ============================================================
  // FETCH AIDANTS AVEC FILTRES (EXISTANT - MODIFIÉ)
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

      // ✅ Enrichir avec les informations de quota
      const enrichedAidants = await Promise.all(
        (result.data || []).map(async (aidant: any) => {
          const quota = await get().getAidantQuotaById(aidant.id);
          return {
            ...aidant,
            current_assignments: quota?.currentAssignments || 0,
            max_assignments: quota?.maxAssignments || 4,
            available_slots: Math.max(0, (quota?.maxAssignments || 4) - (quota?.currentAssignments || 0)),
            is_available: (quota?.currentAssignments || 0) < (quota?.maxAssignments || 4),
            current_orders: quota?.currentOrders || 0,
            max_orders: quota?.maxOrders || 2,
            available_order_slots: Math.max(0, (quota?.maxOrders || 2) - (quota?.currentOrders || 0)),
            can_take_orders: (quota?.currentOrders || 0) < (quota?.maxOrders || 2),
          };
        })
      );

      set({
        aidants: enrichedAidants,
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
  // FETCH AIDANT BY ID (EXISTANT - MODIFIÉ)
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
      const aidant = result.data;

      // ✅ Enrichir avec les informations de quota
      const quota = await get().getAidantQuotaById(aidant.id);
      const enrichedAidant = {
        ...aidant,
        current_assignments: quota?.currentAssignments || 0,
        max_assignments: quota?.maxAssignments || 4,
        available_slots: Math.max(0, (quota?.maxAssignments || 4) - (quota?.currentAssignments || 0)),
        is_available: (quota?.currentAssignments || 0) < (quota?.maxAssignments || 4),
        current_orders: quota?.currentOrders || 0,
        max_orders: quota?.maxOrders || 2,
        available_order_slots: Math.max(0, (quota?.maxOrders || 2) - (quota?.currentOrders || 0)),
        can_take_orders: (quota?.currentOrders || 0) < (quota?.maxOrders || 2),
      };

      set({
        selectedAidant: enrichedAidant,
        isLoading: false,
      });

      return enrichedAidant;
    } catch (error: any) {
      console.error('❌ Fetch aidant by ID error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message || 'Erreur lors du chargement de l\'aidant');
      return null;
    }
  },

  // ============================================================
  // FETCH MY ASSIGNMENTS (EXISTANT - MODIFIÉ)
  // ============================================================
  fetchMyAssignments: async () => {
    try {
      set({ isLoading: true, error: null });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Token manquant');
      }

      const response = await fetch(`${API_BASE_URL}/assignments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
      toast.error(error.message || 'Erreur lors du chargement des assignations');
    }
  },

  // ============================================================
  // ASSIGN AIDANT (EXISTANT - MODIFIÉ AVEC QUOTA)
  // ============================================================
  assignAidant: async (aidantId: string, patientId: string | null = null, assignmentType = 'permanente') => {
    try {
      set({ isLoading: true, error: null });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Token manquant');
      }

      // ✅ Vérifier le quota avant d'assigner
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

      console.log('📤 Assignation aidant avec payload:', payload);

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

      toast.success('✅ Aidant assigné avec succès !');

      // Rafraîchir les données
      await get().fetchMyAssignments();
      await get().fetchAidants();
      await get().refreshQuota();

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
  // REVOKE ASSIGNMENT (EXISTANT - MODIFIÉ)
  // ============================================================
  revokeAssignment: async (assignmentId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Token manquant');
      }

      const response = await fetch(`${API_BASE_URL}/assignments/${assignmentId}`, {
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
      await get().refreshQuota();

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
  // SET FILTERS (EXISTANT)
  // ============================================================
  setFilters: (filters: Partial<AidantFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
    get().fetchAidants();
  },

  // ============================================================
  // UTILITIES (EXISTANT)
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
      aidantsWithQuota: [],
      isLoadingQuota: false,
      quotaFilters: {
        onlyAvailable: true,
        onlyCanTakeOrders: false,
      },
    });
  },
}));
