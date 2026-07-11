// Motor de seguimientos por cambio de etapa del pipeline.
// Al ENTRAR a cada etapa se agenda automáticamente la acción que corresponde,
// para tener claridad de qué hacer una vez que se cierra la etapa anterior.
import { prisma } from "@/lib/prisma";

// ── Migración lazy (Neon): asegura la columna "etapa" en seguimientos ────────
let _etapaColReady = false;
export async function ensureSeguimientoEtapaCol() {
  if (_etapaColReady) return;
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE seguimientos ADD COLUMN IF NOT EXISTS "etapa" TEXT`);
  } catch { /* ya existe */ }
  _etapaColReady = true;
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
