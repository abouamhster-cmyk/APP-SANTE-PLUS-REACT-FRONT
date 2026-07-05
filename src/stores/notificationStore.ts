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
const CACHE_DURATION = 30000; // 30 secondes pour les notifications (plus court)

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
  
  // ✅ GESTION DU CACHE
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
    const { user, profile } = useAuthStore.getState();

    if (!user) return;

    const { notificationsEnabled } = get();

    if (!notificationsEnabled) return;

    get().unsubscribe();

    let filter = `user_id=eq.${user.id}`;

    const subscription = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: filter,
        },
        (payload) => {
          const notification = payload.new as Notification;
          
          if (notification.user_id === user.id) {
            console.log('📨 Nouvelle notification en temps réel:', notification);
            
            // ✅ Jouer le son
            playNotificationSound();
            
            // ✅ Ajouter la notification au store
            get().addNotification(notification);
            
            // ✅ Mettre à jour le badge
            const { unreadCount } = get();
            updateNotificationBadge(unreadCount);
          }
        }
      )
      .subscribe();

    set({ subscription });
    console.log('📡 Canal Realtime notifications activé');
  },

  // ============================================================
  // SE DÉSABONNER DU CANAL REALTIME
  // ============================================================
  unsubscribe: () => {
    const { subscription } = get();

    if (subscription) {
      supabase.removeChannel(subscription);
      set({ subscription: null });
      console.log('📡 Canal Realtime notifications désactivé');
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
        
        // ✅ Mettre à jour le badge
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
        set({ notifications: [], unreadCount: 0, isLoading: false, isInitialized: true, error: null });
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

      // ✅ Mettre à jour le badge
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
      console.error('Fetch notifications error:', error);
      
      const cached = getCachedNotifications();
      if (cached && cached.data.length > 0) {
        const unread = cached.data.filter((n) => !n.is_read).length || 0;
        
        // ✅ Mettre à jour le badge avec le cache
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

        const newUnreadCount = wasUnread
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount;

        // ✅ Mettre à jour le badge
        updateNotificationBadge(newUnreadCount);

        return {
          notifications: state.notifications.map((n) =>
            n.id === id
              ? {
                  ...n,
                  is_read: true,
                  read_at: new Date().toISOString(),
                }
              : n
          ),
          unreadCount: newUnreadCount,
        };
      });
    } catch (error) {
      console.error('Mark as read error:', error);
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

      // ✅ Mettre à jour le badge
      updateNotificationBadge(0);

      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          is_read: true,
          read_at: n.read_at || new Date().toISOString(),
        })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Mark all read error:', error);
    }
  },

  // ============================================================
  // AJOUTER UNE NOTIFICATION
  // ============================================================
  addNotification: (notification) => {
    const { notificationsEnabled } = get();

    if (!notificationsEnabled) return;

    set((state) => {
      const alreadyExistsById = state.notifications.some(
        (n) => n.id === notification.id
      );

      if (alreadyExistsById) {
        return state;
      }

      const alreadyExistsByContent = state.notifications.some((n) => {
        const sameTitle = n.title === notification.title;
        const sameBody = n.body === notification.body;
        const sameType = n.type === notification.type;

        const nTime = new Date(n.created_at).getTime();
        const notifTime = new Date(notification.created_at).getTime();

        const closeInTime =
          Number.isFinite(nTime) &&
          Number.isFinite(notifTime) &&
          Math.abs(nTime - notifTime) < 3000;

        return sameTitle && sameBody && sameType && closeInTime;
      });

      if (alreadyExistsByContent) {
        return state;
      }

      const newUnreadCount = state.unreadCount + 1;
      
      // ✅ Mettre à jour le badge
      updateNotificationBadge(newUnreadCount);

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
    
    // ✅ Réinitialiser le badge
    updateNotificationBadge(0);
    
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

    const savedPrefs = localStorage.getItem('sante_plus_preferences');

    try {
      const prefs = savedPrefs ? JSON.parse(savedPrefs) : {};
      prefs.notifications = newState;
      localStorage.setItem('sante_plus_preferences', JSON.stringify(prefs));
    } catch (e) {
      console.error('Erreur sauvegarde préférences:', e);
    }

    set({ notificationsEnabled: newState });

    if (!newState) {
      get().unsubscribe();
      // ✅ Réinitialiser le badge
      updateNotificationBadge(0);
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
      // ✅ Réinitialiser le badge
      updateNotificationBadge(0);
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
