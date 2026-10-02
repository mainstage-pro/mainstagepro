import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { TIPOS_BLOQUE, ordenarBloques } from "@/lib/giras";

/// Bloques del day sheet de un show. El orden que se devuelve es el
/// cronológico de la jornada, no el de captura: se arma en memoria porque
/// la madrugada va al final y Postgres no sabe de eso.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { showId } = await params;
  const bloques = await prisma.giraShowBloque.findMany({
    where: { showId },
    orderBy: [{ hora: "asc" }, { orden: "asc" }],
  });

  return NextResponse.json({ bloques: ordenarBloques(bloques) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { showId } = await params;
  const show = await prisma.giraShow.findUnique({ where: { id: showId }, select: { id: true } });
  if (!show) return NextResponse.json({ error: "El show no existe" }, { status: 404 });

  const body = await req.json();
  const titulo = typeof body.titulo === "string" ? body.titulo.trim() : "";
  if (!titulo) return NextResponse.json({ error: "El bloque necesita un título" }, { status: 400 });

  const max = await prisma.giraShowBloque.aggregate({ where: { showId }, _max: { orden: true } });

  const bloque = await prisma.giraShowBloque.create({
    data: {
      showId,
      titulo,
      tipo: typeof body.tipo === "string" && TIPOS_BLOQUE.includes(body.tipo) ? body.tipo : "PROGRAMA",
      hora: typeof body.hora === "string" && body.hora.trim() ? body.hora.trim() : null,
      horaFin: typeof body.horaFin === "string" && body.horaFin.trim() ? body.horaFin.trim() : null,
      responsable: typeof body.responsable === "string" && body.responsable.trim() ? body.responsable.trim() : null,
      lugar: typeof body.lugar === "string" && body.lugar.trim() ? body.lugar.trim() : null,
      notas: typeof body.notas === "string" && body.notas.trim() ? body.notas.trim() : null,
      orden: (max._max.orden ?? 0) + 10,
    },
  });

  await logActividad(session.id, "CREAR", "GiraShowBloque", bloque.id, `Agregó «${titulo}» al día del show`);

  return NextResponse.json({ bloque });
}
