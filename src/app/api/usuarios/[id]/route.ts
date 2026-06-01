import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { area, name, role } = body;

  const data: Record<string, unknown> = {};
  if (area !== undefined) data.area = area;
  if (name !== undefined) data.name = name;
  if (role !== undefined && session.role === 'ADMIN') data.role = role;

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, role: true, area: true, email: true },
  });

  return NextResponse.json({ user });
}
