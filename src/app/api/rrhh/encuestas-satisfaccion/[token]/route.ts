import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CAMPOS_NUM = [
  "claridadInstrucciones", "pagosPuntuales", "tratoJusto",
  "organizacion", "comunicacion", "herramientas", "crecimiento",
  "ambiente", "probabilidadRecomendar",
];

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
  const data: Record<string, number | string | null | boolean | Date> = {};

  for (const campo of CAMPOS_NUM) {
    if (campo in body && body[campo] != null) {
      data[campo] = Number(body[campo]);
    }
  }
  if ("loMejor" in body) data.loMejor = body.loMejor || null;
  if ("loMejorable" in body) data.loMejorable = body.loMejorable || null;
  if ("comentarios" in body) data.comentarios = body.comentarios || null;

  // Calcular promedio (excluyendo NPS)
  const criterios = CAMPOS_NUM.filter(c => c !== "probabilidadRecomendar");
  const vals = criterios.map(c => data[c] as number | undefined).filter((v): v is number => v != null && v > 0);
  const promedio = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;

  const updated = await prisma.encuestaSatisfaccionEquipo.update({
    where: { token },
    data: {
      ...data,
      respondida: true,
      respondidaEn: new Date(),
      promedioCalculado: promedio,
    },
  });

  return NextResponse.json({ encuesta: updated });
}
