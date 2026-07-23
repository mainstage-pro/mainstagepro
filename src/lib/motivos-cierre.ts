// Motivos por los que una tarea se marca como "no completada" (descartada).
// Compartido entre el modal (cliente) y el endpoint PATCH (servidor) para que
// las etiquetas y las llaves siempre coincidan. Pensado para la operación de
// producción de eventos: razones concretas por las que algo no se ejecuta.

export interface MotivoCierre {
  key: string;
  label: string;
}

export const MOTIVOS_CIERRE: MotivoCierre[] = [
  { key: "NO_NECESARIA",    label: "No había necesidad" },
  { key: "SIN_HERRAMIENTA", label: "No se cuenta con la herramienta necesaria" },
  { key: "DUPLICADA",       label: "Duplicada o ya cubierta por otra tarea" },
  { key: "DELEGADA",        label: "Se delegó o pasó a otro flujo" },
  { key: "NO_APLICA",       label: "Ya no aplica / cambio de prioridades" },
  { key: "SIN_TIEMPO",      label: "No hubo tiempo en la ventana requerida" },
  { key: "OTRO",            label: "Otro motivo" },
];

export const MOTIVO_CIERRE_LABEL: Record<string, string> =
  Object.fromEntries(MOTIVOS_CIERRE.map(m => [m.key, m.label]));

// Llaves válidas (para validación en el servidor)
export const MOTIVO_CIERRE_KEYS = new Set(MOTIVOS_CIERRE.map(m => m.key));
