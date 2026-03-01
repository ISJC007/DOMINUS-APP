const CACHE_NAME = 'dominus-v3'; 
const ASSETS = [
  'index.html',
  'manifest.json',
  'CSS/Styles.css',
  'JS/Main.js',
  'JS/Ventas.js',
  'JS/Inventario.js',
  'JS/Conversor.js',
  'JS/Offline.js',
  'IMG/icon-192.png',
  'IMG/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Dominus: Instalando nuevo caché...');
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});