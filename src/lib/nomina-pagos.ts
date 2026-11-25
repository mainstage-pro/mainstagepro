import type { Prisma } from "@prisma/client";
import { SELECT_BONOS, totalPagoPersonal } from "./pago-personal";

// ── Nómina · pagos a personal ────────────────────────────────────────────────
// Lógica compartida entre los dos flujos que marcan una fila de nómina como
// pagada:
//   1. Toggle desde la sección de finanzas del proyecto
//      (PATCH /api/proyectos/[id]/personal/[personalId])
//   2. "Registrar pago" agregado desde Finanzas → Pagos a Personal
//      (POST /api/pagos-personal)
//
// Ambos deben producir EXACTAMENTE el mismo efecto en el ledger: un
// MovimientoFinanciero (GASTO) reconocible y ligado a la fila, más la
// liquidación de la CxP del técnico. Así el administrador nunca tiene que
// crear ni corregir movimientos a mano.

/**
 * Devuelve el id de la categoría de gasto "Personal freelance", creándola si no
 * existe. Los pagos a técnicos freelance generados desde un proyecto se
 * categorizan aquí para que el ledger los distinga de la nómina fija.
 */
export async function getCategoriaPersonalFreelance(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const existente = await tx.categoriaFinanciera.findFirst({
    where: { tipo: "GASTO", nombre: { equals: "Personal freelance", mode: "insensitive" } },
    select: { id: true },
  });
  if (existente) return existente.id;
  const creada = await tx.categoriaFinanciera.create({
    data: {
      nombre: "Personal freelance",
      tipo: "GASTO",
      descripcion: "Pagos a técnicos freelance generados desde proyectos",
    },
    select: { id: true },
  });
  return creada.id;
}

/**
 * Devuelve el id de la categoría de gasto "Sueldos y salarios", creándola si no
 * existe. Los pagos de nómina al personal interno se categorizan aquí obligatoriamente.
 */
export async function getCategoriaSueldosYSalarios(
  tx: any,
): Promise<string> {
  const existente = await tx.categoriaFinanciera.findFirst({
    where: { tipo: "GASTO", nombre: { equals: "Sueldos y salarios", mode: "insensitive" } },
    select: { id: true },
  });
  if (existente) return existente.id;
  const creada = await tx.categoriaFinanciera.create({
    data: {
      nombre: "Sueldos y salarios",
      tipo: "GASTO",
      descripcion: "Pagos de nómina y salarios a personal interno",
    },
    select: { id: true },
  });
  return creada.id;
}

export interface OpcionesPagoNomina {
  fecha: Date;
  metodoPago?: string;
  cuentaOrigenId?: string | null;
  referencia?: string | null;
  notas?: string | null;
  creadoPor?: string | null;
  overrideMonto?: number;
}

/**
 * Marca una fila de `proyecto_personal` como PAGADA creando (o reutilizando un
 * huérfano) el MovimientoFinanciero de nómina ligado, y liquida la CxP
 * pendiente del técnico en ese proyecto.
 *
 * Idempotente: si la fila ya está ligada a un movimiento, solo asegura el
 * estado PAGADO y no duplica nada.
 *
 * @returns el id del movimiento ligado, o `null` si la fila no tenía técnico o
 *          tarifa (nada que registrar en el ledger).
 */
