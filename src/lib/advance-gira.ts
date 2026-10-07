/**
 * El advance de una fecha, departamento por departamento.
 *
 * La unidad es el REPARTO, no el equipo: un renglón es un bloque del departamento
 * con una sola respuesta a "quién lo pone". El advance anterior bajaba una fila
 * por concepto del rider a cada fecha — cincuenta renglones multiplicados por
 * cinco plazas que nadie contesta uno por uno al teléfono. Lo que se negocia con
 * el jefe técnico del foro es el bloque ("el PA y la consola los pones tú, la
 * microfonía la traemos"), y dentro de un mismo departamento el reparto se parte
 * entre varias figuras.
 *
 * `panelDelShow` es la pantalla completa: por departamento, lo que pide el rider,
 * lo que el foro tiene registrado (cruzado por concepto canónico) y el reparto que
 * se está armando. Los tres juntos son lo que permite cerrar sin que nada se
 * quede fuera: un punto del rider sin renglón de reparto se ve a simple vista.
 *
 * Aquí no hay costo ni proveedor a propósito: el equipo de tercero se captura una
 * sola vez en el rider del proyecto y de ahí se derivan el proveedor y su cuenta
 * por pagar (`src/lib/proveedor-equipos.ts`). Y la lista que se le manda al
 * promotor no es una palomita más: es lo que quedó en `PROMOTOR`.
 */

import { prisma } from "@/lib/prisma";
import { normalizar } from "@/lib/buscar";
import { DISCIPLINAS, DISCIPLINA_LABEL, ESTADOS_RESUELTOS, UNIDAD_RIDER_LABEL } from "@/lib/giras";
import { canonDe } from "@/lib/advance-canon";

const ORDEN_DISCIPLINA: Record<string, number> = Object.fromEntries(DISCIPLINAS.map((d, i) => [d, i]));

