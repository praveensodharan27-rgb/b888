// Service Worker for Push Notifications
const CACHE_NAME = 'sellit-v1';
const urlsToCache = [
  '/logo.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cache each URL individually to handle errors gracefully
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => {
              console.warn(`Failed to cache ${url}:`, err);
              return null;
            })
          )
        );
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Push notification event - handles both VAPID and Firebase Cloud Messaging
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Sell Box',
    body: 'You have a new notification',
    icon: '/logo.png',
    badge: '/logo.png',
    image: null,
    data: {},
    actions: []
  };

  if (event.data) {
    try {
      const data = event.data.json();
      
      // Handle Firebase Cloud Messaging format
      if (data.notification) {
        notificationData = {
          title: data.notification.title || notificationData.title,
          body: data.notification.body || notificationData.body,
          icon: data.notification.icon || notificationData.icon,
          badge: data.notification.badge || notificationData.badge,
          image: data.notification.image || null,
          data: data.data || data.notification.data || notificationData.data,
          actions: data.notification.actions || []
        };
      } 
      // Handle standard VAPID format
      else {
        notificationData = {
          title: data.title || notificationData.title,
          body: data.body || data.message || notificationData.body,
          icon: data.icon || notificationData.icon,
          badge: data.badge || notificationData.badge,
          image: data.image || null,
          data: data.data || notificationData.data,
          actions: data.actions || []
        };
      }
    } catch (e) {
      // If JSON parsing fails, try text
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    data: notificationData.data,
    actions: notificationData.actions,
    requireInteraction: false,
    tag: notificationData.data?.type || notificationData.data?.tag || 'default',
    vibrate: [200, 100, 200],
    timestamp: Date.now()
  };

  // Add image if available
  if (notificationData.image) {
    notificationOptions.image = notificationData.image;
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle action clicks
self.addEventListener('notificationclick', (event) => {
  if (event.action === 'view') {
    const urlToOpen = event.notification.data?.url || '/';
    event.waitUntil(
      clients.openWindow(urlToOpen)
    );
  }
});

