import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureGiraNotasColumns } from "@/lib/migraciones-lazy";
import {
  emptyGiraShowEvaluacion,
  type GiraShowEvaluacionData,
} from "@/lib/gira-evaluacion";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureGiraNotasColumns();
  const { showId } = await params;

  const show = await prisma.giraShow.findUnique({
    where: { id: showId },
    select: { evaluacion: true },
  });
  if (!show) return NextResponse.json({ error: "Show no encontrado" }, { status: 404 });

  return NextResponse.json({ evaluacion: show.evaluacion ?? null });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureGiraNotasColumns();
  const { showId } = await params;
  const body = await request.json();

  const existente = await prisma.giraShow.findUnique({
    where: { id: showId },
    select: { evaluacion: true },
  });
  if (!existente) return NextResponse.json({ error: "Show no encontrado" }, { status: 404 });

  const prev = { ...emptyGiraShowEvaluacion(), ...((existente.evaluacion as GiraShowEvaluacionData | null) ?? {}) };
  const texto = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);

  const data: GiraShowEvaluacionData = {
    coordinacionLogistica: texto(body.coordinacionLogistica, prev.coordinacionLogistica),
    tiemposProduccion: texto(body.tiemposProduccion, prev.tiemposProduccion),
    montaje: texto(body.montaje, prev.montaje),
    soundcheck: texto(body.soundcheck, prev.soundcheck),
    show: texto(body.show, prev.show),
    desmontaje: texto(body.desmontaje, prev.desmontaje),
    notas: texto(body.notas, prev.notas),
    actualizadoPorId: session.id,
    actualizadoPorNombre: session.name,
    actualizadoEn: new Date().toISOString(),
  };

  await prisma.giraShow.update({ where: { id: showId }, data: { evaluacion: data } });

  return NextResponse.json({ evaluacion: data });
}
