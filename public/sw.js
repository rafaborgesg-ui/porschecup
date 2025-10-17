// Service Worker para PWA
const CACHE_NAME = 'porsche-cup-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles/globals.css',
  '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network first, falling back to cache
self.addEventListener('fetch', (event) => {
  // Apenas processa requisições GET para o cache (HEAD/POST/etc. não são suportadas pelo Cache API)
  if (event.request.method !== 'GET') {
    return; // deixa o navegador lidar normalmente
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Somente cacheia respostas 200 OK de requisições GET
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            })
            .catch(() => {});
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Push notification support
self.addEventListener('push', (event) => {
  const options = {
    body: event.data.text(),
  icon: '/PorscheCupiconeAPP.png',
  badge: '/PorscheCupiconeAPP.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('Porsche Cup Brasil', options)
  );
});

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tires') {
    event.waitUntil(syncTireData());
  }
});

async function syncTireData() {
  try {
    // Sincroniza dados pendentes quando a conexão for restabelecida
    console.log('Sincronizando dados de pneus...');
    // A lógica de sincronização será tratada pelo useSupabaseSync
    return Promise.resolve();
  } catch (error) {
    console.error('Erro ao sincronizar:', error);
    return Promise.reject(error);
  }
}
