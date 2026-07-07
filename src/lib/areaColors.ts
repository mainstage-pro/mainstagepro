/**
 * AREA_COLORS — Colores oficiales del sistema por área
 * Plan de Trabajo · Mainstage Pro
 * Exportar desde aquí para consistencia en todos los módulos.
 */

export const AREA_COLORS: Record<string, string> = {
  // Display names
  'Dirección':             '#6366F1',
  'Administración':        '#10B981',
  'Marketing':             '#F59E0B',
  'Ventas':                '#c9a96a',
  'Producción':            '#3B82F6',
  'Operaciones Generales': '#8B5CF6',
  // DB uppercase keys (schema: DIRECCION | ADMINISTRACION | MARKETING | VENTAS | PRODUCCION | GENERAL)
  'DIRECCION':     '#6366F1',
  'ADMINISTRACION':'#10B981',
  'MARKETING':     '#F59E0B',
  'VENTAS':        '#c9a96a',
  'PRODUCCION':    '#3B82F6',
  'GENERAL':       '#8B5CF6',
}

/** Primer nombre del usuario → color de área */
export const USER_AREA_COLORS: Record<string, string> = {
  'Mauricio':  '#6366F1', // Dirección
  'Daniel':    '#6366F1', // Dirección
  'Emiliano':  '#10B981', // Administración
  'Sebastián': '#F59E0B', // Marketing
  'Carlos':    '#3B82F6', // Producción
  'Rodrigo':   '#3B82F6', // Producción
  'Zaid':      '#3B82F6', // Producción
  'Andrés':    '#3B82F6', // Producción
}

export function getAreaColor(areaNombre: string): string {
  return AREA_COLORS[areaNombre] ?? '#6B7280'
}

export function getUserAreaColor(userName: string): string {
  const firstName = userName.split(' ')[0]
  return USER_AREA_COLORS[firstName] ?? '#6B7280'
}

/**
 * Opacidad del color de área según nivel de impacto.
 * critico = 1.0, alto = 0.65, estandar = 0.35
 */
export function getImpactoOpacity(impacto: string): number {
  switch (impacto) {
    case 'critico':  return 1.0
    case 'alto':     return 0.65
    default:         return 0.35
  }
}

/**
 * Retorna el color hex del área con alpha en formato rgba
 * para usar en style={{ backgroundColor }} o borderColor
 */
export function getAreaColorRgba(areaNombre: string, impacto: string): string {
  const hex = getAreaColor(areaNombre)
  const opacity = getImpactoOpacity(impacto)
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${opacity})`
}
