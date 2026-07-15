// 📁 src/stores/messageStore.ts
// ✅ STORE MESSAGERIE COMPLET : GESTION VIA API REST ET ABONNEMENT TEMPS RÉEL SÉCURISÉ

import { create } from 'zustand';
import { Conversation, Message } from '@/types';
import { useAuthStore } from './authStore';
import api from '@/lib/api';

interface MessageState {
  conversations: Conversation[];
  messages: Message[];
  currentConversationId: string | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  fetchConversations: (isFirstLoad?: boolean) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<any>;
  setCurrentConversationId: (id: string | null) => void;
  appendRealtimeMessage: (message: Message) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  conversations: [],
  messages: [],
  currentConversationId: null,
  isLoading: false,
  isSending: false,
  error: null,

  fetchConversations: async (isFirstLoad = false) => {
    try {
      if (isFirstLoad) set({ isLoading: true, error: null });

      const { user } = useAuthStore.getState();
      if (!user) {
        set({ conversations: [], isLoading: false });
        return;
      }

      // ✅ APPEL REST SÉCURISÉ : Permet de déléguer la génération de conversations au backend
      const response = await api.get('/messages/conversations');
      const data = response.data || [];

      set({ conversations: data, isLoading: false });

      // Sélectionner automatiquement la première conversation s'il n'y en a aucune active
      const { currentConversationId } = get();
      if (data.length > 0 && !currentConversationId) {
        const firstId = data[0].id;
        get().setCurrentConversationId(firstId);
        get().fetchMessages(firstId);
      }
    } catch (error: any) {
      console.error('❌ Error fetching conversations:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  fetchMessages: async (conversationId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // ✅ APPEL REST SÉCURISÉ : Récupère les messages enrichis via l'API Node
      const response = await api.get(`/messages/${conversationId}`);
      set({ messages: response.data || [], isLoading: false });
    } catch (error: any) {
      console.error('❌ Error fetching messages:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  sendMessage: async (content: string) => {
    const { currentConversationId } = get();
    if (!currentConversationId) return;

    try {
      set({ isSending: true, error: null });

      const response = await api.post('/messages', {
        conversation_id: currentConversationId,
        content,
      });

      const result = response.data?.message || response.data;

      // Ajouter localement notre propre message envoyé
      set((state) => ({
        messages: [...state.messages, result],
        isSending: false,
      }));

      // Rafraîchir les conversations pour mettre à jour le dernier message à gauche
      get().fetchConversations();

      return result;
    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      set({ isSending: false, error: error.message });
      throw error;
    }
  },

  setCurrentConversationId: (id: string | null) => {
    set({ currentConversationId: id });
  },

  appendRealtimeMessage: (message: Message) => {
    set((state) => {
      const exists = state.messages.some(m => m.id === message.id);
      if (exists) return state;
      return { messages: [...state.messages, message] };
    });
  },
}));

export default useMessageStore;
