import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET: consulta si ya existe un reporte para este proyecto (sin crear)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const reporte = await prisma.reportePostEvento.findUnique({
    where: { proyectoId: id },
    select: { token: true, estado: true, respondidoEn: true },
  });

  return NextResponse.json({ reporte: reporte ?? null });
}

// POST: genera o devuelve el reporte existente
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({ where: { id }, select: { id: true } });
  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const existente = await prisma.reportePostEvento.findUnique({
    where: { proyectoId: id },
    select: { token: true, estado: true, respondidoEn: true },
  });
  if (existente) {
    return NextResponse.json({ token: existente.token, estado: existente.estado, respondidoEn: existente.respondidoEn?.toISOString() ?? null });
  }

  const nuevo = await prisma.reportePostEvento.create({
    data: {
      proyectoId: id,
      token: crypto.randomUUID(),
      estado: "pendiente",
    },
  });

  return NextResponse.json({ token: nuevo.token, estado: nuevo.estado, respondidoEn: null });
}
