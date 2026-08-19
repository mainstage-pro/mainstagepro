// Mainstage Pro — Service Worker
// - Lectura offline: cachea páginas, estáticos y respuestas GET de la API.
//   Estrategia network-first (siempre intenta la red; si no hay, sirve lo último
//   que se vio). Los estáticos hasheados van cache-first.
// - Escritura offline: la cola de peticiones vive en IndexedDB (la escribe el
//   cliente, ver src/lib/offline-queue.ts). Al recibir SYNC_NOW reenvía la cola
//   en orden y avisa a las pestañas con SYNC_DONE { remaining }.

// La versión sale del build-id que el cliente pasa al registrar (/sw.js?v=<id>).
// Cambia en cada deploy, así que los nombres de caché cambian y el paso "activate"
// borra los del deploy anterior (evita servir HTML/RSC/chunks incompatibles).
let CACHE_VERSION = "v1";
try {
  CACHE_VERSION = new URL(self.location.href).searchParams.get("v") || CACHE_VERSION;
} catch { /* noop */ }
const STATIC_CACHE  = `msp-static-${CACHE_VERSION}`;
const PAGES_CACHE   = `msp-pages-${CACHE_VERSION}`;
const API_CACHE     = `msp-api-${CACHE_VERSION}`;
const KEEP_CACHES   = [STATIC_CACHE, PAGES_CACHE, API_CACHE];

const DB_NAME    = "msp-offline-queue";
const DB_VERSION = 1;

// ── Ciclo de vida ─────────────────────────────────────────────────────────────
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names.filter((n) => !KEEP_CACHES.includes(n)).map((n) => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  const type = event.data && event.data.type;
  if (type === "SKIP_WAITING") self.skipWaiting();
  if (type === "SYNC_NOW") event.waitUntil(replayQueue());
});

// ── Intercepción de peticiones ────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Solo GET del mismo origen. Las escrituras (POST/PATCH/…) pasan directo; la
  // cola offline la maneja el cliente antes de llegar aquí.
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return;

  // Nunca cachear el túnel de Sentry ni los chequeos de sesión (deben ser frescos).
  if (url.pathname.startsWith("/monitoring")) return;
  if (url.pathname.startsWith("/api/auth")) return;

  // Estáticos inmutables (bundles hasheados, fuentes, imágenes) → cache-first.
  if (
    url.pathname.startsWith("/_next/static") ||
    /\.(?:js|css|woff2?|ttf|otf|png|jpe?g|svg|gif|ico|webp|avif)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // Navegaciones a páginas HTML → network-first, respaldo a caché.
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, PAGES_CACHE));
    return;
  }

  // GET de la API → network-first, respaldo a caché.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(req, API_CACHE));
    return;
  }

  // Otros GET del mismo origen (RSC, etc.) → network-first en caché de páginas.
  event.respondWith(networkFirst(req, PAGES_CACHE));
});

// ── Estrategias de caché ──────────────────────────────────────────────────────
// Sin timeout, un fetch que se queda "colgado" (no falla, solo no responde —
// típico en cold-start de la BD bajo carga) bloquea la navegación para siempre
// en vez de caer al caché. Abortamos y tratamos como fallo de red tras NETWORK_TIMEOUT_MS.
const NETWORK_TIMEOUT_MS = 10000;

function fetchWithTimeout(req, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(req, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function cacheFirst(req, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetchWithTimeout(req, NETWORK_TIMEOUT_MS);
    if (res && res.status === 200) cache.put(req, res.clone());
    return res;
  } catch {
    return cached || Response.error();
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetchWithTimeout(req, NETWORK_TIMEOUT_MS);
    // Guardamos copia solo de respuestas completas y exitosas.
    if (res && res.status === 200 && res.type === "basic") {
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    if (req.mode === "navigate") {
      const fallback =
        (await cache.match("/operaciones")) || (await cache.match("/dashboard"));
      if (fallback) return fallback;
    }
    return new Response(
      JSON.stringify({ offline: true, error: "Sin conexión" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ── Reenvío de la cola offline ────────────────────────────────────────────────
async function replayQueue() {
  const entries = (await getAllQueue()).sort((a, b) => a.ts - b.ts);

  for (const entry of entries) {
    try {
      const res = await fetch(entry.url, {
        method:      entry.method,
        headers:     entry.headers,
        body:        entry.body,
        credentials: "include",
      });
      if (res.ok) {
        await deleteQueue(entry.id);
      } else if (res.status >= 400 && res.status < 500) {
        // Error no recuperable (validación, etc.): descartar para no atorar la cola.
        await deleteQueue(entry.id);
      } else {
        // 5xx u otro: dejar en la cola y detener; se reintenta luego.
        break;
      }
    } catch {
      // Seguimos sin red: detener, se reintentará al reconectar.
      break;
    }
  }

  const remaining = (await getAllQueue()).length;
  await postToClients({ type: "SYNC_DONE", remaining });
}

async function postToClients(msg) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const c of clients) c.postMessage(msg);
}

// ── IndexedDB (misma BD que src/lib/offline-queue.ts) ─────────────────────────
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
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

function getAllQueue() {
  return openDB().then((db) => new Promise((resolve) => {
    const tx  = db.transaction("queue", "readonly");
    const req = tx.objectStore("queue").getAll();
    req.onsuccess = (e) => resolve(e.target.result || []);
    req.onerror   = () => resolve([]);
  })).catch(() => []);
}

function deleteQueue(id) {
  return openDB().then((db) => new Promise((resolve) => {
    const tx = db.transaction("queue", "readwrite");
    tx.objectStore("queue").delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => resolve();
  })).catch(() => {});
}
