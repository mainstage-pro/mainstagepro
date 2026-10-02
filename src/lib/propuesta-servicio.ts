// Motor de cálculo de la propuesta de servicios de production management.
//
// Es hermano del cotizador de renta, no un parche: aquí no hay descuentos
// escalonados por volumen ni viáticos por día. Se cobra alcance y honorarios,
// y el reembolsable viaja aparte para que no se coma el margen.
//
// Todo es puro: corre igual en el servidor (al guardar) y en el cliente (al
// recalcular en vivo mientras se edita la tabla de líneas).

import { GRUPO_SUBTOTAL, IVA } from "./giras";

/// Lo mínimo que el motor necesita de una línea. Deliberadamente más laxo que
/// PropuestaServicioLinea para que el editor pueda pasar filas a medio capturar.
export interface LineaCalculable {
  tipo: string;
  cantidad: number;
  precioUnitario: number;
  costoUnitario?: number | null;
  esIncluido?: boolean | null;
  esReembolsable?: boolean | null;
}

export interface OpcionesResumen {
  descuentoMonto?: number | null;
  aplicaIva?: boolean | null;
  /// Tasa de IVA; se deja abierta para facturación a tasa 0 o fronteriza.
  tasaIva?: number;
}

export interface GruposSubtotal {
  honorarios: number;
  equipo: number;
  logistica: number;
  reembolsables: number;
}

export interface ResumenPropuesta {
  grupos: GruposSubtotal;
  subtotalHonorarios: number;
  subtotalEquipo: number;
  subtotalLogistica: number;
  subtotalReembolsables: number;
  descuentoMonto: number;
  /// Base gravable: los cuatro grupos menos el descuento.
  subtotal: number;
  montoIva: number;
  granTotal: number;

  /// Costo de todo lo que lleva costoUnitario, reembolsables incluidos.
  costoEstimado: number;
  /// Costo de lo que NO es reembolsable: el que de verdad pelea contra el honorario.
  costoOperativo: number;

  /// Venta propia (honorarios + equipo + logística, sin reembolsables) menos descuento.
  ventaPropia: number;
  utilidad: number;
  /// Margen en % sobre `ventaPropia`. null si no hay venta propia que medir.
  margenPct: number | null;

  /// Reembolsables reportados aparte: no entran al margen.
  reembolsables: { venta: number; costo: number };

  cantidadLineas: number;
  cantidadIncluidas: number;
}

/// Subtotal de una línea. Una línea marcada como incluida vale 0 pero se
/// conserva en la propuesta: es alcance que se entrega sin cargo, y el cliente
/// tiene que verlo escrito para valorarlo.
export function subtotalLinea(l: LineaCalculable): number {
  if (l.esIncluido) return 0;
  return redondear(num(l.cantidad) * num(l.precioUnitario));
}

export function costoLinea(l: LineaCalculable): number {
  return redondear(num(l.cantidad) * num(l.costoUnitario));
}

export function grupoDeTipo(tipo: string): keyof GruposSubtotal {
  return GRUPO_SUBTOTAL[tipo] ?? "honorarios";
}

/// Una línea cuenta como reembolsable por su bandera o por su tipo: ambos
/// caminos existen porque el usuario puede marcar un viaje concreto como
/// reembolsable sin cambiarle el tipo.
export function esReembolsable(l: LineaCalculable): boolean {
  return Boolean(l.esReembolsable) || grupoDeTipo(l.tipo) === "reembolsables";
}

