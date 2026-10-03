const CACHE_VERSION = 'ela-shell-v8';
const STATIC_CACHE = [
  './','./index.html','./manifest.json','./css/app.css','./assets/icon.svg',
  './data/curriculum.json','./data/diagnostic.json','./js/app.js?v=8','./js/config.js?v=2',
  './js/core/store.js','./js/core/plan-engine.js?v=3','./js/services/firebase.js?v=3',
  './js/services/gemini.js?v=2','./js/services/live-speaking.js?v=2','./js/services/pcm-worklet.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(STATIC_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.hostname.includes('googleapis.com')||url.hostname.includes('firebase')||url.hostname.includes('gstatic.com'))return;
  if(request.mode==='navigate') {
    event.respondWith(fetch(request).then(response=>{const copy=response.clone();caches.open(CACHE_VERSION).then(cache=>cache.put('./index.html',copy));return response}).catch(()=>caches.match('./index.html')));
    return;
  }
  if(url.origin===self.location.origin) {
    event.respondWith(caches.match(request).then(cached=>{
      const refresh=fetch(request).then(response=>{if(response.ok)caches.open(CACHE_VERSION).then(cache=>cache.put(request,response.clone()));return response}).catch(()=>cached);
      return cached||refresh;
    }));
  }
});
