const CACHE_NAME = 'DOMINUS-1.3.1.0'; 

// Lista completa de recursos (Assets)
const ASSETS = [
  './', 
  'index.html',
  'manifest.json',
  'CSS/Styles.css',
  
  // --- LIBRERÍAS EXTERNAS (CDNs) ---
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-database-compat.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-storage-compat.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://unpkg.com/html5-qrcode',
  'https://cdn.jsdelivr.net/npm/eruda',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap',

  // --- SCRIPTS LOCALES (Orden de carga lógico) ---
  'JS/Cloud.js',
  'JS/Offline.js', 
  'JS/Usuario.js',
  'JS/Seguridad.js', 
  'JS/Centinela.js',
  'JS/Audio.js',
  'JS/frases.js',
  'JS/Interfaz.js', 
  'JS/Conversor.js',
  'JS/Servicios.js',
  'JS/Inventario.js',
  'JS/Ventas.js', 
  'JS/Notificaciones.js',
  'JS/scaner.js', 
  'JS/Teclado.js',
  'JS/Controlador.js', 
  'JS/Herramientas.js',
  'JS/Main.js',

  // --- AUDIO & MULTIMEDIA ---
  'AUDIO/add.mp3',
  'AUDIO/success.mp3',
  'AUDIO/error.mp3',
  'AUDIO/scanner.mp3',
  'AUDIO/bienvenida_dia.mp3',
  'AUDIO/bienvenida_tarde.mp3',
  'AUDIO/bienvenida_noche.mp3',
  'AUDIO/resumen_ventas.mp3',
  'AUDIO/stock_bajo.mp3',
  'AUDIO/base_datos.mp3',
  'IMG/icon-192.png',
  'IMG/icon-512.png',
  'IMG/screenshot.png'
];

// 1. INSTALACIÓN: Almacena todo en caché
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('DOMINUS: Sincronizando ecosistema offline...');
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(err => console.error(`Error cargando ${url}:`, err)))
      );
    })
  );
  self.skipWaiting(); // Fuerza a que el SW nuevo sea el que mande
});

// 2. ACTIVACIÓN: Limpia cachés viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim(); // Toma control de las pestañas abiertas de inmediato
});

// 3. FETCH: Estrategia Cache-First (Velocidad Dominus)
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      // Si está en caché, devuélvelo (Ahorra datos en Venezuela)
      if (response) return response;

      // Si no, búscalo en la red
      return fetch(e.request).catch(() => {
        // Si no hay red y es una página (HTML), podrías devolver index.html
        if (e.request.mode === 'navigate') {
          return caches.match('index.html');
        }
        return new Response(null, { status: 404, statusText: 'Offline' });
      });
    })
  );
});