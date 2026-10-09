/**
 * Los canales de consola de una fecha concreta.
 *
 * El rider maestro del artista (`ArtistaRiderCanal`) es la base de toda la gira
 * y NUNCA se escribe desde aquí —subir un ajuste al rider es una petición
 * explícita y vive en su endpoint—. Lo que esta fecha hace con él vive en
 * `ShowCanal` de dos maneras: canales propios de la plaza, que van en la cola
 * (si el rider llega al input 32, el micrófono del telonero es el 33), y
 * AJUSTES, que son renglones del rider cambiados o quitados solo en esta fecha.
 * Borrar un ajuste devuelve el renglón a como lo dice el rider.
 *
 * La numeración que se ve es DERIVADA: la lista de la noche se cuenta corrida
 * 1..N sobre lo que de verdad se parcha, así que quitar un renglón del rider en
 * una plaza recorre lo que sigue. Las entradas y las salidas llevan secuencias
 * separadas porque son dos lados distintos de la consola. El cliente no calcula
 * ningún número: solo pinta lo que este módulo devuelve.
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

/**
 * Los campos capturables de un canal de la fecha, validados.
 *
 * Lo usan el canal propio de la plaza y el ajuste de un renglón del rider: son
 * la misma captura y tienen que aceptar y rechazar exactamente lo mismo. El
 * micrófono y el instrumento solo existen en una entrada; el tipo de salida y el
 * estéreo, solo en una salida.
 */
export function camposDeCanal(
  body: Record<string, unknown>,
  tipo: TipoCanal,
): { data: Record<string, unknown> } | { error: string } {
  const esInput = tipo === "INPUT";
  const data: Record<string, unknown> = {};

  if ("nombre" in body) {
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    if (!nombre) return { error: "El canal necesita un nombre" };
    data.nombre = nombre;
  }

  for (const campo of ["instrumento", "microfono", "notas"] as const) {
    if (!(campo in body)) continue;
    if (campo !== "notas" && !esInput) continue;
    const v = body[campo];
    data[campo] = typeof v === "string" && v.trim() ? v.trim() : null;
  }

  if ("soporte" in body && esInput) {
    const v = body.soporte;
    if (v === null || v === "") data.soporte = null;
    else if (esSoporte(v)) data.soporte = v;
    else return { error: "Ese soporte no existe" };
  }

  if ("phantom" in body && esInput) data.phantom = body.phantom === true;

  if ("tipoSalida" in body && !esInput) {
    const v = body.tipoSalida;
    if (v === null || v === "") data.tipoSalida = null;
    else if (esTipoSalida(v)) data.tipoSalida = v;
    else return { error: "Ese tipo de salida no existe" };
  }

  if ("estereo" in body && !esInput) data.estereo = body.estereo === true;

  return { data };
}

