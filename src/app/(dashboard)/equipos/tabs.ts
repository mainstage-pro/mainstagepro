import type { ModuleNavTab } from "@/components/ModuleTabsLayout";

export const equiposTabs: ModuleNavTab[] = [
  { href: "/equipos/maestro", label: "Inventario de equipos", accessKey: "inv-maestro" },
  { href: "/equipos/tablero", label: "Estado de equipos", accessKey: "produccion-tablero" },
  { href: "/equipos/disponibilidad", label: "Disponibilidad", accessKey: "inventario" },
  { href: "/equipos/recolecciones", label: "Recolecciones", accessKey: "inventario" },
  { href: "/equipos/mantenimiento", label: "Mantenimiento", accessKey: "inventario" },
  { href: "/equipos/checklist", label: "Checklist semanal", accessKey: "inventario" },
  { href: "/equipos/vehiculos", label: "Vehículos", accessKey: "inventario" },
];
