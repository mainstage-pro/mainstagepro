import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const proyectos = await prisma.proyectoInterno.findMany({
    where: { estado: { not: "CANCELADO" } },
    include: {
      lider:  { select: { id: true, name: true } },
      fases:  { orderBy: { orden: "asc" }, include: { _count: { select: { tareas: true } } } },
      _count: { select: { tareas: true } },
    },
    orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ proyectos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, descripcion, area, liderId, prioridad, fechaInicio, fechaFin } = body;

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
    },
    include: {
      lider: { select: { id: true, name: true } },
      fases: { orderBy: { orden: "asc" } },
    },
  });

  return NextResponse.json({ proyecto }, { status: 201 });
}
