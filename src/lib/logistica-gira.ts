/**
 * Logística de la gira: crew, hospedaje con rooming, viajes y setlist.
 *
 * Aquí viven las formas de `include` y los candidatos de los selectores, porque
 * un route handler no puede exportar nada además de sus verbos y las páginas y
 * los endpoints tienen que devolver exactamente la misma fila: si el endpoint
 * trae un campo que la página no, la UI se queda a medias al refrescar.
 */
import type { Prisma } from "@prisma/client";
import { bloquesNormalizados } from "./giras";
import { prisma } from "./prisma";

const ORDEN_CANCIONES = [{ orden: "asc" }, { createdAt: "asc" }] as Prisma.GiraSetlistCancionOrderByWithRelationInput[];

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
  // El desempate por createdAt importa desde que una fecha puede recibir
  // renglones del base después de haber reordenado los suyos: el sembrado llega
  // con el orden que traía en el base y puede empatar con uno de la casa.
  canciones: { orderBy: ORDEN_CANCIONES },
  show: { select: { id: true, fecha: true, ciudad: true } },
} as const;

type CancionDelBase = Awaited<ReturnType<typeof cancionesDelBase>>[number];

async function cancionesDelBase(giraId: string) {
  const base = await prisma.giraSetlist.findFirst({
    where: { giraId, esBase: true },
    include: { canciones: { orderBy: ORDEN_CANCIONES } },
  });
  return base?.canciones ?? [];
}

/// La copia que se guarda en la fecha. `soloEnShows` no viaja: a qué noches va
/// un renglón se decide en el base y nada más ahí.
function copiaDelBase(c: CancionDelBase, setlistId: string) {
  return {
    setlistId,
    origenId: c.id,
    tipo: c.tipo,
    orden: c.orden,
    titulo: c.titulo,
    artistaInvitado: c.artistaInvitado,
    bloqueNombre: c.bloqueNombre,
    bloqueColor: c.bloqueColor,
    duracionSeg: c.duracionSeg,
    tonalidad: c.tonalidad,
    bpm: c.bpm,
    conTrack: c.conTrack,
    notasAudio: c.notasAudio,
    notasLuces: c.notasLuces,
    notasVideo: c.notasVideo,
    cambioInstrumento: c.cambioInstrumento,
    notas: c.notas,
  };
}

/**
 * El setlist de una fecha, sembrado del base de la gira cada vez que alguien
 * abre su pestaña. El base es el repertorio completo y manda sobre qué va esa
 * noche; la fecha manda sobre cómo va: ahí se mueve el orden, se corrige el
 * tono o se escribe el cue, y la siembra no pisa nada de eso.
 *
 * Siembra lo que le toca y todavía no tiene, y se lleva lo que el base dejó de
 * mandarle a esta fecha. Lo que nació en la noche (sin `origenId`) ni se toca.
 */
export async function asegurarSetlistDeFecha(giraId: string, showId: string) {
  const [propio, delBase] = await Promise.all([
    prisma.giraSetlist.findFirst({
      where: { giraId, showId },
      orderBy: { createdAt: "asc" },
      include: INCLUDE_SETLIST,
    }),
    cancionesDelBase(giraId),
  ]);

  const leToca = (c: CancionDelBase) => c.soloEnShows.length === 0 || c.soloEnShows.includes(showId);

  if (!propio) {
    const base = await prisma.giraSetlist.findFirst({
      where: { giraId, esBase: true },
      select: { duracionMin: true, notas: true },
    });
    const setlist = await prisma.giraSetlist.create({
      data: {
        giraId,
        showId,
        nombre: "Setlist de esta fecha",
        duracionMin: base?.duracionMin ?? null,
        notas: base?.notas ?? null,
      },
    });
    const siembra = delBase.filter(leToca);
    if (siembra.length) {
      await prisma.giraSetlistCancion.createMany({ data: siembra.map((c) => copiaDelBase(c, setlist.id)) });
    }
    return prisma.giraSetlist.findUniqueOrThrow({ where: { id: setlist.id }, include: INCLUDE_SETLIST });
  }

  const porOrigen = new Map(delBase.map((c) => [c.id, c]));
  const yaSembradas = new Set(propio.canciones.map((c) => c.origenId).filter(Boolean));

  const faltantes = delBase.filter((c) => leToca(c) && !yaSembradas.has(c.id));
  const sobrantes = propio.canciones.filter((c) => {
    const origen = c.origenId ? porOrigen.get(c.origenId) : null;
    return !!origen && !leToca(origen);
  });

  if (!faltantes.length && !sobrantes.length) return propio;

  await prisma.$transaction([
    ...(sobrantes.length
      ? [prisma.giraSetlistCancion.deleteMany({ where: { id: { in: sobrantes.map((c) => c.id) } } })]
      : []),
    ...(faltantes.length
      ? [prisma.giraSetlistCancion.createMany({ data: faltantes.map((c) => copiaDelBase(c, propio.id)) })]
      : []),
  ]);

  return prisma.giraSetlist.findUniqueOrThrow({ where: { id: propio.id }, include: INCLUDE_SETLIST });
}

/**
 * Pone a todas las fechas en el orden del base. Es un acto explícito porque la
 * fecha manda sobre cómo va el show: la siembra nunca mueve lo que ya está ahí,
 * así que un base reordenado después de que alguien abrió la fecha solo llega
 * por aquí. Siembra de paso la fecha que todavía no tenía setlist.
 *
 * Lo que nació en la noche no está en el base y por eso no tiene lugar propio:
 * se queda pegado al renglón que hoy lo precede.
 */
export async function bajarOrdenDelBase(giraId: string) {
  const [shows, base] = await Promise.all([
    prisma.giraShow.findMany({ where: { giraId }, orderBy: { fecha: "asc" }, select: { id: true } }),
    cancionesDelBase(giraId),
  ]);
  if (!base.length) return { fechas: 0, renglones: 0 };

  const posicionEnBase = new Map(base.map((c, i) => [c.id, i]));
  let fechas = 0;
  let renglones = 0;

  for (const show of shows) {
    const setlist = await asegurarSetlistDeFecha(giraId, show.id);

    let ancla = -1;
    let pegado = 0;
    const conClave = setlist.canciones.map((c) => {
      const pos = c.origenId ? posicionEnBase.get(c.origenId) : undefined;
      if (pos === undefined) return { c, lugar: ancla, pegado: ++pegado };
      ancla = pos;
      pegado = 0;
      return { c, lugar: pos, pegado: 0 };
    });
    conClave.sort((a, b) => a.lugar - b.lugar || a.pegado - b.pegado);

    const finales = conClave.map((x) => x.c);
    const bloques = new Map(bloquesNormalizados(finales).map((b) => [b.id, b]));

    const cambios = finales.flatMap((c, i) => {
      const b = bloques.get(c.id);
      if (c.orden === i * 10 && !b) return [];
      return [
        prisma.giraSetlistCancion.update({
          where: { id: c.id },
          data: b ? { orden: i * 10, bloqueNombre: b.bloqueNombre, bloqueColor: b.bloqueColor } : { orden: i * 10 },
        }),
      ];
    });
    if (!cambios.length) continue;

    await prisma.$transaction(cambios);
    fechas++;
    renglones += cambios.length;
  }

  return { fechas, renglones };
}

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
