// ─────────────────────────────────────────────────────────────────────────────
// Motor del proceso comercial.
//
// REGLA CENTRAL INNEGOCIABLE: un solo seguimiento de proceso activo por trato a la
// vez. Nunca se generan los pasos de una subetapa por adelantado en lote. Al
// completar uno, nace el siguiente.
//
// Toda transición de etapa/subetapa pasa por aquí. Ninguna ruta de la UI escribe
// trato.etapa ni trato.etapaInterna directamente.
// ─────────────────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";
import {
  ETAPA_DE_INTERNA,
  primeraSubetapa,
  type EtapaInterna,
  type MomentoContratacion,
  type DescubrimientoNivel,
} from "./valores";
import { instanciarTareasSubetapa } from "./tareas-subetapa";

type TratoLike = {
  id: string;
  etapa: string;
  etapaInterna: string | null;
  etapaCambiadaEn: Date | null;
  momentoContratacion: string | null;
  fechaEventoEstimada: Date | null;
  serviciosInteres: string | null;
  lugarEstimado: string | null;
  horaInicioEvento: string | null;
  duracionMontajeHrs: number | null;
  contactoVenueNombre: string | null;
  cliente?: { nombre: string } | null;
};

const DIA_MS = 24 * 60 * 60 * 1000;

