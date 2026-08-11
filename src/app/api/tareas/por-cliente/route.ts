import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureTareaColumns } from "@/lib/ensure-tarea-columns";

// Clientes con tareas de atención específica (tipoOrigen CLIENTE), para la vista
// "Clientes" de Gestión Operativa. Espejo de /api/tareas/por-trato.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureTareaColumns();

  const clientes = await prisma.cliente.findMany({
    where: {
      tareas: { some: { estado: { not: "CANCELADA" } } },
    },
    select: {
      id: true,
      nombre: true,
      empresa: true,
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
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({ clientes });
}
