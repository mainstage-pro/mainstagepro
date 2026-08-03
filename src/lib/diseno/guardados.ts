import { prisma } from "@/lib/prisma";
import type { DesignOverrides } from "./overrides";

// Carga un diseño guardado (server-only) y normaliza sus overrides.
export type DisenoGuardadoRow = {
  id: string;
  template: string;
  proyectoId: string | null;
  titulo: string;
  overrides: DesignOverrides;
  estado: string;
  publicacionId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getDiseno(id: string): Promise<DisenoGuardadoRow | null> {
  const d = await prisma.disenoGuardado.findUnique({ where: { id } });
  if (!d) return null;
  return { ...d, overrides: (d.overrides as DesignOverrides) ?? {} };
}
