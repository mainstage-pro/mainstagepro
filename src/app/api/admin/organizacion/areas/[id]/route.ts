import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PATCH: edita etiqueta/objetivo/color/orden/transversal/código de un área.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.nombre === "string" && body.nombre.trim()) data.nombre = body.nombre.trim();
  if (typeof body.color === "string" && body.color.trim()) data.color = body.color.trim();
  if ("objetivo" in body) data.objetivo = body.objetivo?.trim() || null;
  if ("codigo" in body) data.codigo = body.codigo?.trim()?.toUpperCase() || null;
  if (typeof body.transversal === "boolean") data.transversal = body.transversal;
  if (typeof body.orden === "number") data.orden = body.orden;
  const area = await prisma.pTArea.update({ where: { id }, data });
  return NextResponse.json({ area });
}

// DELETE: elimina un área solo si no tiene subáreas ni plantillas (protección).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const area = await prisma.pTArea.findUnique({
    where: { id },
    include: { _count: { select: { subareas: true, templates: true } } },
  });
  if (!area) return NextResponse.json({ error: "Área no encontrada" }, { status: 404 });
  if (area._count.subareas > 0 || area._count.templates > 0) {
    return NextResponse.json({ error: "No se puede eliminar: el área tiene subáreas o tareas asociadas" }, { status: 409 });
  }
  await prisma.pTArea.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
