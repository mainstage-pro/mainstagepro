/**
 * Los canales de consola de una fecha concreta.
 *
 * El rider maestro del artista (`ArtistaRiderCanal`) es el mismo para toda la
 * gira y aquí NO SE TOCA NUNCA: es solo lectura. Lo que esta fecha agrega vive
 * en `ShowCanal` y se numera a continuación — si el rider llega al input 32, el
 * micrófono del telonero es el 33. Las entradas y las salidas llevan secuencias
 * separadas porque son dos lados distintos de la consola.
 *
 * Toda la numeración se resuelve en el servidor: el cliente no la calcula ni la
 * manda, solo pinta lo que este módulo devuelve. Así no hay dos opiniones sobre
 * cuál es el canal 33.
 */

import { prisma } from "@/lib/prisma";
import {
  REQUERIMIENTOS_INVITADO,
  ROLES_INVITADO,
  SOPORTES_MIC,
  TIPOS_SALIDA,
  canalesDeSalida,
  etiquetaCanalSalida,
  type RequerimientoInvitado,
} from "@/lib/giras";

export const TIPOS_CANAL = ["INPUT", "OUTPUT"] as const;
export type TipoCanal = (typeof TIPOS_CANAL)[number];

export function esTipoCanal(v: unknown): v is TipoCanal {
  return typeof v === "string" && (TIPOS_CANAL as readonly string[]).includes(v);
}

export function esRolInvitado(v: unknown): v is string {
  return typeof v === "string" && (ROLES_INVITADO as readonly string[]).includes(v);
}

export function esSoporte(v: unknown): boolean {
  return typeof v === "string" && (SOPORTES_MIC as readonly string[]).includes(v);
}

export function esTipoSalida(v: unknown): boolean {
  return typeof v === "string" && (TIPOS_SALIDA as readonly string[]).includes(v);
}

export const REQUERIMIENTO_POR_CLAVE: Record<string, RequerimientoInvitado> = Object.fromEntries(
  REQUERIMIENTOS_INVITADO.map((r) => [r.clave, r]),
);

// ── Selects ──────────────────────────────────────────────────────────────────
/// Forma de `select` del canal de esta fecha. La página y los endpoints tienen
/// que devolver la misma fila o la lista se queda a medias al refrescar.
export const SELECT_CANAL = {
  id: true,
  invitadoId: true,
  tipo: true,
  numero: true,
  nombre: true,
  requerimiento: true,
  instrumento: true,
  microfono: true,
  soporte: true,
  phantom: true,
  tipoSalida: true,
  estereo: true,
  notas: true,
  orden: true,
} as const;

export const SELECT_INVITADO = {
  id: true,
  nombre: true,
  rol: true,
  momento: true,
  notas: true,
  orden: true,
} as const;

/// Del rider maestro solo se lee: nada de esto se puede editar desde el show.
const SELECT_CANAL_MAESTRO = {
  id: true,
  tipo: true,
  numero: true,
  nombre: true,
  instrumento: true,
  microfono: true,
  alternativas: true,
  soporte: true,
  phantom: true,
  inserto: true,
  tipoSalida: true,
  estereo: true,
  notas: true,
  persona: { select: { nombre: true } },
} as const;

// ── Tipos de salida del módulo ───────────────────────────────────────────────
export interface CanalShow {
  id: string;
  invitadoId: string | null;
  tipo: string;
  numero: number;
  nombre: string;
  requerimiento: string | null;
  instrumento: string | null;
  microfono: string | null;
  soporte: string | null;
  phantom: boolean;
  tipoSalida: string | null;
  estereo: boolean;
  notas: string | null;
  orden: number;
}

export interface InvitadoShow {
  id: string;
  nombre: string;
  rol: string | null;
  momento: string | null;
  notas: string | null;
  orden: number;
}

/// Un invitado con lo que consume en consola, listo para el renglón.
export interface InvitadoConCanales extends InvitadoShow {
  /// Claves de `REQUERIMIENTOS_INVITADO` que hoy están prendidas, según lo que
  /// cada canal del invitado declara en su campo `requerimiento`.
  requerimientos: string[];
  canales: { id: string; tipo: string; numero: number; nombre: string; estereo: boolean; etiqueta: string }[];
}

