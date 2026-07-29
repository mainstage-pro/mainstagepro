// Fuente canónica de las áreas de negocio de Mainstage.
//
// Los valores estáticos de este archivo son el RESPALDO (defaults). El módulo
// maestro "Áreas y organización" (tablas PTArea/PTSubArea) es la fuente de
// verdad en runtime: puede sobreescribir etiquetas y colores. La propagación al
// cliente se hace vía AreasProvider/useAreas() (ver src/components/AreasProvider.tsx),
// que fusiona el maestro sobre estos defaults.
//
// La clave (código) es estable y vive en la BD por compatibilidad; el `nombre`
// (etiqueta) es editable. Nota: "VENTAS" se muestra como "Comercial".

export const AREA_CODES = ["DIRECCION", "ADMINISTRACION", "MARKETING", "VENTAS", "PRODUCCION"] as const;
export type AreaCode = (typeof AREA_CODES)[number];

// Orden canónico para agrupar/listar áreas en la UI.
export const AREA_ORDEN: string[] = [...AREA_CODES];

// Etiqueta visible por defecto (VENTAS → "Comercial").
export const AREA_LABELS: Record<string, string> = {
  DIRECCION: "Dirección",
  ADMINISTRACION: "Administración",
  MARKETING: "Marketing",
  VENTAS: "Comercial",
  PRODUCCION: "Producción",
  RRHH: "RRHH",
  GENERAL: "General",
};

// Color sólido (hex) por defecto. Alineado con Puestos operativos / Organigrama.
export const AREA_HEX: Record<string, string> = {
  DIRECCION: "#B3985B",
  ADMINISTRACION: "#a855f7",
  MARKETING: "#eab308",
  VENTAS: "#22c55e",
  PRODUCCION: "#3b82f6",
  RRHH: "#fb923c",
  GENERAL: "#6b7280",
};

// Ruta del dashboard por área (redirección post-login / atajo del sidebar).
export const AREA_DASHBOARD: Record<string, string> = {
  DIRECCION: "/dashboard/direccion",
  ADMINISTRACION: "/dashboard/administracion",
  MARKETING: "/dashboard/marketing",
  VENTAS: "/dashboard/ventas",
  PRODUCCION: "/dashboard/produccion",
  RRHH: "/dashboard/rrhh",
};

// Overrides que puede aportar el maestro en runtime.
export type AreaOverride = { nombre?: string | null; color?: string | null };
export type AreaOverrides = Record<string, AreaOverride>;

/** Etiqueta visible de un área. `overrides` (maestro) tiene prioridad sobre los defaults. */
export function areaLabel(area?: string | null, overrides?: AreaOverrides): string {
  if (!area) return "Sin área";
  const code = area.toUpperCase();
  const master = overrides?.[code]?.nombre;
  if (master && master.trim()) return master.trim();
  return AREA_LABELS[code] ?? area;
}

/** Color hex de un área. `overrides` (maestro) tiene prioridad sobre los defaults. */
export function areaColor(area?: string | null, overrides?: AreaOverrides): string {
  if (!area) return AREA_HEX.GENERAL;
  const code = area.toUpperCase();
  const master = overrides?.[code]?.color;
  if (master && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(master.trim())) return master.trim();
  return AREA_HEX[code] ?? AREA_HEX.GENERAL;
}

/** Ruta de dashboard de un área (o "/dashboard" si no aplica). */
export function areaDashboard(area?: string | null): string {
  if (!area) return "/dashboard";
  return AREA_DASHBOARD[area.toUpperCase()] ?? "/dashboard";
}
