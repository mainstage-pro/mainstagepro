// ─────────────────────────────────────────────────────────────────────────────
// Motor del proceso comercial.
//
// Toda transición de etapa/subetapa pasa por aquí. Ninguna ruta de la UI escribe
// trato.etapa ni trato.etapaInterna directamente.
//
// Al mover un trato a una subetapa se instancian DE GOLPE las tareas de todo el
// proceso (ver tareas-subetapa.ts). El avance entre subetapas lo dispara el vendedor
// al completar la tarea-hito correspondiente (avanzarPorHito), o manualmente desde
// el selector de subetapa.
// ─────────────────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";
import {
  ETAPA_DE_INTERNA,
  primeraSubetapa,
  type EtapaInterna,
  type MomentoContratacion,
  type DescubrimientoNivel,
} from "./valores";
import { instanciarTareasProceso } from "./tareas-subetapa";

type TratoLike = {
  serviciosInteres: string | null;
  lugarEstimado: string | null;
  fechaEventoEstimada: Date | null;
  horaInicioEvento: string | null;
  duracionMontajeHrs: number | null;
  contactoVenueNombre: string | null;
};

// ── calcularDescubrimientoNivel ──────────────────────────────────────────────
// Se calcula, nunca se captura. No bloquea la transición a OPORTUNIDAD.
export function calcularDescubrimientoNivel(trato: TratoLike): DescubrimientoNivel | null {
  const basico = !!(trato.serviciosInteres && trato.lugarEstimado && trato.fechaEventoEstimada);
  if (!basico) return null;
  const tecnico = !!(trato.horaInicioEvento && trato.duracionMontajeHrs && trato.contactoVenueNombre);
  return tecnico ? "TECNICO" : "BASICO";
}

// ── Cancelar seguimientos de proceso pendientes ──────────────────────────────
// Limpieza de datos legacy: los recordatorios MANUAL del usuario se conservan.
async function cancelarPendientesProceso(tratoId: string) {
  await prisma.seguimiento.deleteMany({
    where: { tratoId, tipo: "PROCESO", completado: false },
  });
}

// ── Resolver a qué etapa pertenece una subetapa ──────────────────────────────
// La estructura es editable en BD: para subetapas custom la etapa vive en la fila
// de ProcesoSubetapa. Se usa esa fuente; el mapa estático es el respaldo para las
// subetapas base (por si la tabla aún no está sembrada).
async function etapaDeSubetapa(destino: string): Promise<string> {
  const sub = await prisma.procesoSubetapa.findUnique({
    where: { etapaInterna: destino },
    select: { etapa: true },
  });
  if (sub?.etapa) return sub.etapa;
  const estatica = ETAPA_DE_INTERNA[destino as EtapaInterna];
  if (estatica) return estatica;
  throw new Error(`Subetapa "${destino}" sin etapa asociada`);
}

// ── Mover un trato a una subetapa destino (helper interno) ───────────────────
async function moverASubetapa(tratoId: string, destino: string, extra: Record<string, unknown> = {}) {
  const etapa = await etapaDeSubetapa(destino);
  await prisma.trato.update({
    where: { id: tratoId },
    data: {
      etapaInterna: destino,
      etapa,
      etapaCambiadaEn: new Date(),
      ...extra,
    },
  });
  await cancelarPendientesProceso(tratoId);
  // Instancia (idempotente) todas las tareas del proceso para el trato.
  await instanciarTareasProceso(tratoId);
  return null;
}

// ── rutearPorCalificacion ────────────────────────────────────────────────────
// Se dispara al calificar la etapa en PRIMER_CONTACTO.
export async function rutearPorCalificacion(tratoId: string, momento: MomentoContratacion) {
  const destino: EtapaInterna = momento === "EXPLORANDO" ? "NURTURING" : "FORMULARIO_ENVIADO";
  return moverASubetapa(tratoId, destino, { momentoContratacion: momento });
}

// ── cambiarSubetapaManual ────────────────────────────────────────────────────
// Se dispara desde el selector de sub-etapa de la UI. Acepta subetapas custom.
export async function cambiarSubetapaManual(tratoId: string, etapaInternaDestino: string) {
  return moverASubetapa(tratoId, etapaInternaDestino);
}

// ── completarDescubrimiento ──────────────────────────────────────────────────
// Ambos caminos (brief del cliente / wizard del equipo) disparan esta transición.
// NUNCA recalcula descubrimientoCompleto: lo recibe ya en true del camino que lo activó.
export async function completarDescubrimiento(tratoId: string, modo: "FORMULARIO" | "LLAMADA") {
  const trato = await prisma.trato.findUnique({ where: { id: tratoId } });
  if (!trato) return null;

  const nivel = calcularDescubrimientoNivel(trato as TratoLike);
  return moverASubetapa(tratoId, "PROPUESTA_EN_ELABORACION", {
    descubrimientoCompleto: true,
    modoDescubrimiento: modo,
    descubrimientoNivel: nivel,
    descubrimientoPendiente: false,
  });
}

// ── entrarAEtapaInicial ──────────────────────────────────────────────────────
// Punto de entrada de un trato nuevo: cae en la primera subetapa de su etapa.
export async function entrarAEtapaInicial(tratoId: string, etapaInterna: string) {
  return moverASubetapa(tratoId, etapaInterna);
}

export { primeraSubetapa };
