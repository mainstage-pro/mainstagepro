import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/galeria-inicio/publico
 *
 * Lectura PÚBLICA (sin auth) de las slides del hero de la galería, en orden.
 */
export async function GET() {
  const slides = await prisma.fotoGaleriaInicio.findMany({
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    select: { id: true, url: true, caption: true },
  });
  return NextResponse.json(
    { slides },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" } }
  );
}
