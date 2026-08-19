// Lógica del módulo "Visión semanal": documentos de preparación para la junta
// de inicio de semana. Uno por área, enfocado al responsable del área.

import { prisma } from "@/lib/prisma";

// ─── Áreas cubiertas ─────────────────────────────────────────────────────────
// PREPRODUCCION es un área especial (no vive en la tabla users.area) con una
// estructura de documento distinta a las demás.
export const VISION_AREAS = [
  "ADMINISTRACION",
  "MARKETING",
  "VENTAS",
  "PRODUCCION",
  "PREPRODUCCION",
] as const;

export type VisionAreaKey = (typeof VISION_AREAS)[number];

export type VisionTipo = "STANDARD" | "PREPRODUCCION";

export interface VisionAreaConfig {
  area: VisionAreaKey;
  label: string;          // Nombre mostrado
  tipo: VisionTipo;
  entregaLabel: string;   // Título de la sección de entrega de información
  // Puntos guía por defecto para la entrega de información (editables/ampliables)
  puntosDefault: string[];
}

export const VISION_CONFIG: Record<VisionAreaKey, VisionAreaConfig> = {
  ADMINISTRACION: {
    area: "ADMINISTRACION",
    label: "Administración",
    tipo: "STANDARD",
    entregaLabel: "Entrega de información de la operación",
    puntosDefault: [
      "Conciliación y saldos de cuentas actualizadas",
      "CXC y CXP actualizadas",
      "Asistencias de la semana anterior",
    ],
  },
  MARKETING: {
    area: "MARKETING",
    label: "Marketing",
    tipo: "STANDARD",
    entregaLabel: "Entrega de información de la operación",
    puntosDefault: [
      "Publicaciones próximas de la semana",
      "Archivo de material gráfico organizado (carpetas de levantamientos, selección de fotos por tipo de evento, videos after movie en carpeta selección de video por tipo de evento)",
      "Material próximo a entregar",
    ],
  },
  VENTAS: {
    area: "VENTAS",
    label: "Comercial",
    tipo: "STANDARD",
    entregaLabel: "Entrega de información de la operación",
    puntosDefault: [
      "Estado actual del pipeline",
      "Cotizaciones pendientes",
    ],
  },
  PRODUCCION: {
    area: "PRODUCCION",
    label: "Producción",
    tipo: "STANDARD",
    entregaLabel: "Entrega de información de la operación",
    puntosDefault: [
      "Equipos próximos a mantenimiento (martes)",
      "Equipos en estado actual de reparación",
      "Insumos faltantes para próxima operación",
      "Avances en proyectos próximos",
    ],
  },
  PREPRODUCCION: {
    area: "PREPRODUCCION",
    label: "Pre producción",
    tipo: "PREPRODUCCION",
    entregaLabel: "Entrega de información de pre producción",
    puntosDefault: [
      "Reportes de pre producción por evento",
      "Cierre operativo de eventos",
      "Entrega de documentos operativos para su archivo (fichas operativas, checklist de salida, hojas de entrega)",
      "Próximos eventos y proyectos a trabajar y avances",
    ],
  },
};

export function isVisionArea(area: string | null | undefined): area is VisionAreaKey {
  return !!area && (VISION_AREAS as readonly string[]).includes(area);
}

// ─── Estructuras JSON persistidas ────────────────────────────────────────────

export interface EntregaPunto {
  id: string;
  titulo: string;
  contenido: string;
}

// Campos específicos de pre-producción (guardados en la columna `extra`)
export interface PreproduccionExtra {
  mejoras: string;                 // Mejoras respecto a la semana pasada de operación
  solicitudesHerramientas: string; // Solicitudes de herramientas
  solicitudesRecursoHumano: string;
  solicitudesPresupuesto: string;
  fallasTransporte: string;
  incidenciasPersonal: string;     // Incidencias de personal técnico
  situacionesGenerales: string;    // Situaciones generales frente a la operación
}

export const PREPRODUCCION_EXTRA_VACIO: PreproduccionExtra = {
  mejoras: "",
  solicitudesHerramientas: "",
  solicitudesRecursoHumano: "",
  solicitudesPresupuesto: "",
  fallasTransporte: "",
  incidenciasPersonal: "",
  situacionesGenerales: "",
};

// ─── Helpers de semana ───────────────────────────────────────────────────────

