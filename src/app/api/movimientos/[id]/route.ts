import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const mov = await prisma.movimientoFinanciero.findUnique({ where: { id } });
  if (!mov) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if ("concepto" in body) data.concepto = body.concepto;
  if ("monto" in body) data.monto = parseFloat(body.monto);
  if ("fecha" in body) data.fecha = new Date(body.fecha);
  if ("notas" in body) data.notas = body.notas || null;
  if ("referencia" in body) data.referencia = body.referencia || null;
  if ("metodoPago" in body) data.metodoPago = body.metodoPago;
  if ("categoriaId" in body) data.categoriaId = body.categoriaId || null;

  const updated = await prisma.movimientoFinanciero.update({ where: { id }, data });
  return NextResponse.json({ movimiento: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const mov = await prisma.movimientoFinanciero.findUnique({
    where: { id },
    select: { cuentaCobrar: { select: { id: true } }, cuentaPagar: { select: { id: true } } },
  });
  if (!mov) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Only allow deleting movements not linked to CxC/CxP (those need to be reversed via anular)
  if (mov.cuentaCobrar || mov.cuentaPagar) {
    return NextResponse.json({ error: "Este movimiento está vinculado a un cobro o pago. Usa la opción Anular desde cobros y pagos." }, { status: 400 });
  }

  await prisma.movimientoFinanciero.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
