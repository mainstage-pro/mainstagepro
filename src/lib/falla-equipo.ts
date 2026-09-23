// Fuente única de verdad para las fallas de equipo.
// Una falla es independiente del mantenimiento: reportarla no cambia el estado del
// equipo ni lo saca de stock. El mantenimiento es la respuesta opcional a la falla.

export const SEVERIDADES_FALLA = ["LEVE", "MODERADA", "CRITICA"] as const;
export type SeveridadFalla = (typeof SEVERIDADES_FALLA)[number];

export const SEVERIDAD_FALLA_LABEL: Record<string, string> = {
  LEVE: "Leve",
  MODERADA: "Moderada",
  CRITICA: "Crítica",
};

export const SEVERIDAD_FALLA_BADGE: Record<string, string> = {
  LEVE: "bg-gray-800 text-gray-300",
  MODERADA: "bg-yellow-900/30 text-yellow-400",
  CRITICA: "bg-red-900/30 text-red-400",
};

export const ORIGENES_FALLA = ["EVENTO", "BODEGA", "TALLER", "CLIENTE", "OTRO"] as const;
export type OrigenFalla = (typeof ORIGENES_FALLA)[number];

export const ORIGEN_FALLA_LABEL: Record<string, string> = {
  EVENTO: "En evento",
  BODEGA: "En bodega",
  TALLER: "En taller",
  CLIENTE: "Reportada por cliente",
  OTRO: "Otro",
};

export const ESTADOS_FALLA = ["REPORTADA", "EN_ATENCION", "RESUELTA", "DESCARTADA"] as const;
export type EstadoFalla = (typeof ESTADOS_FALLA)[number];

export const ESTADO_FALLA_LABEL: Record<string, string> = {
  REPORTADA: "Reportada",
  EN_ATENCION: "En atención",
  RESUELTA: "Resuelta",
  DESCARTADA: "Descartada",
};

export const ESTADO_FALLA_BADGE: Record<string, string> = {
  REPORTADA: "bg-orange-900/30 text-orange-400",
  EN_ATENCION: "bg-blue-900/30 text-blue-400",
  RESUELTA: "bg-green-900/30 text-green-400",
  DESCARTADA: "bg-gray-800 text-gray-500",
};

// Fallas que siguen pendientes de resolución.
export const ESTADOS_FALLA_ABIERTA: readonly string[] = ["REPORTADA", "EN_ATENCION"];

// Estados terminales: cierran la falla y sellan resueltaEn.
export const ESTADOS_FALLA_CERRADA: readonly string[] = ["RESUELTA", "DESCARTADA"];
