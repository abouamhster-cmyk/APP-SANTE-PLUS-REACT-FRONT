// 📁 src/features/messages/pages/MessagesPage.tsx

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
  UserPlus,
  Plus,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore';
import { useVisitStore } from '@/stores/visitStore';
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
  type: 'direct' | 'group' | 'public';
  participant_ids: string[];
  name: string | null;
  participants?: SenderProfile[];
  last_message_at: string;
  last_message?: Message;
  is_public?: boolean;
}

type TargetType = 'aidant' | 'coordinator' | 'admin' | 'aidants_group' | 'all_aidants' | 'specific';

// ============================================================
// CONSTANTES
// ============================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024;
type TimeoutId = ReturnType<typeof setTimeout>;

// ============================================================
// FONCTIONS UTILITAIRES EXTERNES
// ============================================================

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
  const { user, profile, role, isAuthenticated, isInitialized } = useAuthStore();
  const { patients, fetchPatients } = usePatientStore();
  const { visits, fetchVisits } = useVisitStore();

  const {
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  // ============================================================
  // ÉTATS
  // ============================================================

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [targetType, setTargetType] = useState<TargetType>('aidant');
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [showTargetSelector, setShowTargetSelector] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [assignedAidants, setAssignedAidants] = useState<any[]>([]);

  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);

  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<TimeoutId | null>(null);
  const isUnmountingRef = useRef(false);
  const isSubscribingRef = useRef(false);

  const currentUserId = profile?.id || user?.id || null;

  // ✅ CORRECTION : Utilisation de nullish coalescing pour éviter les types null/undefined
  const currentUserName = (() => {
    const name = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur';
    return typeof name === 'string' ? name : 'Utilisateur';
  })();

  const currentUserRole = (profile?.role || role || 'family') as string;

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  const isAdminRole = isAdminOrCoordinator;
  const isAidantRole = isAidant;
  const isFamilyRole = isFamily;

  // ============================================================
  // SCROLL TO BOTTOM
  // ============================================================

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      });
    }, 100);
  }, []);

  // ============================================================
  // FETCH CONVERSATIONS
  // ============================================================

  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [currentUserId])
        .order('last_message_at', { ascending: false });

      if (convError) {
        console.error('❌ Conversations error:', convError);
        return;
      }

      let filteredData = convData || [];

      if (!isAdminRole) {
        filteredData = filteredData.filter(
          (c: any) => c.type !== 'public' || c.participant_ids.includes(currentUserId)
        );
      }

      const conversationsWithParticipants = await Promise.all(
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

          const { data: lastMessage, error: lastError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...conv,
            participants,
            last_message: (!lastError && lastMessage) ? lastMessage : undefined,
          } as Conversation;
        })
      );

      setConversations(conversationsWithParticipants);

      if (!currentConversationId && conversationsWithParticipants.length > 0) {
        setCurrentConversationId(conversationsWithParticipants[0].id);
      }
    } catch (error) {
      console.error('❌ Fetch conversations error:', error);
    }
  }, [currentUserId, isAdminRole, currentConversationId]);

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
  // FETCH ASSIGNED AIDANTS
  // ============================================================

  const fetchAssignedAidants = useCallback(async () => {
    if (!isFamilyRole || !currentUserId) {
      setAssignedAidants([]);
      return;
    }

    try {
      const { data: visitsData, error: visitsError } = await supabase
        .from('visites')
        .select(`
          aidant_id,
          aidant:aidants!visites_aidant_id_fkey (
            id,
            user_id,
            user:profiles!aidants_user_id_fkey (
              id,
              full_name,
              email,
              role,
              avatar_url
            )
          )
        `)
        .eq('patient_id', currentUserId)
        .not('aidant_id', 'is', null);

      if (!visitsError && visitsData && visitsData.length > 0) {
        const aidantsMap = new Map();
        visitsData.forEach((v: any) => {
          if (v.aidant?.user) {
            aidantsMap.set(v.aidant.user_id, v.aidant.user);
          }
        });
        const aidants = Array.from(aidantsMap.values());
        setAssignedAidants(aidants);
        return;
      }

      const { data: allAidants, error: allError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, avatar_url')
        .eq('role', 'aidant')
        .limit(10);

      if (!allError && allAidants) {
        setAssignedAidants(allAidants);
        return;
      }

      setAssignedAidants([]);
    } catch (error) {
      console.error('❌ Fetch assigned aidants error:', error);
      setAssignedAidants([]);
    }
  }, [isFamilyRole, currentUserId]);

  // ============================================================
  // FETCH MESSAGES
  // ============================================================

  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!currentUserId) return;

    try {
      setIsLoading(true);

      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('participant_ids, type')
        .eq('id', conversationId)
        .maybeSingle();

      if (convError || !conv) {
        console.error('❌ Conversation not found');
        setMessages([]);
        setIsLoading(false);
        return;
      }

      if (conv.type !== 'public' && !conv.participant_ids.includes(currentUserId)) {
        console.error('❌ User not in conversation');
        setMessages([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) {
        console.error('❌ Messages error:', error);
        return;
      }

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
        sender: profilesMap[message.sender_id] || {
          id: message.sender_id,
          full_name: 'Utilisateur',
          role: 'family',
          avatar_url: null,
        },
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
  }, [currentUserId, scrollToBottom]);

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

  const createConversation = useCallback(async (
    participantIds: string[],
    type: 'direct' | 'group' = 'direct',
    name?: string
  ) => {
    if (!currentUserId) return null;

    try {
      const allParticipants = [...new Set([currentUserId, ...participantIds])];

      if (type === 'direct' && participantIds.length === 1) {
        const { data: existing, error: existingError } = await supabase
          .from('conversations')
          .select('id')
          .contains('participant_ids', [currentUserId, participantIds[0]])
          .eq('type', 'direct')
          .maybeSingle();

        if (!existingError && existing) {
          return existing;
        }
      }

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          participant_ids: allParticipants,
          type: type,
          name: name || null,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await fetchConversations();
      setCurrentConversationId(data.id);

      return data;
    } catch (error: any) {
      console.error('❌ Create conversation error:', error);
      toast.error(error?.message || 'Erreur lors de la création');
      return null;
    }
  }, [currentUserId, fetchConversations]);

  // ============================================================
  // GET TARGET OPTIONS
  // ============================================================

  const getTargetOptions = useCallback((): { value: TargetType; label: string; icon: string }[] => {
    if (isFamilyRole) {
      return [
        { value: 'aidant', label: '🦸 Mon aidant', icon: '🦸' },
        { value: 'aidants_group', label: '👥 Mes aidants (groupe)', icon: '👥' },
        { value: 'coordinator', label: '👔 Coordinateur', icon: '👔' },
        { value: 'admin', label: '👑 Administrateur', icon: '👑' },
        { value: 'specific', label: '👤 Personne spécifique', icon: '👤' },
      ];
    }

    if (isAidantRole) {
      return [
        { value: 'coordinator', label: '👔 Coordinateur', icon: '👔' },
        { value: 'admin', label: '👑 Administrateur', icon: '👑' },
        { value: 'specific', label: '👤 Personne spécifique', icon: '👤' },
      ];
    }

    if (isAdminRole) {
      return [
        { value: 'all_aidants', label: '📢 Tous les aidants', icon: '📢' },
        { value: 'specific', label: '👤 Personne spécifique', icon: '👤' },
      ];
    }

    return [{ value: 'specific', label: '👤 Personne spécifique', icon: '👤' }];
  }, [isFamilyRole, isAidantRole, isAdminRole]);

  // ============================================================
  // GET TARGET USERS
  // ============================================================

  const getTargetUsers = useCallback(async (target: TargetType): Promise<string[]> => {
    try {
      if (target === 'aidant' && isFamilyRole) {
        if (assignedAidants.length > 0) {
          return [assignedAidants[0].id];
        }
        return [];
      }

      if (target === 'aidants_group' && isFamilyRole) {
        return assignedAidants.map(a => a.id).filter(Boolean);
      }

      if (target === 'coordinator') {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'coordinator');
        return data?.map((u: any) => u.id) || [];
      }

      if (target === 'admin') {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin');
        return data?.map((u: any) => u.id) || [];
      }

      if (target === 'all_aidants') {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'aidant');
        return data?.map((u: any) => u.id) || [];
      }

      if (target === 'specific' && targetUserId) {
        return [targetUserId];
      }

      return [];
    } catch (error) {
      console.error('❌ Get target users error:', error);
      return [];
    }
  }, [isFamilyRole, assignedAidants, targetUserId]);

  // ============================================================
  // REMOVE ATTACHMENT
  // ============================================================

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setAttachmentPreviews((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ============================================================
  // HANDLE FILE SELECT
  // ============================================================

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => file.size <= MAX_FILE_SIZE);

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

    if (e.target) e.target.value = '';
  }, []);

  // ============================================================
  // TOGGLE PIN MESSAGE
  // ============================================================

  const togglePinMessage = useCallback(async (messageId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_pinned: !currentState })
        .eq('id', messageId);

      if (error) throw error;
      toast.success(currentState ? 'Message désépinglé' : 'Message épinglé');
      
      if (currentConversationId) {
        await fetchMessages(currentConversationId);
      }
    } catch (error: any) {
      console.error('❌ Pin message error:', error);
      toast.error(error?.message || 'Erreur');
    }
  }, [currentConversationId, fetchMessages]);

  // ============================================================
  // TOGGLE IMPORTANT MESSAGE
  // ============================================================

  const toggleImportantMessage = useCallback(async (messageId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_important: !currentState })
        .eq('id', messageId);

      if (error) throw error;
      toast.success(currentState ? 'Important retiré' : 'Marqué comme important');
      
      if (currentConversationId) {
        await fetchMessages(currentConversationId);
      }
    } catch (error: any) {
      console.error('❌ Important message error:', error);
      toast.error(error?.message || 'Erreur');
    }
  }, [currentConversationId, fetchMessages]);

  // ============================================================
  // DELETE MESSAGE
  // ============================================================

  const deleteMessage = useCallback(async (messageId: string) => {
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
      
      if (currentConversationId) {
        await fetchMessages(currentConversationId);
      }
    } catch (error: any) {
      console.error('❌ Delete message error:', error);
      toast.error(error?.message || 'Erreur');
    }
  }, [currentConversationId, fetchMessages]);

  // ============================================================
  // HANDLE NEW MESSAGE (Realtime)
  // ============================================================

  const handleNewMessage = useCallback(async (newMessage: any) => {
    if (!currentUserId) return;

    const { data: conv } = await supabase
      .from('conversations')
      .select('participant_ids')
      .eq('id', newMessage.conversation_id)
      .maybeSingle();

    if (!conv || !conv.participant_ids.includes(currentUserId)) {
      return;
    }

    if (newMessage.conversation_id === currentConversationId) {
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === newMessage.id);
        if (exists) return prev;
        return [
          ...prev,
          {
            ...newMessage,
            sender: {
              id: newMessage.sender_id,
              full_name: 'Utilisateur',
              role: 'family',
              avatar_url: null,
            },
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

    await fetchConversations();
  }, [currentConversationId, currentUserId, scrollToBottom, fetchConversations]);

  // ============================================================
  // HANDLE MESSAGE UPDATE
  // ============================================================

  const handleMessageUpdate = useCallback((updatedMessage: any) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === updatedMessage.id ? { ...message, ...updatedMessage } : message
      )
    );
  }, []);

  // ============================================================
  // HANDLE MESSAGE DELETE
  // ============================================================

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

    setTimeout(() => {
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

    setTimeout(() => {
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
            await handleNewMessage(payload.new);
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
  // SEND MESSAGE
  // ============================================================

  const handleSendMessage = useCallback(async () => {
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
      // Upload des pièces jointes
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

      // Déterminer les destinataires
      let targetUserIds: string[] = [];
      let conversationType: 'direct' | 'group' = 'direct';
      let conversationName: string | null = null;

      if (targetType === 'specific' && targetUserId) {
        targetUserIds = [targetUserId];
        conversationType = 'direct';
      } else {
        targetUserIds = await getTargetUsers(targetType);
        
        if (targetUserIds.length > 1) {
          conversationType = 'group';
          const labels: Record<TargetType, string> = {
            aidant: '👥 Aidants',
            aidants_group: '👥 Mes aidants',
            coordinator: '👔 Coordinateurs',
            admin: '👑 Administrateurs',
            all_aidants: '📢 Tous les aidants',
            specific: '👤 Discussion',
          };
          conversationName = labels[targetType] || '👥 Groupe';
        } else if (targetUserIds.length === 0) {
          toast.error('Aucun destinataire trouvé');
          setIsSending(false);
          setIsUploading(false);
          return;
        }
      }

      // Créer ou récupérer la conversation
      let conversationId = currentConversationId;

      if (targetUserIds.length === 1 && conversationType === 'direct') {
        const existing = await createConversation(targetUserIds, 'direct');
        if (existing) {
          conversationId = existing.id;
        } else {
          conversationId = currentConversationId || conversationId;
        }
      } else if (targetUserIds.length > 1 || conversationType === 'group') {
        const newConv = await createConversation(targetUserIds, 'group', conversationName);
        if (newConv) {
          conversationId = newConv.id;
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

      // Ajouter le message
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

        // Notifier les destinataires
        for (const userId of targetUserIds) {
          if (userId !== currentUserId) {
            await supabase.from('notifications').insert({
              user_id: userId,
              title: `📨 ${currentUserName}`,
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
  }, [
    messageInput,
    attachments,
    currentUserId,
    targetType,
    targetUserId,
    currentUserName,
    currentUserRole,
    profile?.avatar_url,
    getTargetUsers,
    createConversation,
    currentConversationId,
    scrollToBottom,
  ]);

  // ============================================================
  // EFFETS
  // ============================================================

  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !currentUserId) return;

    fetchConversations();
    fetchAssignedAidants();
    setupRealtimeSubscription();

    return () => {
      cleanupSubscription();
    };
  }, [isInitialized, isAuthenticated, currentUserId]);

  useEffect(() => {
    if (currentConversationId) {
      fetchMessages(currentConversationId);
    }
  }, [currentConversationId, fetchMessages]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length, scrollToBottom]);

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
      {/* SIDEBAR - CONVERSATIONS */}
      <div className="w-full md:w-64 lg:w-72 border-b md:border-b-0 md:border-r flex flex-col bg-gray-50/50 shrink-0" style={{ borderColor: colors.primary + '10' }}>
        <div className="p-3 border-b shrink-0 flex items-center justify-between" style={{ borderColor: colors.primary + '10' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">💬 Messages</h3>
          <button
            onClick={() => setShowTargetSelector(!showTargetSelector)}
            className="p-1.5 rounded-lg hover:bg-gray-200 transition"
            style={{ color: colors.primary }}
            title="Nouveau message"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle size={24} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">Aucune conversation</p>
              <p className="text-[10px] text-gray-300">Commencez un nouveau message</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === currentConversationId;
              const lastMsg = conv.last_message;
              const hasUnread = lastMsg && !lastMsg.is_read && lastMsg.sender_id !== currentUserId;
              const isPublic = conv.type === 'public';

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
                      style={{ background: isPublic ? '#8b5cf6' : colors.primary }}
                    >
                      {isPublic ? '📢' : conv.participants?.[0]?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold truncate text-gray-700">
                          {conv.name || conv.participants?.[0]?.full_name || 'Conversation'}
                        </p>
                        {hasUnread && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                            style={{ background: colors.primary }}
                          />
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 truncate font-medium">
                        {lastMsg?.content?.substring(0, 30) || 'Aucun message'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* CHAT PRINCIPAL */}
      {currentConversationId ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* En-tête */}
          <div className="p-3 border-b flex items-center justify-between shrink-0 bg-white" style={{ borderColor: colors.primary + '12' }}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white text-xs font-bold"
                style={{ background: colors.primary }}
              >
                {conversations.find(c => c.id === currentConversationId)?.type === 'public' ? '📢' : '💬'}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-gray-800 truncate">
                  {conversations.find(c => c.id === currentConversationId)?.name || 'Conversation'}
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
                <span className="hidden sm:inline">
                  {targetType === 'specific' && targetUserId
                    ? availableUsers.find(u => u.id === targetUserId)?.full_name || 'Utilisateur'
                    : getTargetOptions().find(o => o.value === targetType)?.label || 'Destinataire'}
                </span>
                <span className="text-gray-400">▼</span>
              </button>

              {showTargetSelector && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-xl border p-2 z-50 max-h-[80vh] overflow-y-auto"
                  style={{ borderColor: colors.border }}
                >
                  <div className="space-y-1">
                    {getTargetOptions().map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setTargetType(option.value);
                          if (option.value !== 'specific') {
                            setTargetUserId(null);
                            setShowTargetSelector(false);
                          }
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition ${
                          targetType === option.value ? 'bg-[var(--color-primary)]/10' : 'hover:bg-gray-50'
                        }`}
                        style={{ color: targetType === option.value ? colors.primary : colors.text }}
                      >
                        {option.label}
                      </button>
                    ))}

                    <div className="border-t my-1" style={{ borderColor: colors.border }}>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1.5">
                        👤 Rechercher un utilisateur
                      </p>
                      <div className="px-2">
                        <div className="relative">
                          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={userSearch}
                            onChange={(e) => {
                              setUserSearch(e.target.value);
                              clearTimeout((inputRef.current as any)._searchTimeout);
                              (inputRef.current as any)._searchTimeout = setTimeout(() => {
                                fetchUsers(e.target.value);
                              }, 300);
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
                  Envoyez un message à votre destinataire
                </p>
              </div>
            ) : (
              messages.map((message, index) => {
                const isOwn = message.sender_id === currentUserId;
                
                const prevMessage = messages[index - 1];
                const currentDate = formatDateSafe(message.created_at);
                const prevDate = formatDateSafe(prevMessage?.created_at);
                const showDate = currentDate !== prevDate && currentDate !== '';

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
                          {currentDate}
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
                            style={{ background: colors.primary }}
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
                            <span className="text-[10px]">{formatTimeSafe(message.created_at)}</span>
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

          {/* Barre de saisie */}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border bg-gray-50/50 outline-none text-xs sm:text-sm font-medium transition focus:bg-white focus:ring-1 min-w-0"
                style={{
                  borderColor: colors.border,
                  color: colors.text,
                  '--tw-ring-color': colors.primary
                } as any}
                placeholder="Votre message..."
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
                💬 Messages privés et sécurisés
              </p>
              <span className="text-[9px] text-gray-300">
                {attachments.length > 0 && `${attachments.length} fichier(s)`}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50/30">
          <div className="text-center">
            <MessageCircle size={40} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-bold text-gray-700">Aucune conversation</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              Commencez une nouvelle discussion en cliquant sur le bouton <Plus size={14} className="inline text-gray-400" />
            </p>
          </div>
        </div>
      )}

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
