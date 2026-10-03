import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Giras y shows de artista con tareas, para la vista "Giras" de Gestión Operativa.
// Espejo de /api/tareas/por-trato. Aquí se ven TODAS sus tareas, agendadas o no:
// es donde se les pone fecha y responsable para que entren a las listas operativas.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const giras = await prisma.gira.findMany({
    where: {
      activo: true,
      estado: { notIn: ["CANCELADA"] },
      tareas: { some: { estado: { not: "CANCELADA" } } },
    },
    select: {
      id: true,
      nombre: true,
      tipo: true,
      estado: true,
      fechaInicio: true,
      fechaFin: true,
      artista: { select: { id: true, nombre: true } },
      tareas: {
        where: { parentId: null, estado: { not: "CANCELADA" } },
        include: {
          asignadoA: { select: { id: true, name: true } },
          creadoPor: { select: { id: true, name: true } },
          giraShow: { select: { id: true, fecha: true, ciudad: true } },
          _count: { select: { subtareas: true, comentarios: true } },
        },
        orderBy: [{ estado: "asc" }, { fecha: "asc" }, { prioridad: "asc" }, { orden: "asc" }],
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ giras });
}