export function calcularResumenPropuesta(
  lineas: LineaCalculable[],
  opciones: OpcionesResumen = {},
): ResumenPropuesta {
  const tasaIva = opciones.tasaIva ?? IVA;

  const grupos: GruposSubtotal = { honorarios: 0, equipo: 0, logistica: 0, reembolsables: 0 };
  let costoEstimado = 0;
  let costoOperativo = 0;
  let reembolsableVenta = 0;
  let reembolsableCosto = 0;
  let cantidadIncluidas = 0;

  for (const l of lineas) {
    const venta = subtotalLinea(l);
    const costo = costoLinea(l);
    const reembolsable = esReembolsable(l);

    if (l.esIncluido) cantidadIncluidas++;

    // El descuento como tipo de línea entra negativo a honorarios; el campo
    // descuentoMonto de la cabecera es otra palanca y se aplica después.
    const signo = l.tipo === "DESCUENTO" ? -1 : 1;
    grupos[reembolsable ? "reembolsables" : grupoDeTipo(l.tipo)] += signo * venta;

    costoEstimado += costo;
    if (reembolsable) {
      reembolsableVenta += venta;
      reembolsableCosto += costo;
    } else {
      costoOperativo += costo;
    }
  }

  for (const k of Object.keys(grupos) as (keyof GruposSubtotal)[]) {
    grupos[k] = redondear(grupos[k]);
  }

  const descuentoMonto = redondear(Math.max(0, num(opciones.descuentoMonto)));
  const bruto = grupos.honorarios + grupos.equipo + grupos.logistica + grupos.reembolsables;
  const subtotal = redondear(bruto - descuentoMonto);
  const montoIva = opciones.aplicaIva ? redondear(subtotal * tasaIva) : 0;
  const granTotal = redondear(subtotal + montoIva);

  // El descuento de cabecera castiga la venta propia, no el reembolsable:
  // nadie descuenta un vuelo que va a costo.
  const ventaPropia = redondear(grupos.honorarios + grupos.equipo + grupos.logistica - descuentoMonto);
  const utilidad = redondear(ventaPropia - costoOperativo);

  return {
    grupos,
    subtotalHonorarios: grupos.honorarios,
    subtotalEquipo: grupos.equipo,
    subtotalLogistica: grupos.logistica,
    subtotalReembolsables: grupos.reembolsables,
    descuentoMonto,
    subtotal,
    montoIva,
    granTotal,
    costoEstimado: redondear(costoEstimado),
    costoOperativo: redondear(costoOperativo),
    ventaPropia,
    utilidad,
    margenPct: ventaPropia > 0 ? redondear((utilidad / ventaPropia) * 100) : null,
    reembolsables: { venta: redondear(reembolsableVenta), costo: redondear(reembolsableCosto) },
    cantidadLineas: lineas.length,
    cantidadIncluidas,
  };
}

/// Los campos de la cabecera que el resumen determina. Se usa tal cual en el
/// `data` del update de Prisma para que no se pueda olvidar un subtotal.
export function camposResumen(r: ResumenPropuesta) {
  return {
    subtotalHonorarios: r.subtotalHonorarios,
    subtotalEquipo: r.subtotalEquipo,
    subtotalLogistica: r.subtotalLogistica,
    subtotalReembolsables: r.subtotalReembolsables,
    subtotal: r.subtotal,
    montoIva: r.montoIva,
    granTotal: r.granTotal,
    costoEstimado: r.costoEstimado,
  };
}

// ── Cuantificación desde la gira ─────────────────────────────────────────────

export interface ShowCuantificable {
  id: string;
  venueId?: string | null;
  ciudad?: string | null;
  estado?: string | null;
}

export interface ConteoGira {
  shows: number;
  /// Plazas = venues distintos. Tres fechas en el Lunario son 3 shows y 1 plaza:
  /// el advance técnico se hace una vez por venue, no una por fecha.
  plazas: number;
  ciudades: number;
}

export function contarGira(shows: ShowCuantificable[]): ConteoGira {
  const vivos = shows.filter((s) => s.estado !== "CANCELADO");
  const plazas = new Set<string>();
  const ciudades = new Set<string>();
  for (const s of vivos) {
    // Sin venue en catálogo, la ciudad hace de llave; sin ninguna de las dos,
    // el propio id — una plaza desconocida es una plaza distinta.
    plazas.add(s.venueId ?? (s.ciudad ? `ciudad:${s.ciudad.trim().toLowerCase()}` : `show:${s.id}`));
    if (s.ciudad?.trim()) ciudades.add(s.ciudad.trim().toLowerCase());
  }
  return { shows: vivos.length, plazas: plazas.size, ciudades: ciudades.size };
}

/// Cuántas unidades pide una línea según su unidad de cobro y el tamaño de la gira.
export function cantidadSugerida(unidad: string, conteo: ConteoGira): number {
  switch (unidad) {
    case "SHOW":
      return conteo.shows || 1;
    case "PLAZA":
      return conteo.plazas || 1;
    case "DIA":
    case "PERSONA_DIA":
      return conteo.shows || 1;
    case "GIRA":
    case "GLOBAL":
    case "MES":
      return 1;
    default:
      return 1;
  }
}

// ── Utilidades internas ──────────────────────────────────────────────────────

function num(v: number | null | undefined): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/// Dos decimales: el dinero no se guarda con cola de flotante.
function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}
