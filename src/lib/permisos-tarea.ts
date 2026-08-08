// Quién puede editar la CONFIGURACIÓN de una tarea (recurrencia, tipo de evidencia,
// acceso directo, ficha del estándar). Solo el dueño y Emiliano (Administración).
// El resto del equipo únicamente mueve la fecha. Módulo puro, sin dependencias de
// servidor, para poder usarlo tanto en el endpoint (fuente de verdad) como en el UI.
export const CONFIG_TAREA_OWNER_EMAIL = "mauricio@mainstagepro.mx";
export const CONFIG_TAREA_EMILIANO_ID = "cmo7ikcc00000oqfsqwzys8g4";

export function puedeEditarConfigTarea(
  s: { id?: string | null; email?: string | null } | null | undefined,
): boolean {
  if (!s) return false;
  return s.email === CONFIG_TAREA_OWNER_EMAIL || s.id === CONFIG_TAREA_EMILIANO_ID;
}
