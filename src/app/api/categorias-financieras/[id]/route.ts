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
  if ("tipo" in body) data.tipo = body.tipo;
  if ("orden" in body) data.orden = body.orden;

  const categoria = await prisma.categoriaFinanciera.update({ where: { id }, data });
  return NextResponse.json({ categoria });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.categoriaFinanciera.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
