/**
 * Calcula el miércoles de la semana siguiente a la semana que contiene fechaEvento.
 * Este es el límite de visibilidad de un evento reciente en el dashboard.
 *
 * Ejemplos:
 *   evento viernes 6 jun → semana lun 2 - dom 8 → siguiente miércoles = 11 jun
 *   evento martes 3 jun  → semana lun 2 - dom 8 → siguiente miércoles = 11 jun
 *   evento lunes 9 jun   → semana lun 9 - dom 15 → siguiente miércoles = 18 jun
 */
export function calcularMiercolesPostEvento(fechaEvento: Date): Date {
  const d = new Date(fechaEvento);
  const dow = d.getUTCDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
  // Días que retroceder para llegar al lunes de esa semana
  const daysToMon = dow === 0 ? 6 : dow - 1;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - daysToMon);
  monday.setUTCHours(0, 0, 0, 0);
  // Miércoles de la SIGUIENTE semana = lunes + 9 días
  const nextWednesday = new Date(monday);
  nextWednesday.setUTCDate(monday.getUTCDate() + 9);
  nextWednesday.setUTCHours(23, 59, 59, 999);
  return nextWednesday;
}
