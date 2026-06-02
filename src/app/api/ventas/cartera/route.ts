import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const categoria = searchParams.get('categoria'); // KEEP | ATTAIN | RECOVER | EXPAND | SIN_CATEGORIZAR | null (all)

  const clientes = await prisma.cliente.findMany({
    where: categoria ? { categoriaKARE: categoria } : undefined,
    select: {
      id: true,
      nombre: true,
      empresa: true,
      tipoCliente: true,
      clasificacion: true,
      categoriaKARE: true,
      telefono: true,
      tratos: {
        select: {
          id: true,
          etapa: true,
          fechaCierre: true,
          presupuestoEstimado: true,
          updatedAt: true,
          cotizaciones: {
            where: { estado: 'APROBADA' },
            select: { granTotal: true },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { nombre: 'asc' },
  });

  const ahora = Date.now();
  const clientesConMeta = clientes.map(c => {
    const ultimoTrato = c.tratos[0] ?? null;
    const diasSinContacto = ultimoTrato
      ? Math.floor((ahora - new Date(ultimoTrato.updatedAt).getTime()) / 86400000)
      : null;
    return {
      ...c,
      tratos: undefined,
      ultimoTrato: ultimoTrato
        ? {
            id: ultimoTrato.id,
            etapa: ultimoTrato.etapa,
            fechaCierre: ultimoTrato.fechaCierre,
            monto: ultimoTrato.cotizaciones[0]?.granTotal ?? ultimoTrato.presupuestoEstimado ?? null,
            updatedAt: ultimoTrato.updatedAt,
          }
        : null,
      diasSinContacto,
    };
  });

  // Conteos by category
  const conteos = await prisma.cliente.groupBy({
    by: ['categoriaKARE'],
    _count: true,
  });

  const conteoMap: Record<string, number> = {};
  for (const c of conteos) {
    conteoMap[c.categoriaKARE ?? 'SIN_CATEGORIZAR'] = c._count;
  }

  return NextResponse.json({ clientes: clientesConMeta, conteos: conteoMap });
}
