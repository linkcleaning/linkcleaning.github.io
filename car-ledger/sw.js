const C='car-ledger-mvaxxd4g';
const SHELL=['./','./index.html','./assets/app.js','./assets/app.css','./app-v3.webmanifest','./car-icon-192.png','./car-icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
 if(r.mode==='navigate'){e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put('./index.html',cp));return res}).catch(()=>caches.match('./index.html')));return}
 if(u.origin===location.origin){e.respondWith(caches.match(r).then(h=>h||fetch(r)));return}
 if(/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com/.test(u.hostname)){e.respondWith(caches.open(C).then(async c=>{const h=await c.match(r);const n=fetch(r).then(res=>{c.put(r,res.clone());return res}).catch(()=>h);return h||n}))}
});
