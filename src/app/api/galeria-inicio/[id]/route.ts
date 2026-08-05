import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if ("caption" in body) data.caption = body.caption;
  if ("orden" in body) data.orden = body.orden;

  const slide = await prisma.fotoGaleriaInicio.update({ where: { id }, data });
  return NextResponse.json({ slide });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.fotoGaleriaInicio.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
