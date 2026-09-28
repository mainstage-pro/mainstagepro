import type { Prisma } from "@prisma/client";
import { CAMPO_ACREEDOR, TIPOS_ACREEDOR, esTipoAcreedor } from "@/lib/proveedor-evento";

// ── Pagos a proveedores ──────────────────────────────────────────────────────
// La contraparte de `nomina-pagos.ts`. Todo lo que el proyecto le debe a alguien
// que no es su nómina —el proveedor coordinado en preproducción, el imprevisto
// que alguien puso de su bolsa y el gasto capturado a mano— se paga con estas
// funciones, ya sea desde la pestaña de finanzas del proyecto o desde el módulo
// del ciclo semanal. Ambos caminos tienen que dejar el mismo rastro en el
// ledger: un MovimientoFinanciero por desembolso, su AbonoPago, y la CxP con su
// saldo al día.

/** De dónde salió el gasto. Decide cómo se agrupa y se lee, no cómo se paga. */
export const ORIGENES_GASTO = [
  { valor: "COORDINADO", label: "Coordinado", desc: "Rentado en preproducción" },
  { valor: "IMPREVISTO", label: "Imprevisto", desc: "Salió sobre la marcha" },
  { valor: "DIRECTO", label: "Gasto directo", desc: "Capturado a mano en finanzas" },
] as const;

export type OrigenGasto = (typeof ORIGENES_GASTO)[number]["valor"];

export const origenLabel = (v: string): string =>
  ORIGENES_GASTO.find((o) => o.valor === v)?.label ?? "Gasto";

/** Estado de un gasto ante la caja. `SIN_CXP` = todavía no es una deuda formal. */
export type EstadoGasto = "SIN_CXP" | "PENDIENTE" | "PARCIAL" | "PAGADO";

// ── Ciclo semanal ────────────────────────────────────────────────────────────
// Mismo calendario que la nómina: se paga el miércoles lo que ocurrió en los
// siete días anteriores. Que proveedores y personal compartan ciclo es lo que
// permite ver de un solo golpe cuánto sale de la caja esa semana.

/** Rango de eventos que se pagan en el miércoles dado. */
export function rangoDelCiclo(ciclo: Date): { desde: Date; hasta: Date } {
  const base = new Date(ciclo);
  base.setHours(12, 0, 0, 0);
  const desde = new Date(base);
  desde.setDate(desde.getDate() - 7);
  desde.setHours(0, 0, 0, 0);
  const hasta = new Date(base);
  hasta.setDate(hasta.getDate() - 1);
  hasta.setHours(23, 59, 59, 999);
  return { desde, hasta };
}

/** El miércoles del ciclo en curso. */
export function cicloVigente(hoy = new Date()): Date {
  const d = new Date(hoy);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow <= 3 ? 3 - dow : 10 - dow));
  return d;
}

/** El miércoles en que toca pagar lo de un evento. */
export function proximoMiercolesTrasEvento(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow <= 3 ? 3 - dow : 10 - dow));
  return d;
}

// ── CxP desde un renglón de proveedor del evento ─────────────────────────────

export type ResultadoCxP =
  | { ok: true; cuentaPagarId: string; creada: boolean; concepto: string }
  | { ok: false; error: string };

/**
 * Crea —o pone al día— la cuenta por pagar de un renglón de `ProveedorEvento`.
 *
 * Al técnico y a la gente de casa se les debe igual que a un proveedor: lo
 * pagaron de su bolsa. `CuentaPagar` solo tiene llave para proveedor y técnico,
 * así que el reembolso al personal interno se reconoce por `tipoAcreedor` y
 * lleva el nombre en el concepto.
 *
 * Idempotente: si el renglón ya tiene CxP, la actualiza en lugar de duplicarla.
 */
