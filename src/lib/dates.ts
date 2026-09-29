/**
 * Fechas-calendario (fechaInicio, fechaLimite, fechaEjecucion…): no tienen hora
 * significativa y se guardan a medianoche UTC. Formatearlas en la zona local
 * (UTC-6) las retrasa un día, así que se anclan a mediodía UTC y se imprimen en UTC.
 * Para timestamps reales (createdAt, publicadaEn) NO uses esto: la hora local es la correcta.
 */
export function parseDate(str: string | null | undefined): Date | null {
  if (!str) return null;
  return new Date(str.substring(0, 10) + "T12:00:00Z");
}

export function fmtDate(
  str: string | null | undefined,
  opts?: Intl.DateTimeFormatOptions,
  locale = "es-MX"
): string {
  if (!str) return "";
  return parseDate(str)!.toLocaleDateString(locale, { timeZone: "UTC", ...opts });
}

/** "15 mar 2026" — para etiquetas de selectores y listas, donde la fecha acompaña al nombre. */
export function fmtFechaCorta(str: string | null | undefined): string {
  return fmtDate(str, { day: "2-digit", month: "short", year: "numeric" });
}
