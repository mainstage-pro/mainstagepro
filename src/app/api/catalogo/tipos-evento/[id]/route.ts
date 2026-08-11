import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ensureCatalogoTables, legacyFromSlug } from "@/lib/catalogo-eventos";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  await ensureCatalogoTables();

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.nombre !== undefined) data.nombre = String(body.nombre).trim();
  if (body.emoji !== undefined) data.emoji = body.emoji || null;
  if (body.subtitulo !== undefined) data.subtitulo = body.subtitulo || null;
  if (body.descripcion !== undefined) data.descripcion = body.descripcion || null;
  if (body.orden !== undefined) data.orden = Number(body.orden) || 0;
  if (body.activo !== undefined) data.activo = !!body.activo;

  const tipo = await prisma.tipoEvento.update({ where: { id }, data });
  return NextResponse.json({ tipo });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  await ensureCatalogoTables();

  const { id } = await params;
  const tipo = await prisma.tipoEvento.findUnique({ where: { id } });
  if (!tipo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // No permitir eliminar un tipo con tratos asociados; solo desactivar.
  const tratos = await prisma.trato.count({ where: { tipoEvento: legacyFromSlug(tipo.slug) } });
  if (tratos > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: ${tratos} trato(s) usan este tipo. Desactívalo en su lugar.` },
      { status: 409 }
    );
  }
  await prisma.tipoEvento.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
