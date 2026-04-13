import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const candidato = await prisma.candidato.findUnique({
    where: { id },
    include: {
      postulaciones: {
        include: { puesto: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!candidato) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ candidato });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  // Allow patching candidato fields AND/OR active postulacion fields
  const { postulacionId, etapa, salarioPropuesto, fechaIngresoEstimada,
    beneficios, observaciones, notasEvaluacion, puntajeTotal, puestoId, puestoManual, areaManual,
    ...candidatoFields } = body;

  // Update candidato fields if any
  const hasCandidatoFields = Object.keys(candidatoFields).length > 0;
  if (hasCandidatoFields) {
    candidatoFields.updatedAt = new Date();
    await prisma.candidato.update({ where: { id }, data: candidatoFields });
  }

  // Update postulacion if fields provided
  if (postulacionId) {
    const postData: Record<string, unknown> = { updatedAt: new Date() };
    if (etapa !== undefined)              postData.etapa = etapa;
    if (salarioPropuesto !== undefined)   postData.salarioPropuesto = salarioPropuesto;
    if (fechaIngresoEstimada !== undefined) postData.fechaIngresoEstimada = fechaIngresoEstimada ? new Date(fechaIngresoEstimada) : null;
    if (beneficios !== undefined)         postData.beneficios = Array.isArray(beneficios) ? JSON.stringify(beneficios) : beneficios;
    if (observaciones !== undefined)      postData.observaciones = observaciones;
    if (notasEvaluacion !== undefined)    postData.notasEvaluacion = notasEvaluacion;
    if (puntajeTotal !== undefined)       postData.puntajeTotal = puntajeTotal;
    if (puestoId !== undefined)           postData.puestoId = puestoId || null;
    if (puestoManual !== undefined)       postData.puestoManual = puestoManual;
    if (areaManual !== undefined)         postData.areaManual = areaManual;
    await prisma.postulacion.update({ where: { id: postulacionId }, data: postData });
  }

  const candidato = await prisma.candidato.findUnique({
    where: { id },
    include: { postulaciones: { include: { puesto: true }, orderBy: { createdAt: "desc" } } },
  });
  return NextResponse.json({ candidato });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  await prisma.candidato.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