/// Un renglón de la lista real de la fecha: viene del rider o se agregó aquí.
export interface FilaCanal {
  id: string;
  origen: "RIDER" | "SHOW";
  tipo: TipoCanal;
  numero: number;
  /// Lo que se imprime en la columna de canal. Una salida estéreo dice "33/34"
  /// porque se lleva dos canales de consola.
  etiqueta: string;
  nombre: string;
  instrumento: string | null;
  microfono: string | null;
  alternativas: string | null;
  soporte: string | null;
  phantom: boolean;
  inserto: string | null;
  tipoSalida: string | null;
  estereo: boolean;
  notas: string | null;
  /// Quién lo oye o lo usa: la persona del rider, o el invitado de esta fecha.
  paraQuien: string | null;
  invitadoId: string | null;
  rolInvitado: string | null;
}

export interface ListasDelShow {
  inputs: FilaCanal[];
  outputs: FilaCanal[];
  /// Hay rider maestro del que colgarse. Sin él la numeración arranca en 1 y hay
  /// que avisarlo: la lista se vería completa cuando no lo está.
  conRider: boolean;
  resumen: {
    entradasRider: number;
    entradasShow: number;
    /// Canales de consola, no mixes: el estéreo cuenta doble.
    salidasRider: number;
    salidasShow: number;
  };
}

// ── Numeración ───────────────────────────────────────────────────────────────
interface CanalNumerable {
  tipo: string;
  numero: number;
  estereo: boolean;
}

/**
 * El último canal de consola que ocupa una lista.
 *
 * En las entradas es el número más alto a secas. En las salidas hay que contar
 * el estéreo: el número guardado es el PRIMER canal del mix y el L/R se lleva
 * dos, así que un mix estéreo en 15 termina en 16 y el siguiente libre es el 17.
 */
export function topeDeCanales(tipo: TipoCanal, canales: CanalNumerable[]): number {
  let tope = 0;
  for (const c of canales) {
    if (c.tipo !== tipo) continue;
    const fin = tipo === "OUTPUT" ? c.numero + canalesDeSalida(c.estereo) - 1 : c.numero;
    if (fin > tope) tope = fin;
  }
  return tope;
}

/// El primer canal libre de la fecha: después del rider maestro y después de lo
/// que esta fecha ya agregó.
export function siguienteNumero(
  tipo: TipoCanal,
  maestros: CanalNumerable[],
  delShow: CanalNumerable[],
): number {
  return Math.max(topeDeCanales(tipo, maestros), topeDeCanales(tipo, delShow)) + 1;
}

export function etiquetaDeCanal(tipo: string, numero: number, estereo: boolean): string {
  return tipo === "OUTPUT" ? etiquetaCanalSalida(numero, estereo) : String(numero);
}

// ── Requerimientos ↔ canales ─────────────────────────────────────────────────
/// Qué interruptores de requerimiento están prendidos para un invitado. El canal
/// lo dice él mismo en `requerimiento`; un canal agregado a mano lo trae en null
/// y no prende ninguno, aunque por fuera se parezca a uno de plantilla.
export function requerimientosActivos(canales: { requerimiento: string | null }[]): string[] {
  const validas = new Set(REQUERIMIENTOS_INVITADO.map((r) => r.clave));
  return [...new Set(canales.map((c) => c.requerimiento).filter((c): c is string => !!c && validas.has(c)))];
}

/// Los datos con los que nace el canal de un requerimiento. El nombre es el de
/// la plantilla a secas ("Voz", "IEM") y de quién es lo dice la relación con el
/// invitado, no el texto: así renombrar al invitado no deja el canal mintiendo.
export function datosDeRequerimiento(
  req: RequerimientoInvitado,
  invitado: { id: string },
  numero: number,
  orden: number,
) {
  return {
    invitadoId: invitado.id,
    tipo: req.tipo,
    numero,
    nombre: req.canal.nombre,
    requerimiento: req.clave,
    // El instrumento concreto lo escribe quien captura: la plantilla no sabe si
    // el invitado trae guitarra o acordeón.
    instrumento: null,
    microfono: req.tipo === "INPUT" ? (req.canal.microfono ?? null) : null,
    soporte: req.tipo === "INPUT" ? (req.canal.soporte ?? null) : null,
    phantom: false,
    tipoSalida: req.tipo === "OUTPUT" ? (req.canal.tipoSalida ?? null) : null,
    estereo: req.tipo === "OUTPUT" ? req.canal.estereo === true : false,
    orden,
  };
}

