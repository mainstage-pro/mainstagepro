import { prisma } from "./prisma";

export async function logActividad(
  userId: string,
  accion: string,
  entidad: string,
  entidadId: string | null,
  descripcion: string,
  datos?: Record<string, unknown>
) {
  try {
    await prisma.actividadUsuario.create({
      data: {
        userId,
        accion,
        entidad,
        entidadId: entidadId ?? null,
        descripcion,
        datos: datos ? JSON.stringify(datos) : null,
      },
    });
  } catch {
    // log silently — never throw from audit log
  }
}