/// Clave de cotejo de un concepto: sin acentos, sin signos, sin ruido.
export function claveConcepto(texto: string): string {
  return normalizar(texto)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── El panel de una fecha ────────────────────────────────────────────────────

export interface ItemForo {
  id: string;
  concepto: string;
  cantidad: number;
  marca: string | null;
  modelo: string | null;
  /// Legible de corrido, tal como se pega en un renglón de reparto.
  texto: string;
  incluidoEnRenta: boolean;
  verificado: boolean;
}

export interface PuntoRider {
  /// `ArtistaRiderLinea.id`: la liga que dice si este punto ya se repartió.
  id: string;
  concepto: string;
  cantidad: number;
  unidad: string | null;
  prioridad: string;
  provistoPor: string;
  especificaciones: string | null;
  notas: string | null;
  /// Lo que el foro tiene registrado que contesta a este punto.
  enElForo: ItemForo[];
  /// Cuántos renglones del reparto ya lo cubren. Cero = se quedó fuera.
  repartido: number;
}

export interface RepartoFila {
  id: string;
  riderLineaId: string | null;
  descripcion: string;
  cantidad: number | null;
  unidad: string | null;
  especificaciones: string | null;
  prioridad: string;
  cubiertoPor: string;
  estado: string;
  porConseguir: string | null;
  notas: string | null;
  orden: number;
}

export interface DisciplinaAdvance {
  disciplina: string;
  label: string;
  puntos: PuntoRider[];
  /// Lo que el foro tiene en este departamento y no contesta a ningún punto del
  /// rider. Se muestra igual: muchas veces es la solución de otro renglón.
  foroSuelto: ItemForo[];
  repartos: RepartoFila[];
  /// Puntos del rider sin un solo renglón de reparto.
  sinRepartir: number;
  /// Renglones del reparto que siguen sin cerrar.
  abiertos: number;
}

export interface PanelAdvance {
  riderId: string | null;
  riderNombre: string | null;
  venueId: string | null;
  venueNombre: string | null;
  itemsForo: number;
  disciplinas: DisciplinaAdvance[];
}

/// Texto legible de un renglón del inventario del foro.
function textoForo(item: {
  cantidad: number;
  marca: string | null;
  modelo: string | null;
  condicion: string | null;
  incluidoEnRenta: boolean;
  costoExtra: number | null;
  concepto: string;
}): string {
  const equipo = [item.marca, item.modelo].filter(Boolean).join(" ").trim();
  let texto = `${item.cantidad} × ${equipo || item.concepto}`;
  if (item.condicion && item.condicion !== "DESCONOCIDO") texto += ` (${item.condicion.toLowerCase()})`;
  if (!item.incluidoEnRenta) {
    texto += item.costoExtra
      ? ` — costo extra $${item.costoExtra.toLocaleString("es-MX")}`
      : " — no incluido en la renta";
  }
  return texto;
}

/// Lo que el rider dice del equipo aceptable, en una línea.
export function especificacionesDeLinea(l: { preferido: string | null; aceptables: string | null }): string | null {
  const partes = [l.preferido?.trim(), l.aceptables?.trim() ? `o ${l.aceptables.trim()}` : null].filter(Boolean);
  return partes.length ? partes.join(" ") : null;
}

/**
 * El rider con el que trabaja una fecha: el que la gira fijó o, si no fijó
 * ninguno, el activo más reciente del artista. Lo usan el panel y la siembra, que
 * tienen que estar viendo el mismo rider o el cotejo no cuadra.
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

export async function panelDelShow(showId: string): Promise<PanelAdvance | null> {
  const show = await prisma.giraShow.findUnique({
    where: { id: showId },
    select: {
      id: true,
      venueId: true,
      venue: { select: { nombre: true } },
      gira: { select: { riderId: true, artistaId: true } },
    },
  });
  if (!show) return null;

  const rider = await riderDeLaGira(show.gira);

  const [lineasRider, inventario, repartos] = await Promise.all([
    rider
      ? prisma.artistaRiderLinea.findMany({
          where: { riderId: rider.id, enAdvance: true },
          orderBy: { orden: "asc" },
          select: {
            id: true,
            disciplina: true,
            concepto: true,
            cantidad: true,
            unidad: true,
            prioridad: true,
            provistoPor: true,
            preferido: true,
            aceptables: true,
            notas: true,
          },
        })
      : [],
    show.venueId
      ? prisma.venueInventario.findMany({ where: { venueId: show.venueId }, orderBy: { orden: "asc" } })
      : [],
    prisma.showAdvanceReparto.findMany({
      where: { showId },
      orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  // El inventario del foro se indexa una vez por concepto canónico y por texto:
  // el rider pide "line array" y el foro contesta "KARA I", dos textos que no se
  // parecen en nada. El texto solo entra si es idéntico — una coincidencia
  // parcial entre dos textos libres produce falsos positivos que nadie detecta.
  const itemsForo: ItemForo[] = inventario.map((i) => ({
    id: i.id,
    concepto: i.concepto,
    cantidad: i.cantidad,
    marca: i.marca,
    modelo: i.modelo,
    texto: textoForo(i),
    incluidoEnRenta: i.incluidoEnRenta,
    verificado: i.verificadoEn !== null,
  }));
  const indiceForo = inventario.map((i, n) => ({
    item: itemsForo[n],
    disciplina: i.disciplina,
    clave: claveConcepto(i.concepto),
    canon: canonDe(i.concepto, i.marca, i.modelo)?.clave ?? null,
  }));

  const repartosPorLinea = new Map<string, number>();
  for (const r of repartos) {
    if (!r.riderLineaId) continue;
    repartosPorLinea.set(r.riderLineaId, (repartosPorLinea.get(r.riderLineaId) ?? 0) + 1);
  }

  const usadosDelForo = new Set<string>();
  const puntosPorDisciplina = new Map<string, PuntoRider[]>();

  for (const l of lineasRider) {
    const clave = claveConcepto(l.concepto);
    const canon = canonDe(l.concepto)?.clave ?? null;
    const mismoDepto = indiceForo.filter((c) => c.disciplina === l.disciplina);
    const porCanon = canon ? mismoDepto.filter((c) => c.canon === canon) : [];
    const enElForo = (porCanon.length ? porCanon : mismoDepto.filter((c) => c.clave === clave)).map((c) => c.item);
    for (const i of enElForo) usadosDelForo.add(i.id);

    const lista = puntosPorDisciplina.get(l.disciplina) ?? [];
    lista.push({
      id: l.id,
      concepto: l.concepto,
      cantidad: l.cantidad,
      unidad: l.unidad,
      prioridad: l.prioridad,
      provistoPor: l.provistoPor,
      especificaciones: especificacionesDeLinea(l),
      notas: l.notas,
      enElForo,
      repartido: repartosPorLinea.get(l.id) ?? 0,
    });
    puntosPorDisciplina.set(l.disciplina, lista);
  }

  // Los departamentos que se muestran: los que el rider pide, los que el foro
  // tiene y los que ya se empezaron a repartir. Un departamento vacío en los
  // tres no se dibuja.
  const claves = new Set<string>([
    ...puntosPorDisciplina.keys(),
    ...inventario.map((i) => i.disciplina),
    ...repartos.map((r) => r.disciplina),
  ]);

  const disciplinas: DisciplinaAdvance[] = [...claves]
    .sort((a, b) => (ORDEN_DISCIPLINA[a] ?? 99) - (ORDEN_DISCIPLINA[b] ?? 99))
    .map((d) => {
      const puntos = puntosPorDisciplina.get(d) ?? [];
      const propios = repartos.filter((r) => r.disciplina === d);
      return {
        disciplina: d,
        label: DISCIPLINA_LABEL[d] ?? d,
        puntos,
        foroSuelto: indiceForo
          .filter((c) => c.disciplina === d && !usadosDelForo.has(c.item.id))
          .map((c) => c.item),
        repartos: propios.map((r) => ({
          id: r.id,
          riderLineaId: r.riderLineaId,
          descripcion: r.descripcion,
          cantidad: r.cantidad,
          unidad: r.unidad,
          especificaciones: r.especificaciones,
          prioridad: r.prioridad,
          cubiertoPor: r.cubiertoPor,
          estado: r.estado,
          porConseguir: r.porConseguir,
          notas: r.notas,
          orden: r.orden,
        })),
        sinRepartir: puntos.filter((p) => p.repartido === 0).length,
        abiertos: propios.filter(sigueAbierta).length,
      };
    });

  return {
    riderId: rider?.id ?? null,
    riderNombre: rider?.nombre ?? null,
    venueId: show.venueId,
    venueNombre: show.venue?.nombre ?? null,
    itemsForo: inventario.length,
    disciplinas,
  };
}

// ── Siembra: del rider al reparto ────────────────────────────────────────────

/**
 * Con qué decisión nace el renglón, según lo que el rider ya sabe de quién lo pone.
 *
 * El advance existe para resolver lo que falta negociar, no para volver a preguntar
 * lo que ya está contestado. Si el rider dice que el artista trae su Fender o que
 * la ponemos nosotros, el renglón nace cerrado. `CASA` es lo contrario: es la
 * *petición* del artista al foro, justo lo que hay que confirmar, así que nace por
 * definir. Sin esto todos los renglones se ven igual de urgentes y ninguno dice
 * por dónde empezar.
 */
export function decisionInicial(provistoPor: string): { cubiertoPor: string; estado: string } {
  if (provistoPor === "ARTISTA") return { cubiertoPor: "ARTISTA", estado: "CONFIRMADO" };
  if (provistoPor === "MAINSTAGE") return { cubiertoPor: "MAINSTAGE", estado: "CONFIRMADO" };
  return { cubiertoPor: "POR_DEFINIR", estado: "PENDIENTE" };
}

export interface ResultadoSiembra {
  riderNombre: string | null;
  agregados: number;
  /// Puntos que ya tenían su renglón de reparto y no se duplicaron.
  yaRepartidos: number;
}

/**
 * Pasa al reparto los puntos del rider que todavía no tienen renglón. Es
 * idempotente: nunca duplica un punto ya repartido y nunca toca lo ya escrito.
 * Con `disciplina` siembra solo ese departamento, que es como se usa en pantalla
 * — se cierra audio completo antes de abrir luces.
 */
export async function sembrarAdvance(showId: string, disciplina?: string): Promise<ResultadoSiembra> {
  const show = await prisma.giraShow.findUnique({
    where: { id: showId },
    select: { id: true, gira: { select: { riderId: true, artistaId: true } } },
  });
  if (!show) throw new Error("Show no encontrado");

  const rider = await riderDeLaGira(show.gira);
  if (!rider) return { riderNombre: null, agregados: 0, yaRepartidos: 0 };

  const [lineas, repartos, agregado] = await Promise.all([
    prisma.artistaRiderLinea.findMany({
      where: { riderId: rider.id, enAdvance: true, ...(disciplina ? { disciplina } : {}) },
      orderBy: { orden: "asc" },
    }),
    prisma.showAdvanceReparto.findMany({
      where: { showId, riderLineaId: { not: null } },
      select: { riderLineaId: true },
    }),
    prisma.showAdvanceReparto.aggregate({ where: { showId }, _max: { orden: true } }),
  ]);

  const repartidos = new Set(repartos.map((r) => r.riderLineaId as string));
  const faltan = lineas.filter((l) => !repartidos.has(l.id));
  let orden = agregado._max.orden ?? 0;

  if (faltan.length > 0) {
    await prisma.showAdvanceReparto.createMany({
      data: faltan.map((l) => {
        orden += 10;
        return {
          showId,
          disciplina: l.disciplina,
          riderLineaId: l.id,
          descripcion: l.concepto,
          cantidad: l.cantidad,
          unidad: l.unidad,
          especificaciones: especificacionesDeLinea(l),
          prioridad: l.prioridad,
          notas: l.notas,
          orden,
          ...decisionInicial(l.provistoPor),
        };
      }),
    });
  }

  return {
    riderNombre: rider.nombre,
    agregados: faltan.length,
    yaRepartidos: lineas.length - faltan.length,
  };
}

// ── Volcado a la ficha del foro ──────────────────────────────────────────────

export interface ResultadoVolcado {
  creadas: number;
  actualizadas: number;
}

/**
 * Lo que el foro realmente puso se escribe en su ficha técnica. Es el único
 * mecanismo por el que un venue acumula conocimiento entre giras: la próxima vez
 * que caigamos ahí, el cotejo arranca con lo que ya aprendimos.
 *
 * Solo se vuelca lo cerrado en `CASA`: un renglón pendiente es una suposición y
 * ensuciar el inventario del foro con suposiciones es peor que no tener nada.
 */
export async function volcarAlVenue(showId: string, usuario: string): Promise<ResultadoVolcado> {
  const show = await prisma.giraShow.findUnique({
    where: { id: showId },
    select: { id: true, venueId: true },
  });
  if (!show) throw new Error("Show no encontrado");
  if (!show.venueId) throw new Error("Este show no tiene venue asignado");

  const [repartos, inventario] = await Promise.all([
    prisma.showAdvanceReparto.findMany({
      where: { showId, cubiertoPor: "CASA", estado: { in: ESTADOS_RESUELTOS } },
      orderBy: { orden: "asc" },
    }),
    prisma.venueInventario.findMany({ where: { venueId: show.venueId } }),
  ]);

  const existentes = new Map(inventario.map((i) => [`${i.disciplina}|${claveConcepto(i.concepto)}`, i]));
  const sello = { verificadoEn: new Date(), verificadoPor: usuario };
  let orden = inventario.reduce((m, i) => Math.max(m, i.orden), 0);
  let creadas = 0;
  let actualizadas = 0;

  for (const r of repartos) {
    const clave = `${r.disciplina}|${claveConcepto(r.descripcion)}`;
    const ya = existentes.get(clave);
    const datos = {
      cantidad: r.cantidad ?? 1,
      notas: [r.especificaciones, r.notas].filter(Boolean).join(" · ") || null,
      ...sello,
    };

    if (ya) {
      await prisma.venueInventario.update({ where: { id: ya.id }, data: datos });
      actualizadas++;
      continue;
    }
    orden += 10;
    const nuevo = await prisma.venueInventario.create({
      data: { venueId: show.venueId, disciplina: r.disciplina, concepto: r.descripcion, orden, ...datos },
    });
    existentes.set(clave, nuevo);
    creadas++;
  }

  return { creadas, actualizadas };
}

// ── Lo que sigue abierto en toda la gira ─────────────────────────────────────

/**
 * Un renglón sigue abierto mientras no esté confirmado (o sustituido) y no se haya
 * decidido que no aplica. Mismo criterio que `estaResuelta` del semáforo, para que
 * la pantalla, el PDF y el consolidado nunca se contradigan.
 */
export function sigueAbierta(l: { estado: string; cubiertoPor: string }): boolean {
  if (l.cubiertoPor === "NO_APLICA") return false;
  return !ESTADOS_RESUELTOS.includes(l.estado);
}

/// Cantidad y unidad en una sola cadena: `6 wedges`, `1 servicio`, `—`.
export function fmtCantidad(cantidad: number | null, unidad: string | null): string {
  if (cantidad === null) return unidad ? (UNIDAD_RIDER_LABEL[unidad] ?? unidad) : "—";
  if (!unidad) return String(cantidad);
  return `${cantidad} ${UNIDAD_RIDER_LABEL[unidad] ?? unidad}`;
}

export interface FaltanteFila {
  repartoId: string;
  showId: string;
  fecha: Date;
  ciudad: string;
  venueNombre: string | null;
  descripcion: string;
  cantidad: number | null;
  unidad: string | null;
  prioridad: string;
  estado: string;
  cubiertoPor: string;
  porConseguir: string | null;
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

export async function faltantesDeLaGira(giraId: string): Promise<GrupoFaltantes[]> {
  const shows = await prisma.giraShow.findMany({
    where: { giraId, estado: { not: "CANCELADO" } },
    orderBy: [{ fecha: "asc" }, { orden: "asc" }],
    select: {
      id: true,
      fecha: true,
      ciudad: true,
      venue: { select: { nombre: true, ciudad: true } },
      repartos: { orderBy: [{ disciplina: "asc" }, { orden: "asc" }] },
    },
  });

  const grupos = new Map<string, GrupoFaltantes>();

  for (const s of shows) {
    const ciudad = s.ciudad?.trim() || s.venue?.ciudad?.trim() || "Sin ciudad";
    for (const r of s.repartos) {
      if (!sigueAbierta(r)) continue;
      const clave = `${normalizar(ciudad)}|${r.disciplina}`;
      let g = grupos.get(clave);
      if (!g) {
        g = {
          ciudad,
          disciplina: r.disciplina,
          disciplinaLabel: DISCIPLINA_LABEL[r.disciplina] ?? r.disciplina,
          filas: [],
          indispensables: 0,
          alPromotor: 0,
        };
        grupos.set(clave, g);
      }
      g.filas.push({
        repartoId: r.id,
        showId: s.id,
        fecha: s.fecha,
        ciudad,
        venueNombre: s.venue?.nombre ?? null,
        descripcion: r.descripcion,
        cantidad: r.cantidad,
        unidad: r.unidad,
        prioridad: r.prioridad,
        estado: r.estado,
        cubiertoPor: r.cubiertoPor,
        porConseguir: r.porConseguir,
      });
      if (r.prioridad === "INDISPENSABLE") g.indispensables++;
      if (r.cubiertoPor === "PROMOTOR") g.alPromotor++;
    }
  }

  return [...grupos.values()].sort(
    (a, b) => a.ciudad.localeCompare(b.ciudad, "es") || b.indispensables - a.indispensables,
  );
}

// ── Matriz de la gira: un departamento por fila, un show por columna ─────────
// El consolidado también cambió de unidad. Antes era un concepto por fila, y un
// rider de sesenta conceptos por cinco plazas daba una tabla de trescientas
// celdas que no se lee. Ahora cada celda es el estado de un departamento en una
// plaza, que es la pregunta que de verdad se hace: ¿cómo va audio en Monterrey?

export interface CeldaMatriz {
  showId: string;
  total: number;
  abiertos: number;
  indispensablesAbiertos: number;
  alPromotor: number;
  /// Puntos del rider de ese departamento sin un solo renglón de reparto.
  sinRepartir: number;
}

export interface FilaMatriz {
  disciplina: string;
  label: string;
  /// Indexado por showId; ausente = ese departamento no se ha tocado en ese show.
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

export async function matrizAdvance(giraId: string): Promise<MatrizAdvance> {
  const gira = await prisma.gira.findUnique({
    where: { id: giraId },
    select: {
      riderId: true,
      artistaId: true,
      shows: {
        where: { estado: { not: "CANCELADO" } },
        orderBy: [{ fecha: "asc" }, { orden: "asc" }],
        select: {
          id: true,
          fecha: true,
          ciudad: true,
          estado: true,
          venue: { select: { nombre: true, ciudad: true } },
          repartos: { select: { disciplina: true, riderLineaId: true, prioridad: true, estado: true, cubiertoPor: true } },
        },
      },
    },
  });
  if (!gira) return { columnas: [], filas: [] };

  const rider = await riderDeLaGira(gira);
  const puntosRider = rider
    ? await prisma.artistaRiderLinea.findMany({
        where: { riderId: rider.id, enAdvance: true },
        select: { id: true, disciplina: true },
      })
    : [];

  const columnas: ColumnaMatriz[] = gira.shows.map((s) => ({
    showId: s.id,
    fecha: s.fecha,
    ciudad: s.ciudad ?? s.venue?.ciudad ?? null,
    venueNombre: s.venue?.nombre ?? null,
    estado: s.estado,
  }));

  const claves = new Set<string>([
    ...puntosRider.map((p) => p.disciplina),
    ...gira.shows.flatMap((s) => s.repartos.map((r) => r.disciplina)),
  ]);

  const filas: FilaMatriz[] = [...claves]
    .sort((a, b) => (ORDEN_DISCIPLINA[a] ?? 99) - (ORDEN_DISCIPLINA[b] ?? 99))
    .map((d) => {
      const puntos = puntosRider.filter((p) => p.disciplina === d);
      const celdas: Record<string, CeldaMatriz> = {};
      let showsAbiertos = 0;

      for (const s of gira.shows) {
        const propios = s.repartos.filter((r) => r.disciplina === d);
        if (propios.length === 0 && puntos.length === 0) continue;
        const cubiertos = new Set(propios.map((r) => r.riderLineaId).filter(Boolean));
        const abiertos = propios.filter(sigueAbierta);
        const celda: CeldaMatriz = {
          showId: s.id,
          total: propios.length,
          abiertos: abiertos.length,
          indispensablesAbiertos: abiertos.filter((r) => r.prioridad === "INDISPENSABLE").length,
          alPromotor: abiertos.filter((r) => r.cubiertoPor === "PROMOTOR").length,
          sinRepartir: puntos.filter((p) => !cubiertos.has(p.id)).length,
        };
        celdas[s.id] = celda;
        if (celda.abiertos > 0 || celda.sinRepartir > 0) showsAbiertos++;
      }

      return { disciplina: d, label: DISCIPLINA_LABEL[d] ?? d, celdas, showsAbiertos };
    })
    .filter((f) => Object.keys(f.celdas).length > 0);

  return { columnas, filas };
}
