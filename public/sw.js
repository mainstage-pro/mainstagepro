// Mainstage Pro — Service Worker PASIVO
// No intercepta ninguna petición. Solo existe para que el navegador no registre uno nuevo.
// Se restaurará la funcionalidad offline en el siguiente ciclo.

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (n) { return caches.delete(n); }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Sin fetch handler — todas las peticiones van directo a la red
