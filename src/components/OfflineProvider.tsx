"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { getQueueSize, requestSync, clearQueue } from "@/lib/offline-queue";
import { WifiOff } from "lucide-react";

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

  // Verificación real de conectividad: un HEAD a /api/health. El Service Worker no
  // intercepta HEAD, así que siempre va a la red y nunca sirve caché. `navigator.onLine`
  // por sí solo da falsos "offline" ante cualquier parpadeo de red del SO.
  const verifyOnline = useCallback(async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch("/api/health", { method: "HEAD", cache: "no-store", signal: ctrl.signal });
      clearTimeout(t);
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    // Estado inicial: confirmar con un ping real en vez de confiar en navigator.onLine.
    verifyOnline().then(setOnline);
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

    const goOffline = async () => {
      // navigator dice "offline", pero suele ser falso positivo. Confirmar con un ping
      // real antes de mostrar el banner; si el servidor responde, seguimos online.
      if (await verifyOnline()) return;
      setOnline(false);
      refreshQueue();
    };

    // Una tarea recién encolada offline: refrescar el conteo del banner.
    const onQueueChanged = () => refreshQueue();

    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener("msp-queue-changed", onQueueChanged);

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
      window.removeEventListener("msp-queue-changed", onQueueChanged);
      if (swHandler && "serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", swHandler);
      }
    };
  }, [refreshQueue, verifyOnline]);

  // Mientras creemos estar offline, sondear cada 8s. Si el servidor responde,
  // reconectar solos aunque el navegador nunca dispare el evento "online"
  // (así el banner no se queda pegado tras un falso "sin conexión").
  useEffect(() => {
    if (online) return;
    const id = setInterval(async () => {
      if (await verifyOnline()) window.dispatchEvent(new Event("online"));
    }, 8000);
    return () => clearInterval(id);
  }, [online, verifyOnline]);

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

  async function discard() {
    await clearQueue();
    setSyncing(false);
    setQueueSize(0);
  }

  return { online, queueSize, syncing, justSynced, retry, discard };
}

// ── Banner visual ─────────────────────────────────────────────────────────────
export default function OfflineProvider() {
  const { online, queueSize, syncing, justSynced, retry, discard } = useOnlineStatus();
  const [updateReady, setUpdateReady] = useState(false);
  const pathname = usePathname();
  const lastPathname = useRef(pathname);

  // Hay un deploy nuevo y el usuario acaba de cambiar de página: es el momento
  // seguro para recargar (no pierde lo que estaba escribiendo) y tomar el build nuevo.
  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    if (updateReady) window.location.reload();
  }, [pathname, updateReady]);

  // Registrar el SW
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // El scriptURL lleva el build-id: cambia en cada deploy, así que el navegador
    // detecta un SW nuevo (si el archivo fuera idéntico, nunca actualizaría).
    const buildId = process.env.NEXT_PUBLIC_BUILD_ID || "dev";
    const swUrl = `/sw.js?v=${encodeURIComponent(buildId)}`;

    // NUNCA recargar a media tarea. Antes, al activarse un SW nuevo se hacía
    // window.location.reload() al instante: con varios deploys al día, la app se
    // "reiniciaba sola" al abrirla o mientras se escribía en un buscador/form.
    //
    // Ahora:
    // - Si la página ya trae el build del SW nuevo (lo normal al abrir la app:
    //   el HTML llega fresco de la red), no hay nada que actualizar.
    // - Si la página es de un build anterior, solo se marca la actualización y
    //   se aplica en la siguiente navegación del usuario (ver efecto de pathname).
    const onControllerChange = () => {
      const ctrl = navigator.serviceWorker.controller;
      let swBuild: string | null = null;
      try {
        swBuild = ctrl ? new URL(ctrl.scriptURL).searchParams.get("v") : null;
      } catch { /* noop */ }
      if (swBuild && swBuild === buildId) return;
      setUpdateReady(true);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let updateTimer: ReturnType<typeof setInterval> | undefined;

    navigator.serviceWorker.register(swUrl, { scope: "/" }).then((reg) => {
      // Buscar actualizaciones al cargar y cada minuto mientras la pestaña vive.
      reg.update().catch(() => {});
      updateTimer = setInterval(() => reg.update().catch(() => {}), 60_000);

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // Nuevo SW listo y ya había uno controlando → activar de inmediato.
            newWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    }).catch((err) => {
      console.warn("[SW] No se pudo registrar:", err);
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      if (updateTimer) clearInterval(updateTimer);
    };
  }, []);

  // Deploy nuevo pendiente: aviso discreto, el usuario decide cuándo recargar.
  if (updateReady && online && queueSize === 0 && !syncing && !justSynced) {
    return (
      <div
        style={{ zIndex: 9999, position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }}
        className="flex items-center justify-center"
      >
        <div
          className="flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-medium shadow-xl bg-neutral-900/90 text-neutral-200 border border-neutral-700/60"
          style={{ backdropFilter: "blur(12px)", pointerEvents: "auto" }}
        >
          <span>Hay una versión nueva</span>
          <button
            onClick={() => window.location.reload()}
            className="px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-semibold transition-colors"
          >
            Actualizar
          </button>
        </div>
      </div>
    );
  }

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
            <WifiOff strokeWidth={1.75} className="w-4 h-4" />
            <span>Sin conexión{queueSize > 0 ? ` · ${queueSize} cambio${queueSize !== 1 ? "s" : ""} pendiente${queueSize !== 1 ? "s" : ""}` : ""}</span>
          </>
        )}
        {online && syncing && (
          <>
            <span className="text-base animate-spin inline-block">↻</span>
            <span>Sincronizando cambios…</span>
            <button
              onClick={discard}
              className="ml-1 px-2 py-0.5 rounded-full bg-yellow-200/20 hover:bg-yellow-200/40 text-yellow-200 text-xs font-semibold transition-colors"
            >
              Descartar
            </button>
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
            <button
              onClick={discard}
              className="px-2 py-0.5 rounded-full bg-orange-200/10 hover:bg-orange-200/30 text-orange-300/70 text-xs font-semibold transition-colors"
            >
              Descartar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
