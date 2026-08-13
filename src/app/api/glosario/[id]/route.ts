import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ensureGlosarioTabla } from "@/lib/migraciones-lazy";
import { normalizarTermino } from "@/lib/glosario";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  await ensureGlosarioTabla();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (typeof body?.termino === "string" && body.termino.trim()) {
    data.original = body.termino.trim();
    data.termino = normalizarTermino(body.termino);
  }
  if (typeof body?.activo === "boolean") data.activo = body.activo;
  if (typeof body?.peso === "number") data.peso = Math.round(body.peso);

  try {
    const row = await prisma.glosarioTermino.update({ where: { id }, data });
    return NextResponse.json({ termino: row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique") || msg.includes("P2002")) {
      return NextResponse.json({ error: "Ese término ya está asignado a otro objeto." }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  await ensureGlosarioTabla();
  const { id } = await params;
  await prisma.glosarioTermino.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
