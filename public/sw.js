// ⚠️  SERVICE WORKER KILL SWITCH
// Borra todos los cachés, se desregistra a sí mismo y libera el navegador.
// Se restaurará el SW completo en el siguiente deploy.

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (name) { return caches.delete(name); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    self.clients.claim().then(function () {
      // Notifica a todas las pestañas que recarguen sin SW
      return self.clients.matchAll({ includeUncontrolled: true }).then(function (clients) {
        clients.forEach(function (client) {
          client.postMessage({ type: "SW_KILLED" });
        });
        return self.registration.unregister();
      });
    })
  );
});
