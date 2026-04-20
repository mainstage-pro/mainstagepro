import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const meses = parseInt(searchParams.get("meses") ?? "12");

  // Calcular rango de meses
  const fechas: string[] = [];
  const now = new Date();
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    fechas.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const metricas = await prisma.metricaOrganica.findMany({
    where: { mes: { in: fechas } },
    orderBy: [{ mes: "asc" }, { plataforma: "asc" }],
  });

  return NextResponse.json({ metricas, mesesRango: fechas });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { mes, plataforma, seguidores, alcance, impresiones, interacciones, publicaciones, notas } = body;

  if (!mes || !plataforma) {
    return NextResponse.json({ error: "mes y plataforma son requeridos" }, { status: 400 });
  }

  const metrica = await prisma.metricaOrganica.upsert({
    where: { mes_plataforma: { mes, plataforma } },
    update: {
      seguidores:    seguidores    != null ? parseInt(seguidores)    : undefined,
      alcance:       alcance       != null ? parseInt(alcance)       : undefined,
      impresiones:   impresiones   != null ? parseInt(impresiones)   : undefined,
      interacciones: interacciones != null ? parseInt(interacciones) : undefined,
      publicaciones: publicaciones != null ? parseInt(publicaciones) : undefined,
      notas,
    },
    create: {
      mes, plataforma,
      seguidores:    seguidores    != null ? parseInt(seguidores)    : null,
      alcance:       alcance       != null ? parseInt(alcance)       : null,
      impresiones:   impresiones   != null ? parseInt(impresiones)   : null,
      interacciones: interacciones != null ? parseInt(interacciones) : null,
      publicaciones: publicaciones != null ? parseInt(publicaciones) : null,
      notas: notas ?? null,
    },
  });

  return NextResponse.json({ metrica });
}
