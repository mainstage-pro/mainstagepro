import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { clienteId, proyectoId, cotizacionId, concepto, tipoPago = "ANTICIPO", monto, fechaCompromiso } = body;

  if (!clienteId || !concepto || !monto || !fechaCompromiso) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const cxc = await prisma.cuentaCobrar.create({
    data: {
      clienteId,
      proyectoId: proyectoId || null,
      cotizacionId: cotizacionId || null,
      concepto,
      tipoPago,
      monto: parseFloat(monto),
      fechaCompromiso: new Date(fechaCompromiso),
      estado: "PENDIENTE",
    },
  });

  return NextResponse.json({ cxc });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cuentas = await prisma.cuentaCobrar.findMany({
    include: {
      cliente: { select: { id: true, nombre: true, telefono: true } },
      proyecto: { select: { id: true, nombre: true, numeroProyecto: true } },
      cotizacion: { select: { id: true, numeroCotizacion: true } },
    },
    orderBy: { fechaCompromiso: "asc" },
  });

  return NextResponse.json(cuentas);
}
