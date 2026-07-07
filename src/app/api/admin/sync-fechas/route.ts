import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * POST /api/admin/sync-fechas
 * Recalcula fechaProximaAccion en TODOS los tratos activos basándose
 * únicamente en los seguimientos pendientes (completado=false).
 * Si no hay seguimientos pendientes → fechaProximaAccion = null.
 */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Solo admins o cualquier usuario autenticado (ajusta si necesitas restricción)
  const tratos = await prisma.trato.findMany({
    where: { etapa: { notIn: ["VENTA_CERRADA", "VENTA_PERDIDA"] } },
    select: { id: true },
  });

  let actualizados = 0;
  let limpiados = 0;

  for (const t of tratos) {
    const next = await prisma.seguimiento.findFirst({
      where: { tratoId: t.id, completado: false },
      orderBy: { fechaProgramada: "asc" },
      select: { fechaProgramada: true },
    });

    const nuevaFecha = next?.fechaProgramada ?? null;

    // Solo actualizar si hay cambio real
    const actual = await prisma.trato.findUnique({
      where: { id: t.id },
      select: { fechaProximaAccion: true },
    });

    const actualStr = actual?.fechaProximaAccion?.toISOString() ?? null;
    const nuevaStr = nuevaFecha?.toISOString() ?? null;

    if (actualStr !== nuevaStr) {
      await prisma.trato.update({
        where: { id: t.id },
        data: { fechaProximaAccion: nuevaFecha },
      });
      if (nuevaFecha === null) limpiados++;
      else actualizados++;
    }
  }

  return NextResponse.json({
    ok: true,
    totalProcesados: tratos.length,
    actualizados,
    limpiados,
    mensaje: `${limpiados} tratos limpiados (sin seguimientos pendientes), ${actualizados} actualizados.`,
  });
}
