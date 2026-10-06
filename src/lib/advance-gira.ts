/**
 * El advance de gira: cotejar el rider maestro contra lo que ofrece cada casa.
 *
 * Tres movimientos, siempre en el mismo orden:
 *   1. sembrarAdvance       — el rider maestro baja al show (una fila por concepto).
 *   2. precargarDesdeVenue  — lo que ya sabíamos del foro llena la columna "ofrece el venue".
 *   3. volcarAlVenue        — al cerrar el advance, lo que realmente había queda escrito
 *                             en la ficha del venue, para que la próxima vez se arme solo.
 *
 * Y `faltantesDeLaGira`, que mira la gira completa para ver de una sola vez lo
 * que sigue abierto en varios shows.
 *
 * Aquí no hay costo ni proveedor a propósito: el equipo de tercero se captura
 * una sola vez en el rider del proyecto y de ahí se derivan el proveedor y su
 * cuenta por pagar (`src/lib/proveedor-equipos.ts`). El advance solo contesta
 * dos preguntas por renglón: quién lo cubre y cómo va esa gestión.
 */

import { prisma } from "@/lib/prisma";
import { normalizar } from "@/lib/buscar";
import { DISCIPLINA_LABEL, ESTADOS_RESUELTOS } from "@/lib/giras";
import { canonDe } from "@/lib/advance-canon";

// ── Resultados ───────────────────────────────────────────────────────────────

export interface ResultadoSiembra {
  riderId: string | null;
  riderNombre: string | null;
  agregadas: number;
  existentes: number;
  /// Filas que ya estaban capturadas a mano y quedaron amarradas a su línea del rider.
  vinculadas: number;
  /// Conceptos del rider que están fuera del advance y por eso no bajaron.
  omitidas: number;
  /// Filas vírgenes que se alinearon a lo que el rider ya decía de quién lo pone.
  alineadas: number;
}

export interface ResultadoPrecarga {
  precargadas: number;
  /// Filas que ya tenían algo escrito y por eso no se tocaron.
  respetadas: number;
  sinCoincidencia: number;
}

export interface ResultadoVolcado {
  creadas: number;
  actualizadas: number;
  omitidas: number;
}

// ── Helpers de texto y JSON ──────────────────────────────────────────────────

