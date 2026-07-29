import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { METRICAS, normalizarCriterios, normalizarAcuerdos, normalizarObjetivos, normalizarCompetenciaNotas, calcularPuntajes, CALIFICACIONES_FINALES } from "@/lib/evaluaciones";
import { createExpiringToken } from "@/lib/tokens";

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
  const criterios = normalizarCriterios(body.criterios);
  const acuerdos = normalizarAcuerdos(body.acuerdos);
  const objetivos = normalizarObjetivos(body.objetivos);
  const competenciaNotas = normalizarCompetenciaNotas(body.competenciaNotas);
  const calificacionFinal = (CALIFICACIONES_FINALES as readonly string[]).includes(body.calificacionFinal) ? body.calificacionFinal : null;
  const { general, puesto, total } = calcularPuntajes(metricas, criterios);
  const evaluacion = await prisma.evaluacionEmpleado.create({
    data: {
      personalId, periodo, evaluador: evaluador ?? session.name,
      ...metricas,
      aspectosPositivos: body.aspectosPositivos || null,
      areasMejora: body.areasMejora || null,
      incidentesNota: body.incidentesNota || null,
      observaciones: body.observaciones || null,
      criterios: criterios.length > 0 ? JSON.stringify(criterios) : null,
      acuerdos: acuerdos.length > 0 ? JSON.stringify(acuerdos) : null,
      objetivos: objetivos.length > 0 ? JSON.stringify(objetivos) : null,
      competenciaNotas: Object.keys(competenciaNotas).length > 0 ? JSON.stringify(competenciaNotas) : null,
      calificacionFinal,
      autoToken: createExpiringToken(120),
      puntajeGeneral: general,
      puntajePuesto: puesto,
      puntajeTotal: total,
      estado: body.estado ?? "BORRADOR",
    },
    include: { personal: { select: { id: true, nombre: true, puesto: true } } },
  });
  return NextResponse.json({ evaluacion }, { status: 201 });
}
