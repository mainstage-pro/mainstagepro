import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureOperacionTecnicaColumns } from "@/lib/migraciones-lazy";
import { emptyEvalData, type EvalPostEventoData, type ItemResp } from "@/lib/evaluacion-post-evento";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureOperacionTecnicaColumns();
  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { evaluacionPostEvento: true },
  });
  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  return NextResponse.json({ evaluacion: proyecto.evaluacionPostEvento ?? null });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureOperacionTecnicaColumns();
  const { id } = await params;
  const body = await request.json();

  const existente = await prisma.proyecto.findUnique({
    where: { id },
    select: { evaluacionPostEvento: true },
  });
  if (!existente) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const prev = (existente.evaluacionPostEvento as EvalPostEventoData | null) ?? emptyEvalData();
  const ahora = new Date().toISOString();

  // El servidor administra los timestamps; el cliente sólo envía las respuestas.
  const items: Record<string, ItemResp> =
    body.items && typeof body.items === "object" ? body.items : prev.items;

  const data: EvalPostEventoData = {
    llenadoPorId: body.llenadoPorId ?? prev.llenadoPorId ?? null,
    llenadoPorNombre: body.llenadoPorNombre ?? prev.llenadoPorNombre ?? null,
    respondidoEn: prev.respondidoEn ?? ahora,
    actualizadoEn: ahora,
    items,
    calificaciones:
      body.calificaciones && typeof body.calificaciones === "object" ? body.calificaciones : prev.calificaciones ?? {},
    calificacionFinal:
      typeof body.calificacionFinal === "number" || body.calificacionFinal === null
        ? body.calificacionFinal
        : prev.calificacionFinal ?? null,
    propuestasMejora: Array.isArray(body.propuestasMejora) ? body.propuestasMejora : prev.propuestasMejora ?? [],
    comentariosFinales:
      typeof body.comentariosFinales === "string" ? body.comentariosFinales : prev.comentariosFinales ?? "",
  };

  await prisma.proyecto.update({
    where: { id },
    data: { evaluacionPostEvento: data },
  });

  return NextResponse.json({ evaluacion: data });
}
