// Firebase Messaging Background Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBgsDf1VyV8yWoJBiKsp5zKO6IhGUYkpKI",
  authDomain: "shivam-2bace.firebaseapp.com",
  projectId: "shivam-2bace",
  storageBucket: "shivam-2bace.firebasestorage.app",
  messagingSenderId: "998857606826",
  appId: "1:998857606826:web:b294810014f9b4b60172d3"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message payload: ', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || '🚨 New Order Alert!';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'New wholesale order received. Tap to open workspace.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    vibrate: [200, 100, 200],
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Focus or open the app when the notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return self.clients.openWindow('/');
    })
  );
});
