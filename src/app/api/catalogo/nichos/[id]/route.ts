import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ensureCatalogoTables } from "@/lib/catalogo-eventos";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  await ensureCatalogoTables();

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.nombre !== undefined) data.nombre = String(body.nombre).trim();
  if (body.tipoEventoSlug !== undefined) data.tipoEventoSlug = String(body.tipoEventoSlug).trim().toUpperCase();
  if (body.slug !== undefined) data.slug = String(body.slug).trim();
  if (body.descripcion !== undefined) data.descripcion = body.descripcion || null;
  if (body.notasComerciales !== undefined) data.notasComerciales = body.notasComerciales || null;
  if (body.orden !== undefined) data.orden = Number(body.orden) || 0;
  if (body.activo !== undefined) data.activo = !!body.activo;

  const nicho = await prisma.nicho.update({ where: { id }, data });
  return NextResponse.json({ nicho });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  await ensureCatalogoTables();

  const { id } = await params;
  await prisma.nicho.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
