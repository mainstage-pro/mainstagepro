import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const allowed = ['progreso', 'completado'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const kr = await prisma.keyResult.update({ where: { id }, data });
  return NextResponse.json({ keyResult: kr });
}
