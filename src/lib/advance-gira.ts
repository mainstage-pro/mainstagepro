/**
 * El advance de gira: cotejar el rider maestro contra lo que ofrece cada casa.
 *
 * Tres movimientos, siempre en el mismo orden:
 *   1. sembrarAdvance       — el rider maestro baja a la plaza (una fila por concepto).
 *   2. precargarDesdeVenue  — lo que ya sabíamos del foro llena la columna "ofrece la casa".
 *   3. volcarAlVenue        — al cerrar el advance, lo que realmente había queda escrito
 *                             en la ficha del venue, para que la próxima vez se arme solo.
 *
 * Y `faltantesPorProveedor`, que mira la gira completa para conseguir de una sola
 * vez lo que falta en varias plazas.
 */

import { prisma } from "@/lib/prisma";
import { normalizar } from "@/lib/buscar";
import { DISCIPLINA_LABEL, ESTADOS_RESUELTOS } from "@/lib/giras";

// ── Resultados ───────────────────────────────────────────────────────────────

export interface ResultadoSiembra {
  riderId: string | null;
  riderNombre: string | null;
  agregadas: number;
  existentes: number;
  /// Filas que ya estaban capturadas a mano y quedaron amarradas a su línea del rider.
  vinculadas: number;
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

/// Los campos de cobertura del proveedor son TEXT con un array JSON dentro.
export function parseLista(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v: unknown = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function mismaCiudad(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const x = normalizar(a).trim();
  const y = normalizar(b).trim();
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

/// Texto legible de lo que tiene la casa, tal como se pega en la columna del contra-rider.
function textoOfrecido(item: {
  cantidad: number;
  marca: string | null;
  modelo: string | null;
  condicion: string | null;
  incluidoEnRenta: boolean;
  costoExtra: number | null;
}): string {
  const equipo = [item.marca, item.modelo].filter(Boolean).join(" ").trim();
  const partes = [`${item.cantidad}`, equipo || "de casa"];
  let texto = partes.join(" × ");
  if (item.condicion && item.condicion !== "DESCONOCIDO") texto += ` (${item.condicion.toLowerCase()})`;
  if (!item.incluidoEnRenta) {
    texto += item.costoExtra ? ` — costo extra $${item.costoExtra.toLocaleString("es-MX")}` : " — no incluido en la renta";
  }
  return texto;
}

// ── 1. Siembra desde el rider maestro ────────────────────────────────────────

/**
 * Baja el rider maestro vigente a la plaza. Es idempotente en dos niveles:
 * no duplica una fila que ya nació de la misma `riderLineaId`, y tampoco duplica
 * un concepto que el usuario capturó a mano (lo adopta y le pone su `riderLineaId`).
 * Nada de lo ya capturado se sobreescribe: Mauricio edita el rider después de
 * haber trabajado el advance y no puede perder el avance de la plaza.
 */
export async function sembrarAdvance(showId: string): Promise<ResultadoSiembra> {
  const show = await prisma.giraShow.findUnique({
    where: { id: showId },
    select: { id: true, gira: { select: { riderId: true, artistaId: true } } },
  });
  if (!show) throw new Error("Show no encontrado");

  const rider = show.gira.riderId
    ? await prisma.artistaRider.findUnique({
        where: { id: show.gira.riderId },
        select: { id: true, nombre: true },
      })
    : await prisma.artistaRider.findFirst({
        where: { artistaId: show.gira.artistaId, esActivo: true, activo: true },
        orderBy: { version: "desc" },
        select: { id: true, nombre: true },
      });

  if (!rider) return { riderId: null, riderNombre: null, agregadas: 0, existentes: 0, vinculadas: 0 };

  const [lineasRider, existentes] = await Promise.all([
    prisma.artistaRiderLinea.findMany({
      where: { riderId: rider.id },
      orderBy: [{ disciplina: "asc" }, { orden: "asc" }],
    }),
    prisma.showRiderLinea.findMany({
      where: { showId },
      select: { id: true, riderLineaId: true, disciplina: true, concepto: true },
    }),
  ]);

  const porRiderLinea = new Set(existentes.map((e) => e.riderLineaId).filter((x): x is string => !!x));
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
  let orden = maxOrden;

  for (const l of lineasRider) {
    if (porRiderLinea.has(l.id)) continue;

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
  };
}

// ── 2. Precarga desde el inventario del venue ────────────────────────────────

/**
 * Llena "qué ofrece la casa" con lo que ya tenemos documentado del foro.
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

  const indexado = inventario.map((i) => ({ item: i, clave: claveConcepto(i.concepto) }));

  let precargadas = 0;
  let respetadas = 0;
  let sinCoincidencia = 0;

  for (const l of lineas) {
    if ((l.ofrecidoCasa && l.ofrecidoCasa.trim()) || l.cantidadCasa > 0) {
      respetadas++;
      continue;
    }

    const clave = claveConcepto(l.concepto);
    const candidatos = indexado.filter((c) => c.clave === clave || c.clave.includes(clave) || clave.includes(c.clave));
    // Mismo concepto en la misma disciplina gana; si no, cualquier coincidencia textual.
    const match =
      candidatos.find((c) => c.item.disciplina === l.disciplina && c.clave === clave) ??
      candidatos.find((c) => c.item.disciplina === l.disciplina) ??
      candidatos[0];

    if (!match) {
      sinCoincidencia++;
      continue;
    }

    await prisma.showRiderLinea.update({
      where: { id: l.id },
      data: {
        ofrecidoCasa: textoOfrecido(match.item),
        cantidadCasa: match.item.cantidad,
      },
    });
    precargadas++;
  }

  return { precargadas, respetadas, sinCoincidencia };
}

// ── 3. Volcado de lo aprendido a la ficha del venue ──────────────────────────

/**
 * Lo que la casa realmente puso se escribe en su ficha técnica. Es el único
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

// ── 4. Faltantes de toda la gira, agrupados para conseguirlos de una vez ─────

export interface ProveedorCandidato {
  id: string;
  nombre: string;
  empresa: string | null;
  telefono: string | null;
  correo: string | null;
  ciudades: string[];
  disciplinas: string[];
  /// true si cubre la ciudad del grupo (los demás son comodín sin cobertura declarada).
  enLaCiudad: boolean;
}

export interface FaltanteFila {
  lineaId: string;
  showId: string;
  fecha: Date;
  ciudad: string;
  venueNombre: string | null;
  disciplina: string;
  concepto: string;
  cantidadPedida: number;
  cantidadCubierta: number;
  faltante: number;
  prioridad: string;
  estado: string;
  cubiertoPor: string;
  proveedorId: string | null;
  proveedorNombre: string | null;
  costoEstimado: number | null;
}

export interface GrupoFaltantes {
  ciudad: string;
  disciplina: string;
  disciplinaLabel: string;
  filas: FaltanteFila[];
  piezasFaltantes: number;
  indispensables: number;
  costoEstimado: number;
  proveedores: ProveedorCandidato[];
}

/// Lo que falta de verdad: no resuelto y con hueco entre lo pedido y lo cubierto.
function esFaltante(l: { estado: string; cubiertoPor: string; cantidadPedida: number; cantidadCubierta: number }) {
  if (l.cubiertoPor === "NO_APLICA") return false;
  if (ESTADOS_RESUELTOS.includes(l.estado)) return false;
  return l.cantidadPedida - l.cantidadCubierta > 0;
}

export async function faltantesPorProveedor(giraId: string): Promise<GrupoFaltantes[]> {
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
          cantidadCubierta: true,
          prioridad: true,
          estado: true,
          cubiertoPor: true,
          costoEstimado: true,
          proveedor: { select: { id: true, nombre: true } },
        },
      },
    },
  });

  const grupos = new Map<string, GrupoFaltantes>();

  for (const s of shows) {
    const ciudad = s.ciudad?.trim() || s.venue?.ciudad?.trim() || "Sin ciudad";
    for (const l of s.riderLineas) {
      if (!esFaltante(l)) continue;
      const clave = `${normalizar(ciudad)}|${l.disciplina}`;
      let g = grupos.get(clave);
      if (!g) {
        g = {
          ciudad,
          disciplina: l.disciplina,
          disciplinaLabel: DISCIPLINA_LABEL[l.disciplina] ?? l.disciplina,
          filas: [],
          piezasFaltantes: 0,
          indispensables: 0,
          costoEstimado: 0,
          proveedores: [],
        };
        grupos.set(clave, g);
      }
      const faltante = l.cantidadPedida - l.cantidadCubierta;
      g.filas.push({
        lineaId: l.id,
        showId: s.id,
        fecha: s.fecha,
        ciudad,
        venueNombre: s.venue?.nombre ?? null,
        disciplina: l.disciplina,
        concepto: l.concepto,
        cantidadPedida: l.cantidadPedida,
        cantidadCubierta: l.cantidadCubierta,
        faltante,
        prioridad: l.prioridad,
        estado: l.estado,
        cubiertoPor: l.cubiertoPor,
        proveedorId: l.proveedor?.id ?? null,
        proveedorNombre: l.proveedor?.nombre ?? null,
        costoEstimado: l.costoEstimado,
      });
      g.piezasFaltantes += faltante;
      if (l.prioridad === "INDISPENSABLE") g.indispensables++;
      g.costoEstimado += l.costoEstimado ?? 0;
    }
  }

  if (!grupos.size) return [];

  const proveedores = await prisma.proveedor.findMany({
    where: { activo: true },
    orderBy: [{ prioridad: "desc" }, { nombre: "asc" }],
    select: {
      id: true,
      nombre: true,
      empresa: true,
      telefono: true,
      correo: true,
      ciudades: true,
      disciplinas: true,
    },
  });

  const conCobertura = proveedores.map((p) => ({
    ...p,
    listaCiudades: parseLista(p.ciudades),
    listaDisciplinas: parseLista(p.disciplinas),
  }));

  for (const g of grupos.values()) {
    g.proveedores = conCobertura
      .filter((p) => {
        const ciudadOk = p.listaCiudades.some((c) => mismaCiudad(c, g.ciudad));
        if (!ciudadOk) return false;
        return p.listaDisciplinas.length === 0 || p.listaDisciplinas.includes(g.disciplina);
      })
      .map((p) => ({
        id: p.id,
        nombre: p.nombre,
        empresa: p.empresa,
        telefono: p.telefono,
        correo: p.correo,
        ciudades: p.listaCiudades,
        disciplinas: p.listaDisciplinas,
        enLaCiudad: true,
      }));
  }

  return [...grupos.values()].sort(
    (a, b) => a.ciudad.localeCompare(b.ciudad, "es") || b.indispensables - a.indispensables,
  );
}

// ── Proveedores ordenados para el selector de una plaza ──────────────────────

/**
 * Catálogo de proveedores para el selector del advance: los de la ciudad del
 * venue arriba, el resto después pero disponible (en gira se renta donde se puede).
 */
export async function proveedoresParaPlaza(ciudad: string | null | undefined): Promise<ProveedorCandidato[]> {
  const proveedores = await prisma.proveedor.findMany({
    where: { activo: true },
    orderBy: [{ nombre: "asc" }],
    select: {
      id: true,
      nombre: true,
      empresa: true,
      telefono: true,
      correo: true,
      ciudades: true,
      disciplinas: true,
    },
  });

  return proveedores
    .map((p) => {
      const listaCiudades = parseLista(p.ciudades);
      return {
        id: p.id,
        nombre: p.nombre,
        empresa: p.empresa,
        telefono: p.telefono,
        correo: p.correo,
        ciudades: listaCiudades,
        disciplinas: parseLista(p.disciplinas),
        enLaCiudad: listaCiudades.some((c) => mismaCiudad(c, ciudad)),
      };
    })
    .sort((a, b) => Number(b.enLaCiudad) - Number(a.enLaCiudad) || a.nombre.localeCompare(b.nombre, "es"));
}

// ── Matriz de la gira: un concepto por fila, una plaza por columna ───────────

export interface CeldaMatriz {
  showId: string;
  lineaId: string | null;
  cantidadPedida: number;
  cantidadCubierta: number;
  faltante: number;
  cubiertoPor: string;
  estado: string;
  prioridad: string;
  proveedorNombre: string | null;
}

export interface FilaMatriz {
  clave: string;
  disciplina: string;
  concepto: string;
  prioridad: string;
  /// Indexado por showId; ausente = esa plaza no tiene el concepto en su advance.
  celdas: Record<string, CeldaMatriz>;
  plazasConFaltante: number;
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

/// La prioridad más alta gana cuando el mismo concepto viene con distinta prioridad por plaza.
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
          cantidadCubierta: true,
          cubiertoPor: true,
          estado: true,
          prioridad: true,
          proveedor: { select: { nombre: true } },
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
          plazasConFaltante: 0,
        };
        filas.set(clave, f);
      }
      if ((PESO_PRIORIDAD[l.prioridad] ?? 0) > (PESO_PRIORIDAD[f.prioridad] ?? 0)) f.prioridad = l.prioridad;

      const faltante = esFaltante(l) ? l.cantidadPedida - l.cantidadCubierta : 0;
      f.celdas[s.id] = {
        showId: s.id,
        lineaId: l.id,
        cantidadPedida: l.cantidadPedida,
        cantidadCubierta: l.cantidadCubierta,
        faltante,
        cubiertoPor: l.cubiertoPor,
        estado: l.estado,
        prioridad: l.prioridad,
        proveedorNombre: l.proveedor?.nombre ?? null,
      };
      if (faltante > 0) f.plazasConFaltante++;
    }
  }

  const ordenadas = [...filas.values()].sort(
    (a, b) =>
      a.disciplina.localeCompare(b.disciplina, "es") ||
      b.plazasConFaltante - a.plazasConFaltante ||
      a.concepto.localeCompare(b.concepto, "es"),
  );

  return { columnas, filas: ordenadas };
}
