import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; lineaId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id: cotizacionId, lineaId } = await params;
  const body = await req.json();

  // Only accept the 'notas' field — nothing else
  if (!('notas' in body)) {
    return NextResponse.json({ error: 'Campo no permitido' }, { status: 400 });
  }

  // Verify the line belongs to this cotizacion
  const linea = await prisma.cotizacionLinea.findFirst({
    where: { id: lineaId, cotizacionId },
  });
  if (!linea) return NextResponse.json({ error: 'Línea no encontrada' }, { status: 404 });

  const updated = await prisma.cotizacionLinea.update({
    where: { id: lineaId },
    data: { notas: body.notas ?? null },
    select: { id: true, notas: true },
  });

  return NextResponse.json({ linea: updated });
}
