import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { puedeVerFormularios } from "@/lib/formularios";
import { evaluarRespuesta, construirEntrada, type FilaRespuestaCruda, type FilaSeccionCruda } from "@/lib/valoracion-formulario";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string; respuestaId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeVerFormularios(session))
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { id, respuestaId } = await context.params;
  const respuesta = await prisma.formularioRespuesta.findFirst({
    where: { id: respuestaId, formularioId: id },
    include: {
      respuestasPreguntas: {
        include: {
          pregunta: { select: { id: true, codigo: true, texto: true, tipo: true, seccionId: true } },
        },
      },
    },
  });
  if (!respuesta) return NextResponse.json({ error: "No existe" }, { status: 404 });
  return NextResponse.json({ respuesta });
}

// Captura de calificaciones manuales por pregunta. No recalcula puntaje total
// en Fase 1 (eso es Fase 2); solo guarda el valor y quién la capturó.
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; respuestaId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeVerFormularios(session))
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { id, respuestaId } = await context.params;
  const respuesta = await prisma.formularioRespuesta.findFirst({
    where: { id: respuestaId, formularioId: id },
  });
  if (!respuesta) return NextResponse.json({ error: "No existe" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const calificaciones = Array.isArray(body.calificaciones) ? body.calificaciones : [];

  for (const c of calificaciones) {
    if (!c?.preguntaId) continue;
    const val = typeof c.calificacionManual === "number" ? c.calificacionManual : null;
    await prisma.respuestaPregunta.updateMany({
      where: { respuestaId, preguntaId: c.preguntaId },
      data: {
        calificacionManual: val,
        calificadoPorId: val != null ? session.id : null,
        calificadoAt: val != null ? new Date() : null,
      },
    });
  }

  // Recalcular motor con las M actualizadas.
  const form = await prisma.formulario.findUnique({
    where: { id },
    include: {
      secciones: {
        where: { archivada: false },
        select: { id: true, bloque: true, mostrarSi: true },
      },
    },
  });
  if (form) {
    const rps = await prisma.respuestaPregunta.findMany({
      where: { respuestaId },
      include: { pregunta: { select: { id: true, seccionId: true, mostrarSi: true } } },
    });
    const filasR: FilaRespuestaCruda[] = rps.map((rp) => ({
      id: rp.id,
      preguntaId: rp.preguntaId,
      valor: rp.valor,
      snapshotPregunta: rp.snapshotPregunta,
      calificacionManual: rp.calificacionManual,
      pregunta: rp.pregunta,
    }));
    const filasS: FilaSeccionCruda[] = form.secciones.map((s) => ({ id: s.id, bloque: s.bloque, mostrarSi: s.mostrarSi }));
    const resultado = evaluarRespuesta(construirEntrada(filasR, filasS, form.umbralAvanza, form.umbralBanco));

    await Promise.all(
      rps.map((rp) => {
        const puntos = resultado.puntosPorPregunta[rp.preguntaId]?.obtenidos ?? 0;
        return prisma.respuestaPregunta.update({ where: { id: rp.id }, data: { puntosAuto: puntos } });
      }),
    );
    await prisma.formularioRespuesta.update({
      where: { id: respuestaId },
      data: {
        excluido: resultado.excluido,
        motivoExclusion: resultado.motivoExclusion
          ? `${resultado.motivoExclusion.codigo ?? ""} ${resultado.motivoExclusion.texto} → ${resultado.motivoExclusion.respuesta}`.trim()
          : null,
        puntosObtenidos: resultado.puntosObtenidos,
        puntosPosibles: resultado.puntosPosibles,
        porcentajePreliminar: resultado.porcentajePreliminar,
        porcentajeFinal: resultado.porcentajeFinal,
        banda: resultado.banda,
        desglose: JSON.stringify(resultado.desglose),
        nivelSugerido: resultado.nivelSugerido,
      },
    });

    // Reflejar en la postulación ligada: puntaje total y, si excluyó, mover a RECHAZADO.
    await prisma.$executeRawUnsafe(
      `UPDATE postulaciones
          SET puntaje_total = $1,
              etapa = CASE WHEN $2::boolean = true THEN 'RECHAZADO' ELSE etapa END,
              notas_evaluacion = CASE WHEN $2::boolean = true THEN $3 ELSE notas_evaluacion END,
              updated_at = now()
        WHERE formulario_respuesta_id = $4`,
      resultado.porcentajeFinal ?? resultado.porcentajePreliminar ?? null,
      resultado.excluido,
      resultado.motivoExclusion
        ? `Excluido automático: ${resultado.motivoExclusion.texto} → ${resultado.motivoExclusion.respuesta}`
        : null,
      respuestaId,
    );
  }

  return NextResponse.json({ ok: true });
}
