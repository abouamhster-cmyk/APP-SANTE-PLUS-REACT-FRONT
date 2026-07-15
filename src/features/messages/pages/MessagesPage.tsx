// 📁 src/features/messages/pages/MessagesPage.tsx
// ✅ PAGE MESSAGERIE RESPONSIVE DE GRANDE QUALITÉ : CADRE FLOTTANT EN HAUTEUR ET LARGEUR OPTIMISÉES SANS COLLAGE

import { useEffect, useState, useRef, useCallback } from 'react';
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
import { useTerminology } from '@/hooks/useTerminology';
import { formatTime, formatDate } from '@/utils/helpers';
import { supabase } from '@/lib/supabase';
import { Message, Conversation } from '@/types'; // Types unifiés globaux
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

// ============================================================
// TYPES ET INTERFACES LOCALES
// ============================================================

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

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

const MessagesPage = () => {
  // Récupération correcte du profil pour l'envoi de messages
  const { user, profile, role, isAuthenticated, isInitialized } = useAuthStore();
  const { isFamily } = useTerminology();

  // Utilisation des actions et états du store unifié REST
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

  // Déclaration unique de l'état local pour le champ de saisie du message
  const [messageInput, setMessageInput] = useState('');

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

  // 1. Charger les discussions au montage initial (Déclenche le générateur d'API REST)
  useEffect(() => {
    if (isInitialized && isAuthenticated && currentUserId) {
      fetchConversations(true);
    }
  }, [isInitialized, isAuthenticated, currentUserId, fetchConversations]);

  // 2. Écoute du Realtime Supabase pour l'immédiateté des messages reçus
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

          // Ajouter localement
          appendRealtimeMessage({ ...newMessage, sender: mappedSender } as Message);

          // Marquer comme lu
          await supabase.from('messages').update({ is_read: true }).eq('id', newMessage.id);
          scrollToBottom(true);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [currentConversationId, currentUserId, appendRealtimeMessage, scrollToBottom]);

  // 3. Envoi du message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const content = messageInput.trim();
    setMessageInput('');

    try {
      // Envoi via l'action unifiée du store REST pour contourner le RLS
      await sendMessage(content);
      scrollToBottom(true);
    } catch (err: any) {
      toast.error("Échec de l'envoi");
      setMessageInput(content); // Restituer le texte tapé en cas d'échec
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
    <div 
      // 🟢 CORRECTIF DE REMONTÉE ET LARGEUR : Marge de haut réduite (top-[58px]), bas optimisé (bottom-[88px]) et élargissement de confort (left-3, right-3)
      className="fixed md:static left-3 md:left-auto right-3 md:right-auto top-[58px] md:top-auto bottom-[88px] md:bottom-auto md:h-[calc(100vh-130px)] flex flex-col md:flex-row bg-white rounded-3xl overflow-hidden shadow-sm border"
      style={{ borderColor: colors.primary + '12' }}
    >
      
      {/* BARRE LATÉRALE DE DISCUSSIONS RESPONSIVE (Masquée sur mobile si un chat est actif) */}
      <div 
        className={cn(
          "w-full md:w-80 border-b md:border-b-0 md:border-r flex flex-col bg-gray-50/50 shrink-0 h-full overflow-hidden",
          currentConversationId ? "hidden md:flex" : "flex"
        )}
        style={{ borderColor: colors.primary + '10' }}
      >
        <div className="p-4 border-b flex items-center justify-between bg-white" style={{ borderColor: colors.primary + '10' }}>
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
                    fetchMessages(conv.id); // Appel du fetch unifié du store REST
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

      {/* ZONE DE CHAT ACTIVE RESPONSIVE (Plein écran sur mobile si actif) */}
      <div 
        className={cn(
          "flex-1 flex flex-col min-w-0 bg-white h-full overflow-hidden",
          currentConversationId ? "flex" : "hidden md:flex"
        )}
      >
        {activeConversation ? (
          <>
            <div className="p-4 border-b flex items-center gap-3 bg-white shrink-0">
              
              {/* BOUTON RETOUR : Visible uniquement sur mobile pour fermer le chat actif */}
              <button
                onClick={() => setCurrentConversationId(null)}
                className="md:hidden p-1.5 hover:bg-gray-100 rounded-xl transition shrink-0"
              >
                <ArrowLeft size={18} style={{ color: colors.primary }} />
              </button>

              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0" style={{ background: colors.primary }}>
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

            {/* Corps du chat (Seule cette partie scrolle désormais librement, le reste est figé) */}
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
                            className="p-3 rounded-2xl relative"
                            style={{
                              background: isOwn ? colors.primary : 'white',
                              color: isOwn ? 'white' : '#2d2d2d',
                              borderBottomRightRadius: isOwn ? '4px' : '16px',
                              borderBottomLeftRadius: isOwn ? '16px' : '4px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.015)',
                              border: !isOwn ? '1px solid #f3f2ef' : undefined,
                            }}
                          >
                            {/* Affichage systématique du nom réel de l'expéditeur sur le message */}
                            <p className={cn(
                              "text-[9px] font-black uppercase tracking-wider mb-1 block",
                              isOwn ? "text-white/80" : "text-gray-400"
                            )}>
                              {isOwn ? 'Moi' : (message.sender?.full_name || 'Utilisateur')}
                            </p>

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
                  placeholder="Écrire un message..."
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
              <p className="text-xs text-gray-400 max-w-xs mt-1">Sélectionnez une discussion à gauche pour initier le dialogue.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default MessagesPage;
