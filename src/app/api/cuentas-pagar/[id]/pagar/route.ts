import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { monto, fecha, notas, cuentaId, metodoPago, categoriaId } = await req.json();

  const cxp = await prisma.cuentaPagar.findUnique({
    where: { id },
    include: { abonos: true },
  });
  if (!cxp) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (cxp.estado === "LIQUIDADO") return NextResponse.json({ error: "Ya está liquidada" }, { status: 400 });

  const montoAbono = parseFloat(monto);
  if (!montoAbono || montoAbono <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });

  const nuevoMontoPagado = Math.round((cxp.montoPagado + montoAbono) * 100) / 100;
  const liquidado = nuevoMontoPagado >= cxp.monto;

  await prisma.$transaction(async (tx) => {
    const movimiento = await tx.movimientoFinanciero.create({
      data: {
        tipo: "GASTO",
        fecha: fecha ? new Date(fecha) : new Date(),
        concepto: cxp.concepto,
        monto: montoAbono,
        proyectoId: cxp.proyectoId,
        cuentaOrigenId: cuentaId || null,
        metodoPago: metodoPago || "TRANSFERENCIA",
        categoriaId: categoriaId || null,
        notas: notas || null,
        creadoPor: session.id,
      },
    });

    await tx.abonoPago.create({
      data: {
        cuentaPagarId: id,
        monto: montoAbono,
        fecha: fecha ? new Date(fecha) : new Date(),
        metodoPago: metodoPago || "TRANSFERENCIA",
        notas: notas || null,
        cuentaOrigenId: cuentaId || null,
        movimientoId: movimiento.id,
        creadoPor: session.id,
      },
    });

    await tx.cuentaPagar.update({
      where: { id },
      data: {
        montoPagado: nuevoMontoPagado,
        estado: liquidado ? "LIQUIDADO" : "PARCIAL",
        fechaPagoReal: liquidado ? new Date() : undefined,
        cuentaOrigenId: cuentaId || undefined,
      },
    });
  });

  const updated = await prisma.cuentaPagar.findUnique({
    where: { id },
    include: { abonos: { orderBy: { fecha: "asc" } } },
  });

  return NextResponse.json({ cxp: updated });
}
