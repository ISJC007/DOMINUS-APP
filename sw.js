const CACHE_NAME = 'dominus-v2'; // Subimos versión
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

// Instalación: Cacheo uno por uno para que si uno falla, los demás sigan
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

// Activación: Limpia el caché viejo (v1)
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Fetch: Estrategia de red primero, luego caché
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});