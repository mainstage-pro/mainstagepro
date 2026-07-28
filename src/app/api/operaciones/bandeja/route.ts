import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureTareaColumns } from "@/lib/ensure-tarea-columns";

const SELECT = {
  id: true,
  titulo: true,
  descripcion: true,
  prioridad: true,
  area: true,
  estado: true,
  fecha: true,
  fechaVencimiento: true,
  createdAt: true,
  asignadoAId: true,
  proyectoTareaId: true,
  asignadoA:     { select: { id: true, name: true } },
  proyectoTarea: { select: { id: true, nombre: true, color: true } },
  _count:        { select: { subtareas: true, comentarios: true, archivos: true } },
};

// GET /api/operaciones/bandeja — tareas movidas a la bandeja de entrada (enBandeja=true),
// para agruparlas por área en la página de Gestión Operativa.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureTareaColumns();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    enBandeja: true,
    parentId: null,
    estado: { notIn: ["COMPLETADA", "CANCELADA"] },
  };

  if (session.role !== "ADMIN") {
    where.OR = [
      { asignadoAId: session.id },
      { asignadoAId: null, creadoPorId: session.id },
      { colaboradores: { some: { usuarioId: session.id } } },
    ];
  }

  const tareas = await prisma.tarea.findMany({
    where,
    select: SELECT,
    orderBy: [{ prioridad: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ tareas });
}
