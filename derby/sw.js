const CACHE = "link-derby-v52";
const CORE = ["./", "./index.html", "./ld-manifest.webmanifest", "./ld-icon-192.png", "./ld-icon-512.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // 순위·선물 서버(Firebase)는 절대 캐시하지 않음 — 항상 최신
  if (url.hostname.includes("firebasedatabase") || url.hostname.includes("firebaseio")) return;
  // 다른 사이트는 구글 폰트만 캐시
  if (url.origin !== self.location.origin && !url.hostname.includes("gstatic") && !url.hostname.includes("googleapis") && !url.hostname.includes("cdnjs") && !url.hostname.includes("tailwindcss")) return;
  // 페이지: 네트워크 우선(업데이트 반영), 실패 시 캐시
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request, { cache: "no-store" }).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put("./index.html", cp)); return r; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }
  // 그 외(아이콘, 구글 폰트): 캐시 우선
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
      if (r.ok || r.type === "opaque") { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); }
      return r;
    }))
  );
});
