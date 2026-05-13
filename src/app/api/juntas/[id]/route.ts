import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const junta = await prisma.junta.findUnique({
    where: { id },
    include: {
      facilitador:   { select: { id: true, name: true } },
      agendaItems:   { orderBy: { orden: "asc" } },
      participantes: { include: { user: { select: { id: true, name: true, area: true } } } },
      tareas: {
        where:   { parentId: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true, titulo: true, descripcion: true, prioridad: true,
          estado: true, fecha: true, fechaVencimiento: true,
          asignadoA:    { select: { id: true, name: true } },
          proyectoTarea: { select: { id: true, nombre: true } },
        },
      },
    },
  });

  if (!junta) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  return NextResponse.json({ junta });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { estado, notas, resumen, titulo } = body;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  if (estado  !== undefined) data.estado  = estado;
  if (notas   !== undefined) data.notas   = notas;
  if (resumen !== undefined) data.resumen = resumen;
  if (titulo  !== undefined) data.titulo  = titulo;

  const junta = await prisma.junta.update({
    where: { id },
    data,
    include: {
      facilitador:   { select: { id: true, name: true } },
      agendaItems:   { orderBy: { orden: "asc" } },
      participantes: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json({ junta });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.junta.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
