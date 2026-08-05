// Cliente de la cola offline — interfaz para que los componentes interactúen con el SW

const DB_NAME    = "msp-offline-queue";
const DB_VERSION = 1;

export interface QueueEntry {
  id?: number;
  url: string;
  method: string;
  body: string;
  headers: Record<string, string>;
  ts: number;
  // Metadatos opcionales para la UI optimista (no se envían al servidor).
  kind?: string;          // p.ej. "tarea" — permite recuperarlas al recargar offline
  optimistic?: unknown;   // objeto a mostrar/fusionar mientras no sincroniza
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("queue")) {
        const store = db.createObjectStore("queue", { keyPath: "id", autoIncrement: true });
        store.createIndex("ts", "ts", { unique: false });
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror   = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
}

export async function getQueueSize(): Promise<number> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction("queue", "readonly");
      const req = tx.objectStore("queue").count();
      req.onsuccess = (e) => resolve((e.target as IDBRequest<number>).result);
      req.onerror   = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

// Encolar una petición para reenviarla cuando vuelva la conexión.
export async function enqueueRequest(
  entry: Omit<QueueEntry, "id" | "ts"> & { ts?: number }
): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("queue", "readwrite");
    tx.objectStore("queue").add({ ...entry, ts: entry.ts ?? Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror    = (e) => reject((e.target as IDBRequest).error);
  });
  // Avisar a la UI (banner + listas) que la cola cambió.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("msp-queue-changed"));
  }
}

// Recuperar los objetos optimistas de tipo "tarea" aún sin sincronizar, para
// fusionarlos en la lista al recargar la página sin conexión.
export async function getPendingTareas(): Promise<unknown[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx  = db.transaction("queue", "readonly");
      const req = tx.objectStore("queue").getAll();
      req.onsuccess = (e) => {
        const all = ((e.target as IDBRequest<QueueEntry[]>).result || []);
        resolve(all.filter((x) => x.kind === "tarea" && x.optimistic).map((x) => x.optimistic));
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// Forzar sincronización via SW
export function requestSync() {
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "SYNC_NOW" });
  }
}

// Limpiar toda la cola (descarta cambios pendientes)
export async function clearQueue(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("queue", "readwrite");
      tx.objectStore("queue").clear();
      tx.oncomplete = () => resolve();
      tx.onerror    = (e) => reject((e.target as IDBRequest).error);
    });
  } catch {
    // ignorar
  }
}
