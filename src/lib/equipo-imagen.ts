import { prisma } from "@/lib/prisma";

/**
 * Un mismo modelo se ve igual venga de quien venga. Al dar de alta un equipo que
 * ya está en el catálogo con otro proveedor o en otra línea (propio → externo →
 * premium), hereda la foto que ya tenía en vez de nacer sin imagen.
 *
 * La llave es marca + modelo: la descripción es demasiado genérica para
 * distinguir modelos y heredaría fotos equivocadas.
 */
export async function imagenDeModeloExistente(
  marca?: string | null,
  modelo?: string | null
): Promise<string | null> {
  if (!marca?.trim() || !modelo?.trim()) return null;

  const gemelo = await prisma.equipo.findFirst({
    where: {
      marca: { equals: marca.trim(), mode: "insensitive" },
      modelo: { equals: modelo.trim(), mode: "insensitive" },
      imagenUrl: { not: null },
    },
    select: { imagenUrl: true },
    orderBy: { createdAt: "asc" },
  });

  return gemelo?.imagenUrl ?? null;
}
