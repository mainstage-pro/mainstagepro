import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ESTADOS_CHECKLIST, FRENTES } from "@/lib/gira-advance-checklist";

const ESTADOS = ESTADOS_CHECKLIST.map(e => e.key) as string[];
const FRENTES_VALIDOS = FRENTES.map(f => f.key) as string[];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, itemId } = await params;
  const actual = await prisma.giraChecklistItem.findFirst({
    where: { id: itemId, giraId: id },
    select: { id: true },
  });
  if (!actual) return NextResponse.json({ error: "El renglón no existe" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.estado === "string" && ESTADOS.includes(body.estado)) {
    data.estado = body.estado;
    data.actualizadoEn = new Date();
  }
  if (typeof body.frente === "string" && FRENTES_VALIDOS.includes(body.frente)) data.frente = body.frente;
  if (typeof body.item === "string" && body.item.trim()) data.item = body.item.trim();
  if ("notas" in body) data.notas = typeof body.notas === "string" && body.notas.trim() ? body.notas.trim() : null;
  if ("responsable" in body)
    data.responsable = typeof body.responsable === "string" && body.responsable.trim() ? body.responsable.trim() : null;

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nada que guardar" }, { status: 400 });

  const item = await prisma.giraChecklistItem.update({ where: { id: itemId }, data });
  return NextResponse.json({ item });
}

/**
 * Solo se borran los renglones manuales. Uno de plantilla volvería a sembrarse en
 * la siguiente lectura, así que para quitarlo de la vista se marca NO_APLICA.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, itemId } = await params;
  const item = await prisma.giraChecklistItem.findFirst({
    where: { id: itemId, giraId: id },
    select: { id: true, llave: true },
  });
  if (!item) return NextResponse.json({ error: "El renglón no existe" }, { status: 404 });

  if (item.llave) {
    return NextResponse.json(
      { error: "Es un renglón de la plantilla del advance. Márcalo como «No aplica» en vez de borrarlo." },
      { status: 400 },
    );
  }

  await prisma.giraChecklistItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
