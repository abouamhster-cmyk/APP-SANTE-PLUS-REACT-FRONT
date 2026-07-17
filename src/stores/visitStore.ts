// 📁 src/stores/visitStore.ts
 
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Visit, VisitStatus } from '@/types';
import { useAuthStore } from './authStore';
import { assignmentAPI } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

const generateVisitReference = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `VIS-${year}${month}${day}-${random}`;
};

export const getPonctualPrice = (durationMinutes: number = 60): number => {
  const prices: Record<string, number> = {
    '30': 5000,
    '45': 6000,
    '60': 7500,
    '90': 10000,
    '120': 12500,
  };
  const price = prices[durationMinutes.toString()];
  if (price) return price;
  return Math.round((durationMinutes / 60) * 7500);
};

const CACHE_KEY = 'sante_plus_visits_cache';
const CACHE_DURATION = 60000;

const getCachedVisits = (): { data: Visit[]; timestamp: number } | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
    return null;
  } catch {
    return null;
  }
};

const setCachedVisits = (visits: Visit[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: visits,
      timestamp: Date.now(),
    }));
  } catch {
    /* ignore */
  }
};

const clearCachedVisits = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('🗑️ Cache visites invalidé');
  } catch {
    /* ignore */
  }
};

interface VisitState {
  visits: Visit[];
  currentVisit: Visit | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  lastFetch: number | null;
  isCacheInvalidated: boolean;

  fetchVisits: (force?: boolean) => Promise<void>;
  fetchVisitById: (id: string) => Promise<void>;
  createVisit: (data: Partial<Visit> & {
    target_type?: 'personal' | 'patient';
    target_name?: string;
    target_user_id?: string;
    wizard_choice?: string;
    selected_aidant_id?: string;
    is_ponctual?: boolean;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
    metadata?: any; 
  }) => Promise<any>;
  updateVisit: (id: string, data: Partial<Visit>) => Promise<void>;
  deleteVisit: (id: string) => Promise<void>;
  confirmPayment: (id: string, transactionId: string) => Promise<any>;
  approveVisit: (id: string) => Promise<void>;
  refuseVisit: (id: string, reason: string) => Promise<void>;
  reassignVisit: (id: string, newAidantId: string, assignmentType: string) => Promise<void>;
  startVisit: (id: string, lat?: number | null, lng?: number | null) => Promise<void>;
  startAdHocVisit: (targetType: string, targetId: string, lat?: number | null, lng?: number | null) => Promise<any>; // ✅ NOUVEAU ACTION STORE
  completeVisit: (id: string, data: { actions: string[]; notes: string; photos?: string[]; audio_url?: string; lat?: number | null; lng?: number | null }) => Promise<void>;
  validateVisit: (id: string) => Promise<void>;
  cancelVisit: (id: string) => Promise<void>;
  invalidateCache: () => void;
  refresh: () => Promise<void>;
  getPendingVisits: () => Promise<Visit[]>;
  getVisitsNeedingReassign: () => Promise<Visit[]>;
  getVisitsByPatient: (patientId: string) => Promise<Visit[]>;
  canManageVisits: () => boolean;
  clearError: () => void;
  getActiveAidantForVisit: (patientId?: string, familyId?: string) => Promise<string | null>;

  assignAidantToVisit: (visitId: string, aidantId: string, assignmentType?: string, force?: boolean) => Promise<any>;
  getPendingAidantVisits: () => Promise<Visit[]>;
  getAvailableAidantsForVisit: (targetType?: string, targetId?: string) => Promise<any[]>;
  getVisitWizardOptions: (targetType: string, targetId: string, familyId?: string) => Promise<any>;
}

