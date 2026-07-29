import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularPromedio, faltantesRequeridas, valorAnimo, type Respuestas } from "@/lib/satisfaccion-form";

// GET /api/rrhh/encuestas-satisfaccion/[token] — público, sin auth
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const encuesta = await prisma.encuestaSatisfaccionEquipo.findUnique({
    where: { token },
    select: {
      id: true, respondida: true, periodo: true,
      personal: { select: { nombre: true, puesto: true } },
    },
  });

  if (!encuesta) return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });

  return NextResponse.json({ encuesta });
}

// POST /api/rrhh/encuestas-satisfaccion/[token] — público, sin auth
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const encuesta = await prisma.encuestaSatisfaccionEquipo.findUnique({ where: { token } });
  if (!encuesta) return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });
  if (encuesta.respondida) return NextResponse.json({ error: "Ya fue respondida" }, { status: 409 });

  const body = await req.json();
  const respuestas: Respuestas = body.respuestas ?? {};

  const faltan = faltantesRequeridas(respuestas);
  if (faltan.length > 0) {
    return NextResponse.json({ error: "Faltan preguntas obligatorias por responder" }, { status: 400 });
  }

  const promedio = calcularPromedio(respuestas);
  const animo = valorAnimo(respuestas);

  const updated = await prisma.encuestaSatisfaccionEquipo.update({
    where: { token },
    data: {
      respuestas: respuestas as object,
      respondida: true,
      respondidaEn: new Date(),
      promedioCalculado: promedio,
      probabilidadRecomendar: animo != null ? Math.round(animo) : null,
    },
  });

  return NextResponse.json({ encuesta: updated });
}
