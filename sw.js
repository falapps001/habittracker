// Service worker: Habit Log tetap terbuka tanpa internet.
// Ganti angka versi setiap kali file aplikasi diperbarui, supaya perangkat mengambil versi baru.
const V = 'habit-log-1.0.1';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'store.js', 'sync.js', 'firebase.js', 'firebase-config.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];
const CDN = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith('habit-log-') && k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    // App files: try the latest version (max 3 s), otherwise use the saved copy.
    e.respondWith((async () => {
      const cache = await caches.open(V);
      const net = fetch(r).then(res => { if (res.ok) cache.put(r, res.clone()); return res; });
      const timer = new Promise(res => setTimeout(res, 3000));
      try {
        const res = await Promise.race([net, timer]);
        if (res) return res;
      } catch (err) { /* offline */ }
      return (await cache.match(r, { ignoreSearch: true })) || (await cache.match('index.html')) || net;
    })());
  } else if (CDN.includes(u.hostname)) {
    // Firebase library and fonts: pinned versions, download once.
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => {
      if (res.ok || res.type === 'opaque') { const c = res.clone(); caches.open(V).then(ca => ca.put(r, c)); }
      return res;
    })));
  }
  // Everything else (Firebase login and database) goes straight to the network.
});
