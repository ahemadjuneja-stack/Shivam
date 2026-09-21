// SHIVAM Showroom PWA Service Worker (v3)
const CACHE_NAME = 'shivam-cache-v3';
const IMAGE_CACHE_NAME = 'shivam-images-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

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

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // 1) IMAGE STRATEGY — checked BEFORE API bypass
  const isImage =
    event.request.destination === 'image' ||
    requestUrl.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/i) ||
    requestUrl.host.includes('images.unsplash.com') ||
    requestUrl.host.includes('firebasestorage.googleapis.com');

  if (isImage && event.request.method === 'GET') {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            fetch(event.request).then((networkResponse) => {
              if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                cache.put(event.request, networkResponse);
              }
            }).catch(() => {});
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => new Response('', { status: 404 }));
        });
      })
    );
    return;
  }

  // 2) STRICT BYPASS: Firestore, Firebase APIs, Google APIs (AFTER image check)
  if (
    event.request.method !== 'GET' ||
    requestUrl.protocol.startsWith('ws') ||
    requestUrl.origin.includes('firestore.googleapis.com') ||
    requestUrl.origin.includes('firebaseinstallations.googleapis.com') ||
    requestUrl.origin.includes('firebaselogging.googleapis.com') ||
    requestUrl.origin.includes('identitytoolkit.googleapis.com') ||
    requestUrl.origin.includes('securetoken.googleapis.com') ||
    requestUrl.origin.includes('firebaseio.com') ||
    requestUrl.origin.includes('googleapis.com') ||
    requestUrl.origin.includes('google.com') ||
    requestUrl.pathname.startsWith('/api')
  ) {
    return;
  }

  // 3) Default: Network-First with cache fallback
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
      .catch(() => caches.match(event.request))
  );
});
