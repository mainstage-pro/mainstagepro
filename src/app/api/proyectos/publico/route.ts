import { NextResponse } from "next/server";
import { getProyectosPublicos } from "@/lib/proyectos";

/**
 * GET /api/proyectos/publico?tipo=MUSICAL
 *
 * Lectura PÚBLICA (sin auth) de proyectos de presentación para alimentar la
 * sección "Proyectos" de las páginas de venta. Si la tabla aún no existe o
 * falla, devuelve { proyectos: [] } para que la presentación no se rompa.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo") ?? undefined;

  try {
    const proyectos = await getProyectosPublicos(tipo);
    return NextResponse.json(
      { proyectos },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" } }
    );
  } catch {
    return NextResponse.json({ proyectos: [] });
  }
}
