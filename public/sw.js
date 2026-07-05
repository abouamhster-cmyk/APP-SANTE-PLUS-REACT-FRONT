// 📁 public/sw.js
// ✅ Service Worker UNIFIÉ - PWA + Firebase Messaging

const CACHE_NAME = 'sante-plus-v1';
const DYNAMIC_CACHE = 'sante-plus-dynamic-v1';

// ✅ Fichiers à mettre en cache à l'installation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/icon-72.png',
  '/icon-96.png',
  '/icon-128.png',
  '/icon-144.png',
  '/icon-152.png',
  '/icon-192.png',
  '/icon-256.png',
  '/icon-512.png',
  '/icon-1024.png',
  '/icon-16.png',
  '/icon-20.png',
  '/icon-29.png',
  '/icon-32.png',
  '/icon-40.png',
  '/icon-50.png',
  '/icon-57.png',
  '/icon-58.png',
  '/icon-60.png',
  '/icon-64.png',
  '/icon-76.png',
  '/icon-80.png',
  '/icon-87.png',
  '/icon-100.png',
  '/icon-114.png',
  '/icon-120.png',
  '/icon-167.png',
  '/icon-180.png',
  '/icon-source.png',
];

// ============================================================
// INSTALLATION
// ============================================================
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker - Installation...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cache ouvert, ajout des fichiers statiques...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker installé');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Erreur installation:', error);
      })
  );
});

// ============================================================
// ACTIVATION
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker - Activation...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== DYNAMIC_CACHE)
            .map((name) => {
              console.log(`🗑️ Suppression de l'ancien cache: ${name}`);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activé');
        return self.clients.claim();
      })
  );
});

// ============================================================
// STRATÉGIE DE CACHE - NETWORK FIRST AVEC FALLBACK
// ============================================================
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) return;
  if (event.request.url.includes('analytics') || event.request.url.includes('telemetry')) return;
  if (event.request.url.includes('google') || event.request.url.includes('facebook')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/');
            }
            if (event.request.url.match(/\.(png|jpg|jpeg|svg|gif|webp)$/)) {
              return caches.match('/icon-192.png');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// ============================================================
// ✅ FIREBASE MESSAGING INTÉGRÉ (CORRIGÉ)
// ============================================================
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

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

  // ✅ Gestion des messages en arrière-plan (AVEC AFFICHAGE FORCÉ)
  messaging.onBackgroundMessage((payload) => {
    console.log('📨 Message Firebase en arrière-plan:', payload);

    const notificationTitle = payload.notification?.title || 'Santé Plus Services';
    const notificationBody = payload.notification?.body || 'Vous avez une nouvelle notification';
    const notificationIcon = '/icon-192.png';
    const notificationBadge = '/icon-72.png';

    // ✅ FORCER l'affichage de la notification
    const notificationOptions = {
      body: notificationBody,
      icon: notificationIcon,
      badge: notificationBadge,
      vibrate: [200, 100, 200],
      data: payload.data || {},
      requireInteraction: true,
      tag: `notif_${Date.now()}`,
      renotify: true,
      silent: false,
      actions: [
        { action: 'open', title: '👀 Voir' },
        { action: 'dismiss', title: '❌ Fermer' },
      ],
    };

    // ✅ Afficher immédiatement la notification
    self.registration.showNotification(notificationTitle, notificationOptions);

    // ✅ Essayer de jouer un son via le SW
    try {
      self.registration.active?.postMessage({
        type: 'PLAY_SOUND',
        sound: '/notification.mp3'
      });
    } catch (e) {
      console.warn('⚠️ Son non joué par le SW');
    }
  });

  console.log('✅ Firebase Messaging intégré au SW');

} catch (error) {
  console.error('❌ Erreur intégration Firebase dans SW:', error);
}

// ============================================================
// NOTIFICATIONS PUSH (WEB PUSH NATIF) - AVEC AFFICHAGE FORCÉ
// ============================================================
self.addEventListener('push', (event) => {
  console.log('📨 Notification push reçue:', event);
  
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch (error) {
    console.warn('⚠️ Erreur parsing notification:', error);
  }

  const title = data.title || 'Santé Plus Services';
  const body = data.body || 'Vous avez une nouvelle notification';
  const icon = data.icon || '/icon-192.png';
  const badge = data.badge || '/icon-72.png';
  const tag = data.tag || 'notification';
  const url = data.url || '/app';

  // ✅ FORCER l'affichage de la notification
  const options = {
    body: body,
    icon: icon,
    badge: badge,
    tag: tag,
    vibrate: [200, 100, 200],
    data: {
      url: url,
      ...data.data,
    },
    actions: [
      { action: 'open', title: '👀 Voir' },
      { action: 'dismiss', title: '❌ Fermer' },
    ],
    requireInteraction: true,
    renotify: true,
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
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

  const urlToOpen = event.notification.data?.url || '/app';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    })
    .then((clientList) => {
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

// ============================================================
// GESTION DES MESSAGES DU SW (POUR LE SON)
// ============================================================
self.addEventListener('message', (event) => {
  console.log('📨 Message reçu par le SW:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // ✅ Jouer un son depuis le SW
  if (event.data && event.data.type === 'PLAY_SOUND') {
    try {
      const audio = new Audio(event.data.sound || '/notification.mp3');
      audio.volume = 0.7;
      audio.play().catch(() => {});
    } catch (e) {
      // Ignorer
    }
  }
});

console.log('✅ Service Worker Santé Plus Services chargé');
