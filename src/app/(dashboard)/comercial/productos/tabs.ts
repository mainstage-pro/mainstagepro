import type { ModuleNavTab } from "@/components/ModuleTabsLayout";

export const comercialProductosTabs: ModuleNavTab[] = [
  { href: "/comercial/productos/lista", label: "Productos de equipos", accessKey: "comercial-productos" },
  { href: "/comercial/productos/paquetes", label: "Paquetes", accessKey: "comercial-productos" },
  { href: "/comercial/productos/grupos-equipo", label: "Grupos de equipo", accessKey: "grupos-equipo", adminOnly: true },
];
