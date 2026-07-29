import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CAMPOS_NUM = [
  "claridadInstrucciones", "pagosPuntuales", "tratoJusto",
  "organizacion", "comunicacion", "herramientas", "crecimiento",
  "ambiente", "probabilidadRecomendar",
];

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

  if (!personalId) {
    return NextResponse.json({ error: "Selecciona tu nombre para continuar" }, { status: 400 });
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

  const data: Record<string, number | string | null> = {};
  for (const campo of CAMPOS_NUM) {
    if (campo in body && body[campo] != null) data[campo] = Number(body[campo]);
  }
  if ("loMejor" in body) data.loMejor = body.loMejor || null;
  if ("loMejorable" in body) data.loMejorable = body.loMejorable || null;
  if ("comentarios" in body) data.comentarios = body.comentarios || null;

  const criterios = CAMPOS_NUM.filter(c => c !== "probabilidadRecomendar");
  const vals = criterios.map(c => data[c] as number | undefined).filter((v): v is number => v != null && v > 0);
  const promedio = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;

  await prisma.encuestaSatisfaccionEquipo.upsert({
    where: { personalId_periodo: { personalId, periodo } },
    create: {
      personalId, periodo, ...data,
      enviada: true, respondida: true, respondidaEn: new Date(), promedioCalculado: promedio,
    },
    update: {
      ...data,
      respondida: true, respondidaEn: new Date(), promedioCalculado: promedio,
    },
  });

  return NextResponse.json({ ok: true });
}
