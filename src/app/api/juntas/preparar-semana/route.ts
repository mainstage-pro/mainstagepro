import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { JUNTA_TEMPLATES } from '@/lib/junta-templates';
import { PARTICIPANTES_POR_AREA, SEMANA_JUNTAS_CONFIG } from '@/lib/juntas-config';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  const { semana, anio, fechaLunes } = body as { semana: number; anio: number; fechaLunes: string };

  if (!semana || !anio || !fechaLunes) {
    return NextResponse.json({ error: 'semana, anio, fechaLunes requeridos' }, { status: 400 });
  }

  // Build date range for the week (Mon 00:00 to Sun 23:59)
  const lunes   = new Date(fechaLunes + 'T00:00:00');
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  domingo.setHours(23, 59, 59, 999);

  // Check if juntas already exist for this week
  const existing = await prisma.junta.findMany({
    where: { fecha: { gte: lunes, lte: domingo } },
    include: {
      facilitador:   { select: { id: true, name: true } },
      agendaItems:   { orderBy: { orden: 'asc' } },
      participantes: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  if (existing.length >= 5) {
    return NextResponse.json({ juntas: existing, created: false });
  }

  // Create the 5 juntas
  const creadas = [];

  for (const _config of SEMANA_JUNTAS_CONFIG) {
    const config = _config as { area: string; tipo: string; titulo: string; hora: string; duracionMin: number };
    // Skip if this area already has a junta this week
    if (existing.some((j) => j.area === config.area)) continue;

    const [hh, mm] = config.hora.split(':').map(Number);
    const fecha = new Date(lunes);
    fecha.setHours(hh, mm, 0, 0);

    // Get template key: GLOBAL uses 'GLOBAL_SEMANAL', areas use their area name
    const templateKey = config.area === 'GLOBAL' ? 'GLOBAL_SEMANAL' : config.area;
    const template = JUNTA_TEMPLATES[templateKey];
    const titulo = config.titulo ?? template?.nombre ?? `Junta ${config.area}`;

    const participantesIds = PARTICIPANTES_POR_AREA[config.area] ?? [];

    const junta = await prisma.junta.create({
      data: {
        titulo,
        area:          config.area,
        tipo:          config.tipo,
        fecha,
        duracionMin:   config.duracionMin,
        estado:        'PROGRAMADA',
        facilitadorId: session.id,
        agendaItems: {
          create: (template?.agendaItems ?? []).map((item) => ({
            orden:       item.orden,
            tipo:        item.tipo,
            titulo:      item.titulo,
            descripcion: item.descripcion ?? null,
            placeholder: item.placeholder ?? null,
            completado:  false,
          })),
        },
        participantes: participantesIds.length > 0
          ? { create: participantesIds.map((uid) => ({ userId: uid })) }
          : undefined,
      },
      include: {
        facilitador:   { select: { id: true, name: true } },
        agendaItems:   { orderBy: { orden: 'asc' } },
        participantes: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    creadas.push(junta);
  }

  return NextResponse.json({ juntas: [...existing, ...creadas], created: true }, { status: 201 });
}
