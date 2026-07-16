import { prisma } from "@/lib/prisma";

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

// Crea la tabla formularios_lead de forma idempotente (migración lazy estilo Neon).
let _tablaReady = false;
export async function ensureFormularioLeadTable() {
  if (_tablaReady) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS formularios_lead (
        id text PRIMARY KEY,
        token text UNIQUE NOT NULL,
        "origenLead" text NOT NULL DEFAULT 'META_ADS',
        "tipoServicio" text,
        "tipoEvento" text,
        "momentoSugerido" text,
        "responsableId" text,
        usado boolean NOT NULL DEFAULT false,
        "tratoId" text,
        "createdAt" timestamp NOT NULL DEFAULT now()
      )
    `);
  } catch { /* ya existe */ }
  _tablaReady = true;
}
