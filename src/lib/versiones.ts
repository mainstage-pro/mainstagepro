import { prisma } from "./prisma";

export async function guardarVersion(
  userId: string,
  entidad: string,
  entidadId: string,
  datos: Record<string, unknown>,
  nota?: string
) {
  try {
    await prisma.versionHistorial.create({
      data: {
        userId,
        entidad,
        entidadId,
        snapshot: JSON.stringify(datos),
        nota: nota ?? null,
      },
    });
  } catch {
    // log silently — never throw from version snapshot
  }
}
