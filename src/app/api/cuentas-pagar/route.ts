import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const {
    tipoAcreedor = "OTRO",
    concepto,
    monto,
    fechaCompromiso,
    notas,
    proveedorId,
    tecnicoId,
    proyectoId,
  } = body;

  if (!concepto || !monto || !fechaCompromiso) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const cxp = await prisma.cuentaPagar.create({
    data: {
      tipoAcreedor,
      concepto,
      monto: parseFloat(monto),
      fechaCompromiso: new Date(fechaCompromiso),
      estado: "PENDIENTE",
      notas: notas || null,
      proveedorId: proveedorId || null,
      tecnicoId: tecnicoId || null,
      proyectoId: proyectoId || null,
    },
  });

  return NextResponse.json({ cxp });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cuentas = await prisma.cuentaPagar.findMany({
    include: {
      tecnico: { select: { id: true, nombre: true, celular: true } },
      proveedor: { select: { id: true, nombre: true, telefono: true } },
      proyecto: { select: { id: true, nombre: true, numeroProyecto: true } },
    },
    orderBy: { fechaCompromiso: "asc" },
  });

  return NextResponse.json(cuentas);
}
