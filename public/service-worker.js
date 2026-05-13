const CACHE_NAME = 'evendle-v1';

// Install: skip waiting so the new SW activates immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push event: show notification
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'EVENDLE', body: event.data.text(), type: 'generic' };
  }

  const { title, body, type, data = {} } = payload;

  const options = buildNotificationOptions(type, body, data);

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

function buildNotificationOptions(type, body, data) {
  const base = {
    body,
    icon: '/app-icon.png',
    badge: '/app-icon.png',
    vibrate: [100, 50, 100],
    data,
    requireInteraction: false,
  };

  switch (type) {
    case 'new_event_nearby':
      return {
        ...base,
        tag: `event-nearby-${data.event_id}`,
        actions: [
          { action: 'view', title: 'Anzeigen' },
          { action: 'dismiss', title: 'Schließen' },
        ],
      };

    case 'new_blitz_nearby':
      return {
        ...base,
        tag: `blitz-nearby-${data.event_id}`,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        actions: [
          { action: 'view', title: 'Jetzt mitmachen' },
          { action: 'dismiss', title: 'Schließen' },
        ],
      };

    case 'new_dm':
      return {
        ...base,
        tag: `dm-${data.conversation_id}`,
        renotify: true,
        actions: [
          { action: 'reply', title: 'Antworten' },
          { action: 'view', title: 'Öffnen' },
        ],
      };

    case 'friend_joined_event':
      return {
        ...base,
        tag: `friend-joined-${data.event_id}-${data.friend_id}`,
        actions: [
          { action: 'view', title: 'Event anzeigen' },
          { action: 'dismiss', title: 'Schließen' },
        ],
      };

    case 'friend_request':
      return {
        ...base,
        tag: `friend-request-${data.from_user_id}`,
        requireInteraction: true,
        actions: [
          { action: 'accept', title: 'Annehmen' },
          { action: 'view', title: 'Profil anzeigen' },
        ],
      };

    default:
      return base;
  }
}

// Notification click: navigate to relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { type, event_id, conversation_id, from_user_id } = event.notification.data || {};
  const action = event.action;

  let url = '/';

  if (action === 'dismiss') return;

  switch (type) {
    case 'new_event_nearby':
    case 'new_blitz_nearby':
    case 'friend_joined_event':
      url = event_id ? `/events/${event_id}` : '/';
      break;
    case 'new_dm':
      url = conversation_id ? `/messages/${conversation_id}` : '/messages';
      break;
    case 'friend_request':
      url = from_user_id ? `/profile/${from_user_id}` : '/friends';
      break;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => {
        try { return new URL(c.url).origin === self.location.origin; } catch { return false; }
      });
      if (existing) {
        existing.focus();
        existing.navigate(url);
      } else {
        clients.openWindow(url);
      }
    })
  );
});

// Push subscription change (token rotation by browser)
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    fetch('/api/push-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'resubscribe',
        oldEndpoint: event.oldSubscription?.endpoint,
        subscription: event.newSubscription?.toJSON(),
      }),
    })
  );
});
