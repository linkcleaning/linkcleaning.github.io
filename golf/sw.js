// 링크 골프 - 서비스워커 (오프라인 실행용 · 화면은 항상 최신 버전 우선)
const CACHE = 'link-golf-v3';
const ASSETS = ['./', './index.html', './manifest.json', './icon-180.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(a => c.add(new Request(a, { cache: 'reload' })).catch(() => {})))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const url = new URL(r.url);
  // 외부 파일(Tailwind CDN·구글 폰트): 한 번 받으면 저장해 두고 오프라인에서도 사용
  if (url.origin !== self.location.origin) {
    if (!/cdn\.tailwindcss\.com|cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/.test(url.host)) return;
    e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; })));
    return;
  }
  // 우리 파일: 네트워크 먼저(최신), 실패하면 저장본
  const page = r.mode === 'navigate' || /\/(index\.html)?$/.test(url.pathname);
  const net = page ? fetch(r.url, { cache: 'no-store' }) : fetch(r);
  e.respondWith(net.then(res => { if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(page ? './index.html' : r, cp)); } return res; })
    .catch(() => caches.match(page ? './index.html' : r).then(x => x || caches.match('./index.html'))));
});
