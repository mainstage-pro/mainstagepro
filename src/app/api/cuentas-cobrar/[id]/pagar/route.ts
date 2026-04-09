import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { monto, fecha, notas } = await req.json();

  const cxc = await prisma.cuentaCobrar.findUnique({
    where: { id },
    include: { proyecto: { select: { id: true, nombre: true, clienteId: true } } },
  });
  if (!cxc) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const montoCobrado = parseFloat(monto) || cxc.monto;
  const liquidado = montoCobrado >= cxc.monto;

  // Crear movimiento financiero
  const movimiento = await prisma.movimientoFinanciero.create({
    data: {
      tipo: "INGRESO",
      fecha: fecha ? new Date(fecha) : new Date(),
      concepto: cxc.concepto,
      monto: montoCobrado,
      clienteId: cxc.clienteId,
      proyectoId: cxc.proyectoId,
      notas: notas || null,
      creadoPor: session.id,
    },
  });

  // Actualizar CxC
  const updated = await prisma.cuentaCobrar.update({
    where: { id },
    data: {
      estado: liquidado ? "LIQUIDADO" : "PARCIAL",
      montoCobrado: { increment: montoCobrado },
      fechaCobroReal: liquidado ? new Date() : undefined,
      movimientoId: liquidado ? movimiento.id : undefined,
    },
  });

  return NextResponse.json({ cxc: updated, movimiento });
}