export async function marcarFilaNominaPagada(
  tx: Prisma.TransactionClient,
  filaId: string,
  opts: OpcionesPagoNomina,
): Promise<string | null> {
  const fila = await tx.proyectoPersonal.findUnique({
    where: { id: filaId },
    select: {
      id: true,
      tecnicoId: true,
      tarifaAcordada: true,
      ...SELECT_BONOS,
      proyectoId: true,
      estadoPago: true,
      movimientoId: true,
      rolEnEvento: true,
      tecnico: { select: { nombre: true, rol: { select: { nombre: true } } } },
      rolTecnico: { select: { nombre: true } },
      proyecto: { select: { nombre: true } },
    },
  });
  if (!fila) return null;

  // Ya ligada: solo asegurar el estado y no duplicar.
  if (fila.movimientoId) {
    if (fila.estadoPago !== "PAGADO") {
      await tx.proyectoPersonal.update({
        where: { id: filaId },
        data: { estadoPago: "PAGADO" },
      });
    }
    return fila.movimientoId;
  }

  // Sin técnico o sin pago: no hay gasto que registrar, solo marcar pagado.
  const pagoFila = totalPagoPersonal(fila);
  if (!fila.tecnicoId || !pagoFila || pagoFila <= 0) {
    if (fila.estadoPago !== "PAGADO") {
      await tx.proyectoPersonal.update({
        where: { id: filaId },
        data: { estadoPago: "PAGADO" },
      });
    }
    return null;
  }

  const tecNombre = fila.tecnico?.nombre ?? "Técnico";
  const rolNombre = fila.rolEnEvento ?? fila.rolTecnico?.nombre ?? "Técnico";
  const concepto = `Nómina — ${tecNombre} · ${rolNombre} | ${fila.proyecto?.nombre ?? "Proyecto"}`;

  // Reusar un movimiento de nómina huérfano (creado por un flujo previo que no
  // ligó filas) para no duplicar el gasto.
  const huerfano = await tx.movimientoFinanciero.findFirst({
    where: {
      proyectoId: fila.proyectoId,
      tipo: "GASTO",
      concepto: { startsWith: `Nómina — ${tecNombre}` },
      proyectoPersonal: null,
      // Los complementos de otra fila también quedan sin ligar: no reutilizarlos.
      OR: [{ notas: null }, { NOT: { notas: { contains: "[fila:" } } }],
    },
    orderBy: { createdAt: "desc" },
  });

  const categoriaFreelanceId = await getCategoriaPersonalFreelance(tx);

  let movId: string;
  const finalMonto = opts.overrideMonto ?? pagoFila;
  
  if (huerfano) {
    movId = huerfano.id;
    // Asegurar la categoría en el movimiento reutilizado si venía sin ella.
    if (!huerfano.categoriaId || huerfano.monto !== finalMonto) {
      await tx.movimientoFinanciero.update({
        where: { id: movId },
        data: { categoriaId: categoriaFreelanceId, monto: finalMonto },
      });
    }
  } else {
    movId = (await tx.movimientoFinanciero.create({
      data: {
        tipo: "GASTO",
        fecha: opts.fecha,
        concepto,
        monto: finalMonto,
        metodoPago: opts.metodoPago || "TRANSFERENCIA",
        cuentaOrigenId: opts.cuentaOrigenId || null,
        referencia: opts.referencia || null,
        notas: opts.notas || null,
        proyectoId: fila.proyectoId,
        categoriaId: categoriaFreelanceId,
        creadoPor: opts.creadoPor || null,
      },
    })).id;
  }

  await tx.proyectoPersonal.update({
    where: { id: filaId },
    data: { estadoPago: "PAGADO", movimientoId: movId },
  });

  // Liquidar una CxP pendiente del técnico en este proyecto (si existe y no
  // está ligada a otro movimiento).
  const cxp = await tx.cuentaPagar.findFirst({
    where: {
      tecnicoId: fila.tecnicoId,
      proyectoId: fila.proyectoId,
      tipoAcreedor: "TECNICO",
      estado: "PENDIENTE",
      movimientoId: null,
    },
  });
  if (cxp) {
    // Un pago parcial (overrideMonto menor al total de la fila) deja la CxP en
    // PARCIAL con lo realmente pagado, en vez de liquidarla completa.
    const esParcial = finalMonto < pagoFila - 0.01;
    await tx.cuentaPagar.update({
      where: { id: cxp.id },
      data: {
        estado: esParcial ? "PARCIAL" : "LIQUIDADO",
        movimientoId: movId,
        fechaPagoReal: opts.fecha,
        montoPagado: esParcial ? Math.min(cxp.monto, finalMonto) : cxp.monto,
      },
    });
  }

  return movId;
}

