import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PATCH: edita nombre / objetivo (descripcion) / orden de una subárea.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.nombre === "string" && body.nombre.trim()) data.nombre = body.nombre.trim();
  if ("descripcion" in body) data.descripcion = body.descripcion?.trim() || null;
  if (typeof body.orden === "number") data.orden = body.orden;
  const subarea = await prisma.pTSubArea.update({ where: { id }, data });
  return NextResponse.json({ subarea });
}

// DELETE: elimina una subárea (bloquea si tiene plantillas asociadas).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const sub = await prisma.pTSubArea.findUnique({
    where: { id }, include: { _count: { select: { templates: true } } },
  });
  if (!sub) return NextResponse.json({ error: "Subárea no encontrada" }, { status: 404 });
  if (sub._count.templates > 0) {
    return NextResponse.json({ error: "No se puede eliminar: la subárea tiene tareas asociadas" }, { status: 409 });
  }
  await prisma.pTSubArea.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
