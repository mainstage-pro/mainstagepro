import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { INCLUDE_SETLIST } from "@/lib/logistica-gira";

/**
 * Setlists de la gira. Uno es el base (`esBase`) y de él salen las variantes por
 * show: el festival que recorta a 40 minutos no reescribe el repertorio, copia
 * el base y lo acorta.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const showId = req.nextUrl.searchParams.get("showId");

  const setlists = await prisma.giraSetlist.findMany({
    where: { giraId: id, ...(showId ? { OR: [{ showId }, { esBase: true }] } : {}) },
    orderBy: [{ esBase: "desc" }, { createdAt: "asc" }],
    include: INCLUDE_SETLIST,
  });

  return NextResponse.json({ setlists });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const gira = await prisma.gira.findUnique({ where: { id }, select: { id: true, nombre: true } });
  if (!gira) return NextResponse.json({ error: "El show o la gira no existe" }, { status: 404 });

  const body = await req.json();
  const showId = typeof body.showId === "string" && body.showId ? body.showId : null;

  if (showId) {
    const show = await prisma.giraShow.findUnique({ where: { id: showId }, select: { giraId: true } });
    if (!show || show.giraId !== id) return NextResponse.json({ error: "El show no pertenece a este registro" }, { status: 400 });
  }

  // Copiar el base es lo normal al abrir el setlist de un show: nadie teclea
  // 22 canciones otra vez.
  const copiarDeId = typeof body.copiarDeId === "string" && body.copiarDeId ? body.copiarDeId : null;
  const origen = copiarDeId
    ? await prisma.giraSetlist.findFirst({
        where: { id: copiarDeId, giraId: id },
        include: { canciones: { orderBy: { orden: "asc" } } },
      })
    : null;
  if (copiarDeId && !origen) return NextResponse.json({ error: "El setlist que se quiere copiar no existe" }, { status: 404 });

  const nombre =
    (typeof body.nombre === "string" && body.nombre.trim()) ||
    (origen ? `${origen.nombre} (copia)` : showId ? "Setlist del show" : "Setlist base");

  // Solo puede haber un base: marcar uno nuevo desmarca el anterior, si no la
  // copia para un show no sabría de dónde salir.
  const esBase = !showId && !!body.esBase;
  if (esBase) await prisma.giraSetlist.updateMany({ where: { giraId: id, esBase: true }, data: { esBase: false } });

  const setlist = await prisma.giraSetlist.create({
    data: {
      giraId: id,
      showId,
      nombre,
      esBase,
      duracionMin: Number.isFinite(Number(body.duracionMin)) && body.duracionMin !== null && body.duracionMin !== ""
        ? Math.trunc(Number(body.duracionMin))
        : (origen?.duracionMin ?? null),
      notas: typeof body.notas === "string" && body.notas.trim() ? body.notas.trim() : null,
      ...(origen?.canciones.length
        ? {
            canciones: {
              create: origen.canciones.map((c) => ({
                tipo: c.tipo,
                orden: c.orden,
                titulo: c.titulo,
                bloqueNombre: c.bloqueNombre,
                duracionSeg: c.duracionSeg,
                tonalidad: c.tonalidad,
                bpm: c.bpm,
                conTrack: c.conTrack,
                notasAudio: c.notasAudio,
                notasLuces: c.notasLuces,
                notasVideo: c.notasVideo,
                cambioInstrumento: c.cambioInstrumento,
                notas: c.notas,
              })),
            },
          }
        : {}),
    },
    include: INCLUDE_SETLIST,
  });

  await logActividad(
    session.id,
    "CREAR",
    "GiraSetlist",
    setlist.id,
    origen
      ? `Copió el setlist «${origen.nombre}» como «${setlist.nombre}»`
      : `Creó el setlist «${setlist.nombre}» en ${gira.nombre}`,
    { showId, canciones: setlist.canciones.length },
  );

  return NextResponse.json({ setlist });
}
