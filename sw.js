const CACHE_NAME = 'ledger-v2';
const ASSETS = [
  '/budget-app/',
  '/budget-app/index.html',
  '/budget-app/manifest.json',
  '/budget-app/css/theme.css',
  '/budget-app/js/data.js',
  '/budget-app/js/insights.js',
  '/budget-app/js/onboarding.js',
  '/budget-app/js/app.js',
  '/budget-app/icons/icon-192.png',
  '/budget-app/icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      });
    })
  );
});
