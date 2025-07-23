// Bu Service Worker, anlık push bildirimlerini dinler ve gösterir.

self.addEventListener('push', function(event) {
  const data = event.data.json();
  
  const title = data.title || 'AI Keşif Platformu';
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: {
      url: data.url // Bildirime tıklandığında gidilecek link
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.openWindow(urlToOpen)
  );
});
