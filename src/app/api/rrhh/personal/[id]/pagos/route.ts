import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { periodo, tipoPeriodo, monto, concepto, cuentaOrigenId, notas } = body;

  if (!periodo || !monto) return NextResponse.json({ error: "Periodo y monto requeridos" }, { status: 400 });

  const pago = await prisma.pagoNomina.create({
    data: {
      personalId: id,
      periodo,
      tipoPeriodo: tipoPeriodo || "MENSUAL",
      monto: parseFloat(monto),
      concepto: concepto || null,
      cuentaOrigenId: cuentaOrigenId || null,
      notas: notas || null,
      estado: "PENDIENTE",
    },
    include: { cuentaOrigen: { select: { nombre: true } } },
  });

  return NextResponse.json({ pago });
}
