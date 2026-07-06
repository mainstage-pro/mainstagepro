import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/finanzas/hervam/inventario-totales
// Devuelve totales consolidados del inventario de producción para el panel resumen HERVAM
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Equipos de producción activos
  const equipos = await prisma.equipo.aggregate({
    where: { activo: true },
    _count: { id: true },
    _sum: { precioRenta: true, costoInternoEstimado: true },
  });

  // Accesorios de producción
  const accesorios = await prisma.equipoAccesorio.aggregate({
    _count: { id: true },
  });

  return NextResponse.json({
    equiposProduccion: {
      count: equipos._count.id,
      costoEstimado: equipos._sum.costoInternoEstimado ?? 0,
      precioRenta: equipos._sum.precioRenta ?? 0,
    },
    accesorios: {
      count: accesorios._count.id,
    },
  });
}
