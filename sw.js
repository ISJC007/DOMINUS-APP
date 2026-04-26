

const CACHE_NAME = 'DOMINUS-8.6.7.9'; 

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

  // --- TUS SCRIPTS ---
  'JS/Cloud.js',          // 👈 NUEVO
  'JS/Usuario.js',        // 👈 NUEVO
  'JS/Notificaciones.js', // 👈 NUEVO
  'JS/Teclado.js',        // 👈 NUEVO
  'JS/frases.js',
  'JS/Offline.js',     
  'JS/Seguridad.js',
  'JS/Servicios.js',
  'JS/Audio.js',       // 👈 ¡No olvides registrar tu nuevo módulo!
  'JS/Conversor.js',
  'JS/Inventario.js',
  'JS/Controlador.js',
  'JS/scaner.js',
  'JS/Ventas.js',
  'JS/Main.js',
  'JS/Interfaz.js',    // 👈 Asegúrate de que esté aquí si lo usas

  // --- 🔊 CARPETA DE AUDIO (Imprescindible para el Offline) ---
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

  // --- RECURSOS VISUALES ---
  '/IMG/icon-192.png',
  '/IMG/icon-512.png',
  '/IMG/screenshot.png'
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