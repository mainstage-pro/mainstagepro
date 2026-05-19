import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if ("completado" in body) {
    data.completado = body.completado;
    if (body.completado) data.fechaCompletado = new Date();
  }
  if ("notaResultado" in body) data.notaResultado = body.notaResultado ?? null;
  if ("nota" in body) data.nota = body.nota ?? null;
  if ("canal" in body) data.canal = body.canal;
  if ("titulo" in body) data.titulo = body.titulo;
  if ("fechaProgramada" in body) data.fechaProgramada = new Date(body.fechaProgramada);

  const seguimiento = await prisma.seguimiento.update({
    where: { id },
    data,
    include: {
      trato: { select: { id: true, nombreEvento: true, cliente: { select: { nombre: true } } } },
    },
  });

  return NextResponse.json({ seguimiento });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.seguimiento.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
