import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureTareaColumns } from "@/lib/ensure-tarea-columns";

// Tratos de ventas con tareas ad-hoc, para la vista "Tratos" de Gestión Operativa.
// Espejo de /api/tareas/por-proyecto (proyectos de evento).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureTareaColumns();

  const tratos = await prisma.trato.findMany({
    where: {
      etapa: { notIn: ["VENTA_PERDIDA"] },
      tareas: { some: { estado: { not: "CANCELADA" } } },
    },
    select: {
      id: true,
      nombreEvento: true,
      etapa: true,
      etapaInterna: true,
      fechaEventoEstimada: true,
      cliente: { select: { id: true, nombre: true } },
      responsable: { select: { id: true, name: true } },
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
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ tratos });
}
