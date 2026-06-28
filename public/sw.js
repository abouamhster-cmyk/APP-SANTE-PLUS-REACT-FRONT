// 📁 public/sw.js
// ✅ Service Worker pour PWA - Santé Plus Services

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
  // ✅ Ignorer les requêtes API
  if (event.request.url.includes('/api/')) {
    return;
  }

  // ✅ Ignorer les requêtes de statistiques
  if (event.request.url.includes('analytics') || event.request.url.includes('telemetry')) {
    return;
  }

  // ✅ Ignorer les requêtes vers les services externes
  if (event.request.url.includes('google') || event.request.url.includes('facebook') || event.request.url.includes('firebase')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // ✅ Mettre en cache les réponses réussies
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => {
              cache.put(event.request, responseClone);
            })
            .catch((error) => {
              console.warn('⚠️ Erreur mise en cache dynamique:', error);
            });
        }
        return response;
      })
      .catch(() => {
        // ✅ Fallback: retourner la version en cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // ✅ Si c'est une page HTML, retourner index.html
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/');
            }
            
            // ✅ Fallback pour les images
            if (event.request.url.match(/\.(png|jpg|jpeg|svg|gif|webp)$/)) {
              return caches.match('/icon-192.png');
            }
            
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// ============================================================
// NOTIFICATIONS PUSH
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

// ============================================================
// GESTION DES MESSAGES (pour communication avec l'app)
// ============================================================
self.addEventListener('message', (event) => {
  console.log('📨 Message reçu par le SW:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ============================================================
// LOG DE DÉMARRAGE
// ============================================================
console.log('✅ Service Worker Santé Plus Services chargé');
