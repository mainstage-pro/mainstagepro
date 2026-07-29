// Áreas de negocio para los sistemas operativos (Tareas, Plan de Trabajo, Proyectos).
// La clave "VENTAS" se conserva en la BD por compatibilidad, pero se muestra como "Comercial".
//
// Fuente canónica: src/lib/areas.ts. Este módulo re-exporta desde ahí para evitar
// drift; solo mantiene las clases de chip (tailwind) que son propias de este contexto.

import { AREA_CODES, AREA_LABELS, AREA_HEX, areaLabel } from "@/lib/areas";

export { AREA_LABELS, areaLabel };
export const AREAS = AREA_CODES;
export type AreaKey = (typeof AREAS)[number];

export const AREA_COLORS: Record<string, string> = {
  DIRECCION:      "bg-purple-900/30 text-purple-400",
  ADMINISTRACION: "bg-blue-900/30 text-blue-400",
  MARKETING:      "bg-pink-900/30 text-pink-400",
  VENTAS:         "bg-green-900/30 text-green-400",
  PRODUCCION:     "bg-yellow-900/30 text-yellow-400",
  RRHH:           "bg-orange-900/30 text-orange-400",
  GENERAL:        "bg-[#222] text-[#888]",
};

// Color sólido (hex) por área, para dots y acentos. Alias del canónico AREA_HEX.
export const AREA_DOT: Record<string, string> = AREA_HEX;

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
