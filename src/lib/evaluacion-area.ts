// Configuración de la "Evaluación de Dirección por Área".
// Dirección califica 1-5 la operación mensual de cada responsable de área,
// apoyándose en el reporte de resultados del área. Es el juicio; el reporte es la
// materia prima. Mismo patrón que la evaluación de dirección del proyecto.
//
// Se usa UN set común de dimensiones para todas las áreas (minimalismo CEO):
// lo que se evalúa de un responsable es transversal, cambia el contexto no el eje.

import { promedioCalificaciones, nivelResultado, type CalifDimension } from "@/lib/evaluacion-post-evento";

export { nivelResultado, type CalifDimension };

// Áreas con responsable que Dirección evalúa (Dirección = el CEO, no se autoevalúa aquí).
export const AREAS_EVALUABLES = [
  { id: "VENTAS", label: "Ventas" },
  { id: "PRODUCCION", label: "Producción" },
  { id: "MARKETING", label: "Marketing" },
  { id: "ADMINISTRACION", label: "Administración" },
  { id: "RRHH", label: "Recursos Humanos" },
] as const;

export type AreaEvaluable = (typeof AREAS_EVALUABLES)[number]["id"];

export function labelArea(area: string): string {
  return AREAS_EVALUABLES.find((a) => a.id === area)?.label ?? area;
}

// Dimensiones transversales para evaluar al responsable de un área (7 ejes).
export const DIMENSIONES_AREA: CalifDimension[] = [
  { id: "resultadosMetas", label: "Resultados y cumplimiento de metas", desc: "Qué tanto el área alcanzó sus metas y KPIs del mes según su reporte." },
  { id: "calidadEjecucion", label: "Calidad y eficiencia de la operación", desc: "Qué tan bien y con qué eficiencia se ejecutó el trabajo del área." },
  { id: "liderazgoEquipo", label: "Liderazgo y gestión del equipo", desc: "Organización, dirección y desarrollo de su equipo; cumplimiento de responsabilidades." },
  { id: "comunicacionDireccion", label: "Comunicación con dirección", desc: "Claridad, oportunidad y transparencia al reportar avances, riesgos y decisiones a dirección." },
  { id: "proactividad", label: "Proactividad e iniciativa", desc: "Anticipación a problemas, propuestas de mejora y disposición para resolver." },
  { id: "procesosReportes", label: "Cumplimiento de procesos y reportes", desc: "Entrega puntual y honesta de sus reportes y apego a los procesos de la empresa." },
  { id: "manejoRecursos", label: "Manejo de recursos y presupuesto", desc: "Uso responsable del presupuesto, herramientas y recursos asignados al área." },
];

export type EvaluacionAreaData = {
  id?: string;
  area: string;
  mes: string; // "2026-07"
  evaluadorId: string | null;
  evaluadorNombre: string | null;
  responsableId: string | null;
  responsableNombre: string | null;
  calificaciones: Record<string, number | null>; // dimensión -> 1..5
  notas: Record<string, string>; // dimensión -> nota
  comentario: string; // conclusión global de dirección
  finalizada: boolean;
  finalizadaEn: string | null;
  actualizadoEn?: string | null;
};

export function emptyEvaluacionArea(area: string, mes: string): EvaluacionAreaData {
  return {
    area,
    mes,
    evaluadorId: null,
    evaluadorNombre: null,
    responsableId: null,
    responsableNombre: null,
    calificaciones: {},
    notas: {},
    comentario: "",
    finalizada: false,
    finalizadaEn: null,
  };
}

// Promedio 1..5 de las dimensiones calificadas.
export function promedioArea(data: EvaluacionAreaData): number | null {
  return promedioCalificaciones(data.calificaciones ?? {}, DIMENSIONES_AREA);
}

// Dimensiones calificadas / total (para el tablero de progreso).
export function contarCalificadas(data: EvaluacionAreaData) {
  const calificadas = DIMENSIONES_AREA.filter((d) => {
    const v = data.calificaciones?.[d.id];
    return typeof v === "number" && v > 0;
  }).length;
  return { calificadas, total: DIMENSIONES_AREA.length };
}

// ¿Está lista para finalizar? Todas las dimensiones calificadas.
export function evaluacionCompleta(data: EvaluacionAreaData): boolean {
  return contarCalificadas(data).calificadas === DIMENSIONES_AREA.length;
}

// Etiqueta legible del mes "2026-07" -> "julio 2026".
export function labelMes(mes: string): string {
  const [y, m] = mes.split("-").map((n) => parseInt(n, 10));
  if (!y || !m) return mes;
  const nombres = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${nombres[m - 1] ?? mes} ${y}`;
}

// Mes actual en formato "YYYY-MM".
export function mesActual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
