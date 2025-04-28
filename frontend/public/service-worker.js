const CACHE_NAME = 'house-of-hope-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/LOGO.svg',
  '/static/js/main.chunk.js',
  '/static/css/main.chunk.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
}); 