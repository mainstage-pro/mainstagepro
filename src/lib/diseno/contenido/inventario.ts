import { prisma } from "@/lib/prisma";
import { IDEAS, ID_EQUIPO_PREFIX, equipoToIdea, getIdea, type IdeaContenido } from "./data";

// Ideas del pilar "equipo" tomadas del inventario REAL (Equipo con foto de marco).
// Abarca TODO el inventario elegible; a lo largo del calendario las piezas de
// equipo se van rotando (una por vez) para cubrir el catálogo completo.
// Cacheado 10 min. Fallback: si el inventario no responde, se usan las 3 piezas
// de "equipo" escritas a mano en la matriz.

let cache: { ideas: IdeaContenido[]; ts: number } | null = null;
const TTL_MS = 10 * 60 * 1000;

export async function equipoIdeas(): Promise<IdeaContenido[]> {
  if (cache && Date.now() - cache.ts < TTL_MS) return cache.ideas;
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
    cache = { ideas, ts: Date.now() };
    return ideas;
  } catch {
    return [];
  }
}

// Pool completo para el planificador: las curadas + el inventario real. Si el
// inventario responde, sus piezas SUSTITUYEN a las 3 de "equipo" hechas a mano
// (para abarcar todo el catálogo); si no, se conservan las de muestra.
export async function poolIdeas(): Promise<IdeaContenido[]> {
  const dinamicas = await equipoIdeas();
  if (dinamicas.length === 0) return IDEAS;
  const base = IDEAS.filter((i) => i.pilar !== "equipo");
  return [...base, ...dinamicas];
}

// Resuelve una idea por id: primero las curadas, luego el inventario dinámico.
export async function ideaPorId(id: string | null | undefined): Promise<IdeaContenido | null> {
  const estatica = getIdea(id);
  if (estatica) return estatica;
  if (id && id.startsWith(ID_EQUIPO_PREFIX)) {
    return (await equipoIdeas()).find((i) => i.id === id) ?? null;
  }
  return null;
}
