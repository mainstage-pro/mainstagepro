// Motor de seguimientos por cambio de etapa del pipeline.
// Al ENTRAR a cada etapa se agenda automáticamente la acción que corresponde,
// para tener claridad de qué hacer una vez que se cierra la etapa anterior.
import { prisma } from "@/lib/prisma";
import { ensureSeguimientoColumns } from "@/lib/migraciones-lazy";

// ── Migración lazy (Neon): asegura la columna "etapa" en seguimientos ────────
// Centralizada en migraciones-lazy.ts (también corre al arranque).
export async function ensureSeguimientoEtapaCol() {
  await ensureSeguimientoColumns();
}

// ── Acción de entrada que se agenda al ENTRAR a cada etapa ───────────────────
type AccionEntrada = { titulo: string; canal: string; offsetDias: number };

export const ETAPA_ACCION_ENTRADA: Record<string, AccionEntrada> = {
  LEAD:           { titulo: "Primer contacto con el prospecto",              canal: "whatsapp", offsetDias: 0 },
  DESCUBRIMIENTO: { titulo: "Contacto de descubrimiento y enviar presentación", canal: "llamada",  offsetDias: 1 },
  OPORTUNIDAD:    { titulo: "Preparar y enviar la cotización",               canal: "whatsapp", offsetDias: 1 },
  VENTA_CERRADA:  { titulo: "Confirmar anticipo y arrancar producción",      canal: "whatsapp", offsetDias: 1 },
  VENTA_PERDIDA:  { titulo: "Reactivación futura del prospecto",             canal: "whatsapp", offsetDias: 45 },
};

/**
 * Agenda el seguimiento de entrada de una etapa.
 * Idempotente: no duplica si ya existe uno "auto_etapa" para ese trato+etapa
 * (así arrastrar de ida y vuelta en el Kanban no genera ruido).
 */
export async function agendarSeguimientoPorEtapa(tratoId: string, nuevaEtapa: string) {
  const accion = ETAPA_ACCION_ENTRADA[nuevaEtapa];
  if (!accion) return;

  await ensureSeguimientoEtapaCol();

  const yaExiste = await prisma.seguimiento.count({
    where: { tratoId, tipo: "auto_etapa", etapa: nuevaEtapa },
  });
  if (yaExiste > 0) return;

  const fecha = new Date();
  fecha.setHours(10, 0, 0, 0);
  fecha.setDate(fecha.getDate() + accion.offsetDias);

  await prisma.seguimiento.create({
    data: {
      tratoId,
      tipo: "auto_etapa",
      etapa: nuevaEtapa,
      canal: accion.canal,
      titulo: accion.titulo,
      nota: "Agendado automáticamente al entrar a esta etapa.",
      numero: null,
      fechaProgramada: fecha,
    },
  });
}

// ── Presentaciones de venta (Descubrimiento) ─────────────────────────────────
// Migración lazy: columna "tratoId" en presentaciones_venta (sin FK a propósito).
// Centralizada en migraciones-lazy.ts (también corre al arranque).
export async function ensurePresentacionTratoCol() {
  await ensureSeguimientoColumns();
}

/**
 * Agenda el seguimiento de revisión cuando se envía una presentación al prospecto.
 * Idempotente por trato: no duplica si ya hay uno pendiente del mismo título.
 */
export async function agendarSeguimientoPresentacionEnviada(tratoId: string) {
  await ensureSeguimientoEtapaCol();

  const titulo = "¿Revisaron la presentación? Dar seguimiento";
  const yaExiste = await prisma.seguimiento.count({
    where: { tratoId, titulo, completado: false },
  });
  if (yaExiste > 0) return;

  const trato = await prisma.trato.findUnique({
    where: { id: tratoId },
    select: { etapa: true },
  });

  const fecha = new Date();
  fecha.setHours(10, 0, 0, 0);
  fecha.setDate(fecha.getDate() + 2);

  await prisma.seguimiento.create({
    data: {
      tratoId,
      tipo: "auto_etapa",
      etapa: trato?.etapa ?? "DESCUBRIMIENTO",
      canal: "whatsapp",
      titulo,
      nota: "Agendado automáticamente al enviar la presentación al prospecto.",
      numero: null,
      fechaProgramada: fecha,
    },
  });
}