// ── Complementos de pago ─────────────────────────────────────────────────────
// Una fila de nómina solo puede ligar UN movimiento (movimientoId @unique). Los
// pagos posteriores sobre una fila parcial se registran como movimientos
// propios (con su fecha y cuenta reales) y se marcan en `notas` con esta
// etiqueta para poder sumarlos al pagado de la fila.
export function etiquetaComplemento(filaId: string): string {
  return `[fila:${filaId}]`;
}

/** Suma, por fila, el monto de los movimientos de complemento registrados. */
export async function complementosPorFila(
  db: Pick<Prisma.TransactionClient, "movimientoFinanciero">,
  filaIds: string[],
): Promise<Map<string, number>> {
  const res = new Map<string, number>();
  if (!filaIds.length) return res;
  const buscadas = new Set(filaIds);
  const movs = await db.movimientoFinanciero.findMany({
    where: { tipo: "GASTO", notas: { contains: "[fila:" } },
    select: { monto: true, notas: true },
  });
  for (const m of movs) {
    for (const match of (m.notas ?? "").matchAll(/\[fila:([^\]]+)\]/g)) {
      const id = match[1];
      if (buscadas.has(id)) res.set(id, (res.get(id) ?? 0) + m.monto);
    }
  }
  return res;
}

/**
 * Revierte el pago de una fila: desliga y reabre la CxP, borra el
 * MovimientoFinanciero y deja la fila en PENDIENTE sin movimiento.
 */
export async function revertirFilaNominaPagada(
  tx: Prisma.TransactionClient,
  filaId: string,
  movimientoId: string,
): Promise<void> {
  await tx.cuentaPagar.updateMany({
    where: { movimientoId },
    data: { estado: "PENDIENTE", movimientoId: null, fechaPagoReal: null, montoPagado: 0 },
  });
  await tx.proyectoPersonal.update({
    where: { id: filaId },
    data: { estadoPago: "PENDIENTE", movimientoId: null },
  });
  await tx.movimientoFinanciero.delete({ where: { id: movimientoId } }).catch(() => {});
}

// ── Corrección de pagos ya registrados ───────────────────────────────────────
// Desde Finanzas → Pagos a personal se puede editar o eliminar un pago de
// nómina ya hecho. Cada cambio deja la fila, su CxP y el ledger cuadrados:
// el estado de la fila se recalcula con lo realmente pagado y la CxP se ajusta
// por la diferencia (no se recalcula desde cero para no pisar abonos hechos
// por otra vía, como Cobros y pagos).

const RE_FILA = /\[fila:([^\]]+)\]/;

/** Fila de nómina a la que pertenece un movimiento (ligado o complemento). */
export async function filaDeMovimiento(
  tx: Prisma.TransactionClient,
  movimientoId: string,
): Promise<{ filaId: string; esComplemento: boolean } | null> {
  const mov = await tx.movimientoFinanciero.findUnique({
    where: { id: movimientoId },
    select: { notas: true, proyectoPersonal: { select: { id: true } } },
  });
  if (!mov) return null;
  if (mov.proyectoPersonal) return { filaId: mov.proyectoPersonal.id, esComplemento: false };
  const m = (mov.notas ?? "").match(RE_FILA);
  return m ? { filaId: m[1], esComplemento: true } : null;
}

/** Recalcula el estado de pago de la fila con lo que de verdad se ha pagado. */
export async function recalcularEstadoFila(
  tx: Prisma.TransactionClient,
  filaId: string,
): Promise<void> {
  const fila = await tx.proyectoPersonal.findUnique({
    where: { id: filaId },
    select: { id: true, tarifaAcordada: true, ...SELECT_BONOS, movimiento: { select: { monto: true } } },
  });
  if (!fila) return;
  const complementos = await complementosPorFila(tx, [filaId]);
  const pagado = (fila.movimiento?.monto ?? 0) + (complementos.get(filaId) ?? 0);
  const total = totalPagoPersonal(fila) ?? 0;
  const estadoPago =
    pagado > 0.01 && pagado >= total - 0.01 ? "PAGADO" : pagado > 0.01 ? "PARCIAL" : "PENDIENTE";
  await tx.proyectoPersonal.update({ where: { id: filaId }, data: { estadoPago } });
}