export async function asegurarCxPDeProveedorEvento(
  tx: Prisma.TransactionClient,
  proveedorEventoId: string,
): Promise<ResultadoCxP> {
  const bloque = await tx.proveedorEvento.findUnique({
    where: { id: proveedorEventoId },
    include: {
      proyecto: { select: { numeroProyecto: true, fechaEvento: true } },
      items: { orderBy: { orden: "asc" } },
      lineas: { select: { descripcion: true, cantidad: true }, orderBy: { orden: "asc" } },
    },
  });
  if (!bloque) return { ok: false, error: "No encontrado" };
  if (!bloque.costoAcordado || bloque.costoAcordado <= 0) {
    return { ok: false, error: "Captura primero el costo acordado" };
  }

  const tipoAcreedor = esTipoAcreedor(bloque.tipoAcreedor) ? bloque.tipoAcreedor : "PROVEEDOR";
  const acreedorId = bloque[CAMPO_ACREEDOR[tipoAcreedor]];
  if (!acreedorId) {
    const { singular } = TIPOS_ACREEDOR.find((t) => t.valor === tipoAcreedor)!;
    return {
      ok: false,
      error: `Registra al ${singular} en el catálogo para poder generarle la cuenta por pagar`,
    };
  }

  // Si nadie escribió el servicio, la CxP se describe con lo que el proveedor
  // renta: sus conceptos manuales y las líneas de la cotización que se le asignaron.
  const rentado = [
    ...bloque.items.map((it) => `${it.cantidad}× ${it.descripcion}`),
    ...bloque.lineas.map((l) => `${l.cantidad}× ${l.descripcion}`),
  ].join(", ");
  const descrito = bloque.servicioEquipo?.trim() || rentado || "Servicio del evento";
  // El imprevisto lleva su cantidad en `unidades` porque se captura en un solo renglón.
  const servicio = (bloque.unidades ? `${bloque.unidades}× ${descrito}` : descrito).slice(0, 180);
  const etiqueta = bloque.imprevisto ? "Imprevisto: " : "";
  const concepto = `${etiqueta}${servicio} — ${bloque.nombreProveedor} · ${bloque.proyecto.numeroProyecto}`;
  const fechaCompromiso = proximoMiercolesTrasEvento(bloque.proyecto.fechaEvento ?? new Date());

  const llaves = {
    tipoAcreedor,
    proveedorId: bloque.proveedorId,
    tecnicoId: bloque.tecnicoId,
  };

  if (bloque.cuentaPagarId) {
    // Lo ya pagado no se reabre: solo se corrigen los datos descriptivos.
    const actual = await tx.cuentaPagar.findUnique({
      where: { id: bloque.cuentaPagarId },
      select: { estado: true, montoPagado: true },
    });
    const data: Prisma.CuentaPagarUpdateInput = { concepto };
    if (actual && actual.estado !== "LIQUIDADO" && actual.montoPagado === 0) {
      Object.assign(data, llaves, { monto: bloque.costoAcordado, fechaCompromiso });
    }
    await tx.cuentaPagar.update({ where: { id: bloque.cuentaPagarId }, data });
    return { ok: true, cuentaPagarId: bloque.cuentaPagarId, creada: false, concepto };
  }

  const cuentaPagar = await tx.cuentaPagar.create({
    data: {
      ...llaves,
      proyectoId: bloque.proyectoId,
      concepto,
      monto: bloque.costoAcordado,
      fechaCompromiso,
      estado: "PENDIENTE",
      notas: bloque.notas?.trim() || null,
    },
    select: { id: true },
  });
  await tx.proveedorEvento.update({
    where: { id: proveedorEventoId },
    data: { cuentaPagarId: cuentaPagar.id },
  });

  return { ok: true, cuentaPagarId: cuentaPagar.id, creada: true, concepto };
}

// ── Abonos ───────────────────────────────────────────────────────────────────

export interface DesembolsoProveedor {
  monto: number;
  fecha: Date;
  metodoPago?: string | null;
  cuentaOrigenId?: string | null;
  referencia?: string | null;
  notas?: string | null;
  creadoPor?: string | null;
}

/** Lo que aún se le debe a una CxP, descontando abonos y compensaciones. */
export function saldoDeCuentaPagar(cxp: {
  monto: number;
  montoPagado: number;
  montoCompensado?: Prisma.Decimal | number | null;
}): number {
  const compensado = Number(cxp.montoCompensado ?? 0);
  return Math.round((cxp.monto - cxp.montoPagado - compensado) * 100) / 100;
}

/**
 * Registra un desembolso contra una cuenta por pagar: crea el
 * MovimientoFinanciero (GASTO), su AbonoPago, y deja la CxP en PARCIAL o
 * LIQUIDADO según el saldo resultante.
 *
 * No toca nómina, deudas ni repartos: esas CxP tienen sus propios flujos y el
 * módulo de proveedores no las lista.
 *
 * @returns el id del movimiento creado.
 */