function hoy0(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(base: Date, dias: number): Date {
  return new Date(base.getTime() + dias * DIA_MS);
}

// ── esUrgente ────────────────────────────────────────────────────────────────
// URGENTE por momentoContratacion, o si faltan <15 días al evento.
// NURTURING nunca es urgente, sin importar lo anterior.
export function esUrgente(trato: TratoLike): boolean {
  if (trato.etapaInterna === "NURTURING") return false;
  if (trato.momentoContratacion === "URGENTE") return true;
  if (trato.fechaEventoEstimada) {
    const dias = Math.ceil((trato.fechaEventoEstimada.getTime() - Date.now()) / DIA_MS);
    if (dias < 15) return true;
  }
  return false;
}

// ── resolverGuion ────────────────────────────────────────────────────────────
// Sustituye [Nombre] por el nombre del cliente. Deja [fecha] como marcador
// editable por el usuario antes de enviar. El resultado se congela en guionSnapshot.
export function resolverGuion(guion: string, trato: TratoLike): string {
  const nombre = trato.cliente?.nombre?.trim() || "";
  return nombre ? guion.split("[Nombre]").join(nombre) : guion;
}

// ── calcularDescubrimientoNivel ──────────────────────────────────────────────
// Se calcula, nunca se captura. No bloquea la transición a OPORTUNIDAD.
export function calcularDescubrimientoNivel(trato: TratoLike): DescubrimientoNivel | null {
  const basico = !!(trato.serviciosInteres && trato.lugarEstimado && trato.fechaEventoEstimada);
  if (!basico) return null;
  const tecnico = !!(trato.horaInicioEvento && trato.duracionMontajeHrs && trato.contactoVenueNombre);
  return tecnico ? "TECNICO" : "BASICO";
}

// ── Cancelar seguimientos de proceso pendientes ──────────────────────────────
// Solo los de tipo PROCESO: los recordatorios MANUAL del usuario se conservan.
async function cancelarPendientesProceso(tratoId: string) {
  await prisma.seguimiento.deleteMany({
    where: { tratoId, tipo: "PROCESO", completado: false },
  });
}

// ── generarSiguientePaso ─────────────────────────────────────────────────────
// Genera UN solo seguimiento: el siguiente paso pendiente de la subetapa actual.
export async function generarSiguientePaso(tratoId: string) {
  const trato = await prisma.trato.findUnique({
    where: { id: tratoId },
    include: { cliente: { select: { nombre: true } } },
  });
  if (!trato || !trato.etapaInterna) return null;

  // Si ya hay un seguimiento de proceso activo, no dupliques.
  const yaActivo = await prisma.seguimiento.findFirst({
    where: { tratoId, tipo: "PROCESO", completado: false },
  });
  if (yaActivo) return yaActivo;

  const subetapa = await prisma.procesoSubetapa.findUnique({
    where: { etapaInterna: trato.etapaInterna },
    include: { pasos: { where: { activo: true }, orderBy: { orden: "asc" } } },
  });
  if (!subetapa) return null;

  // generacionAutomatica false: el motor no genera; la UI ofrece los pasos.
  if (!subetapa.generacionAutomatica) {
    await prisma.trato.update({
      where: { id: tratoId },
      data: { fechaProximaAccion: null, proximaAccion: subetapa.nombre },
    });
    return null;
  }

  // Pasos ya completados en el ciclo actual (desde etapaCambiadaEn).
  const desde = trato.etapaCambiadaEn ?? new Date(0);
  const completados = await prisma.seguimiento.findMany({
    where: {
      tratoId,
      tipo: "PROCESO",
      completado: true,
      etapaInterna: trato.etapaInterna,
      creadoEn: { gte: desde },
    },
    select: { numero: true },
  });
  const ordenesHechos = new Set(completados.map((s) => s.numero));

  const paso = subetapa.pasos.find((p) => !ordenesHechos.has(p.orden));
  if (!paso) {
    // No hay más pasos: subetapa agotada.
    await prisma.trato.update({
      where: { id: tratoId },
      data: { fechaProximaAccion: null, proximaAccion: "Subetapa agotada" },
    });
    return null;
  }

  const urgente = esUrgente(trato as TratoLike);
  const diaEfectivo = urgente && paso.diaUrgente != null ? paso.diaUrgente : paso.dia;
  const base = trato.etapaCambiadaEn ?? hoy0();
  let fechaProgramada = addDays(base, diaEfectivo);
  let notaAntiguedad: string | null = null;
  const hoy = hoy0();
  if (fechaProgramada < hoy) {
    const diasAtraso = Math.round((hoy.getTime() - fechaProgramada.getTime()) / DIA_MS);
    notaAntiguedad = `Programado originalmente para ${fechaProgramada.toISOString().slice(0, 10)} (${diasAtraso} días de antigüedad).`;
    fechaProgramada = hoy;
  }

  const seguimiento = await prisma.seguimiento.create({
    data: {
      tratoId,
      tipo: "PROCESO",
      procesoPasoId: paso.id,
      etapaInterna: trato.etapaInterna,
      etapaTrato: trato.etapa,
      canal: paso.canal,
      numero: paso.orden,
      titulo: paso.titulo,
      nota: notaAntiguedad,
      guionSnapshot: resolverGuion(paso.guion, trato as TratoLike),
      fechaProgramada,
    },
  });

  await prisma.trato.update({
    where: { id: tratoId },
    data: { fechaProximaAccion: fechaProgramada, proximaAccion: paso.titulo },
  });

  return seguimiento;
}

// ── usarPasoManual ───────────────────────────────────────────────────────────
// Para subetapas con generacionAutomatica false: el usuario elige el paso.
export async function usarPasoManual(tratoId: string, procesoPasoId: string) {
  const trato = await prisma.trato.findUnique({
    where: { id: tratoId },
    include: { cliente: { select: { nombre: true } } },
  });
  if (!trato || !trato.etapaInterna) return null;

  const paso = await prisma.procesoPaso.findUnique({ where: { id: procesoPasoId } });
  if (!paso) return null;

  await cancelarPendientesProceso(tratoId);

  const fechaProgramada = addDays(hoy0(), paso.dia);
  const seguimiento = await prisma.seguimiento.create({
    data: {
      tratoId,
      tipo: "PROCESO",
      procesoPasoId: paso.id,
      etapaInterna: trato.etapaInterna,
      etapaTrato: trato.etapa,
      canal: paso.canal,
      numero: paso.orden,
      titulo: paso.titulo,
      guionSnapshot: resolverGuion(paso.guion, trato as TratoLike),
      fechaProgramada,
    },
  });

  await prisma.trato.update({
    where: { id: tratoId },
    data: { fechaProximaAccion: fechaProgramada, proximaAccion: paso.titulo },
  });

  return seguimiento;
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
  // Instancia las tareas por defecto de la subetapa destino (idempotente).
  await instanciarTareasSubetapa(tratoId, destino);
  return generarSiguientePaso(tratoId);
}

// ── completarSeguimiento ─────────────────────────────────────────────────────
export async function completarSeguimiento(seguimientoId: string, notaResultado?: string) {
  const seguimiento = await prisma.seguimiento.update({
    where: { id: seguimientoId },
    data: {
      completado: true,
      fechaCompletado: new Date(),
      ...(notaResultado !== undefined ? { notaResultado } : {}),
    },
  });

  const paso = seguimiento.procesoPasoId
    ? await prisma.procesoPaso.findUnique({ where: { id: seguimiento.procesoPasoId } })
    : null;

  // Si el paso avanza de subetapa, moverse; si no, generar el siguiente paso.
  if (paso?.avanzaSubetapaA) {
    return moverASubetapa(seguimiento.tratoId, paso.avanzaSubetapaA as EtapaInterna);
  }

  await cancelarPendientesProceso(seguimiento.tratoId);
  return generarSiguientePaso(seguimiento.tratoId);
}

// ── descompletarUltimo ───────────────────────────────────────────────────────
// Deshace el último paso marcado como hecho: lo reactiva como paso vigente y,
// si al completarlo el trato había avanzado de subetapa, lo regresa a la
// subetapa/etapa donde vivía ese paso. Cancela el paso que hubiera nacido después.
export async function descompletarUltimo(tratoId: string) {
  const ultimo = await prisma.seguimiento.findFirst({
    where: { tratoId, tipo: "PROCESO", completado: true },
    orderBy: { fechaCompletado: "desc" },
  });
  if (!ultimo) return null;

  await cancelarPendientesProceso(tratoId);

  await prisma.seguimiento.update({
    where: { id: ultimo.id },
    data: { completado: false, fechaCompletado: null, notaResultado: null },
  });

  const trato = await prisma.trato.findUnique({
    where: { id: tratoId },
    select: { etapaInterna: true },
  });

  const data: Record<string, unknown> = {
    fechaProximaAccion: ultimo.fechaProgramada,
    proximaAccion: ultimo.titulo,
  };
  // Si el paso pertenecía a otra subetapa, la reactivación implica retroceder de etapa.
  if (ultimo.etapaInterna && ultimo.etapaInterna !== trato?.etapaInterna) {
    data.etapaInterna = ultimo.etapaInterna;
    data.etapa = ultimo.etapaTrato ?? (await etapaDeSubetapa(ultimo.etapaInterna));
    data.etapaCambiadaEn = ultimo.creadoEn;
  }
  await prisma.trato.update({ where: { id: tratoId }, data });

  return ultimo;
}

// ── rutearPorCalificacion ────────────────────────────────────────────────────
// Se dispara al completar el paso "Calificar etapa" de PRIMER_CONTACTO.
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

// ── progresoSubetapa ─────────────────────────────────────────────────────────
// Devuelve { actual, total } para la UI ("paso 2 de 4").
export async function progresoSubetapa(etapaInterna: string, ordenActual: number) {
  const subetapa = await prisma.procesoSubetapa.findUnique({
    where: { etapaInterna },
    include: { pasos: { where: { activo: true } } },
  });
  const total = subetapa?.pasos.length ?? 0;
  return { actual: ordenActual, total };
}

export { primeraSubetapa };
