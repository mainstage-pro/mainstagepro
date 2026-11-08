import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { puedeVerFormularios } from "@/lib/formularios";

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

  return NextResponse.json({ ok: true });
}
