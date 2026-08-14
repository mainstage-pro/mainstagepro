import { prisma } from "@/lib/prisma";
import type { DesignOverrides } from "./overrides";

// Estados del ciclo de vida de una Pieza:
//   BORRADOR  → en edición, jala datos en vivo de la fuente.
//   APROBADO  → el usuario la dio por buena (aún en vivo).
//   GENERADO  → ya se rasterizaron los renders (snapshot congelado).
//   PUBLICADO → calendarizada en una Publicacion.
export type PiezaEstado = "BORRADOR" | "APROBADO" | "GENERADO" | "PUBLICADO";

// Un asset ya rasterizado de un slide en un formato concreto.
export type RenderRef = {
  slide: string;
  formato: string;
  url: string;
  mime: string; // image/png | image/jpeg
  bytes?: number;
};

// Carga un diseño guardado (server-only) y normaliza sus campos JSON.
export type DisenoGuardadoRow = {
  id: string;
  template: string;
  proyectoId: string | null;
  titulo: string;
  formato: string;
  overrides: DesignOverrides;
  snapshot: unknown | null; // datos congelados al generar (null = en vivo)
  renders: RenderRef[];
  estado: string;
  publicacionId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getDiseno(id: string): Promise<DisenoGuardadoRow | null> {
  const d = await prisma.disenoGuardado.findUnique({ where: { id } });
  if (!d) return null;
  return {
    ...d,
    overrides: (d.overrides as DesignOverrides) ?? {},
    snapshot: (d.snapshot as unknown) ?? null,
    renders: (d.renders as RenderRef[] | null) ?? [],
  };
}
