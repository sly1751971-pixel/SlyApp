
    // Mis Gastos - Service Worker v2
// Hace que la app funcione sin internet y sea instalable

const CACHE = 'mis-gastos-v2';
const FILES = [
  './',
  './index.html',
  './app.js',
  './datos.json',
  './manifest.json'
];

// 1. INSTALAR - Guarda los archivos en el celu
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => {
        console.log('[SW] Cacheando archivos');
        return cache.addAll(FILES);
      })
      .then(() => self.skipWaiting())
  );
});

// 2. ACTIVAR - Borra cachés viejos cuando subís una versión nueva
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE) {
            console.log('[SW] Borrando caché viejo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH - Si hay internet, usa internet. Si no, usa lo guardado.
self.addEventListener('fetch', (event) => {
  // No cachear cosas que no son GET (ej: formularios)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si anda internet, guardamos una copia nueva en caché
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Si NO hay internet, buscamos en caché
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Si es la página principal y no hay nada, mostrá index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// 4. MENSAJE - Para forzar actualización desde la app si querés
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
