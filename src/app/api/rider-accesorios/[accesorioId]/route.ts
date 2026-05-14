import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH — toggle completado, update cantidad
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ accesorioId: string }> }) {
  const { accesorioId } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ("completado" in body) data.completado = body.completado;
  if ("cantidad" in body) data.cantidad = Math.max(1, parseInt(body.cantidad) || 1);
  const accesorio = await prisma.riderAccesorio.update({ where: { id: accesorioId }, data });
  return NextResponse.json({ accesorio });
}

// DELETE
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ accesorioId: string }> }) {
  const { accesorioId } = await params;
  await prisma.riderAccesorio.delete({ where: { id: accesorioId } });
  return NextResponse.json({ ok: true });
}
