import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Returns active internal (company) projects that have tasks assigned,
// each with their task list — used by the Operaciones "Proyectos de empresa" view.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const proyectos = await prisma.proyectoInterno.findMany({
    where: {
      estado: { notIn: ["CANCELADO", "COMPLETADO"] },
      tareas: { some: { estado: { not: "CANCELADA" }, esSeguimiento: false } },
    },
    select: {
      id: true,
      nombre: true,
      area: true,
      estado: true,
      prioridad: true,
      fechaFin: true,
      lider: { select: { id: true, name: true } },
      tareas: {
        where:   { parentId: null, estado: { not: "CANCELADA" }, esSeguimiento: false },
        include: {
          asignadoA: { select: { id: true, name: true } },
          creadoPor: { select: { id: true, name: true } },
          _count:    { select: { subtareas: true, comentarios: true } },
        },
        orderBy: [{ estado: "asc" }, { fecha: "asc" }, { prioridad: "asc" }, { orden: "asc" }],
      },
    },
    orderBy: [{ prioridad: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ proyectos });
}
