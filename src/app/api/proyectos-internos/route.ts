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
  const { nombre, descripcion, area, liderId, prioridad, fechaInicio, fechaFin, fases } = body;

  if (!nombre || !area || !liderId) {
    return NextResponse.json({ error: "nombre, area y liderId son requeridos" }, { status: 400 });
  }

  const proyecto = await prisma.proyectoInterno.create({
    data: {
      nombre, descripcion: descripcion ?? null, area,
      liderId, prioridad: prioridad ?? "MEDIA",
      fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
      fechaFin: fechaFin ? new Date(fechaFin) : null,
      fases: fases?.length
        ? {
            create: fases.map((f: { nombre: string; descripcion?: string }, i: number) => ({
              nombre: f.nombre, descripcion: f.descripcion ?? null, orden: i,
            })),
          }
        : undefined,
    },
    include: {
      lider: { select: { id: true, name: true } },
      fases: { orderBy: { orden: "asc" } },
    },
  });

  return NextResponse.json({ proyecto }, { status: 201 });
}
