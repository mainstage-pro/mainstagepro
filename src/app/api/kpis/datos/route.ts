import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const desdeStr = searchParams.get('desde');
  const hastaStr = searchParams.get('hasta');

  if (!desdeStr || !hastaStr) {
    return NextResponse.json({ error: 'Parámetros desde y hasta requeridos' }, { status: 400 });
  }

  const desde = new Date(desdeStr + 'T00:00:00.000Z');
  const hasta = new Date(hastaStr + 'T23:59:59.999Z');

  // ── Estado de Resultados (DEVENGADO — por fecha del evento) ──────────────

  // Cotizaciones APROBADAS cuyo evento cae en el período
  const cotizacionesResult = await prisma.cotizacion.aggregate({
    _sum: { granTotal: true },
    _count: { _all: true },
    where: {
      estado: 'APROBADA',
      fechaEvento: { gte: desde, lte: hasta },
    },
  });

  const ingresosDevengados = cotizacionesResult._sum.granTotal ?? 0;
  const eventosEjecutados = cotizacionesResult._count._all ?? 0;

  // Proyectos cuyos eventos caen en el período (para costos directos)
  const proyectosEnPeriodo = await prisma.proyecto.findMany({
    where: { fechaEvento: { gte: desde, lte: hasta } },
    select: { id: true },
  });
  const proyectoIds = proyectosEnPeriodo.map((p) => p.id);

  // Costos directos: GASTO vinculado a proyectos del período
  const costosDirectosResult = await prisma.movimientoFinanciero.aggregate({
    _sum: { monto: true },
    where: {
      tipo: 'GASTO',
      proyectoId: { in: proyectoIds.length > 0 ? proyectoIds : ['__none__'] },
    },
  });
  const costosDirectos = costosDirectosResult._sum.monto ?? 0;

  // Costos fijos: GASTO sin proyecto, por fecha del movimiento en período
  const costosFijosResult = await prisma.movimientoFinanciero.aggregate({
    _sum: { monto: true },
    where: {
      tipo: 'GASTO',
      proyectoId: null,
      fecha: { gte: desde, lte: hasta },
    },
  });
  const costosFijos = costosFijosResult._sum.monto ?? 0;

  const costosTotales = costosDirectos + costosFijos;
  const utilidadBruta = ingresosDevengados - costosDirectos;
  const margenBruto = ingresosDevengados > 0 ? (utilidadBruta / ingresosDevengados) * 100 : 0;
  const utilidadNeta = ingresosDevengados - costosTotales;
  const margenNeto = ingresosDevengados > 0 ? (utilidadNeta / ingresosDevengados) * 100 : 0;

  // ── Flujo de Caja (por fecha del movimiento) ─────────────────────────────

  const cobrosResult = await prisma.movimientoFinanciero.aggregate({
    _sum: { monto: true },
    where: { tipo: 'INGRESO', fecha: { gte: desde, lte: hasta } },
  });
  const cobrosReales = cobrosResult._sum.monto ?? 0;

  const pagosResult = await prisma.movimientoFinanciero.aggregate({
    _sum: { monto: true },
    where: { tipo: 'GASTO', fecha: { gte: desde, lte: hasta } },
  });
  const pagosReales = pagosResult._sum.monto ?? 0;

  // CxC — estado actual, sin filtro de período
  const cxc = await prisma.cuentaCobrar.findMany({
    where: { estado: { in: ['PENDIENTE', 'PARCIAL'] } },
    select: { monto: true, montoCobrado: true, fechaCompromiso: true },
  });
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);
  const cxcTotal = cxc.reduce((s, c) => s + (c.monto - c.montoCobrado), 0);
  const cxcVencido = cxc
    .filter((c) => new Date(c.fechaCompromiso) < inicioHoy)
    .reduce((s, c) => s + (c.monto - c.montoCobrado), 0);

  // CxP — estado actual, sin filtro de período
  const cxp = await prisma.cuentaPagar.findMany({
    where: { estado: { in: ['PENDIENTE', 'PARCIAL'] } },
    select: { monto: true },
  });
  const cxpTotal = cxp.reduce((s, c) => s + c.monto, 0);

  // ── KPIs de ventas, marketing, producción ────────────────────────────────

  const ticketPromedio = eventosEjecutados > 0 ? ingresosDevengados / eventosEjecutados : null;

  const leadsTotal = await prisma.trato.count({
    where: { createdAt: { gte: desde, lte: hasta } },
  });
  const leadsOrigenMeta = await prisma.trato.count({
    where: { createdAt: { gte: desde, lte: hasta }, origenLead: 'META_ADS' },
  });
  const conversionLeadVenta = leadsTotal > 0 ? (eventosEjecutados / leadsTotal) * 100 : null;

  return NextResponse.json({
    periodo: { desde: desdeStr, hasta: hastaStr },
    estadoResultados: {
      ingresosDevengados,
      eventosEjecutados,
      costosDirectos,
      costosFijos,
      costosTotales,
      utilidadBruta,
      margenBruto: Math.round(margenBruto * 10) / 10,
      utilidadNeta,
      margenNeto: Math.round(margenNeto * 10) / 10,
      cumpleMetaIngresos: ingresosDevengados >= 500000,
      cumpleMetaMargen: margenNeto >= 30,
    },
    flujoCaja: {
      cobrosReales,
      pagosReales,
      flujoNeto: cobrosReales - pagosReales,
      cxcTotal,
      cxcVencido,
      cxpTotal,
    },
    kpis: {
      ventas: {
        ticketPromedio,
        totalVentas: eventosEjecutados,
        tasaConversion: null,
        serviciosVendidos: eventosEjecutados,
      },
      marketing: {
        leadsGenerados: leadsTotal,
        leadsOrigenMeta,
        conversionLeadVenta:
          conversionLeadVenta !== null ? Math.round(conversionLeadVenta * 10) / 10 : null,
        cpl: null,
        cac: null,
      },
      produccion: {
        totalEventos: eventosEjecutados,
        eventosSinIncidencias: null,
        desviacionCostoPromedio: null,
        proyectosCerradosATiempo: null,
      },
    },
  });
}
