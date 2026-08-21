import { addDays, addMonths, addWeeks, addYears, isAfter, isBefore, isEqual, isValid, startOfDay } from "date-fns";

export type FrecuenciaRecurrencia = "SEMANAL" | "QUINCENAL" | "MENSUAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL" | "PERSONALIZADA";

export interface RecurrenciaConfig {
  frecuencia: FrecuenciaRecurrencia;
  intervalo?: number;
  fechaInicio: Date;
  fechaFin?: Date | null;
  diaVencimiento?: number | null;
}

/**
 * Calcula la próxima fecha de vencimiento dada una fecha anterior y la configuración.
 */
export function calcularSiguienteFecha(fechaActual: Date, config: RecurrenciaConfig): Date {
  const { frecuencia, intervalo = 1 } = config;
  const baseDate = startOfDay(fechaActual);
  
  switch (frecuencia) {
    case "SEMANAL":
      return addWeeks(baseDate, intervalo);
    case "QUINCENAL":
      return addDays(baseDate, 14 * intervalo); // Quincenal usually means 14 days or twice a month
    case "MENSUAL":
      return addMonths(baseDate, intervalo);
    case "TRIMESTRAL":
      return addMonths(baseDate, 3 * intervalo);
    case "SEMESTRAL":
      return addMonths(baseDate, 6 * intervalo);
    case "ANUAL":
      return addYears(baseDate, intervalo);
    case "PERSONALIZADA":
      // Por defecto tratamos intervalo como días si es personalizada y no se especifica otra cosa,
      // pero requeriría más detalle. Asumamos días por ahora.
      return addDays(baseDate, intervalo);
    default:
      return addMonths(baseDate, 1);
  }
}

/**
 * Genera una lista de fechas futuras para los periodos a crear.
 * Limita a un máximo de `maxOcurrencias` o hasta llegar a `fechaFin`.
 */
export function generarFechasRecurrentes(
  config: RecurrenciaConfig,
  maxOcurrencias: number = 24
): Date[] {
  const fechas: Date[] = [];
  let fechaActual = startOfDay(config.fechaInicio);
  
  for (let i = 0; i < maxOcurrencias; i++) {
    // Si hay fecha fin y ya nos pasamos, terminamos
    if (config.fechaFin && isAfter(fechaActual, startOfDay(config.fechaFin))) {
      break;
    }
    
    // Ajustar al día de vencimiento si aplica (ej. pagos mensuales los días 15)
    let fechaFinal = fechaActual;
    if (config.diaVencimiento && ["MENSUAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL"].includes(config.frecuencia)) {
      // Ajustar al día de vencimiento, respetando el límite de días del mes (ej. feb 30 -> feb 28)
      const year = fechaActual.getFullYear();
      const month = fechaActual.getMonth();
      const diasEnMes = new Date(year, month + 1, 0).getDate();
      const diaAjustado = Math.min(config.diaVencimiento, diasEnMes);
      fechaFinal = new Date(year, month, diaAjustado);
    }
    
    fechas.push(fechaFinal);
    
    fechaActual = calcularSiguienteFecha(fechaActual, config);
  }
  
  return fechas;
}
