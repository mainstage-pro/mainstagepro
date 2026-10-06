/**
 * Lectura de los momentos del día del show.
 *
 * Antes cada documento leía su hora de una columna propia de `GiraShow`
 * (`horaLoadIn`, `horaShow`, `curfew`…). Ahora el día es un renglón por momento
 * en `ShowMomento` y la hora se busca por `llave`: ese es el único lugar donde
 * "LOAD_IN" significa algo. El `find` vive aquí una vez en vez de repetirse en
 * los seis lectores que lo necesitan.
 *
 * El módulo es puro a propósito —no toca Prisma— para que lo puedan importar
 * igual un route handler, un generador de PDF y un componente de cliente.
 */

import { MOMENTOS_PLANTILLA, MOMENTOS_SUGERIDOS, type MomentoPlantilla } from "./giras";

/// Lo mínimo que necesita un lector para ubicar una hora. Cualquier fila de
/// `ShowMomento` cumple esta forma.
export interface MomentoConLlave {
  llave: string | null;
  hora: string | null;
  horaFin: string | null;
}

/// Forma de `select` para traer un momento completo desde Prisma. Las páginas y
/// los endpoints tienen que devolver la misma fila o la UI se queda a medias al
/// refrescar.
export const SELECT_MOMENTO = {
  id: true,
  llave: true,
  titulo: true,
  hora: true,
  horaFin: true,
  tipo: true,
  esAncla: true,
  responsable: true,
  lugar: true,
  notas: true,
  orden: true,
} as const;

/// Las dos listas de plantilla juntas, indexadas por llave: la de siempre (el
/// esqueleto) y la de los momentos que aparecen seguido.
export const PLANTILLA_POR_LLAVE: Record<string, MomentoPlantilla> = Object.fromEntries(
  [...MOMENTOS_PLANTILLA, ...MOMENTOS_SUGERIDOS].map((m) => [m.llave, m]),
);

export const LLAVES_ANCLA: string[] = MOMENTOS_PLANTILLA.map((m) => m.llave);

/// ¿Esta llave es parte del esqueleto que se ve en la ficha del show?
export function esLlaveAncla(llave: string | null | undefined): boolean {
  return !!llave && LLAVES_ANCLA.includes(llave);
}

/// ¿El momento dura un rato (soundcheck) o es un instante (curfew)? Lo dice la
/// plantilla; un momento escrito a mano se asume rango porque es lo más común.
export function esRango(llave: string | null | undefined): boolean {
  if (!llave) return true;
  return PLANTILLA_POR_LLAVE[llave]?.rango ?? true;
}

export function momentoDe<T extends { llave: string | null }>(momentos: T[], llave: string): T | null {
  return momentos.find((m) => m.llave === llave) ?? null;
}

export function horaDe(momentos: MomentoConLlave[], llave: string): string | null {
  return momentoDe(momentos, llave)?.hora ?? null;
}

export function horaFinDe(momentos: MomentoConLlave[], llave: string): string | null {
  return momentoDe(momentos, llave)?.horaFin ?? null;
}

/// El esqueleto del día en la forma en que lo piden los documentos. `fin` es la
/// hora en que termina el show, que ahora es el `horaFin` del propio momento
/// SHOW y no una columna aparte.
export interface HorasAncla {
  loadIn: string | null;
  montaje: string | null;
  lineCheck: string | null;
  soundcheck: string | null;
  doors: string | null;
  show: string | null;
  fin: string | null;
  loadOut: string | null;
  curfew: string | null;
}

export function horasAncla(momentos: MomentoConLlave[]): HorasAncla {
  return {
    loadIn: horaDe(momentos, "LOAD_IN"),
    montaje: horaDe(momentos, "MONTAJE"),
    lineCheck: horaDe(momentos, "LINE_CHECK"),
    soundcheck: horaDe(momentos, "SOUNDCHECK"),
    doors: horaDe(momentos, "DOORS"),
    show: horaDe(momentos, "SHOW"),
    fin: horaFinDe(momentos, "SHOW"),
    loadOut: horaDe(momentos, "LOAD_OUT"),
    curfew: horaDe(momentos, "CURFEW"),
  };
}

/// Los datos de creación del esqueleto. Se siembra la primera vez que alguien
/// abre el show: sin horas, porque la plantilla dice qué pasa en el día, no
/// cuándo.
export function datosSiembraAncla(showId: string, llaves?: string[]) {
  const pide = llaves ? new Set(llaves) : null;
  // El orden sale de la posición en la plantilla, no del recorte: si se resiembra
  // un solo momento cae en su lugar del día y no al final.
  return MOMENTOS_PLANTILLA.map((p, i) => ({ p, orden: (i + 1) * 10 }))
    .filter(({ p }) => !pide || pide.has(p.llave))
    .map(({ p, orden }) => ({
      showId,
      llave: p.llave,
      titulo: p.titulo,
      tipo: p.tipo,
      esAncla: true,
      orden,
    }));
}
