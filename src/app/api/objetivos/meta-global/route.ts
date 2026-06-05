import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 });

  const inicio2026 = new Date('2026-01-01T00:00:00.000Z');
  const fin2026    = new Date('2026-12-31T23:59:59.999Z');
  const inicio2025 = new Date('2025-01-01T00:00:00.000Z');
  const fin2025    = new Date('2025-12-31T23:59:59.999Z');

  const [ingresos2026Agg, gastos2026Agg, ingresos2025Agg] = await Promise.all([
    prisma.movimientoFinanciero.aggregate({
      _sum: { monto: true },
      where: { tipo: 'INGRESO', fecha: { gte: inicio2026, lte: fin2026 } },
    }),
    prisma.movimientoFinanciero.aggregate({
      _sum: { monto: true },
      where: { tipo: 'GASTO', fecha: { gte: inicio2026, lte: fin2026 } },
    }),
    prisma.movimientoFinanciero.aggregate({
      _sum: { monto: true },
      where: { tipo: 'INGRESO', fecha: { gte: inicio2025, lte: fin2025 } },
    }),
  ]);

  const ingresos2026 = Number(ingresos2026Agg._sum.monto ?? 0);
  const gastos2026   = Number(gastos2026Agg._sum.monto   ?? 0);
  const ingresos2025 = Number(ingresos2025Agg._sum.monto ?? 0);

  const utilidadNeta2026  = ingresos2026 - gastos2026;
  const rentabilidad2026  = ingresos2026 > 0 ? (utilidadNeta2026 / ingresos2026) * 100 : 0;
  const crecimientoYoY    = ingresos2025 > 0 ? ((ingresos2026 - ingresos2025) / ingresos2025) * 100 : null;

  return NextResponse.json({
    ingresos2026,
    utilidadNeta2026,
    rentabilidad2026,
    ingresos2025,
    crecimientoYoY,
  });
}
