import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { calcularEstadoProyecto } from '@/lib/proyecto-status';

export async function POST(_req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Process ALL non-terminal proyectos (skips COMPLETADO and CANCELADO via the function's early returns)
  const proyectos = await prisma.proyecto.findMany({
    where: {
      estado: { notIn: ['CANCELADO'] }, // include COMPLETADO so function can skip it gracefully
    },
    select: {
      id: true,
      estado: true,
      nombre: true,
      fechaEvento: true,
      fechaMontaje: true,
      planProduccionAprobado: true,
    },
  });

  const cambios: Array<{ id: string; nombre: string; de: string; a: string }> = [];
  for (const p of proyectos) {
    const { estadoCalculado } = calcularEstadoProyecto(p);
    if (estadoCalculado !== p.estado) {
      await prisma.proyecto.update({
        where: { id: p.id },
        data: { estado: estadoCalculado },
      });
      cambios.push({ id: p.id, nombre: p.nombre, de: p.estado, a: estadoCalculado });
    }
  }

  return NextResponse.json({
    message: `Migración completada: ${cambios.length} proyectos actualizados de ${proyectos.length} total`,
    cambios,
  });
}
