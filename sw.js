const CACHE_NAME = 'cricket-game-v2';
const STATIC_CACHE = 'cricket-static-v2';
const DYNAMIC_CACHE = 'cricket-dynamic-v2';
const OFFLINE_CACHE = 'cricket-offline-v2';

const urlsToCache = [
  './',
  './index.html',
  './team.html',
  './match.html',
  './oversummary.html',
  './inning-over.html',
  './matchover.html',
  './match_summary.html',
  './index.js',
  './f.js',
  './script.js',
  './app.js',
  './end.js',
  './inning-over.js',
  './pwa-utils.js',
  './end.css',
  './inning-over.css',
  './manifest.json'
];


// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        return cache.addAll(urlsToCache.filter(url => url !== '/'))
          .catch(() => Promise.resolve());
      }),
      caches.open(OFFLINE_CACHE).then(cache => {
        return cache.addAll(['./index.html'])
          .catch(() => Promise.resolve());
      })
    ]).then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (![STATIC_CACHE, DYNAMIC_CACHE, OFFLINE_CACHE].includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Serve from cache, fallback to network, then offline page
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Strategy based on resource type
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico)$/i)) {
    // Images: Cache first, fallback to network
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) return response;
          return fetch(request)
            .then(response => {
              if (response.ok) {
                const cloned = response.clone();
                caches.open(DYNAMIC_CACHE).then(cache => {
                  cache.put(request, cloned);
                });
              }
              return response;
            })
            .catch(() => new Response('Image not available offline'));
        })
    );
  } else if (url.pathname.match(/\.(mp4|webm|avi)$/i)) {
    // Videos: Network first, fallback to cache
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(request, cloned);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then(response => response || new Response('Video not available offline'));
        })
    );
  } else {
    // HTML, CSS, JS: Stale-while-revalidate
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          const fetchPromise = fetch(request)
            .then(response => {
              if (response && response.status === 200) {
                const cloned = response.clone();
                caches.open(DYNAMIC_CACHE).then(cache => {
                  cache.put(request, cloned);
                });
              }
              return response;
            });

          return cachedResponse || fetchPromise;
        })
        .catch(() => {
          // Offline fallback
          if (request.mode === 'navigate') {
            return caches.match('./index.html')
              .then(response => response || new Response('You are offline'));
          }
          return new Response('Resource not available');
        })
    );
  }
});

// Background sync for recorded data
self.addEventListener('sync', event => {
  if (event.tag === 'sync-match-data') {
    event.waitUntil(
      // Sync match data to backend when online
      new Promise((resolve) => {
        // Queue data sync - implementation depends on your backend
        console.log('Syncing match data in background');
        
        // Notify clients that sync started
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SYNC_START',
              message: 'Started syncing match data'
            });
          });
        });

        // Simulate sync completion
        setTimeout(() => {
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'SYNC_COMPLETE',
                message: 'Match data synced successfully'
              });
            });
          });
          resolve();
        }, 2000);
      })
    );
  }
});

// Push notification handling
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Cricket match update',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%232563eb" width="100" height="100"/><text x="50%" y="50%" font-size="60" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">🏏</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%232563eb" width="100" height="100"/><text x="50%" y="50%" font-size="60" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">🏏</text></svg>',
    tag: 'cricket-update',
    requireInteraction: false,
    ...data
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Cricket Game', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (let i = 0; i < clientList.length; i++) {
        if (clientList[i].url.includes('index.html') && 'focus' in clientList[i]){
          return clientList[i].focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});
