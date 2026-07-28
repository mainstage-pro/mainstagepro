// Lógica compartida de evaluaciones de desempeño.

export const METRICAS = [
  "puntualidad", "ordenLimpieza", "actitud", "comunicacion",
  "resolucionProb", "propuestasMejora", "calidadTrabajo", "trabajoEquipo",
] as const;

export interface Criterio { subarea: string; responsabilidad: string; estandar: string; puntaje: number }

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

// Puntaje total (escala 0-5) = promedio de todo lo calificado: métricas genéricas
// con valor + estándares del puesto con puntaje. null si no hay nada calificado.
export function calcularPuntaje(metricas: Record<string, number>, criterios: Criterio[]): number | null {
  const valores = [
    ...METRICAS.map((m) => metricas[m] ?? 0),
    ...criterios.map((c) => c.puntaje),
  ].filter((v) => v > 0);
  return valores.length > 0 ? valores.reduce((s, v) => s + v, 0) / valores.length : null;
}

export function safeParseCriterios(raw: string | null): Criterio[] {
  if (!raw) return [];
  try { return normalizarCriterios(JSON.parse(raw)); } catch { return []; }
}
