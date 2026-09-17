import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string; cuotaId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, cuotaId } = await params;

  const body = await req.json();
  const { metodoPago = "TRANSFERENCIA", cuentaOrigenId, notas, fecha, monto } = body;

  const cuota = await prisma.cuotaPago.findFirst({
    where: { id: cuotaId, cuentaPagarId: id, estado: "PENDIENTE" },
  });
  if (!cuota) return NextResponse.json({ error: "Cuota no encontrada o ya pagada" }, { status: 404 });

  const cuenta = await prisma.cuentaPagar.findUnique({ where: { id } });
  if (!cuenta) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  const montoAbono = monto && monto > 0 ? parseFloat(monto) : cuota.monto;
  const fechaPago = fecha ? new Date(fecha) : new Date();

  const result = await prisma.$transaction(async (tx) => {
    // 1. Crear movimiento financiero (EGRESO)
    const movimiento = await tx.movimientoFinanciero.create({
      data: {
        tipo: "EGRESO",
        concepto: `Pago cuota ${cuota.numeroCuota} — ${cuenta.concepto}`,
        monto: montoAbono,
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
        monto: montoAbono,
        fecha: fechaPago,
        metodoPago,
        cuentaOrigenId: cuentaOrigenId || cuenta.cuentaOrigenId || null,
        notas: notas || null,
        movimientoId: movimiento.id,
        creadoPor: session.id,
      },
    });

    // 3. Marcar cuota como pagada
    await tx.cuotaPago.update({
      where: { id: cuotaId },
      data: { estado: "PAGADO", abonoPagoId: abonoPago.id, monto: montoAbono },
    });

    // 4. Actualizar montoPagado y estado de la CuentaPagar
    const nuevoPagado = cuenta.montoPagado + montoAbono;
    const saldoRestante = cuenta.monto - nuevoPagado;
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

    // 5. Redistribuir el saldo restante
    if (nuevoEstado === "LIQUIDADO") {
      await tx.cuotaPago.deleteMany({
        where: { cuentaPagarId: id, estado: "PENDIENTE" },
      });
    } else if (saldoRestante > 0) {
      const pending = await tx.cuotaPago.findMany({
        where: { cuentaPagarId: id, estado: "PENDIENTE" },
        orderBy: { numeroCuota: 'asc' }
      });
      if (pending.length > 0) {
        const avg = saldoRestante / pending.length;
        const precision = avg > 10000 ? 1000 : avg > 1000 ? 500 : avg > 100 ? 100 : 10;
        const base = Math.floor(saldoRestante / pending.length / precision) * precision;
        
        for (let i = 0; i < pending.length; i++) {
          const montoRedistribuido = i < pending.length - 1 ? base : Math.round((saldoRestante - base * (pending.length - 1)) * 100) / 100;
          await tx.cuotaPago.update({
            where: { id: pending[i].id },
            data: { monto: montoRedistribuido }
          });
        }
      }
    }

    return { abonoPago, movimiento, cuenta: cuentaActualizada };
  });

  return NextResponse.json({ ok: true, ...result });
}
