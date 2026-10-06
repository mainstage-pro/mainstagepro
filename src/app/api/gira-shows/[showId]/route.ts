import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { ESTADOS_SHOW, TIPOS_SHOW, esGira, parseFechaGira } from "@/lib/giras";

/// Gemelo de la función en api/giras/[id]/shows/route.ts: un route handler no
/// puede exportar nada además de sus verbos.
async function reordenarShows(giraId: string) {
  const shows = await prisma.giraShow.findMany({
    where: { giraId },
    orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
    select: { id: true, orden: true },
  });
  for (const [i, s] of shows.entries()) {
    if (s.orden !== i + 1) await prisma.giraShow.update({ where: { id: s.id }, data: { orden: i + 1 } });
  }
}

const TEXTOS = [
  "ciudad",
  "promotorNombre",
  "promotorContacto",
  "promotorTelefono",
  "promotorEmail",
  "contactoCasaNombre",
  "contactoCasaTelefono",
  "contactoCasaEmail",
  "notas",
] as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { showId } = await params;
  const show = await prisma.giraShow.findUnique({
    where: { id: showId },
    include: {
      gira: {
        select: {
          id: true,
          nombre: true,
          estado: true,
          moneda: true,
          artista: { select: { id: true, nombre: true } },
          rider: { select: { id: true, nombre: true, version: true } },
        },
      },
      venue: true,
      riderLineas: { select: { prioridad: true, estado: true, cubiertoPor: true } },
      _count: { select: { crew: true, momentos: true, archivos: true, viajes: true, roomings: true } },
    },
  });

  if (!show) return NextResponse.json({ error: "El show no existe" }, { status: 404 });

  return NextResponse.json({ show });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { showId } = await params;
  const existente = await prisma.giraShow.findUnique({
    where: { id: showId },
    select: { id: true, giraId: true, fecha: true, estado: true, ciudad: true },
  });
  if (!existente) return NextResponse.json({ error: "El show no existe" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("fecha" in body) {
    const fecha = parseFechaGira(body.fecha);
    if (!fecha) return NextResponse.json({ error: "La fecha del show es obligatoria" }, { status: 400 });
    data.fecha = fecha;
  }

  if ("venueId" in body) {
    data.venueId = body.venueId || null;
    // Al ligar el venue se siembra la ciudad si el show no tenía: el advance se
    // ordena por ciudad y un show sin ciudad desaparece de la logística.
    if (body.venueId && !existente.ciudad && !("ciudad" in body)) {
      const venue = await prisma.venue.findUnique({ where: { id: body.venueId }, select: { ciudad: true } });
      if (venue?.ciudad) data.ciudad = venue.ciudad;
    }
  }

  if ("estado" in body) {
    if (!ESTADOS_SHOW.includes(body.estado)) return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    data.estado = body.estado;
  }

  if ("tipoShow" in body) {
    data.tipoShow = body.tipoShow && TIPOS_SHOW.includes(body.tipoShow) ? body.tipoShow : null;
  }

  if ("aforoEsperado" in body) {
    const n = Number(body.aforoEsperado);
    data.aforoEsperado = body.aforoEsperado === null || body.aforoEsperado === "" || !Number.isFinite(n) ? null : Math.trunc(n);
  }

  for (const campo of TEXTOS) {
    if (campo in body) {
      const v = body[campo];
      data[campo] = typeof v === "string" && v.trim() ? v.trim() : null;
    }
  }

  if ("riderEnviado" in body) data.riderEnviadoEn = body.riderEnviado ? new Date() : null;
  if ("advanceCerrado" in body) data.advanceCerradoEn = body.advanceCerrado ? new Date() : null;

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nada por actualizar" }, { status: 400 });

  const show = await prisma.giraShow.update({ where: { id: showId }, data });

  if (data.fecha && new Date(String(data.fecha)).getTime() !== existente.fecha.getTime()) {
    await reordenarShows(existente.giraId);
    // En un show suelto la fecha del show ES la fecha del registro: si no se
    // arrastra, la lista y el resumen quedan mintiendo.
    const gira = await prisma.gira.findUnique({ where: { id: existente.giraId }, select: { tipo: true } });
    if (!esGira(gira?.tipo)) {
      await prisma.gira.update({
        where: { id: existente.giraId },
        data: { fechaInicio: show.fecha, fechaFin: show.fecha },
      });
    }
  }

  if ("riderEnviado" in body && body.riderEnviado) {
    await logActividad(session.id, "ACTUALIZAR", "GiraShow", showId, `Marcó el rider como enviado a la casa`);
  }

  return NextResponse.json({ show });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { showId } = await params;
  const existente = await prisma.giraShow.findUnique({
    where: { id: showId },
    select: { id: true, giraId: true, ciudad: true, fecha: true, _count: { select: { riderLineas: true } } },
  });
  if (!existente) return NextResponse.json({ error: "El show no existe" }, { status: 404 });

  // GiraShow no tiene bandera `activo`: quitar el show borra en cascada su advance,
  // sus bloques y su crew. La UI lo advierte antes de llegar aquí.
  await prisma.giraShow.delete({ where: { id: showId } });
  await reordenarShows(existente.giraId);

  await logActividad(
    session.id,
    "ELIMINAR",
    "GiraShow",
    showId,
    `Quitó el show del ${existente.fecha.toISOString().slice(0, 10)}${existente.ciudad ? ` en ${existente.ciudad}` : ""}`,
    { renglonesAdvance: existente._count.riderLineas },
  );

  return NextResponse.json({ ok: true });
}
