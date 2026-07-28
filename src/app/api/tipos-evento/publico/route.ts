import { NextResponse } from "next/server";
import { getTiposEventoPublico } from "@/lib/tipos-evento";

/**
 * GET /api/tipos-evento/publico
 *
 * Lectura PÚBLICA (sin auth) de TODOS los tipos de evento activos con sus fotos
 * (destacadas primero). Es la fuente maestra de la galería pública y de cualquier
 * material por tipo de evento en presentaciones.
 */
export async function GET() {
  const tipos = await getTiposEventoPublico();
  return NextResponse.json(
    { tipos },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" } }
  );
}
