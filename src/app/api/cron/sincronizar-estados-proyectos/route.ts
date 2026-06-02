import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calcularEstadoProyecto } from '@/lib/proyecto-status';

// Vercel Cron: runs daily at 6am UTC
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const proyectos = await prisma.proyecto.findMany({
    where: {
      estado: { notIn: ['COMPLETADO', 'CANCELADO'] },
    },
    select: {
      id: true,
      estado: true,
      fechaEvento: true,
      fechaMontaje: true,
      planProduccionAprobado: true,
    },
  });

  let actualizados = 0;
  for (const p of proyectos) {
    const { estadoCalculado } = calcularEstadoProyecto(p);
    if (estadoCalculado !== p.estado) {
      await prisma.proyecto.update({
        where: { id: p.id },
        data: { estado: estadoCalculado },
      });
      actualizados++;
    }
  }

  console.log(`[cron/sincronizar-estados] ${actualizados}/${proyectos.length} proyectos actualizados`);
  return NextResponse.json({ actualizados, total: proyectos.length });
}
