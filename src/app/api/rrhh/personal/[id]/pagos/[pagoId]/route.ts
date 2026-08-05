import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getCategoriaSueldosYSalarios } from "@/lib/nomina-pagos";

// PATCH — marcar como pagado (crea MovimientoFinanciero y lo vincula)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; pagoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { pagoId } = await params;
  const body = await req.json();

  // Si se está marcando como PAGADO, crear movimiento financiero
  if (body.estado === "PAGADO") {
    const pago = await prisma.pagoNomina.findUnique({
      where: { id: pagoId },
      include: { personal: { select: { nombre: true } } },
    });
    if (!pago) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const fechaPago = body.fechaPago ? new Date(body.fechaPago) : new Date();

    // Categoría: Sueldos y salarios
    const categoriaId = await getCategoriaSueldosYSalarios(prisma);

    const movimiento = await prisma.movimientoFinanciero.create({
      data: {
        fecha: fechaPago,
        tipo: "GASTO",
        concepto: pago.concepto ?? `Nómina ${pago.periodo} — ${pago.personal.nombre}`,
        monto: pago.monto,
        metodoPago: body.metodoPago ?? pago.metodoPago,
        cuentaOrigenId: body.cuentaOrigenId ?? pago.cuentaOrigenId ?? null,
        creadoPor: session.name,
        categoriaId,
      },
    });

    const updated = await prisma.pagoNomina.update({
      where: { id: pagoId },
      data: {
        estado: "PAGADO",
        fechaPago,
        metodoPago: body.metodoPago ?? pago.metodoPago,
        movimientoId: movimiento.id,
      },
      include: { cuentaOrigen: { select: { nombre: true } } },
    });

    // Sincronizar CuentaPagar (con estado LIQUIDADO y AbonoPago)
    if (pago.cuentaPagarId) {
      await prisma.cuentaPagar.update({
        where: { id: pago.cuentaPagarId },
        data: {
          estado: "LIQUIDADO",
          montoPagado: pago.monto,
          fechaPagoReal: fechaPago,
          movimientoId: movimiento.id,
        },
      });
      await prisma.abonoPago.create({
        data: {
          cuentaPagarId: pago.cuentaPagarId,
          monto: pago.monto,
          fecha: fechaPago,
          metodoPago: body.metodoPago ?? pago.metodoPago ?? "TRANSFERENCIA",
          cuentaOrigenId: body.cuentaOrigenId ?? pago.cuentaOrigenId ?? null,
          movimientoId: movimiento.id,
          notas: "Pago confirmado desde Nómina (RRHH)",
          creadoPor: session.id,
        },
      });
    }

    return NextResponse.json({ pago: updated });
  }

  // Actualización genérica
  const data: Record<string, unknown> = {};
  if ("periodo" in body) data.periodo = body.periodo;
  if ("monto" in body) data.monto = parseFloat(body.monto);
  if ("concepto" in body) data.concepto = body.concepto || null;
  if ("notas" in body) data.notas = body.notas || null;

  const updated = await prisma.pagoNomina.update({
    where: { id: pagoId },
    data,
    include: { cuentaOrigen: { select: { nombre: true } } },
  });

  return NextResponse.json({ pago: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; pagoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { pagoId } = await params;
  const pago = await prisma.pagoNomina.findUnique({ where: { id: pagoId }, select: { cuentaPagarId: true, movimientoId: true } });
  if (pago?.cuentaPagarId) {
    await prisma.cuentaPagar.delete({ where: { id: pago.cuentaPagarId } }).catch(() => null);
  }
  if (pago?.movimientoId) {
    await prisma.movimientoFinanciero.delete({ where: { id: pago.movimientoId } }).catch(() => null);
  }
  await prisma.pagoNomina.delete({ where: { id: pagoId } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
