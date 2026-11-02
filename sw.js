// Bump VERSION whenever app files change so phones pick up the new copy.
const VERSION="sochi-2";
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
  const url=new URL(e.request.url);
  const own=url.origin===location.origin, fonts=url.hostname.startsWith("fonts.g");
  if(!own&&!fonts)return;   // e.g. exchange rates: let the page handle failures itself
  e.respondWith(
    fetch(e.request).then(r=>{
      if(r.ok){
        const copy=r.clone();caches.open(VERSION).then(c=>c.put(e.request,copy));
      }
      return r;
    }).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match("index.html")))
  );
});
