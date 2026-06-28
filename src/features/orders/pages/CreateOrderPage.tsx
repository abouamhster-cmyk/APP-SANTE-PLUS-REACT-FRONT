// 📁 src/features/messages/pages/MessagesPage.tsx
// 📌 Page : Messagerie générale  

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  MessageCircle,
  Check,
  CheckCheck,
  Pin,
  AlertCircle,
  Trash2,
  User,
  Users,
  Shield,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatTime, formatDate } from '@/utils/helpers';
import { supabase } from '@/lib/supabase';
import { Illustration } from '@/components/ui/Illustration';
import toast from 'react-hot-toast';

// ============================================================
// TYPES
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
  is_pinned?: boolean;
  is_important?: boolean;
}

// ============================================================
// CONSTANTES
// ============================================================

const GLOBAL_CONVERSATION_ID = '00000000-0000-0000-0000-000000000001';
type TimeoutId = ReturnType<typeof setTimeout>;

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

const MessagesPage = () => {
  const { user, profile, role, isAuthenticated, isInitialized } = useAuthStore();

  const {
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<TimeoutId | null>(null);
  const isUnmountingRef = useRef(false);
  const isSubscribingRef = useRef(false);

  const currentUserId = profile?.id || user?.id || null;

  const currentUserName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Utilisateur';

  const currentUserRole = (profile?.role || role || 'family') as string;

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  const isAdminRole = isAdminOrCoordinator;
  const isAidantRole = isAidant;

  // ============================================================
  // SCROLL
  // ============================================================

  const scrollToBottom = useCallback((smooth = true) => {
    window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
      });
    }, 80);
  }, []);

  // ============================================================
  // SENDER FALLBACK
  // ============================================================

  const getSenderFallback = useCallback(
    (senderId: string): SenderProfile => {
      if (senderId === currentUserId) {
        return {
          id: currentUserId || undefined,
          full_name: currentUserName,
          role: currentUserRole,
          avatar_url: profile?.avatar_url || null,
        };
      }

      return {
        id: senderId,
        full_name: 'Utilisateur',
        role: 'family',
        avatar_url: null,
      };
    },
    [currentUserId, currentUserName, currentUserRole, profile?.avatar_url]
  );

  // ============================================================
  // FETCH SENDER PROFILE
  // ============================================================

  const fetchSenderProfile = useCallback(
    async (senderId: string): Promise<SenderProfile> => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role, avatar_url')
          .eq('id', senderId)
          .maybeSingle();

        if (error || !data) {
          return getSenderFallback(senderId);
        }

        return {
          id: data.id,
          full_name: data.full_name || 'Utilisateur',
          role: data.role || 'family',
          avatar_url: data.avatar_url || null,
        };
      } catch (error) {
        return getSenderFallback(senderId);
      }
    },
    [getSenderFallback]
  );

  // ============================================================
  // MARK ALL AS READ
  // ============================================================

  const markAllAsRead = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', GLOBAL_CONVERSATION_ID)
        .eq('is_read', false)
        .neq('sender_id', currentUserId);

      if (error) throw error;

      setMessages((prev) =>
        prev.map((message) =>
          message.sender_id !== currentUserId
            ? { ...message, is_read: true }
            : message
        )
      );

      setUnreadCount(0);
    } catch (error) {
      console.error('❌ Mark all read error:', error);
    }
  }, [currentUserId]);

  // ============================================================
  // FETCH MESSAGES
  // ============================================================

  const fetchMessages = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setIsLoading(true);

      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', GLOBAL_CONVERSATION_ID)
        .order('created_at', { ascending: true })
        .limit(200);

      if (messagesError) throw messagesError;

      const rawMessages = messagesData || [];

      const senderIds = [
        ...new Set(rawMessages.map((message: any) => message.sender_id)),
      ].filter(Boolean);

      let profilesMap: Record<string, SenderProfile> = {};

      if (senderIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, role, avatar_url')
          .in('id', senderIds);

        if (profilesError) {
          console.warn('⚠️ Profils expéditeurs non récupérés:', profilesError);
        }

        if (profilesData) {
          profilesMap = profilesData.reduce(
            (acc: Record<string, SenderProfile>, item: any) => {
              acc[item.id] = {
                id: item.id,
                full_name: item.full_name || 'Utilisateur',
                role: item.role || 'family',
                avatar_url: item.avatar_url || null,
              };
              return acc;
            },
            {}
          );
        }
      }

      const messagesWithSenders: Message[] = rawMessages.map((message: any) => {
        return {
          ...message,
          sender:
            profilesMap[message.sender_id] ||
            getSenderFallback(message.sender_id),
        };
      });

      setMessages(messagesWithSenders);

      const unread = messagesWithSenders.filter(
        (message) => !message.is_read && message.sender_id !== currentUserId
      ).length;

      setUnreadCount(unread);

      if (unread > 0) {
        await markAllAsRead();
      }

      scrollToBottom(false);
    } catch (error: any) {
      console.error('❌ Fetch messages error:', error);
      toast.error('Erreur chargement messages');
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, getSenderFallback, markAllAsRead, scrollToBottom]);

  // ============================================================
  // HANDLE NEW MESSAGE
  // ============================================================

  const handleNewMessage = useCallback(
    async (newMessage: any) => {
      try {
        const sender = await fetchSenderProfile(newMessage.sender_id);

        const messageWithSender: Message = {
          ...newMessage,
          sender,
        };

        setMessages((prev) => {
          const exists = prev.some((message: Message) => message.id === newMessage.id);
          if (exists) return prev;
          return [...prev, {
            id: newMessage.id,
            conversation_id: newMessage.conversation_id,
            content: newMessage.content,
            sender_id: newMessage.sender_id,
            sender: sender, 
            created_at: newMessage.created_at,
            is_read: newMessage.is_read,
            attachment_url: newMessage.attachment_url || null,
            is_pinned: newMessage.is_pinned || false,
            is_important: newMessage.is_important || false,
          }];
        });

        if (newMessage.sender_id !== currentUserId) {
          setUnreadCount((prev) => prev + 1);

          toast.success(
            `${sender?.full_name || 'Utilisateur'} : ${newMessage.content?.substring(0, 40) || ''}`,
            {
              duration: 2500,
              position: 'top-right',
              icon: '💬',
            }
          );

          await markAllAsRead();
        }

        scrollToBottom(true);
      } catch (error) {
        console.error('❌ Erreur nouveau message:', error);
      }
    },
    [currentUserId, fetchSenderProfile, markAllAsRead, scrollToBottom]
  );

  const handleMessageUpdate = useCallback((updatedMessage: any) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === updatedMessage.id
          ? { ...message, ...updatedMessage }
          : message
      )
    );
  }, []);

  const handleMessageDelete = useCallback((deletedMessage: any) => {
    setMessages((prev) =>
      prev.filter((message) => message.id !== deletedMessage.id)
    );
  }, []);

  // ============================================================
  // CLEANUP SUBSCRIPTION
  // ============================================================

  const cleanupSubscription = useCallback(() => {
    isUnmountingRef.current = true;
    isSubscribingRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.error('❌ Erreur fermeture Realtime:', error);
      }
      channelRef.current = null;
    }

    setIsRealtimeConnected(false);

    window.setTimeout(() => {
      isUnmountingRef.current = false;
    }, 300);
  }, []);

  // ============================================================
  // SETUP REALTIME SUBSCRIPTION
  // ============================================================

  const setupRealtimeSubscription = useCallback(() => {
    if (!currentUserId) return;
    if (isSubscribingRef.current) {
      console.log('ℹ️ Déjà en cours de souscription, skip...');
      return;
    }

    isSubscribingRef.current = true;

    cleanupSubscription();

    window.setTimeout(() => {
      isUnmountingRef.current = false;

      console.log('🔄 Configuration Realtime...');

      const channelName = `messages-global-${GLOBAL_CONVERSATION_ID}`;

      const channel = supabase.channel(channelName);

      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${GLOBAL_CONVERSATION_ID}`,
          },
          async (payload) => {
            console.log('📨 Nouveau message');
            await handleNewMessage(payload.new);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${GLOBAL_CONVERSATION_ID}`,
          },
          (payload) => {
            handleMessageUpdate(payload.new);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${GLOBAL_CONVERSATION_ID}`,
          },
          (payload) => {
            handleMessageDelete(payload.old);
          }
        );

      channelRef.current = channel;

      channel.subscribe((status, err) => {
        console.log('📡 Realtime:', status);

        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true);
          isSubscribingRef.current = false;
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          return;
        }

        if (status === 'CLOSED') {
          setIsRealtimeConnected(false);
          isSubscribingRef.current = false;
          if (isUnmountingRef.current) {
            console.log('ℹ️ Canal fermé proprement');
            return;
          }
          console.warn('⚠️ Reconnexion...');
          reconnectTimeoutRef.current = setTimeout(() => {
            setupRealtimeSubscription();
          }, 3000);
          return;
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ Realtime déconnecté:', status, err);
          setIsRealtimeConnected(false);
          isSubscribingRef.current = false;
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            setupRealtimeSubscription();
          }, 3000);
        }
      });

      console.log('✅ Realtime configuré');
    }, 150);
  }, [currentUserId, cleanupSubscription, handleNewMessage, handleMessageUpdate, handleMessageDelete]);

  // ============================================================
  // EFFETS
  // ============================================================

  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !currentUserId) return;

    fetchMessages();
    setupRealtimeSubscription();

    return () => {
      cleanupSubscription();
    };
  }, [
    isInitialized,
    isAuthenticated,
    currentUserId,
    fetchMessages,
    setupRealtimeSubscription,
    cleanupSubscription,
  ]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length, scrollToBottom]);

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !currentUserId) return;

    setIsSending(true);

    try {
      const cleanContent = messageInput.trim();

      setMessageInput('');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: GLOBAL_CONVERSATION_ID,
          sender_id: currentUserId,
          content: cleanContent,
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const messageWithSender: Message = {
          ...data,
          sender: {
            id: currentUserId,
            full_name: currentUserName,
            role: currentUserRole,
            avatar_url: profile?.avatar_url || null,
          },
        };

        setMessages((prev) => {
          const exists = prev.some((message) => message.id === data.id);
          if (exists) return prev;
          return [...prev, messageWithSender];
        });

        inputRef.current?.focus();
        scrollToBottom(true);
      }
    } catch (error: any) {
      console.error('❌ Send message error:', error);
      toast.error("Erreur d'envoi");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ============================================================
  // TOGGLE PIN
  // ============================================================

  const togglePinMessage = async (messageId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_pinned: !currentState })
        .eq('id', messageId);

      if (error) throw error;

      toast.success(currentState ? 'Désépinglé' : 'Épinglé');
    } catch (error: any) {
      toast.error('Erreur');
    }
  };

  const toggleImportantMessage = async (messageId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_important: !currentState })
        .eq('id', messageId);

      if (error) throw error;

      toast.success(currentState ? 'Important retiré' : 'Marqué important');
    } catch (error: any) {
      toast.error('Erreur');
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!window.confirm('Supprimer ce message ?')) return;

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      toast.success('Message supprimé');
      setShowPinModal(false);
      setSelectedMessage(null);
    } catch (error: any) {
      toast.error('Erreur');
    }
  };

  // ============================================================
  // HELPERS
  // ============================================================

  const getRoleColor = (senderRole?: string | null) => {
    const colorMap: Record<string, string> = {
      family: '#4CAF50',
      aidant: '#FF9800',
      coordinator: '#2196F3',
      admin: '#9C27B0',
    };
    return colorMap[senderRole || 'family'] || '#9E9E9E';
  };

  const getRoleIcon = (senderRole?: string | null) => {
    const iconMap: Record<string, React.ReactNode> = {
      family: <Users size={12} />,
      aidant: <User size={12} />,
      coordinator: <Shield size={12} />,
      admin: <Shield size={12} />,
    };
    return iconMap[senderRole || 'family'] || <User size={12} />;
  };

  const getRoleLabel = (senderRole?: string | null) => {
    const labelMap: Record<string, string> = {
      family: 'Famille',
      aidant: 'Aidant',
      coordinator: 'Coordinateur',
      admin: 'Admin',
    };
    return labelMap[senderRole || 'family'] || 'Utilisateur';
  };

  // ============================================================
  // RENDU
  // ============================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: colors.text }}>Chargement...</p>
        </div>
      </div>
    );
  }

  const getPlaceholder = () => {
    if (isAdminRole) return 'Message à tous les utilisateurs';
    if (isAidantRole) return 'Message à l\'équipe';
    if (isFamily) return 'Message à l\'équipe';
    return 'Écrivez votre message...';
  };

  const getFooterText = () => {
    if (isAdminRole) return 'Admin · clic droit pour gérer';
    if (isAidantRole) return 'Aidant · messages visibles par l\'équipe';
    if (isFamily) return 'Famille · messages visibles par l\'équipe';
    return 'Messages visibles par toute l\'équipe';
  };

  return (
    <div
      className="h-[calc(100vh-120px)] flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm"
      style={{ border: `1px solid ${colors.primary}20` }}
    >
      {/* EN-TÊTE */}
      <div
        className="p-3 sm:p-4 border-b flex items-center justify-between"
        style={{ borderColor: colors.primary + '20' }}
      >
        <div className="flex items-center space-x-3">
          <div
            className="p-2 rounded-xl"
            style={{ background: colors.primary + '10' }}
          >
            <MessageCircle size={18} style={{ color: colors.primary }} />
          </div>

          <div>
            <h2 className="font-semibold text-sm" style={{ color: colors.text }}>
              Discussion
            </h2>
            <p className="text-[10px] flex items-center gap-1" style={{ color: colors.text + '60' }}>
              <span>{messages.length} msg</span>
              <span>•</span>
              <span>{unreadCount} non lu{unreadCount > 1 ? 's' : ''}</span>
              <span className={`ml-1 text-[8px] ${isRealtimeConnected ? 'text-green-500' : 'text-red-500'}`}>
                ●
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[10px] px-2 py-1 rounded-lg font-medium transition hover:opacity-80 whitespace-nowrap"
              style={{
                background: colors.primary + '15',
                color: colors.primary,
              }}
            >
              Tout lire
            </button>
          )}

          <span
            className="text-[9px] px-2 py-0.5 rounded-full hidden sm:inline"
            style={{
              background: colors.primary + '10',
              color: colors.primary,
            }}
          >
            {isAdminRole ? 'Admin' : isAidantRole ? 'Aidant' : 'Famille'}
          </span>
        </div>
      </div>

      {/* MESSAGES ÉPINGLÉS */}
      {messages.filter((message) => message.is_pinned).length > 0 && (
        <div
          className="px-3 py-1.5 border-b"
          style={{
            background: colors.primary + '05',
            borderColor: colors.primary + '20',
          }}
        >
          <p
            className="text-[10px] font-medium mb-1 flex items-center gap-1"
            style={{ color: colors.primary }}
          >
            <Pin size={12} />
            Épinglés
          </p>

          {messages
            .filter((message) => message.is_pinned)
            .slice(0, 2)
            .map((message) => (
              <div
                key={message.id}
                className="text-xs p-2 rounded-lg mb-1 last:mb-0 bg-white"
              >
                <p className="font-medium text-xs" style={{ color: colors.text }}>
                  {message.sender?.full_name || 'Utilisateur'}
                </p>
                <p className="text-[10px]" style={{ color: colors.text + '70' }}>
                  {message.content}
                </p>
              </div>
            ))}
        </div>
      )}

      {/* LISTE MESSAGES */}
      <div
        className="flex-1 overflow-y-auto p-3 space-y-2.5"
        style={{ background: colors.background }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Illustration type="message" size="lg" className="mx-auto mb-4 opacity-30" />
            <h3 className="text-base font-bold" style={{ color: colors.text }}>
              Aucun message
            </h3>
            <p className="text-sm mt-1" style={{ color: colors.text + '60' }}>
              {isAdminRole
                ? 'Envoyez un message à tous'
                : 'Soyez le premier à envoyer un message'}
            </p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.sender_id === currentUserId;

            const showDate =
              index === 0 ||
              formatDate(message.created_at) !==
                formatDate(messages[index - 1]?.created_at);

            const isPinned = !!message.is_pinned;
            const isImportant = !!message.is_important;

            return (
              <div key={message.id}>
                {showDate && (
                  <div className="text-center my-3">
                    <span
                      className="text-[9px] px-2 py-0.5 rounded-full"
                      style={{
                        background: colors.primary + '10',
                        color: colors.text + '60',
                      }}
                    >
                      {formatDate(message.created_at)}
                    </span>
                  </div>
                )}

                <div
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (isAdminRole) {
                      setSelectedMessage(message);
                      setShowPinModal(true);
                    }
                  }}
                >
                  <div className="flex items-start space-x-2 max-w-[85%]">
                    {!isOwn && (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
                        style={{
                          background: getRoleColor(message.sender?.role),
                        }}
                      >
                        {message.sender?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}

                    <div
                      className={`p-2.5 rounded-2xl relative ${
                        isImportant ? 'border-2 border-orange-400' : ''
                      } ${isPinned ? 'border-l-3 border-yellow-400' : ''}`}
                      style={{
                        background: isOwn ? colors.primary : 'white',
                        color: isOwn ? 'white' : colors.text,
                        borderBottomRightRadius: isOwn ? '3px' : '16px',
                        borderBottomLeftRadius: isOwn ? '16px' : '3px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      }}
                    >
                      {!isOwn && (
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className="text-[10px] font-medium flex items-center gap-1"
                            style={{ color: colors.text }}
                          >
                            {message.sender?.full_name || 'Utilisateur'}
                            <span
                              className="text-[8px] px-1 py-0.5 rounded flex items-center gap-0.5"
                              style={{
                                background: getRoleColor(message.sender?.role) + '20',
                                color: getRoleColor(message.sender?.role),
                              }}
                            >
                              {getRoleIcon(message.sender?.role)}
                              {getRoleLabel(message.sender?.role)}
                            </span>
                          </span>

                          {isImportant && (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-orange-100 text-orange-500">
                              Important
                            </span>
                          )}

                          {isPinned && (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-yellow-100 text-yellow-700">
                              Épinglé
                            </span>
                          )}
                        </div>
                      )}

                      {message.content && (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      )}

                      {message.attachment_url && (
                        <img
                          src={message.attachment_url}
                          alt="Pièce jointe"
                          className="mt-1.5 rounded-lg max-w-full max-h-32 object-cover"
                        />
                      )}

                      <div className="flex items-center justify-end space-x-1 mt-0.5">
                        <span className="text-[9px] opacity-60">
                          {formatTime(message.created_at)}
                        </span>

                        {isOwn && (
                          <span className="text-[9px]">
                            {message.is_read ? (
                              <CheckCheck size={12} />
                            ) : (
                              <Check size={12} />
                            )}
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

      {/* INPUT */}
      <div
        className="p-3 border-t"
        style={{ borderColor: colors.primary + '20' }}
      >
        <div className="flex items-center space-x-2">
          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <Paperclip size={18} style={{ color: colors.text + '40' }} />
          </button>

          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <ImageIcon size={18} style={{ color: colors.text + '40' }} />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyPress}
            className="flex-1 px-3 py-2 rounded-xl border outline-none transition focus:ring-1 text-sm"
            style={{
              borderColor: colors.border || '#e5e0d8',
              background: 'var(--color-background, #f5f0e8)',
              color: colors.text,
            }}
            placeholder={getPlaceholder()}
            disabled={isSending}
          />

          <button
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || isSending}
            className="p-2 rounded-xl text-white transition disabled:opacity-50 hover:opacity-80"
            style={{ background: colors.primary }}
          >
            <Send size={18} />
          </button>
        </div>

        <div className="mt-1.5 flex items-center justify-between">
          <p className="text-[9px]" style={{ color: colors.text + '30' }}>
            {getFooterText()}
          </p>

          {isAdminRole && (
            <span className="text-[9px]" style={{ color: colors.primary }}>
              ⚡ Clic droit
            </span>
          )}
        </div>
      </div>

      {/* MODAL ADMIN */}
      {showPinModal && selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-xs p-5">
            <h3
              className="text-base font-bold mb-4"
              style={{ color: colors.text }}
            >
              Gérer le message
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => {
                  togglePinMessage(
                    selectedMessage.id,
                    selectedMessage.is_pinned || false
                  );
                  setShowPinModal(false);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition text-sm"
              >
                <Pin
                  size={16}
                  style={{
                    color: selectedMessage.is_pinned
                      ? colors.primary
                      : colors.text + '60',
                  }}
                />
                <span style={{ color: colors.text }}>
                  {selectedMessage.is_pinned ? 'Désépingler' : 'Épingler'}
                </span>
              </button>

              <button
                onClick={() => {
                  toggleImportantMessage(
                    selectedMessage.id,
                    selectedMessage.is_important || false
                  );
                  setShowPinModal(false);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition text-sm"
              >
                <AlertCircle
                  size={16}
                  style={{
                    color: selectedMessage.is_important
                      ? '#FF9800'
                      : colors.text + '60',
                  }}
                />
                <span style={{ color: colors.text }}>
                  {selectedMessage.is_important
                    ? 'Retirer important'
                    : 'Marquer important'}
                </span>
              </button>

              <button
                onClick={() => deleteMessage(selectedMessage.id)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-red-50 transition text-sm text-red-500"
              >
                <Trash2 size={16} />
                <span>Supprimer</span>
              </button>

              <button
                onClick={() => {
                  setShowPinModal(false);
                  setSelectedMessage(null);
                }}
                className="w-full py-2 rounded-xl font-medium border text-sm"
                style={{
                  borderColor: colors.border,
                  color: colors.text,
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
