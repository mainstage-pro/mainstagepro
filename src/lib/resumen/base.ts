// Cimientos compartidos de los dashboards de resumen.
//
// Todas las fechas del sistema se guardan al mediodía UTC, pero el negocio
// opera en America/Mexico_City. "Hoy" se deriva del huso del negocio, no del
// servidor: en Vercel el servidor está en UTC y sin esto el corte del día se
// recorre.

export const TZ = "America/Mexico_City";

export interface Ventana {
  ahora: Date;
  hoy: Date;
  finDeHoy: Date;
}

export function ventana(): Ventana {
  const ahora = new Date();
  const hoy = new Date(ahora.toLocaleDateString("en-CA", { timeZone: TZ }));
  return { ahora, hoy, finDeHoy: new Date(hoy.getTime() + 86400000 - 1) };
}

export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getTime() + dias * 86400000);
}

export function diasEntre(desde: Date, hasta: Date): number {
  return Math.round((hasta.getTime() - desde.getTime()) / 86400000);
}

/** Lunes de la semana que contiene la fecha. La semana operativa arranca en lunes. */
export function inicioDeSemana(fecha: Date): Date {
  const d = new Date(fecha);
  const dow = d.getUTCDay();
  return sumarDias(d, dow === 0 ? -6 : 1 - dow);
}

export function inicioDeMes(fecha: Date): Date {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1));
}

export function finDeMes(fecha: Date): Date {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 1) - 1);
}

export function fmtDia(fecha: Date): string {
  return fecha.toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** "12 oct", con año solo cuando no es el del año en curso: ahí sí confunde. */
export function fmtDiaAnio(fecha: Date, anioActual: number): string {
  return fecha.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    ...(fecha.getUTCFullYear() === anioActual ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });
}

export function fmtDiaSemana(fecha: Date): string {
  return fecha.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export function fmtMes(fecha: Date): string {
  return fecha.toLocaleDateString("es-MX", { month: "short", timeZone: "UTC" });
}

/** Cifras de dinero sin centavos: en un resumen los centavos son ruido. */
export function fmtMoneda(n: number): string {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}

/** Para KPIs donde el espacio manda: $1.2M, $840k. */
export function fmtMonedaCorta(n: number): string {
  const abs = Math.abs(n);
  const signo = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${signo}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${signo}$${Math.round(abs / 1_000)}k`;
  return `${signo}$${Math.round(abs)}`;
}

/** "hoy" / "en 3 días" / "hace 12 días" — más legible que una fecha suelta. */
export function relativo(dias: number): string {
  if (dias === 0) return "hoy";
  if (dias === 1) return "mañana";
  if (dias === -1) return "ayer";
  if (dias > 0) return `en ${dias} días`;
  return `hace ${Math.abs(dias)} días`;
}

export function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  return Number(v) || 0;
}
