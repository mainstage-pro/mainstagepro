import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rows = await prisma.proyectoInterno.findMany({
    where: { estado: { not: "CANCELADO" } },
    include: {
      lider:  { select: { id: true, name: true } },
      fases:  { orderBy: { orden: "asc" }, include: { _count: { select: { tareas: true } } } },
      tareas: {
        where:  { parentId: null, esSeguimiento: false, estado: { not: "CANCELADA" } },
        select: { estado: true },
      },
    },
    orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
  });

  // Avance real = tareas completadas / total (excluye seguimientos y subtareas).
  const proyectos = rows.map(({ tareas, ...p }) => {
    const total = tareas.length;
    const hechas = tareas.filter(t => t.estado === "COMPLETADA").length;
    const avance = total > 0 ? Math.round((hechas / total) * 100) : p.porcentajeAvance;
    return { ...p, tareasTotal: total, tareasHechas: hechas, avance };
  });

  return NextResponse.json({ proyectos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, descripcion, area, liderId, prioridad, fechaInicio, fechaFin, presupuesto, objetivo, entregable } = body;

  if (!nombre || !area) {
    return NextResponse.json({ error: "nombre y area son requeridos" }, { status: 400 });
  }

  const proyecto = await prisma.proyectoInterno.create({
    data: {
      nombre, descripcion: descripcion ?? null, area,
      liderId: liderId ?? session.id,
      prioridad: prioridad ?? "MEDIA",
      fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
      fechaFin: fechaFin ? new Date(fechaFin) : null,
      presupuesto: presupuesto != null && presupuesto !== "" ? Number(presupuesto) : null,
      objetivo: objetivo ?? null,
      entregable: entregable ?? null,
    },
    include: {
      lider: { select: { id: true, name: true } },
      fases: { orderBy: { orden: "asc" } },
    },
  });

  return NextResponse.json({ proyecto }, { status: 201 });
}
