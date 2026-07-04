// 📁 src/stores/contractStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Contract, UserContractAcceptance, ContractStatus } from '@/types';
import { useAuthStore } from './authStore';

interface ContractState {
  // État
  contract: Contract | null;
  hasAccepted: boolean;
  needsAcceptance: boolean;
  latestAcceptance: UserContractAcceptance | null;
  isLoading: boolean;
  error: string | null;
  isChecking: boolean;

  // Actions
  checkContract: () => Promise<ContractStatus>;
  fetchContract: () => Promise<void>;
  acceptContract: (contractId: string) => Promise<void>;
  getHistory: () => Promise<UserContractAcceptance[]>;
  clearError: () => void;
  reset: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

export const useContractStore = create<ContractState>((set, get) => ({
  // État initial
  contract: null,
  hasAccepted: false,
  needsAcceptance: false,
  latestAcceptance: null,
  isLoading: false,
  error: null,
  isChecking: false,

  // =============================================
  // Vérifier le statut du contrat
  // =============================================
  checkContract: async () => {
    try {
      set({ isChecking: true, error: null });

      const { user, profile } = useAuthStore.getState();
      if (!user || !profile) {
        set({ 
          isChecking: false,
          needsAcceptance: false,
          hasAccepted: true, // Par défaut, on autorise si pas d'utilisateur
        });
        return {
          needs_acceptance: false,
          contract: null,
          has_accepted: true,
          latest_acceptance: null,
        };
      }

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

      set({
        contract: data.contract,
        hasAccepted: data.has_accepted,
        needsAcceptance: data.needs_acceptance,
        latestAcceptance: data.latest_acceptance,
        isChecking: false,
        error: null,
      });

      return data;
    } catch (error: any) {
      console.error('❌ Check contract error:', error);
      set({ 
        error: error.message, 
        isChecking: false,
        // En cas d'erreur, on bloque pour sécurité
        needsAcceptance: true,
        hasAccepted: false,
      });
      throw error;
    }
  },

  // =============================================
  // Récupérer le contrat actif
  // =============================================
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
      });
    } catch (error: any) {
      console.error('❌ Fetch contract error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // =============================================
  // Accepter le contrat
  // =============================================
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

      // Mettre à jour l'état
      set({
        hasAccepted: true,
        needsAcceptance: false,
        latestAcceptance: data.acceptance,
        isLoading: false,
        error: null,
      });

      // ✅ Notification dans la base
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Contrat accepté',
        body: `Vous avez accepté les Conditions Générales (version ${data.acceptance?.contract?.version || '1.0.0'})`,
        type: 'system',
        data: { contract_id: contractId },
      });

    } catch (error: any) {
      console.error('❌ Accept contract error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // =============================================
  // Récupérer l'historique des acceptations
  // =============================================
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

  // =============================================
  // Utilitaires
  // =============================================
  clearError: () => set({ error: null }),
  reset: () => {
    set({
      contract: null,
      hasAccepted: false,
      needsAcceptance: false,
      latestAcceptance: null,
      isLoading: false,
      error: null,
      isChecking: false,
    });
  },
}));
