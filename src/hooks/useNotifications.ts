import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { requestNotificationPermission } from '@/services/notificationService';

export const usePushNotifications = () => {
  const { isAuthenticated, user } = useAuthStore();
  const { subscribe, unsubscribe, fetchNotifications } = useNotificationStore();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user || !isSupported) return;

    const setupPush = async () => {
      try {
        const storedToken = localStorage.getItem('push_token');
        if (storedToken) {
          setIsSubscribed(true);
        } else {
          // Si la permission est déjà accordée, on récupère le token silencieusement
          if (Notification.permission === 'granted') {
            const token = await requestNotificationPermission(user.id);
            if (token) setIsSubscribed(true);
          }
        }
      } catch (error) {
        console.error('❌ Erreur setup push:', error);
      }
    };

    setupPush();
    subscribe();
    fetchNotifications();

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, user, isSupported, subscribe, unsubscribe, fetchNotifications]);  

  // Gère l'activation manuelle lors du clic utilisateur
  const handleSubscribe = async () => {
    if (!user) return;
    try {
      const token = await requestNotificationPermission(user.id);
      if (token) {
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error('❌ Erreur activation push:', error);
    }
    subscribe(); // Connexion au canal Realtime Supabase
  };

  return {
    isSupported,
    isSubscribed,
    subscribe: handleSubscribe,
    unsubscribe,
  };
};
