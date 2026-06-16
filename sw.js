const CACHE_NAME = 'ledger-v3';
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
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
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
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});