/**
 * Ajusta la CxP del técnico en el proyecto por `delta` (positivo = se pagó
 * más, negativo = se pagó menos). Prefiere la CxP ligada al movimiento; si no,
 * la más reciente con algo pagado (o la más reciente, si delta > 0).
 */
export async function ajustarCxPNomina(
  tx: Prisma.TransactionClient,
  opts: { tecnicoId: string | null; proyectoId: string; movimientoId: string; delta: number },
): Promise<void> {
  if (!opts.tecnicoId || Math.abs(opts.delta) < 0.01) return;
  const base = { tecnicoId: opts.tecnicoId, proyectoId: opts.proyectoId, tipoAcreedor: "TECNICO" };
  const cxp =
    (await tx.cuentaPagar.findFirst({ where: { ...base, movimientoId: opts.movimientoId } })) ??
    (await tx.cuentaPagar.findFirst({
      where: opts.delta < 0 ? { ...base, montoPagado: { gt: 0 } } : base,
      orderBy: { createdAt: "desc" },
    }));
  if (!cxp) return;
  const montoPagado = Math.min(cxp.monto, Math.max(0, (cxp.montoPagado ?? 0) + opts.delta));
  const estado = montoPagado >= cxp.monto - 0.01 ? "LIQUIDADO" : montoPagado > 0.01 ? "PARCIAL" : "PENDIENTE";
  await tx.cuentaPagar.update({
    where: { id: cxp.id },
    data: { montoPagado, estado, ...(estado === "PENDIENTE" ? { fechaPagoReal: null } : {}) },
  });
}

/**
 * Elimina un pago de nómina (ligado o complemento). Si era el pago ligado y la
 * fila tiene complementos, el más antiguo pasa a ser el pago ligado para que
 * la fila no pierda su historial.
 */
export async function eliminarPagoNomina(
  tx: Prisma.TransactionClient,
  movimientoId: string,
): Promise<boolean> {
  const ref = await filaDeMovimiento(tx, movimientoId);
  if (!ref) return false;
  const [mov, fila] = await Promise.all([
    tx.movimientoFinanciero.findUnique({ where: { id: movimientoId }, select: { monto: true } }),
    tx.proyectoPersonal.findUnique({ where: { id: ref.filaId }, select: { tecnicoId: true, proyectoId: true } }),
  ]);
  if (!mov || !fila) return false;

  await ajustarCxPNomina(tx, { ...fila, movimientoId, delta: -mov.monto });
  await tx.cuentaPagar.updateMany({ where: { movimientoId }, data: { movimientoId: null } });

  if (!ref.esComplemento) {
    await tx.proyectoPersonal.update({ where: { id: ref.filaId }, data: { movimientoId: null } });
    const etiqueta = etiquetaComplemento(ref.filaId);
    const siguiente = await tx.movimientoFinanciero.findFirst({
      where: { tipo: "GASTO", notas: { contains: etiqueta } },
      orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
      select: { id: true, notas: true, concepto: true },
    });
    if (siguiente) {
      const notas = (siguiente.notas ?? "").replace(etiqueta, "").trim() || null;
      await tx.movimientoFinanciero.update({
        where: { id: siguiente.id },
        data: { notas, concepto: siguiente.concepto.replace(" (Complemento)", "") },
      });
      await tx.proyectoPersonal.update({ where: { id: ref.filaId }, data: { movimientoId: siguiente.id } });
    }
  }

  await tx.movimientoFinanciero.delete({ where: { id: movimientoId } });
  await recalcularEstadoFila(tx, ref.filaId);
  return true;
}
