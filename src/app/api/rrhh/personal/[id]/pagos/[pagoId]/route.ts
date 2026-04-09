import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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

    const movimiento = await prisma.movimientoFinanciero.create({
      data: {
        fecha: body.fechaPago ? new Date(body.fechaPago) : new Date(),
        tipo: "GASTO",
        concepto: pago.concepto ?? `Nómina ${pago.periodo} — ${pago.personal.nombre}`,
        monto: pago.monto,
        metodoPago: body.metodoPago ?? pago.metodoPago,
        cuentaOrigenId: body.cuentaOrigenId ?? pago.cuentaOrigenId ?? null,
        creadoPor: session.name,
      },
    });

    const updated = await prisma.pagoNomina.update({
      where: { id: pagoId },
      data: {
        estado: "PAGADO",
        fechaPago: body.fechaPago ? new Date(body.fechaPago) : new Date(),
        metodoPago: body.metodoPago ?? pago.metodoPago,
        movimientoId: movimiento.id,
      },
      include: { cuentaOrigen: { select: { nombre: true } } },
    });

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
  await prisma.pagoNomina.delete({ where: { id: pagoId } });
  return NextResponse.json({ ok: true });
}
