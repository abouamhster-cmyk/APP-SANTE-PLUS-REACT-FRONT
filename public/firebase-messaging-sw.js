// 📁 public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

// ✅ TES CLÉS FIREBASE
firebase.initializeApp({
  apiKey: "AIzaSyD9a_D_5nQCwUH9LJssDdyOFGCRHm8VvcU",
  authDomain: "sante-plus-services-react.firebaseapp.com",
  projectId: "sante-plus-services-react",
  storageBucket: "sante-plus-services-react.firebasestorage.app",
  messagingSenderId: "418910358878",
  appId: "1:418910358878:web:419cf684292515e17953cf",
  measurementId: "G-7WGYHF8R7M"
});

// ✅ TA CLÉ VAPID (pour le SW)
const VAPID_KEY = "BOpnRL7xQjAbTUpp54ICOabzXZNWHmLqLYAEA0uKubtvDrJNHteoxE7UGnLlPbvgCWPYlwcwQdPGRfShNBBi0Bc";

const messaging = firebase.messaging();

// ✅ Gestion des notifications en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('📨 Message en arrière-plan reçu:', payload);

  const notificationTitle = payload.notification?.title || 'Santé Plus Services';
  const notificationBody = payload.notification?.body || 'Vous avez une nouvelle notification';
  const notificationIcon = '/icon-192.png';

  const notificationOptions = {
    body: notificationBody,
    icon: notificationIcon,
    badge: '/icon-72.png',
    vibrate: [200, 100, 200],
    data: payload.data || {},
    requireInteraction: true,
    actions: [
      { action: 'open', title: '👀 Voir' },
      { action: 'dismiss', title: '❌ Fermer' },
    ],
    tag: `notif_${Date.now()}`,
  };

  // ✅ Afficher la notification
  self.registration.showNotification(notificationTitle, notificationOptions);

  // ✅ Jouer un son (si disponible)
  try {
    self.registration.active?.postMessage({
      type: 'PLAY_SOUND',
    });
  } catch (e) {
    // Ignorer
  }
});

// ✅ Gestion du clic sur la notification
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Clic sur notification:', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/app';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // ✅ Si une fenêtre est déjà ouverte, la focaliser
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // ✅ Sinon, ouvrir une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ✅ Gestion des messages du service worker
self.addEventListener('message', (event) => {
  console.log('📨 Message reçu par SW:', event.data);
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('✅ Firebase Messaging Service Worker chargé');
