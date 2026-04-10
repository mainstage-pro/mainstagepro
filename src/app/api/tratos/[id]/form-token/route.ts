import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const trato = await prisma.trato.findUnique({ where: { id }, select: { id: true, formToken: true } });
  if (!trato) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  let token = trato.formToken;
  if (!token) {
    token = randomUUID();
    await prisma.trato.update({ where: { id }, data: { formToken: token, formEstado: "NO_ENVIADO" } });
  }

  return NextResponse.json({ token });
}

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.trato.update({ where: { id }, data: { formEstado: "ENVIADO" } });
  return NextResponse.json({ ok: true });
}
