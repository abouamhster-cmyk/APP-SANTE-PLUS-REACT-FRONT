// 📁 src/lib/firebase.ts

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { getAnalytics, isSupported as isAnalyticsSupported, Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyD9a_D_5nQCwUH9LJssDdyOFGCRHm8VvcU",
  authDomain: "sante-plus-services-react.firebaseapp.com",
  projectId: "sante-plus-services-react",
  storageBucket: "sante-plus-services-react.firebasestorage.app",
  messagingSenderId: "418910358878",
  appId: "1:418910358878:web:419cf684292515e17953cf",
  measurementId: "G-7WGYHF8R7M"
};

const VAPID_KEY = "BOpnRL7xQjAbTUpp54ICOabzXZNWHmLqLYAEA0uKubtvDrJNHteoxE7UGnLlPbvgCWPYlwcwQdPGRfShNBBi0Bc";

let app: FirebaseApp | undefined;
let messaging: Messaging | undefined;
let analytics: Analytics | undefined;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase initialisé');
  } else {
    app = getApp();
    console.log('✅ Firebase déjà initialisé');
  }

  if (typeof window !== 'undefined') {
    isAnalyticsSupported().then((supported) => {
      if (supported && app) {
        analytics = getAnalytics(app);
        console.log('✅ Firebase Analytics activé');
      }
    });
  }
} catch (error) {
  console.error('❌ Erreur initialisation Firebase:', error);
}

// ✅ Obtenir le token FCM avec le Service Worker existant
export const getFCMToken = async (): Promise<string | null> => {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn('⚠️ Firebase Messaging non supporté');
      return null;
    }

    if (!messaging && app) {
      messaging = getMessaging(app);
    }

    if (!messaging) {
      console.warn('⚠️ Messaging non initialisé');
      return null;
    }

    // ✅ Récupérer l'enregistrement du SW stocké dans window
    const swRegistration = (window as any).firebaseSWRegistration;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration, // ✅ Utiliser le SW existant
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

export const onFCMessage = (callback: (payload: any) => void) => {
  try {
    if (!messaging && app) {
      messaging = getMessaging(app);
    }
    if (messaging) {
      onMessage(messaging, callback);
      console.log('✅ Écoute FCM activée (foreground)');
    }
  } catch (error) {
    console.error('❌ Erreur onFCMessage:', error);
  }
};

export const getMessagingInstance = (): Messaging | undefined => {
  if (!messaging && app) {
    messaging = getMessaging(app);
  }
  return messaging;
};

export { app, messaging, analytics, VAPID_KEY };
