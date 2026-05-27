import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/plan-trabajo/templates — cuenta y lista de áreas/templates
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [totalTemplates, areas] = await Promise.all([
    prisma.pTTareaTemplate.count({ where: { activa: true } }),
    prisma.pTArea.findMany({
      orderBy: { orden: "asc" },
      include: {
        _count: { select: { templates: { where: { activa: true } } } },
        subareas: {
          orderBy: { orden: "asc" },
          select: {
            id: true,
            nombre: true,
            _count: { select: { templates: { where: { activa: true } } } },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({ totalTemplates, areas });
}
