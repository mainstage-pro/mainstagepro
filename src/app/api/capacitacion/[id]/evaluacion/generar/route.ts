import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { puedeEditarCapacitacion, generarPreguntas, htmlAtexto } from "@/lib/capacitacion";

export const maxDuration = 60;

// POST /api/capacitacion/[id]/evaluacion/generar
// Genera con IA la evaluación de opción múltiple del contenido de la capacitación.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEditarCapacitacion(session)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const n = Math.min(12, Math.max(3, Number(body?.numPreguntas) || 6));

  const sesion = await prisma.sesionCapacitacion.findUnique({
    where: { id },
    include: { versiones: { orderBy: { version: "desc" }, take: 1, select: { htmlContent: true } } },
  });
  if (!sesion) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

  // Fuente de contenido: presentación generada > puntos/objetivos/descripción.
  const html = sesion.versiones[0]?.htmlContent;
  const puntos = sesion.puntosEditados.length ? sesion.puntosEditados : sesion.puntosBase;
  const contenido = html
    ? htmlAtexto(html)
    : [sesion.descripcion, ...sesion.objetivos, ...puntos, sesion.notas ?? ""].filter(Boolean).join(". ");

  if (contenido.trim().length < 40) {
    return NextResponse.json({ error: "No hay suficiente contenido para generar la evaluación" }, { status: 400 });
  }

  let preguntas;
  try {
    preguntas = await generarPreguntas(contenido, sesion.titulo, n);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: `Error al generar con IA: ${msg}` }, { status: 502 });
  }
  if (!preguntas.length) return NextResponse.json({ error: "La IA no devolvió preguntas válidas" }, { status: 502 });

  const preguntasJson = preguntas as unknown as Prisma.InputJsonValue;
  const evaluacion = await prisma.evaluacionCapacitacion.upsert({
    where: { sesionId: id },
    create: { sesionId: id, preguntas: preguntasJson, minAprobar: body?.minAprobar ?? 80 },
    update: { preguntas: preguntasJson, generadaEn: new Date(), ...(body?.minAprobar ? { minAprobar: body.minAprobar } : {}) },
  });

  return NextResponse.json({ ok: true, numPreguntas: preguntas.length, minAprobar: evaluacion.minAprobar });
}
