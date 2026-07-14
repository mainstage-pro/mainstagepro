import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ fotoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { fotoId } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if ("caption" in body) data.caption = body.caption;
  if ("orden" in body) data.orden = body.orden;
  if ("destacada" in body) data.destacada = body.destacada;

  const foto = await prisma.fotoTipoEvento.update({ where: { id: fotoId }, data });
  return NextResponse.json({ foto });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ fotoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { fotoId } = await params;
  await prisma.fotoTipoEvento.delete({ where: { id: fotoId } });
  return NextResponse.json({ ok: true });
}
