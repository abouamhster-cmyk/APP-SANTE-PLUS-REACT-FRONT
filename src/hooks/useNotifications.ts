// 📁 src/hooks/useNotifications.ts

import { useEffect, useState, useCallback } from 'react';
import { initializeFirebase, requestNotificationPermission } from '@/services/notificationService';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';

interface UseNotificationsReturn {
  isEnabled: boolean;
  permission: NotificationPermission;
  isSupported: boolean;
  requestPermission: () => Promise<string | null>;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const { isAuthenticated, user } = useAuthStore();
  const { notificationsEnabled, toggleNotifications } = useNotificationStore();
  
  const [isEnabled, setIsEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  // ✅ Vérifier le support des notifications
  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      setIsEnabled(Notification.permission === 'granted' && notificationsEnabled);
    }
  }, [notificationsEnabled]);

  // ✅ Initialiser Firebase et les notifications
  useEffect(() => {
    if (!isAuthenticated || !user || !isSupported) return;

    // ✅ Initialiser Firebase
    initializeFirebase();

    // ✅ Vérifier si le token est déjà enregistré
    const storedToken = localStorage.getItem('fcm_token');
    if (storedToken && Notification.permission === 'granted') {
      setIsEnabled(true);
    }
  }, [isAuthenticated, user, isSupported]);

  // ✅ Demander la permission
  const requestPermission = useCallback(async (): Promise<string | null> => {
    if (!isAuthenticated || !user) {
      console.warn('⚠️ Utilisateur non connecté');
      return null;
    }

    if (!isSupported) {
      console.warn('⚠️ Notifications non supportées');
      return null;
    }

    try {
      const token = await requestNotificationPermission(user.id);
      if (token) {
        setIsEnabled(true);
        setPermission('granted');
        // ✅ Activer les notifications dans le store
        if (!notificationsEnabled) {
          toggleNotifications();
        }
      }
      return token;
    } catch (error) {
      console.error('❌ Erreur demande permission:', error);
      return null;
    }
  }, [isAuthenticated, user, isSupported, notificationsEnabled, toggleNotifications]);

  // ✅ Activer les notifications
  const enable = useCallback(async () => {
    if (!notificationsEnabled) {
      toggleNotifications();
    }
    await requestPermission();
  }, [notificationsEnabled, toggleNotifications, requestPermission]);

  // ✅ Désactiver les notifications
  const disable = useCallback(async () => {
    if (notificationsEnabled) {
      toggleNotifications();
    }
    setIsEnabled(false);
  }, [notificationsEnabled, toggleNotifications]);

  return {
    isEnabled,
    permission,
    isSupported,
    requestPermission,
    enable,
    disable,
  };
};
