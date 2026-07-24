"use client";

import { useEffect, useState } from "react";
import { etapasInternasDe } from "@/lib/etapasInternas";

export type SubetapaUI = { key: string; label: string };
type Estructura = Record<string, SubetapaUI[]>;

// Caché a nivel de módulo: la estructura del proceso cambia poco, así que se
// descarga una sola vez y todas las barras/selectores la comparten.
let cache: Estructura | null = null;
let inflight: Promise<Estructura> | null = null;

function fetchEstructura(): Promise<Estructura> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/api/proceso/estructura")
      .then((r) => (r.ok ? r.json() : { estructura: {} }))
      .then((d) => {
        cache = (d?.estructura as Estructura) ?? {};
        return cache;
      })
      .catch(() => {
        cache = {};
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

// Devuelve las subetapas de una etapa desde la BD; mientras carga (o si falla)
// usa la estructura base estática como respaldo, para que la UI nunca quede vacía.
export function useSubetapas(etapa: string): SubetapaUI[] {
  const [estructura, setEstructura] = useState<Estructura | null>(cache);

  useEffect(() => {
    let vivo = true;
    fetchEstructura().then((e) => { if (vivo) setEstructura(e); });
    return () => { vivo = false; };
  }, []);

  const dinamicas = estructura?.[etapa];
  if (dinamicas && dinamicas.length > 0) return dinamicas;
  return etapasInternasDe(etapa).map((p) => ({ key: p.key, label: p.label }));
}
