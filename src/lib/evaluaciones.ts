// Lógica compartida de evaluaciones de desempeño.

export const METRICAS = [
  "puntualidad", "ordenLimpieza", "actitud", "comunicacion",
  "resolucionProb", "propuestasMejora", "calidadTrabajo", "trabajoEquipo",
] as const;

// Ponderación del puntaje total: la parte del puesto pesa más que la base general.
export const PESO_GENERAL = 0.4;
export const PESO_PUESTO = 0.6;

export interface Criterio { subarea: string; responsabilidad: string; estandar: string; puntaje: number }

export const ESTADOS_ACUERDO = ["PENDIENTE", "CUMPLIDO", "PARCIAL", "NO_CUMPLIDO"] as const;
export type EstadoAcuerdo = typeof ESTADOS_ACUERDO[number];
export interface Acuerdo { texto: string; estado: EstadoAcuerdo; nota: string }

// Normaliza el snapshot de estándares evaluados que llega del cliente.
export function normalizarCriterios(raw: unknown): Criterio[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c) => ({
      subarea: String(c?.subarea ?? ""),
      responsabilidad: String(c?.responsabilidad ?? ""),
      estandar: String(c?.estandar ?? ""),
      puntaje: Math.max(0, Math.min(5, Math.round(Number(c?.puntaje) || 0))),
    }))
    .filter((c) => c.subarea || c.responsabilidad || c.estandar);
}

// Normaliza los acuerdos/compromisos que llegan del cliente.
export function normalizarAcuerdos(raw: unknown): Acuerdo[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a) => ({
      texto: String(a?.texto ?? "").trim(),
      estado: (ESTADOS_ACUERDO as readonly string[]).includes(a?.estado) ? (a.estado as EstadoAcuerdo) : "PENDIENTE",
      nota: String(a?.nota ?? "").trim(),
    }))
    .filter((a) => a.texto);
}

export interface Puntajes { general: number | null; puesto: number | null; total: number | null }

// Puntaje general (base) y puntaje del puesto se promedian por separado; el total
// es su promedio ponderado. Si solo hay uno calificado, ese es el total.
export function calcularPuntajes(metricas: Record<string, number>, criterios: Criterio[]): Puntajes {
  const gv = METRICAS.map((m) => metricas[m] ?? 0).filter((v) => v > 0);
  const pv = criterios.map((c) => c.puntaje).filter((v) => v > 0);
  const general = gv.length > 0 ? gv.reduce((s, v) => s + v, 0) / gv.length : null;
  const puesto = pv.length > 0 ? pv.reduce((s, v) => s + v, 0) / pv.length : null;
  let total: number | null;
  if (general != null && puesto != null) total = general * PESO_GENERAL + puesto * PESO_PUESTO;
  else total = general ?? puesto;
  return { general, puesto, total };
}

export function safeParseCriterios(raw: string | null): Criterio[] {
  if (!raw) return [];
  try { return normalizarCriterios(JSON.parse(raw)); } catch { return []; }
}

export function safeParseAcuerdos(raw: string | null): Acuerdo[] {
  if (!raw) return [];
  try { return normalizarAcuerdos(JSON.parse(raw)); } catch { return []; }
}
