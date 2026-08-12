// Tipos, catálogos y helpers del registro de Puesto (fuente única de verdad).
// El registro deriva: acuerdo laboral, plan de trabajo, evaluación mensual y score
// del tablero de cumplimiento. Ver PROMPT de rediseño (§1–§10).

export type Nivel = "basico" | "intermedio" | "avanzado";
export type FrecuenciaKPI = "semanal" | "mensual" | "trimestral";
export type FrecuenciaEstandar = "diaria" | "semanal" | "mensual" | "por_evento";
export type UnidadKPI = "%" | "$" | "número" | "días" | "ratio";
export type UbicacionDia = "oficina" | "home";

export const TIPOS_CONTRATO = [
  { value: "Contratación", label: "Contratación (alta en nómina)" },
  { value: "Honorarios", label: "Honorarios (servicios profesionales)" },
] as const;

export const MODALIDADES = [
  { value: "Presencial", label: "Presencial" },
  { value: "Remoto", label: "Remoto (home office)" },
  { value: "Híbrido", label: "Híbrido (oficina y home office)" },
] as const;

// L–S (domingo no aparece). 1=Lun … 6=Sáb.
export const DIAS_SEMANA = [
  { n: 1, key: "lunes", label: "Lunes" },
  { n: 2, key: "martes", label: "Martes" },
  { n: 3, key: "miercoles", label: "Miércoles" },
  { n: 4, key: "jueves", label: "Jueves" },
  { n: 5, key: "viernes", label: "Viernes" },
  { n: 6, key: "sabado", label: "Sábado" },
] as const;

export const FRECUENCIAS_KPI: FrecuenciaKPI[] = ["semanal", "mensual", "trimestral"];
export const UNIDADES_KPI: UnidadKPI[] = ["%", "$", "número", "días", "ratio"];
export const FRECUENCIAS_ESTANDAR: { value: FrecuenciaEstandar; label: string }[] = [
  { value: "diaria", label: "Diaria" },
  { value: "semanal", label: "Semanal" },
  { value: "mensual", label: "Mensual" },
  { value: "por_evento", label: "Por evento" },
];

// Fuentes automáticas que ya existen en el sistema (§4).
export const FUENTES_KPI = [
  "Estado de Resultados",
  "CRM/Tratos",
  "Reporte de Ventas",
  "Reporte de Marketing",
  "Reporte de Producción",
  "Asistencia",
  "Log de actividad",
] as const;

// KPI fijo obligatorio del puesto (§4). Definición no editable; solo la meta.
export const KPI_PLAN_SLUG_PREFIX = "puesto-plan-";
export const KPI_PLAN_NOMBRE = "Cumplimiento del plan de trabajo";
export const KPI_PLAN_META_DEFAULT = "95%";

// Catálogos por defecto (se siembran si la tabla está vacía; luego se editan en config).
export const PRESTACIONES_DEFAULT = [
  "Aguinaldo",
  "Vacaciones y prima vacacional",
  "Bono por resultado",
  "Día de descanso semanal",
  "Permisos y ausencias justificadas",
  "Capacitación a cargo de la empresa",
  "Seguridad social (IMSS)",
  "Prestaciones adicionales",
];

// Valores por defecto (migrados de /presentacion/alineacion-2026).
export const VALORES_DEFAULT = [
  { nombre: "Responsabilidad", descripcion: "Cumplir con lo prometido, cuidar el equipo, al cliente y la seguridad del evento." },
  { nombre: "Compromiso", descripcion: "Dar el máximo en cada proyecto, desde el más pequeño hasta el más grande." },
  { nombre: "Trabajo en equipo", descripcion: "Generosidad, apoyo mutuo y comunicación clara — el resultado es de todos." },
  { nombre: "Profesionalismo", descripcion: "Presentarse, operar y comunicar con seriedad, aunque el trato sea cercano." },
  { nombre: "Pasión por los eventos", descripcion: "Mantener la energía que dio origen a la empresa: audio, luces, escenarios y shows en vivo." },
];

// ── Formas estructuradas (JSON en columnas de texto) ──
export interface JornadaDia { dia: string; entrada: string; salida: string; ubicacion: UbicacionDia }
export interface CoordinaConItem { puestoId: string; nota?: string }
export interface ValorPerfil { valorId?: string; nombre: string; comoSeVe?: string }
export interface AptitudPerfil { nombre: string; nivel: Nivel }
export interface ConocimientoPerfil { nombre: string; nivel: Nivel; indispensable: boolean }
export interface EstandarMinimo {
  enunciado: string;
  frecuencia: FrecuenciaEstandar;
  evidencia: string;
  verificaPuestoId?: string;
}
export interface KpiPuesto {
  id?: string;
  nombre: string;
  resultadoEsperado: string;
  unidad: UnidadKPI;
  meta: string;
  frecuencia: FrecuenciaKPI;
  fuenteTipo: "automatica" | "manual";
  fuente?: string; // módulo cuando es automática
  esFijoPlan?: boolean;
}

