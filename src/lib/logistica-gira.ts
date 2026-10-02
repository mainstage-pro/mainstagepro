/**
 * Logística de la gira: crew, hospedaje con rooming, viajes y setlist.
 *
 * Aquí viven las formas de `include` y los candidatos de los selectores, porque
 * un route handler no puede exportar nada además de sus verbos y las páginas y
 * los endpoints tienen que devolver exactamente la misma fila: si el endpoint
 * trae un campo que la página no, la UI se queda a medias al refrescar.
 */
import { prisma } from "./prisma";

export const INCLUDE_CREW = {
  tecnico: { select: { id: true, nombre: true, celular: true } },
  persona: { select: { id: true, nombre: true, rol: true, telefono: true, email: true } },
  rolTecnico: { select: { id: true, nombre: true, disciplina: true } },
  show: { select: { id: true, fecha: true, ciudad: true } },
} as const;

export const INCLUDE_ROOMING = {
  crew: {
    select: {
      id: true,
      funcion: true,
      origen: true,
      nombreLibre: true,
      tecnico: { select: { nombre: true } },
      persona: { select: { nombre: true } },
    },
  },
  persona: { select: { id: true, nombre: true, rol: true } },
  hospedaje: { select: { id: true, hotelNombre: true, ciudad: true } },
  show: { select: { id: true, fecha: true, ciudad: true } },
} as const;

export const INCLUDE_HOSPEDAJE = {
  roomings: {
    orderBy: [{ orden: "asc" as const }, { createdAt: "asc" as const }],
    include: INCLUDE_ROOMING,
  },
};

export const INCLUDE_VIAJE = {
  crew: {
    select: {
      id: true,
      funcion: true,
      origen: true,
      nombreLibre: true,
      tecnico: { select: { nombre: true } },
      persona: { select: { nombre: true } },
    },
  },
  show: { select: { id: true, fecha: true, ciudad: true } },
} as const;

export const INCLUDE_SETLIST = {
  canciones: { orderBy: { orden: "asc" } },
  show: { select: { id: true, fecha: true, ciudad: true } },
} as const;

// ── Candidatos de los selectores ─────────────────────────────────────────────

export interface CandidatoPersona {
  /// Clave compuesta: el selector es uno solo pero la fila guarda en tecnicoId o
  /// en personaId según de dónde salga la persona.
  valor: string;
  etiqueta: string;
  grupo: string;
}

export interface CandidatosCrew {
  personas: CandidatoPersona[];
  roles: { id: string; nombre: string; disciplina: string | null }[];
}

/**
 * Con quién se puede armar el crew: los técnicos activos de la casa y el elenco
 * del artista de esta gira. El valor viaja prefijado (`tecnico:` / `persona:`)
 * para que un mismo Combobox sirva para los dos orígenes.
 */
export async function candidatosCrew(giraId: string): Promise<CandidatosCrew> {
  const gira = await prisma.gira.findUnique({
    where: { id: giraId },
    select: { artistaId: true, artista: { select: { nombre: true } } },
  });

  const [tecnicos, personas, roles] = await Promise.all([
    prisma.tecnico.findMany({
      where: { activo: true },
      orderBy: [{ prioridad: "desc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, rol: { select: { nombre: true } } },
    }),
    gira
      ? prisma.artistaPersona.findMany({
          where: { artistaId: gira.artistaId, activo: true },
          orderBy: [{ orden: "asc" }, { nombre: "asc" }],
          select: { id: true, nombre: true, rol: true, instrumento: true },
        })
      : Promise.resolve([]),
    prisma.rolTecnico.findMany({
      where: { activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, disciplina: true },
    }),
  ]);

  return {
    personas: [
      ...personas.map((p) => ({
        valor: `persona:${p.id}`,
        etiqueta: p.instrumento ? `${p.nombre} — ${p.instrumento}` : p.nombre,
        grupo: gira?.artista.nombre ?? "Del artista",
      })),
      ...tecnicos.map((t) => ({
        valor: `tecnico:${t.id}`,
        etiqueta: t.rol?.nombre ? `${t.nombre} — ${t.rol.nombre}` : t.nombre,
        grupo: "Técnicos de la casa",
      })),
    ],
    roles,
  };
}

/// Las claves compuestas de los selectores viven en `@/lib/giras` porque las
/// usan también los componentes de cliente, y este módulo toca la BD.
