import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string; cuotaId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, cuotaId } = await params;

  const body = await req.json();
  const { metodoPago = "TRANSFERENCIA", cuentaOrigenId, notas, fecha } = body;

  const cuota = await prisma.cuotaPago.findFirst({
    where: { id: cuotaId, cuentaPagarId: id, estado: "PENDIENTE" },
  });
  if (!cuota) return NextResponse.json({ error: "Cuota no encontrada o ya pagada" }, { status: 404 });

  const cuenta = await prisma.cuentaPagar.findUnique({ where: { id } });
  if (!cuenta) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  const fechaPago = fecha ? new Date(fecha) : new Date();

  const result = await prisma.$transaction(async (tx) => {
    // 1. Crear movimiento financiero (EGRESO)
    const movimiento = await tx.movimientoFinanciero.create({
      data: {
        tipo: "EGRESO",
        concepto: `Cuota ${cuota.numeroCuota} — ${cuenta.concepto}`,
        monto: cuota.monto,
        fecha: fechaPago,
        metodoPago,
        cuentaOrigenId: cuentaOrigenId || cuenta.cuentaOrigenId || null,
        notas: notas || null,
        categoriaId: null,
      },
    });

    // 2. Crear AbonoPago
    const abonoPago = await tx.abonoPago.create({
      data: {
        cuentaPagarId: id,
        monto: cuota.monto,
        fecha: fechaPago,
        metodoPago,
        cuentaOrigenId: cuentaOrigenId || cuenta.cuentaOrigenId || null,
        notas: notas || null,
        movimientoId: movimiento.id,
        creadoPor: session.id,
      },
    });

    // 3. Marcar cuota como pagada y vincular al abono
    await tx.cuotaPago.update({
      where: { id: cuotaId },
      data: { estado: "PAGADO", abonoPagoId: abonoPago.id },
    });

    // 4. Actualizar montoPagado y estado de la CuentaPagar
    const nuevoPagado = cuenta.montoPagado + cuota.monto;
    const nuevoEstado =
      nuevoPagado >= cuenta.monto - 0.01
        ? "LIQUIDADO"
        : nuevoPagado > 0
        ? "PARCIAL"
        : "PENDIENTE";

    const cuentaActualizada = await tx.cuentaPagar.update({
      where: { id },
      data: {
        montoPagado: nuevoPagado,
        estado: nuevoEstado,
        ...(nuevoEstado === "LIQUIDADO" ? { fechaPagoReal: fechaPago } : {}),
      },
    });

    return { abonoPago, movimiento, cuenta: cuentaActualizada };
  });

  return NextResponse.json({ ok: true, ...result });
}