export const useVisitStore = create<VisitState>((set, get) => ({
  visits: [],
  currentVisit: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  lastFetch: null,
  isCacheInvalidated: false,

  canManageVisits: () => {
    const { profile } = useAuthStore.getState();
    return profile?.role === 'admin' || profile?.role === 'coordinator';
  },

  invalidateCache: () => {
    clearCachedVisits();
    set({ 
      isCacheInvalidated: true,
      isInitialized: false,
      lastFetch: null,
    });
    console.log('🔄 Cache visites invalidé');
  },

  refresh: async () => {
    get().invalidateCache();
    await get().fetchVisits(true);
  },

  getActiveAidantForVisit: async (patientId?: string, familyId?: string): Promise<string | null> => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) return null;

      const targetType = patientId ? 'patient' : 'personal_account';
      const targetId = patientId || user.id;
      const finalFamilyId = familyId || user.id;

      const response = await assignmentAPI.getActive(targetType, targetId, finalFamilyId);
      
      if (response.data?.success && response.data?.data?.aidant_id) {
        return response.data.data.aidant_id;
      }
      return null;
    } catch (error) {
      console.error('❌ getActiveAidantForVisit error:', error);
      return null;
    }
  },

  fetchVisits: async (force = false) => {
    const state = get();

    if (state.isLoading) {
      console.log('ℹ️ Déjà en cours de chargement, skip...');
      return;
    }

    if (state.isCacheInvalidated) {
      force = true;
    }

    if (!force && state.lastFetch && (Date.now() - state.lastFetch < CACHE_DURATION)) {
      console.log('📦 Utilisation du cache mémoire visites');
      return;
    }

    if (!force) {
      const cached = getCachedVisits();
      if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        console.log('📦 Utilisation du cache localStorage visites');
        set({ 
          visits: cached.data, 
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
      
      const { user } = useAuthStore.getState();
      if (!user) {
        set({ visits: [], isLoading: false });
        return;
      }

      const response = await api.get('/visits');
      const visitsData = response.data || [];

      setCachedVisits(visitsData);
      
      set({ 
        visits: visitsData, 
        isLoading: false,
        isInitialized: true,
        lastFetch: Date.now(),
        isCacheInvalidated: false,
      });
    } catch (error: any) {
      console.error('❌ Fetch visits error:', error);
      
      const cached = getCachedVisits();
      if (cached && cached.data.length > 0) {
        set({
          visits: cached.data,
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

  fetchVisitById: async (id: string) => {
    try {
      set({ error: null });

      const state = get();
      const cachedVisit = state.visits.find(v => v.id === id);
      if (cachedVisit) {
        console.log('📦 Visite trouvée dans le cache');
        set({ currentVisit: cachedVisit });
        return;
      }

      const { data: visit, error } = await supabase
        .from('visites')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          set({ error: 'Visite non trouvée' });
          return;
        }
        throw error;
      }

      let patient = null;
      if (visit.patient_id) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('*')
          .eq('id', visit.patient_id)
          .single();
        patient = patientData;
      }

      let aidant = null;
      if (visit.aidant_id) {
        const { data: aidantData } = await supabase
          .from('aidants')
          .select('*')
          .eq('id', visit.aidant_id)
          .single();
        
        if (aidantData) {
          const { data: userData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', aidantData.user_id)
            .single();
          
          aidant = {
            ...aidantData,
            user: userData || null,
          };
        }
      }

      const { data: photos } = await supabase
        .from('visite_photos')
        .select('*')
        .eq('visite_id', id);

      const { data: audios } = await supabase
        .from('visite_audios')
        .select('*')
        .eq('visite_id', id);

      const fullVisit = {
        ...visit,
        patient,
        aidant,
        photos: photos || [],
        audios: audios || [],
      };

      set({ currentVisit: fullVisit });
    } catch (error: any) {
      console.error('❌ Fetch visit error:', error);
      set({ error: error.message });
    }
  },

  createVisit: async (data: Partial<Visit> & {
    target_type?: 'personal' | 'patient';
    target_name?: string;
    target_user_id?: string;
    wizard_choice?: string;
    selected_aidant_id?: string;
    is_ponctual?: boolean;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
    metadata?: any;
  }): Promise<any> => {
    try {
      set({ error: null });

      const { user, profile } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const isManualAdmin = ['admin', 'coordinator'].includes(profile?.role || '');
      if (!isManualAdmin) {
        throw new Error('Seule l’administration de Santé Plus peut planifier des visites.');
      }

      const targetType = data.target_type || (data.patient_id ? 'patient' : 'personal');
      const targetName = data.target_name || (data.patient_id ? null : profile?.full_name || 'Personnel');
      const targetUserId = data.target_user_id || (data.patient_id ? null : user.id);

      const visitData = {
        reference: generateVisitReference(),
        user_id: targetUserId || user.id,
        patient_id: data.patient_id || null,
        target_type: targetType,
        target_name: targetName,
        aidant_id: data.aidant_id || null,
        coordinator_id: user.id,
        scheduled_date: data.scheduled_date || new Date().toISOString().split('T')[0],
        scheduled_time: data.scheduled_time || new Date().toTimeString().slice(0, 5),
        duration_minutes: data.duration_minutes || 60,
        status: 'planifiee',
        is_draft: false,
        is_ponctual: false, 
        requires_payment: false,           
        is_urgent: data.is_urgent || false,
        requested_by: user.id,
        actions: data.actions || [],
        notes: data.notes || null,
        visit_type: 'permanente',
        assignment_type: 'permanente',
        assigned_by_admin: true,
        admin_assigned_at: new Date().toISOString(),
        address: data.address || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        metadata: {
          created_by: user.id,
          created_at: new Date().toISOString(),
          manual_admin_planning: true,
          ...(data.metadata || {}), 
        }
      };

      const response = await api.post('/visits', visitData);
      const newVisit = response.data?.visit || response.data;

      get().invalidateCache();
      await get().fetchVisits(true);

      return newVisit;
    } catch (error: any) {
      console.error('❌ Create visit error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // ✅ ACTION DE CRÉATION DE VISITE À LA VOLÉE DIRECTEMENT DEPUIS LES STORES
  startAdHocVisit: async (targetType: string, targetId: string, lat?: number | null, lng?: number | null): Promise<any> => {
    try {
      set({ error: null, isLoading: true });
      
      const response = await api.post('/visits/start-adhoc', {
        targetType,
        targetId,
        lat,
        lng
      });

      const newVisit = response.data?.visit || response.data;

      get().invalidateCache();
      await get().fetchVisits(true);

      set({ 
        currentVisit: newVisit,
        isLoading: false
      });

      return newVisit;
    } catch (error: any) {
      console.error('❌ startAdHocVisit store error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  confirmPayment: async (id: string, transactionId: string): Promise<any> => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const response = await api.post(`/visits/${id}/confirm-payment`, { transaction_id: transactionId });
      const result = response.data?.visit || response.data;

      get().invalidateCache();
      await get().fetchVisits(true);

      set({ 
        currentVisit: result
      });

      return result;
    } catch (error: any) {
      console.error('❌ Erreur confirmation paiement:', error);
      throw error;
    }
  },

  approveVisit: async (id: string) => {
    try {
      set({ error: null });
      await api.post(`/visits/${id}/approve`);

      get().invalidateCache();
      await get().fetchVisits(true);
    } catch (error: any) {
      console.error('❌ Approve visit error:', error);
      throw error;
    }
  },

  refuseVisit: async (id: string, reason: string) => {
    try {
      set({ error: null });
      await api.post(`/visits/${id}/refuse`, { reason });

      get().invalidateCache();
      await get().fetchVisits(true);
    } catch (error: any) {
      console.error('❌ Refuse visit error:', error);
      throw error;
    }
  },

  reassignVisit: async (id: string, newAidantId: string, assignmentType: string) => {
    try {
      set({ error: null });
      await api.post(`/visits/${id}/reassign`, { aidant_id: newAidantId, assignment_type: assignmentType });

      get().invalidateCache();
      await get().fetchVisits(true);
    } catch (error: any) {
      console.error('❌ Reassign visit error:', error);
      throw error;
    }
  },

  startVisit: async (id: string, lat?: number | null, lng?: number | null) => {
    try {
      set({ error: null });
      await api.post(`/visits/${id}/start`, { lat, lng });

      get().invalidateCache();
      await get().fetchVisits(true);
    } catch (error: any) {
      console.error('❌ Start visit error:', error);
      throw error;
    }
  },

  completeVisit: async (id: string, data: { actions: string[]; notes: string; photos?: string[]; audio_url?: string; lat?: number | null; lng?: number | null }) => {
    try {
      set({ error: null });
      await api.post(`/visits/${id}/complete`, data);

      get().invalidateCache();
      await get().fetchVisits(true);
    } catch (error: any) {
      console.error('❌ Complete visit error:', error);
      throw error;
    }
  },

  validateVisit: async (id: string) => {
    try {
      set({ error: null });
      await api.post(`/visits/${id}/validate`);

      get().invalidateCache();
      await get().fetchVisits(true);
    } catch (error: any) {
      console.error('❌ Validate visit error:', error);
      throw error;
    }
  },

  cancelVisit: async (id: string) => {
    try {
      set({ error: null });
      await api.post(`/visits/${id}/cancel`);

      get().invalidateCache();
      await get().fetchVisits(true);
    } catch (error: any) {
      console.error('❌ Cancel visit error:', error);
      throw error;
    }
  },

  assignAidantToVisit: async (visitId: string, aidantId: string, assignmentType: string = 'permanente', force: boolean = false) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) throw new Error('Session expirée');

      const response = await fetch(`${API_URL}/visits/admin/assign-aidant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          visitId,
          aidantId,
          assignmentType,
          force,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'assignation');
      }

      const result = await response.json();

      get().invalidateCache();
      await get().fetchVisits(true);

      return result;
    } catch (error: any) {
      console.error('❌ assignAidantToVisit error:', error);
      throw error;
    }
  },

  getPendingAidantVisits: async (): Promise<Visit[]> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) throw new Error('Session expirée');

      const response = await fetch(`${API_URL}/visits/pending-aidant`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du chargement');
      }

      const result = await response.json();
      return result.data || [];
    } catch (error: any) {
      console.error('❌ getPendingAidantVisits error:', error);
      return [];
    }
  },

  getAvailableAidantsForVisit: async (targetType?: string, targetId?: string): Promise<any[]> => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) return [];

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) throw new Error('Session expirée');

      const params = new URLSearchParams();
      if (targetType) params.append('targetType', targetType);
      if (targetId) params.append('targetId', targetId);

      const response = await fetch(`${API_URL}/visits/available-aidants?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du chargement');
      }

      const result = await response.json();
      return result.data || [];
    } catch (error: any) {
      console.error('❌ getAvailableAidantsForVisit error:', error);
      return [];
    }
  },

  getVisitWizardOptions: async (targetType: string, targetId: string, familyId?: string): Promise<any> => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) return null;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) throw new Error('Session expirée');

      const params = new URLSearchParams({
        targetType,
        targetId,
      });
      if (familyId) params.append('familyId', familyId);

      const response = await fetch(`${API_URL}/visits/wizard-options?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du chargement');
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('❌ getVisitWizardOptions error:', error);
      return null;
    }
  },

  updateVisit: async (id: string, data: Partial<Visit>) => {
    try {
      const { profile } = useAuthStore.getState();
      if (profile?.role !== 'admin' && profile?.role !== 'coordinator') {
        throw new Error('Non autorisé');
      }

      const { data: visit, error = null } = await supabase
        .from('visites')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      get().invalidateCache();
      await get().fetchVisits(true);

      set({ 
        currentVisit: { ...get().currentVisit, ...visit } as Visit
      });

      toast.success('Visite mise à jour');
    } catch (error: any) {
      console.error('❌ Update visit error:', error);
      toast.error(error.message);
    }
  },

  deleteVisit: async (id: string) => {
    try {
      const { profile } = useAuthStore.getState();
      if (profile?.role !== 'admin' && profile?.role !== 'coordinator') {
        throw new Error('Non autorisé');
      }

      const { error } = await supabase
        .from('visites')
        .delete()
        .eq('id', id);

      if (error) throw error;

      get().invalidateCache();
      await get().fetchVisits(true);

      toast.success('Visite supprimée');
    } catch (error: any) {
      console.error('❌ Delete visit error:', error);
      toast.error(error.message);
    }
  },

  getPendingVisits: async () => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) return [];

      const { data: aidant } = await supabase
        .from('aidants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle(); 

      if (!aidant) return []; 

      const { data, error } = await supabase
        .from('visites')
        .select(`
          *,
          patient:patients!visites_patient_id_fkey(*),
          aidant:aidants!visites_aidant_id_fkey(*, user:profiles!aidants_user_id_fkey(*))
        `)
        .eq('aidant_id', aidant.id)
        .eq('status', 'planifiee')
        .is('approved_at', null)
        .is('refused_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error('❌ Get pending visits error:', error);
      return [];
    }
  },

  getVisitsNeedingReassign: async () => {
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data, error } = await supabase
        .from('visites')
        .select(`
          *,
          patient:patients!visites_patient_id_fkey(*),
          aidant:aidants!visites_aidant_id_fkey(*, user:profiles!aidants_user_id_fkey(*))
        `)
        .or(`status.eq.refusee, and(status.eq.planifiee, created_at.lt.${twentyFourHoursAgo.toISOString()}, approved_at.is.null, refused_at.is.null)`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error('❌ Get visits needing reassign error:', error);
      return [];
    }
  },

  getVisitsByPatient: async (patientId: string) => {
    try {
      const { data, error } = await supabase
        .from('visites')
        .select(`
          *,
          patient:patients!visites_patient_id_fkey(*),
          aidant:aidants!visites_aidant_id_fkey(*, user:profiles!aidants_user_id_fkey(*))
        `)
        .eq('patient_id', patientId)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error('❌ Get visits by patient error:', error);
      return [];
    }
  },

  clearError: () => set({ error: null }),
}));

export default useVisitStore;
