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
      // EN_PAUSA (en hold) congela el proyecto: sus tareas se ocultan de la
      // gestión operativa hasta que se reactive en Proyectos de empresa.
      estado: { notIn: ["CANCELADO", "COMPLETADO", "EN_PAUSA"] },
      tareas: { some: { estado: { not: "CANCELADA" }, esSeguimiento: false } },
      ...(session.role === "ADMIN"
        ? {}
        : { OR: [{ esPrivado: false }, { accesos: { some: { userId: session.id } } }] }),
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
