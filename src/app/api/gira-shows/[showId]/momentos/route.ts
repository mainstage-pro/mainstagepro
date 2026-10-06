import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { MOMENTOS_PLANTILLA, TIPOS_BLOQUE, ordenarBloques } from "@/lib/giras";
import { PLANTILLA_POR_LLAVE, SELECT_MOMENTO, datosSiembraAncla, esLlaveAncla } from "@/lib/show-momentos";

/// Los momentos del día de un show. El orden que se devuelve es el cronológico
/// de la jornada, no el de captura: se arma en memoria porque la madrugada va al
/// final y Postgres no sabe de eso.
///
/// Si el show no tiene ningún momento todavía se siembra el esqueleto de
/// `MOMENTOS_PLANTILLA` —sin horas— para que el primer render ya traiga los ocho
/// renglones de siempre en vez de una tabla en blanco. Es idempotente: solo
/// siembra cuando no hay nada, así un ancla que alguien borró a propósito no
/// vuelve sola.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { showId } = await params;
  const show = await prisma.giraShow.findUnique({ where: { id: showId }, select: { id: true } });
  if (!show) return NextResponse.json({ error: "El show no existe" }, { status: 404 });

  let momentos = await prisma.showMomento.findMany({
    where: { showId },
    select: SELECT_MOMENTO,
    orderBy: [{ hora: "asc" }, { orden: "asc" }],
  });

  if (momentos.length === 0) {
    await prisma.showMomento.createMany({ data: datosSiembraAncla(showId) });
    momentos = await prisma.showMomento.findMany({
      where: { showId },
      select: SELECT_MOMENTO,
      orderBy: [{ hora: "asc" }, { orden: "asc" }],
    });
    await logActividad(
      session.id,
      "SEMBRAR_DIA_SHOW",
      "GiraShow",
      showId,
      `Sembró el esqueleto del día del show: ${MOMENTOS_PLANTILLA.length} momentos`,
      { sembrados: MOMENTOS_PLANTILLA.length },
    );
  }

  return NextResponse.json({ momentos: ordenarBloques(momentos) });
}

/// Un momento nuevo: de plantilla (viene con `llave` y su título y fase ya
/// escritos) o escrito a mano (`llave` nulo y título obligatorio).
export async function POST(req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { showId } = await params;
  const show = await prisma.giraShow.findUnique({ where: { id: showId }, select: { id: true } });
  if (!show) return NextResponse.json({ error: "El show no existe" }, { status: 404 });

  const body = await req.json();
  const llaveCruda = typeof body.llave === "string" && body.llave.trim() ? body.llave.trim() : null;
  const plantilla = llaveCruda ? PLANTILLA_POR_LLAVE[llaveCruda] : undefined;
  if (llaveCruda && !plantilla) {
    return NextResponse.json({ error: "Ese momento no está en la plantilla" }, { status: 400 });
  }

  // La llave es lo que deja a los PDFs ubicar el show: no puede haber dos.
  if (llaveCruda) {
    const repetido = await prisma.showMomento.findFirst({
      where: { showId, llave: llaveCruda },
      select: { id: true },
    });
    if (repetido) return NextResponse.json({ error: "Ese momento ya está en el día" }, { status: 409 });
  }

  const titulo =
    typeof body.titulo === "string" && body.titulo.trim() ? body.titulo.trim() : (plantilla?.titulo ?? "");
  if (!titulo) return NextResponse.json({ error: "El momento necesita un título" }, { status: 400 });

  const tipoPedido = typeof body.tipo === "string" && TIPOS_BLOQUE.includes(body.tipo) ? body.tipo : null;

  const max = await prisma.showMomento.aggregate({ where: { showId }, _max: { orden: true } });

  const momento = await prisma.showMomento.create({
    data: {
      showId,
      llave: llaveCruda,
      titulo,
      tipo: tipoPedido ?? plantilla?.tipo ?? "PROGRAMA",
      esAncla: esLlaveAncla(llaveCruda),
      hora: typeof body.hora === "string" && body.hora.trim() ? body.hora.trim() : null,
      horaFin: typeof body.horaFin === "string" && body.horaFin.trim() ? body.horaFin.trim() : null,
      responsable: typeof body.responsable === "string" && body.responsable.trim() ? body.responsable.trim() : null,
      lugar: typeof body.lugar === "string" && body.lugar.trim() ? body.lugar.trim() : null,
      notas: typeof body.notas === "string" && body.notas.trim() ? body.notas.trim() : null,
      orden: (max._max.orden ?? 0) + 10,
    },
    select: SELECT_MOMENTO,
  });

  await logActividad(session.id, "CREAR", "ShowMomento", momento.id, `Agregó «${titulo}» al día del show`, { showId });

  return NextResponse.json({ momento });
}
