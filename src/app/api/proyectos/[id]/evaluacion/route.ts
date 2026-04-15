import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const CAMPOS = [
  "planeacionPrevia",
  "cumplimientoTecnico",
  "puntualidad",
  "resolucionOperativa",
  "desempenoPersonal",
  "comunicacionInterna",
  "comunicacionCliente",
  "usoEquipo",
  "rentabilidadReal",
  "resultadoGeneral",
  "notas",
  "comentariosCriterios",
  "reportePostEvento",
];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const evaluacion = await prisma.evaluacionInterna.findUnique({
    where: { proyectoId: id },
  });

  return NextResponse.json({ evaluacion });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  // Filtrar solo campos permitidos
  const data: Record<string, number | string | null> = {};
  for (const campo of CAMPOS) {
    if (campo in body) {
      data[campo] = body[campo];
    }
  }

  // Calcular promedio de las calificaciones numéricas
  const campos_num = [
    "planeacionPrevia", "cumplimientoTecnico", "puntualidad", "resolucionOperativa",
    "desempenoPersonal", "comunicacionInterna", "comunicacionCliente",
    "usoEquipo", "rentabilidadReal", "resultadoGeneral",
  ];
  const vals = campos_num
    .map(c => (data[c] ?? body[c]) as number | null)
    .filter((v): v is number => v != null && v > 0);
  const promedio = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;

  const evaluacion = await prisma.evaluacionInterna.upsert({
    where: { proyectoId: id },
    create: { proyectoId: id, ...data, promedioCalculado: promedio },
    update: { ...data, promedioCalculado: promedio },
  });

  return NextResponse.json({ evaluacion });
}
