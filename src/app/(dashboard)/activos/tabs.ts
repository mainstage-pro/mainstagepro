import type { ModuleNavTab } from "@/components/ModuleTabsLayout";

export const activosTabs: ModuleNavTab[] = [
  { href: "/activos/valuacion", label: "Inventario de activos", accessKey: "inventario-activos-admin", adminOnly: true },
  { href: "/activos/venta", label: "Equipos en venta", accessKey: "equipos-venta", adminOnly: true },
  { href: "/activos/analisis", label: "Info de subrentas", accessKey: "inv-analisis" },
  { href: "/activos/socios", label: "Estructura societaria", accessKey: "socios-constitutivos" },
];
