// ── Clave de periodo de nómina ───────────────────────────────────────────────
// La nómina se deduplica por (persona, periodo, tipoPeriodo): el cron de cada
// lunes NO crea el pago si ya existe uno con esa clave. Por eso un adelanto es
// simplemente el pago del periodo siguiente creado (y liquidado) antes de
// tiempo con la MISMA clave: cuando el periodo llega, ya está saldado.
//
// La semana usa exactamente la fórmula del cron (`api/cron/nomina-semanal`);
// si cambias una, cambia la otra, o el cron generará un pago duplicado.

export type TipoPeriodoNomina = "SEMANAL" | "QUINCENAL" | "MENSUAL";

/** "2026-W48" — semana del año, misma fórmula que el cron de nómina semanal. */
export function periodoSemanal(fecha: Date): string {
  const startOfYear = new Date(fecha.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((fecha.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7,
  );
  return `${fecha.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Clave del periodo que contiene `fecha`. Quincena: "2026-11-Q2"; mes: "2026-11". */
export function periodoDe(tipo: TipoPeriodoNomina, fecha: Date): string {
  const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
  if (tipo === "SEMANAL") return periodoSemanal(fecha);
  if (tipo === "QUINCENAL") return `${mes}-Q${fecha.getDate() <= 15 ? 1 : 2}`;
  return mes;
}

/** Clave del periodo SIGUIENTE al que contiene `desde` (lo que se adelanta). */
export function periodoSiguiente(tipo: TipoPeriodoNomina, desde: Date = new Date()): string {
  const d = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate(), 12);
  if (tipo === "SEMANAL") d.setDate(d.getDate() + 7);
  else if (tipo === "QUINCENAL") {
    if (d.getDate() <= 15) d.setDate(16);
    else d.setMonth(d.getMonth() + 1, 1);
  } else d.setMonth(d.getMonth() + 1, 1);
  return periodoDe(tipo, d);
}

export const PREFIJO_ADELANTO = "Adelanto · ";

/** Un pago es adelanto si se registró con el prefijo (no hay columna propia). */
export function esAdelanto(concepto: string | null | undefined): boolean {
  return !!concepto?.startsWith(PREFIJO_ADELANTO);
}
