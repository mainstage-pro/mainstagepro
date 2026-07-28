import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { puedeEditarCapacitacion, type PreguntaEval } from "@/lib/capacitacion";

// GET /api/capacitacion/[id]/evaluacion
// Devuelve las preguntas SIN la respuesta correcta (para presentar el examen)
// + los intentos previos del usuario.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const sesion = await prisma.sesionCapacitacion.findUnique({
    where: { id },
    select: {
      titulo: true,
      categoria: { select: { slug: true, nombre: true, color: true } },
      versiones: { take: 1, select: { id: true } },
    },
  });
  if (!sesion) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

  const evaluacion = await prisma.evaluacionCapacitacion.findUnique({ where: { sesionId: id } });
  const puedeEditar = puedeEditarCapacitacion(session);
  const base = {
    titulo: sesion.titulo,
    categoria: sesion.categoria,
    tieneContenido: sesion.versiones.length > 0,
    puedeEditar,
  };

  if (!evaluacion) return NextResponse.json({ ...base, existe: false });

  const preguntas = (evaluacion.preguntas as unknown as PreguntaEval[]).map((p) => ({
    pregunta: p.pregunta,
    opciones: p.opciones,
  }));

  const intentos = await prisma.intentoEvaluacion.findMany({
    where: { evaluacionId: evaluacion.id, usuarioId: session.id },
    orderBy: { creadoEn: "desc" },
    select: { id: true, calificacion: true, aprobado: true, creadoEn: true },
  });

  return NextResponse.json({ ...base, existe: true, minAprobar: evaluacion.minAprobar, preguntas, intentos });
}
