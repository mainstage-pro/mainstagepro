import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const candidato = await prisma.candidato.findUnique({
    where: { id },
    include: {
      postulaciones: {
        include: {
          puesto: true,
          formularioRespuesta: {
            include: {
              formulario: { select: { id: true, titulo: true, slug: true, umbralAvanza: true, umbralBanco: true } },
              respuestasPreguntas: {
                include: {
                  pregunta: { select: { id: true, codigo: true, texto: true, tipo: true, seccionId: true } },
                },
              },
            },
          },
        },
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
    onboardingData, pruebaPractica, tecnicoId, disciplina, nivel,
    ...candidatoFields } = body;

  // Update candidato fields if any
  const hasCandidatoFields = Object.keys(candidatoFields).length > 0;
  if (hasCandidatoFields) {
    candidatoFields.updatedAt = new Date();
    await prisma.candidato.update({ where: { id }, data: candidatoFields });
  }

  // Update postulacion if fields provided
  if (postulacionId) {
    const prev = etapa !== undefined
      ? await prisma.postulacion.findUnique({ where: { id: postulacionId }, select: { etapa: true } })
      : null;
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
    if (onboardingData !== undefined)     postData.onboardingData = onboardingData;
    if (pruebaPractica !== undefined)     postData.pruebaPractica = typeof pruebaPractica === "string" ? pruebaPractica : JSON.stringify(pruebaPractica);
    if (tecnicoId !== undefined)          postData.tecnicoId = tecnicoId || null;
    if (disciplina !== undefined)         postData.disciplina = disciplina || null;
    if (nivel !== undefined)              postData.nivel = nivel || null;
    await prisma.postulacion.update({ where: { id: postulacionId }, data: postData });

    // Historial: cambios de etapa quedan en ActividadUsuario (patrón del repo).
    if (etapa !== undefined && prev && prev.etapa !== etapa) {
      await logActividad(session.id, "CANDIDATO_ETAPA", "Postulacion", postulacionId,
        `Etapa: ${prev.etapa} → ${etapa}`,
        { candidatoId: id, etapaAnterior: prev.etapa, etapaNueva: etapa });
    }
  }

  const candidato = await prisma.candidato.findUnique({
    where: { id },
    include: {
      postulaciones: {
        include: {
          puesto: true,
          formularioRespuesta: {
            include: {
              formulario: { select: { id: true, titulo: true, slug: true, umbralAvanza: true, umbralBanco: true } },
              respuestasPreguntas: {
                include: {
                  pregunta: { select: { id: true, codigo: true, texto: true, tipo: true, seccionId: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
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
