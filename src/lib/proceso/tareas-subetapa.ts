// ─────────────────────────────────────────────────────────────────────────────
// Tareas por defecto por subetapa: instanciación y avance automático.
//
// Reemplaza al "paso actual" del motor por una checklist de tareas por subetapa.
// - Al entrar un trato a una subetapa, se instancian sus tareas por defecto
//   (idempotente) ligadas al trato como Tarea (tipoOrigen TRATO).
// - Al completar TODAS las tareas por defecto de la subetapa actual, el trato
//   avanza solo a la siguiente subetapa.
// ─────────────────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";
import { ensurePlantillasTareaSubetapa } from "@/lib/plantillas-tareas-subetapa-db";
import { ETAPAS, ETAPA_DE_INTERNA, type EtapaInterna, type EtapaTrato } from "./valores";

const DIA_MS = 24 * 60 * 60 * 1000;

// Etiqueta que marca una tarea como tarea-por-defecto de una subetapa. Se guarda
// dentro del JSON `etiquetas` de la Tarea; permite detectarlas e idempotencia.
export function tagSubetapa(etapaInterna: string): string {
  return `subetapa:${etapaInterna}`;
}

// ── instanciarTareasSubetapa ─────────────────────────────────────────────────
// Crea las tareas por defecto de una subetapa para un trato. Idempotente: si el
// trato ya tiene alguna tarea de esa subetapa (completada o no), no hace nada.
export async function instanciarTareasSubetapa(tratoId: string, etapaInterna: string): Promise<number> {
  await ensurePlantillasTareaSubetapa();

  const tag = tagSubetapa(etapaInterna);
  const yaTiene = await prisma.tarea.findFirst({
    where: { tratoId, etiquetas: { contains: `"${tag}"` } },
    select: { id: true },
  });
  if (yaTiene) return 0;

  const plantillas = await prisma.plantillaTareaSubetapa.findMany({
    where: { etapaInterna, activo: true },
    orderBy: { orden: "asc" },
  });
  if (plantillas.length === 0) return 0;

  const trato = await prisma.trato.findUnique({
    where: { id: tratoId },
    select: { responsableId: true, etapaCambiadaEn: true },
  });
  const base = trato?.etapaCambiadaEn ?? new Date();
  const etiquetas = JSON.stringify([tag, "default-proceso"]);

  await prisma.tarea.createMany({
    data: plantillas.map((p, i) => ({
      titulo: p.titulo,
      prioridad: p.prioridad,
      area: p.area,
      tratoId,
      tipoOrigen: "TRATO",
      asignadoAId: trato?.responsableId ?? null,
      etiquetas,
      fechaVencimiento: p.offsetDias != null ? new Date(base.getTime() + p.offsetDias * DIA_MS) : null,
      orden: i,
    })),
  });

  return plantillas.length;
}

// ── subetapasOrdenadas ───────────────────────────────────────────────────────
// Orden global de avance: por etapa (según ETAPAS) y luego por `orden`.
async function subetapasOrdenadas(): Promise<{ etapa: string; etapaInterna: string }[]> {
  const subs = await prisma.procesoSubetapa.findMany({
    where: { activa: true },
    select: { etapa: true, etapaInterna: true, orden: true },
  });
  return subs
    .sort((a, b) =>
      a.etapa === b.etapa
        ? a.orden - b.orden
        : ETAPAS.indexOf(a.etapa as EtapaTrato) - ETAPAS.indexOf(b.etapa as EtapaTrato)
    )
    .map((s) => ({ etapa: s.etapa, etapaInterna: s.etapaInterna }));
}

// ── siguienteSubetapa ────────────────────────────────────────────────────────
// La siguiente subetapa activa en el orden global. Nunca avanza a VENTA_PERDIDA.
export async function siguienteSubetapa(etapaInterna: string): Promise<string | null> {
  const ord = await subetapasOrdenadas();
  const i = ord.findIndex((s) => s.etapaInterna === etapaInterna);
  if (i === -1 || i + 1 >= ord.length) return null;
  const next = ord[i + 1];
  const etapaNext = next.etapa || ETAPA_DE_INTERNA[next.etapaInterna as EtapaInterna];
  if (etapaNext === "VENTA_PERDIDA") return null;
  return next.etapaInterna;
}

// ── tareasSubetapaCompletas ──────────────────────────────────────────────────
// true si el trato tiene al menos una tarea por defecto de la subetapa y todas
// (no canceladas) están completadas.
async function tareasSubetapaCompletas(tratoId: string, etapaInterna: string): Promise<boolean> {
  const tag = tagSubetapa(etapaInterna);
  const tareas = await prisma.tarea.findMany({
    where: { tratoId, etiquetas: { contains: `"${tag}"` }, estado: { not: "CANCELADA" } },
    select: { estado: true },
  });
  if (tareas.length === 0) return false;
  return tareas.every((t) => t.estado === "COMPLETADA");
}

// ── avanzarSiTareasCompletas ─────────────────────────────────────────────────
// Se llama tras completar una tarea. Si todas las tareas por defecto de la
// subetapa actual del trato están completas, avanza a la siguiente subetapa
// (actualiza etapa/etapaInterna y cancela seguimientos de proceso pendientes) e
// instancia las tareas por defecto de la nueva subetapa.
export async function avanzarSiTareasCompletas(tratoId: string): Promise<string | null> {
  const trato = await prisma.trato.findUnique({
    where: { id: tratoId },
    select: { etapaInterna: true },
  });
  if (!trato?.etapaInterna) return null;

  const actual = trato.etapaInterna;
  if (!(await tareasSubetapaCompletas(tratoId, actual))) return null;

  const destino = await siguienteSubetapa(actual);
  if (!destino || destino === actual) return null;

  const etapaDestino =
    (await prisma.procesoSubetapa.findUnique({ where: { etapaInterna: destino }, select: { etapa: true } }))?.etapa ??
    ETAPA_DE_INTERNA[destino as EtapaInterna];
  if (!etapaDestino) return null;

  await prisma.trato.update({
    where: { id: tratoId },
    data: { etapaInterna: destino, etapa: etapaDestino, etapaCambiadaEn: new Date() },
  });
  // Limpia seguimientos de proceso pendientes de la subetapa anterior.
  await prisma.seguimiento.deleteMany({ where: { tratoId, tipo: "PROCESO", completado: false } });

  await instanciarTareasSubetapa(tratoId, destino);
  return destino;
}
