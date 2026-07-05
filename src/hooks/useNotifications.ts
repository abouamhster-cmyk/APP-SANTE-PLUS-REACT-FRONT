import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getFCMToken, onFCMessage } from '@/lib/firebase';

export const usePushNotifications = () => {
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const init = async () => {
      try {
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
          console.warn('❌ Permission refusée');
          return;
        }

        const token = await getFCMToken();

        if (!token) return;

        await fetch('/api/notifications/register-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            user_id: user.id,
            device_info: navigator.userAgent,
          }),
        });

        console.log('✅ Token envoyé au backend');

        // Foreground messages
        onFCMessage((payload) => {
          console.log('📨 Message foreground:', payload);

          const { title, body } = payload.notification || {};

          if (title) {
            new Notification(title, {
              body,
              icon: '/icon-192.png',
            });
          }
        });

      } catch (error) {
        console.error('❌ Init notifications error:', error);
      }
    };

    init();
  }, [isAuthenticated, user]);

  return {
    isSupported: 'Notification' in window,
  };
};
