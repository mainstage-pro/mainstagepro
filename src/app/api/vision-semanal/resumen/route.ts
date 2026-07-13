import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  VISION_AREAS,
  VISION_CONFIG,
  ensureVisionSemanalTable,
  semanaKey,
} from "@/lib/vision-semanal";

// Resumen por área para la portada de Visión semanal.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const semana = searchParams.get("semana") || semanaKey();

  await ensureVisionSemanalTable();

  const docs = await prisma.visionSemanal.findMany({
    where: { semana },
    include: {
      autor: { select: { id: true, name: true } },
      responsable: { select: { id: true, name: true } },
    },
  });
  const porArea = new Map(docs.map((d) => [d.area, d]));

  const areas = VISION_AREAS.map((area) => {
    const doc = porArea.get(area);
    return {
      area,
      label: VISION_CONFIG[area].label,
      tipo: VISION_CONFIG[area].tipo,
      nuevo: !doc,
      responsable: doc?.responsable ?? null,
      autor: doc?.autor ?? null,
      actualizadoEn: doc?.updatedAt?.toISOString() ?? null,
    };
  });

  return NextResponse.json({ semana, areas });
}
