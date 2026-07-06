import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST /api/finanzas/repartos/[id]/generar-cuota
// Body: { periodo, monto?, cuentaOrigenId? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const body = await req.json();
  const { periodo, montoOverride, cuentaOrigenId, fechaCompromiso } = body as {
    periodo: string;
    montoOverride?: number;
    cuentaOrigenId?: string;
    fechaCompromiso?: string;
  };

  if (!periodo) return NextResponse.json({ error: "Se requiere el período" }, { status: 400 });

  const reparto = await prisma.repartoUtilidad.findUnique({
    where: { id },
    include: { socio: true },
  });
  if (!reparto) return NextResponse.json({ error: "Reparto no encontrado" }, { status: 404 });

  // Verificar que no exista ya cuota para ese período
  const existente = await prisma.cuotaReparto.findFirst({
    where: { repartoId: id, periodo },
  });
  if (existente) return NextResponse.json({ error: "Ya existe una cuota para ese período" }, { status: 409 });

  const monto = montoOverride || reparto.montoBase;
  const fechaVencimiento = fechaCompromiso ? new Date(fechaCompromiso) : new Date();

  // Crear CXP en cobros-pagos con badge de reparto
  const cxp = await prisma.cuentaPagar.create({
    data: {
      tipoAcreedor: "SOCIO",
      socioId: reparto.socioId || null,
      concepto: `Reparto de utilidades ${periodo} — ${reparto.beneficiario}`,
      monto,
      fechaCompromiso: fechaVencimiento,
      cuentaOrigenId: cuentaOrigenId || null,
      esReparto: true,
      notas: `Reparto: ${reparto.nombre}`,
    },
  });

  // Crear CuotaReparto vinculada a CXP
  const cuota = await prisma.cuotaReparto.create({
    data: {
      repartoId: id,
      periodo,
      monto,
      cuentaPagarId: cxp.id,
    },
  });

  return NextResponse.json({ cuota, cxp }, { status: 201 });
}
