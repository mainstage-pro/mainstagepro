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

  // Antes: un for-loop con hasta 3 queries por trato activo (findFirst + findUnique +
  // update secuenciales) — con ~70 tratos activos eso eran ~200 round-trips a la BD en
  // cada carga de la página de Ventas, bloqueando la vista. Ahora son 2 UPDATE por lote.
  const actualizados = await prisma.$executeRawUnsafe(`
    UPDATE tratos t
    SET "fechaProximaAccion" = sub."fechaProgramada"
    FROM (
      SELECT DISTINCT ON ("tratoId") "tratoId", "fechaProgramada"
      FROM seguimientos
      WHERE completado = false
      ORDER BY "tratoId", "fechaProgramada" ASC
    ) sub
    WHERE t.id = sub."tratoId"
      AND t.etapa NOT IN ('VENTA_CERRADA', 'VENTA_PERDIDA')
      AND t."fechaProximaAccion" IS DISTINCT FROM sub."fechaProgramada"
  `);

  const limpiados = await prisma.$executeRawUnsafe(`
    UPDATE tratos t
    SET "fechaProximaAccion" = NULL
    WHERE t.etapa NOT IN ('VENTA_CERRADA', 'VENTA_PERDIDA')
      AND t."fechaProximaAccion" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM seguimientos s WHERE s."tratoId" = t.id AND s.completado = false
      )
  `);

  return NextResponse.json({
    ok: true,
    actualizados,
    limpiados,
    mensaje: `${limpiados} tratos limpiados (sin seguimientos pendientes), ${actualizados} actualizados.`,
  });
}