export async function abonarCuentaPagar(
  tx: Prisma.TransactionClient,
  cuentaPagarId: string,
  desembolso: DesembolsoProveedor,
): Promise<string> {
  const cxp = await tx.cuentaPagar.findUniqueOrThrow({
    where: { id: cuentaPagarId },
    select: {
      id: true, concepto: true, monto: true, montoPagado: true, montoCompensado: true,
      proyectoId: true, categoriaId: true,
    },
  });

  const monto = Math.round(desembolso.monto * 100) / 100;
  if (monto <= 0) throw new Error("El abono debe ser mayor a cero");

  const movimiento = await tx.movimientoFinanciero.create({
    data: {
      tipo: "GASTO",
      fecha: desembolso.fecha,
      concepto: cxp.concepto,
      monto,
      proyectoId: cxp.proyectoId,
      categoriaId: cxp.categoriaId,
      metodoPago: desembolso.metodoPago || "TRANSFERENCIA",
      cuentaOrigenId: desembolso.cuentaOrigenId || null,
      referencia: desembolso.referencia || null,
      notas: desembolso.notas || null,
      creadoPor: desembolso.creadoPor || null,
    },
    select: { id: true },
  });

  await tx.abonoPago.create({
    data: {
      cuentaPagarId,
      monto,
      fecha: desembolso.fecha,
      metodoPago: desembolso.metodoPago || "TRANSFERENCIA",
      cuentaOrigenId: desembolso.cuentaOrigenId || null,
      notas: desembolso.notas || null,
      movimientoId: movimiento.id,
      creadoPor: desembolso.creadoPor || null,
    },
  });

  const montoPagado = Math.round((cxp.montoPagado + monto) * 100) / 100;
  const liquidado = montoPagado + Number(cxp.montoCompensado ?? 0) >= cxp.monto - 0.01;

  await tx.cuentaPagar.update({
    where: { id: cuentaPagarId },
    data: {
      montoPagado,
      estado: liquidado ? "LIQUIDADO" : "PARCIAL",
      fechaPagoReal: desembolso.fecha,
      cuentaOrigenId: desembolso.cuentaOrigenId || undefined,
    },
  });

  return movimiento.id;
}

export interface AplicacionAbono {
  cuentaPagarId: string;
  monto: number;
}

/**
 * Reparte una lista de desembolsos entre varias cuentas por pagar, en orden,
 * llenando cada una hasta su saldo antes de pasar a la siguiente.
 *
 * Así un solo pago a un proveedor que trae tres eventos de la semana se refleja
 * como tres abonos exactos —uno por evento— en lugar de un movimiento suelto que
 * después alguien tenga que conciliar a mano. Si un desembolso se parte entre
 * dos CxP, se generan dos abonos con el mismo método y referencia.
 *
 * @returns las aplicaciones efectivamente registradas.
 */
export async function repartirDesembolsos(
  tx: Prisma.TransactionClient,
  cuentasPagarIds: string[],
  desembolsos: DesembolsoProveedor[],
): Promise<AplicacionAbono[]> {
  const cuentas = await tx.cuentaPagar.findMany({
    where: { id: { in: cuentasPagarIds }, estado: { not: "LIQUIDADO" } },
    select: { id: true, monto: true, montoPagado: true, montoCompensado: true },
  });
  // Respetar el orden en que la interfaz las mostró y el usuario las seleccionó.
  const porId = new Map(cuentas.map((c) => [c.id, c]));
  const saldos = cuentasPagarIds
    .map((id) => porId.get(id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .map((c) => ({ id: c.id, saldo: saldoDeCuentaPagar(c) }))
    .filter((s) => s.saldo > 0.01);

  const aplicaciones: AplicacionAbono[] = [];
  let i = 0;

  for (const desembolso of desembolsos) {
    let resto = Math.round(desembolso.monto * 100) / 100;
    while (resto > 0.01 && i < saldos.length) {
      const aplica = Math.round(Math.min(resto, saldos[i].saldo) * 100) / 100;
      if (aplica > 0.01) {
        await abonarCuentaPagar(tx, saldos[i].id, { ...desembolso, monto: aplica });
        aplicaciones.push({ cuentaPagarId: saldos[i].id, monto: aplica });
        saldos[i].saldo = Math.round((saldos[i].saldo - aplica) * 100) / 100;
        resto = Math.round((resto - aplica) * 100) / 100;
      }
      if (saldos[i].saldo <= 0.01) i++;
      else break; // el desembolso se agotó dentro de esta cuenta
    }
  }

  return aplicaciones;
}
