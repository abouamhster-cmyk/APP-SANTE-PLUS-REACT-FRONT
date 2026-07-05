// 📁 src/stores/notificationStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Notification } from '@/types';
import { useAuthStore } from './authStore';
import { playNotificationSound, updateNotificationBadge } from '@/services/notificationService';

// =============================================
// HELPERS DE CACHE
// =============================================

const NOTIFICATIONS_CACHE_KEY = 'sante_plus_notifications_cache';
const CACHE_DURATION = 30000; // 30 secondes

const getCachedNotifications = (): { data: Notification[]; timestamp: number } | null => {
  try {
    const cached = localStorage.getItem(NOTIFICATIONS_CACHE_KEY);
    if (cached) return JSON.parse(cached);
    return null;
  } catch { return null; }
};

const setCachedNotifications = (notifications: Notification[]) => {
  try {
    localStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify({
      data: notifications,
      timestamp: Date.now(),
    }));
  } catch { /* ignore */ }
};

const clearCachedNotifications = () => {
  try {
    localStorage.removeItem(NOTIFICATIONS_CACHE_KEY);
    console.log('🗑️ Cache notifications invalidé');
  } catch { /* ignore */ }
};

// =============================================
// AFFICHER LA NOTIFICATION SYSTÈME
// =============================================

function showSystemNotification(notification: Notification) {
  // ✅ Vérifier la permission
  if (Notification.permission !== 'granted') {
    console.warn('⚠️ Permission notifications non accordée');
    return;
  }

  try {
    const title = notification.title || 'Santé Plus';
    const body = notification.body || 'Nouvelle notification';
    const icon = '/icon-192.png';

    const options: NotificationOptions = {
      body: body,
      icon: icon,
      badge: '/icon-72.png',
      vibrate: [200, 100, 200],
      tag: notification.id || `notif_${Date.now()}`,
      requireInteraction: true,
      silent: false,
      renotify: true,
      data: {
        url: '/app/notifications',
        notificationId: notification.id,
      },
      actions: [
        { action: 'open', title: '👀 Voir' },
        { action: 'dismiss', title: '❌ Fermer' },
      ],
    };

    const notif = new Notification(title, options);

    notif.onclick = () => {
      window.focus();
      window.location.href = '/app/notifications';
      notif.close();
    };

    notif.onnotificationclick = (event) => {
      if (event.action === 'open') {
        window.focus();
        window.location.href = '/app/notifications';
      }
      notif.close();
    };

    console.log('🔔 [System] Notification affichée !', notification.title);
  } catch (error) {
    console.error('❌ Erreur affichage notification système:', error);
  }
}

// =============================================
// STORE
// =============================================

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  subscription: any | null;
  notificationsEnabled: boolean;
  isInitialized: boolean;
  lastFetch: number | null;
  isCacheInvalidated: boolean;
  error: string | null;

  subscribe: () => void;
  unsubscribe: () => void;
  fetchNotifications: (force?: boolean) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  clearNotifications: () => void;
  toggleNotifications: () => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  getUnreadCount: () => number;

  invalidateCache: () => void;
  refresh: () => Promise<void>;
}

