import { prisma } from "@/lib/prisma";
import {
  IDEAS,
  ID_EQUIPO_PREFIX,
  ID_SERVICIO_PREFIX,
  ID_TIPOEVENTO_PREFIX,
  equipoToIdea,
  servicioToIdea,
  tipoEventoToIdea,
  getIdea,
  type IdeaContenido,
} from "./data";

// Contenido dinámico desde la plataforma REAL. Los pilares "equipo", "servicio"
// y "tipoevento" se nutren del catálogo (Equipo con foto de marco, TipoServicio,
// TipoEvento + Nicho) en lugar de las piezas de muestra escritas a mano. La info
// de la plataforma alimenta el contenido, pero como APOYO (ver los mapeadores en
// data.ts): nunca se vuelca una ficha técnica literal.
//
// Todo cacheado 10 min. Fallback por pilar: si una fuente no responde, se
// conservan las piezas de muestra de ese pilar en la matriz.

const TTL_MS = 10 * 60 * 1000;

let cacheEquipo: { ideas: IdeaContenido[]; ts: number } | null = null;
let cacheServicio: { ideas: IdeaContenido[]; ts: number } | null = null;
let cacheTipoEvento: { ideas: IdeaContenido[]; ts: number } | null = null;

// Mapea el slug del tipo (minúscula) al slug legacy que usa Nicho (mayúscula).
const LEGACY_NICHO: Record<string, string> = {
  musical: "MUSICAL",
  social: "SOCIAL",
  empresarial: "EMPRESARIAL",
  otro: "OTRO",
};

export async function equipoIdeas(): Promise<IdeaContenido[]> {
  if (cacheEquipo && Date.now() - cacheEquipo.ts < TTL_MS) return cacheEquipo.ideas;
  try {
    const equipos = await prisma.equipo.findMany({
      where: {
        activo: true,
        estado: "ACTIVO",
        noCotizable: false,
        imagenUrl: { not: null },
        tratamiento: "foto-marco",
      },
      orderBy: [{ categoria: { orden: "asc" } }, { precioRenta: "desc" }],
      include: { categoria: { select: { nombre: true } } },
    });
    const ideas = equipos.map((e) =>
      equipoToIdea({
        id: e.id,
        marca: e.marca,
        modelo: e.modelo,
        descripcion: e.descripcion,
        categoria: e.categoria?.nombre ?? "Equipo",
        voltaje: e.voltajeRequerido,
        amperaje: e.amperajeRequerido,
        imagenUrl: e.imagenUrl,
      }),
    );
    cacheEquipo = { ideas, ts: Date.now() };
    return ideas;
  } catch {
    return [];
  }
}

export async function servicioIdeas(): Promise<IdeaContenido[]> {
  if (cacheServicio && Date.now() - cacheServicio.ts < TTL_MS) return cacheServicio.ideas;
  try {
    const tipos = await prisma.tipoServicio.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
      include: { fotos: { orderBy: [{ destacada: "desc" }, { orden: "asc" }], take: 1 } },
    });
    const ideas = tipos.map((t) =>
      servicioToIdea({
        slug: t.slug,
        nombre: t.nombre,
        subtitulo: t.subtitulo,
        descripcion: t.descripcion,
        bg: t.fotos[0]?.url ?? null,
      }),
    );
    cacheServicio = { ideas, ts: Date.now() };
    return ideas;
  } catch {
    return [];
  }
}

export async function tipoEventoIdeas(): Promise<IdeaContenido[]> {
  if (cacheTipoEvento && Date.now() - cacheTipoEvento.ts < TTL_MS) return cacheTipoEvento.ideas;
  try {
    const [tipos, nichos] = await Promise.all([
      prisma.tipoEvento.findMany({
        where: { activo: true },
        orderBy: { orden: "asc" },
        include: { fotos: { orderBy: [{ destacada: "desc" }, { orden: "asc" }], take: 1 } },
      }),
      prisma.nicho.findMany({
        where: { activo: true },
        orderBy: { orden: "asc" },
        select: { tipoEventoSlug: true, nombre: true },
      }),
    ]);
    const nichosPorTipo = new Map<string, string[]>();
    for (const n of nichos) {
      const arr = nichosPorTipo.get(n.tipoEventoSlug) ?? [];
      arr.push(n.nombre);
      nichosPorTipo.set(n.tipoEventoSlug, arr);
    }
    const ideas = tipos.map((t) => {
      const legacy = LEGACY_NICHO[t.slug] ?? t.slug.toUpperCase();
      return tipoEventoToIdea({
        slug: t.slug,
        nombre: t.nombre,
        subtitulo: t.subtitulo,
        descripcion: t.descripcion,
        nichos: nichosPorTipo.get(legacy) ?? [],
        bg: t.fotos[0]?.url ?? null,
      });
    });
    cacheTipoEvento = { ideas, ts: Date.now() };
    return ideas;
  } catch {
    return [];
  }
}

// Pool completo para el planificador: las curadas + lo que responda la
// plataforma. Cada pilar dinámico que responda SUSTITUYE a sus piezas de muestra
// (para abarcar todo el catálogo); si una fuente no responde, se conserva la
// muestra de ese pilar.
export async function poolIdeas(): Promise<IdeaContenido[]> {
  const [equipos, servicios, tipos] = await Promise.all([equipoIdeas(), servicioIdeas(), tipoEventoIdeas()]);
  let pool = IDEAS;
  if (equipos.length) pool = [...pool.filter((i) => i.pilar !== "equipo"), ...equipos];
  if (servicios.length) pool = [...pool.filter((i) => i.pilar !== "servicio"), ...servicios];
  if (tipos.length) pool = [...pool.filter((i) => i.pilar !== "tipoevento"), ...tipos];
  return pool;
}

// Resuelve una idea por id: primero las curadas, luego el catálogo dinámico.
export async function ideaPorId(id: string | null | undefined): Promise<IdeaContenido | null> {
  const estatica = getIdea(id);
  if (estatica) return estatica;
  if (!id) return null;
  if (id.startsWith(ID_EQUIPO_PREFIX)) return (await equipoIdeas()).find((i) => i.id === id) ?? null;
  if (id.startsWith(ID_SERVICIO_PREFIX)) return (await servicioIdeas()).find((i) => i.id === id) ?? null;
  if (id.startsWith(ID_TIPOEVENTO_PREFIX)) return (await tipoEventoIdeas()).find((i) => i.id === id) ?? null;
  return null;
}
