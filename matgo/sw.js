// 길쭈기 맞고 - 서비스워커 (오프라인 실행용 · 항상 최신 버전 우선)
const CACHE='family-matgo-v48';
const ASSETS=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png','./fonts/jua.css','./title6.webp','./stone.webp'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(ASSETS.map(a=>c.add(new Request(a,{cache:'reload'})).catch(()=>{})))));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET'||!r.url.startsWith(self.location.origin))return;
  const page=r.mode==='navigate'||/\/(index\.html)?(\?.*)?$/.test(new URL(r.url).pathname+new URL(r.url).search);
  // 화면(HTML)은 브라우저 캐시를 건너뛰고 항상 서버에서 새로 받음
  const net=page?fetch(r.url,{cache:'no-store'}):fetch(r);
  e.respondWith(net.then(res=>{if(res&&res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(page?'./index.html':r,cp))}return res})
    .catch(()=>caches.match(page?'./index.html':r).then(x=>x||caches.match('./index.html'))));
});
