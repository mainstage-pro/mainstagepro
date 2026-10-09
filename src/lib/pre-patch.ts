/**
 * El pre-patch de la interfaz.
 *
 * No es el input/output list del show. Ese dice qué canal de consola es cada
 * instrumento; esto dice qué entra y qué sale por cada puerto FÍSICO de la
 * interfaz que va antes de la consola. Son dos papeles distintos y dos
 * numeraciones distintas —el puerto 1 de la interfaz no tiene que ser el canal 1
 * del show—, así que esta lista es LIBRE: no cuelga del input list ni se deriva
 * de él. Quien parcha la interfaz escribe lo que de verdad va a cablear.
 *
 * La interfaz es la misma toda la gira, así que la lista vive en la gira y cada
 * fecha se mete con ella igual que con el rider: puertos propios de la plaza en
 * la cola y AJUSTES de un puerto de la gira solo en esa fecha. Borrar el ajuste
 * devuelve el puerto a como lo dice la gira.
 *
 * El número de puerto es DERIVADO: se cuenta corrido 1..N sobre lo que de verdad
 * se parcha, así que sacar un puerto en una plaza recorre lo que sigue. Las
 * entradas y las salidas llevan secuencias separadas porque son dos lados
 * distintos de la interfaz. El cliente no calcula ningún número.
 */

import { prisma } from "@/lib/prisma";
import { type TipoCanal, esTipoCanal } from "@/lib/show-canales";

export { esTipoCanal };
export type { TipoCanal };

/// Los campos capturables de un puerto, validados. Es la misma captura para el
/// puerto de la gira, el de la fecha y el ajuste: tienen que aceptar y rechazar
/// exactamente lo mismo.
export function camposDePuerto(
  body: Record<string, unknown>,
): { data: Record<string, unknown> } | { error: string } {
  const data: Record<string, unknown> = {};

  if ("nombre" in body) {
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    if (!nombre) return { error: "El puerto necesita un nombre" };
    data.nombre = nombre;
  }

  if ("notas" in body) {
    const v = body.notas;
    data.notas = typeof v === "string" && v.trim() ? v.trim() : null;
  }

  return { data };
}

const SELECT_PUERTO = {
  id: true,
  giraId: true,
  showId: true,
  baseId: true,
  oculto: true,
  tipo: true,
  nombre: true,
  notas: true,
  orden: true,
} as const;

export interface PuertoGuardado {
  id: string;
  giraId: string;
  showId: string | null;
  baseId: string | null;
  oculto: boolean;
  tipo: string;
  nombre: string;
  notas: string | null;
  orden: number;
}

/// Un renglón de la lista que se está viendo: viene de la gira tal cual, viene
/// de la gira pero esta fecha lo cambió, o nació en esta fecha.
export interface FilaPuerto {
  id: string;
  /// Identidad estable del renglón entre recargas, aunque se le cree un ajuste a
  /// medio teclear: el `id` cambia de ser el de la gira al del ajuste, la clave
  /// no.
  clave: string;
  origen: "GIRA" | "AJUSTADO" | "SHOW";
  /// El renglón que se edita o se borra. Null = puerto de la gira que esta fecha
  /// no ha tocado; editarlo le crea el ajuste.
  canalId: string | null;
  /// El puerto de la gira del que cuelga, si cuelga de alguno.
  baseId: string | null;
  tipo: TipoCanal;
  puerto: number;
  nombre: string;
  notas: string | null;
}

export interface ListasPrePatch {
  /// GIRA = se está editando la base de toda la gira. SHOW = lo que queda en una
  /// fecha, con los ajustes de esa plaza encima.
  alcance: "GIRA" | "SHOW";
  entradas: FilaPuerto[];
  salidas: FilaPuerto[];
  /// Puertos de la gira que esta fecha sacó. Se muestran aparte para poder
  /// regresarlos con un clic: quitar en una plaza no es borrar.
  quitados: FilaPuerto[];
  resumen: {
    entradasGira: number;
    entradasShow: number;
    salidasGira: number;
    salidasShow: number;
    ajustados: number;
    quitados: number;
  };
}

function tipoDe(v: string): TipoCanal {
  return v === "OUTPUT" ? "OUTPUT" : "INPUT";
}

function filaDeBase(p: PuertoGuardado, alcance: "GIRA" | "SHOW"): FilaPuerto {
  return {
    id: p.id,
    clave: p.id,
    origen: "GIRA",
    // En la base de la gira el renglón se edita directo; desde una fecha, tocarlo
    // nace como ajuste y hasta entonces hay algo que editar.
    canalId: alcance === "GIRA" ? p.id : null,
    baseId: alcance === "GIRA" ? null : p.id,
    tipo: tipoDe(p.tipo),
    puerto: 0,
    nombre: p.nombre,
    notas: p.notas,
  };
}

function filaDeShow(p: PuertoGuardado): FilaPuerto {
  return {
    id: p.id,
    clave: p.id,
    origen: "SHOW",
    canalId: p.id,
    baseId: null,
    tipo: tipoDe(p.tipo),
    puerto: 0,
    nombre: p.nombre,
    notas: p.notas,
  };
}

