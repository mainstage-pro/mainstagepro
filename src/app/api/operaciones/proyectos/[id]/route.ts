import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const proyecto = await prisma.tareaProyecto.findUnique({
    where: { id },
    include: {
      secciones: {
        orderBy: { orden: "asc" },
        include: {
          tareas: {
            where: { parentId: null },
            orderBy: { orden: "asc" },
            include: {
              asignadoA: { select: { id: true, name: true } },
              _count: { select: { subtareas: true, comentarios: true } },
            },
          },
        },
      },
      tareas: {
        where: { seccionId: null, parentId: null },
        orderBy: { orden: "asc" },
        include: {
          asignadoA: { select: { id: true, name: true } },
          _count: { select: { subtareas: true, comentarios: true } },
        },
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
  for (const key of ["nombre", "descripcion", "color", "icono", "orden", "archivado", "carpetaId"]) {
    if (key in body) data[key] = body[key];
  }

  const proyecto = await prisma.tareaProyecto.update({ where: { id }, data });
  return NextResponse.json({ proyecto });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.tareaProyecto.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
