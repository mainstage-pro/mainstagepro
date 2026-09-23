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

// Los cuatro valores que rigen la empresa. Se ofrecen en el perfil de cada puesto
// para precisar "cómo se ve" ese valor en ese rol concreto.
export const VALORES_DEFAULT = [
  { nombre: "Honestidad", descripcion: "Decir las cosas como son, reconocer los errores a tiempo y cuidar lo que no es nuestro." },
  { nombre: "Mejora continua", descripcion: "Cada evento deja un aprendizaje; lo aplicamos para que el siguiente salga mejor." },
  { nombre: "Trabajo en equipo", descripcion: "Generosidad, apoyo mutuo y comunicación clara — el resultado es de todos." },
  { nombre: "Respeto", descripcion: "Trato digno al compañero, al cliente, al proveedor y al público, sin importar la presión del momento." },
];

// ADN Mainstage: base común a TODOS los puestos. No se captura ni se edita por puesto;
// se muestra en la ficha, en el acuerdo laboral y en la vacante.
export const ADN_MAINSTAGE = {
  titulo: "Lo que esperamos de cualquier persona en Mainstage",
  texto:
    "Buscamos personas genuinamente apasionadas por el mundo de los eventos y los shows en vivo: " +
    "por el audio, la iluminación y el video, y por lo que sucede cuando todo eso se junta frente a un público. " +
    "Esperamos que cada integrante del equipo proponga, aporte y empuje el crecimiento de la empresa, " +
    "entendiendo que ese crecimiento y el profesional de cada quien son el mismo camino.",
} as const;

// ── Formas estructuradas (JSON en columnas de texto) ──
export interface JornadaDia { dia: string; entrada: string; salida: string; ubicacion: UbicacionDia }
export interface CoordinaConItem { puestoId: string; nota?: string }
export interface ValorPerfil { valorId?: string; nombre: string; comoSeVe?: string }
export interface AptitudPerfil { nombre: string; nivel: Nivel }
export interface ConocimientoPerfil { nombre: string; nivel: Nivel; indispensable: boolean }
// Reportes que el puesto entrega a quien le reporta. Se arranca con tres de base.
export interface ReportePuesto {
  nombre: string;
  frecuencia: FrecuenciaEstandar;
  formato?: string;
}

export const REPORTES_BASE: ReportePuesto[] = [
  { nombre: "Avance del plan de trabajo de la semana", frecuencia: "semanal", formato: "Junta de seguimiento" },
  { nombre: "Resultados del mes contra la meta de cada indicador", frecuencia: "mensual", formato: "Reporte de área" },
  { nombre: "Riesgos y pendientes que requieren decisión del jefe", frecuencia: "semanal", formato: "Junta de seguimiento" },
];
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

// Criterio de calidad: cómo se mide que una responsabilidad está bien cumplida.
// Los marcados como no negociables topan la evaluación en "En desarrollo" si fallan.
export interface CriterioCalidad {
  subarea: string;
  responsabilidad: string;
  estandar: string;
  noNegociable?: boolean;
}

export interface PuestoSnapshot {
  version: number;
  criteriosCalidad: CriterioCalidad[];
  noNegociables: CriterioCalidad[];
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
    valores?: string | null;
    aptitudes?: string | null;
    conocimientos?: string | null;
  },
  kpis: KpiPuesto[],
): PuestoSnapshot {
  const criterios = jparse<CriterioCalidad[]>(raw.estandares, []);
  return {
    version: raw.version ?? 1,
    criteriosCalidad: criterios,
    noNegociables: criterios.filter((c) => c.noNegociable),
    valores: jparse<ValorPerfil[]>(raw.valores, []),
    aptitudes: jparse<AptitudPerfil[]>(raw.aptitudes, []),
    conocimientos: jparse<ConocimientoPerfil[]>(raw.conocimientos, []),
    kpis,
    pesos: PESOS_EVAL,
  };
}

// La primera sub-área de la lista es la principal: manda en color, capacitación y
// módulos de onboarding por defecto.
export function subAreasCreate(ids: unknown): { subAreaId: string; principal: boolean; orden: number }[] {
  if (!Array.isArray(ids)) return [];
  const limpios = [...new Set(ids.filter((x): x is string => typeof x === "string" && !!x))];
  return limpios.map((subAreaId, i) => ({ subAreaId, principal: i === 0, orden: i }));
}

// ── Procedencia del contenido (IA vs manual) ──
export type Procedencia = "IA" | "MANUAL" | "IA_EDITADO";
export const BLOQUES_IA = ["misionPuesto", "responsabilidades", "estandares", "reportes", "kpis", "perfil"] as const;
export type BloqueIA = (typeof BLOQUES_IA)[number];
export type OrigenIA = Partial<Record<BloqueIA, Procedencia>> & { generadoEn?: string };

export function procedencia(origen: OrigenIA | null | undefined, bloque: BloqueIA): Procedencia {
  return origen?.[bloque] ?? "MANUAL";
}

// Al guardar, un bloque generado por IA que cambió de contenido pasa a IA_EDITADO:
// así el refresh sabe qué puede volver a escribir y qué debe respetar.
export function marcarEdiciones(
  previo: OrigenIA | null | undefined,
  cambiados: BloqueIA[],
): OrigenIA {
  const out: OrigenIA = { ...(previo ?? {}) };
  for (const b of cambiados) {
    if (out[b] === "IA") out[b] = "IA_EDITADO";
    else if (!out[b]) out[b] = "MANUAL";
  }
  return out;
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
