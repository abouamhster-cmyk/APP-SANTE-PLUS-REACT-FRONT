// 📁 src/stores/notificationStore.ts

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Notification } from '@/types';
import { useAuthStore } from './authStore';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  subscription: any | null;
  notificationsEnabled: boolean;

  subscribe: () => void;
  unsubscribe: () => void;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  clearNotifications: () => void;
  toggleNotifications: () => void;
  setNotificationsEnabled: (enabled: boolean) => void;
}

// ✅ Fonction d'initialisation séparée (hors du store)
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
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  subscription: null,
  notificationsEnabled: initializeNotifications(),

  subscribe: () => {
    const { user } = useAuthStore.getState();

    if (!user) return;

    // ✅ Vérifier si les notifications sont activées
    const { notificationsEnabled } = get();

    if (!notificationsEnabled) return;

    // ✅ Nettoyer l'ancienne subscription pour éviter les doublons
    get().unsubscribe();

    const subscription = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          get().addNotification(payload.new as Notification);
        }
      )
      .subscribe();

    set({ subscription });
  },

  unsubscribe: () => {
    const { subscription } = get();

    if (subscription) {
      supabase.removeChannel(subscription);
      set({ subscription: null });
    }
  },

  fetchNotifications: async () => {
    try {
      set({ isLoading: true });

      const { user } = useAuthStore.getState();

      if (!user) {
        set({ isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const unread = data?.filter((n) => !n.is_read).length || 0;

      set({
        notifications: data || [],
        unreadCount: unread,
        isLoading: false,
      });
    } catch (error) {
      console.error('Fetch notifications error:', error);
      set({ isLoading: false });
    }
  },

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

      set((state) => {
        const target = state.notifications.find((n) => n.id === id);
        const wasUnread = target ? !target.is_read : false;

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
          unreadCount: wasUnread
            ? Math.max(0, state.unreadCount - 1)
            : state.unreadCount,
        };
      });
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  },

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

  addNotification: (notification) => {
    const { notificationsEnabled } = get();

    if (!notificationsEnabled) return;

    set((state) => {
      // ✅ Anti-doublon par id
      const alreadyExistsById = state.notifications.some(
        (n) => n.id === notification.id
      );

      if (alreadyExistsById) {
        return state;
      }

      // ✅ Anti-doublon souple si Firebase + Realtime envoient presque la même notif
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

      return {
        notifications: [notification, ...state.notifications].slice(0, 50),
        unreadCount: state.unreadCount + 1,
      };
    });
  },

  clearNotifications: () => {
    set({
      notifications: [],
      unreadCount: 0,
    });
  },

  toggleNotifications: () => {
    const { notificationsEnabled } = get();
    const newState = !notificationsEnabled;

    // ✅ Sauvegarder dans localStorage
    const savedPrefs = localStorage.getItem('sante_plus_preferences');

    try {
      const prefs = savedPrefs ? JSON.parse(savedPrefs) : {};
      prefs.notifications = newState;
      localStorage.setItem('sante_plus_preferences', JSON.stringify(prefs));
    } catch (e) {
      console.error('Erreur sauvegarde préférences:', e);
    }

    set({ notificationsEnabled: newState });

    // ✅ Si désactivé, se désabonner
    if (!newState) {
      get().unsubscribe();
    } else {
      get().subscribe();
    }
  },

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
    } else {
      get().subscribe();
    }
  },
}));