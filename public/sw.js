// SHIVAM Showroom PWA Service Worker
const CACHE_NAME = 'shivam-cache-v2';
const IMAGE_CACHE_NAME = 'shivam-images-v2';

// Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== IMAGE_CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event with custom caching strategies
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip non-GET requests or firebase system endpoints
  if (
    event.request.method !== 'GET' || 
    requestUrl.origin.includes('firestore.googleapis.com') ||
    requestUrl.origin.includes('firebaseinstallations.googleapis.com') ||
    requestUrl.origin.includes('firebaselogging.googleapis.com') ||
    requestUrl.origin.includes('identitytoolkit.googleapis.com')
  ) {
    return;
  }

  // 1. Image Cache Strategy: Cache-First (Stale-While-Revalidate)
  const isImage = 
    event.request.destination === 'image' ||
    requestUrl.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/i) ||
    requestUrl.host.includes('unsplash.com') ||
    requestUrl.host.includes('images.unsplash.com') ||
    requestUrl.host.includes('firebasestorage.googleapis.com');

  if (isImage) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached response instantly and update cache in background
            fetch(event.request).then((networkResponse) => {
              if (networkResponse.status === 200) {
                cache.put(event.request, networkResponse);
              }
            }).catch(() => {});
            return cachedResponse;
          }

          // Not in cache: fetch from network, cache it, and return
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            return new Response('', { status: 404 });
          });
        });
      })
    );
    return;
  }

  // 2. Default Strategy: Network-First with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
