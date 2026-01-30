const CACHE_NAME = 'dominus-v1';
// Las rutas deben coincidir EXACTAMENTE con tus carpetas
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './CSS/Styles.css',
  './JS/Main.js',
  './JS/Ventas.js',
  './JS/Inventario.js',
  './JS/Conversor.js',
  './JS/Offline.js',
  './IMG/icon-192.png', // CAMBIADO: Antes decía logo.png
  './IMG/icon-512.png'  // CAMBIADO: Antes decía favicon.png
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Dominus: Cacheando rutas con carpetas...');
      return Promise.all(
        ASSETS.map(url => {
          return cache.add(url).catch(err => console.warn(`Error en: ${url}`, err));
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});