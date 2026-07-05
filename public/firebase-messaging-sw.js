// 📁 public/firebase-messaging-sw.js

// ✅ Service Worker pour les notifications FCM
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

 const firebaseConfig = {
  apiKey: "AIzaSyBwHqXghYTsKsoi1ia52JNR-PRk3pNKYkg",
  authDomain: "sps-b49c0.firebaseapp.com",
  projectId: "sps-b49c0",
  storageBucket: "sps-b49c0.firebasestorage.app",
  messagingSenderId: "934163816472",
  appId: "1:934163816472:web:ff18fc408786c821c3e36d",
};

// ✅ Initialiser Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ============================================================
// GESTION DES MESSAGES EN ARRIÈRE-PLAN
// ============================================================

messaging.onBackgroundMessage((payload) => {
  console.log('📨 Message reçu en arrière-plan:', payload);

  const { notification, data } = payload;

  if (!notification) {
    console.warn('⚠️ Notification sans contenu');
    return;
  }

  const title = notification.title || 'Santé Plus';
  const body = notification.body || '';
  const icon = notification.icon || '/icon-192.png';
  const badge = '/icon-72.png';

  // ✅ Options de notification
  const options = {
    body: body,
    icon: icon,
    badge: badge,
    vibrate: [200, 100, 200],
    data: data || {},
    tag: data?.tag || 'notification',
    requireInteraction: true,
    actions: [
      { action: 'open', title: '👀 Voir' },
      { action: 'dismiss', title: '❌ Fermer' },
    ],
  };

  // ✅ Afficher la notification
  self.registration.showNotification(title, options);
});

// ============================================================
// GESTION DU CLIC SUR NOTIFICATION
// ============================================================

self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Clic sur notification:', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // ✅ URL à ouvrir
  const urlToOpen = event.notification?.data?.url || '/app';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    })
    .then((clientList) => {
      // ✅ Si une fenêtre est déjà ouverte, la focaliser
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
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

// ============================================================
// GESTION DU CLIC SUR ACTION
// ============================================================

self.addEventListener('notificationactionclick', (event) => {
  console.log('🔔 Action sur notification:', event.action);

  event.notification.close();

  if (event.action === 'open') {
    const urlToOpen = event.notification?.data?.url || '/app';
    event.waitUntil(
      clients.openWindow(urlToOpen)
    );
  }
});

console.log('✅ Firebase Messaging Service Worker chargé');
