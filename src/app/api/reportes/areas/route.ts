import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// Helper: get Monday date string for a given ISO week + year
function getLunesDeISO(semana: number, anio: number): string {
  // Jan 4 is always in week 1
  const jan4 = new Date(anio, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // 1=Mon..7=Sun
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - dayOfWeek + 1 + (semana - 1) * 7);
  return weekStart.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const semanaParam = searchParams.get('semana');
  const anioParam   = searchParams.get('anio');
  const area        = searchParams.get('area');

  const where: Record<string, unknown> = {};

  if (semanaParam && anioParam) {
    const lunes = getLunesDeISO(parseInt(semanaParam), parseInt(anioParam));
    where.semana = lunes;
  }

  if (area) where.area = area;

  const reportes = await prisma.reporteAreaSemanal.findMany({
    where,
    include: { autor: { select: { id: true, name: true, area: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ reportes });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  const { area, semana: semanaNum, anio, resultados, kpis, compromisos, bloqueo } = body;

  if (!area || !semanaNum || !anio) {
    return NextResponse.json({ error: 'area, semana, anio requeridos' }, { status: 400 });
  }

  const lunes = getLunesDeISO(parseInt(semanaNum), parseInt(anio));

  const reporte = await prisma.reporteAreaSemanal.upsert({
    where: { area_semana: { area, semana: lunes } },
    create: {
      area,
      semana:      lunes,
      autorId:     session.id,
      resultados:  resultados  ?? '',
      kpis:        kpis        ?? '[]',
      compromisos: compromisos ?? '',
      bloqueo:     bloqueo     ?? null,
    },
    update: {
      resultados:  resultados  ?? '',
      kpis:        kpis        ?? '[]',
      compromisos: compromisos ?? '',
      bloqueo:     bloqueo     ?? null,
    },
    include: { autor: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ reporte });
}
