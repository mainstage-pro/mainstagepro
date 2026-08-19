/** Mapeo momento de contratación → etapa por defecto del pipeline. */
export const MOMENTO_ETAPA: Record<string, string> = {
  EXPLORANDO: "PROSPECCION",
  COTIZANDO: "DESCUBRIMIENTO",
  LISTO_PARA_DECIDIR: "OPORTUNIDAD",
  URGENTE: "OPORTUNIDAD",
};

export function etapaDesdeMomento(momento?: string | null): string {
  if (!momento) return "PROSPECCION";
  return MOMENTO_ETAPA[momento] ?? "PROSPECCION";
}

// Migración lazy YA APLICADA en prod (verificado 2026-08-19: la tabla
// formularios_lead ya existe). No-op: se llamaba en cada request de la ruta
// pública /api/f/[token] (captura de leads, sin auth, tráfico de prospectos).
export async function ensureFormularioLeadTable() {}
