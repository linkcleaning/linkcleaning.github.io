// 픽컷 서비스 워커 — 앱 파일을 폰에 보관해 오프라인에서도 열리게 합니다.
// 새 버전을 올리면 VERSION이 바뀌어 예전 보관본은 자동으로 지워집니다.
// ※ 같은 주소의 다른 앱(콜백문자 등) 보관본은 건드리지 않도록 'pickcut-'으로 시작하는 것만 지웁니다.
const VERSION = 'pickcut-1d51b910';
const APP_SHELL = ['./', './index.html', './assets/app-jv7c4ry4.js', './assets/app-0026ae75.css', './manifest.webmanifest',
  './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const MODEL_CACHE = 'pickcut-models'; // AI 모델(눈 감음·비슷한 사진)은 버전과 무관하게 계속 보관

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('pickcut-') && k !== VERSION && k !== MODEL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isModel = (url) =>
  url.hostname === 'storage.googleapis.com' || url.href.includes('cdn.jsdelivr.net/npm/@mediapipe') ||
  url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 화면 이동(앱 열기): 인터넷 우선, 안 되면 보관본
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }
  // AI 모델·글꼴: 보관본 우선, 없으면 받아서 보관
  if (isModel(url)) {
    e.respondWith(
      caches.open(MODEL_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }
  // 앱 파일: 보관본 우선
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});
