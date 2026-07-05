// 📁 src/hooks/useNotifications.ts

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';

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
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
          const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
          if (!VAPID_KEY) {
            console.warn('⚠️ VAPID_KEY manquant');
            return;
          }

          const newSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
          });

          await fetch('/api/notifications/register-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            },
            body: JSON.stringify({
              token: JSON.stringify(newSubscription),
              device_info: navigator.userAgent,
              user_id: user.id,
            }),
          });

          setIsSubscribed(true);
        } else {
          setIsSubscribed(true);
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
  }, [isAuthenticated, user, isSupported]);

  return {
    isSupported,
    isSubscribed,
    subscribe,
    unsubscribe,
  };
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
