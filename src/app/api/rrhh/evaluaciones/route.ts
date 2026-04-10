import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const METRICAS = ["puntualidad","ordenLimpieza","actitud","comunicacion","resolucionProb","propuestasMejora","calidadTrabajo","trabajoEquipo"] as const;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const personalId = req.nextUrl.searchParams.get("personalId");
  const evaluaciones = await prisma.evaluacionEmpleado.findMany({
    where: personalId ? { personalId } : {},
    orderBy: { createdAt: "desc" },
    include: { personal: { select: { id: true, nombre: true, puesto: true } } },
  });
  return NextResponse.json({ evaluaciones });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json();
  const { personalId, periodo, evaluador } = body;
  if (!personalId || !periodo) return NextResponse.json({ error: "Datos requeridos" }, { status: 400 });
  const metricas: Record<string, number> = {};
  for (const m of METRICAS) metricas[m] = body[m] ?? 0;
  const completadas = METRICAS.filter(m => metricas[m] > 0).length;
  const puntajeTotal = completadas > 0 ? METRICAS.reduce((s, m) => s + metricas[m], 0) / METRICAS.length : null;
  const evaluacion = await prisma.evaluacionEmpleado.create({
    data: {
      personalId, periodo, evaluador: evaluador ?? session.name,
      ...metricas,
      aspectosPositivos: body.aspectosPositivos || null,
      areasMejora: body.areasMejora || null,
      incidentesNota: body.incidentesNota || null,
      observaciones: body.observaciones || null,
      puntajeTotal,
      estado: body.estado ?? "BORRADOR",
    },
    include: { personal: { select: { id: true, nombre: true, puesto: true } } },
  });
  return NextResponse.json({ evaluacion }, { status: 201 });
}
