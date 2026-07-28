import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { PreguntaEval } from "@/lib/capacitacion";

// POST /api/capacitacion/[id]/evaluacion/intento
// Body: { respuestas: number[] }  → califica, guarda intento y, si aprueba,
// marca la capacitación como completada.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { respuestas } = await req.json();
  if (!Array.isArray(respuestas)) return NextResponse.json({ error: "Respuestas inválidas" }, { status: 400 });

  const evaluacion = await prisma.evaluacionCapacitacion.findUnique({ where: { sesionId: id } });
  if (!evaluacion) return NextResponse.json({ error: "Sin evaluación" }, { status: 404 });

  const preguntas = evaluacion.preguntas as unknown as PreguntaEval[];
  const correccion = preguntas.map((p, i) => ({
    correcta: p.correcta,
    elegida: respuestas[i],
    acerto: respuestas[i] === p.correcta,
  }));
  const aciertos = correccion.filter((c) => c.acerto).length;
  const calificacion = preguntas.length ? Math.round((aciertos / preguntas.length) * 100) : 0;
  const aprobado = calificacion >= evaluacion.minAprobar;

  await prisma.intentoEvaluacion.create({
    data: {
      evaluacionId: evaluacion.id,
      usuarioId: session.id,
      respuestas,
      calificacion,
      aprobado,
    },
  });

  // Al aprobar, la capacitación queda completada para el usuario.
  if (aprobado) {
    await prisma.progresoCapacitacion.upsert({
      where: { usuarioId_sesionId: { usuarioId: session.id, sesionId: id } },
      create: {
        usuarioId: session.id,
        sesionId: id,
        estado: "completado",
        completadoEn: new Date(),
      },
      update: { estado: "completado", completadoEn: new Date() },
    });
  }

  return NextResponse.json({
    calificacion,
    aprobado,
    minAprobar: evaluacion.minAprobar,
    aciertos,
    total: preguntas.length,
    correccion, // incluye la correcta para retroalimentar tras enviar
  });
}
