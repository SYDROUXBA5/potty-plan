// Potty Plan offline cache. The page is fetched fresh when there is a connection and
// served from the saved copy when there is none. Fonts and icons are saved once.
const C='pottyplan-v1';
const SHELL=['./','manifest.webmanifest','fonts/bricolage-grotesque.woff2','fonts/instrument-sans.woff2',
  'icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  if(r.mode==='navigate'){
    e.respondWith((async()=>{
      const c=await caches.open(C);
      const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),3000);   // a dead-slow connection counts as none
      try{
        const res=await fetch(r,{signal:ctl.signal,cache:'no-store'});
        if(res.ok)await c.put('./',res.clone());
        return res;
      }catch(_){
        return (await c.match('./'))||Response.error();
      }finally{clearTimeout(t)}
    })());
    return;
  }
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{
    if(res.ok){const copy=res.clone();caches.open(C).then(c=>c.put(r,copy))}
    return res;
  })));
});
