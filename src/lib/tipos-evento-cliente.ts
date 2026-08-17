"use client";
import { useEffect, useState } from "react";
import { mapTiposMaterial, type MaterialTipoEvento } from "@/lib/tipos-evento-material";

// Consumo cliente de la fuente maestra (Tipos de evento) para héroes y tarjetas
// de las presentaciones. Las destacadas ya vienen primero desde el endpoint.
export type { MaterialTipoEvento };

type FotoApi = { url: string; caption: string | null; destacada: boolean };
type TipoApi = { slug: string; nombre: string; subtitulo: string | null; fotos: FotoApi[] };

// `initial` viene del servidor (getTiposEventoMaterial) para que la primera
// pintura ya traiga la portada elegida. Sin sembrar, la vista parpadea: se ve la
// imagen local de fallback hasta que termina el fetch y la reemplaza.
export function useTiposEventoMaterial(initial: MaterialTipoEvento[] = []) {
  const [tipos, setTipos] = useState<MaterialTipoEvento[]>(initial);

  useEffect(() => {
    if (initial.length) return;
    let ok = true;
    fetch("/api/tipos-evento/publico")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!ok || !d?.tipos) return;
        setTipos(mapTiposMaterial(d.tipos as TipoApi[]));
      })
      .catch(() => {});
    return () => { ok = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Portada (mejor destacada) del tipo indicado; si aún no cargó, usa el fallback.
  function coverPorSlug(slug: string, fallback: string): string {
    const t = tipos.find((x) => x.slug === slug);
    return t?.cover || fallback;
  }

  return { tipos, coverPorSlug };
}