// ── Helpers de parseo/serialización JSON tolerantes ──
export function jparse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { const v = JSON.parse(s); return (v ?? fallback) as T; } catch { return fallback; }
}

// Genera el string legible de jornada para el PDF ("L–V 9:00–18:00, sáb 9:00–14:00").
export function jornadaToString(jornada: JornadaDia[]): string {
  if (!jornada.length) return "";
  const orden: string[] = DIAS_SEMANA.map(d => d.key);
  const activos = [...jornada].sort((a, b) => orden.indexOf(a.dia) - orden.indexOf(b.dia));
  const abbr: Record<string, string> = { lunes: "lun", martes: "mar", miercoles: "mié", jueves: "jue", viernes: "vie", sabado: "sáb" };
  // Agrupa días consecutivos con el mismo horario en rangos.
  const partes: string[] = [];
  let i = 0;
  while (i < activos.length) {
    let j = i;
    while (
      j + 1 < activos.length &&
      activos[j + 1].entrada === activos[i].entrada &&
      activos[j + 1].salida === activos[i].salida &&
      orden.indexOf(activos[j + 1].dia) === orden.indexOf(activos[j].dia) + 1
    ) j++;
    const rango = i === j ? abbr[activos[i].dia] : `${abbr[activos[i].dia]}–${abbr[activos[j].dia]}`;
    partes.push(`${rango} ${activos[i].entrada}–${activos[i].salida}`);
    i = j + 1;
  }
  return partes.join(", ");
}

export function horasSemanales(jornada: JornadaDia[]): number {
  return jornada.reduce((tot, d) => {
    const [eh, em] = (d.entrada || "0:0").split(":").map(Number);
    const [sh, sm] = (d.salida || "0:0").split(":").map(Number);
    const mins = (sh * 60 + sm) - (eh * 60 + em);
    return tot + (mins > 0 ? mins / 60 : 0);
  }, 0);
}

// Validación suave §1: descripción, objetivo y misión no deberían ser casi idénticos.
export function textosMuySimilares(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const setA = new Set(na.split(" "));
  const setB = new Set(nb.split(" "));
  const inter = [...setA].filter(w => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union > 0 && inter / union >= 0.8;
}

// Validación de forma §6: rechazar adverbios de grado en estándares mínimos.
const ADVERBIOS_VAGOS = [
  "adecuadamente", "correctamente", "en tiempo y forma", "de manera correcta",
  "apropiadamente", "debidamente", "óptimamente", "eficientemente", "oportunamente",
];
export function adverbioVago(enunciado: string): string | null {
  const t = enunciado.toLowerCase();
  return ADVERBIOS_VAGOS.find(a => t.includes(a)) ?? null;
}

// Pesos de la evaluación (§8): Resultados 60% (plan 30 + KPIs 30), Perfil 40%.
export const PESOS_EVAL = {
  resultados: 0.6,
  perfil: 0.4,
  plan: 0.3,
  kpis: 0.3,
} as const;

export interface CriterioCalidad { subarea: string; responsabilidad: string; estandar: string }
export interface PuestoSnapshot {
  version: number;
  criteriosCalidad: CriterioCalidad[];
  estandaresMinimos: EstandarMinimo[];
  valores: ValorPerfil[];
  aptitudes: AptitudPerfil[];
  conocimientos: ConocimientoPerfil[];
  kpis: KpiPuesto[];
  pesos: typeof PESOS_EVAL;
}

// Congela la definición del puesto vigente (§9). Recibe el registro crudo (campos JSON
// en texto) y los KPIs ya cargados. Devuelve la estructura inmutable a guardar.
export function buildPuestoSnapshot(
  raw: {
    version?: number | null;
    estandares?: string | null;
    estandaresMinimos?: string | null;
    valores?: string | null;
    aptitudes?: string | null;
    conocimientos?: string | null;
  },
  kpis: KpiPuesto[],
): PuestoSnapshot {
  return {
    version: raw.version ?? 1,
    criteriosCalidad: jparse<CriterioCalidad[]>(raw.estandares, []),
    estandaresMinimos: jparse<EstandarMinimo[]>(raw.estandaresMinimos, []),
    valores: jparse<ValorPerfil[]>(raw.valores, []),
    aptitudes: jparse<AptitudPerfil[]>(raw.aptitudes, []),
    conocimientos: jparse<ConocimientoPerfil[]>(raw.conocimientos, []),
    kpis,
    pesos: PESOS_EVAL,
  };
}

// Detecta ciclos en la jerarquía "reporta a" (§2).
export function generaCiclo(
  puestoId: string,
  nuevoReportaAId: string,
  reportaDe: Map<string, string | null>,
): boolean {
  let actual: string | null = nuevoReportaAId;
  const visto = new Set<string>();
  while (actual) {
    if (actual === puestoId) return true;
    if (visto.has(actual)) return false;
    visto.add(actual);
    actual = reportaDe.get(actual) ?? null;
  }
  return false;
}
