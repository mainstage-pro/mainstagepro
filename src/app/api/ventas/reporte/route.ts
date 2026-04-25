import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function mesDeTrabajoNum(fechaInicio: Date, mesReporte: string): number {
  const [year, month] = mesReporte.split("-").map(Number);
  const inicio = new Date(fechaInicio);
  const diff =
    (year - inicio.getFullYear()) * 12 + (month - (inicio.getMonth() + 1));
  return Math.max(1, diff + 1);
}

function pisoDelMes(
  mesTrabajo: number,
  config: { metaMes1: number; metaMes2: number; metaMes3: number; metaMesNormal: number }
): number {
  if (mesTrabajo === 1) return config.metaMes1;
  if (mesTrabajo === 2) return config.metaMes2;
  if (mesTrabajo === 3) return config.metaMes3;
  return config.metaMesNormal;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  // mes en formato "2026-04"
  const mes = searchParams.get("mes") ?? new Date().toISOString().slice(0, 7);
  // vendedorId: admin puede consultar cualquiera, vendedor solo el suyo
  let vendedorId = searchParams.get("vendedorId");
  if (session.role !== "ADMIN") vendedorId = session.id;
  if (!vendedorId) return NextResponse.json({ error: "vendedorId requerido" }, { status: 400 });

  // Configuración de comisiones
  let config = await prisma.configComisiones.findFirst();
  if (!config) config = await prisma.configComisiones.create({ data: {} });

  // Vendedor
  const vendedor = await prisma.user.findUnique({
    where: { id: vendedorId },
    select: { id: true, name: true, fechaInicioVendedor: true },
  });
  if (!vendedor) return NextResponse.json({ error: "Vendedor no encontrado" }, { status: 404 });

  // Mes de trabajo para ramp-up
  const mesTrabajo = vendedor.fechaInicioVendedor
    ? mesDeTrabajoNum(vendedor.fechaInicioVendedor, mes)
    : 99;
  const piso = pisoDelMes(mesTrabajo, config);

  // Tratos cerrados del mes (fechaCierre en el mes) del vendedor
  const [year, month] = mes.split("-").map(Number);
  const mesStart = new Date(year, month - 1, 1);
  const mesEnd = new Date(year, month, 1);

  const tratos = await prisma.trato.findMany({
    where: {
      etapa: "VENTA_CERRADA",
      fechaCierre: { gte: mesStart, lt: mesEnd },
      // vendedorId introduced later: fall back to responsableId for older tratos
      OR: [
        { vendedorId: vendedorId },
        { vendedorId: null, responsableId: vendedorId },
      ],
    },
    include: {
      cliente: { select: { id: true, nombre: true, empresa: true } },
      vendedorOrigen: { select: { id: true, name: true } },
      cotizaciones: {
        where: { estado: { in: ["APROBADA"] } },
        select: {
          id: true,
          numeroCotizacion: true,
          subtotalEquiposNeto: true,
          granTotal: true,
          cuentasCobrar: {
            select: { estado: true, monto: true, montoCobrado: true, tipoPago: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  // Calcular comisión por trato
  const detalles = tratos.map((trato) => {
    const cotizacion = trato.cotizaciones[0] ?? null;
    const baseCalculo = cotizacion?.subtotalEquiposNeto ?? 0;

    // Determinar si está 100% liquidado
    const cxc = cotizacion?.cuentasCobrar ?? [];
    const totalFacturado = cxc.reduce((s, c) => s + c.monto, 0);
    const totalCobrado = cxc.reduce((s, c) => s + c.montoCobrado, 0);
    const liquidado100 = totalFacturado > 0 && totalCobrado >= totalFacturado;
    const tienAnticipo = cxc.some(
      (c) => c.tipoPago === "ANTICIPO" && c.montoCobrado > 0
    );

    // Porcentaje según origen
    let pctComision = 0;
    let notaOrigen = "";
    if (trato.origenVenta === "CLIENTE_PROPIO") {
      pctComision = config!.pctClientePropio;
      notaOrigen = "Cliente propio";
    } else if (trato.origenVenta === "PUBLICIDAD") {
      pctComision = config!.pctPublicidad;
      notaOrigen = "Lead por publicidad";
    } else if (trato.origenVenta === "ASIGNADO") {
      pctComision = config!.pctAsignadoVendedor;
      notaOrigen = `Asignado (${trato.vendedorOrigen?.name ?? "empresa"})`;
    }

    const montoComision = liquidado100 ? (baseCalculo * pctComision) / 100 : 0;

    return {
      tratoId: trato.id,
      cliente: trato.cliente,
      nombreEvento: trato.nombreEvento,
      fechaCierre: trato.fechaCierre,
      origenVenta: trato.origenVenta,
      notaOrigen,
      vendedorOrigen: trato.vendedorOrigen,
      cotizacionId: cotizacion?.id ?? null,
      numeroCotizacion: cotizacion?.numeroCotizacion ?? null,
      granTotal: cotizacion?.granTotal ?? 0,
      baseCalculo,
      pctComision,
      montoComision,
      liquidado100,
      tienAnticipo,
      estadoPago: liquidado100 ? "LIQUIDADO" : tienAnticipo ? "PARCIAL" : "PENDIENTE",
    };
  });

  // Totales
  const baseLiquidada = detalles
    .filter((d) => d.liquidado100)
    .reduce((s, d) => s + d.baseCalculo, 0);
  const totalComisiones = detalles.reduce((s, d) => s + d.montoComision, 0);
  const alcanzaPiso = baseLiquidada >= piso;
  const montoBono = alcanzaPiso ? (baseLiquidada * config.pctBono) / 100 : 0;
  const totalAPagar = totalComisiones + montoBono;

  // Pago ya registrado este mes
  const pagosRegistrados = await prisma.comisionPago.findMany({
    where: { vendedorId, mes },
    orderBy: { pagadoEn: "desc" },
  });

  return NextResponse.json({
    mes,
    mesTrabajo,
    piso,
    vendedor: { id: vendedor.id, name: vendedor.name },
    config,
    detalles,
    resumen: {
      totalTratos: tratos.length,
      baseLiquidada,
      totalComisiones,
      alcanzaPiso,
      montoBono,
      totalAPagar,
    },
    pagosRegistrados,
  });
}

export async function POST(request: NextRequest) {
  // Registrar pago de comisiones de un mes
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { vendedorId, mes, montoTotal, notas } = body;
  if (!vendedorId || !mes || !montoTotal)
    return NextResponse.json({ error: "vendedorId, mes y montoTotal requeridos" }, { status: 400 });

  const pago = await prisma.comisionPago.create({
    data: { vendedorId, mes, montoTotal: parseFloat(montoTotal), notas: notas || null },
  });

  return NextResponse.json({ pago });
}
