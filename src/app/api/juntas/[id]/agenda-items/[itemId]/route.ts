import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id: juntaId, itemId } = await params;
  void juntaId;
  const body = await req.json();
  const { respuesta, completado } = body;

  const data: Record<string, unknown> = {};
  if (respuesta  !== undefined) data.respuesta  = respuesta;
  if (completado !== undefined) data.completado = completado;

  const item = await prisma.agendaItem.update({
    where: { id: itemId },
    data,
  });

  return NextResponse.json({ item });
}
