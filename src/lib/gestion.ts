// Áreas de negocio para los sistemas operativos (Tareas, Plan de Trabajo, Proyectos).
// La clave "VENTAS" se conserva en la BD por compatibilidad, pero se muestra como "Comercial".

export const AREAS = ["DIRECCION", "ADMINISTRACION", "MARKETING", "VENTAS", "PRODUCCION"] as const;
export type AreaKey = (typeof AREAS)[number];

export const AREA_LABELS: Record<string, string> = {
  DIRECCION: "Dirección",
  ADMINISTRACION: "Administración",
  MARKETING: "Marketing",
  VENTAS: "Comercial",
  PRODUCCION: "Producción",
  RRHH: "RRHH",
  GENERAL: "General",
};

export const AREA_COLORS: Record<string, string> = {
  DIRECCION:      "bg-purple-900/30 text-purple-400",
  ADMINISTRACION: "bg-blue-900/30 text-blue-400",
  MARKETING:      "bg-pink-900/30 text-pink-400",
  VENTAS:         "bg-green-900/30 text-green-400",
  PRODUCCION:     "bg-yellow-900/30 text-yellow-400",
  RRHH:           "bg-orange-900/30 text-orange-400",
  GENERAL:        "bg-[#222] text-[#888]",
};

// Color sólido (hex) por área, para dots y acentos.
export const AREA_DOT: Record<string, string> = {
  DIRECCION: "#a78bfa",
  ADMINISTRACION: "#60a5fa",
  MARKETING: "#f472b6",
  VENTAS: "#4ade80",
  PRODUCCION: "#facc15",
  RRHH: "#fb923c",
  GENERAL: "#888888",
};

export function areaLabel(area?: string | null): string {
  if (!area) return "Sin área";
  // Cualquier variante de "ventas" se muestra como Comercial.
  if (area.toUpperCase() === "VENTAS") return "Comercial";
  return AREA_LABELS[area] ?? area;
}

export function areaChipClass(area?: string | null): string {
  if (!area) return AREA_COLORS.GENERAL;
  return AREA_COLORS[area] ?? AREA_COLORS.GENERAL;
}

export const PRIORIDADES = ["URGENTE", "ALTA", "MEDIA", "BAJA"] as const;

export const PRIO_META: Record<string, { label: string; ring: string; dot: string; dotSize: string }> = {
  URGENTE: { label: "Urgente", ring: "border-red-500",    dot: "bg-red-500",    dotSize: "w-2 h-2" },
  ALTA:    { label: "Alta",    ring: "border-orange-500", dot: "bg-orange-500", dotSize: "w-1.5 h-1.5" },
  MEDIA:   { label: "Media",   ring: "border-[#B3985B]",  dot: "bg-[#B3985B]",  dotSize: "w-1 h-1" },
  BAJA:    { label: "Baja",    ring: "border-[#2a2a2a]",  dot: "bg-transparent", dotSize: "w-1 h-1" },
};