/// El puerto de la gira como queda en ESTA fecha.
function filaAjustada(base: PuertoGuardado, ajuste: PuertoGuardado): FilaPuerto {
  return {
    id: ajuste.id,
    clave: base.id,
    origen: "AJUSTADO",
    canalId: ajuste.id,
    baseId: base.id,
    tipo: tipoDe(base.tipo),
    puerto: 0,
    nombre: ajuste.nombre,
    notas: ajuste.notas,
  };
}

/// Numera corrido lo que de verdad se parcha. Un puerto de la interfaz es un
/// puerto: no hay estéreo que se lleve dos como en las salidas de consola.
function numerar(filas: FilaPuerto[]): FilaPuerto[] {
  return filas.map((f, i) => ({ ...f, puerto: i + 1 }));
}

/**
 * La lista que se ve: los puertos de la gira con los ajustes de esta plaza
 * encima, más los que solo existen aquí, en una sola secuencia.
 *
 * La gira va primero en su propio orden y la cola de la fecha después. Sin
 * `delShow` es la base de la gira a secas, que es lo que se edita desde la gira.
 */
export function unificarPrePatch(
  base: PuertoGuardado[],
  delShow: PuertoGuardado[],
  alcance: "GIRA" | "SHOW",
): ListasPrePatch {
  const ajustes = new Map(delShow.filter((p) => p.baseId).map((p) => [p.baseId as string, p]));

  const visibles: FilaPuerto[] = [];
  const quitados: FilaPuerto[] = [];

  for (const p of base) {
    const ajuste = ajustes.get(p.id);
    if (!ajuste) {
      visibles.push(filaDeBase(p, alcance));
      continue;
    }
    const fila = filaAjustada(p, ajuste);
    if (ajuste.oculto) quitados.push(fila);
    else visibles.push(fila);
  }

  // Un ajuste cuyo puerto de la gira ya no existe no se cuela: la cascada del
  // `baseId` se lo lleva al borrar la base, así que aquí no hay huérfanos.
  for (const p of delShow) {
    if (!p.baseId) visibles.push(filaDeShow(p));
  }

  const entradas = numerar(visibles.filter((f) => f.tipo === "INPUT"));
  const salidas = numerar(visibles.filter((f) => f.tipo === "OUTPUT"));
  const deLaGira = (f: FilaPuerto) => f.origen !== "SHOW";

  return {
    alcance,
    entradas,
    salidas,
    quitados,
    resumen: {
      entradasGira: entradas.filter(deLaGira).length,
      entradasShow: entradas.filter((f) => f.origen === "SHOW").length,
      salidasGira: salidas.filter(deLaGira).length,
      salidasShow: salidas.filter((f) => f.origen === "SHOW").length,
      ajustados: [...entradas, ...salidas].filter((f) => f.origen === "AJUSTADO").length,
      quitados: quitados.length,
    },
  };
}

// ── Lecturas ─────────────────────────────────────────────────────────────────
/// Los puertos de la interfaz de la gira: la base de la que parten todas las
/// fechas.
export async function puertosDeGira(giraId: string): Promise<PuertoGuardado[]> {
  return prisma.prePatchCanal.findMany({
    where: { giraId, showId: null },
    select: SELECT_PUERTO,
    orderBy: [{ tipo: "asc" }, { orden: "asc" }, { createdAt: "asc" }],
  });
}

async function puertosDeFecha(showId: string): Promise<PuertoGuardado[]> {
  return prisma.prePatchCanal.findMany({
    where: { showId },
    select: SELECT_PUERTO,
    orderBy: [{ tipo: "asc" }, { orden: "asc" }, { createdAt: "asc" }],
  });
}

export async function listasPrePatchDeGira(giraId: string): Promise<ListasPrePatch> {
  return unificarPrePatch(await puertosDeGira(giraId), [], "GIRA");
}

/// Las dos listas tal como quedan en una fecha. Es lo que devuelven todas las
/// mutaciones de un show: el cliente nunca recalcula un número de puerto.
export async function listasPrePatchDelShow(showId: string, giraId: string): Promise<ListasPrePatch> {
  const [base, delShow] = await Promise.all([puertosDeGira(giraId), puertosDeFecha(showId)]);
  return unificarPrePatch(base, delShow, "SHOW");
}

/// Las listas del alcance al que pertenece un renglón, para responder lo mismo
/// que el cliente está viendo.
export async function listasDelAlcance(
  giraId: string,
  showId: string | null,
): Promise<ListasPrePatch> {
  return showId ? listasPrePatchDelShow(showId, giraId) : listasPrePatchDeGira(giraId);
}

/// Al final de la cola: el puerto nuevo se agrega abajo y de ahí se arrastra.
export async function siguienteOrden(giraId: string, showId: string | null, tipo: TipoCanal): Promise<number> {
  const max = await prisma.prePatchCanal.aggregate({
    where: { giraId, showId, tipo, baseId: null },
    _max: { orden: true },
  });
  return (max._max.orden ?? 0) + 10;
}
