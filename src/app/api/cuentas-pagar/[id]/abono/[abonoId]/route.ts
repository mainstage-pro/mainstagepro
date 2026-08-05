import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; abonoId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, abonoId } = await params;

  const abono = await prisma.abonoPago.findUnique({
    where: { id: abonoId },
  });
  if (!abono || abono.cuentaPagarId !== id) {
    return NextResponse.json({ error: "Abono no encontrado" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    // Delete the abono (movimiento will be set to null via onDelete: SetNull)
    await tx.abonoPago.delete({ where: { id: abonoId } });

    // Delete the associated movement if it exists
    if (abono.movimientoId) {
      await tx.movimientoFinanciero.delete({ where: { id: abono.movimientoId } }).catch(() => {});
    }

    // Recalculate montoPagado from remaining abonos
    const restantes = await tx.abonoPago.findMany({ where: { cuentaPagarId: id } });
    const nuevoMontoPagado = Math.round(restantes.reduce((s, a) => s + a.monto, 0) * 100) / 100;

    const cxp = await tx.cuentaPagar.findUnique({ where: { id }, include: { pagoNomina: true } });
    const liquidado = cxp ? nuevoMontoPagado >= cxp.monto : false;
    const nuevoEstado = nuevoMontoPagado <= 0 ? "PENDIENTE" : liquidado ? "LIQUIDADO" : "PARCIAL";

    await tx.cuentaPagar.update({
      where: { id },
      data: {
        montoPagado: nuevoMontoPagado,
        estado: nuevoEstado,
        fechaPagoReal: liquidado ? new Date() : null,
      },
    });

    if (!liquidado && cxp?.pagoNomina) {
      await tx.pagoNomina.update({
        where: { id: cxp.pagoNomina.id },
        data: { estado: "PENDIENTE", fechaPago: null, movimientoId: null },
      });
    }
  });

  const updated = await prisma.cuentaPagar.findUnique({
    where: { id },
    include: { abonos: { orderBy: { fecha: "asc" } } },
  });

  return NextResponse.json({ cxp: updated });
}
