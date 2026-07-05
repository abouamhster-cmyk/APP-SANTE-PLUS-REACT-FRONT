// 📁 src/lib/firebase.ts

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';

// ✅ TES CLÉS FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyD9a_D_5nQCwUH9LJssDdyOFGCRHm8VvcU",
  authDomain: "sante-plus-services-react.firebaseapp.com",
  projectId: "sante-plus-services-react",
  storageBucket: "sante-plus-services-react.firebasestorage.app",
  messagingSenderId: "418910358878",
  appId: "1:418910358878:web:419cf684292515e17953cf",
  measurementId: "G-7WGYHF8R7M"
};

// ✅ Initialiser Firebase (une seule fois)
let app;
let messaging;
let analytics;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase initialisé');
  } else {
    app = getApp();
    console.log('✅ Firebase déjà initialisé');
  }

  // ✅ Analytics (optionnel - seulement en production)
  if (typeof window !== 'undefined') {
    isAnalyticsSupported().then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
        console.log('✅ Firebase Analytics activé');
      }
    });
  }
} catch (error) {
  console.error('❌ Erreur initialisation Firebase:', error);
}

// ✅ Obtenir le token FCM pour les notifications push
export const getFCMToken = async (): Promise<string | null> => {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn('⚠️ Firebase Messaging non supporté sur ce navigateur');
      return null;
    }

    if (!messaging) {
      messaging = getMessaging(app);
    }

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    if (token) {
      console.log('✅ FCM Token obtenu:', token.substring(0, 30) + '...');
      return token;
    } else {
      console.warn('⚠️ Aucun token FCM');
      return null;
    }
  } catch (error) {
    console.error('❌ Erreur getFCMToken:', error);
    return null;
  }
};

// ✅ Écouter les messages en foreground
export const onFCMessage = (callback: (payload: any) => void) => {
  try {
    if (!messaging) {
      messaging = getMessaging(app);
    }
    onMessage(messaging, callback);
    console.log('✅ Écoute FCM activée (foreground)');
  } catch (error) {
    console.error('❌ Erreur onFCMessage:', error);
  }
};

// ✅ Récupérer l'instance de messaging
export const getMessagingInstance = () => {
  if (!messaging) {
    messaging = getMessaging(app);
  }
  return messaging;
};

export { app, messaging, analytics };
