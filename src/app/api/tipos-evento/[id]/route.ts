import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if ("nombre" in body) data.nombre = body.nombre;
  if ("emoji" in body) data.emoji = body.emoji;
  if ("subtitulo" in body) data.subtitulo = body.subtitulo;
  if ("descripcion" in body) data.descripcion = body.descripcion;
  if ("orden" in body) data.orden = body.orden;
  if ("activo" in body) data.activo = body.activo;

  const tipo = await prisma.tipoEvento.update({
    where: { id },
    data,
    include: { fotos: { orderBy: [{ orden: "asc" }, { createdAt: "asc" }] } },
  });

  return NextResponse.json({ tipo });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.tipoEvento.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
