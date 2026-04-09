import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ("descripcion" in body) data.descripcion = body.descripcion;
  if ("categoria" in body) data.categoria = body.categoria;
  if ("orden" in body) data.orden = body.orden;
  if ("activo" in body) data.activo = body.activo;

  const template = await prisma.itemTemplateBodega.update({ where: { id }, data });
  return NextResponse.json({ template });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.itemTemplateBodega.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
