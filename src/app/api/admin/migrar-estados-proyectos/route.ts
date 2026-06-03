import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const [confirmados, pendientes] = await Promise.all([
    prisma.proyecto.updateMany({
      where: { estado: 'CONFIRMADO' },
      data: { estado: 'PLANEACION' },
    }),
    prisma.proyecto.updateMany({
      where: { estado: 'PENDIENTE_CIERRE' },
      data: { estado: 'EN_CURSO' },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    confirmadosMigrados: confirmados.count,
    pendienteCierreMigrados: pendientes.count,
  });
}
