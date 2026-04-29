// Mainstage Pro — Service Worker
// Estrategia: Network-first para todo (datos siempre frescos) + cola offline para mutaciones

const CACHE_SHELL = "msp-shell-v6";
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
  // Activar inmediatamente sin esperar a que cierren las pestañas anteriores
  event.waitUntil(
    caches.open(CACHE_SHELL).then((cache) =>
      cache.addAll([
        "/offline",
        "/pwa-icon-192.png",
        "/pwa-icon-512.png",
        "/pwa-apple-touch-icon.png",
        "/manifest.json",
      ]).catch(() => {})
    ).then(() => self.skipWaiting())
  );
});

// ── Activate — limpiar TODOS los caches viejos ─────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_SHELL)
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

  // Activos estáticos de Next.js → cache-first (son inmutables por hash)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Manifest → siempre desde red para que los íconos se actualicen
  if (url.pathname === "/manifest.json") {
    event.respondWith(networkFirstNoCache(req));
    return;
  }

  // Archivos estáticos (imágenes, íconos) → cache-first
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?)$/)) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // API GET → network-first, sin cachear (datos siempre frescos)
  if (url.pathname.startsWith("/api/") && req.method === "GET") {
    event.respondWith(networkFirstNoCache(req));
    return;
  }

  // API mutaciones → intenta network, si falla encola
  if (url.pathname.startsWith("/api/") && ["POST","PATCH","PUT","DELETE"].includes(req.method)) {
    event.respondWith(mutationWithQueue(req));
    return;
  }

  // Páginas → network-first, cache solo para offline
  if (req.mode === "navigate") {
    event.respondWith(networkFirstNavigate(req));
    return;
  }
});

// ── Estrategias de cache ──────────────────────────────────────────────────────

// Para activos estáticos inmutables
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(CACHE_SHELL);
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    return new Response("Sin conexión", { status: 503 });
  }
}

// Para APIs: siempre va a la red, nunca sirve caché
async function networkFirstNoCache(req) {
  try {
    return await fetch(req);
  } catch {
    return new Response(
      JSON.stringify({ error: "Sin conexión", offline: true }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Para páginas: va a la red, solo usa caché si no hay red
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

async function mutationWithQueue(req) {
  try {
    const res = await fetch(req.clone());
    const size = await queueSize();
    if (size > 0) {
      self.registration.sync.register(SYNC_TAG).catch(() => {
        syncQueue();
      });
    }
    return res;
  } catch {
    try {
      const body = await req.clone().text();
      await enqueue({
        url: req.url,
        method: req.method,
        body,
        headers: Object.fromEntries(req.headers.entries()),
        ts: Date.now(),
      });
      const clients = await self.clients.matchAll();
      clients.forEach((c) => c.postMessage({ type: "QUEUED", url: req.url }));
    } catch (qErr) {
      console.error("[SW] Error al encolar:", qErr);
    }
    return new Response(
      JSON.stringify({ offline: true, queued: true }),
      { status: 202, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ── Background Sync ───────────────────────────────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncQueue());
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SYNC_NOW") {
    syncQueue();
  }
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

const FETCH_TIMEOUT_MS = 15000;

function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

async function syncQueue() {
  const items = await dequeueAll();

  for (const item of items) {
    try {
      const headers = { ...item.headers };
      delete headers["content-length"];

      const res = await fetchWithTimeout(item.url, {
        method: item.method,
        headers,
        body: item.body || undefined,
      });

      if (res.ok || res.status < 500) {
        await removeFromQueue(item.id);
      }
    } catch {
      // Timeout o error de red — dejar en cola para el próximo intento
    }
  }

  const clients = await self.clients.matchAll();
  const remaining = await queueSize();
  clients.forEach((c) => c.postMessage({ type: "SYNC_DONE", remaining }));
}
