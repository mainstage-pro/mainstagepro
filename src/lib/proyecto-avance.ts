// src/lib/proyecto-avance.ts
// Pure function — no DB calls

export interface ProyectoAvanceInput {
  tipoServicio: string | null;
  planProduccionAprobado: boolean;
  recoleccionStatus: string;
  checklist: Array<{ completado: boolean; item: string }>;
  equiposCount: number; // number of equipos in proyecto
}

export function calcularAvanceProyecto(p: ProyectoAvanceInput): number {
  const checklist = p.checklist;
  const total = checklist.length;
  const completados = checklist.filter(c => c.completado).length;
  const checklistPct = total > 0 ? completados / total : 0;

  const cierreCompletado = checklist.some(
    c => c.item.toLowerCase().includes('cierre financiero') && c.completado
  );
  const recoleccionCompletada = p.recoleccionStatus === 'COMPLETADA';

  if (p.tipoServicio === 'PRODUCCION_TECNICA') {
    const plan = p.planProduccionAprobado ? 0.20 : 0;
    const checkPart = checklistPct * 0.50;
    const recol = recoleccionCompletada ? 0.15 : 0;
    const cierre = cierreCompletado ? 0.15 : 0;
    return Math.round((plan + checkPart + recol + cierre) * 100);
  }

  // RENTA or null → RENTA logic
  const equipos = p.equiposCount > 0 ? 0.30 : 0;
  const checkPart = checklistPct * 0.40;
  const recol = recoleccionCompletada ? 0.30 : 0;
  return Math.round((equipos + checkPart + recol) * 100);
}

// ── Avance de PRODUCCIÓN (campos ponderados que suman 100) ────────────
// Mide únicamente pre-producción / producción técnica: nada de finanzas
// ni cobranza. Fuente única compartida entre la lista de proyectos y la
// vista de detalle para que ambos muestren el mismo porcentaje.
export interface ProyectoAvanceProduccionInput {
  lugarEvento: string | null;
  tieneEncargado: boolean;
  equiposCount: number;
  personalCount: number;
  protocoloSalida: string | null;
  direccionVenue: string | null;
  linkMaps: string | null;
  fechaMontaje: Date | string | null;
  horaInicioMontaje: string | null;
  encargadoLugar: string | null;
  encargadoCliente: string | null;
}

export interface ProduccionCheck { ok: boolean; label: string; peso: number }

export function checksAvanceProduccion(p: ProyectoAvanceProduccionInput): ProduccionCheck[] {
  let salidaOk = false;
  try {
    const s = p.protocoloSalida ? JSON.parse(p.protocoloSalida) : {};
    salidaOk = (s as { estado?: string })?.estado === 'OK';
  } catch { /* noop */ }

  return [
    { ok: !!p.lugarEvento,                              label: 'Lugar del evento',          peso: 15 },
    { ok: p.tieneEncargado,                             label: 'Coordinador de producción', peso: 10 },
    { ok: p.equiposCount > 0,                           label: 'Equipo registrado',         peso: 20 },
    { ok: p.personalCount > 0,                          label: 'Personal asignado',         peso: 15 },
    { ok: salidaOk,                                     label: 'Protocolo de salida',       peso: 12 },
    { ok: !!(p.direccionVenue || p.linkMaps),          label: 'Info del venue',            peso: 8  },
    { ok: !!p.fechaMontaje && !!p.horaInicioMontaje,   label: 'Logística de montaje',      peso: 12 },
    { ok: !!(p.encargadoLugar || p.encargadoCliente),  label: 'Encargado del lugar',       peso: 8  },
  ];
}

export function calcularAvanceProduccion(p: ProyectoAvanceProduccionInput): number {
  return Math.round(
    checksAvanceProduccion(p).reduce((sum, c) => sum + (c.ok ? c.peso : 0), 0)
  );
}
