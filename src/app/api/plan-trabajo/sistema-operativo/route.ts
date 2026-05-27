import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/plan-trabajo/sistema-operativo
// Returns: areas with objetivo, subareas with entregables, KPIs grouped by area + transversales
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const areas = await prisma.pTArea.findMany({
    orderBy: { orden: "asc" },
    include: {
      subareas: { orderBy: { orden: "asc" }, select: { id: true, nombre: true, entregables: true, orden: true } },
      kpis: { where: { activo: true }, orderBy: { orden: "asc" } },
    },
  });

  const kpisTransversales = await prisma.pTKPI.findMany({
    where: { esTransversal: true, activo: true },
    orderBy: { orden: "asc" },
  });

  return NextResponse.json({ areas, kpisTransversales });
}
