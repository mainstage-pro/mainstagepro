import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PATCH /api/plan-trabajo/kpis/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { meta, descripcion, proposito, notaCalculo, tipoCalculo, valorManual, fechaValorManual } = body;
  const data: Record<string, unknown> = {};
  if (meta !== undefined) data.meta = meta;
  if (descripcion !== undefined) data.descripcion = descripcion;
  if (proposito !== undefined) data.proposito = proposito;
  if (notaCalculo !== undefined) data.notaCalculo = notaCalculo;
  if (tipoCalculo !== undefined) data.tipoCalculo = tipoCalculo;
  if (valorManual !== undefined) data.valorManual = valorManual;
  if (fechaValorManual !== undefined) data.fechaValorManual = new Date(fechaValorManual);
  const kpi = await prisma.pTKPI.update({ where: { id }, data });
  return NextResponse.json({ kpi });
}

// DELETE /api/plan-trabajo/kpis/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  await prisma.pTKPI.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
