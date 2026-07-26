// ─────────────────────────────────────────────────────────────────────────────
// Tareas del proceso comercial: una tarea por cada paso del proceso.
//
// Modelo nuevo (A1 + B2): al abrir un trato se instancian DE GOLPE todas las
// tareas de todo el proceso — una Tarea por cada ProcesoPaso activo de cada
// subetapa activa (menos las de venta perdida). Nacen SIN fecha ("estacionadas"):
// solo viven dentro del trato y no inundan Gestión Operativa. El vendedor les pone
// fecha y responsable cuando quiere agendarlas; solo entonces aparecen en la
// gestión operativa.
//
// Cada tarea lleva el guion/WhatsApp del paso en `notas` y etiquetas que la ligan
// a su paso (`paso:ID`), su subetapa (`subetapa:X`), su canal (`canal:X`) y, si el
// paso es un hito de avance, la etiqueta `hito`. Al completar una tarea-hito el
// trato avanza de subetapa (avanzarPorHito).
// ─────────────────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";
import { ETAPAS, ETAPA_DE_INTERNA, type EtapaInterna, type EtapaTrato } from "./valores";

// Etiqueta que liga una tarea a su subetapa del proceso. Se guarda dentro del JSON
// `etiquetas` de la Tarea; permite agruparlas en la UI.
export function tagSubetapa(etapaInterna: string): string {
  return `subetapa:${etapaInterna}`;
}

