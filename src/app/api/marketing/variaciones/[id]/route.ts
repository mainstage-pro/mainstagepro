import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const data: Record<string, unknown> = {};
  for (const key of ["codigo", "nombre", "descripcion", "activo"]) {
    if (key in body) data[key] = body[key] === "" ? null : body[key];
  }
  for (const key of ["semana", "posicion"]) {
    if (key in body) data[key] = Number(body[key]) || 1;
  }
  if (typeof data.codigo === "string") data.codigo = data.codigo.trim();

  const variacion = await prisma.variacionContenido.update({ where: { id }, data });
  return NextResponse.json({ variacion });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.variacionContenido.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
