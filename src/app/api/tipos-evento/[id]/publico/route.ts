import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ORDER_FOTOS_TIPO_EVENTO } from "@/lib/tipos-evento";

/**
 * GET /api/tipos-evento/[id]/publico
 *
 * Lectura PÚBLICA (sin auth) de un tipo de evento y sus fotos, para alimentar la
 * galería de las presentaciones de venta. El parámetro puede ser el slug
 * ("musical") o el id. Si no existe, devuelve { tipo: null } para que la
 * presentación caiga a sus imágenes por defecto sin romperse.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const tipo = await prisma.tipoEvento.findFirst({
    where: { OR: [{ slug: id }, { id }], activo: true },
    select: {
      id: true,
      slug: true,
      nombre: true,
      subtitulo: true,
      descripcion: true,
      fotos: {
        orderBy: ORDER_FOTOS_TIPO_EVENTO,
        select: { id: true, url: true, caption: true, destacada: true, orden: true },
      },
    },
  });

  return NextResponse.json(
    { tipo },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" } }
  );
}
