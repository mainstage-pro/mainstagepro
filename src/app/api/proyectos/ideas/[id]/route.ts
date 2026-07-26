import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureProyectoIdeasTable } from "@/lib/proyecto-ideas";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if ("titulo" in body) {
    const titulo = (body.titulo ?? "").trim();
    if (!titulo) return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
    data.titulo = titulo;
  }
  if ("descripcion" in body) data.descripcion = body.descripcion?.trim() || null;
  if ("area" in body) data.area = body.area || "GENERAL";
  if ("responsableId" in body) data.responsableId = body.responsableId || null;
  if ("estado" in body) data.estado = body.estado;

  await ensureProyectoIdeasTable();
  const idea = await prisma.proyectoIdea.update({ where: { id }, data });
  return NextResponse.json({ idea });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await ensureProyectoIdeasTable();
  await prisma.proyectoIdea.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