// ── Lecturas ─────────────────────────────────────────────────────────────────
type CanalMaestro = {
  id: string;
  tipo: string;
  numero: number;
  nombre: string;
  instrumento: string | null;
  microfono: string | null;
  alternativas: string | null;
  soporte: string | null;
  phantom: boolean;
  inserto: string | null;
  tipoSalida: string | null;
  estereo: boolean;
  notas: string | null;
  persona: { nombre: string } | null;
};

export interface RiderMaestro {
  riderId: string;
  nombre: string;
  version: number;
  /// La gira lo trae enganchado (true) o se cayó al vigente del artista (false).
  deLaGira: boolean;
  canales: CanalMaestro[];
}

/**
 * El rider maestro contra el que se numera esta fecha.
 *
 * Misma regla que `riderDeGira` en `src/lib/pdf-gira/rider.ts`: el que la gira
 * trae enganchado y, si no trae ninguno, el vigente del artista prefiriendo el
 * general. Se repite aquí en vez de importarse para no arrastrar
 * `@react-pdf/renderer` a un endpoint que solo lee canales.
 */
export async function riderMaestroDelShow(showId: string): Promise<RiderMaestro | null> {
  const show = await prisma.giraShow.findUnique({
    where: { id: showId },
    select: { gira: { select: { riderId: true, artistaId: true } } },
  });
  if (!show) return null;

  let riderId = show.gira.riderId;
  let deLaGira = true;
  if (!riderId) {
    const vigentes = await prisma.artistaRider.findMany({
      where: { artistaId: show.gira.artistaId, activo: true, esActivo: true },
      orderBy: { version: "desc" },
      select: { id: true, contexto: true },
    });
    riderId = (vigentes.find((r) => r.contexto === "GENERAL") ?? vigentes[0])?.id ?? null;
    deLaGira = false;
  }
  if (!riderId) return null;

  const rider = await prisma.artistaRider.findUnique({
    where: { id: riderId },
    select: {
      id: true,
      nombre: true,
      version: true,
      canales: { select: SELECT_CANAL_MAESTRO, orderBy: [{ tipo: "asc" }, { numero: "asc" }] },
    },
  });
  if (!rider) return null;

  return { riderId: rider.id, nombre: rider.nombre, version: rider.version, deLaGira, canales: rider.canales };
}

export async function canalesDelShow(showId: string): Promise<CanalShow[]> {
  return prisma.showCanal.findMany({
    where: { showId },
    select: SELECT_CANAL,
    orderBy: [{ tipo: "asc" }, { numero: "asc" }, { orden: "asc" }],
  });
}

export async function invitadosDelShow(showId: string): Promise<InvitadoConCanales[]> {
  const invitados = await prisma.showInvitado.findMany({
    where: { showId },
    select: { ...SELECT_INVITADO, canales: { select: SELECT_CANAL, orderBy: [{ tipo: "asc" }, { numero: "asc" }] } },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
  });
  return invitados.map(aInvitadoFila);
}

export function aInvitadoFila(
  invitado: InvitadoShow & { canales: CanalShow[] },
): InvitadoConCanales {
  return {
    id: invitado.id,
    nombre: invitado.nombre,
    rol: invitado.rol,
    momento: invitado.momento,
    notas: invitado.notas,
    orden: invitado.orden,
    requerimientos: requerimientosActivos(invitado.canales),
    canales: invitado.canales.map((c) => ({
      id: c.id,
      tipo: c.tipo,
      numero: c.numero,
      nombre: c.nombre,
      estereo: c.estereo,
      etiqueta: etiquetaDeCanal(c.tipo, c.numero, c.estereo),
    })),
  };
}

// ── Vista unificada ──────────────────────────────────────────────────────────
function filaDeMaestro(c: CanalMaestro): FilaCanal {
  const tipo: TipoCanal = c.tipo === "OUTPUT" ? "OUTPUT" : "INPUT";
  return {
    id: c.id,
    origen: "RIDER",
    tipo,
    numero: c.numero,
    etiqueta: etiquetaDeCanal(tipo, c.numero, c.estereo),
    nombre: c.nombre,
    instrumento: c.instrumento,
    microfono: c.microfono,
    alternativas: c.alternativas,
    soporte: c.soporte,
    phantom: c.phantom,
    inserto: c.inserto,
    tipoSalida: c.tipoSalida,
    estereo: c.estereo,
    notas: c.notas,
    paraQuien: c.persona?.nombre ?? null,
    invitadoId: null,
    rolInvitado: null,
  };
}

