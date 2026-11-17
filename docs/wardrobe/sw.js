// Wardrobe Buddy service worker: makes the app open offline.
// Caches ONLY this app's own files (same origin, under the base path). It never touches
// other hosts (the weather service is not cached here; the app keeps its own 1-hour cache),
// and it stores no personal data: profile, clothes and photos live in the app's storage.
const CACHE = 'wb-a2618327d8b8';
const BASE = '/Ludo_Mani/wardrobe';
const PRECACHE = [
  "/Ludo_Mani/wardrobe/_expo/static/js/web/[id]-af8f7c41d13aefc5aab9396850ff2d6d.js",
  "/Ludo_Mani/wardrobe/_expo/static/js/web/[outfitId]-e295314a8a789c9d24efe61b7be040f3.js",
  "/Ludo_Mani/wardrobe/_expo/static/js/web/__common-0e3df01f0779552c8df92c5316845efd.js",
  "/Ludo_Mani/wardrobe/_expo/static/js/web/__expo-metro-runtime-ed4c1cfa6193d76fc294130e42bd1916.js",
  "/Ludo_Mani/wardrobe/_expo/static/js/web/_layout-18afc0b562fc5d176f150761db610b95.js",
  "/Ludo_Mani/wardrobe/_expo/static/js/web/_layout-fa4ef2a9a176725f24ee55e02b28a360.js",
  "/Ludo_Mani/wardrobe/_expo/static/js/web/entry-e6465923f4ca685cd1f11e946aa7fc50.js",
  "/Ludo_Mani/wardrobe/_expo/static/js/web/index-e49e67c4b4f20edb7fad5fcfa7159dab.js",
  "/Ludo_Mani/wardrobe/_expo/static/js/web/me-685090908ea8224186fdba7cf3c5fe73.js",
  "/Ludo_Mani/wardrobe/_expo/static/js/web/onboarding-d5a232aa3ce699d4191056e75bcb9201.js",
  "/Ludo_Mani/wardrobe/_expo/static/js/web/parent-cdb59792a58011e0d0c71604ef01bb93.js",
  "/Ludo_Mani/wardrobe/_expo/static/js/web/wardrobe-d5d33247e4d6ddf4319553c2a3161ec4.js",
  "/Ludo_Mani/wardrobe/_expo/static/js/web/week-ff3701cda43ee244c55ea6957d42baf6.js",
  "/Ludo_Mani/wardrobe/apple-touch-icon.png",
  "/Ludo_Mani/wardrobe/assets/node_modules/expo-router/assets/arrow_down.017bc6ba3fc25503e5eb5e53826d48a8.png",
  "/Ludo_Mani/wardrobe/assets/node_modules/expo-router/assets/error.d1ea1496f9057eb392d5bbf3732a61b7.png",
  "/Ludo_Mani/wardrobe/assets/node_modules/expo-router/assets/file.19eeb73b9593a38f8e9f418337fc7d10.png",
  "/Ludo_Mani/wardrobe/assets/node_modules/expo-router/assets/forward.d8b800c443b8972542883e0b9de2bdc6.png",
  "/Ludo_Mani/wardrobe/assets/node_modules/expo-router/assets/pkg.ab19f4cbc543357183a20571f68380a3.png",
  "/Ludo_Mani/wardrobe/assets/node_modules/expo-router/assets/react-navigation/elements/back-icon-mask.0a328cd9c1afd0afe8e3b1ec5165b1b4.png",
  "/Ludo_Mani/wardrobe/assets/node_modules/expo-router/assets/react-navigation/elements/back-icon.35ba0eaec5a4f5ed12ca16fabeae451d.png",
  "/Ludo_Mani/wardrobe/assets/node_modules/expo-router/assets/react-navigation/elements/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55.png",
  "/Ludo_Mani/wardrobe/assets/node_modules/expo-router/assets/react-navigation/elements/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55@2x.png",
  "/Ludo_Mani/wardrobe/assets/node_modules/expo-router/assets/react-navigation/elements/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55@3x.png",
  "/Ludo_Mani/wardrobe/assets/node_modules/expo-router/assets/react-navigation/elements/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55@4x.png",
  "/Ludo_Mani/wardrobe/assets/node_modules/expo-router/assets/react-navigation/elements/close-icon.808e1b1b9b53114ec2838071a7e6daa7.png",
  "/Ludo_Mani/wardrobe/assets/node_modules/expo-router/assets/react-navigation/elements/close-icon.808e1b1b9b53114ec2838071a7e6daa7@2x.png",
  "/Ludo_Mani/wardrobe/assets/node_modules/expo-router/assets/react-navigation/elements/close-icon.808e1b1b9b53114ec2838071a7e6daa7@3x.png",
  "/Ludo_Mani/wardrobe/assets/node_modules/expo-router/assets/react-navigation/elements/close-icon.808e1b1b9b53114ec2838071a7e6daa7@4x.png",
  "/Ludo_Mani/wardrobe/assets/node_modules/expo-router/assets/react-navigation/elements/search-icon.286d67d3f74808a60a78d3ebf1a5fb57.png",
  "/Ludo_Mani/wardrobe/assets/node_modules/expo-router/assets/sitemap.412dd9275b6b48ad28f5e3d81bb1f626.png",
  "/Ludo_Mani/wardrobe/assets/node_modules/expo-router/assets/unmatched.20e71bdf79e3a97bf55fd9e164041578.png",
  "/Ludo_Mani/wardrobe/favicon.ico",
  "/Ludo_Mani/wardrobe/icon-192.png",
  "/Ludo_Mani/wardrobe/icon-512.png",
  "/Ludo_Mani/wardrobe/icon-maskable-512.png",
  "/Ludo_Mani/wardrobe/index.html",
  "/Ludo_Mani/wardrobe/manifest.webmanifest",
  "/Ludo_Mani/wardrobe/metadata.json"
];

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
