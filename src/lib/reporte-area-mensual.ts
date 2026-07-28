// Configuración del "Reporte mensual de área".
// MISMA estructura para todas las áreas: es el cierre mensual que entrega cada
// responsable y sirve de materia prima para la evaluación de dirección.
// Esqueleto único: Resultados · KPIs vs meta · Análisis · Bloqueos · Compromisos.

import { AREAS_EVALUABLES, labelArea, labelMes, mesActual, type AreaEvaluable } from "@/lib/evaluacion-area";

export { AREAS_EVALUABLES, labelArea, labelMes, mesActual, type AreaEvaluable };

export type KpiRow = {
  nombre: string;
  valor: string; // se captura como texto para no perder unidades/%
  meta: string;
  unidad: string;
};

export type ReporteMensualAreaData = {
  id?: string;
  area: string;
  mes: string; // "2026-07"
  autorId: string | null;
  autorNombre: string | null;
  resultados: string;
  kpis: KpiRow[];
  analisis: string;
  bloqueos: string;
  compromisos: string;
  enviado: boolean;
  enviadoEn: string | null;
  actualizadoEn?: string | null;
};

// Metadatos de las secciones de texto (para renderizar el formulario de forma
// declarativa y mantener la MISMA estructura en todas las áreas).
export const SECCIONES_TEXTO: { id: "resultados" | "analisis" | "bloqueos" | "compromisos"; titulo: string; desc: string; placeholder: string; obligatorio: boolean }[] = [
  {
    id: "resultados",
    titulo: "Resultados del mes",
    desc: "Los logros y entregables concretos del área este mes.",
    placeholder: "¿Qué logró el área este mes? Hechos y entregables concretos…",
    obligatorio: true,
  },
  {
    id: "analisis",
    titulo: "Análisis",
    desc: "Qué pasó y por qué: lectura de los resultados y KPIs.",
    placeholder: "¿Por qué se dieron estos resultados? Aciertos, causas y aprendizajes…",
    obligatorio: true,
  },
  {
    id: "bloqueos",
    titulo: "Bloqueos y riesgos",
    desc: "Qué está frenando al área o representa un riesgo hacia adelante.",
    placeholder: "¿Qué bloqueó o pone en riesgo la operación? (opcional)",
    obligatorio: false,
  },
  {
    id: "compromisos",
    titulo: "Compromisos del próximo mes",
    desc: "A qué se compromete el área para el mes siguiente.",
    placeholder: "¿Qué se compromete a lograr el próximo mes?",
    obligatorio: true,
  },
];

export function emptyReporteMensualArea(area: string, mes: string): ReporteMensualAreaData {
  return {
    area,
    mes,
    autorId: null,
    autorNombre: null,
    resultados: "",
    kpis: [],
    analisis: "",
    bloqueos: "",
    compromisos: "",
    enviado: false,
    enviadoEn: null,
  };
}

// ¿Listo para entregar? Secciones obligatorias con texto y al menos un KPI con nombre.
export function reporteListoParaEnviar(data: ReporteMensualAreaData): { ok: boolean; faltantes: string[] } {
  const faltantes: string[] = [];
  for (const s of SECCIONES_TEXTO) {
    if (s.obligatorio && (data[s.id] ?? "").trim().length < 3) faltantes.push(s.titulo);
  }
  const kpisValidos = (data.kpis ?? []).filter((k) => k.nombre.trim() && k.valor.trim());
  if (kpisValidos.length === 0) faltantes.push("Al menos un KPI con nombre y valor");
  return { ok: faltantes.length === 0, faltantes };
}
