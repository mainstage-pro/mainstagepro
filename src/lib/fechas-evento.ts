/**
 * Utilidades para servicios de varios días.
 *
 * Modelo: `fechasEvento` (JSON en Trato/Proyecto) guarda la lista COMPLETA de fechas
 * del evento en formato "YYYY-MM-DD", incluyendo el día 1. `fechaEventoEstimada`
 * (Trato) y `fechaEvento` (Proyecto) siguen siendo el día 1 para compatibilidad con
 * todo el orden/filtrado existente. Cuando el servicio es de un solo día, `fechasEvento`
 * puede ser null y se usa solo la fecha principal.
 */

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Parsea el JSON de fechasEvento a un array de "YYYY-MM-DD" ordenado y sin duplicados. */
export function parseFechasEvento(json: string | null | undefined): string[] {
  if (!json) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  const limpias = arr
    .filter((f): f is string => typeof f === "string" && RE_FECHA.test(f));
  return Array.from(new Set(limpias)).sort();
}

/** Convierte un Date a "YYYY-MM-DD" en UTC (las fechas se guardan a mediodía UTC). */
export function fechaISOaDia(fecha: Date | string): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return d.toISOString().substring(0, 10);
}

/**
 * Lista canónica de días del evento. Combina la fecha principal (día 1) con `fechasEvento`.
 * Siempre incluye la fecha principal. Devuelve array ordenado de "YYYY-MM-DD".
 */
export function diasEvento(
  fechaPrincipal: Date | string | null | undefined,
  fechasEventoJson: string | null | undefined,
): string[] {
  const lista = parseFechasEvento(fechasEventoJson);
  if (fechaPrincipal) {
    const dia1 = fechaISOaDia(fechaPrincipal);
    if (!lista.includes(dia1)) lista.push(dia1);
  }
  return Array.from(new Set(lista)).sort();
}

/**
 * Agrupa filas de cronograma (u otras filas con `dia?: "YYYY-MM-DD"`) por día del evento.
 * Devuelve un grupo por cada fecha de `dias`, en orden. Las filas sin `dia` (o con un `dia`
 * fuera de la lista) caen en el día 1, para no perder cronogramas hechos antes del multidía.
 * Si el evento es de un solo día, devuelve un único grupo con todas las filas.
 */
export function agruparPorDia<T extends { dia?: string | null }>(
  rows: T[],
  dias: string[],
): { fecha: string; numero: number; rows: T[] }[] {
  if (dias.length <= 1) {
    return [{ fecha: dias[0] ?? "", numero: 1, rows }];
  }
  const set = new Set(dias);
  return dias.map((fecha, i) => ({
    fecha,
    numero: i + 1,
    rows: rows.filter(r => (r.dia && set.has(r.dia)) ? r.dia === fecha : i === 0),
  }));
}

export type HorarioDia = { inicio: string | null; fin: string | null };

/** Parsea el JSON de horariosEvento a un mapa { "YYYY-MM-DD": {inicio, fin} }. */
export function parseHorariosEvento(json: string | null | undefined): Record<string, HorarioDia> {
  if (!json) return {};
  let obj: unknown;
  try {
    obj = JSON.parse(json);
  } catch {
    return {};
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const out: Record<string, HorarioDia> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (!RE_FECHA.test(k) || !v || typeof v !== "object") continue;
    const val = v as { inicio?: unknown; fin?: unknown };
    out[k] = {
      inicio: typeof val.inicio === "string" && val.inicio ? val.inicio : null,
      fin: typeof val.fin === "string" && val.fin ? val.fin : null,
    };
  }
  return out;
}

/**
 * Horario de un día concreto. El día 1 (índice 0) usa `horaInicioEvento/horaFinEvento` como base.
 * Los días 2+ hacen fallback a los horarios del día 1 cuando no tienen valor propio.
 */
export function horarioDeDia(
  fecha: string,
  indice: number,
  dias: string[],
  horariosJson: string | null | undefined,
  horaInicioDia1: string | null | undefined,
  horaFinDia1: string | null | undefined,
): HorarioDia {
  const mapa = parseHorariosEvento(horariosJson);
  const dia1Fecha = dias[0] ?? fecha;
  const baseInicio = mapa[dia1Fecha]?.inicio ?? horaInicioDia1 ?? null;
  const baseFin = mapa[dia1Fecha]?.fin ?? horaFinDia1 ?? null;
  if (indice === 0) {
    return { inicio: baseInicio, fin: baseFin };
  }
  const propio = mapa[fecha];
  return {
    inicio: propio?.inicio ?? baseInicio,
    fin: propio?.fin ?? baseFin,
  };
}

/**
 * Normaliza una lista de fechas para guardar: devuelve el JSON string (o null si es 0-1 día)
 * junto con la fecha del día 1 como Date a mediodía UTC (o null si no hay fechas).
 */
export function normalizarFechasEvento(fechas: (string | null | undefined)[]): {
  json: string | null;
  dia1: Date | null;
} {
  const limpias = Array.from(
    new Set(
      fechas.filter((f): f is string => typeof f === "string" && RE_FECHA.test(f)),
    ),
  ).sort();
  if (limpias.length === 0) return { json: null, dia1: null };
  const dia1 = new Date(`${limpias[0]}T12:00:00.000Z`);
  // Solo guardamos el array cuando hay más de un día; un día se representa con la fecha principal.
  const json = limpias.length > 1 ? JSON.stringify(limpias) : null;
  return { json, dia1 };
}
