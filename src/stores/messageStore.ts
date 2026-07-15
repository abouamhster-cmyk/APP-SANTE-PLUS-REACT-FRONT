// 📁 src/stores/messageStore.ts
// ✅ STORE MESSAGERIE COMPLET : GESTION DES ABONNEMENTS ET FLUX DE MESSAGES SÉCURISÉS

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Conversation, Message } from '@/types';
import { useAuthStore } from './authStore';

interface MessageState {
  conversations: Conversation[];
  messages: Message[];
  currentConversation: Conversation | null;
  isLoading: boolean;
  error: string | null;
  subscription: any | null;

  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (data: { conversation_id: string; content: string; attachment?: File }) => Promise<any>;
  markAsRead: (messageId: string) => Promise<void>;
  markAllRead: (conversationId: string) => Promise<void>;
  createConversation: (participantIds: string[]) => Promise<any>;
  subscribeToMessages: (conversationId: string) => void;
  unsubscribeFromMessages: () => void;
  clearError: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  conversations: [],
  messages: [],
  currentConversation: null,
  isLoading: false,
  error: null,
  subscription: null,

  fetchConversations: async () => {
    try {
      set({ isLoading: true, error: null });

      const { user } = useAuthStore.getState();
      if (!user) {
        set({ conversations: [], isLoading: false });
        return;
      }

      const { data: participants, error: pError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (pError) throw pError;

      const conversationIds = participants?.map(p => p.conversation_id) || [];

      if (conversationIds.length === 0) {
        set({ conversations: [], isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            user:profiles(*)
          )
        `)
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const conversationsWithLastMessage = await Promise.all(
        (data || []).map(async (conv: any) => {
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...conv,
            last_message: lastMessage || undefined,
          };
        })
      );

      set({ conversations: conversationsWithLastMessage, isLoading: false });
    } catch (error: any) {
      console.error('Fetch conversations error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  fetchMessages: async (conversationId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(*)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      set({ messages: data || [], isLoading: false });
    } catch (error: any) {
      console.error('Fetch messages error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  sendMessage: async (data: { conversation_id: string; content: string; attachment?: File }) => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      let attachment_url = null;
      if (data.attachment) {
        const filePath = `messages/${Date.now()}_${data.attachment.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('messages')
          .upload(filePath, data.attachment);

        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('messages')
            .getPublicUrl(filePath);
          attachment_url = publicUrl;
        }
      }

      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: data.conversation_id,
          sender_id: user.id,
          content: data.content,
          attachment_url,
          is_read: false,
        })
        .select(`
          *,
          sender:profiles(*)
        `)
        .single();

      if (error) throw error;

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', data.conversation_id);

      set((state) => ({
        messages: [...state.messages, message],
      }));

      return message;
    } catch (error: any) {
      console.error('Send message error:', error);
      set({ error: error.message });
      throw error;
    }
  },

  markAsRead: async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) throw error;

      set((state) => ({
        messages: state.messages.map(m => m.id === messageId ? { ...m, is_read: true } : m),
      }));
    } catch (error: any) {
      console.error('Mark as read error:', error);
    }
  },

  markAllRead: async (conversationId: string) => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) return;

      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      set((state) => ({
        messages: state.messages.map(m => m.conversation_id === conversationId && m.sender_id !== user.id ? { ...m, is_read: true } : m),
      }));
    } catch (error: any) {
      console.error('Mark all read error:', error);
    }
  },

  createConversation: async (participantIds: string[]) => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('Utilisateur non connecté');

      const allParticipants = [...new Set([user.id, ...participantIds])];

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          last_message_at: new Date().toISOString(),
          participant_ids: allParticipants,
        })
        .select()
        .single();

      if (error) throw error;

      for (const participantId of allParticipants) {
        await supabase
          .from('conversation_participants')
          .insert({
            conversation_id: data.id,
            user_id: participantId,
          });
      }

      set((state) => ({
        conversations: [data, ...state.conversations],
        currentConversation: data,
      }));

      return data;
    } catch (error: any) {
      console.error('Create conversation error:', error);
      set({ error: error.message });
      throw error;
    }
  },

  subscribeToMessages: (conversationId: string) => {
    get().unsubscribeFromMessages();

    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, async (payload) => {
        const { data: message } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles(*)
          `)
          .eq('id', payload.new.id)
          .single();

        if (message) {
          set((state) => ({
            messages: [...state.messages, message],
          }));
        }
      })
      .subscribe();

    set({ subscription });
  },

  unsubscribeFromMessages: () => {
    const { subscription } = get();
    if (subscription) {
      supabase.removeChannel(subscription);
      set({ subscription: null });
    }
  },

  clearError: () => set({ error: null }),
}));
