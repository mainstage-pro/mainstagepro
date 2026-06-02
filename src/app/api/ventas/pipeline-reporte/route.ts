import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get('desde');
  const hasta = searchParams.get('hasta');

  if (!desde || !hasta) {
    return NextResponse.json({ error: 'desde y hasta son requeridos' }, { status: 400 });
  }

  const desdeDate = new Date(desde + 'T00:00:00');
  const hastaDate = new Date(hasta + 'T23:59:59');

  // Tratos creados en el período (for funnel)
  const tratosEnPeriodo = await prisma.trato.findMany({
    where: { createdAt: { gte: desdeDate, lte: hastaDate } },
    select: {
      id: true,
      etapa: true,
      origenLead: true,
      nombreEvento: true,
      fechaCierre: true,
      updatedAt: true,
      cliente: { select: { nombre: true } },
      cotizaciones: {
        where: { estado: 'APROBADA' },
        select: { granTotal: true },
        take: 1,
      },
    },
  });

  // Also get tratos closed or lost IN this period (fechaCierre in range)
  const tratosCerradosEnPeriodo = await prisma.trato.findMany({
    where: {
      etapa: { in: ['VENTA_CERRADA', 'VENTA_PERDIDA'] },
      fechaCierre: { gte: desdeDate, lte: hastaDate },
    },
    select: {
      id: true,
      etapa: true,
      origenLead: true,
      nombreEvento: true,
      fechaCierre: true,
      cliente: { select: { nombre: true } },
      cotizaciones: {
        where: { estado: 'APROBADA' },
        select: { granTotal: true },
        take: 1,
      },
    },
  });

  // Funnel: count by etapa from tratos created in period
  const funnelMap: Record<string, number> = { LEAD: 0, DESCUBRIMIENTO: 0, OPORTUNIDAD: 0, VENTA_CERRADA: 0 };
  for (const t of tratosEnPeriodo) {
    if (t.etapa in funnelMap) funnelMap[t.etapa]++;
    // VENTA_PERDIDA: don't count in funnel
  }
  // Also add closed ones from the period that weren't in tratosEnPeriodo
  for (const t of tratosCerradosEnPeriodo) {
    if (!tratosEnPeriodo.find(x => x.id === t.id)) {
      if (t.etapa === 'VENTA_CERRADA') funnelMap.VENTA_CERRADA++;
    }
  }

  const funnel = [
    { etapa: 'Lead', count: funnelMap.LEAD },
    { etapa: 'Descubrimiento', count: funnelMap.DESCUBRIMIENTO },
    { etapa: 'Oportunidad', count: funnelMap.OPORTUNIDAD },
    { etapa: 'Venta Cerrada', count: funnelMap.VENTA_CERRADA },
  ];

  // Sales summary from closed-in-period tratos
  const ventasCerradas = tratosCerradosEnPeriodo.filter(t => t.etapa === 'VENTA_CERRADA');
  const tratosPerdidos = tratosCerradosEnPeriodo.filter(t => t.etapa === 'VENTA_PERDIDA');

  const ingresos = ventasCerradas.reduce((sum, t) => sum + (t.cotizaciones[0]?.granTotal ?? 0), 0);
  const ticketPromedio = ventasCerradas.length > 0 ? ingresos / ventasCerradas.length : 0;
  const tasaConversion = tratosEnPeriodo.length > 0 ? (ventasCerradas.length / tratosEnPeriodo.length) * 100 : 0;

  return NextResponse.json({
    resumen: {
      leadsCaptados: tratosEnPeriodo.length,
      ventasCerradas: ventasCerradas.length,
      tratosPerdidos: tratosPerdidos.length,
      ingresosCerrados: ingresos,
      ticketPromedio,
      tasaConversion,
    },
    funnel,
    ventasCerradasDetalle: ventasCerradas.map(t => ({
      clienteNombre: t.cliente.nombre,
      nombreEvento: t.nombreEvento,
      monto: t.cotizaciones[0]?.granTotal ?? null,
      origenLead: t.origenLead,
      fechaCierre: t.fechaCierre?.toISOString() ?? '',
    })),
    perdidasDetalle: tratosPerdidos.map(t => ({
      clienteNombre: t.cliente.nombre,
      etapa: 'VENTA_PERDIDA',
      fecha: t.fechaCierre?.toISOString() ?? '',
    })),
  });
}
