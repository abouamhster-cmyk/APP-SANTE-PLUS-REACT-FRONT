// 📁 public/firebase-messaging-sw.js

// ============================================================
// IMPORT DES SCRIPTS FIREBASE (CORRIGÉ)
// ============================================================
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

// ============================================================
// CONFIGURATION FIREBASE
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyBwHqXghYTsKsoi1ia52JNR-PRk3pNKYkg",
  authDomain: "sps-b49c0.firebaseapp.com",
  projectId: "sps-b49c0",
  storageBucket: "sps-b49c0.firebasestorage.app",
  messagingSenderId: "934163816472",
  appId: "1:934163816472:web:ff18fc408786c821c3e36d"
};

// ============================================================
// INITIALISATION FIREBASE
// ============================================================
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ============================================================
// GESTION DES MESSAGES EN ARRIÈRE-PLAN
// ============================================================
messaging.onBackgroundMessage((payload) => {
  console.log('📨 [SW] Message reçu en arrière-plan:', payload);

  const { notification, data } = payload;

  if (!notification) {
    console.warn('⚠️ [SW] Notification sans contenu');
    return;
  }

  const title = notification.title || 'Santé Plus';
  const body = notification.body || '';
  const icon = notification.icon || '/icon-192.png';

  const options = {
    body: body,
    icon: icon,
    badge: '/icon-72.png',
    vibrate: [200, 100, 200],
    data: data || {},
    tag: data?.tag || 'notification',
    requireInteraction: true,
    actions: [
      { action: 'open', title: '👀 Voir' },
      { action: 'dismiss', title: '❌ Fermer' }
    ]
  };

  self.registration.showNotification(title, options);
});

// ============================================================
// CLIC SUR LA NOTIFICATION
// ============================================================
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 [SW] Clic sur notification:', event);

  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification?.data?.url || '/app';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});

// ============================================================
// CLIC SUR LES ACTIONS (BOUTONS)
// ============================================================
self.addEventListener('notificationactionclick', (event) => {
  console.log('🔔 [SW] Action:', event.action);

  event.notification.close();

  if (event.action === 'open') {
    const urlToOpen = event.notification?.data?.url || '/app';
    event.waitUntil(clients.openWindow(urlToOpen));
  }
});

// ============================================================
// INSTALLATION + ACTIVATION (BONNE PRATIQUE)
// ============================================================
self.addEventListener('install', (event) => {
  console.log('⚙️ [SW] Install');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('⚙️ [SW] Activate');
  event.waitUntil(self.clients.claim());
});

// ============================================================
// READY
// ============================================================
console.log('✅ Firebase Messaging Service Worker chargé');
