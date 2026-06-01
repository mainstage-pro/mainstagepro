import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/formularios/reporte-semanal/[id]
// ADMIN puede ver cualquier reporte; el resto solo los propios
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const reporte = await prisma.reporteFormulario.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, area: true } },
    },
  });

  if (!reporte) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // No-admin solo puede ver sus propios reportes
  if (session.role !== "ADMIN" && reporte.userId !== session.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return NextResponse.json({ reporte });
}
