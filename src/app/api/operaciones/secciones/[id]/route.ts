import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  for (const key of ["nombre", "orden", "colapsada"]) {
    if (key in body) data[key] = body[key];
  }

  const seccion = await prisma.tareaSeccion.update({ where: { id }, data });
  return NextResponse.json({ seccion });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  // Move tasks out of section before deleting
  await prisma.tarea.updateMany({ where: { seccionId: id }, data: { seccionId: null } });
  await prisma.tareaSeccion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
