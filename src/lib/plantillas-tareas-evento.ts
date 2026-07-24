// Plantillas de tareas sugeridas por defecto para proyectos de evento, por tipo de
// servicio. Estos son los VALORES SEMILLA: la fuente de verdad viva vive en la BD
// (modelo PlantillaTareaEvento) y se edita desde /admin/plantillas-tareas. Este
// módulo es client-safe (sin Prisma) para poder usarse como fallback en el
// componente de checklist y como semilla en el endpoint del servidor.

export interface GrupoChecklist {
  grupo: string;
  area: string;
  items: string[];
}

export interface PlantillaItem {
  id: string;
  tipoServicio: string;
  grupo: string;
  area: string;
  titulo: string;
  orden: number;
  activo: boolean;
}

// Orden fijo de los grupos dentro del checklist.
export const GRUPOS_ORDEN = ["Resumen", "Operación", "Producción", "Finanzas"] as const;

export const TIPOS_SERVICIO: { value: string; label: string }[] = [
  { value: "PRODUCCION_TECNICA", label: "Producción técnica" },
  { value: "RENTA", label: "Renta de equipo" },
];

// Área por defecto según el grupo (Finanzas → ADMINISTRACION; el resto → PRODUCCION).
export function areaDeGrupo(grupo: string): string {
  return grupo === "Finanzas" ? "ADMINISTRACION" : "PRODUCCION";
}

const CHECKLIST_PRODUCCION_TECNICA: GrupoChecklist[] = [
  {
    grupo: "Resumen",
    area: "PRODUCCION",
    items: [
      "Llenar información general del evento",
      "Llenar información del venue",
      "Llenar logística de montaje",
      "Llenar logística de desmontaje",
      "Llenar notas del proyecto",
    ],
  },
  {
    grupo: "Operación",
    area: "PRODUCCION",
    items: [
      "Llenar sección de traslado",
      "Llenar sección de personal técnico",
      "Hacer invitación a colaborar a técnicos",
      "Asignar técnico al rol técnico definido",
      "Confirmar técnicos",
      "Hacer cronología del evento",
      "Agregar documentos operativos al proyecto",
    ],
  },
  {
    grupo: "Producción",
    area: "PRODUCCION",
    items: [
      "Conseguir proveedores externos faltantes",
      "Agregar accesorios de cada equipo para el rider de carga",
      "Agregar equipos adicionales al rider de carga",
      "Agregar información de llegada de proveedores",
      "Llenar evaluación post evento",
      "Enviar evaluación del servicio a cliente",
    ],
  },
  {
    grupo: "Finanzas",
    area: "ADMINISTRACION",
    items: [
      "Confirmar pagos a personal técnico",
      "Registrar los gastos generados del proyecto",
      "Generar cierre de proyecto (una vez teniendo todos los ingresos y gastos del proyecto registrados)",
      "Generar CXP a inversionistas",
      "Hacer cobro pendiente a cliente del servicio",
      "Hacer pago a proveedores del proyecto",
    ],
  },
];

const CHECKLIST_RENTA: GrupoChecklist[] = [
  {
    grupo: "Resumen",
    area: "PRODUCCION",
    items: [
      "Confirmar contacto del encargado del lugar",
      "Llenar indicaciones para el cliente",
      "Llenar lugar del evento",
      "Llenar notas del proyecto",
    ],
  },
  {
    grupo: "Operación",
    area: "PRODUCCION",
    items: [
      "Llenar logística de renta",
      "Marcar estado de recolección de equipo",
    ],
  },
  {
    grupo: "Producción",
    area: "PRODUCCION",
    items: [
      "Llenar accesorios en rider de carga (si aplica ir a llevar equipos)",
      "Agregar equipos adicionales (si aplica)",
      "Descargar e imprimir hoja de entrega",
      "Firma de hoja de entrega del cliente",
      "Llenar protocolo de salida de equipos",
      "Llenar protocolo de entrada de equipos",
      "Llenar evaluación post renta",
      "Enviar evaluación del cliente",
    ],
  },
  {
    grupo: "Finanzas",
    area: "ADMINISTRACION",
    items: [
      "Registrar gastos del proyecto",
      "Generar cierre del proyecto",
      "Generar cuenta por pagar a inversionista",
      "Hacer cobro pendiente a cliente del servicio",
      "Hacer pago a proveedores del proyecto",
    ],
  },
];

export const PLANTILLAS_DEFAULT: Record<string, GrupoChecklist[]> = {
  PRODUCCION_TECNICA: CHECKLIST_PRODUCCION_TECNICA,
  RENTA: CHECKLIST_RENTA,
};

// Convierte filas planas de la BD en la estructura agrupada que consume el checklist.
// Ordena los grupos por GRUPOS_ORDEN (los desconocidos van al final) y los ítems por `orden`.
export function agruparPlantilla(items: PlantillaItem[]): GrupoChecklist[] {
  const porGrupo = new Map<string, { area: string; items: PlantillaItem[] }>();
  for (const it of items) {
    if (!porGrupo.has(it.grupo)) porGrupo.set(it.grupo, { area: it.area, items: [] });
    porGrupo.get(it.grupo)!.items.push(it);
  }
  const orden = (g: string) => {
    const i = (GRUPOS_ORDEN as readonly string[]).indexOf(g);
    return i === -1 ? GRUPOS_ORDEN.length : i;
  };
  return [...porGrupo.entries()]
    .sort((a, b) => orden(a[0]) - orden(b[0]))
    .map(([grupo, { area, items }]) => ({
      grupo,
      area,
      items: items.sort((a, b) => a.orden - b.orden).map((x) => x.titulo),
    }));
}
