import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const checklist = await prisma.checklistBodega.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: [{ categoria: "asc" }, { orden: "asc" }],
        include: { equipo: { select: { descripcion: true } } },
      },
    },
  });

  if (!checklist) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ checklist });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  await prisma.checklistBodega.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if ("estado" in body) {
    data.estado = body.estado;
    if (body.estado === "COMPLETADO") data.cerradoEn = new Date();
  }
  if ("notas" in body) data.notas = body.notas || null;

  // Auto-calcular estado si hay items con alerta
  if (!("estado" in body)) {
    const items = await prisma.checklistBodegaItem.findMany({ where: { checklistId: id } });
    const hayAlertas = items.some(i => i.estado === "FALTA" || i.estado === "DAÑADO");
    const todoRevisado = items.every(i => i.estado !== "PENDIENTE");
    if (todoRevisado) data.estado = hayAlertas ? "CON_ALERTAS" : "COMPLETADO";
  }

  const checklist = await prisma.checklistBodega.update({ where: { id }, data });
  return NextResponse.json({ checklist });
}