// Lunes (00:00 hora local del servidor) de la semana que contiene `ref`.
export function lunesDeLaSemana(ref: Date = new Date()): Date {
  const d = new Date(ref);
  const dow = d.getDay(); // 0=domingo ... 6=sábado
  d.setDate(d.getDate() - ((dow + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

// Clave de semana "YYYY-MM-DD" (lunes) usada como identificador estable.
export function semanaKey(ref: Date = new Date()): string {
  return lunesDeLaSemana(ref).toISOString().slice(0, 10);
}

// ─── Migración lazy (Neon no corre migraciones formales) ─────────────────────

// Migración lazy YA APLICADA en prod (verificado 2026-08-19: la tabla
// vision_semanal, su columna responsableId y el índice único ya existen). No-op:
// antes corría CREATE TABLE + ALTER TABLE incondicional en cada cold start, y
// ALTER TABLE ... ADD COLUMN IF NOT EXISTS toma un lock ACCESS EXCLUSIVE aunque
// la columna ya exista, bloqueando lecturas concurrentes de la tabla.
export async function ensureVisionSemanalTable(): Promise<void> {}

// ─── Puntos de entrega por defecto ───────────────────────────────────────────

export function puntosDefault(area: VisionAreaKey): EntregaPunto[] {
  return VISION_CONFIG[area].puntosDefault.map((titulo, i) => ({
    id: `def-${i}`,
    titulo,
    contenido: "",
  }));
}

// ─── Tareas del área (en vivo) ───────────────────────────────────────────────

// Forma compatible con `TareaItem` del módulo de tareas, para reutilizar la
// misma vista (TaskItem) dentro de la Visión semanal.
export interface VisionTarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: string;
  area: string;
  estado: string;
  fecha: string | null;
  recurrencia: string | null;
  proyectoTarea: { id: string; nombre: string; color: string | null } | null;
  seccion: { id: string; nombre: string } | null;
  asignadoA: { id: string; name: string } | null;
  proyectoInterno: { id: string; nombre: string } | null;
  _count: { subtareas: number; comentarios: number; archivos: number };
  createdAt: string;
}

// Todas las tareas asignadas y con fecha del área: ya sea porque la tarea es del
// área, o porque pertenece a un proyecto interno del área. Sin límite de semana.
export async function tareasDelArea(area: VisionAreaKey): Promise<VisionTarea[]> {
  // Pre-producción usa las tareas/proyectos del área PRODUCCION.
  const areaTareas = area === "PREPRODUCCION" ? "PRODUCCION" : area;

  const tareas = await prisma.tarea.findMany({
    where: {
      asignadoAId: { not: null },
      fecha: { not: null },
      estado: { in: ["PENDIENTE", "EN_PROGRESO"] },
      parentId: null,
      OR: [
        { area: areaTareas },
        { proyectoInterno: { area: areaTareas } },
      ],
    },
    select: {
      id: true,
      titulo: true,
      descripcion: true,
      prioridad: true,
      area: true,
      estado: true,
      fecha: true,
      recurrencia: true,
      createdAt: true,
      proyectoTarea: { select: { id: true, nombre: true, color: true } },
      seccion: { select: { id: true, nombre: true } },
      asignadoA: { select: { id: true, name: true } },
      proyectoInterno: { select: { id: true, nombre: true } },
      _count: { select: { subtareas: true, comentarios: true, archivos: true } },
    },
    orderBy: [{ prioridad: "asc" }, { fecha: "asc" }],
    take: 200,
  });

  return tareas.map((t) => ({
    id: t.id,
    titulo: t.titulo,
    descripcion: t.descripcion ?? null,
    prioridad: t.prioridad,
    area: t.area,
    estado: t.estado,
    fecha: t.fecha?.toISOString() ?? null,
    recurrencia: t.recurrencia ?? null,
    // Muestra el proyecto interno como chip cuando la tarea no tiene proyecto de tareas.
    proyectoTarea: t.proyectoTarea
      ?? (t.proyectoInterno ? { id: t.proyectoInterno.id, nombre: t.proyectoInterno.nombre, color: null } : null),
    seccion: t.seccion ?? null,
    asignadoA: t.asignadoA ?? null,
    proyectoInterno: t.proyectoInterno ?? null,
    _count: t._count,
    createdAt: t.createdAt.toISOString(),
  }));
}

// ─── Proyectos del área (en vivo) ────────────────────────────────────────────

export interface VisionProyecto {
  id: string;
  nombre: string;
  estado: string;
  prioridad: string;
  porcentajeAvance: number;
  fechaFin: string | null;
  lider: { id: string; name: string } | null;
  totalFases: number;
  fasesCompletadas: number;
}

export async function proyectosDelArea(area: VisionAreaKey): Promise<VisionProyecto[]> {
  // Pre-producción usa proyectos del área PRODUCCION; las demás su propia área.
  const areaProyectos = area === "PREPRODUCCION" ? "PRODUCCION" : area;

  const proyectos = await prisma.proyectoInterno.findMany({
    where: { area: areaProyectos, estado: { not: "CANCELADO" } },
    include: {
      lider: { select: { id: true, name: true } },
      fases: { select: { completada: true } },
    },
    orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
  });

  return proyectos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    estado: p.estado,
    prioridad: p.prioridad,
    porcentajeAvance: p.porcentajeAvance,
    fechaFin: p.fechaFin?.toISOString().slice(0, 10) ?? null,
    lider: p.lider ? { id: p.lider.id, name: p.lider.name } : null,
    totalFases: p.fases.length,
    fasesCompletadas: p.fases.filter((f) => f.completada).length,
  }));
}
