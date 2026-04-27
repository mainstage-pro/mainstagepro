import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * POST /api/proyectos/[id]/sincronizar-cxc
 * Fuerza la sincronización de las CuentaCobrar pendientes con el granTotal
 * actual de la cotización vinculada al proyecto.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: proyectoId } = await params;

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: {
      id: true,
      cotizacionId: true,
      cotizacion: { select: { id: true, numeroCotizacion: true, granTotal: true } },
    },
  });

  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!proyecto.cotizacion) return NextResponse.json({ error: "Sin cotización vinculada" }, { status: 400 });

  const { granTotal, numeroCotizacion, id: cotizacionId } = proyecto.cotizacion;

  const cxcAll = await prisma.cuentaCobrar.findMany({
    where: { OR: [{ proyectoId }, { cotizacionId }] },
    orderBy: { createdAt: "asc" },
  });

  const liquidadas  = cxcAll.filter(c => c.estado === "LIQUIDADO");
  const pendientes  = cxcAll.filter(c => c.estado !== "LIQUIDADO");

  if (pendientes.length === 0) {
    return NextResponse.json({ ok: true, actualizadas: 0, mensaje: "No hay cuentas pendientes que actualizar" });
  }

  const sumLiquidadas    = liquidadas.reduce((s, c) => s + c.monto, 0);
  const remainingNew     = granTotal - sumLiquidadas;
  const oldPendientesSum = pendientes.reduce((s, c) => s + c.monto, 0);

  if (Math.abs(oldPendientesSum - remainingNew) <= 0.01) {
    return NextResponse.json({ ok: true, actualizadas: 0, mensaje: "Las cuentas ya están sincronizadas" });
  }

  const ahora = new Date().toISOString();
  await Promise.all(pendientes.map(cxc => {
    let nuevoMonto: number;
    if (oldPendientesSum > 0) {
      nuevoMonto = (cxc.monto / oldPendientesSum) * remainingNew;
    } else {
      nuevoMonto = remainingNew / pendientes.length;
    }
    nuevoMonto = Math.max(nuevoMonto, cxc.montoCobrado);
    nuevoMonto = Math.round(nuevoMonto * 100) / 100;

    const log = cxc.ajustesLog ? (JSON.parse(cxc.ajustesLog) as unknown[]) : [];
    log.push({
      fecha:   ahora,
      de:      cxc.monto,
      a:       nuevoMonto,
      motivo:  `Sincronización manual desde ${numeroCotizacion} (total: ${granTotal})`,
      usuario: session.name,
    });

    return prisma.cuentaCobrar.update({
      where: { id: cxc.id },
      data:  { monto: nuevoMonto, ajustesLog: JSON.stringify(log) },
    });
  }));

  return NextResponse.json({ ok: true, actualizadas: pendientes.length });
}
