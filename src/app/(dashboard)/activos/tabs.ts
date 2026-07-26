import type { ModuleNavTab } from "@/components/ModuleTabsLayout";

export const activosTabs: ModuleNavTab[] = [
  { href: "/activos/valuacion", label: "Inventario de activos", accessKey: "inventario-activos-admin", adminOnly: true },
  { href: "/activos/analisis", label: "Análisis de uso de equipo", accessKey: "inv-analisis" },
  { href: "/activos/socios", label: "Estructura societaria", accessKey: "socios-constitutivos" },
];
