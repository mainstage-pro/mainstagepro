import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string; cuotaId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, cuotaId } = await params;

  const body = await req.json();
  const { metodoPago = "TRANSFERENCIA", cuentaDestinoId, notas, fecha, monto } = body;

  const cuota = await prisma.cuotaCobro.findFirst({
    where: { id: cuotaId, cuentaCobrarId: id, estado: "PENDIENTE" },
  });
  if (!cuota) return NextResponse.json({ error: "Cuota no encontrada o ya cobrada" }, { status: 404 });

  const cuenta = await prisma.cuentaCobrar.findUnique({ where: { id } });
  if (!cuenta) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  const montoAbono = monto && monto > 0 ? parseFloat(monto) : cuota.monto;
  const fechaCobro = fecha ? new Date(fecha) : new Date();

  const result = await prisma.$transaction(async (tx) => {
    // 1. Crear movimiento financiero (INGRESO)
    const movimiento = await tx.movimientoFinanciero.create({
      data: {
        tipo: "INGRESO",
        concepto: `Cuota ${cuota.numeroCuota} — ${cuenta.concepto}`,
        monto: montoAbono,
        fecha: fechaCobro,
        metodoPago,
        cuentaDestinoId: cuentaDestinoId || cuenta.cuentaDestinoId || null,
        notas: notas || null,
        categoriaId: null,
      },
    });

    // 2. Crear Abono
    const abono = await tx.abono.create({
      data: {
        cuentaCobrarId: id,
        monto: montoAbono,
        fecha: fechaCobro,
        metodoPago,
        cuentaDestinoId: cuentaDestinoId || cuenta.cuentaDestinoId || null,
        notas: notas || null,
        movimientoId: movimiento.id,
        creadoPor: session.id,
      },
    });

    // 3. Marcar cuota como cobrada (y actualizar su monto real)
    await tx.cuotaCobro.update({
      where: { id: cuotaId },
      data: { estado: "PAGADO", abonoId: abono.id, monto: montoAbono },
    });

    // 4. Actualizar montoCobrado y estado de la CuentaCobrar
    const nuevoCobrado = cuenta.montoCobrado + montoAbono;
    const saldoRestante = cuenta.monto - nuevoCobrado;
    const nuevoEstado =
      nuevoCobrado >= cuenta.monto - 0.01
        ? "LIQUIDADO"
        : nuevoCobrado > 0
        ? "PARCIAL"
        : "PENDIENTE";

    const cuentaActualizada = await tx.cuentaCobrar.update({
      where: { id },
      data: {
        montoCobrado: nuevoCobrado,
        estado: nuevoEstado,
        ...(nuevoEstado === "LIQUIDADO" ? { fechaCobroReal: fechaCobro } : {}),
      },
    });

    // 5. Redistribuir el saldo restante entre las demás cuotas PENDIENTES
    if (nuevoEstado === "LIQUIDADO") {
      // Eliminar las que queden pendientes (si el cliente adelantó o pagó de más)
      await tx.cuotaCobro.deleteMany({
        where: { cuentaCobrarId: id, estado: "PENDIENTE" },
      });
    } else if (saldoRestante > 0) {
      const pending = await tx.cuotaCobro.findMany({
        where: { cuentaCobrarId: id, estado: "PENDIENTE" },
        orderBy: { numeroCuota: 'asc' }
      });
      if (pending.length > 0) {
        // Distribuir el saldo restante de manera proporcional
        const avg = saldoRestante / pending.length;
        // Solo para no dejar decimales extraños
        const precision = avg > 10000 ? 1000 : avg > 1000 ? 500 : avg > 100 ? 100 : 10;
        const base = Math.floor(saldoRestante / pending.length / precision) * precision;
        
        for (let i = 0; i < pending.length; i++) {
          const montoRedistribuido = i < pending.length - 1 ? base : Math.round((saldoRestante - base * (pending.length - 1)) * 100) / 100;
          await tx.cuotaCobro.update({
            where: { id: pending[i].id },
            data: { monto: montoRedistribuido }
          });
        }
      }
    }

    return { abono, movimiento, cuenta: cuentaActualizada };
  });

  return NextResponse.json({ ok: true, ...result });
}
