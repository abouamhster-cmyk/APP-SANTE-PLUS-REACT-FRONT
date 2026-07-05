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

// ✅ Attendre que le SW soit prêt ET pleinement actif (Évite l'erreur 'no active Service Worker')
const waitForServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;

  try {
    // 1️⃣ On attend que l'API native confirme que le Service Worker est prêt
    const reg = await navigator.serviceWorker.ready;

    // 2️⃣ Double sécurité : si pour une raison quelconque reg.active est temporairement null,
    // on attend par petits paliers que l'activation soit complétée par le navigateur
    let attempts = 0;
    while (!reg.active && attempts < 15) {
      console.log(`⏳ Attente de l'activation du Service Worker (Tentative ${attempts + 1})...`);
      await new Promise(resolve => setTimeout(resolve, 200));
      attempts++;
    }

    if (!reg.active) {
      console.warn("⚠️ Le Service Worker est prêt mais n'a pas pu être activé à temps.");
    } else {
      console.log('📡 Service Worker actif et prêt pour Firebase :', reg);
    }

    return reg;
  } catch (error) {
    console.error('❌ Erreur attente SW:', error);
    return null;
  }
};

// ✅ Obtenir le token FCM
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

    const swRegistration = await waitForServiceWorker();
    if (!swRegistration) {
      console.warn('⚠️ Aucun Service Worker disponible');
      return null;
    }

    console.log('📡 SW Registration pour getToken:', swRegistration);

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
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