function filaDeShow(c: CanalShow, invitados: Map<string, InvitadoShow>): FilaCanal {
  const tipo: TipoCanal = c.tipo === "OUTPUT" ? "OUTPUT" : "INPUT";
  const inv = c.invitadoId ? invitados.get(c.invitadoId) : undefined;
  return {
    id: c.id,
    origen: "SHOW",
    tipo,
    numero: c.numero,
    etiqueta: etiquetaDeCanal(tipo, c.numero, c.estereo),
    nombre: c.nombre,
    instrumento: c.instrumento,
    microfono: c.microfono,
    alternativas: null,
    soporte: c.soporte,
    phantom: c.phantom,
    inserto: null,
    tipoSalida: c.tipoSalida,
    estereo: c.estereo,
    notas: c.notas,
    paraQuien: inv?.nombre ?? null,
    invitadoId: c.invitadoId,
    rolInvitado: inv?.rol ?? null,
  };
}

/**
 * La lista real de la fecha: el rider maestro más lo de este show, en una sola
 * secuencia numerada. El rider va primero por construcción (sus números son los
 * bajos), pero si algún número coincide gana el rider: lo del show es la cola.
 */
export function unificarCanales(
  maestros: CanalMaestro[],
  delShow: CanalShow[],
  invitados: InvitadoShow[],
): ListasDelShow {
  const indice = new Map(invitados.map((i) => [i.id, i]));
  const filas = [...maestros.map(filaDeMaestro), ...delShow.map((c) => filaDeShow(c, indice))];

  const ordenar = (a: FilaCanal, b: FilaCanal) =>
    a.numero - b.numero || (a.origen === b.origen ? 0 : a.origen === "RIDER" ? -1 : 1);

  const inputs = filas.filter((f) => f.tipo === "INPUT").sort(ordenar);
  const outputs = filas.filter((f) => f.tipo === "OUTPUT").sort(ordenar);

  const salidas = (fs: FilaCanal[]) => fs.reduce((n, f) => n + canalesDeSalida(f.estereo), 0);

  return {
    inputs,
    outputs,
    conRider: maestros.length > 0,
    resumen: {
      entradasRider: inputs.filter((f) => f.origen === "RIDER").length,
      entradasShow: inputs.filter((f) => f.origen === "SHOW").length,
      salidasRider: salidas(outputs.filter((f) => f.origen === "RIDER")),
      salidasShow: salidas(outputs.filter((f) => f.origen === "SHOW")),
    },
  };
}

/// Las dos listas de una fecha, leídas de cero. Es lo que devuelven todas las
/// mutaciones: el cliente nunca recalcula un número.
export async function listasDelShow(showId: string): Promise<ListasDelShow> {
  const [rider, canales, invitados] = await Promise.all([
    riderMaestroDelShow(showId),
    canalesDelShow(showId),
    prisma.showInvitado.findMany({ where: { showId }, select: SELECT_INVITADO }),
  ]);
  return unificarCanales(rider?.canales ?? [], canales, invitados);
}

/**
 * Reacomoda la cola de esta fecha para que no queden huecos.
 *
 * Los canales del show son siempre la cola del rider maestro, y nada apunta a su
 * número, así que se pueden renumerar sin romper nada. Se corre después de
 * agregar, quitar o volver estéreo un canal: si se borra el 33 de 33–35, lo que
 * sigue se recorre y la lista vuelve a leerse corrida. El orden relativo lo
 * decide `orden` (la secuencia en que se agregaron), no el número viejo.
 */
export async function renumerarCola(showId: string, tipo: TipoCanal): Promise<void> {
  const rider = await riderMaestroDelShow(showId);
  const tope = topeDeCanales(tipo, rider?.canales ?? []);

  const cola = await prisma.showCanal.findMany({
    where: { showId, tipo },
    select: { id: true, numero: true, estereo: true },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
  });

  let numero = tope + 1;
  for (const c of cola) {
    if (c.numero !== numero) {
      await prisma.showCanal.update({ where: { id: c.id }, data: { numero } });
    }
    numero += tipo === "OUTPUT" ? canalesDeSalida(c.estereo) : 1;
  }
}
