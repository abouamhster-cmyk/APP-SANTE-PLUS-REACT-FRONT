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
  const [isLoading, setIsLoading] = useState(true); // Démarre à true
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
        console.error('❌ Conversation non trouvée');
        setMessages([]);
        setIsLoading(false); 
        return;
      }

      if (conv.type !== 'public' && !conv.participant_ids.includes(currentUserId)) {
        console.error('❌ L\'utilisateur ne fait pas partie de cette conversation');
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
      setIsLoading(false); // ✅ Libère le chargement
    }
  }, [currentUserId, scrollToBottom]);

  // ============================================================
  // FETCH CONVERSATIONS (Sécurisé contre les boucles de chargement)
  // ============================================================

  const fetchConversations = useCallback(async () => {
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [currentUserId])
        .order('last_message_at', { ascending: false });

      if (convError) {
        console.error('❌ Conversations error:', convError);
        setIsLoading(false); // ✅ Libère le chargement en cas d'erreur
        return;
      }

      let filteredData = convData || [];

      if (!isAdminRole) {
        filteredData = filteredData.filter(
          (c: any) => c.type !== 'public' || c.participant_ids.includes(currentUserId)
        );
      }

      // ✅ CORRECTIF IMPORTANT : Si 0 discussion, on arrête immédiatement le chargement !
      if (filteredData.length === 0) {
        setConversations([]);
        setIsLoading(false);
        return;
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

      // ✅ CORRECTIF DE TRANSITION D'ÉTAT : Utilisation de prevId fonctionnel pour décharger les dépendances récursives
      if (conversationsWithParticipants.length > 0) {
        setCurrentConversationId(prevId => {
          if (prevId) {
            // S'il y a déjà une conversation active, on charge ses messages
            fetchMessages(prevId);
            return prevId;
          }
          // Sinon, on active la toute première par défaut
          const firstId = conversationsWithParticipants[0].id;
          fetchMessages(firstId);
          return firstId;
        });
      } else {
        setIsLoading(false); // ✅ Libère le chargement s'il n'y a rien
      }
    } catch (error) {
      console.error('❌ Fetch conversations error:', error);
      setIsLoading(false); // ✅ Libère le chargement en cas de crash
    }
  }, [currentUserId, isAdminRole, fetchMessages]);

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
            aidantsMap.set(v.aidant.user.id, v.aidant.user);
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
        .neq('sender_id', currentUserId); // Ne pas marquer ses propres messages

      if (error) throw error;
    } catch (err) {
      console.error('❌ Mark read error:', err);
    }
  }, [currentUserId]);

  // ============================================================
  // ACTIONS D'ASSIGNATIONS ET ENVOIS
  // ============================================================

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() && attachments.length === 0) return;
    if (!currentConversationId || !currentUserId) return;

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

      // Mettre à jour last_message_at de la conversation
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', currentConversationId);

      scrollToBottom(true);
    } catch (error: any) {
      console.error('❌ Send error:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setIsSending(false);
    }
  };

  const getTargetOptions = useCallback((): { value: TargetType; label: string; icon: string }[] => {
    if (isFamilyRole) {
      return [
        { value: 'aidant', label: 'Mon aidant', icon: '🦸' },
        { value: 'coordinator', label: 'Coordinateur', icon: '👔' },
        { value: 'admin', label: 'Administrateur', icon: '👑' },
        { value: 'specific', label: 'Personne spécifique', icon: '👤' },
      ];
    }
    return [
      { value: 'coordinator', label: 'Coordinateur', icon: '👔' },
      { value: 'admin', label: 'Administrateur', icon: '👑' },
      { value: 'specific', label: 'Personne spécifique', icon: '👤' },
    ];
  }, [isFamilyRole]);

  const getTargetUsers = useCallback(async (target: TargetType): Promise<string[]> => {
    try {
      if (target === 'aidant' && isFamilyRole) {
        return assignedAidants.map(a => a.id).filter(Boolean);
      }
      if (target === 'coordinator') {
        const { data } = await supabase.from('profiles').select('id').eq('role', 'coordinator');
        return data?.map((u: any) => u.id) || [];
      }
      if (target === 'admin') {
        const { data } = await supabase.from('profiles').select('id').eq('role', 'admin');
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

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setAttachmentPreviews((prev) => prev.filter((_, i) => i !== index));
  }, []);

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
  // ÉCOUTE REALTIME (Liaison Supabase)
  // ============================================================

  const handleNewMessage = useCallback(async (newMessage: any) => {
    if (!currentUserId) return;

    if (newMessage.conversation_id === currentConversationId) {
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
        const exists = prev.some((m) => m.id === newMessage.id);
        if (exists) return prev;
        return [
          ...prev,
          {
            ...newMessage,
            sender: mappedSender,
          },
        ];
      });

      if (newMessage.sender_id !== currentUserId) {
        await markAllAsRead(newMessage.conversation_id);
      }
      scrollToBottom(true);
    }

    await fetchConversations();
  }, [currentConversationId, currentUserId, scrollToBottom, fetchConversations, markAllAsRead]);

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
  }, []);

  const setupRealtimeSubscription = useCallback(() => {
    if (!currentUserId) return;
    if (isSubscribingRef.current) return;

    isSubscribingRef.current = true;
    cleanupSubscription();

    setTimeout(() => {
      isUnmountingRef.current = false;

      const channel = supabase.channel(`messages-room-${currentUserId}`);

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
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true);
          isSubscribingRef.current = false;
          return;
        }

        if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsRealtimeConnected(false);
          isSubscribingRef.current = false;
        }
      });
    }, 150);
  }, [currentUserId, cleanupSubscription, handleNewMessage, handleMessageUpdate, handleMessageDelete]);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !currentUserId) return;

    fetchConversations();
    fetchAssignedAidants();
    setupRealtimeSubscription();

    return () => {
      cleanupSubscription();
    };
  }, [isInitialized, isAuthenticated, currentUserId]);

  // ============================================================
  // AFFICHAGE ÉCRAN DE CHARGEMENT SÉCURISÉ (PLUS DE BOUCLE INFINIE)
  // ============================================================

  if (isLoading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-emerald-600 mb-4" />
          <p className="text-xs text-gray-500 font-bold">Chargement des messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-175px)] sm:h-[calc(100vh-135px)] md:h-[calc(100vh-120px)] flex flex-col md:flex-row bg-white rounded-2xl overflow-hidden shadow-sm border" style={{ borderColor: colors.primary + '12' }}>
      {/* BARRE LATÉRALE DES CONVERSATIONS */}
      <div className="w-full md:w-64 lg:w-72 border-b md:border-b-0 md:border-r flex flex-col bg-gray-50/50 shrink-0" style={{ borderColor: colors.primary + '10' }}>
        <div className="p-3 border-b shrink-0 flex items-center justify-between" style={{ borderColor: colors.primary + '10' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">💬 Discussions</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 space-y-1 scrollbar-none">
          {conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle size={24} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">Aucune conversation</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === currentConversationId;
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
                      style={{ background: colors.primary }}
                    >
                      {conv.participants?.[0]?.full_name?.charAt(0)?.toUpperCase() || 'U'}
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
                      <p className="text-[10px] text-gray-400 truncate font-medium mt-0.5">
                        {lastMsg?.content || 'Fichier joint'}
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
          <div className="p-3 border-b flex items-center justify-between shrink-0 bg-white" style={{ borderColor: colors.primary + '12' }}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white text-xs font-bold"
                style={{ background: colors.primary }}
              >
                💬
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-gray-800 truncate">
                  {conversations.find(c => c.id === currentConversationId)?.name || conversations.find(c => c.id === currentConversationId)?.participants?.[0]?.full_name || 'Discussion'}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                  <span className={`w-1.5 h-1.5 rounded-full ${isRealtimeConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span>{isRealtimeConnected ? 'En direct' : 'Déconnecté'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Corps de chat */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: colors.background }}>
            {messages.map((message, index) => {
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

                  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
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
                        className="p-3 rounded-2xl relative"
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
                          <p className="text-[10px] font-bold text-gray-400 mb-1">
                            {message.sender?.full_name || 'Utilisateur'}
                          </p>
                        )}
                        <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed font-semibold">
                          {message.content}
                        </p>
                        <div className="flex items-center justify-end space-x-1 mt-1 opacity-60 text-[9px]">
                          <span>{formatTimeSafe(message.created_at)}</span>
                          {isOwn && (
                            <span className="shrink-0">
                              {message.is_read ? <CheckCheck size={11} /> : <Check size={11} />}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Barre de saisie */}
          <form onSubmit={handleSendMessage} className="p-3 border-t bg-white shrink-0" style={{ borderColor: colors.primary + '12' }}>
            <div className="flex items-center gap-1.5">
              <input
                ref={inputRef}
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border bg-gray-50/50 outline-none text-xs sm:text-sm font-semibold transition focus:bg-white focus:ring-1"
                style={{
                  borderColor: colors.border,
                  color: colors.text,
                  '--tw-ring-color': colors.primary
                } as any}
                placeholder="Votre message..."
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={!messageInput.trim() || isSending}
                className="p-2.5 rounded-xl text-white transition hover:opacity-90 disabled:opacity-50 shrink-0"
                style={{ background: colors.primary }}
              >
                {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50/30">
          <div className="text-center">
            <MessageCircle size={40} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-bold text-gray-700">Aucune discussion active</h3>
            <p className="text-xs text-gray-400 mt-1">Sélectionnez une discussion à gauche pour commencer.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
