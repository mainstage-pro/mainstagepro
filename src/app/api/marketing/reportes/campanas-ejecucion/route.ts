import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const mes = new URL(request.url).searchParams.get("mes");
  if (!mes) return NextResponse.json({ error: "mes requerido" }, { status: 400 });

  const reporte = await prisma.reporteCampanasEjecucion.upsert({
    where: { mes },
    create: { mes },
    update: {},
  });

  return NextResponse.json({ reporte });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const mes = new URL(request.url).searchParams.get("mes");
  if (!mes) return NextResponse.json({ error: "mes requerido" }, { status: 400 });

  const body = await request.json();
  const allowed = ["comentariosEjecucion", "comentariosFinales", "estado"] as const;
  const data: Record<string, string> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const reporte = await prisma.reporteCampanasEjecucion.upsert({
    where: { mes },
    create: { mes, ...data },
    update: data,
  });

  return NextResponse.json({ reporte });
}
