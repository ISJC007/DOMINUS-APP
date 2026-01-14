const CACHE_NAME = 'dominus-v1';
const assets = [
  './',
  'index.html',
  'login.html',
  'CSS/Styles.css',
  'JS/Main.js',
  'JS/Auth.js',
  'JS/Ventas.js',
  'JS/Conversor.js',
  'JS/Offline.js',
  'JS/Modulos.js',
  'IMG/favicon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(assets)));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});