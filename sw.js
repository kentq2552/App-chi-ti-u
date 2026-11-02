// Bump VERSION whenever app files change so phones pick up the new copy.
const VERSION="sochi-1";
const SHELL=["./","index.html","app.js","manifest.webmanifest","icons/icon-180.png","icons/icon-192.png","icons/icon-512.png"];

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
// Network first so updates show up; fall back to cache when offline.
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  e.respondWith(
    fetch(e.request).then(r=>{
      if(r.ok&&(new URL(e.request.url).origin===location.origin||e.request.url.includes("fonts.g"))){
        const copy=r.clone();caches.open(VERSION).then(c=>c.put(e.request,copy));
      }
      return r;
    }).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match("index.html")))
  );
});
