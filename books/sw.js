/* 다락서재 서비스워커 — 화면·라이브러리·글꼴을 저장해 두어 인터넷 없이도 서재와 책을 열 수 있게 함
   (책 파일 자체는 IndexedDB에 저장) */
const CACHE = 'darak-v3';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
const CDN = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js',
  'https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/variable/woff2/SUIT-Variable.css',
  'https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Hahmlet:wght@500;700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap',
  'https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_twelve@1.0/RIDIBatang.woff'
];
const NO_CACHE = /aladin\.co\.kr\/ttb|googleapis\.com\/books|openlibrary\.org\/search|dapi\.kakao\.com|gutendex\.com|corsproxy\.io|allorigins\.win|codetabs\.com|workers\.dev|\.epub(\?|$)/;   // 검색 결과·책 파일 다운로드는 저장 안 함 (책은 IndexedDB에 따로 저장)

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(CORE).catch(() => {});
    await Promise.all(CDN.map(u => fetch(new Request(u, { mode: 'no-cors' })).then(r => c.put(u, r)).catch(() => {})));
  }));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('darak-') && k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http') || NO_CACHE.test(req.url)) return;
  if (req.mode === 'navigate') {   // 화면: 인터넷 먼저, 안 되면 저장본
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); return r; })
      .catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async c => {   // 나머지(라이브러리·글꼴·표지 그림): 저장본 먼저, 뒤에서 갱신
    const hit = await c.match(req, { ignoreVary: true });
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit || Response.error());
    return hit || net;
  }));
});
