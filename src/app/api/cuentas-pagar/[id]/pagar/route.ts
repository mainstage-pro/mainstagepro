import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { monto, fecha, notas } = await req.json();

  const cxp = await prisma.cuentaPagar.findUnique({ where: { id } });
  if (!cxp) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const montoPagado = parseFloat(monto) || cxp.monto;
  const liquidado = montoPagado >= cxp.monto;

  const movimiento = await prisma.movimientoFinanciero.create({
    data: {
      tipo: "GASTO",
      fecha: fecha ? new Date(fecha) : new Date(),
      concepto: cxp.concepto,
      monto: montoPagado,
      proyectoId: cxp.proyectoId,
      notas: notas || null,
      creadoPor: session.id,
    },
  });

  const updated = await prisma.cuentaPagar.update({
    where: { id },
    data: {
      estado: liquidado ? "LIQUIDADO" : "PARCIAL",
      fechaPagoReal: liquidado ? new Date() : undefined,
      movimientoId: liquidado ? movimiento.id : undefined,
    },
  });

  return NextResponse.json({ cxp: updated, movimiento });
}
