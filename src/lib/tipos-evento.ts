import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Fuente maestra del material por tipo de evento (galerías + presentaciones).
// Las fotos marcadas como destacadas (estrella) SIEMPRE van primero, en todos
// los consumidores. Esta constante es el único punto de verdad del orden.
export const ORDER_FOTOS_TIPO_EVENTO: Prisma.FotoTipoEventoOrderByWithRelationInput[] = [
  { destacada: "desc" },
  { orden: "asc" },
  { createdAt: "asc" },
];

const SELECT_FOTO = {
  id: true,
  url: true,
  caption: true,
  destacada: true,
  orden: true,
} as const;

// Un tipo de evento con sus fotos, listo para alimentar galería/presentación.
export async function getTiposEventoPublico() {
  return prisma.tipoEvento.findMany({
    where: { activo: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    select: {
      id: true,
      slug: true,
      nombre: true,
      emoji: true,
      subtitulo: true,
      descripcion: true,
      fotos: { orderBy: ORDER_FOTOS_TIPO_EVENTO, select: SELECT_FOTO },
    },
  });
}
