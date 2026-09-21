import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Decimal } from "@prisma/client/runtime/library";
import { getCuentasScope } from "@/lib/estado-cuenta";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ empresaId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { empresaId } = await params;

  // 1 y 2. Obtener CxC y CxP consolidadas de la empresa y sus contactos/proveedores vinculados
  const { cuentasCobrar, cuentasPagar } = await getCuentasScope({ empresaId });

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
    if (pendiente > 0 && c.estado !== "LIQUIDADO" && c.estado !== "COMPENSADO") totalFavorMS += pendiente;
    return { ...c, saldoPendiente: pendiente };
  }).filter(c => c.saldoPendiente > 0 && c.estado !== "LIQUIDADO" && c.estado !== "COMPENSADO");

  let totalFavorContraparte = 0;
  const cxpPendientes = cuentasPagar.map(c => {
    const pendiente = c.monto - c.montoPagado - Number(c.montoCompensado || 0);
    if (pendiente > 0 && c.estado !== "LIQUIDADO" && c.estado !== "COMPENSADO") totalFavorContraparte += pendiente;
    return { ...c, saldoPendiente: pendiente };
  }).filter(c => c.saldoPendiente > 0 && c.estado !== "LIQUIDADO" && c.estado !== "COMPENSADO");

  const montoCompensable = Math.min(totalFavorMS, totalFavorContraparte);
  const saldoNeto = totalFavorMS - totalFavorContraparte;

  return NextResponse.json({
    resumen: {
      aFavorMainstage: totalFavorMS,
      aFavorContraparte: totalFavorContraparte,
      montoCompensable,
      saldoNeto
    },
    cxcPendientes,
    cxpPendientes,
    historial: {
      cortes,
      compensaciones
    }
  });
}
