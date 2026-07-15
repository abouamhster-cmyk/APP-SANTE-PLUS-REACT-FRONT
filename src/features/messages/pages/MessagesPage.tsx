// 📁 src/features/messages/pages/MessagesPage.tsx

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Send,
  MessageCircle,
  Check,
  CheckCheck,
  Loader2,
  Users,
  ArrowLeft,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { useMessageStore } from '@/stores/messageStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { formatTime, formatDate } from '@/utils/helpers';
import { supabase } from '@/lib/supabase';
import { Message, Conversation } from '@/types';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

interface SenderProfile {
  id?: string;
  full_name: string;
  role: string;
  avatar_url?: string | null;
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

const MessagesPage = () => {
  const { user, role, isAuthenticated, isInitialized } = useAuthStore();

  const {
    conversations,
    messages,
    currentConversationId,
    isLoading,
    isSending,
    fetchConversations,
    fetchMessages,
    sendMessage,
    setCurrentConversationId,
    appendRealtimeMessage,
  } = useMessageStore();

  const [messageInput, setMessageInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<any>(null);

  const currentUserId = user?.id || null;
  const themeName = getThemeByRole(role, null);
  const colors = getThemeColors(themeName);

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      });
    }, 100);
  }, []);

  useEffect(() => {
    if (isInitialized && isAuthenticated && currentUserId) {
      fetchConversations(true);
    }
  }, [isInitialized, isAuthenticated, currentUserId, fetchConversations]);

  useEffect(() => {
    if (!currentUserId || !currentConversationId) return;

    const channel = supabase
      .channel(`room_${currentConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${currentConversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new;

          if (newMessage.sender_id !== currentUserId) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, full_name, role, avatar_url')
              .eq('id', newMessage.sender_id)
              .single();

            const mappedSender: SenderProfile = profileData
              ? {
                  id: profileData.id,
                  full_name: profileData.full_name || 'Utilisateur',
                  role: profileData.role || 'family',
                  avatar_url: profileData.avatar_url || null,
                }
              : {
                  id: newMessage.sender_id,
                  full_name: 'Utilisateur',
                  role: 'family',
                  avatar_url: null,
                };

            appendRealtimeMessage({
              ...newMessage,
              sender: mappedSender,
            } as Message);

            await supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMessage.id);

            scrollToBottom(true);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [currentConversationId, currentUserId, appendRealtimeMessage, scrollToBottom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const content = messageInput.trim();
    setMessageInput('');

    try {
      await sendMessage(content);
      scrollToBottom(true);
    } catch {
      toast.error("Échec de l'envoi");
      setMessageInput(content);
    }
  };

  if (isLoading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full flex-col">
        <Loader2
          className="w-10 h-10 animate-spin mb-3"
          style={{ color: colors.primary }}
        />
        <p className="text-sm text-gray-500 font-medium">
          Chargement de la messagerie...
        </p>
      </div>
    );
  }

  const activeConversation = conversations.find(
    (c) => c.id === currentConversationId
  );

  return (
    <div className="flex h-[100dvh] bg-[#f8f7f4] overflow-hidden">
      {/* SIDEBAR */}
      <div
        className={cn(
          'w-full md:w-[320px] border-r flex flex-col bg-white/80 backdrop-blur-xl',
          currentConversationId ? 'hidden md:flex' : 'flex'
        )}
      >
        <div className="px-5 py-4 border-b bg-white/60">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-400">
            💬 Messages
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {conversations.map((conv) => {
            const isActive = conv.id === currentConversationId;

            return (
              <button
                key={conv.id}
                onClick={() => {
                  setCurrentConversationId(conv.id);
                  fetchMessages(conv.id);
                }}
                className={cn(
                  'w-full p-3 rounded-2xl flex items-center gap-3 transition',
                  isActive
                    ? 'bg-white shadow-md border'
                    : 'hover:bg-white'
                )}
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold"
                  style={{ background: colors.primary }}
                >
                  {conv.type === 'group' ? (
                    <Users size={16} />
                  ) : (
                    conv.name?.charAt(0)?.toUpperCase() || 'U'
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold truncate">
                    {conv.name || 'Discussion'}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {conv.last_message?.content || 'Aucun message'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CHAT */}
      <div
        className={cn(
          'flex-1 flex flex-col bg-[#fdfcf9]',
          currentConversationId ? 'flex' : 'hidden md:flex'
        )}
      >
        {activeConversation ? (
          <>
            {/* HEADER */}
            <div className="px-4 py-3 border-b bg-white flex items-center gap-3">
              <button
                onClick={() => setCurrentConversationId(null)}
                className="md:hidden"
              >
                <ArrowLeft size={18} />
              </button>

              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                style={{ background: colors.primary }}
              >
                <Users size={14} />
              </div>

              <div>
                <h3 className="font-bold text-sm">
                  {activeConversation.name}
                </h3>
                <p className="text-[10px] text-gray-400">
                  Discussion sécurisée
                </p>
              </div>
            </div>

            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
              {messages.map((message, index) => {
                const isOwn = message.sender_id === currentUserId;

                return (
                  <div
                    key={message.id}
                    className={`flex ${
                      isOwn ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className="px-4 py-2 rounded-2xl max-w-[80%]"
                      style={{
                        background: isOwn ? colors.primary : 'white',
                        color: isOwn ? 'white' : '#1f2937',
                      }}
                    >
                      <p className="text-[13px]">{message.content}</p>

                      <div className="flex justify-end text-[9px] mt-1 opacity-60">
                        {formatTimeSafe(message.created_at)}
                        {isOwn &&
                          (message.is_read ? (
                            <CheckCheck size={12} />
                          ) : (
                            <Check size={12} />
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* INPUT */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-white border-t"
            >
              <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-2">
                <input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="flex-1 h-10 bg-transparent outline-none text-sm px-2"
                  placeholder="Écrire un message..."
                />

                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="p-2 rounded-xl text-white"
                  style={{ background: colors.primary }}
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <MessageCircle size={40} className="text-gray-300" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
