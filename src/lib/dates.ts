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
  return parseDate(str)!.toLocaleDateString(locale, opts ?? { timeZone: "UTC" });
}
