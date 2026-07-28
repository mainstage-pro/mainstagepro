"use client";
import { useEffect, useState } from "react";

// Consumo cliente de la fuente maestra (Tipos de evento) para héroes y tarjetas
// de las presentaciones. Las destacadas ya vienen primero desde el endpoint.
export type MaterialTipoEvento = {
  slug: string;
  nombre: string;
  subtitulo: string;
  cover: string;
  fotos: { url: string; caption: string }[];
  destacadas: { url: string; caption: string }[];
};

type FotoApi = { url: string; caption: string | null; destacada: boolean };
type TipoApi = { slug: string; nombre: string; subtitulo: string | null; fotos: FotoApi[] };

export function useTiposEventoMaterial() {
  const [tipos, setTipos] = useState<MaterialTipoEvento[]>([]);

  useEffect(() => {
    let ok = true;
    fetch("/api/tipos-evento/publico")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!ok || !d?.tipos) return;
        const mapped: MaterialTipoEvento[] = (d.tipos as TipoApi[])
          .filter((t) => (t.fotos?.length ?? 0) > 0)
          .map((t) => ({
            slug: t.slug,
            nombre: t.nombre,
            subtitulo: t.subtitulo || "",
            cover: t.fotos[0].url,
            fotos: t.fotos.map((f) => ({ url: f.url, caption: f.caption || "" })),
            destacadas: t.fotos.filter((f) => f.destacada).map((f) => ({ url: f.url, caption: f.caption || "" })),
          }));
        setTipos(mapped);
      })
      .catch(() => {});
    return () => { ok = false; };
  }, []);

  // Portada (mejor destacada) del tipo indicado; si aún no cargó, usa el fallback.
  function coverPorSlug(slug: string, fallback: string): string {
    const t = tipos.find((x) => x.slug === slug);
    return t?.cover || fallback;
  }

  return { tipos, coverPorSlug };
}
