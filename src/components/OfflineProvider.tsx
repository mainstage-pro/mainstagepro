"use client";

import { useEffect, useState, useCallback } from "react";
import { getQueueSize, requestSync } from "@/lib/offline-queue";

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  const [queueSize, setQueueSize] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  const refreshQueue = useCallback(async () => {
    const size = await getQueueSize();
    setQueueSize(size);
  }, []);

  useEffect(() => {
    // Estado inicial
    setOnline(navigator.onLine);
    refreshQueue();

    const goOnline = () => {
      setOnline(true);
      // Dar un momento para que la red estabilice
      setTimeout(() => {
        refreshQueue().then(async () => {
          const size = await getQueueSize();
          if (size > 0) {
            setSyncing(true);
            requestSync();
          }
        });
      }, 800);
    };

    const goOffline = () => {
      setOnline(false);
      refreshQueue();
    };

    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);

    // Escuchar mensajes del Service Worker
    let swHandler: ((event: MessageEvent) => void) | null = null;
    if ("serviceWorker" in navigator) {
      swHandler = (event: MessageEvent) => {
        if (event.data?.type === "QUEUED") {
          refreshQueue();
        }
        if (event.data?.type === "SYNC_DONE") {
          setSyncing(false);
          refreshQueue().then(async () => {
            const size = await getQueueSize();
            if (size === 0) {
              setJustSynced(true);
              setTimeout(() => setJustSynced(false), 4000);
            }
          });
        }
      };
      navigator.serviceWorker.addEventListener("message", swHandler);
    }

    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
      if (swHandler && "serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", swHandler);
      }
    };
  }, [refreshQueue]);

  const syncWatchdog = useCallback(() => {
    const t = setTimeout(() => {
      setSyncing(false);
      refreshQueue();
    }, 30_000);
    return t;
  }, [refreshQueue]);

  function retry() {
    if (syncing) return;
    setSyncing(true);
    requestSync();
    const t = syncWatchdog();
    return () => clearTimeout(t);
  }

  return { online, queueSize, syncing, justSynced, retry };
}

// ── Banner visual ─────────────────────────────────────────────────────────────
export default function OfflineProvider() {
  const { online, queueSize, syncing, justSynced, retry } = useOnlineStatus();

  // Registrar el SW
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((reg) => {
        // Escuchar actualizaciones del SW
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // Nuevo SW disponible — activar inmediatamente
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          }
        });
      }).catch((err) => {
        console.warn("[SW] No se pudo registrar:", err);
      });
    }
  }, []);

  // No mostrar nada si estamos online y no hay cola ni sync
  if (online && queueSize === 0 && !syncing && !justSynced) return null;

  return (
    <div
      style={{ zIndex: 9999, position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }}
      className="flex items-center justify-center"
    >
      <div
        className={`
          flex items-center gap-2.5 px-4 py-2.5 rounded-full text-sm font-medium shadow-xl
          transition-all duration-500
          ${!online
            ? "bg-red-900/90 text-red-200 border border-red-700/60"
            : syncing
            ? "bg-yellow-900/90 text-yellow-200 border border-yellow-700/60"
            : justSynced
            ? "bg-green-900/90 text-green-200 border border-green-700/60"
            : "bg-orange-900/90 text-orange-200 border border-orange-700/60"
          }
        `}
        style={{ backdropFilter: "blur(12px)", pointerEvents: "auto" }}
      >
        {!online && (
          <>
            <span className="text-base">📡</span>
            <span>Sin conexión{queueSize > 0 ? ` · ${queueSize} cambio${queueSize !== 1 ? "s" : ""} pendiente${queueSize !== 1 ? "s" : ""}` : ""}</span>
          </>
        )}
        {online && syncing && (
          <>
            <span className="text-base animate-spin inline-block">↻</span>
            <span>Sincronizando cambios…</span>
          </>
        )}
        {online && !syncing && justSynced && (
          <>
            <span className="text-base">✓</span>
            <span>Todo sincronizado</span>
          </>
        )}
        {online && !syncing && !justSynced && queueSize > 0 && (
          <>
            <span className="text-base">⏳</span>
            <span>{queueSize} cambio{queueSize !== 1 ? "s" : ""} pendiente{queueSize !== 1 ? "s" : ""} de sincronizar</span>
            <button
              onClick={retry}
              className="ml-1 px-2 py-0.5 rounded-full bg-orange-200/20 hover:bg-orange-200/40 text-orange-200 text-xs font-semibold transition-colors"
            >
              Reintentar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
