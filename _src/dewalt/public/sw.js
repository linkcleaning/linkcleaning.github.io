// 광주 디월트 AS SNS — 서비스 워커 (버전 올릴 때 C 숫자도 같이 올리기)
const C = 'dewalt-sns-v1'
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) =>
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())),
)
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url)
  // API·업로드·다른 사이트 요청은 절대 캐시하지 않음
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return
  // 네트워크 우선, 끊기면 캐시 (현장 신호 약할 때도 앱은 열림)
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const c = r.clone()
        caches.open(C).then((x) => x.put(e.request, c))
        return r
      })
      .catch(() => caches.match(e.request)),
  )
})
