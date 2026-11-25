const CACHE_NAME = 'lugar-seguro-v3';
const urlsToCache = [
    './',
    './index.html',
    './css/styles.css',
    './js/api.js',
    './js/auth.js',
    './js/breathing.js',
    './js/journal.js',
    './js/calendar.js',
    './js/sos.js',
    './js/settings.js',
    './js/app.js',
    './js/vendor/bcrypt.js',
    './manifest.json',
    './icons/logo.png',
    './img/home.png',
    './img/resumenes.png',
    './img/diario.png',
    './img/respiraciones.png',
    './img/ajustes.png',
    './img/candado.png',
    './img/volver.png',
    './img/adelante.png',
    './img/editar.png',
    './img/historial.png',
    './img/emociones/enojado.png',
    './img/emociones/llorando.png',
    './img/emociones/triste.png',
    './img/emociones/cara neutral.png',
    './img/emociones/feliz.png',
    './img/respiraciones/inhala.png',
    './img/respiraciones/sosten.png',
    './img/respiraciones/exhala.png',
    './audios/fondo de app.mp3',
    './audios/inhalar.mp3',
    './audios/sosten.mp3',
    './audios/exhalar.mp3'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    // Solo cachear peticiones same-origin (la app ya no usa backend propio)
    if (url.origin !== self.location.origin) {
        return;
    }
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request).catch(() => {
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
