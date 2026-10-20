import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureGiraNotasColumns } from "@/lib/migraciones-lazy";
import { parseGiraEvaluacion } from "@/lib/gira-evaluacion";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureGiraNotasColumns();
  const { id } = await params;

  const gira = await prisma.gira.findUnique({
    where: { id },
    select: { evaluacion: true },
  });
  if (!gira) return NextResponse.json({ error: "Gira no encontrada" }, { status: 404 });

  return NextResponse.json({ evaluacion: gira.evaluacion ?? null });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureGiraNotasColumns();
  const { id } = await params;
  const body = await request.json();

  const existente = await prisma.gira.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existente) return NextResponse.json({ error: "Gira no encontrada" }, { status: 404 });

  const data = {
    ...parseGiraEvaluacion(body),
    actualizadoPorId: session.id,
    actualizadoPorNombre: session.name,
    actualizadoEn: new Date().toISOString(),
  };

  await prisma.gira.update({
    where: { id },
    data: { evaluacion: data as unknown as Prisma.InputJsonValue },
  });

  return NextResponse.json({ evaluacion: data });
}
