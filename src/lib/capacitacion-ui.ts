import {
  GraduationCap, Landmark, Megaphone, BadgeDollarSign, Package,
  Speaker, Disc3, LayoutGrid, MonitorPlay, BookOpen, Wrench,
  Lightbulb, ShieldCheck, Users, Video, type LucideIcon,
} from "lucide-react";

// Color por letra de bloque (auto-asignado). Mismo criterio en todo el portal.
export const BLOQUE_COLORS: Record<string, string> = {
  A: "#6366F1", B: "#10B981", C: "#F59E0B", D: "#3B82F6",
  E: "#8B5CF6", F: "#EC4899", G: "#EF4444", H: "#14B8A6",
  I: "#c9a96a", J: "#22c55e", K: "#0ea5e9", L: "#f97316",
};

export function colorBloque(letra: string): string {
  return BLOQUE_COLORS[(letra || "A").toUpperCase()] ?? "#6b7280";
}

// Slug estable para una sub-área (usado en la URL /capacitacion/area/[slug]/[sub]).
export function subAreaSlug(nombre: string): string {
  return (nombre || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "general";
}

// Íconos disponibles para las áreas.
export const ICONOS: Record<string, LucideIcon> = {
  GraduationCap, Landmark, Megaphone, BadgeDollarSign, Package,
  Speaker, Disc3, LayoutGrid, MonitorPlay, BookOpen, Wrench,
  Lightbulb, ShieldCheck, Users, Video,
};

export function iconoArea(nombre: string): LucideIcon {
  return ICONOS[nombre] ?? GraduationCap;
}

export const ICONO_OPCIONES = Object.keys(ICONOS);

export const COLOR_OPCIONES = [
  "#c9a96a", "#6366F1", "#10B981", "#F59E0B", "#3B82F6",
  "#8B5CF6", "#EC4899", "#EF4444", "#14B8A6", "#22c55e",
];
