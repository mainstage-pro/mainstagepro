import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/nav";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function guard() {
  const s = await getSession();
  return s && s.email === OWNER_EMAIL ? s : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await guard())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const item = await prisma.disenoGuardado.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "No existe" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await guard())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const data: Prisma.DisenoGuardadoUpdateInput = {};
  if (typeof body.titulo === "string") data.titulo = body.titulo;
  if (body.overrides !== undefined) data.overrides = (body.overrides ?? {}) as Prisma.InputJsonValue;
  if (typeof body.estado === "string") data.estado = body.estado;
  const item = await prisma.disenoGuardado.update({ where: { id }, data });
  return NextResponse.json({ item });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await guard())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  await prisma.disenoGuardado.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
