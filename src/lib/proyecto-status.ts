// src/lib/proyecto-status.ts
// Pure function — no DB calls

export type ClasificacionProyecto =
  | 'PROXIMO'
  | 'HOY'
  | 'ACTIVO'
  | 'PENDIENTE_CIERRE'
  | 'COMPLETADO'
  | 'CANCELADO';

export interface ProyectoStatusInput {
  fechaEvento: Date | string | null;
  fechaMontaje: Date | string | null;
  planProduccionAprobado: boolean;
  estado: string;
  avance?: number;
  liquidacionCobrada?: boolean;
}

export interface ProyectoStatusResult {
  estadoCalculado: string;
  changed: boolean;
}

export function calcularEstadoProyecto(p: ProyectoStatusInput): ProyectoStatusResult {
  // Terminal states
  if (p.estado === 'COMPLETADO') return { estadoCalculado: 'COMPLETADO', changed: false };
  if (p.estado === 'CANCELADO') return { estadoCalculado: 'CANCELADO', changed: false };

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const fechaEvento = p.fechaEvento ? new Date(p.fechaEvento) : null;
  const fechaMontaje = p.fechaMontaje ? new Date(p.fechaMontaje) : null;

  if (fechaEvento) fechaEvento.setHours(0, 0, 0, 0);
  if (fechaMontaje) fechaMontaje.setHours(0, 0, 0, 0);

  const esHoy = (d: Date | null) => !!d && d.getTime() === hoy.getTime();

  // EN_CURSO → COMPLETADO: liquidación cobrada + avance 100%
  if (p.estado === 'EN_CURSO' && p.liquidacionCobrada === true && (p.avance ?? 0) >= 100) {
    return { estadoCalculado: 'COMPLETADO', changed: true };
  }

  // PLANEACION → EN_CURSO: event day or montaje day
  if (esHoy(fechaEvento) || esHoy(fechaMontaje)) {
    if (p.estado === 'PLANEACION') {
      return { estadoCalculado: 'EN_CURSO', changed: true };
    }
  }

  // Past events still in PLANEACION → move to EN_CURSO (missed the transition)
  if (fechaEvento && fechaEvento < hoy && p.estado === 'PLANEACION') {
    return { estadoCalculado: 'EN_CURSO', changed: true };
  }

  return { estadoCalculado: p.estado, changed: false };
}
