import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureProcesoTablas } from "@/lib/migraciones-lazy";

const CAMPOS = ["dia", "diaUrgente", "titulo", "objetivo", "guion", "canal", "herramienta", "avanzaSubetapaA", "activo", "orden"] as const;

// Edita un paso (edición en línea). Solo ADMIN.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureProcesoTablas();
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  for (const campo of CAMPOS) {
    if (campo in body) data[campo] = body[campo];
  }
  // Normaliza campos vacíos a null.
  for (const campo of ["diaUrgente", "herramienta", "avanzaSubetapaA"] as const) {
    if (campo in data && (data[campo] === "" || data[campo] === undefined)) data[campo] = null;
  }

  const paso = await prisma.procesoPaso.update({ where: { id }, data });
  return NextResponse.json({ paso });
}

// Desactiva un paso (soft: activo = false).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureProcesoTablas();
  const { id } = await params;
  await prisma.procesoPaso.update({ where: { id }, data: { activo: false } });
  return NextResponse.json({ ok: true });
}
