import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { monto, fecha, notas, cuentaId, metodoPago } = await req.json();

  const cxc = await prisma.cuentaCobrar.findUnique({
    where: { id },
    include: { abonos: true },
  });
  if (!cxc) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (cxc.estado === "LIQUIDADO") return NextResponse.json({ error: "Ya está liquidada" }, { status: 400 });

  const montoAbono = parseFloat(monto);
  if (!montoAbono || montoAbono <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });

  const nuevoMontoCobrado = Math.round((cxc.montoCobrado + montoAbono) * 100) / 100;
  const liquidado = nuevoMontoCobrado >= cxc.monto;

  const [abono] = await prisma.$transaction(async (tx) => {
    const movimiento = await tx.movimientoFinanciero.create({
      data: {
        tipo: "INGRESO",
        fecha: fecha ? new Date(fecha) : new Date(),
        concepto: cxc.concepto,
        monto: montoAbono,
        clienteId: cxc.clienteId,
        proyectoId: cxc.proyectoId,
        cuentaDestinoId: cuentaId || null,
        metodoPago: metodoPago || "TRANSFERENCIA",
        creadoPor: session.id,
        notas: notas || null,
      },
    });

    const nuevoAbono = await tx.abono.create({
      data: {
        cuentaCobrarId: id,
        monto: montoAbono,
        fecha: fecha ? new Date(fecha) : new Date(),
        metodoPago: metodoPago || "TRANSFERENCIA",
        notas: notas || null,
        cuentaDestinoId: cuentaId || null,
        movimientoId: movimiento.id,
        creadoPor: session.id,
      },
    });

    await tx.cuentaCobrar.update({
      where: { id },
      data: {
        montoCobrado: nuevoMontoCobrado,
        estado: liquidado ? "LIQUIDADO" : "PARCIAL",
        fechaCobroReal: liquidado ? new Date() : undefined,
        cuentaDestinoId: cuentaId || undefined,
      },
    });

    return [nuevoAbono];
  });

  const updated = await prisma.cuentaCobrar.findUnique({
    where: { id },
    include: { abonos: { orderBy: { fecha: "asc" } } },
  });

  return NextResponse.json({ cxc: updated, abono });
}
