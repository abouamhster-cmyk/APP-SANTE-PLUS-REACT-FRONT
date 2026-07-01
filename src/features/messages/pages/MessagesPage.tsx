// 📁 src/features/messages/pages/MessagesPage.tsx
// 📌 Messagerie complète avec pièces jointes, images, messages privés

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Send,
  Paperclip,
  Image,
  MessageCircle,
  Check,
  CheckCheck,
  Pin,
  AlertCircle,
  Trash2,
  Users,
  User,
  UserCog,
  X,
  Camera,
  File,
  AtSign,
  Search,
  Loader2,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatTime, formatDate } from '@/utils/helpers';
import { supabase } from '@/lib/supabase';
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

type TargetType = 'all' | 'aidant' | 'admin' | 'family' | 'specific';

// ============================================================
// CONSTANTES
// ============================================================

const GLOBAL_CONVERSATION_ID = '00000000-0000-0000-0000-000000000001';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

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

  // ============================================================
  // ÉTATS
  // ============================================================

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string>(GLOBAL_CONVERSATION_ID);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Pièces jointes
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Ciblage
  const [targetType, setTargetType] = useState<TargetType>('all');
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [showTargetSelector, setShowTargetSelector] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  // Modals
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);

  // Realtime
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<TimeoutId | null>(null);
  const isUnmountingRef = useRef(false);
  const isSubscribingRef = useRef(false);

  // Auth
  const currentUserId = profile?.id || user?.id || null;
  const currentUserName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur';
  const currentUserRole = (profile?.role || role || 'family') as string;

  // Theme
  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  // Roles helpers
  const isAdminRole = isAdminOrCoordinator;
  const isAidantRole = isAidant;
  const isFamilyRole = isFamily;

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
        console.warn('⚠️ Sender fallback utilisé:', error);
        return getSenderFallback(senderId);
      }
    },
    [getSenderFallback]
  );

  // ============================================================
  // FETCH USERS
  // ============================================================

  const fetchUsers = useCallback(async (search: string = '') => {
    try {
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .neq('id', currentUserId);

      if (search) {
        query = query.ilike('full_name', `%${search}%`);
      }

      const { data, error } = await query.limit(10);
      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('❌ Fetch users error:', error);
    }
  }, [currentUserId]);

  // ============================================================
  // FETCH CONVERSATIONS
  // ============================================================

  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return;

    try {
      // Récupérer les conversations
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [currentUserId])
        .order('last_message_at', { ascending: false });

      if (convError) throw convError;

      const conversationsWithParticipants = await Promise.all(
        (convData || []).map(async (conv) => {
          const participantIds = conv.participant_ids.filter((id: string) => id !== currentUserId);
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

          // Récupérer le dernier message
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
            last_message: lastMessage || null,
          } as Conversation;
        })
      );

      // Ajouter la conversation globale si elle n'existe pas
      const hasGlobal = conversationsWithParticipants.some(
        (c) => c.id === GLOBAL_CONVERSATION_ID
      );

      if (!hasGlobal) {
        const globalConv: Conversation = {
          id: GLOBAL_CONVERSATION_ID,
          type: 'global',
          participant_ids: [currentUserId],
          name: '💬 Général',
          last_message_at: new Date().toISOString(),
          participants: [],
          last_message: null,
        };
        conversationsWithParticipants.unshift(globalConv);
      }

      setConversations(conversationsWithParticipants);

      // Sélectionner la première conversation si aucune n'est sélectionnée
      if (!currentConversationId || currentConversationId === GLOBAL_CONVERSATION_ID) {
        setCurrentConversationId(conversationsWithParticipants[0]?.id || GLOBAL_CONVERSATION_ID);
      }

    } catch (error) {
      console.error('❌ Fetch conversations error:', error);
    }
  }, [currentUserId]);

  // ============================================================
  // FETCH MESSAGES
  // ============================================================

  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!currentUserId) return;

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) throw error;

      const rawMessages = data || [];

      const senderIds = [...new Set(rawMessages.map((m: any) => m.sender_id))].filter(Boolean);
      let profilesMap: Record<string, SenderProfile> = {};

      if (senderIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, role, avatar_url')
          .in('id', senderIds);

        if (!profilesError && profilesData) {
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
        sender: profilesMap[message.sender_id] || getSenderFallback(message.sender_id),
      }));

      setMessages(messagesWithSenders);

      const unread = messagesWithSenders.filter(
        (m) => !m.is_read && m.sender_id !== currentUserId
      ).length;

      setUnreadCount(unread);

      if (unread > 0) {
        await markAllAsRead(conversationId);
      }

      scrollToBottom(false);
    } catch (error: any) {
      console.error('❌ Fetch messages error:', error);
      toast.error(error?.message || 'Erreur lors du chargement des messages');
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, getSenderFallback, scrollToBottom]);

  // ============================================================
  // MARK ALL AS READ
  // ============================================================

  const markAllAsRead = useCallback(async (conversationId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
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
  // CREATE CONVERSATION
  // ============================================================

  const createConversation = useCallback(async (targetUserId: string, targetName?: string) => {
    if (!currentUserId) return null;

    try {
      const participantIds = [currentUserId, targetUserId];
      const name = targetName || 'Conversation';

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          participant_ids: participantIds,
          type: 'direct',
          name,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await fetchConversations();
      setCurrentConversationId(data.id);
      setShowTargetSelector(false);
      setTargetUserId(null);
      setTargetType('all');

      toast.success('💬 Conversation créée');

      return data;
    } catch (error: any) {
      console.error('❌ Create conversation error:', error);
      toast.error(error?.message || 'Erreur lors de la création');
      return null;
    }
  }, [currentUserId, fetchConversations]);

  // ============================================================
  // GET TARGET USERS FOR MESSAGE
  // ============================================================

  const getTargetUsers = useCallback(async (target: TargetType): Promise<string[]> => {
    if (target === 'all') {
      const { data } = await supabase.from('profiles').select('id');
      return data?.map((u: any) => u.id) || [];
    }

    if (target === 'aidant') {
      const { data } = await supabase.from('profiles').select('id').eq('role', 'aidant');
      return data?.map((u: any) => u.id) || [];
    }

    if (target === 'admin') {
      const { data } = await supabase.from('profiles').select('id').in('role', ['admin', 'coordinator']);
      return data?.map((u: any) => u.id) || [];
    }

    if (target === 'family') {
      const { data } = await supabase.from('profiles').select('id').eq('role', 'family');
      return data?.map((u: any) => u.id) || [];
    }

    if (target === 'specific' && targetUserId) {
      return [targetUserId];
    }

    return [];
  }, [targetUserId]);

  // ============================================================
  // SEND MESSAGE WITH ATTACHMENTS
  // ============================================================

  const handleSendMessage = async () => {
    const content = messageInput.trim();
    const hasAttachments = attachments.length > 0;

    if (!content && !hasAttachments) {
      toast.error('Veuillez écrire un message ou joindre un fichier');
      return;
    }

    if (!currentUserId) {
      toast.error('Session utilisateur introuvable');
      return;
    }

    setIsSending(true);
    setIsUploading(true);

    try {
      // Upload attachments
      const attachmentUrls: string[] = [];
      const attachmentTypes: ('image' | 'document')[] = [];

      for (const file of attachments) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${fileExt}`;
        const filePath = `messages/${currentUserId}/${fileName}`;

        const { data, error } = await supabase.storage
          .from('messages')
          .upload(filePath, file);

        if (!error && data) {
          const { data: { publicUrl } } = supabase.storage
            .from('messages')
            .getPublicUrl(filePath);

          attachmentUrls.push(publicUrl);
          attachmentTypes.push(file.type.startsWith('image/') ? 'image' : 'document');
        }
      }

      // Déterminer la conversation
      let conversationId = currentConversationId;

      // Si c'est une nouvelle conversation avec un destinataire spécifique
      if (targetType === 'specific' && targetUserId) {
        const existingConv = conversations.find(
          (c) => c.type === 'direct' && c.participant_ids.includes(targetUserId)
        );

        if (existingConv) {
          conversationId = existingConv.id;
        } else {
          const newConv = await createConversation(targetUserId);
          if (newConv) {
            conversationId = newConv.id;
          } else {
            throw new Error('Impossible de créer la conversation');
          }
        }
      }

      // Si c'est un message ciblé (aidant, admin, etc.)
      if (targetType !== 'all' && targetType !== 'specific') {
        const targetUserIds = await getTargetUsers(targetType);
        if (targetUserIds.length > 0) {
          // Créer une conversation de groupe
          const participantIds = [currentUserId, ...targetUserIds];
          const { data: convData, error: convError } = await supabase
            .from('conversations')
            .insert({
              participant_ids: participantIds,
              type: 'group',
              name: getTargetLabel(targetType),
              last_message_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (!convError && convData) {
            conversationId = convData.id;
            await fetchConversations();
          }
        }
      }

      // Envoyer le message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: content || null,
          is_read: false,
          attachment_url: attachmentUrls.length > 0 ? attachmentUrls.join(',') : null,
          attachment_type: attachmentTypes.length > 0 ? 'image' : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Mettre à jour la conversation
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Ajouter le message à l'état
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

        setMessages((prev) => [...prev, messageWithSender]);

        // Si c'est un message ciblé, notifier les destinataires
        if (targetType !== 'all' && targetType !== 'specific') {
          const targetUserIds = await getTargetUsers(targetType);
          for (const userId of targetUserIds) {
            await supabase.from('notifications').insert({
              user_id: userId,
              title: `📨 Nouveau message de ${currentUserName}`,
              body: content?.substring(0, 100) || 'Pièce jointe',
              type: 'message',
              data: {
                conversation_id: conversationId,
                message_id: data.id,
                sender_id: currentUserId,
              },
            });
          }
        }

        // Réinitialiser
        setMessageInput('');
        setAttachments([]);
        setAttachmentPreviews([]);
        setTargetType('all');
        setTargetUserId(null);

        inputRef.current?.focus();
        scrollToBottom(true);
      }
    } catch (error: any) {
      console.error('❌ Send message error:', error);
      toast.error(error?.message || "Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  // ============================================================
  // HANDLE FILE / IMAGE SELECTION
  // ============================================================

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(
      (file) => file.size <= MAX_FILE_SIZE
    );

    if (validFiles.length !== files.length) {
      toast.error('Certains fichiers dépassent 5MB');
    }

    setAttachments((prev) => [...prev, ...validFiles]);

    validFiles.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setAttachmentPreviews((prev) => [...prev, event.target?.result as string]);
        };
        reader.readAsDataURL(file);
      } else {
        setAttachmentPreviews((prev) => [...prev, '📄']);
      }
    });

    // Reset input
    if (e.target) e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setAttachmentPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // ============================================================
  // HANDLE NEW MESSAGE (Realtime)
  // ============================================================

  const handleNewMessage = useCallback(
    async (newMessage: any) => {
      const sender = await fetchSenderProfile(newMessage.sender_id);

      // Vérifier si le message est pour la conversation active
      if (newMessage.conversation_id === currentConversationId) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === newMessage.id);
          if (exists) return prev;
          return [
            ...prev,
            {
              ...newMessage,
              sender,
              attachment_url: newMessage.attachment_url || null,
              is_pinned: newMessage.is_pinned || false,
              is_important: newMessage.is_important || false,
            },
          ];
        });

        if (newMessage.sender_id !== currentUserId) {
          setUnreadCount((prev) => prev + 1);
        }
        scrollToBottom(true);
      }

      // Mettre à jour les conversations
      await fetchConversations();
    },
    [currentConversationId, currentUserId, fetchSenderProfile, scrollToBottom, fetchConversations]
  );

  const handleMessageUpdate = useCallback((updatedMessage: any) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === updatedMessage.id ? { ...message, ...updatedMessage } : message
      )
    );
  }, []);

  const handleMessageDelete = useCallback((deletedMessage: any) => {
    setMessages((prev) => prev.filter((message) => message.id !== deletedMessage.id));
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
    if (isSubscribingRef.current) return;

    isSubscribingRef.current = true;
    cleanupSubscription();

    window.setTimeout(() => {
      isUnmountingRef.current = false;

      console.log('🔄 Configuration de la souscription Realtime...');

      const channel = supabase.channel(`messages-${currentUserId}`);

      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          async (payload) => {
            const message = payload.new;
            // Vérifier si l'utilisateur est dans la conversation
            const { data: conv } = await supabase
              .from('conversations')
              .select('participant_ids')
              .eq('id', message.conversation_id)
              .single();

            if (conv && conv.participant_ids.includes(currentUserId)) {
              await handleNewMessage(message);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
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
          },
          (payload) => {
            handleMessageDelete(payload.old);
          }
        );

      channelRef.current = channel;

      channel.subscribe((status) => {
        console.log('📡 Statut Realtime messages:', status);

        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true);
          isSubscribingRef.current = false;
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          return;
        }

        if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsRealtimeConnected(false);
          isSubscribingRef.current = false;
          if (!isUnmountingRef.current) {
            console.warn('⚠️ Canal Realtime fermé, reconnexion...');
            reconnectTimeoutRef.current = setTimeout(() => {
              setupRealtimeSubscription();
            }, 3000);
          }
        }
      });

      console.log('✅ Souscription Realtime configurée');
    }, 150);
  }, [currentUserId, cleanupSubscription, handleNewMessage, handleMessageUpdate, handleMessageDelete]);

  // ============================================================
  // EFFETS
  // ============================================================

  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !currentUserId) return;

    fetchConversations();
    setupRealtimeSubscription();

    return () => {
      cleanupSubscription();
    };
  }, [isInitialized, isAuthenticated, currentUserId, fetchConversations, setupRealtimeSubscription, cleanupSubscription]);

  useEffect(() => {
    if (currentConversationId) {
      fetchMessages(currentConversationId);
    }
  }, [currentConversationId, fetchMessages]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length, scrollToBottom]);

  // ============================================================
  // HELPERS
  // ============================================================

  const getTargetLabel = (target: TargetType): string => {
    switch (target) {
      case 'all': return '💬 Tous';
      case 'aidant': return '🦸 Aidants';
      case 'admin': return '👑 Administration';
      case 'family': return '👨‍👩‍👦 Familles';
      case 'specific': return '👤 Spécifique';
      default: return '💬 Général';
    }
  };

  const getRoleColor = (senderRole?: string | null) => {
    const map: Record<string, string> = {
      family: '#4CAF50',
      aidant: '#FF9800',
      coordinator: '#2196F3',
      admin: '#9C27B0',
    };
    return map[senderRole || 'family'] || '#9E9E9E';
  };

  const getRoleLabel = (senderRole?: string | null) => {
    const map: Record<string, string> = {
      family: '👨‍👩‍👦',
      aidant: '🦸',
      coordinator: '👔',
      admin: '👑',
    };
    return map[senderRole || 'family'] || '👤';
  };

  const getTargetDisplay = () => {
    if (targetType === 'specific' && targetUserId) {
      const user = availableUsers.find((u) => u.id === targetUserId);
      return user?.full_name || 'Utilisateur';
    }
    return getTargetLabel(targetType);
  };

  const getPlaceholder = () => {
    const target = getTargetDisplay();
    if (isAdminRole) {
      return `👔 Message à ${target}...`;
    }
    if (isAidantRole) {
      return `🦸 Message à ${target}...`;
    }
    return `Message à ${target}...`;
  };

  const getFooterText = () => {
    if (isAdminRole) {
      return '👔 Clic droit sur un message pour le gérer';
    }
    return '💬 Choisissez un destinataire pour envoyer un message';
  };

  const getConversationName = (conv: Conversation): string => {
    if (conv.id === GLOBAL_CONVERSATION_ID) return '💬 Général';
    if (conv.type === 'direct' && conv.participants?.length === 1) {
      return conv.participants[0]?.full_name || 'Utilisateur';
    }
    if (conv.type === 'group' && conv.participants) {
      return conv.participants.map((p) => p.full_name).join(', ');
    }
    return conv.name || 'Conversation';
  };

  const getConversationSubtitle = (conv: Conversation): string => {
    if (conv.id === GLOBAL_CONVERSATION_ID) return 'Discussion générale';
    if (conv.type === 'direct') return 'Conversation privée';
    if (conv.type === 'group') return `${conv.participants?.length || 0} participants`;
    return '';
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ============================================================
  // PIN / IMPORTANT / DELETE
  // ============================================================

  const togglePinMessage = async (messageId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_pinned: !currentState })
        .eq('id', messageId);

      if (error) throw error;
      toast.success(currentState ? 'Message désépinglé' : 'Message épinglé');
    } catch (error: any) {
      console.error('❌ Pin message error:', error);
      toast.error(error?.message || 'Erreur');
    }
  };

  const toggleImportantMessage = async (messageId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_important: !currentState })
        .eq('id', messageId);

      if (error) throw error;
      toast.success(currentState ? 'Important retiré' : 'Marqué comme important');
    } catch (error: any) {
      console.error('❌ Important message error:', error);
      toast.error(error?.message || 'Erreur');
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
      console.error('❌ Delete message error:', error);
      toast.error(error?.message || 'Erreur');
    }
  };

  // ============================================================
  // RENDU
  // ============================================================

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: colors.text }}>Chargement des messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-175px)] sm:h-[calc(100vh-135px)] md:h-[calc(100vh-120px)] flex flex-col md:flex-row bg-white rounded-2xl overflow-hidden shadow-sm border" style={{ borderColor: colors.primary + '12' }}>
      {/* ============================================================
      SIDEBAR - CONVERSATIONS
      ============================================================ */}
      <div className="w-full md:w-64 lg:w-72 border-b md:border-b-0 md:border-r flex flex-col bg-gray-50/50 shrink-0" style={{ borderColor: colors.primary + '10' }}>
        <div className="p-3 border-b shrink-0 flex items-center justify-between" style={{ borderColor: colors.primary + '10' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Conversations</h3>
          <button
            onClick={() => setShowTargetSelector(!showTargetSelector)}
            className="p-1.5 rounded-lg hover:bg-gray-200 transition"
            style={{ color: colors.primary }}
            title="Nouvelle conversation"
          >
            <UserPlus size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {conversations.map((conv) => {
            const isActive = conv.id === currentConversationId;
            const isGlobal = conv.id === GLOBAL_CONVERSATION_ID;
            const lastMsg = conv.last_message;
            const hasUnread = lastMsg && !lastMsg.is_read && lastMsg.sender_id !== currentUserId;

            return (
              <button
                key={conv.id}
                onClick={() => setCurrentConversationId(conv.id)}
                className={`w-full text-left p-2.5 rounded-xl transition-colors duration-150 ${
                  isActive ? 'bg-white shadow-sm' : 'hover:bg-white/70'
                }`}
                style={{
                  border: isActive ? `1px solid ${colors.primary}20` : '1px solid transparent',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: isGlobal ? colors.primary : getRoleColor(conv.participants?.[0]?.role) }}
                  >
                    {isGlobal ? '💬' : conv.participants?.[0]?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold truncate text-gray-700">
                        {getConversationName(conv)}
                      </p>
                      {hasUnread && (
                        <span
                          className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                          style={{ background: colors.primary }}
                        />
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 truncate font-medium">
                      {lastMsg?.content?.substring(0, 30) || getConversationSubtitle(conv)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================
      CHAT PRINCIPAL
      ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* En-tête */}
        <div className="p-3 border-b flex items-center justify-between shrink-0 bg-white" style={{ borderColor: colors.primary + '12' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white text-xs font-bold"
              style={{ background: currentConversationId === GLOBAL_CONVERSATION_ID ? colors.primary : colors.secondary }}
            >
              {currentConversationId === GLOBAL_CONVERSATION_ID ? '💬' : '👤'}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-gray-800 truncate">
                {conversations.find(c => c.id === currentConversationId)?.name || '💬 Général'}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <span className={`w-1.5 h-1.5 rounded-full ${isRealtimeConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>{isRealtimeConnected ? 'En direct' : 'Déconnecté'}</span>
              </div>
            </div>
          </div>

          {/* Sélecteur de destinataire */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowTargetSelector(!showTargetSelector)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border hover:bg-gray-50 transition"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              <AtSign size={14} />
              <span className="hidden sm:inline">{getTargetDisplay()}</span>
              <span className="text-gray-400">▼</span>
            </button>

            {showTargetSelector && (
              <div
                className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-xl border p-2 z-50"
                style={{ borderColor: colors.border }}
              >
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setTargetType('all');
                      setTargetUserId(null);
                      setShowTargetSelector(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition ${
                      targetType === 'all' ? 'bg-[var(--color-primary)]/10' : 'hover:bg-gray-50'
                    }`}
                    style={{ color: targetType === 'all' ? colors.primary : colors.text }}
                  >
                    💬 Tous les utilisateurs
                  </button>
                  <button
                    onClick={() => {
                      setTargetType('aidant');
                      setTargetUserId(null);
                      setShowTargetSelector(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition ${
                      targetType === 'aidant' ? 'bg-[var(--color-primary)]/10' : 'hover:bg-gray-50'
                    }`}
                    style={{ color: targetType === 'aidant' ? colors.primary : colors.text }}
                  >
                    🦸 Aidants
                  </button>
                  <button
                    onClick={() => {
                      setTargetType('admin');
                      setTargetUserId(null);
                      setShowTargetSelector(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition ${
                      targetType === 'admin' ? 'bg-[var(--color-primary)]/10' : 'hover:bg-gray-50'
                    }`}
                    style={{ color: targetType === 'admin' ? colors.primary : colors.text }}
                  >
                    👑 Administration
                  </button>
                  <button
                    onClick={() => {
                      setTargetType('family');
                      setTargetUserId(null);
                      setShowTargetSelector(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition ${
                      targetType === 'family' ? 'bg-[var(--color-primary)]/10' : 'hover:bg-gray-50'
                    }`}
                    style={{ color: targetType === 'family' ? colors.primary : colors.text }}
                  >
                    👨‍👩‍👦 Familles
                  </button>

                  <div className="border-t my-1" style={{ borderColor: colors.border }}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1.5">
                      👤 Utilisateur spécifique
                    </p>
                    <div className="px-2">
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={userSearch}
                          onChange={(e) => {
                            setUserSearch(e.target.value);
                            fetchUsers(e.target.value);
                          }}
                          placeholder="Rechercher..."
                          className="w-full pl-7 pr-2 py-1.5 rounded-lg border outline-none text-xs bg-gray-50"
                          style={{ borderColor: colors.border, color: colors.text }}
                        />
                      </div>
                      <div className="max-h-32 overflow-y-auto mt-1 space-y-0.5">
                        {availableUsers.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => {
                              setTargetType('specific');
                              setTargetUserId(u.id);
                              setShowTargetSelector(false);
                              setUserSearch('');
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition flex items-center gap-2"
                          >
                            <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-600">
                              {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                            <span className="truncate">{u.full_name}</span>
                            <span className="text-[8px] text-gray-400">{u.role}</span>
                          </button>
                        ))}
                        {availableUsers.length === 0 && userSearch && (
                          <p className="text-center text-[10px] text-gray-400 py-1">Aucun utilisateur trouvé</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-3"
          style={{ background: colors.background }}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div
                className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
                style={{ background: colors.primary + '12', color: colors.primary }}
              >
                <MessageCircle size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-700">Aucun message</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                {targetType === 'all'
                  ? 'Envoyez un message à tous les utilisateurs'
                  : `Envoyez un message à ${getTargetDisplay()}`}
              </p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isOwn = message.sender_id === currentUserId;
              const showDate =
                index === 0 ||
                formatDate(message.created_at) !== formatDate(messages[index - 1]?.created_at);

              const isPinned = !!message.is_pinned;
              const isImportant = !!message.is_important;

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="text-center my-4">
                      <span
                        className="text-[10px] font-bold px-3 py-1 rounded-full border bg-white"
                        style={{ borderColor: colors.border, color: colors.text + '80' }}
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
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm mt-0.5"
                          style={{ background: getRoleColor(message.sender?.role) }}
                        >
                          {message.sender?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}

                      <div
                        className={`p-3 rounded-2xl relative ${
                          isImportant ? 'border-2 border-orange-400/50' : ''
                        } ${isPinned ? 'border-l-4 border-yellow-400' : ''}`}
                        style={{
                          background: isOwn ? colors.primary : 'white',
                          color: isOwn ? 'white' : colors.text,
                          borderBottomRightRadius: isOwn ? '4px' : '16px',
                          borderBottomLeftRadius: isOwn ? '16px' : '4px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                          border: !isOwn ? '1px solid #F3F4F6' : undefined,
                        }}
                      >
                        {!isOwn && (
                          <div className="flex items-center space-x-1.5 mb-1 flex-wrap gap-y-0.5">
                            <span className="text-xs font-bold text-gray-800">
                              {message.sender?.full_name || 'Utilisateur'}
                            </span>
                            <span className="text-[10px] text-gray-300">•</span>
                            <span className="text-[10px] font-bold shrink-0" style={{ color: getRoleColor(message.sender?.role) }}>
                              {getRoleLabel(message.sender?.role)}
                            </span>
                            {isImportant && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-500 uppercase tracking-wider shrink-0">
                                Important
                              </span>
                            )}
                            {isPinned && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-700 uppercase tracking-wider shrink-0">
                                📌 Épinglé
                              </span>
                            )}
                          </div>
                        )}

                        {message.content && (
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed font-medium">
                            {message.content}
                          </p>
                        )}

                        {message.attachment_url && (
                          <div className="mt-2 space-y-1.5">
                            {message.attachment_url.split(',').map((url, i) => (
                              <div key={i} className="relative">
                                {url.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                                  <img
                                    src={url}
                                    alt={`Pièce jointe ${i + 1}`}
                                    className="rounded-lg max-w-full max-h-48 object-cover cursor-pointer"
                                    onClick={() => window.open(url, '_blank')}
                                  />
                                ) : (
                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-100">
                                    <File size={16} className="text-gray-500" />
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-500 hover:underline truncate"
                                    >
                                      Fichier joint {i + 1}
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-end space-x-1 mt-1 opacity-60">
                          <span className="text-[10px]">{formatTime(message.created_at)}</span>
                          {isOwn && (
                            <span className="text-[10px] shrink-0">
                              {message.is_read ? <CheckCheck size={12} /> : <Check size={12} />}
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

        {/* Barre de saisie avec pièces jointes */}
        <div
          className="p-2 sm:p-3 border-t bg-white shrink-0"
          style={{ borderColor: colors.primary + '12' }}
        >
          {/* Aperçu des pièces jointes */}
          {attachmentPreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b" style={{ borderColor: colors.border }}>
              {attachmentPreviews.map((preview, index) => (
                <div key={index} className="relative">
                  {preview.startsWith('data:image') ? (
                    <img
                      src={preview}
                      alt={`Pièce jointe ${index + 1}`}
                      className="w-12 h-12 rounded-lg object-cover border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center border">
                      <File size={20} className="text-gray-500" />
                    </div>
                  )}
                  <button
                    onClick={() => removeAttachment(index)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] hover:bg-red-600 transition shadow-lg"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            {/* Bouton Pièce jointe */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition shrink-0"
              title="Joindre un fichier"
            >
              <Paperclip size={18} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Bouton Image */}
            <button
              onClick={() => imageInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition shrink-0"
              title="Ajouter une image"
            >
              <Image size={18} />
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <input
              ref={inputRef}
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border bg-gray-50/50 outline-none text-xs sm:text-sm font-medium transition focus:bg-white focus:ring-1 min-w-0"
              style={{
                borderColor: colors.border,
                color: colors.text,
                '--tw-ring-color': colors.primary
              } as any}
              placeholder={getPlaceholder()}
              disabled={isSending}
            />

            <button
              onClick={handleSendMessage}
              disabled={(!messageInput.trim() && attachments.length === 0) || isSending}
              className={`p-2.5 rounded-xl text-white transition disabled:opacity-50 hover:opacity-90 shrink-0 ${
                (messageInput.trim() || attachments.length > 0) ? 'animate-pulse' : ''
              }`}
              style={{ background: colors.primary }}
            >
              {isSending || isUploading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>

          <div className="mt-1.5 flex items-center justify-between px-1">
            <p className="text-[10px] text-gray-400 font-medium">
              {getFooterText()}
            </p>
            <span className="text-[9px] text-gray-300">
              {attachments.length > 0 && `${attachments.length} fichier(s)`}
            </span>
          </div>
        </div>
      </div>

      {/* MODAL ADMIN */}
      {showPinModal && selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-xl border border-gray-100">
            <h3 className="text-base font-bold mb-4" style={{ color: colors.text }}>
              Gérer le message
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => {
                  togglePinMessage(selectedMessage.id, selectedMessage.is_pinned || false);
                  setShowPinModal(false);
                }}
                className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors duration-150"
              >
                <Pin size={18} style={{ color: selectedMessage.is_pinned ? colors.primary : colors.text + '50' }} />
                <span className="text-sm font-semibold" style={{ color: colors.text }}>
                  {selectedMessage.is_pinned ? 'Désépingler' : 'Épingler'}
                </span>
              </button>

              <button
                onClick={() => {
                  toggleImportantMessage(selectedMessage.id, selectedMessage.is_important || false);
                  setShowPinModal(false);
                }}
                className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors duration-150"
              >
                <AlertCircle size={18} style={{ color: selectedMessage.is_important ? '#FF9800' : colors.text + '50' }} />
                <span className="text-sm font-semibold" style={{ color: colors.text }}>
                  {selectedMessage.is_important ? 'Retirer important' : 'Marquer comme important'}
                </span>
              </button>

              <button
                onClick={() => deleteMessage(selectedMessage.id)}
                className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-red-50 transition-colors duration-150 text-red-500 font-semibold"
              >
                <Trash2 size={18} />
                <span className="text-sm">Supprimer</span>
              </button>

              <button
                onClick={() => {
                  setShowPinModal(false);
                  setSelectedMessage(null);
                }}
                className="w-full py-2.5 mt-2 rounded-xl font-bold text-sm border hover:bg-gray-50 transition-colors"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
