import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { METRICAS, normalizarCriterios, normalizarAcuerdos, calcularPuntajes, safeParseCriterios } from "@/lib/evaluaciones";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const evaluacion = await prisma.evaluacionEmpleado.findUnique({
    where: { id },
    include: { personal: { select: { id: true, nombre: true, puesto: true, departamento: true } } },
  });
  if (!evaluacion) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ evaluacion });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const allowed = [...METRICAS,"periodo","evaluador","aspectosPositivos","areasMejora","incidentesNota","observaciones","estado"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k] === "" ? null : body[k];

  const criteriosCambia = "criterios" in body;
  const criterios = criteriosCambia ? normalizarCriterios(body.criterios) : null;
  if (criteriosCambia) data.criterios = criterios!.length > 0 ? JSON.stringify(criterios) : null;

  if ("acuerdos" in body) {
    const acuerdos = normalizarAcuerdos(body.acuerdos);
    data.acuerdos = acuerdos.length > 0 ? JSON.stringify(acuerdos) : null;
  }

  if (METRICAS.some(m => m in body) || criteriosCambia) {
    const current = await prisma.evaluacionEmpleado.findUnique({ where: { id } });
    if (current) {
      const merged = { ...current, ...data };
      const metricas: Record<string, number> = {};
      for (const m of METRICAS) metricas[m] = Number(merged[m]) || 0;
      const crit = criteriosCambia ? criterios! : safeParseCriterios(current.criterios);
      const { general, puesto, total } = calcularPuntajes(metricas, crit);
      data.puntajeGeneral = general;
      data.puntajePuesto = puesto;
      data.puntajeTotal = total;
    }
  }
  const evaluacion = await prisma.evaluacionEmpleado.update({ where: { id }, data });
  return NextResponse.json({ evaluacion });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  await prisma.evaluacionEmpleado.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
