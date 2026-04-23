import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Returns upcoming/active event projects that have tasks assigned,
// each with their task list — used by the Operaciones "Proyectos" view.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Projects within the last 7 days and next 90 days (active window)
  const desde = new Date(hoy);
  desde.setDate(hoy.getDate() - 7);
  const hasta = new Date(hoy);
  hasta.setDate(hoy.getDate() + 90);

  const proyectos = await prisma.proyecto.findMany({
    where: {
      fechaEvento: { gte: desde, lte: hasta },
      estado: { notIn: ["CANCELADO", "COMPLETADO"] },
      tareas: { some: { estado: { not: "CANCELADA" } } },
    },
    select: {
      id: true,
      nombre: true,
      tipoEvento: true,
      fechaEvento: true,
      estado: true,
      lugarEvento: true,
      encargado: { select: { id: true, name: true } },
      tareas: {
        where:   { parentId: null, estado: { not: "CANCELADA" } },
        include: {
          asignadoA: { select: { id: true, name: true } },
          creadoPor: { select: { id: true, name: true } },
          _count:    { select: { subtareas: true, comentarios: true } },
        },
        orderBy: [{ estado: "asc" }, { fecha: "asc" }, { prioridad: "asc" }, { orden: "asc" }],
      },
    },
    orderBy: { fechaEvento: "asc" },
  });

  return NextResponse.json({ proyectos });
}
