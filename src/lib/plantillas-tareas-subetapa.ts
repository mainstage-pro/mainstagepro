// Tareas base por defecto de cada subetapa del proceso comercial. Estos son los
// VALORES SEMILLA: la fuente de verdad viva vive en la BD (modelo
// PlantillaTareaSubetapa) y se edita desde /crm/proceso. Este módulo es
// client-safe (sin Prisma) para usarse como semilla en el servidor y como tipos
// compartidos en la UI del editor.

export interface PlantillaSubetapaItem {
  id: string;
  etapaInterna: string;
  titulo: string;
  area: string;
  prioridad: string;
  offsetDias: number | null;
  orden: number;
  activo: boolean;
}

// Semilla por subetapa base. Cada trato que entra a la subetapa recibe estas
// tareas; el equipo las completa y, al terminarlas todas, el trato avanza solo
// a la siguiente subetapa. Editable después desde /crm/proceso.
export const PLANTILLAS_SUBETAPA_DEFAULT: Record<string, { titulo: string; area?: string; prioridad?: string; offsetDias?: number }[]> = {
  PRIMER_CONTACTO: [
    { titulo: "Contactar al prospecto por primera vez", prioridad: "ALTA", offsetDias: 0 },
    { titulo: "Calificar interés, tipo de evento y momento de contratación", offsetDias: 1 },
  ],
  NURTURING: [
    { titulo: "Enviar contenido de valor al prospecto", offsetDias: 0 },
    { titulo: "Agendar recordatorio de siguiente contacto", prioridad: "BAJA", offsetDias: 7 },
  ],
  FORMULARIO_ENVIADO: [
    { titulo: "Enviar formulario de descubrimiento al cliente", prioridad: "ALTA", offsetDias: 0 },
    { titulo: "Confirmar recepción de datos del evento", offsetDias: 2 },
  ],
  PROPUESTA_EN_ELABORACION: [
    { titulo: "Revisar alcance técnico con producción", area: "PRODUCCION", offsetDias: 0 },
    { titulo: "Armar propuesta / cotización", prioridad: "ALTA", offsetDias: 1 },
  ],
  COTIZACION_ENVIADA: [
    { titulo: "Enviar cotización al cliente", prioridad: "ALTA", offsetDias: 0 },
    { titulo: "Confirmar que el cliente recibió la cotización", offsetDias: 1 },
  ],
  CAMBIOS_Y_NEGOCIACION: [
    { titulo: "Atender ajustes solicitados por el cliente", prioridad: "ALTA", offsetDias: 0 },
    { titulo: "Enviar cotización revisada", offsetDias: 1 },
  ],
  CONFIRMADA: [
    { titulo: "Registrar método de confirmación", prioridad: "ALTA", offsetDias: 0 },
    { titulo: "Solicitar anticipo al cliente", area: "ADMINISTRACION", offsetDias: 1 },
  ],
  FORMALIZADA: [
    { titulo: "Generar contrato del servicio", area: "ADMINISTRACION", offsetDias: 0 },
    { titulo: "Crear proyecto de evento", area: "PRODUCCION", offsetDias: 1 },
  ],
};

// Ordena los ítems de una subetapa por `orden`.
export function ordenarPlantillaSubetapa(items: PlantillaSubetapaItem[]): PlantillaSubetapaItem[] {
  return [...items].sort((a, b) => a.orden - b.orden);
}
