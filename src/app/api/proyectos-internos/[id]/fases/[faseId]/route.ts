import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; faseId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { faseId } = await params;
  const body = await req.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  for (const f of ["nombre", "descripcion", "orden", "completada"]) {
    if (f in body) data[f] = body[f];
  }

  const fase = await prisma.faseProyectoInterno.update({ where: { id: faseId }, data });
  return NextResponse.json({ fase });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; faseId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { faseId } = await params;
  await prisma.faseProyectoInterno.delete({ where: { id: faseId } });
  return NextResponse.json({ ok: true });
}
