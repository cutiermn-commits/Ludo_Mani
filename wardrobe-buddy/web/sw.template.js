// Wardrobe Buddy service worker: makes the app open offline.
// Caches ONLY this app's own files (same origin, under the base path). It never touches
// other hosts (the weather service is not cached here; the app keeps its own 1-hour cache),
// and it stores no personal data: profile, clothes and photos live in the app's storage.
const CACHE = 'wb-__VERSION__';
const BASE = '__BASE__';
const PRECACHE = __FILES__;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('wb-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  if (req.mode === 'navigate') {
    // App pages: network first (to get updates), the cached app shell when offline.
    event.respondWith(fetch(req).catch(() => caches.match(BASE + '/index.html')));
    return;
  }
  // Built files have content hashes in their names, so cache-first is safe.
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
