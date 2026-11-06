import type { Prisma } from "@prisma/client";

// Mismo criterio de "cobro cae el próximo lunes tras el evento" que usa
// crear-proyecto.ts (proximoLunesTraEvento) — se replica aquí porque esa
// función no está exportada y este archivo no debe importar de Pro.
function proximoLunesTrasFecha(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  const dow = d.getDay();
  d.setDate(d.getDate() + ((8 - dow) % 7));
  return d;
}

const QUINCE_DIAS_MS = 15 * 24 * 60 * 60 * 1000;

/**
 * Crea la cuenta por cobrar de una PropuestaServicio aprobada (Live o
 * Creative) dentro de la misma transacción de aprobación — espejo del
 * "paso 5" de crearProyectoDesdeCotizacion (src/lib/crear-proyecto.ts) para
 * el mundo de Pro. Sin esto, lo que vende Live/Creative nunca entra a
 * /finanzas/cobros-pagos.
 *
 * Idempotente por propuesta (mismo criterio que confirmarGiraDesdePropuesta /
 * confirmarProyectoCreativoDesdePropuesta): si ya existe una CxC para esta
 * propuesta, no crea otra. Una sola fila por el TOTAL — sin split de
 * anticipo/liquidación (decisión del dueño, 2026-11-06).
 */
export async function crearCxCDesdePropuesta(
  tx: Prisma.TransactionClient,
  propuestaId: string,
): Promise<void> {
  const yaExiste = await tx.cuentaCobrar.findFirst({
    where: { propuestaServicioId: propuestaId },
    select: { id: true },
  });
  if (yaExiste) return;

  const propuesta = await tx.propuestaServicio.findUnique({
    where: { id: propuestaId },
    select: {
      id: true,
      numero: true,
      titulo: true,
      granTotal: true,
      clienteId: true,
      gira: { select: { clienteId: true, fechaInicio: true, fechaFin: true } },
      proyectoCreativo: { select: { clienteId: true, fechaEntrega: true } },
    },
  });
  if (!propuesta) return;
  // Si no está ligada ni a Gira ni a ProyectoCreativo no es una propuesta de
  // Live/Creative en el sentido de esta función (caso no esperado hoy, pero
  // defensivo: nunca generar una CxC huérfana de contexto).
  if (!propuesta.gira && !propuesta.proyectoCreativo) return;

  const clienteId =
    propuesta.clienteId ?? propuesta.gira?.clienteId ?? propuesta.proyectoCreativo?.clienteId ?? null;

  const fechaCompromiso = propuesta.gira
    ? proximoLunesTrasFecha(propuesta.gira.fechaFin ?? propuesta.gira.fechaInicio ?? new Date())
    : (propuesta.proyectoCreativo?.fechaEntrega ?? new Date(Date.now() + QUINCE_DIAS_MS));

  await tx.cuentaCobrar.create({
    data: {
      clienteId,
      propuestaServicioId: propuesta.id,
      concepto: `Total — ${propuesta.titulo ?? propuesta.numero}`,
      tipoPago: "TOTAL",
      monto: propuesta.granTotal,
      fechaCompromiso,
      estado: "PENDIENTE",
    },
  });
}