/// Clave de cotejo de un concepto: sin acentos, sin plurales obvios, sin ruido.
export function claveConcepto(texto: string): string {
  return normalizar(texto)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/// Texto legible de lo que tiene el venue, tal como se pega en la columna del contra-rider.
function textoOfrecido(item: {
  cantidad: number;
  marca: string | null;
  modelo: string | null;
  condicion: string | null;
  incluidoEnRenta: boolean;
  costoExtra: number | null;
}): string {
  const equipo = [item.marca, item.modelo].filter(Boolean).join(" ").trim();
  const partes = [`${item.cantidad}`, equipo || "del venue"];
  let texto = partes.join(" × ");
  if (item.condicion && item.condicion !== "DESCONOCIDO") texto += ` (${item.condicion.toLowerCase()})`;
  if (!item.incluidoEnRenta) {
    texto += item.costoExtra ? ` — costo extra $${item.costoExtra.toLocaleString("es-MX")}` : " — no incluido en la renta";
  }
  return texto;
}

// ── 1. Siembra desde el rider maestro ────────────────────────────────────────

/**
 * Con qué decisión nace el renglón, según lo que el rider ya sabe de quién lo pone.
 *
 * El advance existe para resolver lo que falta negociar, no para volver a preguntar
 * lo que ya está contestado. Si el rider dice que el artista trae su Fender o que la
 * ponemos nosotros, el renglón nace cerrado y sale de la lista viva. `CASA` es lo
 * contrario: es la *petición* del artista al foro, justo lo que hay que confirmar,
 * así que nace por definir. Sin esto los 56 renglones se ven igual de urgentes y
 * ninguno dice por dónde empezar.
 */
export function decisionInicial(provistoPor: string): { cubiertoPor: string; estado: string } {
  if (provistoPor === "ARTISTA") return { cubiertoPor: "ARTISTA", estado: "CONFIRMADO" };
  if (provistoPor === "MAINSTAGE") return { cubiertoPor: "MAINSTAGE", estado: "CONFIRMADO" };
  return { cubiertoPor: "POR_DEFINIR", estado: "PENDIENTE" };
}

/// Una fila virgen es la que nadie ha trabajado todavía: se puede realinear al
/// rider sin pisarle nada a nadie.
function esVirgen(l: {
  cubiertoPor: string;
  estado: string;
  ofrecidoCasa: string | null;
  cantidadCasa: number;
  notas: string | null;
  pedirAlPromotor: boolean;
}): boolean {
  return (
    l.cubiertoPor === "POR_DEFINIR" &&
    l.estado === "PENDIENTE" &&
    !l.ofrecidoCasa?.trim() &&
    l.cantidadCasa === 0 &&
    !l.notas?.trim() &&
    !l.pedirAlPromotor
  );
}

/**
 * Baja el rider maestro vigente al show. Es idempotente en dos niveles:
 * no duplica una fila que ya nació de la misma `riderLineaId`, y tampoco duplica
 * un concepto que el usuario capturó a mano (lo adopta y le pone su `riderLineaId`).
 * Nada de lo ya capturado se sobreescribe: Mauricio edita el rider después de
 * haber trabajado el advance y no puede perder el avance del show.
 *
 * Solo bajan los conceptos marcados `enAdvance`: el rider es la transcripción
 * literal del documento y trae cosas que no se cotejan con el jefe técnico del foro.
 */
/**
 * El rider con el que trabaja una fecha: el que la gira fijó o, si no fijó ninguno,
 * el activo más reciente del artista. Lo usan la siembra y la pantalla del advance,
 * que tienen que estar viendo el mismo rider o la curaduría no cuadra.
 */
export async function riderDeLaGira(gira: {
  riderId: string | null;
  artistaId: string;
}): Promise<{ id: string; nombre: string } | null> {
  if (gira.riderId) {
    return prisma.artistaRider.findUnique({
      where: { id: gira.riderId },
      select: { id: true, nombre: true },
    });
  }
  return prisma.artistaRider.findFirst({
    where: { artistaId: gira.artistaId, esActivo: true, activo: true },
    orderBy: { version: "desc" },
    select: { id: true, nombre: true },
  });
}

export async function sembrarAdvance(showId: string): Promise<ResultadoSiembra> {
  const show = await prisma.giraShow.findUnique({
    where: { id: showId },
    select: { id: true, gira: { select: { riderId: true, artistaId: true } } },
  });
  if (!show) throw new Error("Show no encontrado");

  const rider = await riderDeLaGira(show.gira);

  if (!rider)
    return {
      riderId: null,
      riderNombre: null,
      agregadas: 0,
      existentes: 0,
      vinculadas: 0,
      omitidas: 0,
      alineadas: 0,
    };

  const [todasDelRider, existentes] = await Promise.all([
    prisma.artistaRiderLinea.findMany({
      where: { riderId: rider.id },
      orderBy: [{ disciplina: "asc" }, { orden: "asc" }],
    }),
    prisma.showRiderLinea.findMany({
      where: { showId },
      select: {
        id: true,
        riderLineaId: true,
        disciplina: true,
        concepto: true,
        cubiertoPor: true,
        estado: true,
        ofrecidoCasa: true,
        cantidadCasa: true,
        notas: true,
        pedirAlPromotor: true,
      },
    }),
  ]);

  const lineasRider = todasDelRider.filter((l) => l.enAdvance);
  const omitidas = todasDelRider.length - lineasRider.length;

  const porRiderLinea = new Map(
    existentes.filter((e) => e.riderLineaId).map((e) => [e.riderLineaId as string, e]),
  );
  // Índice por concepto para adoptar lo que se capturó a mano antes de sembrar.
  const porConcepto = new Map<string, string>();
  for (const e of existentes) {
    if (e.riderLineaId) continue;
    porConcepto.set(`${e.disciplina}|${claveConcepto(e.concepto)}`, e.id);
  }

  const maxOrden = existentes.length
    ? await prisma.showRiderLinea
        .aggregate({ where: { showId }, _max: { orden: true } })
        .then((r) => r._max.orden ?? 0)
    : 0;

  let agregadas = 0;
  let vinculadas = 0;
  let alineadas = 0;
  let orden = maxOrden;

  for (const l of lineasRider) {
    const decision = decisionInicial(l.provistoPor);

    // Ya sembrado antes. Si nadie lo ha trabajado todavía, se alinea a lo que el
    // rider dice de quién lo pone; así los riders capturados antes de que la
    // siembra obedeciera `provistoPor` se corrigen solos en la siguiente pasada.
    const ya = porRiderLinea.get(l.id);
    if (ya) {
      if (decision.cubiertoPor !== "POR_DEFINIR" && esVirgen(ya)) {
        await prisma.showRiderLinea.update({ where: { id: ya.id }, data: decision });
        alineadas++;
      }
      continue;
    }

    const claveLibre = `${l.disciplina}|${claveConcepto(l.concepto)}`;
    const huerfana = porConcepto.get(claveLibre);
    if (huerfana) {
      await prisma.showRiderLinea.update({
        where: { id: huerfana },
        data: { riderLineaId: l.id },
      });
      porConcepto.delete(claveLibre);
      vinculadas++;
      continue;
    }

    orden += 10;
    await prisma.showRiderLinea.create({
      data: {
        showId,
        riderLineaId: l.id,
        disciplina: l.disciplina,
        concepto: l.concepto,
        cantidadPedida: l.cantidad,
        prioridad: l.prioridad,
        equipoId: l.equipoId,
        orden,
        ...decision,
      },
    });
    agregadas++;
  }

  return {
    riderId: rider.id,
    riderNombre: rider.nombre,
    agregadas,
    existentes: existentes.length,
    vinculadas,
    omitidas,
    alineadas,
  };
}

// ── 2. Precarga desde el inventario del venue ────────────────────────────────

/**
 * Llena "qué ofrece el venue" con lo que ya tenemos documentado del foro.
 * No pisa nada: una fila donde el usuario ya escribió algo se deja intacta.
 */
export async function precargarDesdeVenue(showId: string): Promise<ResultadoPrecarga> {
  const show = await prisma.giraShow.findUnique({
    where: { id: showId },
    select: { id: true, venueId: true },
  });
  if (!show) throw new Error("Show no encontrado");
  if (!show.venueId) return { precargadas: 0, respetadas: 0, sinCoincidencia: 0 };

  const [lineas, inventario] = await Promise.all([
    prisma.showRiderLinea.findMany({
      where: { showId },
      select: { id: true, disciplina: true, concepto: true, ofrecidoCasa: true, cantidadCasa: true },
    }),
    prisma.venueInventario.findMany({ where: { venueId: show.venueId } }),
  ]);

  const indexado = inventario.map((i) => ({
    item: i,
    clave: claveConcepto(i.concepto),
    canon: canonDe(i.concepto, i.marca, i.modelo)?.clave ?? null,
  }));

  let precargadas = 0;
  let respetadas = 0;
  let sinCoincidencia = 0;

  for (const l of lineas) {
    if ((l.ofrecidoCasa && l.ofrecidoCasa.trim()) || l.cantidadCasa > 0) {
      respetadas++;
      continue;
    }

    const clave = claveConcepto(l.concepto);
    const canon = canonDe(l.concepto)?.clave ?? null;

    // El canon es el cotejo principal: el rider pide "line array" y el venue
    // contesta "KARA I", textos que no se parecen en nada. El texto solo entra
    // como respaldo y únicamente si es idéntico — una coincidencia parcial entre
    // dos textos libres produce falsos positivos que el técnico no detecta.
    const porCanon = canon ? indexado.filter((c) => c.canon === canon) : [];
    const porTexto = indexado.filter((c) => c.clave === clave);
    const match = porCanon.length ? porCanon : porTexto;

    if (match.length === 0) {
      sinCoincidencia++;
      continue;
    }

    // Un concepto del rider suele caer sobre varios renglones del venue: "micrófono
    // alámbrico" cruza con los SM58, los SM57 y los Beta del foro. Se precargan
    // todos y la suma, porque la pregunta del advance es si alcanza, no cuál.
    await prisma.showRiderLinea.update({
      where: { id: l.id },
      data: {
        ofrecidoCasa: match.map((c) => textoOfrecido(c.item)).join(" · "),
        cantidadCasa: match.reduce((s, c) => s + c.item.cantidad, 0),
      },
    });
    precargadas++;
  }

  return { precargadas, respetadas, sinCoincidencia };
}

// ── 3. Volcado de lo aprendido a la ficha del venue ──────────────────────────

/**
 * Lo que el venue realmente puso se escribe en su ficha técnica. Es el único
 * mecanismo por el que el venue acumula conocimiento entre giras.
 */
export async function volcarAlVenue(showId: string, usuario: string): Promise<ResultadoVolcado> {
  const show = await prisma.giraShow.findUnique({
    where: { id: showId },
    select: { id: true, venueId: true },
  });
  if (!show) throw new Error("Show no encontrado");
  if (!show.venueId) throw new Error("Este show no tiene venue asignado");

  const [lineas, inventario] = await Promise.all([
    prisma.showRiderLinea.findMany({
      where: { showId, cubiertoPor: "CASA" },
      select: { disciplina: true, concepto: true, ofrecidoCasa: true, cantidadCasa: true, cantidadPedida: true },
      orderBy: { orden: "asc" },
    }),
    prisma.venueInventario.findMany({ where: { venueId: show.venueId } }),
  ]);

  const existentes = new Map(inventario.map((i) => [`${i.disciplina}|${claveConcepto(i.concepto)}`, i]));
  const maxOrden = inventario.reduce((m, i) => Math.max(m, i.orden), 0);

  const sello = { verificadoEn: new Date(), verificadoPor: usuario };
  let creadas = 0;
  let actualizadas = 0;
  let omitidas = 0;
  let orden = maxOrden;

  for (const l of lineas) {
    const texto = l.ofrecidoCasa?.trim();
    if (!texto) {
      omitidas++;
      continue;
    }

    const clave = `${l.disciplina}|${claveConcepto(l.concepto)}`;
    const ya = existentes.get(clave);
    const cantidad = l.cantidadCasa > 0 ? l.cantidadCasa : l.cantidadPedida;

    if (ya) {
      await prisma.venueInventario.update({
        where: { id: ya.id },
        data: { cantidad, notas: texto, ...sello },
      });
      actualizadas++;
    } else {
      orden += 10;
      const nuevo = await prisma.venueInventario.create({
        data: {
          venueId: show.venueId,
          disciplina: l.disciplina,
          concepto: l.concepto,
          cantidad,
          notas: texto,
          orden,
          ...sello,
        },
      });
      existentes.set(clave, nuevo);
      creadas++;
    }
  }

  return { creadas, actualizadas, omitidas };
}

// ── 4. Lo que sigue abierto en toda la gira, agrupado por ciudad ─────────────

export interface FaltanteFila {
  lineaId: string;
  showId: string;
  fecha: Date;
  ciudad: string;
  venueNombre: string | null;
  disciplina: string;
  concepto: string;
  cantidadPedida: number;
  prioridad: string;
  estado: string;
  cubiertoPor: string;
  pedirAlPromotor: boolean;
}

export interface GrupoFaltantes {
  ciudad: string;
  disciplina: string;
  disciplinaLabel: string;
  filas: FaltanteFila[];
  indispensables: number;
  /// Cuántos de los abiertos hay que arrancarle al promotor.
  alPromotor: number;
}

/**
 * Un renglón sigue abierto mientras no esté confirmado (o sustituido) y no se
 * haya decidido que no aplica. La unidad es el renglón del rider, no la pieza:
 * el advance se cierra contestando quién lo pone y cómo va esa gestión, no
 * llevando una contabilidad de piezas que nadie mantiene al teléfono.
 * Mismo criterio que `estaResuelta` del semáforo, para que nunca se contradigan.
 */
export function sigueAbierta(l: { estado: string; cubiertoPor: string }): boolean {
  if (l.cubiertoPor === "NO_APLICA") return false;
  return !ESTADOS_RESUELTOS.includes(l.estado);
}

export async function faltantesDeLaGira(giraId: string): Promise<GrupoFaltantes[]> {
  const shows = await prisma.giraShow.findMany({
    where: { giraId, estado: { not: "CANCELADO" } },
    orderBy: [{ fecha: "asc" }, { orden: "asc" }],
    select: {
      id: true,
      fecha: true,
      ciudad: true,
      venue: { select: { nombre: true, ciudad: true } },
      riderLineas: {
        orderBy: [{ disciplina: "asc" }, { orden: "asc" }],
        select: {
          id: true,
          disciplina: true,
          concepto: true,
          cantidadPedida: true,
          prioridad: true,
          estado: true,
          cubiertoPor: true,
          pedirAlPromotor: true,
        },
      },
    },
  });

  const grupos = new Map<string, GrupoFaltantes>();

  for (const s of shows) {
    const ciudad = s.ciudad?.trim() || s.venue?.ciudad?.trim() || "Sin ciudad";
    for (const l of s.riderLineas) {
      if (!sigueAbierta(l)) continue;
      const clave = `${normalizar(ciudad)}|${l.disciplina}`;
      let g = grupos.get(clave);
      if (!g) {
        g = {
          ciudad,
          disciplina: l.disciplina,
          disciplinaLabel: DISCIPLINA_LABEL[l.disciplina] ?? l.disciplina,
          filas: [],
          indispensables: 0,
          alPromotor: 0,
        };
        grupos.set(clave, g);
      }
      g.filas.push({
        lineaId: l.id,
        showId: s.id,
        fecha: s.fecha,
        ciudad,
        venueNombre: s.venue?.nombre ?? null,
        disciplina: l.disciplina,
        concepto: l.concepto,
        cantidadPedida: l.cantidadPedida,
        prioridad: l.prioridad,
        estado: l.estado,
        cubiertoPor: l.cubiertoPor,
        pedirAlPromotor: l.pedirAlPromotor,
      });
      if (l.prioridad === "INDISPENSABLE") g.indispensables++;
      if (l.pedirAlPromotor) g.alPromotor++;
    }
  }

  return [...grupos.values()].sort(
    (a, b) => a.ciudad.localeCompare(b.ciudad, "es") || b.indispensables - a.indispensables,
  );
}

// ── Matriz de la gira: un concepto por fila, un show por columna ─────────────

export interface CeldaMatriz {
  showId: string;
  lineaId: string | null;
  cantidadPedida: number;
  /// Las dos decisiones del renglón, que es todo lo que la celda tiene que decir.
  cubiertoPor: string;
  estado: string;
  prioridad: string;
  pedirAlPromotor: boolean;
  abierta: boolean;
}

export interface FilaMatriz {
  clave: string;
  disciplina: string;
  concepto: string;
  prioridad: string;
  /// Indexado por showId; ausente = ese show no tiene el concepto en su advance.
  celdas: Record<string, CeldaMatriz>;
  showsAbiertos: number;
}

export interface ColumnaMatriz {
  showId: string;
  fecha: Date;
  ciudad: string | null;
  venueNombre: string | null;
  estado: string;
}

export interface MatrizAdvance {
  columnas: ColumnaMatriz[];
  filas: FilaMatriz[];
}

/// La prioridad más alta gana cuando el mismo concepto viene con distinta prioridad por show.
const PESO_PRIORIDAD: Record<string, number> = { INDISPENSABLE: 3, IMPORTANTE: 2, DESEABLE: 1 };

export async function matrizAdvance(giraId: string): Promise<MatrizAdvance> {
  const shows = await prisma.giraShow.findMany({
    where: { giraId, estado: { not: "CANCELADO" } },
    orderBy: [{ fecha: "asc" }, { orden: "asc" }],
    select: {
      id: true,
      fecha: true,
      ciudad: true,
      estado: true,
      venue: { select: { nombre: true, ciudad: true } },
      riderLineas: {
        orderBy: [{ disciplina: "asc" }, { orden: "asc" }],
        select: {
          id: true,
          disciplina: true,
          concepto: true,
          cantidadPedida: true,
          cubiertoPor: true,
          estado: true,
          prioridad: true,
          pedirAlPromotor: true,
        },
      },
    },
  });

  const columnas: ColumnaMatriz[] = shows.map((s) => ({
    showId: s.id,
    fecha: s.fecha,
    ciudad: s.ciudad ?? s.venue?.ciudad ?? null,
    venueNombre: s.venue?.nombre ?? null,
    estado: s.estado,
  }));

  const filas = new Map<string, FilaMatriz>();

  for (const s of shows) {
    for (const l of s.riderLineas) {
      const clave = `${l.disciplina}|${claveConcepto(l.concepto)}`;
      let f = filas.get(clave);
      if (!f) {
        f = {
          clave,
          disciplina: l.disciplina,
          concepto: l.concepto,
          prioridad: l.prioridad,
          celdas: {},
          showsAbiertos: 0,
        };
        filas.set(clave, f);
      }
      if ((PESO_PRIORIDAD[l.prioridad] ?? 0) > (PESO_PRIORIDAD[f.prioridad] ?? 0)) f.prioridad = l.prioridad;

      const abierta = sigueAbierta(l);
      f.celdas[s.id] = {
        showId: s.id,
        lineaId: l.id,
        cantidadPedida: l.cantidadPedida,
        cubiertoPor: l.cubiertoPor,
        estado: l.estado,
        prioridad: l.prioridad,
        pedirAlPromotor: l.pedirAlPromotor,
        abierta,
      };
      if (abierta) f.showsAbiertos++;
    }
  }

  const ordenadas = [...filas.values()].sort(
    (a, b) =>
      a.disciplina.localeCompare(b.disciplina, "es") ||
      b.showsAbiertos - a.showsAbiertos ||
      a.concepto.localeCompare(b.concepto, "es"),
  );

  return { columnas, filas: ordenadas };
}
