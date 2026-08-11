import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ensureCatalogoTables } from "@/lib/catalogo-eventos";
import { normalizarComposicion } from "../route";

function toJsonArray(v: unknown): string | null {
  if (Array.isArray(v)) return v.length ? JSON.stringify(v) : null;
  if (typeof v === "string" && v.trim()) return v;
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  await ensureCatalogoTables();

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.nombre !== undefined) data.nombre = String(body.nombre).trim();
  if (body.descripcion !== undefined) data.descripcion = body.descripcion || null;
  if (body.tiposEvento !== undefined) data.tiposEvento = toJsonArray(body.tiposEvento) ?? "[]";
  if (body.nichos !== undefined) data.nichos = toJsonArray(body.nichos);
  if (body.frecuencia !== undefined) data.frecuencia = body.frecuencia === "ocasional" ? "ocasional" : "frecuente";
  if (body.productoId !== undefined) data.productoId = body.productoId || null;
  if (body.composicion !== undefined) data.composicion = normalizarComposicion(body.composicion);
  if (body.imagenUrl !== undefined) data.imagenUrl = body.imagenUrl || null;
  if (body.orden !== undefined) data.orden = Number(body.orden) || 0;
  if (body.activo !== undefined) data.activo = !!body.activo;

  const adicional = await prisma.adicional.update({
    where: { id },
    data,
    include: { producto: { select: { id: true, nombre: true } } },
  });
  return NextResponse.json({ adicional });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  await ensureCatalogoTables();

  const { id } = await params;
  await prisma.adicional.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
