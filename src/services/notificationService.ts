// 📁 src/services/notificationService.ts

import { supabase } from '@/lib/supabase';
import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { NotificationType } from '@/types';
import toast from 'react-hot-toast';

// ✅ Configuration Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let messaging: any = null;
let firebaseApp: any = null;
let isFirebaseInitialized = false;

// ✅ URL UNIQUE
const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

// ✅ Initialisation Firebase - CORRIGÉE
export const initializeFirebase = () => {
  try {
    if (isFirebaseInitialized) {
      console.log('ℹ️ Firebase déjà initialisé');
      return messaging;
    }

    if (getApps().length > 0) {
      firebaseApp = getApp();
    } else {
      firebaseApp = initializeApp(firebaseConfig);
    }

    messaging = getMessaging(firebaseApp);
    isFirebaseInitialized = true;

    console.log('✅ Firebase initialisé avec succès');

    // ✅ ÉCOUTER LES MESSAGES EN PREMIER PLAN
    onMessage(messaging, (payload) => {
      console.log('📨 Message reçu en premier plan:', payload);

      const { notification, data } = payload;

      if (!notification) {
        console.warn('⚠️ Notification sans contenu');
        return;
      }

      const userId = useAuthStore.getState().user?.id;
      
      // ✅ Vérifier que la notification est pour l'utilisateur connecté
      if (data?.user_id && data.user_id !== userId) {
        console.log('ℹ️ Notification pour un autre utilisateur, ignorée');
        return;
      }

      const newNotification = {
        id: data?.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        user_id: userId || '',
        title: notification.title || 'Notification',
        body: notification.body || '',
        type: (data?.type as NotificationType) || 'system',
        data: data || {},
        image_url: notification.image || null,
        is_read: false,
        read_at: null,
        is_sent: true,
        sent_at: new Date().toISOString(),
        is_delivered: true,
        delivered_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      // ✅ Ajouter la notification au store
      useNotificationStore.getState().addNotification(newNotification);

      // ✅ Afficher le toast avec le bon style
      const title = notification.title || 'Notification';
      const body = notification.body || '';

      // ✅ Toast personnalisé avec icône
      toast.success(
        <div className="flex flex-col">
          <span className="font-bold text-sm">{title}</span>
          <span className="text-xs opacity-90">{body}</span>
        </div>,
        {
          duration: 5000,
          icon: '📨',
          position: 'top-center',
          style: {
            minWidth: '280px',
            maxWidth: '420px',
          },
        }
      );

      // ✅ Jouer un son de notification si disponible
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
      } catch (e) {
        // Ignorer si le son n'est pas disponible
      }
    });

    return messaging;
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    return null;
  }
};

// ✅ Demander la permission et enregistrer le token - CORRIGÉ
export const requestNotificationPermission = async (userId: string) => {
  try {
    if (!messaging) {
      initializeFirebase();
    }

    // ✅ Vérifier si déjà enregistré
    const storedToken = localStorage.getItem('fcm_token');
    if (storedToken) {
      console.log('ℹ️ Token FCM déjà enregistré');
      return storedToken;
    }

    // ✅ Demander la permission
    const permission = await Notification.requestPermission();
    console.log('📢 Permission notification:', permission);

    if (permission !== 'granted') {
      console.warn('❌ Permission notifications refusée');
      return null;
    }

    // ✅ Générer le token
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    if (!token) {
      console.warn('❌ Aucun token FCM généré');
      return null;
    }

    console.log('✅ Token FCM généré:', token.substring(0, 20) + '...');

    // ✅ Enregistrer le token sur le backend
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      console.warn('❌ Pas de token d\'authentification');
      return null;
    }

    const response = await fetch(`${API_URL}/notifications/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        token,
        device_info: navigator.userAgent,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Erreur enregistrement token:', error);
      throw new Error(error.error || "Erreur lors de l'enregistrement du token");
    }

    // ✅ Sauvegarder le token en local
    localStorage.setItem('fcm_token', token);
    console.log('✅ Token FCM enregistré avec succès');

    return token;
  } catch (error) {
    console.error('❌ Erreur permission notifications:', error);
    return null;
  }
};

// ✅ Supprimer le token (déconnexion)
export const removePushToken = async (token?: string) => {
  try {
    const { user } = useAuthStore.getState();
    if (!user) return;

    if (messaging) {
      try {
        await deleteToken(messaging);
      } catch (e) {
        console.warn('⚠️ Erreur suppression token Firebase:', e);
      }
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (accessToken) {
      await fetch(`${API_URL}/notifications/remove-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          token: token || 'all',
          user_id: user.id,
        }),
      });
    }

    localStorage.removeItem('fcm_token');
    console.log('✅ Token FCM supprimé');
  } catch (error) {
    console.error('❌ Erreur suppression token:', error);
  }
};
