// Mainstage Pro — Service Worker
// Estrategia: Network-first con cache fallback + cola offline para mutaciones

const CACHE_SHELL = "msp-shell-v1";
const CACHE_API   = "msp-api-v1";
const DB_NAME     = "msp-offline-queue";
const DB_VERSION  = 1;
const SYNC_TAG    = "msp-sync";

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("queue")) {
        const store = db.createObjectStore("queue", { keyPath: "id", autoIncrement: true });
        store.createIndex("ts", "ts", { unique: false });
      }
    };
    req.onsuccess  = (e) => resolve(e.target.result);
    req.onerror    = (e) => reject(e.target.error);
  });
}

async function enqueue(entry) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readwrite");
    tx.objectStore("queue").add(entry);
    tx.oncomplete = resolve;
    tx.onerror    = (e) => reject(e.target.error);
  });
}

async function dequeueAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readonly");
    const req = tx.objectStore("queue").index("ts").getAll();
    req.onsuccess = (e) => resolve(e.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

async function removeFromQueue(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readwrite");
    tx.objectStore("queue").delete(id);
    tx.oncomplete = resolve;
    tx.onerror    = (e) => reject(e.target.error);
  });
}

async function queueSize() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction("queue", "readonly");
    const req = tx.objectStore("queue").count();
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = () => resolve(0);
  });
}

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then((cache) =>
      cache.addAll([
        "/login",
        "/offline",
        "/logo-icon.png",
        "/manifest.json",
      ]).catch(() => {}) // Silently ignore if some fail
    ).then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_SHELL && k !== CACHE_API)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo interceptar mismo origen
  if (url.origin !== self.location.origin) return;

  // Activos estáticos de Next.js → cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req, CACHE_SHELL));
    return;
  }

  // API GET → stale-while-revalidate (sirve cache, actualiza en fondo)
  if (url.pathname.startsWith("/api/") && req.method === "GET") {
    event.respondWith(staleWhileRevalidate(req, CACHE_API));
    return;
  }

  // API mutaciones → intenta network, si falla encola
  if (url.pathname.startsWith("/api/") && ["POST","PATCH","PUT","DELETE"].includes(req.method)) {
    event.respondWith(mutationWithQueue(req));
    return;
  }

  // Páginas → network-first con cache fallback
  if (req.mode === "navigate") {
    event.respondWith(networkFirstNavigate(req));
    return;
  }
});

// ── Estrategias de cache ──────────────────────────────────────────────────────
async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    return new Response("Sin conexión", { status: 503 });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);

  const fetchPromise = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);

  return cached || fetchPromise || new Response(
    JSON.stringify({ error: "Sin conexión", offline: true }),
    { status: 503, headers: { "Content-Type": "application/json" } }
  );
}

async function mutationWithQueue(req) {
  try {
    const res = await fetch(req.clone());
    // Si hay cola pendiente y tenemos red, sincronizar
    const size = await queueSize();
    if (size > 0) {
      self.registration.sync.register(SYNC_TAG).catch(() => {
        // Background sync no disponible → sincronizar inmediatamente
        syncQueue();
      });
    }
    return res;
  } catch (err) {
    // Sin red → encolar la petición
    try {
      const body = await req.clone().text();
      await enqueue({
        url: req.url,
        method: req.method,
        body,
        headers: Object.fromEntries(req.headers.entries()),
        ts: Date.now(),
      });
      // Notificar a todos los clientes
      const clients = await self.clients.matchAll();
      clients.forEach((c) => c.postMessage({ type: "QUEUED", url: req.url }));
    } catch (qErr) {
      console.error("[SW] Error al encolar:", qErr);
    }
    // Respuesta optimista: el cliente ya actualizó su estado local
    return new Response(
      JSON.stringify({ offline: true, queued: true }),
      { status: 202, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function networkFirstNavigate(req) {
  try {
    const res = await fetch(req);
    const cache = await caches.open(CACHE_SHELL);
    cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    const offlinePage = await caches.match("/offline");
    if (offlinePage) return offlinePage;
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0d0d0d;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center">
        <div><h1 style="color:#B3985B">Sin conexión</h1><p>Conecta a internet para continuar.</p></div>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }
}

// ── Background Sync ───────────────────────────────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncQueue());
  }
});

// También sincronizar al volver online (mensaje desde el cliente)
self.addEventListener("message", (event) => {
  if (event.data?.type === "SYNC_NOW") {
    syncQueue().then(() => {
      self.clients.matchAll().then((clients) => {
        clients.forEach((c) => c.postMessage({ type: "SYNC_DONE" }));
      });
    });
  }
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function syncQueue() {
  const items = await dequeueAll();
  if (items.length === 0) return;

  console.log(`[SW] Sincronizando ${items.length} peticiones en cola`);

  for (const item of items) {
    try {
      const headers = { ...item.headers };
      // Quitar headers problemáticos
      delete headers["content-length"];

      const res = await fetch(item.url, {
        method: item.method,
        headers,
        body: item.body || undefined,
      });

      if (res.ok || res.status < 500) {
        await removeFromQueue(item.id);
        console.log(`[SW] Sincronizado: ${item.method} ${item.url}`);
      }
    } catch (err) {
      console.warn(`[SW] No se pudo sincronizar ${item.url}:`, err);
      // Dejar en cola para el próximo intento
    }
  }

  // Notificar a clientes que se sincronizó
  const clients = await self.clients.matchAll();
  const remaining = await queueSize();
  clients.forEach((c) => c.postMessage({ type: "SYNC_DONE", remaining }));
}
