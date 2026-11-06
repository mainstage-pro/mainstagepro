import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const INCLUDE = {
  asignadoA: { select: { id: true, name: true } },
  creadoPor: { select: { id: true, name: true } },
  _count: { select: { subtareas: true, comentarios: true, archivos: true } },
};

/**
 * Tareas manuales del proyecto creativo (tipoOrigen PROYECTO_CREATIVO). Mismo
 * patrón que /api/giras/[id]/tareas: NO se instancia nada automático, se
 * capturan a mano — este es el checklist operativo real de Creative (ver
 * TareasCreativoTab.tsx), no el modelo fantasma GiraChecklistItem.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: proyectoCreativoId } = await params;

  const tareas = await prisma.tarea.findMany({
    where: { proyectoCreativoId, parentId: null, estado: { not: "CANCELADA" } },
    include: INCLUDE,
    orderBy: [{ estado: "asc" }, { fecha: "asc" }, { prioridad: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ tareas });
}
