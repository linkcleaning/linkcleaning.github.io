const CACHE = 'bangjae-v6';
const ASSETS = ['./', './index.html', './data-safety.js', './data-disaster.js', './data-lang.js', './data-more.js','./data-exam2.js','./data-ox2.js','./data-read-en.js','./detail-safety.js','./detail-disaster.js','./detail-lang.js', './icon-192.png', '/v.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok && (req.url.startsWith(self.location.origin) || /jsdelivr/.test(req.url))) {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
