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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // Si viene body con estado, lo usamos; si no, marcamos como ENVIADO (comportamiento legacy)
  let data: Record<string, unknown> = { formEstado: "ENVIADO" };
  try {
    const body = await req.json();
    if (body.formEstado) data = { formEstado: body.formEstado };
    if (body.resetForm) {
      // Generar nuevo token para que el link anterior quede inválido
      const newToken = randomUUID();
      data = { formEstado: "NO_ENVIADO", formToken: newToken, formRecibidoEn: null };
    }
  } catch { /* sin body → usar defaults */ }

  await prisma.trato.update({ where: { id }, data });
  const updated = await prisma.trato.findUnique({ where: { id }, select: { formToken: true, formEstado: true } });
  return NextResponse.json({ ok: true, ...updated });
}

