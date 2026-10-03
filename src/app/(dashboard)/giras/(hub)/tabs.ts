import type { ModuleNavTab } from "@/components/ModuleTabsLayout";

// Ninguna pestaña puede ser prefijo de otra: ModuleTabsLayout marca activo por prefijo.
// Los detalles viven en singular (/giras/artista/[id], /giras/propuesta/[id]) para que
// no choquen con estas rutas de lista.
export const girasTabs: ModuleNavTab[] = [
  { href: "/giras/resumen", label: "Resumen", accessKey: "giras" },
  { href: "/giras/lista", label: "Shows y giras", accessKey: "giras" },
  { href: "/giras/artistas", label: "Artistas", accessKey: "giras" },
  { href: "/giras/propuestas", label: "Propuestas", accessKey: "giras" },
  { href: "/giras/servicios", label: "Servicios", accessKey: "giras" },
];
