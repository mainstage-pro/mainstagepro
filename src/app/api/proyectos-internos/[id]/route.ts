import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const proyecto = await prisma.proyectoInterno.findUnique({
    where: { id },
    include: {
      lider: { select: { id: true, name: true } },
      fases: {
        orderBy: { orden: "asc" },
        include: {
          tareas: {
            where: { parentId: null },
            select: {
              id: true, titulo: true, estado: true, prioridad: true,
              fecha: true, fechaVencimiento: true, fechaCompletada: true,
              createdAt: true,
              asignadoA: { select: { id: true, name: true } },
            },
            orderBy: { orden: "asc" },
          },
        },
      },
      tareas: {
        where: { parentId: null, faseInternaId: null },
        select: {
          id: true, titulo: true, estado: true, prioridad: true,
          fecha: true, fechaVencimiento: true, fechaCompletada: true,
          createdAt: true,
          asignadoA: { select: { id: true, name: true } },
        },
        orderBy: { orden: "asc" },
      },
    },
  });

  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ proyecto });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  for (const f of ["nombre", "descripcion", "area", "liderId", "estado", "prioridad", "porcentajeAvance"]) {
    if (f in body) data[f] = body[f];
  }
  if ("fechaInicio" in body) data.fechaInicio = body.fechaInicio ? new Date(body.fechaInicio) : null;
  if ("fechaFin"    in body) data.fechaFin    = body.fechaFin    ? new Date(body.fechaFin)    : null;

  const proyecto = await prisma.proyectoInterno.update({
    where: { id },
    data,
    include: { lider: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ proyecto });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.proyectoInterno.update({ where: { id }, data: { estado: "CANCELADO" } });
  return NextResponse.json({ ok: true });
}
