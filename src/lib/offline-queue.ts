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
