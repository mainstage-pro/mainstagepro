import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureProcesoTablas } from "@/lib/migraciones-lazy";
import { esEtapaInterna } from "@/lib/proceso/valores";

const CAMPOS = ["nombre", "descripcion", "orden", "activa", "generacionAutomatica"] as const;

// Edita una subetapa (nombre, descripción, toggle generacionAutomatica). Solo ADMIN.
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

  const subetapa = await prisma.procesoSubetapa.update({ where: { id }, data });
  return NextResponse.json({ subetapa });
}

// Borra una subetapa. Solo se permite en subetapas custom (creadas desde la UI)
// y cuando no hay tratos parados en ella; las subetapas base del proceso son fijas.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureProcesoTablas();
  const { id } = await params;

  const subetapa = await prisma.procesoSubetapa.findUnique({ where: { id } });
  if (!subetapa) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  if (esEtapaInterna(subetapa.etapaInterna)) {
    return NextResponse.json({ error: "Las subetapas base del proceso no se pueden borrar; desactívala en su lugar." }, { status: 400 });
  }

  const enUso = await prisma.trato.count({ where: { etapaInterna: subetapa.etapaInterna } });
  if (enUso > 0) {
    return NextResponse.json({ error: `No se puede borrar: ${enUso} trato(s) en esta subetapa. Muévelos primero.` }, { status: 400 });
  }

  await prisma.procesoSubetapa.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
