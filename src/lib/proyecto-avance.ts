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
