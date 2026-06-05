import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const trimestre = searchParams.get('trimestre') ?? 'Q3';
  const anio = parseInt(searchParams.get('anio') ?? '2026');

  // Q3 = Jul 1 - Sep 30
  const rangoQ: Record<string, { desde: Date; hasta: Date }> = {
    Q1: { desde: new Date(`${anio}-01-01`), hasta: new Date(`${anio}-03-31T23:59:59Z`) },
    Q2: { desde: new Date(`${anio}-04-01`), hasta: new Date(`${anio}-06-30T23:59:59Z`) },
    Q3: { desde: new Date(`${anio}-07-01`), hasta: new Date(`${anio}-09-30T23:59:59Z`) },
    Q4: { desde: new Date(`${anio}-10-01`), hasta: new Date(`${anio}-12-31T23:59:59Z`) },
  };
  const rango = rangoQ[trimestre] ?? rangoQ.Q3;

  // Auto-calculated values
  const [leadsQ3, outboundQ3] = await Promise.all([
    prisma.trato.count({ where: { createdAt: { gte: rango.desde, lte: rango.hasta } } }),
    prisma.trato.count({ where: { tipoLead: 'OUTBOUND', createdAt: { gte: rango.desde, lte: rango.hasta } } }),
  ]);

  // Weeks elapsed in quarter so far
  const ahora = new Date();
  const finEfectivo = ahora < rango.hasta ? ahora : rango.hasta;
  const msElapsed = Math.max(0, finEfectivo.getTime() - rango.desde.getTime());
  const semanasElapsadas = Math.max(1, msElapsed / (7 * 24 * 60 * 60 * 1000));

  const objetivos = await prisma.objetivoTrimestral.findMany({
    where: { trimestre, anio },
    include: { keyResults: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });

  // Inject auto-calculated progress
  const result = objetivos.map(obj => ({
    ...obj,
    keyResults: obj.keyResults.map(kr => {
      if (kr.conexionAuto === 'leads_q3') {
        // Monthly average leads
        const mesesElapsados = Math.max(1, msElapsed / (30 * 24 * 60 * 60 * 1000));
        const promedioMensual = leadsQ3 / mesesElapsados;
        return { ...kr, progreso: Math.round(promedioMensual), progresoAuto: leadsQ3 };
      }
      if (kr.conexionAuto === 'outbound_q3') {
        const promedioSemanal = outboundQ3 / semanasElapsadas;
        return { ...kr, progreso: Math.round(promedioSemanal), progresoAuto: outboundQ3 };
      }
      return kr;
    }),
  }));

  return NextResponse.json({ objetivos: result, leadsQ3, outboundQ3 });
}
