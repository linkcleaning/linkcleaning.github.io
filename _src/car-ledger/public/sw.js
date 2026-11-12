const C = 'car-ledger-v4';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(C).then((c) => c.addAll(['./', './index.html']).catch(() => {}))); });
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then((res) => { const cp = res.clone(); caches.open(C).then((c) => c.put('./index.html', cp)); return res; }).catch(() => caches.match('./index.html')));
    return;
  }
  if (u.origin === location.origin || /fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/.test(u.hostname)) {
    e.respondWith(caches.match(r).then((h) => h || fetch(r).then((res) => { if (res.ok && (u.origin !== location.origin || /\/assets\//.test(u.pathname) || /\.(png|svg|ico)$/.test(u.pathname))) { const cp = res.clone(); caches.open(C).then((c) => c.put(r, cp)); } return res; })));
  }
});
