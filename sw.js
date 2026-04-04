/**
 * ARCHIVO: sw.js
 * VERSIÓN: 3.3.8 (Casi Ultimate Blindada)
 */

const CACHE_NAME = 'DOMINUS-3.2.7'; 

const ASSETS = [
  './', 
  'index.html',
  'manifest.json',
  'CSS/Styles.css',
  
  // --- LIBRERÍAS EXTERNAS (CDNs) ---
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.rawgit.com/serratus/quaggaJS/0420d5e/dist/quagga.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap',

  // --- TUS SCRIPTS (Respetando Mayúsculas del HTML) ---
  'JS/frases.js',
  'JS/Offline.js',     
  'JS/Seguridad.js',
  'JS/Servicios.js',
  'JS/Conversor.js',
  'JS/Inventario.js',
  'JS/Controlador.js',
  'JS/scaner.js',
  'JS/Ventas.js',
  'JS/Main.js',

  // --- RECURSOS VISUALES ---
  'IMG/icon-192.png',
  'IMG/icon-512.png'
];

// 1. INSTALACIÓN
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Dominus: Sincronizando módulos de seguridad y ventas...');
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(err => console.error(`Fallo en: ${url}`, err)))
      );
    })
  );
  self.skipWaiting();
});

// 2. ACTIVACIÓN
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// 3. FETCH (OPTIMIZADO PARA OFFLINE)
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      // Si está en caché, lo entregamos (Scripts, CSS, HTML, Imágenes)
      if (response) return response;

      // Si no está (como la API), vamos a internet
      return fetch(e.request).catch(() => {
        // En lugar de solo un log, devolvemos una respuesta de error controlada
        // Esto silencia el error "Failed to convert value to Response"
        console.log("☁️ Dominus: Recurso de red no disponible (Modo Offline).");
        return new Response(null, { status: 404, statusText: 'Offline' });
      });
    })
  );
});