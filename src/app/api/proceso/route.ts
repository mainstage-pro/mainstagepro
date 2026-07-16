import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureProcesoTablas } from "@/lib/migraciones-lazy";

// Lee el estándar completo del proceso + conteo de tratos por subetapa.
export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureProcesoTablas();

  const [subetapas, reglas, conteos] = await Promise.all([
    prisma.procesoSubetapa.findMany({
      orderBy: [{ etapa: "asc" }, { orden: "asc" }],
      include: { pasos: { orderBy: { orden: "asc" } } },
    }),
    prisma.procesoRegla.findMany({ orderBy: { orden: "asc" } }),
    prisma.trato.groupBy({
      by: ["etapaInterna"],
      where: { etapaInterna: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const conteoPorSubetapa: Record<string, number> = {};
  for (const c of conteos) {
    if (c.etapaInterna) conteoPorSubetapa[c.etapaInterna] = c._count._all;
  }

  return NextResponse.json({ subetapas, reglas, conteoPorSubetapa });
}