// Resuelve el guion del paso sustituyendo [Nombre] por el nombre del cliente.
// [fecha] y otros marcadores se dejan para que el vendedor los edite antes de enviar.
function resolverGuion(guion: string | null, nombreCliente: string): string | null {
  if (!guion) return null;
  return nombreCliente ? guion.split("[Nombre]").join(nombreCliente) : guion;
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

// ── instanciarTareasProceso ──────────────────────────────────────────────────
// Crea DE GOLPE una Tarea por cada ProcesoPaso activo de cada subetapa activa (menos
// las de venta perdida). Idempotente por paso: solo crea las que aún no existen.
// Las tareas nacen sin fecha (estacionadas). Devuelve cuántas creó.
export async function instanciarTareasProceso(tratoId: string): Promise<number> {
  const trato = await prisma.trato.findUnique({
    where: { id: tratoId },
    select: { responsableId: true, cliente: { select: { nombre: true } } },
  });
  if (!trato) return 0;
  const nombreCliente = trato.cliente?.nombre?.trim() || "";

  // Limpieza: elimina tareas genéricas viejas (modelo anterior) que sigan pendientes
  // y sin fecha; no toca las completadas ni las que el usuario ya agendó.
  await prisma.tarea.deleteMany({
    where: {
      tratoId,
      etiquetas: { contains: `"default-proceso"` },
      estado: "PENDIENTE",
      fecha: null,
    },
  });

  const ordenSubs = await subetapasOrdenadas();
  // Descarta subetapas de venta perdida.
  const subsActivas = ordenSubs.filter((s) => {
    const etapa = s.etapa || ETAPA_DE_INTERNA[s.etapaInterna as EtapaInterna];
    return etapa !== "VENTA_PERDIDA";
  });
  if (subsActivas.length === 0) return 0;

  const pasosPorSub = await prisma.procesoSubetapa.findMany({
    where: { etapaInterna: { in: subsActivas.map((s) => s.etapaInterna) } },
    select: {
      etapaInterna: true,
      pasos: {
        where: { activo: true },
        orderBy: { orden: "asc" },
        select: { id: true, titulo: true, objetivo: true, guion: true, canal: true, herramienta: true, avanzaSubetapaA: true },
      },
    },
  });
  const pasosDe = new Map(pasosPorSub.map((s) => [s.etapaInterna, s.pasos]));

  // Pasos que ya tienen tarea (idempotencia).
  const existentes = await prisma.tarea.findMany({
    where: { tratoId, etiquetas: { contains: `"paso:` } },
    select: { etiquetas: true },
  });
  const pasoIdsConTarea = new Set<string>();
  for (const t of existentes) {
    const tag = parseTags(t.etiquetas).find((e) => e.startsWith("paso:"));
    if (tag) pasoIdsConTarea.add(tag.slice("paso:".length));
  }

  type NuevaTarea = {
    titulo: string; descripcion: string | null; notas: string | null; etiquetas: string;
    prioridad: string; area: string; tratoId: string; tipoOrigen: string;
    asignadoAId: string | null; fecha: null; fechaVencimiento: null; orden: number;
  };
  const nuevas: NuevaTarea[] = [];
  let orden = 0;
  for (const sub of subsActivas) {
    const pasos = pasosDe.get(sub.etapaInterna) ?? [];
    for (const paso of pasos) {
      const idx = orden++;
      if (pasoIdsConTarea.has(paso.id)) continue;
      const descripcion = [paso.objetivo, paso.herramienta ? `Herramienta: ${paso.herramienta}` : null]
        .filter(Boolean)
        .join("\n") || null;
      const etiquetas = JSON.stringify([
        "proceso",
        tagSubetapa(sub.etapaInterna),
        `paso:${paso.id}`,
        `canal:${paso.canal}`,
        ...(paso.avanzaSubetapaA ? ["hito"] : []),
      ]);
      nuevas.push({
        titulo: paso.titulo,
        descripcion,
        notas: resolverGuion(paso.guion, nombreCliente),
        etiquetas,
        prioridad: "MEDIA",
        area: "VENTAS",
        tratoId,
        tipoOrigen: "TRATO",
        asignadoAId: trato.responsableId ?? null,
        fecha: null,
        fechaVencimiento: null,
        orden: idx,
      });
    }
  }

  if (nuevas.length === 0) return 0;
  await prisma.tarea.createMany({ data: nuevas });
  return nuevas.length;
}

// ── avanzarPorHito ───────────────────────────────────────────────────────────
// Se llama tras completar una tarea. Si la tarea es un hito (su paso tiene
// `avanzaSubetapaA`), mueve el trato a esa subetapa/etapa. No genera tareas nuevas
// (ya están todas instanciadas). Devuelve la subetapa destino o null.
export async function avanzarPorHito(tareaId: string): Promise<string | null> {
  const tarea = await prisma.tarea.findUnique({
    where: { id: tareaId },
    select: { etiquetas: true, tratoId: true },
  });
  if (!tarea?.tratoId) return null;

  const pasoTag = parseTags(tarea.etiquetas).find((e) => e.startsWith("paso:"));
  if (!pasoTag) return null;
  const pasoId = pasoTag.slice("paso:".length);

  const paso = await prisma.procesoPaso.findUnique({
    where: { id: pasoId },
    select: { avanzaSubetapaA: true },
  });
  const destino = paso?.avanzaSubetapaA;
  if (!destino) return null;

  const trato = await prisma.trato.findUnique({
    where: { id: tarea.tratoId },
    select: { etapaInterna: true },
  });
  if (!trato || trato.etapaInterna === destino) return null;

  const etapaDestino =
    (await prisma.procesoSubetapa.findUnique({ where: { etapaInterna: destino }, select: { etapa: true } }))?.etapa ??
    ETAPA_DE_INTERNA[destino as EtapaInterna];
  if (!etapaDestino || etapaDestino === "VENTA_PERDIDA") return null;

  await prisma.trato.update({
    where: { id: tarea.tratoId },
    data: { etapaInterna: destino, etapa: etapaDestino, etapaCambiadaEn: new Date() },
  });
  return destino;
}

function parseTags(etiquetas: string | null): string[] {
  if (!etiquetas) return [];
  try {
    const arr = JSON.parse(etiquetas) as unknown;
    return Array.isArray(arr) ? arr.filter((e): e is string => typeof e === "string") : [];
  } catch {
    return [];
  }
}
