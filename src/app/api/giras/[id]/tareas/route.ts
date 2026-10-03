import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const INCLUDE = {
  asignadoA: { select: { id: true, name: true } },
  creadoPor: { select: { id: true, name: true } },
  giraShow: { select: { id: true, fecha: true, ciudad: true } },
  _count: { select: { subtareas: true, comentarios: true, archivos: true } },
};

/**
 * Tareas manuales de la gira (tipoOrigen GIRA). Mismo patrón que
 * /api/tratos/[id]/tareas. A diferencia del trato, aquí NO se instancia nada
 * automático: el advance de cada gira es distinto y las tareas se capturan a mano.
 * Las de alcance gira traen giraShowId nulo; las de una fecha lo traen con valor.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: giraId } = await params;

  const tareas = await prisma.tarea.findMany({
    where: { giraId, parentId: null, estado: { not: "CANCELADA" } },
    include: INCLUDE,
    orderBy: [{ estado: "asc" }, { fecha: "asc" }, { prioridad: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ tareas });
}
