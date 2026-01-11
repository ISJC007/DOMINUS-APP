const CACHE_NAME = 'dominus-v1';
const assets = [
  'index.html',
  'login.html',
  'CSS/Styles.css',
  'JS/Main.js',
  'JS/Auth.js',
  'JS/Ventas.js',
  'JS/Conversor.js',
  'JS/Offline.js',
  'IMG/logo.png'
];

// Instalar el Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// Responder desde la caché cuando no hay internet
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});