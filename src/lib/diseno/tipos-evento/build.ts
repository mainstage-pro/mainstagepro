import { prisma } from "@/lib/prisma";
import { TIPOS_EVENTO_MUESTRA, type TiposEventoData, type TipoEventoSlide } from "./data";
import { ARROBA, TELEFONO } from "../servicios/data";

// Arma la serie de Tipos de evento desde el catálogo real (TipoEvento + Nicho +
// fotos). Si el catálogo no está sembrado o falla, cae en la muestra. Cacheado.
let cache: { data: TiposEventoData; ts: number } | null = null;
const TTL_MS = 10 * 60 * 1000;

// Mapea el slug del tipo (minúscula) al slug legacy que usa Nicho (mayúscula).
const LEGACY: Record<string, string> = { musical: "MUSICAL", social: "SOCIAL", empresarial: "EMPRESARIAL", otro: "OTRO" };

export async function buildTiposEventoData(): Promise<TiposEventoData> {
  if (cache && Date.now() - cache.ts < TTL_MS) return cache.data;
  try {
    const [tipos, nichos] = await Promise.all([
      prisma.tipoEvento.findMany({
        where: { activo: true },
        orderBy: { orden: "asc" },
        include: { fotos: { orderBy: [{ destacada: "desc" }, { orden: "asc" }], take: 1 } },
      }),
      prisma.nicho.findMany({ where: { activo: true }, orderBy: { orden: "asc" }, select: { tipoEventoSlug: true, nombre: true } }),
    ]);
    if (tipos.length === 0) return TIPOS_EVENTO_MUESTRA;

    const nichosPorTipo = new Map<string, string[]>();
    for (const n of nichos) {
      const arr = nichosPorTipo.get(n.tipoEventoSlug) ?? [];
      arr.push(n.nombre);
      nichosPorTipo.set(n.tipoEventoSlug, arr);
    }

    const fallbackBgs = TIPOS_EVENTO_MUESTRA.tipos.map((t) => t.bg);
    const tiposSlides: TipoEventoSlide[] = tipos.map((t, i) => {
      const muestra = TIPOS_EVENTO_MUESTRA.tipos[i];
      const legacy = LEGACY[t.slug] ?? t.slug.toUpperCase();
      const nichosTipo = nichosPorTipo.get(legacy) ?? muestra?.nichos ?? [];
      return {
        id: `tipo-${t.slug}`,
        badge: `EVENTOS ${t.nombre.toUpperCase().replace(/^EVENTOS?\s+/, "")}`,
        label: t.nombre,
        tituloGold: "EVENTOS",
        tituloWhite: t.nombre.toUpperCase().replace(/^EVENTOS?\s+/, ""),
        descripcion: t.subtitulo || t.descripcion?.split(". ")[0] || muestra?.descripcion || "",
        nichos: nichosTipo.slice(0, 6),
        bg: t.fotos[0]?.url || fallbackBgs[i % fallbackBgs.length],
      };
    });

    const data: TiposEventoData = {
      portada: TIPOS_EVENTO_MUESTRA.portada,
      tipos: tiposSlides,
      cierre: { ...TIPOS_EVENTO_MUESTRA.cierre, telefono: TELEFONO, arroba: ARROBA },
    };
    cache = { data, ts: Date.now() };
    return data;
  } catch {
    return TIPOS_EVENTO_MUESTRA;
  }
}
