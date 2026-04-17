import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function calcular(config: {
  valorTotalActivos: number; tasaAnualRendimiento: number; usarSumaActivos: boolean;
  modoActivo: string; porcentajeVariable: number; pisoMinimoFijo: number;
}, valorEfectivo: number, utilidadMes: number | null) {
  const montoFijo = (valorEfectivo * config.tasaAnualRendimiento) / 1200;
  const pisoAbsoluto = montoFijo * config.pisoMinimoFijo / 100;

  if (config.modoActivo === "FIJO" || utilidadMes === null) {
    return { montoFijo, montoVariable: null, montoAcordado: montoFijo, modoPago: "FIJO" };
  }

  const montoVariable = (utilidadMes * config.porcentajeVariable) / 100;

  if (config.modoActivo === "VARIABLE") {
    const montoAcordado = Math.max(pisoAbsoluto, Math.min(montoFijo, montoVariable));
    return { montoFijo, montoVariable, montoAcordado, modoPago: "VARIABLE" };
  }

  // HIBRIDO: si variable >= fijo → cobra fijo; si no → variable con piso
  if (montoVariable >= montoFijo) {
    return { montoFijo, montoVariable, montoAcordado: montoFijo, modoPago: "FIJO" };
  } else {
    const montoAcordado = Math.max(pisoAbsoluto, montoVariable);
    return { montoFijo, montoVariable, montoAcordado, modoPago: "VARIABLE" };
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const pagos = await prisma.hervamPago.findMany({
    orderBy: [{ anio: "desc" }, { mes: "desc" }],
  });

  return NextResponse.json({ pagos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { mes, anio, utilidadMes, notas } = body;

  if (!mes || !anio) return NextResponse.json({ error: "Mes y año requeridos" }, { status: 400 });

  const config = await prisma.hervamConfig.findFirst();
  if (!config) return NextResponse.json({ error: "Configura primero los parámetros" }, { status: 400 });

  let valorEfectivo = config.valorTotalActivos;
  if (config.usarSumaActivos) {
    const activos = await prisma.hervamActivo.findMany({ where: { activo: true } });
    valorEfectivo = activos.reduce((s, a) => s + a.valorActual, 0);
  }

  const utilidad = utilidadMes !== undefined && utilidadMes !== "" ? parseFloat(utilidadMes) : null;
  const calc = calcular(config, valorEfectivo, utilidad);

  const pago = await prisma.hervamPago.create({
    data: {
      mes: parseInt(mes),
      anio: parseInt(anio),
      montoFijo: calc.montoFijo,
      utilidadMes: utilidad,
      montoVariable: calc.montoVariable,
      montoAcordado: calc.montoAcordado,
      modoPago: calc.modoPago,
      notas: notas || null,
    },
  });

  return NextResponse.json({ pago }, { status: 201 });
}
