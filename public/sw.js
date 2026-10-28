// Offline app shell + notification click handling.
const CACHE = 'thithi-v3';
// The app may be served from a sub-folder (GitHub Pages: /sanathani/); paths are relative to it.
const BASE = new URL(self.registration.scope).pathname;
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Song recordings stream with Range requests (206 partial responses, which cannot be cached);
  // let the browser handle them directly.
  if (url.pathname.startsWith(BASE + 'audio/') || e.request.headers.has('range')) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match(BASE)))
  );
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((list) => {
    const target = BASE + '#events/' + (e.notification.data?.eventId ?? '');
    for (const c of list) { if ('focus' in c) { c.navigate(target); return c.focus(); } }
    return self.clients.openWindow(target);
  }));
});
