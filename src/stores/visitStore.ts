// 📁 frontend/src/stores/visitStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Visit, VisitStatus } from '@/types';
import { useAuthStore } from './authStore';
import { assignmentAPI } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';

// ✅ IMPORTER LES HELPERS
import {
  getVisitStatusForCreation,
  requiresPonctualPayment,
} from '@/lib/constants';

// ✅ URL UNIQUE
const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

// ============================================================
// CONSTANTES
// ============================================================

const generateVisitReference = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `VIS-${year}${month}${day}-${random}`;
};

// ✅ EXPORTER LA FONCTION getPonctualPrice (déjà dans constants.ts)
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

// ============================================================
// CACHE HELPERS
// ============================================================

const CACHE_KEY = 'sante_plus_visits_cache';
const CACHE_DURATION = 60000;

const getCachedVisits = (): { data: Visit[]; timestamp: number } | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
    return null;
  } catch { return null; }
};

const setCachedVisits = (visits: Visit[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: visits,
      timestamp: Date.now(),
    }));
  } catch { /* ignore */ }
};

const clearCachedVisits = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('🗑️ Cache visites invalidé');
  } catch { /* ignore */ }
};

// ============================================================
// STORE
// ============================================================

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
  }) => Promise<Visit>;
  updateVisit: (id: string, data: Partial<Visit>) => Promise<void>;
  deleteVisit: (id: string) => Promise<void>;
  confirmPayment: (id: string, transactionId: string) => Promise<Visit>;
  approveVisit: (id: string) => Promise<void>;
  refuseVisit: (id: string, reason: string) => Promise<void>;
  reassignVisit: (id: string, newAidantId: string, assignmentType: string) => Promise<void>;
  startVisit: (id: string) => Promise<void>;
  completeVisit: (id: string, data: { actions: string[]; notes: string; photos?: string[] }) => Promise<void>;
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
  
  // 🆕 NOUVELLES FONCTIONS
  assignAidantToVisit: (visitId: string, aidantId: string, assignmentType?: string, force?: boolean) => Promise<any>;
  getPendingAidantVisits: () => Promise<Visit[]>;
  getAvailableAidantsForVisit: (targetType?: string, targetId?: string) => Promise<any[]>;
  getVisitWizardOptions: (targetType: string, targetId: string, familyId?: string) => Promise<any>;
}

