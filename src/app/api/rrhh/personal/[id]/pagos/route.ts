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

  const empleado = await prisma.personalInterno.findUnique({ where: { id }, select: { nombre: true } });

  const conceptoTexto = concepto || `Nómina ${periodo} — ${empleado?.nombre ?? "Empleado"}`;

  // Crear CuentaPagar primero para sincronía con Finanzas
  const cxp = await prisma.cuentaPagar.create({
    data: {
      tipoAcreedor: "PERSONAL_INTERNO",
      concepto: conceptoTexto,
      monto: parseFloat(monto),
      fechaCompromiso: new Date(),
      esNomina: true,
      notas: notas || `Creado manualmente desde perfil de personal. Período: ${periodo}`,
    },
  });

  const pago = await prisma.pagoNomina.create({
    data: {
      personalId: id,
      periodo,
      tipoPeriodo: tipoPeriodo || "MENSUAL",
      monto: parseFloat(monto),
      concepto: conceptoTexto,
      cuentaOrigenId: cuentaOrigenId || null,
      notas: notas || null,
      estado: "PENDIENTE",
      cuentaPagarId: cxp.id,
    },
    include: { cuentaOrigen: { select: { nombre: true } } },
  });

  return NextResponse.json({ pago });
}
