// 📁 src/stores/contractStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Contract, UserContractAcceptance, ContractStatus } from '@/types';
import { useAuthStore } from './authStore';

interface ContractState {
  contract: Contract | null;
  hasAccepted: boolean;
  needsAcceptance: boolean;
  latestAcceptance: UserContractAcceptance | null;
  isLoading: boolean;
  error: string | null;
  isChecking: boolean;
  isInitialized: boolean; 

  checkContract: () => Promise<ContractStatus>;
  fetchContract: () => Promise<void>;
  acceptContract: (contractId: string) => Promise<void>;
  getHistory: () => Promise<UserContractAcceptance[]>;
  clearError: () => void;
  reset: () => void;
  // ✅ Ajouté : forcer l'acceptation
  forceAccept: () => Promise<void>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

// ✅ Clé de cache local
const CONTRACT_ACCEPTED_KEY = 'sante_plus_contract_accepted';
const CONTRACT_VERSION_KEY = 'sante_plus_contract_version';

export const useContractStore = create<ContractState>((set, get) => ({
  contract: null,
  hasAccepted: false,
  needsAcceptance: false,
  latestAcceptance: null,
  isLoading: false,
  error: null,
  isChecking: false,
  isInitialized: false,

  // ============================================================
  // ✅ VÉRIFIER LE STATUT (AVEC CACHE)
  // ============================================================
  checkContract: async () => {
    // ✅ Vérifier le cache local
    const cachedAccepted = localStorage.getItem(CONTRACT_ACCEPTED_KEY);
    const cachedVersion = localStorage.getItem(CONTRACT_VERSION_KEY);
    
    if (cachedAccepted === 'true') {
      console.log('📜 Contrat déjà accepté (cache local)');
      set({
        hasAccepted: true,
        needsAcceptance: false,
        isChecking: false,
        isInitialized: true,
      });
      return {
        needs_acceptance: false,
        contract: null,
        has_accepted: true,
        latest_acceptance: null,
      };
    }

    try {
      set({ isChecking: true, error: null });

      const { user, profile } = useAuthStore.getState();
      if (!user || !profile) {
        set({ 
          isChecking: false,
          needsAcceptance: false,
          hasAccepted: true,
          isInitialized: true,
        });
        return {
          needs_acceptance: false,
          contract: null,
          has_accepted: true,
          latest_acceptance: null,
        };
      }

      // ✅ Vérifier en base UNE SEULE FOIS
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Token manquant');
      }

      const response = await fetch(`${API_BASE_URL}/contract/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la vérification');
      }

      const data = await response.json();

      // ✅ Mettre en cache si accepté
      if (data.has_accepted) {
        localStorage.setItem(CONTRACT_ACCEPTED_KEY, 'true');
        localStorage.setItem(CONTRACT_VERSION_KEY, data.contract?.version || '1.0.0');
      }

      set({
        contract: data.contract,
        hasAccepted: data.has_accepted,
        needsAcceptance: data.needs_acceptance,
        latestAcceptance: data.latest_acceptance,
        isChecking: false,
        error: null,
        isInitialized: true,
      });

      return data;
    } catch (error: any) {
      console.error('❌ Check contract error:', error);
      
      // ✅ En cas d'erreur, utiliser le cache
      if (localStorage.getItem(CONTRACT_ACCEPTED_KEY) === 'true') {
        set({ 
          hasAccepted: true,
          needsAcceptance: false,
          isChecking: false,
          isInitialized: true,
        });
        return {
          needs_acceptance: false,
          contract: null,
          has_accepted: true,
          latest_acceptance: null,
        };
      }

      set({ 
        error: error.message, 
        isChecking: false,
        isInitialized: true,
        needsAcceptance: true,
        hasAccepted: false,
      });
      throw error;
    }
  },

  // ============================================================
  // ✅ ACCEPTER LE CONTRAT (UNE FOIS)
  // ============================================================
  acceptContract: async (contractId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { user } = useAuthStore.getState();
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Token manquant');
      }

      const response = await fetch(`${API_BASE_URL}/contract/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contract_id: contractId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'acceptation');
      }

      const data = await response.json();

      // ✅ Sauvegarder définitivement
      localStorage.setItem(CONTRACT_ACCEPTED_KEY, 'true');
      localStorage.setItem(CONTRACT_VERSION_KEY, data.acceptance?.contract?.version || '1.0.0');

      set({
        hasAccepted: true,
        needsAcceptance: false,
        latestAcceptance: data.acceptance,
        isLoading: false,
        error: null,
        isInitialized: true,
      });

      // ✅ Notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: '📜 Contrat accepté',
        body: `Vous avez accepté les Conditions Générales (version ${data.acceptance?.contract?.version || '1.0.0'})`,
        type: 'system',
        data: { contract_id: contractId },
      });

      console.log('✅ Contrat accepté définitivement');
    } catch (error: any) {
      console.error('❌ Accept contract error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // ============================================================
  // ✅ FORCER L'ACCEPTATION (pour les admins)
  // ============================================================
  forceAccept: async () => {
    localStorage.setItem(CONTRACT_ACCEPTED_KEY, 'true');
    localStorage.setItem(CONTRACT_VERSION_KEY, '1.0.0');
    set({
      hasAccepted: true,
      needsAcceptance: false,
      isInitialized: true,
    });
    console.log('✅ Contrat forcé accepté');
  },

  // ============================================================
  // RÉCUPÉRER LE CONTRAT ACTIF
  // ============================================================
  fetchContract: async () => {
    try {
      set({ isLoading: true, error: null });

      const { user, profile } = useAuthStore.getState();
      if (!user || !profile) {
        set({ isLoading: false });
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Token manquant');
      }

      const response = await fetch(`${API_BASE_URL}/contract/active`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la récupération');
      }

      const data = await response.json();

      set({
        contract: data.contract,
        hasAccepted: data.accepted,
        needsAcceptance: data.needs_acceptance,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error: any) {
      console.error('❌ Fetch contract error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // ============================================================
  // HISTORIQUE
  // ============================================================
  getHistory: async () => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) {
        return [];
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        return [];
      }

      const response = await fetch(`${API_BASE_URL}/contract/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération');
      }

      const data = await response.json();
      return data.history || [];
    } catch (error: any) {
      console.error('❌ Get history error:', error);
      return [];
    }
  },

  clearError: () => set({ error: null }),
  
  reset: () => {
    // ✅ Ne pas reset le cache local
    set({
      contract: null,
      hasAccepted: false,
      needsAcceptance: false,
      latestAcceptance: null,
      isLoading: false,
      error: null,
      isChecking: false,
      isInitialized: false,
    });
  },
}));
