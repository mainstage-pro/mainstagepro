// Fuente única de verdad para el estado de equipos.
// Compartido entre inventario de equipos y mantenimiento de equipos.

export const ESTADOS_EQUIPO = [
  "ACTIVO",
  "EN_MANTENIMIENTO",
  "EN_REPARACION",
  "DADO_DE_BAJA",
] as const;

export type EstadoEquipo = (typeof ESTADOS_EQUIPO)[number];

export const ESTADO_EQUIPO_LABEL: Record<string, string> = {
  ACTIVO: "Activo",
  EN_MANTENIMIENTO: "En mantenimiento",
  EN_REPARACION: "En reparación",
  DADO_DE_BAJA: "Dado de baja",
};

// Estados que sacan al equipo/unidad del stock disponible mientras estén marcados.
export const ESTADOS_FUERA_DE_STOCK: readonly string[] = [
  "EN_MANTENIMIENTO",
  "EN_REPARACION",
  "DADO_DE_BAJA",
];

/**
 * Capacidad operativa: unidades del equipo que cuentan como stock disponible.
 *
 * - Si hay unidades registradas, resta las que no están ACTIVO (mantenimiento,
 *   reparación o dadas de baja) de la cantidad total.
 * - Si no hay unidades, el estado del catálogo aplica a todo el equipo:
 *   ACTIVO cuenta completo; cualquier otro estado deja capacidad en 0.
 */
export function capacidadOperativa(
  cantidadTotal: number,
  equipoEstado: string,
  unidades: { estado: string }[],
): number {
  if (unidades.length > 0) {
    const fueraDeStock = unidades.filter((u) => u.estado !== "ACTIVO").length;
    return Math.max(0, cantidadTotal - fueraDeStock);
  }
  return equipoEstado === "ACTIVO" ? cantidadTotal : 0;
}
