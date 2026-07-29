import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularPromedio, faltantesRequeridas, valorAnimo, type Respuestas } from "@/lib/satisfaccion-form";

function periodoActual() {
  const d = new Date();
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q}-${d.getFullYear()}`;
}

// GET /api/rrhh/satisfaccion-publica — público: lista de personal para autoselección
export async function GET() {
  const personal = await prisma.personalInterno.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, puesto: true, departamento: true },
    orderBy: { nombre: "asc" },
  });
  return NextResponse.json({ personal, periodo: periodoActual() });
}

// POST /api/rrhh/satisfaccion-publica — público: el empleado envía su encuesta
export async function POST(req: NextRequest) {
  const body = await req.json();
  const personalId: string | undefined = body.personalId;
  const periodo: string = body.periodo || periodoActual();
  const respuestas: Respuestas = body.respuestas ?? {};

  if (!personalId) {
    return NextResponse.json({ error: "Selecciona tu nombre para continuar" }, { status: 400 });
  }

  const faltan = faltantesRequeridas(respuestas);
  if (faltan.length > 0) {
    return NextResponse.json({ error: "Faltan preguntas obligatorias por responder" }, { status: 400 });
  }

  const persona = await prisma.personalInterno.findFirst({
    where: { id: personalId, activo: true },
    select: { id: true },
  });
  if (!persona) return NextResponse.json({ error: "Colaborador no encontrado" }, { status: 404 });

  const existente = await prisma.encuestaSatisfaccionEquipo.findUnique({
    where: { personalId_periodo: { personalId, periodo } },
    select: { respondida: true },
  });
  if (existente?.respondida) {
    return NextResponse.json({ error: "Ya registraste tu encuesta de este período. ¡Gracias!" }, { status: 409 });
  }

  const promedio = calcularPromedio(respuestas);
  const animo = valorAnimo(respuestas);

  await prisma.encuestaSatisfaccionEquipo.upsert({
    where: { personalId_periodo: { personalId, periodo } },
    create: {
      personalId, periodo,
      respuestas: respuestas as object,
      enviada: true, respondida: true, respondidaEn: new Date(),
      promedioCalculado: promedio,
      probabilidadRecomendar: animo != null ? Math.round(animo) : null,
    },
    update: {
      respuestas: respuestas as object,
      respondida: true, respondidaEn: new Date(),
      promedioCalculado: promedio,
      probabilidadRecomendar: animo != null ? Math.round(animo) : null,
    },
  });

  return NextResponse.json({ ok: true });
}
