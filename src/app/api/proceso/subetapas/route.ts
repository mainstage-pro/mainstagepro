import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureProcesoTablas } from "@/lib/migraciones-lazy";
import { esEtapa, esEtapaInterna } from "@/lib/proceso/valores";

// Crea una subetapa nueva dentro de una etapa.
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureProcesoTablas();
  const body = await req.json();
  const { etapa, etapaInterna, nombre } = body;

  if (!esEtapa(etapa) || !esEtapaInterna(etapaInterna) || !nombre) {
    return NextResponse.json({ error: "etapa, etapaInterna válidas y nombre requeridos" }, { status: 400 });
  }

  const ultimo = await prisma.procesoSubetapa.findFirst({
    where: { etapa },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });

  const subetapa = await prisma.procesoSubetapa.create({
    data: {
      etapa,
      etapaInterna,
      nombre,
      descripcion: body.descripcion ?? null,
      orden: (ultimo?.orden ?? 0) + 1,
      generacionAutomatica: body.generacionAutomatica ?? true,
    },
  });

  return NextResponse.json({ subetapa });
}