// ── Selects ──────────────────────────────────────────────────────────────────
/// Forma de `select` del canal de esta fecha. La página y los endpoints tienen
/// que devolver la misma fila o la lista se queda a medias al refrescar.
export const SELECT_CANAL = {
  id: true,
  invitadoId: true,
  riderCanalId: true,
  oculto: true,
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

/// Del rider maestro solo se lee: lo que una fecha quiera cambiar nace como
/// ajuste (`ShowCanal.riderCanalId`), nunca escribiendo aquí.
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
  /// Si está, este renglón ajusta al del rider maestro con ese id.
  riderCanalId: string | null;
  oculto: boolean;
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

/// Un renglón de la lista real de la fecha: viene del rider tal cual, viene del
/// rider pero esta fecha lo cambió, o nació en esta fecha.
export interface FilaCanal {
  id: string;
  /// Identidad estable del renglón entre recargas, aunque se le cree un ajuste a
  /// medio teclear: el `id` cambia de ser el del rider al del ajuste, la clave no.
  clave: string;
  /// HUERFANO = ajuste que quedó colgando de un renglón de un rider que esta
  /// fecha ya no usa. No se parcha: se muestra para que no se pierda en silencio.
  origen: "RIDER" | "AJUSTADO" | "SHOW" | "HUERFANO";
  /// El `ShowCanal` que se edita o se borra. Null = renglón del rider que esta
  /// fecha no ha tocado; editarlo le crea el ajuste.
  canalShowId: string | null;
  /// El renglón del rider maestro del que cuelga, si cuelga de alguno.
  riderCanalId: string | null;
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
  /// Renglones del rider que esta fecha sacó de la lista. Se muestran aparte
  /// para poder regresarlos con un clic: quitar en una plaza no es borrar.
  quitados: FilaCanal[];
  /// Ajustes que apuntan a renglones de un rider que esta fecha ya no usa —pasa
  /// al enganchar otro rider o otra versión a media gira—. No entran al patch,
  /// pero se exponen: el trabajo de capturarlos no puede desaparecer callado.
  huerfanos: FilaCanal[];
  /// Hay rider maestro del que colgarse. Sin él la numeración arranca en 1 y hay
  /// que avisarlo: la lista se vería completa cuando no lo está.
  conRider: boolean;
  resumen: {
    entradasRider: number;
    entradasShow: number;
    /// Canales de consola, no mixes: el estéreo cuenta doble.
    salidasRider: number;
    salidasShow: number;
    /// Renglones del rider cambiados o quitados solo en esta plaza.
    ajustados: number;
    quitados: number;
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

/// El rider que lee una gira sin rider enganchado: el vigente del artista,
/// prefiriendo el general.
export async function riderVigenteDelArtista(artistaId: string): Promise<string | null> {
  const vigentes = await prisma.artistaRider.findMany({
    where: { artistaId, activo: true, esActivo: true },
    orderBy: { version: "desc" },
    select: { id: true, contexto: true },
  });
  return (vigentes.find((r) => r.contexto === "GENERAL") ?? vigentes[0])?.id ?? null;
}

/**
 * El rider maestro contra el que se numera esta fecha.
 *
 * Misma regla que `riderDeGira` en `src/lib/rider-de-gira.ts`: el que la gira
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
    riderId = await riderVigenteDelArtista(show.gira.artistaId);
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
    clave: c.id,
    origen: "RIDER",
    canalShowId: null,
    riderCanalId: c.id,
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
    clave: c.id,
    origen: "SHOW",
    canalShowId: c.id,
    riderCanalId: null,
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

/// El renglón del rider como queda en ESTA fecha. Lo que la plaza no cambió se
/// sigue leyendo del rider (las alternativas de micrófono, el inserto, de quién
/// es el mix), porque el ajuste solo guarda lo que se captura en el show.
function filaAjustada(m: CanalMaestro, a: CanalShow, invitados: Map<string, InvitadoShow>): FilaCanal {
  const base = filaDeMaestro(m);
  const inv = a.invitadoId ? invitados.get(a.invitadoId) : undefined;
  return {
    ...base,
    id: a.id,
    origen: "AJUSTADO",
    canalShowId: a.id,
    nombre: a.nombre,
    instrumento: a.instrumento,
    microfono: a.microfono,
    soporte: a.soporte,
    phantom: a.phantom,
    tipoSalida: a.tipoSalida,
    estereo: a.estereo,
    notas: a.notas,
    paraQuien: inv?.nombre ?? base.paraQuien,
    invitadoId: a.invitadoId,
    rolInvitado: inv?.rol ?? null,
  };
}

/// Numera corrido lo que de verdad se parcha esa noche. Una salida estéreo se
/// lleva dos canales de consola, así que el siguiente libre salta de dos.
function numerarCorrido(filas: FilaCanal[], tipo: TipoCanal): FilaCanal[] {
  let numero = 1;
  return filas.map((f) => {
    const fila = { ...f, numero, etiqueta: etiquetaDeCanal(tipo, numero, f.estereo) };
    numero += tipo === "OUTPUT" ? canalesDeSalida(f.estereo) : 1;
    return fila;
  });
}

/**
 * La lista real de la fecha: el rider maestro con los ajustes de esta plaza
 * encima, más los canales que solo existen aquí, en una sola secuencia.
 *
 * El rider va primero en el orden que él trae y la cola de la fecha después. La
 * numeración se calcula aquí sobre lo visible: si esta plaza quitó un renglón
 * del rider, lo que sigue se recorre y el patch se lee corrido.
 */
export function unificarCanales(
  maestros: CanalMaestro[],
  delShow: CanalShow[],
  invitados: InvitadoShow[],
): ListasDelShow {
  const indice = new Map(invitados.map((i) => [i.id, i]));
  const ajustes = new Map(delShow.filter((c) => c.riderCanalId).map((c) => [c.riderCanalId as string, c]));
  const esDelRider = new Set(maestros.map((m) => m.id));

  const visibles: FilaCanal[] = [];
  const quitados: FilaCanal[] = [];
  const huerfanos: FilaCanal[] = [];

  for (const m of maestros) {
    const ajuste = ajustes.get(m.id);
    if (!ajuste) {
      visibles.push(filaDeMaestro(m));
      continue;
    }
    const fila = filaAjustada(m, ajuste, indice);
    if (ajuste.oculto) quitados.push(fila);
    else visibles.push(fila);
  }

  for (const c of delShow) {
    if (!c.riderCanalId) {
      visibles.push(filaDeShow(c, indice));
      continue;
    }
    // Si el renglón del rider existe, el recorrido de arriba ya lo colocó. Si no,
    // es de un rider que esta fecha ya no usa: no se parcha, pero se muestra.
    if (!esDelRider.has(c.riderCanalId)) {
      huerfanos.push({ ...filaDeShow(c, indice), origen: "HUERFANO", riderCanalId: c.riderCanalId });
    }
  }

  const inputs = numerarCorrido(
    visibles.filter((f) => f.tipo === "INPUT"),
    "INPUT",
  );
  const outputs = numerarCorrido(
    visibles.filter((f) => f.tipo === "OUTPUT"),
    "OUTPUT",
  );

  const salidas = (fs: FilaCanal[]) => fs.reduce((n, f) => n + canalesDeSalida(f.estereo), 0);
  const delRider = (f: FilaCanal) => f.origen !== "SHOW";

  return {
    inputs,
    outputs,
    quitados,
    huerfanos,
    conRider: maestros.length > 0,
    resumen: {
      entradasRider: inputs.filter(delRider).length,
      entradasShow: inputs.filter((f) => f.origen === "SHOW").length,
      salidasRider: salidas(outputs.filter(delRider)),
      salidasShow: salidas(outputs.filter((f) => f.origen === "SHOW")),
      ajustados: [...inputs, ...outputs].filter((f) => f.origen === "AJUSTADO").length,
      quitados: quitados.length,
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

// ── Divergencia rider ↔ fechas ───────────────────────────────────────────────
/// Lo que un ajuste de fecha captura, y por lo tanto lo único que puede diferir
/// del rider. Lo que no está aquí (las alternativas de micrófono, el inserto, de
/// quién es el mix) lo sigue mandando el rider en todas las plazas.
const CAMPOS_AJUSTABLES = [
  "nombre",
  "instrumento",
  "microfono",
  "soporte",
  "phantom",
  "tipoSalida",
  "estereo",
  "notas",
] as const;

export interface FechaConAjuste {
  showId: string;
  giraId: string;
  gira: string;
  /// ISO, para que viaje igual desde la página y desde la respuesta del guardado.
  fecha: string;
  ciudad: string | null;
  /// La fecha no cambió el renglón: lo sacó de su lista.
  oculto: boolean;
}

/**
 * Qué fechas traen un renglón de este rider distinto a como el rider lo dice.
 *
 * Es lo que el rider maestro no puede saber solo: editar un renglón aquí NO
 * mueve a la plaza que ya lo ajustó, así que la lista se queda con su versión en
 * silencio. Se cuenta solo lo que de verdad divergió —un ajuste puede acabar
 * igual al rider si el rider se movió hacia él— y solo de fechas que leen este
 * rider: el ajuste de una gira que ya cambió de rider es huérfano y no se
 * parcha.
 */
export async function fechasConAjuste(riderId: string): Promise<Record<string, FechaConAjuste[]>> {
  const canales = await prisma.artistaRiderCanal.findMany({
    where: { riderId },
    select: { id: true, nombre: true, instrumento: true, microfono: true, soporte: true, phantom: true, tipoSalida: true, estereo: true, notas: true },
  });
  if (!canales.length) return {};

  const ajustes = await prisma.showCanal.findMany({
    where: {
      riderCanalId: { in: canales.map((c) => c.id) },
      // Una plaza cancelada no es un pendiente: su ajuste no tiene que avisar nada.
      show: { estado: { not: "CANCELADO" }, gira: { activo: true, estado: { not: "CANCELADA" } } },
    },
    select: {
      riderCanalId: true,
      oculto: true,
      nombre: true,
      instrumento: true,
      microfono: true,
      soporte: true,
      phantom: true,
      tipoSalida: true,
      estereo: true,
      notas: true,
      show: {
        select: {
          id: true,
          fecha: true,
          ciudad: true,
          giraId: true,
          gira: { select: { nombre: true, riderId: true, artistaId: true } },
        },
      },
    },
    orderBy: { show: { fecha: "asc" } },
  });

  const porId = new Map(canales.map((c) => [c.id, c]));
  const vigentePorArtista = new Map<string, string | null>();
  const fechas: Record<string, FechaConAjuste[]> = {};

  for (const a of ajustes) {
    const maestro = a.riderCanalId ? porId.get(a.riderCanalId) : undefined;
    if (!maestro) continue;

    const { gira } = a.show;
    if (gira.riderId) {
      if (gira.riderId !== riderId) continue;
    } else {
      if (!vigentePorArtista.has(gira.artistaId)) {
        vigentePorArtista.set(gira.artistaId, await riderVigenteDelArtista(gira.artistaId));
      }
      if (vigentePorArtista.get(gira.artistaId) !== riderId) continue;
    }

    const difiere = CAMPOS_AJUSTABLES.some((campo) => (a[campo] ?? null) !== (maestro[campo] ?? null));
    if (!a.oculto && !difiere) continue;

    (fechas[maestro.id] ??= []).push({
      showId: a.show.id,
      giraId: a.show.giraId,
      gira: gira.nombre,
      fecha: a.show.fecha.toISOString(),
      ciudad: a.show.ciudad,
      oculto: a.oculto,
    });
  }

  return fechas;
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
    // Los ajustes no son cola: viven en el lugar del renglón del rider que
    // sustituyen y su número lo decide la lista unificada.
    where: { showId, tipo, riderCanalId: null },
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
