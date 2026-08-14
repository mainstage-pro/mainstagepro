import { prisma } from "@/lib/prisma";
import { CAMPANA_MUESTRA_BRIEF, dataToBrief, type CampanaBrief, type CampanaData } from "./data";

// Plantillas de campaña guardadas: se persisten como DisenoGuardado con
// template="contenido-campanas" y el CampanaData congelado en `snapshot`. Así el
// render por `disenoId` funciona igual que cualquier diseño guardado, y para
// reabrir el formulario reconstruimos el brief editable con `dataToBrief`.
export const CAMPANA_TEMPLATE = "contenido-campanas";

export type CampanaGuardada = {
  id: string;
  titulo: string;
  formato: string;
  brief: CampanaBrief;
  createdAt: Date;
};

function filaABrief(snapshot: unknown): CampanaBrief {
  if (!snapshot) return { ...CAMPANA_MUESTRA_BRIEF };
  try {
    return dataToBrief(snapshot as CampanaData);
  } catch {
    return { ...CAMPANA_MUESTRA_BRIEF };
  }
}

export async function listarCampanas(): Promise<CampanaGuardada[]> {
  try {
    const rows = await prisma.disenoGuardado.findMany({
      where: { template: CAMPANA_TEMPLATE },
      orderBy: { createdAt: "desc" },
      select: { id: true, titulo: true, formato: true, snapshot: true, createdAt: true },
    });
    return rows.map((r) => ({
      id: r.id,
      titulo: r.titulo,
      formato: r.formato,
      brief: filaABrief(r.snapshot),
      createdAt: r.createdAt,
    }));
  } catch {
    return [];
  }
}

export async function getCampanaGuardada(id: string | null | undefined): Promise<CampanaGuardada | null> {
  if (!id) return null;
  try {
    const r = await prisma.disenoGuardado.findFirst({
      where: { id, template: CAMPANA_TEMPLATE },
      select: { id: true, titulo: true, formato: true, snapshot: true, createdAt: true },
    });
    if (!r) return null;
    return { id: r.id, titulo: r.titulo, formato: r.formato, brief: filaABrief(r.snapshot), createdAt: r.createdAt };
  } catch {
    return null;
  }
}
