// 📁 src/features/messages/pages/MessagesPage.tsx
// ✅ PAGE MESSAGERIE COMPLÈTE : SYNC FLUIDE ET INTERFACE TACTILE CORRIGÉE SANS BUGS TS

import { useCallback, useEffect, useRef, useState } from 'react';
import { 
  Send, 
  MessageCircle, 
  Check, 
  CheckCheck, 
  Loader2,
  Users,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatTime, formatDate } from '@/utils/helpers';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// ============================================================
// TYPES ET INTERFACES
// ============================================================

interface SenderProfile {
  id?: string;
  full_name: string;
  role: string;
  avatar_url?: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  content: string;
  sender_id: string;
  sender: SenderProfile | null;
  created_at: string;
  is_read: boolean;
  attachment_url?: string | null;
  attachment_type?: 'image' | 'document' | 'voice' | 'video' | null;
  is_pinned?: boolean;
  is_important?: boolean;
}

interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'global';
  participant_ids: string[];
  name: string | null;
  participants?: SenderProfile[];
  last_message_at: string;
  last_message?: Message;
}

const formatDateSafe = (date: string | null | undefined): string => {
  if (!date) return '';
  try {
    return formatDate(date);
  } catch {
    return '';
  }
};

const formatTimeSafe = (time: string | null | undefined): string => {
  if (!time) return '';
  try {
    return formatTime(time);
  } catch {
    return '';
  }
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

const MessagesPage = () => {
  // 🟢 CORRECTIF : Ajout de "profile" dans l'importation destructurée du store d'authentification
  const { user, profile, role, isAuthenticated, isInitialized } = useAuthStore();
  const { isFamily } = useTerminology();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<any>(null);

  const currentUserId = user?.id || null;
  const themeName = getThemeByRole(role, null);
  const colors = getThemeColors(themeName);

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
    }, 100);
  }, []);

  // ============================================================
  // RECUPERATION DES MESSAGES
  // ============================================================
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!currentUserId) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const rawMessages = data || [];
      const senderIds = [...new Set(rawMessages.map((m: any) => m.sender_id))].filter(Boolean);
      let profilesMap: Record<string, SenderProfile> = {};

      if (senderIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, role, avatar_url')
          .in('id', senderIds);

        if (profilesData) {
          profilesMap = profilesData.reduce((acc: Record<string, SenderProfile>, item: any) => {
            acc[item.id] = {
              id: item.id,
              full_name: item.full_name || 'Utilisateur',
              role: item.role || 'family',
              avatar_url: item.avatar_url || null,
            };
            return acc;
          }, {});
        }
      }

      const messagesWithSenders: Message[] = rawMessages.map((message: any) => ({
        ...message,
        sender: profilesMap[message.sender_id] || {
          id: message.sender_id,
          full_name: 'Utilisateur',
          role: 'family',
          avatar_url: null,
        },
      }));

      setMessages(messagesWithSenders);

      // Marquer comme lus
      const unreadIds = messagesWithSenders
        .filter(m => !m.is_read && m.sender_id !== currentUserId)
        .map(m => m.id);

      if (unreadIds.length > 0) {
        await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
      }

      scrollToBottom(false);
    } catch (err: any) {
      console.error('❌ Error fetching messages:', err.message);
    }
  }, [currentUserId, scrollToBottom]);

  // ============================================================
  // RECUPERATION DES CONVERSATIONS
  // ============================================================
  const fetchConversations = useCallback(async (isFirstLoad = false) => {
    if (!currentUserId) return;
    if (isFirstLoad) setIsLoading(true);

    try {
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [currentUserId])
        .order('last_message_at', { ascending: false });

      if (convError) throw convError;

      const filteredData = convData || [];

      if (filteredData.length === 0) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      const conversationsWithDetails = await Promise.all(
        filteredData.map(async (conv) => {
          const participantIds = (conv.participant_ids || []).filter((id: string) => id !== currentUserId);
          let participants: SenderProfile[] = [];

          if (participantIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name, role, avatar_url')
              .in('id', participantIds);

            if (profiles) {
              participants = profiles.map((p: any) => ({
                id: p.id,
                full_name: p.full_name || 'Utilisateur',
                role: p.role || 'family',
                avatar_url: p.avatar_url || null,
              }));
            }
          }

          const { data: lastMessage } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...conv,
            participants,
            last_message: lastMessage || undefined,
          } as Conversation;
        })
      );

      setConversations(conversationsWithDetails);

      if (conversationsWithDetails.length > 0) {
        setCurrentConversationId(prevId => {
          const activeId = prevId || conversationsWithDetails[0].id;
          fetchMessages(activeId);
          return activeId;
        });
      }
    } catch (err: any) {
      console.error('❌ Error fetching conversations:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, fetchMessages]);

  useEffect(() => {
    if (isInitialized && isAuthenticated && currentUserId) {
      fetchConversations(true);
    }
  }, [isInitialized, isAuthenticated, currentUserId]);

  // ============================================================
  // ÉCOUTE DU REALTIME
  // ============================================================
  useEffect(() => {
    if (!currentUserId || !currentConversationId) return;

    const channel = supabase
      .channel(`room_${currentConversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${currentConversationId}` }, async (payload) => {
        const newMessage = payload.new;
        if (newMessage.sender_id !== currentUserId) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, role, avatar_url')
            .eq('id', newMessage.sender_id)
            .single();

          const mappedSender: SenderProfile = profileData ? {
            id: profileData.id,
            full_name: profileData.full_name || 'Utilisateur',
            role: profileData.role || 'family',
            avatar_url: profileData.avatar_url || null,
          } : {
            id: newMessage.sender_id,
            full_name: 'Utilisateur',
            role: 'family',
            avatar_url: null,
          };

          setMessages((prev) => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            // 🟢 CORRECTIF : Ajout de "as Message" pour lever le conflit de typage TS du tableau
            return [...prev, { ...newMessage, sender: mappedSender } as Message];
          });

          await supabase.from('messages').update({ is_read: true }).eq('id', newMessage.id);
          scrollToBottom(true);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [currentConversationId, currentUserId, scrollToBottom]);

  // ============================================================
  // ENVOI DU MESSAGE
  // ============================================================
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentConversationId || !currentUserId) return;

    setIsSending(true);
    const content = messageInput.trim();
    setMessageInput('');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: currentConversationId,
          sender_id: currentUserId,
          content: content,
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', currentConversationId);

      const myProfile: SenderProfile = {
        id: currentUserId,
        full_name: profile?.full_name || 'Moi',
        role: role || 'family',
        avatar_url: profile?.avatar_url || null,
      };

      setMessages(prev => [...prev, { ...data, sender: myProfile }]);
      scrollToBottom(true);
    } catch (err: any) {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: colors.primary }} />
          <p className="text-xs text-gray-500">Chargement de la messagerie...</p>
        </div>
      </div>
    );
  }

  const activeConversation = conversations.find(c => c.id === currentConversationId);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
      
      {/* BARRE LATÉRALE DE DISCUSSIONS */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r flex flex-col bg-gray-50/50 shrink-0">
        <div className="p-4 border-b flex items-center justify-between bg-white">
          <h2 className="text-xs font-black uppercase tracking-wider text-gray-400">💬 Mes discussions</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-none">
          {conversations.length === 0 ? (
            <p className="text-[11px] text-gray-400 text-center py-6 font-semibold">Aucun canal actif</p>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === currentConversationId;
              const hasUnread = conv.last_message && !conv.last_message.is_read && conv.last_message.sender_id !== currentUserId;
              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    setCurrentConversationId(conv.id);
                    fetchMessages(conv.id);
                  }}
                  className={`w-full text-left p-3 rounded-2xl transition-all duration-200 select-none flex items-center gap-3 ${
                    isActive ? 'bg-white shadow-sm border border-gray-100' : 'hover:bg-white/40'
                  }`}
                >
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-sm font-black shrink-0" style={{ background: colors.primary }}>
                    {conv.type === 'group' ? <Users size={16} /> : (conv.name?.charAt(0)?.toUpperCase() || conv.participants?.[0]?.full_name?.charAt(0)?.toUpperCase() || 'U')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-black text-gray-800 truncate">
                        {conv.type === 'group' ? conv.name : (conv.participants?.[0]?.full_name || 'Utilisateur')}
                      </p>
                      {hasUnread && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                    </div>
                    <p className="text-[10px] text-gray-400 truncate font-semibold mt-0.5">
                      {conv.last_message?.content || 'Aucun message'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ZONE DE CHAT ACTIVE */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {activeConversation ? (
          <>
            <div className="p-4 border-b flex items-center gap-3 bg-white shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black" style={{ background: colors.primary }}>
                {activeConversation.type === 'group' ? <Users size={16} /> : (activeConversation.participants?.[0]?.full_name?.charAt(0)?.toUpperCase() || 'U')}
              </div>
              <div>
                <h3 className="font-extrabold text-xs sm:text-sm text-gray-800">
                  {activeConversation.type === 'group' ? activeConversation.name : (activeConversation.participants?.[0]?.full_name || 'Discussion privée')}
                </h3>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                  {activeConversation.type === 'group' ? '👥 Canal de Coordination' : '💬 Discussion privée sécurisée'}
                </p>
              </div>
            </div>

            {/* Corps du chat */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#faf9f6]/40 scrollbar-none">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center py-10">
                  <div>
                    <MessageCircle className="mx-auto text-gray-200 mb-2" size={32} />
                    <p className="text-[11px] text-gray-400 font-semibold">Aucun message de coordination dans ce fil.</p>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwn = message.sender_id === currentUserId;
                  const currentDate = formatDateSafe(message.created_at);
                  const prevDate = formatDateSafe(messages[index - 1]?.created_at);
                  const showDate = currentDate !== prevDate && currentDate !== '';
                  return (
                    <div key={message.id}>
                      {showDate && (
                        <div className="text-center my-4">
                          <span className="text-[10px] font-bold px-3 py-1 rounded-full border bg-white" style={{ borderColor: colors.border, color: colors.text + '80' }}>
                            {currentDate}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                        <div className="flex items-start space-x-2 max-w-[85%]">
                          {!isOwn && (
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 mt-1" style={{ background: colors.primary }}>
                              {message.sender?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div
                            className="p-3 rounded-2xl"
                            style={{
                              background: isOwn ? colors.primary : 'white',
                              color: isOwn ? 'white' : '#2d2d2d',
                              borderBottomRightRadius: isOwn ? '4px' : '16px',
                              borderBottomLeftRadius: isOwn ? '16px' : '4px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.015)',
                              border: !isOwn ? '1px solid #f3f2ef' : undefined,
                            }}
                          >
                            {!isOwn && (
                              <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                                {message.sender?.full_name}
                              </p>
                            )}
                            <p className="text-xs sm:text-sm font-semibold whitespace-pre-wrap break-words leading-relaxed">
                              {message.content}
                            </p>
                            <div className="flex items-center justify-end gap-1 mt-1 opacity-60 text-[8px]">
                              <span>{formatTimeSafe(message.created_at)}</span>
                              {isOwn && (
                                <span>
                                  {message.is_read ? <CheckCheck size={11} /> : <Check size={11} />}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Saisie */}
            <form onSubmit={handleSendMessage} className="p-3 border-t bg-white shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Écrire un message à la coordination..."
                  className="flex-1 h-11 px-4 rounded-2xl border bg-gray-50/50 outline-none text-xs font-bold"
                  style={{ borderColor: colors.border }}
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || isSending}
                  className="p-3 rounded-2xl text-white transition hover:opacity-90 disabled:opacity-50 shrink-0"
                  style={{ background: colors.primary }}
                >
                  {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div>
              <MessageCircle className="mx-auto text-gray-200 mb-2" size={40} />
              <h3 className="font-extrabold text-sm text-gray-700">Aucun fil sélectionné</h3>
              <p className="text-xs text-gray-400 max-w-xs mt-1">Sélectionnez une discussion à gauche pour initier le dialogue avec l'administration.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default MessagesPage;