export const useVisitStore = create<VisitState>((set, get) => ({
  // ============================================================
  // ÉTAT INITIAL
  // ============================================================
  visits: [],
  currentVisit: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  lastFetch: null,
  isCacheInvalidated: false,

  // ============================================================
  // UTILITAIRES
  // ============================================================
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

  // ============================================================
  // FETCH VISITS - AVEC RÉCUPÉRATION DES AIDANTS POUR LES FAMILLES
  // ============================================================
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
      
      const { user, profile } = useAuthStore.getState();
      if (!user) {
        set({ visits: [], isLoading: false });
        return;
      }

      // ✅ Appel API
      const response = await api.get('/visits');
      const visitsData = response.data || [];

      // ✅ POUR LES FAMILLES : Forcer le rechargement des aidants
      let visitsWithFullRelations = visitsData;

      if (profile?.role === 'family' && visitsWithFullRelations.length > 0) {
        const aidantIds = [...new Set(
          visitsWithFullRelations
            .filter((v: any) => v.aidant_id)
            .map((v: any) => v.aidant_id)
        )];

        if (aidantIds.length > 0) {
          const { data: aidantsData } = await supabase
            .from('aidants')
            .select(`
              id,
              user_id,
              specialties,
              available,
              rating,
              total_missions,
              completed_missions,
              cancelled_missions,
              user:profiles!aidants_user_id_fkey (
                id,
                full_name,
                email,
                phone,
                avatar_url
              )
            `)
            .in('id', aidantIds);

          if (aidantsData) {
            const aidantMap = aidantsData.reduce((acc: any, a: any) => {
              acc[a.id] = a;
              return acc;
            }, {});

            visitsWithFullRelations = visitsWithFullRelations.map((visit: any) => ({
              ...visit,
              aidant: visit.aidant_id ? aidantMap[visit.aidant_id] || null : null,
            }));
          }
        }
      }

      setCachedVisits(visitsWithFullRelations);
      
      set({ 
        visits: visitsWithFullRelations, 
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

  // ============================================================
  // FETCH VISIT BY ID
  // ============================================================
  fetchVisitById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const state = get();
      const cachedVisit = state.visits.find(v => v.id === id);
      if (cachedVisit) {
        console.log('📦 Visite trouvée dans le cache');
        set({ currentVisit: cachedVisit, isLoading: false });
        return;
      }

      const { data: visit, error } = await supabase
        .from('visites')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          set({ error: 'Visite non trouvée', isLoading: false });
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

      const fullVisit = {
        ...visit,
        patient,
        aidant,
      };

      set({ currentVisit: fullVisit, isLoading: false });
    } catch (error: any) {
      console.error('❌ Fetch visit error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // ============================================================
  // ✅ CREATE VISIT - CORRIGÉ AVEC GESTION DU WIZARD
  // ============================================================
  createVisit: async (data: Partial<Visit> & { 
    target_type?: 'personal' | 'patient'; 
    target_name?: string;
    target_user_id?: string;
    wizard_choice?: string;
    selected_aidant_id?: string;
  }): Promise<Visit> => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      if (profile?.role === 'aidant') {
        throw new Error('Les aidants ne peuvent pas créer de visites');
      }

      // ✅ Déterminer target_type et target_name
      const targetType = data.target_type || (data.patient_id ? 'patient' : 'personal');
      const targetName = data.target_name || (data.patient_id ? null : profile?.full_name || 'Personnel');
      const targetUserId = data.target_user_id || (data.patient_id ? null : user.id);

      const isPonctual = data.visit_type === 'ponctuelle' || false;
      let status: VisitStatus = 'planifiee';
      let requiresPayment = false;
      let paymentAmount = 0;

      // ✅ LOGIQUE UNIFIÉE : Vérifier l'abonnement
      if (isPonctual) {
        requiresPayment = true;
        status = 'brouillon';
        paymentAmount = getPonctualPrice(data.duration_minutes || 60);
      } else {
        const { data: subscription } = await supabase
          .from('abonnements')
          .select('id, remaining_visits, status')
          .eq('user_id', targetUserId || user.id)
          .eq('status', 'actif')
          .maybeSingle();

        if (!subscription || subscription.remaining_visits <= 0) {
          requiresPayment = true;
          status = 'brouillon';
          paymentAmount = getPonctualPrice(data.duration_minutes || 60);
        }
      }

      // ✅ Récupérer l'aidant actif (si pas de paiement requis)
      let finalAidantId = data.aidant_id || null;
      let autoAssigned = false;
      let wizardChoice = data.wizard_choice || null;
      let selectedAidantId = data.selected_aidant_id || null;

      // ✅ Si wizard_choice est 'without_aidant' → status = en_attente_aidant
      if (wizardChoice === 'without_aidant') {
        status = 'en_attente_aidant';
        finalAidantId = null;
        requiresPayment = false;
      }

      // ✅ Si un aidant est sélectionné via le wizard, l'utiliser
      if (selectedAidantId) {
        finalAidantId = selectedAidantId;
        console.log(`✅ Aidant sélectionné via wizard: ${finalAidantId}`);
      }

      // ✅ Si pas d'aidant et pas de paiement requis → essayer d'en trouver un automatiquement
      if (!finalAidantId && status !== 'brouillon' && status !== 'en_attente_aidant') {
        const patientId = data.patient_id || undefined;
        const familyId = targetUserId || user.id;
        
        finalAidantId = await get().getActiveAidantForVisit(
          patientId ?? undefined, 
          familyId ?? undefined
        );
        autoAssigned = !!finalAidantId;
        
        if (finalAidantId) {
          console.log(`✅ Aidant automatique trouvé pour la visite: ${finalAidantId}`);
        }
      }

      // ✅ Si toujours pas d'aidant et pas de paiement requis → DÉCLENCHER LE WIZARD
      if (!finalAidantId && status !== 'brouillon' && status !== 'en_attente_aidant') {
        console.log('🔄 Aucun aidant trouvé, déclenchement du wizard');
        set({ isLoading: false });
        
        // ✅ Créer une erreur spéciale pour déclencher le wizard
        const wizardError: any = new Error('Aucun aidant disponible');
        wizardError.response = {
          status: 422,
          data: {
            wizard_required: true,
            targetType: targetType === 'patient' ? 'patient' : 'personal_account',
            targetId: data.patient_id || targetUserId || user.id,
            targetName: targetName || 'Personnel',
            familyId: targetUserId || user.id,
            scheduledDate: data.scheduled_date,
            scheduledTime: data.scheduled_time,
          }
        };
        throw wizardError;
      }

      // ✅ CONSTRUIRE LES DONNÉES DE LA VISITE
      const visitData = {
        reference: generateVisitReference(),
        user_id: targetUserId || user.id,
        patient_id: data.patient_id || null,
        target_type: targetType,
        target_name: targetName,
        aidant_id: finalAidantId,
        coordinator_id: profile?.role === 'family' ? null : user.id,
        scheduled_date: data.scheduled_date || new Date().toISOString().split('T')[0],
        scheduled_time: data.scheduled_time || new Date().toTimeString().slice(0, 5),
        duration_minutes: data.duration_minutes || 60,
        status: status,
        is_draft: requiresPayment,
        requires_payment: requiresPayment,           
        is_urgent: data.is_urgent || false,
        requested_by: user.id,
        actions: data.actions || [],
        notes: data.notes || null,
        visit_type: data.visit_type || (requiresPayment ? 'ponctuelle' : 'permanente'),
        assignment_type: data.assignment_type || 'ponctuelle',
        draft_expires_at: requiresPayment ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
        is_permanent: wizardChoice === 'permanente',
        assigned_by_admin: profile?.role === 'admin' || profile?.role === 'coordinator',
        admin_assigned_at: (profile?.role === 'admin' || profile?.role === 'coordinator') ? new Date().toISOString() : null,
        waiting_for_aidant_since: status === 'en_attente_aidant' ? new Date().toISOString() : null,
        metadata: {
          created_by: user.id,
          created_at: new Date().toISOString(),
          is_ponctual: isPonctual || requiresPayment,
          requires_payment: requiresPayment,
          is_draft: requiresPayment,
          payment_amount: requiresPayment ? paymentAmount : null,
          scheduled_from_draft: false,
          target_user_id: targetUserId || user.id,
          auto_assigned_aidant: autoAssigned,
          wizard_choice: wizardChoice || null,
          selected_aidant: selectedAidantId || null,
          waiting_for_aidant: status === 'en_attente_aidant',
          is_personal_account: targetType === 'personal' && !data.patient_id,
        }
      };

      console.log('📤 Données visite envoyées:', JSON.stringify(visitData, null, 2));

      // ✅ Appel API
      let newVisit;
      try {
        const response = await api.post('/visits', visitData);
        console.log('📤 Réponse API createVisit:', response.status, response.data);
        
        newVisit = response.data?.visit || response.data;

        if (!newVisit) {
          throw new Error('Erreur lors de la création de la visite: réponse vide');
        }
      } catch (apiError: any) {
        console.error('❌ Erreur API createVisit:', apiError);
        
        // ✅ Si c'est une erreur 422 avec wizard_required, la propager
        if (apiError.response?.status === 422 && apiError.response?.data?.wizard_required) {
          throw apiError;
        }
        
        // ✅ Gérer les autres erreurs
        if (apiError.response?.status === 400) {
          const errorMessage = apiError.response?.data?.error || 'Données invalides';
          throw new Error(errorMessage);
        }
        
        if (apiError.response?.status === 401) {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
        
        if (apiError.response?.status === 403) {
          throw new Error('Vous n\'avez pas les droits pour créer une visite.');
        }
        
        if (apiError.response?.status === 500) {
          throw new Error('Erreur serveur. Veuillez réessayer plus tard.');
        }
        
        if (apiError.message) {
          throw new Error(apiError.message);
        }
        
        throw apiError;
      }

      // ✅ Récupérer les relations
      let patient = null;
      let aidant = null;

      if (newVisit.patient_id) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('*')
          .eq('id', newVisit.patient_id)
          .single();
        patient = patientData;
      }

      if (newVisit.aidant_id) {
        const { data: aidantData } = await supabase
          .from('aidants')
          .select('*, user:profiles!user_id(*)')
          .eq('id', newVisit.aidant_id)
          .single();
        aidant = aidantData;
      }

      const fullVisit = {
        ...newVisit,
        patient,
        aidant,
      };

      get().invalidateCache();
      await get().fetchVisits(true);

      const targetDisplay = targetName || (patient ? `${patient.first_name} ${patient.last_name}` : 'Personnel');

      // ✅ SI PAIEMENT REQUIS
      if (requiresPayment) {
        await supabase.from('notifications').insert({
          user_id: targetUserId || user.id,
          title: '💳 Paiement requis pour planifier la visite',
          body: `Un paiement de ${paymentAmount} FCFA est requis pour planifier la visite de ${targetDisplay}.`,
          type: 'visite',
          data: { 
            visit_id: newVisit.id, 
            status: 'brouillon', 
            action: 'pay',
            amount: paymentAmount,
            requires_payment: true,
          },
        });

        set({ isLoading: false });
        return fullVisit;
      }

      // ✅ SI VISITE EN ATTENTE D'AIDANT
      if (newVisit.status === 'en_attente_aidant') {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .in('role', ['admin', 'coordinator']);

        if (admins && admins.length > 0) {
          for (const admin of admins) {
            await supabase.from('notifications').insert({
              user_id: admin.id,
              title: '🚨 Visite planifiée sans aidant disponible !',
              body: `Visite pour ${targetDisplay} le ${newVisit.scheduled_date} à ${newVisit.scheduled_time}. Tous les aidants sont complets (4/4).`,
              type: 'alert',
              data: {
                visit_id: newVisit.id,
                action: 'assign_aidant',
                urgency: 'high',
                target_name: targetDisplay,
                scheduled_date: newVisit.scheduled_date,
                scheduled_time: newVisit.scheduled_time,
              },
            });
          }
        }

        await supabase.from('notifications').insert({
          user_id: targetUserId || user.id,
          title: '⏳ Visite en attente d\'aidant',
          body: `Votre visite pour ${targetDisplay} est en attente d'assignation. L'administration a été notifiée.`,
          type: 'visite',
          data: {
            visit_id: newVisit.id,
            status: 'en_attente_aidant',
          },
        });

        set({ isLoading: false });
        return fullVisit;
      }

      // ✅ PAS DE PAIEMENT REQUIS
      if (finalAidantId) {
        await supabase.from('notifications').insert({
          user_id: finalAidantId,
          title: '📅 Nouvelle visite à valider',
          body: `Visite pour ${targetDisplay} le ${newVisit.scheduled_date} à ${newVisit.scheduled_time}`,
          type: 'visite',
          data: { visit_id: newVisit.id, action: 'approve' },
        });
      }

      await supabase.from('notifications').insert({
        user_id: targetUserId || user.id,
        title: '📅 Nouvelle visite planifiée',
        body: `Visite pour ${targetDisplay} le ${newVisit.scheduled_date} à ${newVisit.scheduled_time}`,
        type: 'visite',
        data: { visit_id: newVisit.id, status: 'planifiee' },
      });

      set({ isLoading: false });
      return fullVisit;

    } catch (error: any) {
      console.error('❌ Create visit error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // ============================================================
  // 🆕 ASSIGNER UN AIDANT À UNE VISITE (ADMIN)
  // ============================================================
  assignAidantToVisit: async (visitId: string, aidantId: string, assignmentType: string = 'permanente', force: boolean = false) => {
    try {
      set({ isLoading: true, error: null });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Session expirée');
      }

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

      set({ isLoading: false });

      return result;
    } catch (error: any) {
      console.error('❌ assignAidantToVisit error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // ============================================================
  // 🆕 RÉCUPÉRER LES VISITES EN ATTENTE D'AIDANT
  // ============================================================
  getPendingAidantVisits: async (): Promise<Visit[]> => {
    try {
      set({ isLoading: true, error: null });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Session expirée');
      }

      const response = await fetch(`${API_URL}/visits/pending-aidant`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du chargement');
      }

      const result = await response.json();

      set({ isLoading: false });

      return result.data || [];
    } catch (error: any) {
      console.error('❌ getPendingAidantVisits error:', error);
      set({ error: error.message, isLoading: false });
      return [];
    }
  },

  // ============================================================
  // 🆕 RÉCUPÉRER LES AIDANTS DISPONIBLES POUR UNE VISITE
  // ============================================================
  getAvailableAidantsForVisit: async (targetType?: string, targetId?: string): Promise<any[]> => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) return [];

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Session expirée');
      }

      const params = new URLSearchParams();
      if (targetType) params.append('targetType', targetType);
      if (targetId) params.append('targetId', targetId);

      const response = await fetch(`${API_URL}/visits/available-aidants?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  // ============================================================
  // 🆕 RÉCUPÉRER LES OPTIONS DU WIZARD
  // ============================================================
  getVisitWizardOptions: async (targetType: string, targetId: string, familyId?: string): Promise<any> => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) return null;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Session expirée');
      }

      const params = new URLSearchParams({
        targetType,
        targetId,
      });
      if (familyId) params.append('familyId', familyId);

      const response = await fetch(`${API_URL}/visits/wizard-options?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  // ============================================================
  // UPDATE VISIT
  // ============================================================
  updateVisit: async (id: string, data: Partial<Visit>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { profile } = useAuthStore.getState();
      if (profile?.role !== 'admin' && profile?.role !== 'coordinator') {
        throw new Error('Non autorisé');
      }

      const { data: visit, error } = await supabase
        .from('visites')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      get().invalidateCache();
      await get().fetchVisits(true);

      set({ 
        currentVisit: { ...get().currentVisit, ...visit },
        isLoading: false,
      });

      toast.success('Visite mise à jour');
    } catch (error: any) {
      console.error('❌ Update visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // DELETE VISIT
  // ============================================================
  deleteVisit: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
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

      set({ isLoading: false });
      toast.success('Visite supprimée');
    } catch (error: any) {
      console.error('❌ Delete visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // CONFIRMER PAIEMENT - BROUILLON → PLANIFIEE
  // ============================================================
  confirmPayment: async (id: string, transactionId: string): Promise<Visit> => {
    try {
      set({ isLoading: true, error: null });

      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`${API_URL}/visits/${id}/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ transaction_id: transactionId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la confirmation du paiement');
      }

      const result = await response.json();

      get().invalidateCache();
      await get().fetchVisits(true);

      set({ 
        currentVisit: result.visit,
        isLoading: false,
      });

      toast.success('✅ Visite planifiée après paiement !');
      return result.visit;
    } catch (error: any) {
      console.error('❌ Confirm payment error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
      throw error;
    }
  },

  // ============================================================
  // APPROUVER UNE VISITE
  // ============================================================
  approveVisit: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: visit, error: fetchError } = await supabase
        .from('visites')
        .select('*, patient:patients!visites_patient_id_fkey(*)')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (visit.aidant_id !== user.id) {
        throw new Error('Vous n\'êtes pas assigné à cette visite');
      }

      if (visit.status !== 'planifiee' && visit.status !== 'en_attente') {
        throw new Error('Cette visite ne peut pas être approuvée');
      }

      const { data, error } = await supabase
        .from('visites')
        .update({
          status: 'acceptee',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      get().invalidateCache();
      await get().fetchVisits(true);

      set({ isLoading: false });
      toast.success('✅ Visite approuvée');
    } catch (error: any) {
      console.error('❌ Approve visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // REFUSER UNE VISITE
  // ============================================================
  refuseVisit: async (id: string, reason: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: visit, error: fetchError } = await supabase
        .from('visites')
        .select('*, patient:patients!visites_patient_id_fkey(*), aidant:aidants!visites_aidant_id_fkey(*)')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (visit.aidant_id !== user.id) {
        throw new Error('Vous n\'êtes pas assigné à cette visite');
      }

      const { data, error } = await supabase
        .from('visites')
        .update({
          status: 'refusee',
          refused_by: user.id,
          refused_at: new Date().toISOString(),
          refusal_reason: reason || 'Non spécifié',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      get().invalidateCache();
      await get().fetchVisits(true);

      set({ isLoading: false });
      toast.error('❌ Visite refusée');
    } catch (error: any) {
      console.error('❌ Refuse visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // RÉASSIGNER UNE VISITE
  // ============================================================
  reassignVisit: async (id: string, newAidantId: string, assignmentType: string) => {
    try {
      set({ isLoading: true, error: null });

      const { user, profile } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      if (profile?.role !== 'admin' && profile?.role !== 'coordinator') {
        throw new Error('Non autorisé');
      }

      const { data: visit, error: fetchError } = await supabase
        .from('visites')
        .select('*, patient:patients!visites_patient_id_fkey(*)')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('visites')
        .update({
          aidant_id: newAidantId,
          status: 'planifiee',
          assignment_type: assignmentType || 'ponctuelle',
          approved_at: null,
          refused_at: null,
          refusal_reason: null,
          assigned_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      get().invalidateCache();
      await get().fetchVisits(true);

      set({ isLoading: false });
      toast.success('✅ Visite réassignée');
    } catch (error: any) {
      console.error('❌ Reassign visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // START VISIT
  // ============================================================
  startVisit: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: visit, error: fetchError } = await supabase
        .from('visites')
        .select('aidant_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (visit.aidant_id !== user.id) {
        throw new Error('Vous n\'êtes pas assigné à cette visite');
      }

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('visites')
        .update({
          status: 'en_cours',
          start_time: now,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      get().invalidateCache();
      await get().fetchVisits(true);

      set({ isLoading: false });
      toast.success('🚀 Visite démarrée');
    } catch (error: any) {
      console.error('❌ Start visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // COMPLETE VISIT
  // ============================================================
  completeVisit: async (id: string, data: { actions: string[]; notes: string; photos?: string[] }) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: visit, error: fetchError } = await supabase
        .from('visites')
        .select('aidant_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (visit.aidant_id !== user.id) {
        throw new Error('Vous n\'êtes pas assigné à cette visite');
      }

      const now = new Date().toISOString();
      const updateData = {
        status: 'terminee',
        end_time: now,
        actions: data.actions || [],
        notes: data.notes || null,
        report: data.notes || null,
      };

      const { data: updatedVisit, error } = await supabase
        .from('visites')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      get().invalidateCache();
      await get().fetchVisits(true);

      set({ isLoading: false });
      toast.success('✅ Visite terminée, en attente de validation');
    } catch (error: any) {
      console.error('❌ Complete visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // VALIDATE VISIT - AVEC DÉCOMPTE UNIQUEMENT SI NON PONCTUEL
  // ============================================================
  validateVisit: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { profile } = useAuthStore.getState();
      if (profile?.role !== 'admin' && profile?.role !== 'coordinator') {
        throw new Error('Non autorisé');
      }

      const { data: visit, error: fetchError } = await supabase
        .from('visites')
        .select('status, user_id, metadata')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (visit.status !== 'terminee') {
        throw new Error('Seules les visites terminées peuvent être validées');
      }

      const { data, error } = await supabase
        .from('visites')
        .update({
          status: 'validee',
          metadata: {
            ...(visit.metadata || {}),
            validated_by: profile.id,
            validated_at: new Date().toISOString(),
          }
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // ✅ VÉRIFIER SI VISITE PONCTUELLE PAYÉE → NE PAS DÉCOMPTER
      const isPonctual = visit.metadata?.is_ponctual === true || visit.metadata?.is_draft === true;
      const wasPaid = visit.metadata?.payment_completed === true;

      // ✅ Si visite ponctuelle payée, NE PAS DÉCOMPTER
      if (!isPonctual || !wasPaid) {
        const { data: subscription, error: subError } = await supabase
          .from('abonnements')
          .select('id, remaining_visits, used_visits, total_visits, user_id')
          .eq('user_id', visit.user_id)
          .eq('status', 'actif')
          .maybeSingle();

        if (subscription && !subError && subscription.remaining_visits > 0) {
          await supabase
            .from('abonnements')
            .update({
              used_visits: subscription.used_visits + 1,
              remaining_visits: subscription.remaining_visits - 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', subscription.id);
        }
      }

      get().invalidateCache();
      await get().fetchVisits(true);

      set({ isLoading: false });
      toast.success('✅ Visite validée');
    } catch (error: any) {
      console.error('❌ Validate visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // CANCEL VISIT
  // ============================================================
  cancelVisit: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user, profile } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: visit, error: fetchError } = await supabase
        .from('visites')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      let canCancel = false;
      if (profile?.role === 'admin' || profile?.role === 'coordinator') {
        canCancel = true;
      } else if (profile?.role === 'family') {
        if (visit.user_id === user.id) {
          canCancel = true;
        } else if (visit.patient_id) {
          const { data: assignment } = await supabase
            .from('aidant_assignments')
            .select('id')
            .eq('target_type', 'patient')
            .eq('target_id', visit.patient_id)
            .eq('status', 'active')
            .maybeSingle();

          if (assignment) {
            canCancel = true;
          } else {
            const { data: link } = await supabase
              .from('patient_family_links')
              .select('id')
              .eq('family_id', user.id)
              .eq('patient_id', visit.patient_id)
              .maybeSingle();
            canCancel = !!link;
          }
        }
      }

      if (!canCancel) {
        throw new Error('Non autorisé à annuler cette visite');
      }

      const { data, error } = await supabase
        .from('visites')
        .update({
          status: 'annulee',
          metadata: {
            ...(visit.metadata || {}),
            cancelled_by: user.id,
            cancelled_at: new Date().toISOString(),
          }
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      get().invalidateCache();
      await get().fetchVisits(true);

      set({ isLoading: false });
      toast.success('Visite annulée');
    } catch (error: any) {
      console.error('❌ Cancel visit error:', error);
      set({ error: error.message, isLoading: false });
      toast.error(error.message);
    }
  },

  // ============================================================
  // GET PENDING VISITS
  // ============================================================
  getPendingVisits: async () => {
    try {
      set({ isLoading: true, error: null });

      const { user } = useAuthStore.getState();
      if (!user) {
        set({ isLoading: false });
        return [];
      }

      const { data: aidant } = await supabase
        .from('aidants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!aidant) {
        set({ isLoading: false });
        return [];
      }

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

      set({ isLoading: false });
      return data || [];
    } catch (error: any) {
      console.error('❌ Get pending visits error:', error);
      set({ error: error.message, isLoading: false });
      return [];
    }
  },

  // ============================================================
  // GET VISITS NEEDING REASSIGN
  // ============================================================
  getVisitsNeedingReassign: async () => {
    try {
      set({ isLoading: true, error: null });

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

      set({ isLoading: false });
      return data || [];
    } catch (error: any) {
      console.error('❌ Get visits needing reassign error:', error);
      set({ error: error.message, isLoading: false });
      return [];
    }
  },

  // ============================================================
  // GET VISITS BY PATIENT
  // ============================================================
  getVisitsByPatient: async (patientId: string) => {
    try {
      set({ isLoading: true, error: null });

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

      set({ isLoading: false });
      return data || [];
    } catch (error: any) {
      console.error('❌ Get visits by patient error:', error);
      set({ error: error.message, isLoading: false });
      return [];
    }
  },

  // ============================================================
  // CLEAR ERROR
  // ============================================================
  clearError: () => set({ error: null }),
}));

export default useVisitStore;
