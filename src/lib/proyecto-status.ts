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
}

export interface ProyectoStatusResult {
  estadoCalculado: string;
  clasificacion: ClasificacionProyecto;
}

export function calcularEstadoProyecto(p: ProyectoStatusInput): ProyectoStatusResult {
  // If already terminal, respect it
  if (p.estado === 'COMPLETADO') return { estadoCalculado: 'COMPLETADO', clasificacion: 'COMPLETADO' };
  if (p.estado === 'CANCELADO') return { estadoCalculado: 'CANCELADO', clasificacion: 'CANCELADO' };

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fechaEvento = p.fechaEvento ? new Date(p.fechaEvento) : null;
  const fechaMontaje = p.fechaMontaje ? new Date(p.fechaMontaje) : null;
  if (fechaEvento) fechaEvento.setHours(0, 0, 0, 0);
  if (fechaMontaje) fechaMontaje.setHours(0, 0, 0, 0);

  // If event date has passed → PENDIENTE_CIERRE
  if (fechaEvento && fechaEvento < hoy) {
    return { estadoCalculado: 'PENDIENTE_CIERRE', clasificacion: 'PENDIENTE_CIERRE' };
  }

  // If today is the event day or montaje day → EN_CURSO
  const esHoy = (d: Date | null) =>
    d !== null && d.getFullYear() === hoy.getFullYear() &&
    d.getMonth() === hoy.getMonth() &&
    d.getDate() === hoy.getDate();

  if (esHoy(fechaEvento) || esHoy(fechaMontaje)) {
    return { estadoCalculado: 'EN_CURSO', clasificacion: 'HOY' };
  }

  // If plan approved → CONFIRMADO
  if (p.planProduccionAprobado && p.estado === 'PLANEACION') {
    return { estadoCalculado: 'CONFIRMADO', clasificacion: 'PROXIMO' };
  }

  // Classify upcoming events
  if (fechaEvento) {
    const diffMs = fechaEvento.getTime() - hoy.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDias <= 30) {
      return { estadoCalculado: p.estado, clasificacion: 'PROXIMO' };
    }
  }

  return { estadoCalculado: p.estado, clasificacion: 'PROXIMO' };
}
