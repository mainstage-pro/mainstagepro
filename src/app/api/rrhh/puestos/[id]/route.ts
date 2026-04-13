import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const puesto = await prisma.puestoIdeal.findUnique({ where: { id } });
  if (!puesto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ puesto });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  // Serialize JSON fields
  const jsonFields = ["ciudades","habilidadesTecnicas","habilidadesBlandas","conocimientos","aptitudes","valores","areasDesarrollo","criteriosEvaluacion","prestaciones"] as const;
  const data: Record<string, unknown> = { ...body };
  for (const f of jsonFields) {
    if (Array.isArray(data[f])) data[f] = JSON.stringify(data[f]);
  }
  data.updatedAt = new Date();

  const puesto = await prisma.puestoIdeal.update({ where: { id }, data });
  return NextResponse.json({ puesto });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  await prisma.puestoIdeal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
