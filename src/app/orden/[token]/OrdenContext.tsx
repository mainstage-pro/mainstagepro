"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { OrdenProduccion } from "@/lib/orden-produccion";

type Estado = {
  orden: OrdenProduccion | null;
  cargando: boolean;
  error: string | null;
  token: string;
  recargar: () => Promise<void>;
};

const Ctx = createContext<Estado | null>(null);

export function useOrden() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOrden fuera de OrdenProvider");
  return ctx;
}

/** La orden es un solo JSON: se pide una vez y todas las secciones lo leen. */
export function OrdenProvider({ token, children }: { token: string; children: React.ReactNode }) {
  const [orden, setOrden] = useState<OrdenProduccion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    try {
      const res = await fetch(`/api/orden/${token}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No pudimos abrir la orden");
        setOrden(null);
      } else {
        setOrden(data.orden);
        setError(null);
      }
    } catch {
      setError("Sin conexión");
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => { void recargar(); }, [recargar]);

  // El equipo en sitio trabaja con la pantalla abierta: si el coordinador cambia
  // algo, debe aparecer sin que nadie recargue a mano.
  useEffect(() => {
    const cada = setInterval(() => { void recargar(); }, 60_000);
    const alVolver = () => { if (document.visibilityState === "visible") void recargar(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(cada);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [recargar]);

  return <Ctx.Provider value={{ orden, cargando, error, token, recargar }}>{children}</Ctx.Provider>;
}
