import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureTareaColumns } from "@/lib/ensure-tarea-columns";

const INCLUDE = {
  asignadoA:  { select: { id: true, name: true } },
  creadoPor:  { select: { id: true, name: true } },
  _count:     { select: { subtareas: true, comentarios: true, archivos: true } },
};

// Tareas de atención específica ligadas a un cliente (tipoOrigen CLIENTE): recurrencia
// de eventos, cumpleaños, fechas especiales. Se crean desde la ventana del cliente y
// aparecen en Gestión Operativa (Hoy) el día que toque según su recurrencia/fecha.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureTareaColumns();
  const { id: clienteId } = await params;

  const tareas = await prisma.tarea.findMany({
    where:   { clienteId, parentId: null, estado: { not: "CANCELADA" } },
    include: INCLUDE,
    orderBy: [{ fecha: "asc" }, { orden: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ tareas });
}
