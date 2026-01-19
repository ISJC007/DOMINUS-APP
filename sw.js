const CACHE_NAME = 'dominus-v1';

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            // Quitamos la lista estricta para que no de error "Request failed"
            return cache.addAll(['./', './index.html']).catch(err => console.log("Cache parcial"));
        })
    );
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(res => res || fetch(e.request))
    );
});