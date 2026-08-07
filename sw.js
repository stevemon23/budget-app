// Ledger service worker
// Bump CACHE_VERSION every time you push a change you want users to get.
var CACHE_VERSION = "ledger-v5";

var SHELL = [
  "./",
  "./index.html",
  "./manifest.json"
];

// Install: pre-cache the app shell.
self.addEventListener("install", function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache){
      return cache.addAll(SHELL).catch(function(){ /* ignore missing optional files */ });
    })
  );
});

// Activate: delete every old cache so stale files can't be served.
self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(key){
        if(key !== CACHE_VERSION) return caches.delete(key);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

// Fetch: network-first. Try the live file, update the cache, fall back to
// cache only when offline. This is what makes new deploys show up on launch.
self.addEventListener("fetch", function(event){
  if(event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).then(function(response){
      var copy = response.clone();
      caches.open(CACHE_VERSION).then(function(cache){ cache.put(event.request, copy); });
      return response;
    }).catch(function(){
      return caches.match(event.request).then(function(hit){
        return hit || caches.match("./index.html");
      });
    })
  );
});