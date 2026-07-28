import type { Prisma } from "@prisma/client";

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

export interface OpcionesPagoNomina {
  fecha: Date;
  metodoPago?: string;
  cuentaOrigenId?: string | null;
  referencia?: string | null;
  notas?: string | null;
  creadoPor?: string | null;
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

  // Sin técnico o sin tarifa: no hay gasto que registrar, solo marcar pagado.
  if (!fila.tecnicoId || !fila.tarifaAcordada || fila.tarifaAcordada <= 0) {
    if (fila.estadoPago !== "PAGADO") {
      await tx.proyectoPersonal.update({
        where: { id: filaId },
        data: { estadoPago: "PAGADO" },
      });
    }
    return null;
  }

  const tecNombre = fila.tecnico?.nombre ?? "Técnico";
  const rolNombre = fila.rolEnEvento ?? fila.rolTecnico?.nombre ?? fila.tecnico?.rol?.nombre ?? "Técnico";
  const concepto = `Nómina — ${tecNombre} · ${rolNombre} | ${fila.proyecto?.nombre ?? "Proyecto"}`;

  // Reusar un movimiento de nómina huérfano (creado por un flujo previo que no
  // ligó filas) para no duplicar el gasto.
  const huerfano = await tx.movimientoFinanciero.findFirst({
    where: {
      proyectoId: fila.proyectoId,
      tipo: "GASTO",
      concepto: { startsWith: `Nómina — ${tecNombre}` },
      proyectoPersonal: null,
    },
    orderBy: { createdAt: "desc" },
  });

  const movId = huerfano
    ? huerfano.id
    : (await tx.movimientoFinanciero.create({
        data: {
          tipo: "GASTO",
          fecha: opts.fecha,
          concepto,
          monto: fila.tarifaAcordada,
          metodoPago: opts.metodoPago || "TRANSFERENCIA",
          cuentaOrigenId: opts.cuentaOrigenId || null,
          referencia: opts.referencia || null,
          notas: opts.notas || null,
          proyectoId: fila.proyectoId,
          creadoPor: opts.creadoPor || null,
        },
      })).id;

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
    await tx.cuentaPagar.update({
      where: { id: cxp.id },
      data: {
        estado: "LIQUIDADO",
        movimientoId: movId,
        fechaPagoReal: opts.fecha,
        montoPagado: cxp.monto,
      },
    });
  }

  return movId;
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
