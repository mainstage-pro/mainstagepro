"use client";

// Hidrata en runtime las etiquetas/colores del maestro de áreas ("Áreas y
// organización" → PTArea) y las fusiona sobre los defaults estáticos de
// src/lib/areas.ts. Fail-safe: si el fetch falla, se usan los defaults.

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  areaColor as areaColorBase,
  areaLabel as areaLabelBase,
  AREA_ORDEN,
  type AreaOverrides,
} from "@/lib/areas";

type MasterArea = {
  id: string;
  codigo: string | null;
  nombre: string;
  color: string | null;
  orden: number;
  transversal: boolean;
};

type AreasContextValue = {
  overrides: AreaOverrides;
  master: MasterArea[];
  label: (area?: string | null) => string;
  color: (area?: string | null) => string;
  // Orden de códigos según el maestro (si aporta códigos) o el canónico estático.
  orden: string[];
  loaded: boolean;
};

const AreasContext = createContext<AreasContextValue | null>(null);

export function AreasProvider({ children }: { children: React.ReactNode }) {
  const [master, setMaster] = useState<MasterArea[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancel = false;
    fetch("/api/areas")
      .then((r) => (r.ok ? r.json() : { areas: [] }))
      .then((d) => {
        if (cancel) return;
        setMaster(Array.isArray(d?.areas) ? d.areas : []);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancel) setLoaded(true);
      });
    return () => {
      cancel = true;
    };
  }, []);

  const value = useMemo<AreasContextValue>(() => {
    const overrides: AreaOverrides = {};
    for (const a of master) {
      const code = (a.codigo || "").toUpperCase();
      if (!code) continue;
      overrides[code] = { nombre: a.nombre, color: a.color };
    }
    const orden = master.filter((a) => a.codigo).map((a) => a.codigo!.toUpperCase());
    return {
      overrides,
      master,
      loaded,
      orden: orden.length ? orden : AREA_ORDEN,
      label: (area) => areaLabelBase(area, overrides),
      color: (area) => areaColorBase(area, overrides),
    };
  }, [master, loaded]);

  return <AreasContext.Provider value={value}>{children}</AreasContext.Provider>;
}

// Hook seguro: si no hay provider (p. ej. fuera del dashboard), usa defaults estáticos.
export function useAreas(): AreasContextValue {
  const ctx = useContext(AreasContext);
  if (ctx) return ctx;
  return {
    overrides: {},
    master: [],
    loaded: false,
    orden: AREA_ORDEN,
    label: (area) => areaLabelBase(area),
    color: (area) => areaColorBase(area),
  };
}
