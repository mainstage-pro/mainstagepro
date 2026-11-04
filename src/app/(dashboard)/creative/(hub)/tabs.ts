import type { ModuleNavTab } from "@/components/ModuleTabsLayout";

// Ninguna pestaña puede ser prefijo de otra: ModuleTabsLayout marca activo por prefijo.
// El detalle vive en singular (/creative/[id]) para que no choque con estas rutas de lista.
export const creativeTabs: ModuleNavTab[] = [
  { href: "/creative/proyectos", label: "Proyectos", accessKey: "creative" },
  { href: "/creative/propuestas", label: "Propuestas", accessKey: "creative" },
  { href: "/creative/servicios", label: "Servicios", accessKey: "creative" },
];
