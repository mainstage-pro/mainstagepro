import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET(
  req: NextRequest,
  { params }: { params: { empresaId: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { empresaId } = params;

  // 1. Obtener CxC de la empresa
  const cuentasCobrar = await prisma.cuentaCobrar.findMany({
    where: { empresaId },
    orderBy: { fechaCompromiso: "asc" },
  });

  // 2. Obtener CxP de la empresa
  const cuentasPagar = await prisma.cuentaPagar.findMany({
    where: { empresaId },
    orderBy: { fechaCompromiso: "asc" },
  });

  // 3. Obtener cortes y compensaciones históricas
  const cortes = await prisma.corteCompensacion.findMany({
    where: { empresaId },
    orderBy: { fechaInicial: "desc" },
  });

  const compensaciones = await prisma.compensacion.findMany({
    where: { empresaId },
    include: {
      aplicaciones: true,
      reversaDe: true,
      reversadaPor: true,
    },
    orderBy: { fecha: "desc" },
  });

  // Cálculos on-the-fly (asegurando precisión y descartando liquidaciones que no son compensables)
  // Las CxC y CxP pendientes de compensar son aquellas donde monto - montoCobrado/Pagado - montoCompensado > 0
  
  let totalFavorMS = 0;
  const cxcPendientes = cuentasCobrar.map(c => {
    const pendiente = c.monto - c.montoCobrado - Number(c.montoCompensado || 0);
    if (pendiente > 0) totalFavorMS += pendiente;
    return { ...c, saldoPendiente: pendiente };
  });

  let totalFavorContraparte = 0;
  const cxpPendientes = cuentasPagar.map(c => {
    const pendiente = c.monto - c.montoPagado - Number(c.montoCompensado || 0);
    if (pendiente > 0) totalFavorContraparte += pendiente;
    return { ...c, saldoPendiente: pendiente };
  });

  const montoCompensable = Math.min(totalFavorMS, totalFavorContraparte);
  const saldoNeto = totalFavorMS - totalFavorContraparte;

  return NextResponse.json({
    resumen: {
      aFavorMainstage: totalFavorMS,
      aFavorContraparte: totalFavorContraparte,
      montoCompensable,
      saldoNeto
    },
    cxcPendientes: cxcPendientes.filter(c => c.saldoPendiente > 0),
    cxpPendientes: cxpPendientes.filter(c => c.saldoPendiente > 0),
    historial: {
      cortes,
      compensaciones
    }
  });
}
