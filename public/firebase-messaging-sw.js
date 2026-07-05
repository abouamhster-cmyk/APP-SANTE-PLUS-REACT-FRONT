// 📁 public/firebase-messaging-sw.js

// ✅ Vérifier que les imports fonctionnent
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');
  console.log('✅ Firebase scripts chargés');
} catch (error) {
  console.error('❌ Erreur chargement Firebase scripts:', error);
}

// ✅ Initialiser Firebase
firebase.initializeApp({
  apiKey: "AIzaSyD9a_D_5nQCwUH9LJssDdyOFGCRHm8VvcU",
  authDomain: "sante-plus-services-react.firebaseapp.com",
  projectId: "sante-plus-services-react",
  storageBucket: "sante-plus-services-react.firebasestorage.app",
  messagingSenderId: "418910358878",
  appId: "1:418910358878:web:419cf684292515e17953cf",
  measurementId: "G-7WGYHF8R7M"
});

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
    tag: `notif_${Date.now()}`,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ✅ Gestion du clic sur la notification
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Clic sur notification:', event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/app';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
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
