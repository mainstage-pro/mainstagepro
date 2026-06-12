import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string; cuotaId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, cuotaId } = await params;

  const body = await req.json();
  const { metodoPago = "TRANSFERENCIA", cuentaDestinoId, notas, fecha } = body;

  const cuota = await prisma.cuotaCobro.findFirst({
    where: { id: cuotaId, cuentaCobrarId: id, estado: "PENDIENTE" },
  });
  if (!cuota) return NextResponse.json({ error: "Cuota no encontrada o ya cobrada" }, { status: 404 });

  const cuenta = await prisma.cuentaCobrar.findUnique({ where: { id } });
  if (!cuenta) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  const fechaCobro = fecha ? new Date(fecha) : new Date();

  const result = await prisma.$transaction(async (tx) => {
    // 1. Crear movimiento financiero (INGRESO)
    const movimiento = await tx.movimientoFinanciero.create({
      data: {
        tipo: "INGRESO",
        concepto: `Cuota ${cuota.numeroCuota} — ${cuenta.concepto}`,
        monto: cuota.monto,
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
        monto: cuota.monto,
        fecha: fechaCobro,
        metodoPago,
        cuentaDestinoId: cuentaDestinoId || cuenta.cuentaDestinoId || null,
        notas: notas || null,
        movimientoId: movimiento.id,
        creadoPor: session.id,
      },
    });

    // 3. Marcar cuota como cobrada y vincular al abono
    await tx.cuotaCobro.update({
      where: { id: cuotaId },
      data: { estado: "PAGADO", abonoId: abono.id },
    });

    // 4. Actualizar montoCobrado y estado de la CuentaCobrar
    const nuevoCobrado = cuenta.montoCobrado + cuota.monto;
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

    return { abono, movimiento, cuenta: cuentaActualizada };
  });

  return NextResponse.json({ ok: true, ...result });
}