const initializeNotifications = () => {
  const saved = localStorage.getItem('sante_plus_preferences');
  if (saved) {
    try {
      const prefs = JSON.parse(saved);
      return prefs.notifications !== false;
    } catch (e) {
      console.error('Erreur chargement préférences notifications:', e);
      return true;
    }
  }
  return true;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({

  // ============================================================
  // ÉTAT INITIAL
  // ============================================================

  notifications: [],
  unreadCount: 0,
  isLoading: false,
  subscription: null,
  notificationsEnabled: initializeNotifications(),
  isInitialized: false,
  lastFetch: null,
  isCacheInvalidated: false,
  error: null,

  // ============================================================
  // INVALIDER LE CACHE
  // ============================================================

  invalidateCache: () => {
    clearCachedNotifications();
    set({
      isCacheInvalidated: true,
      isInitialized: false,
      lastFetch: null,
    });
    console.log('🔄 Cache notifications invalidé');
  },

  // ============================================================
  // RAFRAÎCHIR
  // ============================================================

  refresh: async () => {
    get().invalidateCache();
    await get().fetchNotifications(true);
  },

  // ============================================================
  // SOUSCRIRE AU CANAL REALTIME
  // ============================================================

  subscribe: () => {
    const { user } = useAuthStore.getState();
    const { notificationsEnabled } = get();

    if (!user) {
      console.log('ℹ️ [Realtime] Utilisateur non connecté');
      return;
    }

    if (!notificationsEnabled) {
      console.log('ℹ️ [Realtime] Notifications désactivées');
      return;
    }

    // ✅ Se désabonner de l'ancien canal
    get().unsubscribe();

    console.log(`📡 [Realtime] Création du canal pour l'utilisateur ${user.id}`);

    // ✅ Créer le canal avec les bonnes options
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('📨 [Realtime] NOUVELLE NOTIFICATION REÇUE !', payload);

          const notification = payload.new as Notification;

          // ✅ Vérifier que c'est bien pour l'utilisateur connecté
          if (notification.user_id === user.id) {
            // ✅ Ajouter au store
            get().addNotification(notification);

            // ✅ Jouer le son
            playNotificationSound();

            // ✅ Afficher la notification système
            showSystemNotification(notification);

            // ✅ Mettre à jour le badge
            const { unreadCount } = get();
            updateNotificationBadge(unreadCount);

            // ✅ Mettre à jour le titre de la page
            if (unreadCount > 0) {
              document.title = `(${unreadCount}) Santé Plus Services`;
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 [Realtime] Statut: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Realtime] Canal actif et prêt !');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('⚠️ [Realtime] Erreur canal, reconnexion dans 5s...');
          setTimeout(() => get().subscribe(), 5000);
        }
      });

    set({ subscription: channel });
    console.log('✅ [Realtime] Canal créé');
  },

  // ============================================================
  // SE DÉSABONNER DU CANAL REALTIME
  // ============================================================

  unsubscribe: () => {
    const { subscription } = get();
    if (subscription) {
      try {
        console.log('📡 [Realtime] Désabonnement...');
        supabase.removeChannel(subscription);
        set({ subscription: null });
        console.log('✅ [Realtime] Désabonné');
      } catch (error) {
        console.error('❌ [Realtime] Erreur désabonnement:', error);
      }
    }
  },

  // ============================================================
  // RÉCUPÉRER LES NOTIFICATIONS
  // ============================================================

  fetchNotifications: async (force = false) => {
    const state = get();

    if (state.isLoading) {
      console.log('ℹ️ Déjà en cours de chargement, skip...');
      return;
    }

    if (state.isCacheInvalidated) {
      force = true;
    }

    if (!force && state.lastFetch && (Date.now() - state.lastFetch < CACHE_DURATION)) {
      console.log('📦 Utilisation du cache mémoire notifications');
      return;
    }

    if (!force) {
      const cached = getCachedNotifications();
      if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        console.log('📦 Utilisation du cache localStorage notifications');
        const unread = cached.data.filter((n) => !n.is_read).length || 0;
        updateNotificationBadge(unread);
        set({
          notifications: cached.data,
          unreadCount: unread,
          isLoading: false,
          isInitialized: true,
          lastFetch: cached.timestamp,
          isCacheInvalidated: false,
          error: null,
        });
        return;
      }
    }

    try {
      set({ isLoading: true, error: null, isCacheInvalidated: false });

      const { user } = useAuthStore.getState();

      if (!user) {
        set({ notifications: [], unreadCount: 0, isLoading: false, isInitialized: true });
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const notifications = data || [];
      const unread = notifications.filter((n) => !n.is_read).length || 0;

      updateNotificationBadge(unread);
      setCachedNotifications(notifications);

      set({
        notifications,
        unreadCount: unread,
        isLoading: false,
        isInitialized: true,
        lastFetch: Date.now(),
        isCacheInvalidated: false,
        error: null,
      });
    } catch (error) {
      console.error('❌ Fetch notifications error:', error);

      const cached = getCachedNotifications();
      if (cached && cached.data.length > 0) {
        const unread = cached.data.filter((n) => !n.is_read).length || 0;
        updateNotificationBadge(unread);
        set({
          notifications: cached.data,
          unreadCount: unread,
          isLoading: false,
          isInitialized: true,
          lastFetch: cached.timestamp,
          isCacheInvalidated: false,
          error: error instanceof Error ? error.message : 'Erreur de chargement (cache utilisé)',
        });
      } else {
        set({
          isLoading: false,
          isInitialized: true,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        });
      }
    }
  },

  // ============================================================
  // MARQUER COMME LU
  // ============================================================

  markAsRead: async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      get().invalidateCache();
      await get().fetchNotifications(true);

      set((state) => {
        const target = state.notifications.find((n) => n.id === id);
        const wasUnread = target ? !target.is_read : false;
        const newUnreadCount = wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount;

        updateNotificationBadge(newUnreadCount);

        if (newUnreadCount > 0) {
          document.title = `(${newUnreadCount}) Santé Plus Services`;
        } else {
          document.title = 'Santé Plus Services';
        }

        return {
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
          ),
          unreadCount: newUnreadCount,
        };
      });
    } catch (error) {
      console.error('❌ Mark as read error:', error);
    }
  },

  // ============================================================
  // TOUT MARQUER COMME LU
  // ============================================================

  markAllRead: async () => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      get().invalidateCache();
      await get().fetchNotifications(true);

      updateNotificationBadge(0);
      document.title = 'Santé Plus Services';

      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          is_read: true,
          read_at: n.read_at || new Date().toISOString(),
        })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('❌ Mark all read error:', error);
    }
  },

  // ============================================================
  // AJOUTER UNE NOTIFICATION
  // ============================================================

  addNotification: (notification) => {
    const { notificationsEnabled } = get();

    if (!notificationsEnabled) {
      console.log('ℹ️ Notifications désactivées, ajout ignoré');
      return;
    }

    set((state) => {
      const alreadyExistsById = state.notifications.some((n) => n.id === notification.id);
      if (alreadyExistsById) {
        return state;
      }

      const newUnreadCount = state.unreadCount + 1;

      updateNotificationBadge(newUnreadCount);

      if (newUnreadCount > 0) {
        document.title = `(${newUnreadCount}) Santé Plus Services`;
      }

      return {
        notifications: [notification, ...state.notifications].slice(0, 50),
        unreadCount: newUnreadCount,
      };
    });
  },

  // ============================================================
  // VIDER LES NOTIFICATIONS
  // ============================================================

  clearNotifications: () => {
    get().invalidateCache();
    updateNotificationBadge(0);
    document.title = 'Santé Plus Services';
    set({
      notifications: [],
      unreadCount: 0,
    });
  },

  // ============================================================
  // ACTIVER/DÉSACTIVER LES NOTIFICATIONS
  // ============================================================

  toggleNotifications: () => {
    const { notificationsEnabled } = get();
    const newState = !notificationsEnabled;

    try {
      const savedPrefs = localStorage.getItem('sante_plus_preferences');
      const prefs = savedPrefs ? JSON.parse(savedPrefs) : {};
      prefs.notifications = newState;
      localStorage.setItem('sante_plus_preferences', JSON.stringify(prefs));
    } catch (e) {
      console.error('Erreur sauvegarde préférences:', e);
    }

    set({ notificationsEnabled: newState });

    if (!newState) {
      get().unsubscribe();
      updateNotificationBadge(0);
      document.title = 'Santé Plus Services';
    } else {
      get().subscribe();
    }
  },

  // ============================================================
  // DÉFINIR L'ÉTAT DES NOTIFICATIONS
  // ============================================================

  setNotificationsEnabled: (enabled: boolean) => {
    try {
      const savedPrefs = localStorage.getItem('sante_plus_preferences');
      const prefs = savedPrefs ? JSON.parse(savedPrefs) : {};
      prefs.notifications = enabled;
      localStorage.setItem('sante_plus_preferences', JSON.stringify(prefs));
    } catch (e) {
      console.error('Erreur sauvegarde préférences:', e);
    }

    set({ notificationsEnabled: enabled });

    if (!enabled) {
      get().unsubscribe();
      updateNotificationBadge(0);
      document.title = 'Santé Plus Services';
    } else {
      get().subscribe();
    }
  },

  // ============================================================
  // OBTENIR LE NOMBRE DE NOTIFICATIONS NON LUES
  // ============================================================

  getUnreadCount: () => {
    return get().unreadCount;
  },
}));
