import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Lectura ligera del maestro de áreas (PTArea) para cualquier usuario autenticado.
// Alimenta AreasProvider/useAreas() en el cliente: etiquetas y colores editables
// que sobreescriben los defaults estáticos de src/lib/areas.ts.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const areas = await prisma.pTArea.findMany({
      orderBy: { orden: "asc" },
      select: {
        id: true, codigo: true, nombre: true, color: true, orden: true, transversal: true,
        subareas: { orderBy: { orden: "asc" }, select: { id: true, nombre: true } },
      },
    });
    return NextResponse.json({ areas });
  } catch {
    // Si el maestro aún no existe (columnas nuevas), el cliente usa defaults estáticos.
    return NextResponse.json({ areas: [] });
  }
}
