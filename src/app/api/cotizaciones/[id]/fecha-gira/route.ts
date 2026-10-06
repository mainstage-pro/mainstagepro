import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { SELECT_SHOW_COTIZAR, plazaDeShow } from "@/lib/cotizacion-gira";

/**
 * PATCH: mueve la cotización a otra fecha de su gira, o la devuelve al tour con
 * `showId: null`. Arrastra la fecha y el venue de la plaza porque son datos del
 * show, no de la cotización; los nombres no se tocan para no pisar lo que el
 * vendedor ya escribió.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const showId: string | null = body?.showId ?? null;

  const cot = await prisma.cotizacion.findUnique({
    where: { id },
    select: {
      id: true,
      numeroCotizacion: true,
      giraId: true,
      giraShow: { select: { giraId: true } },
    },
  });
  if (!cot) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });

  const giraId = cot.giraId ?? cot.giraShow?.giraId ?? null;
  if (!giraId) return NextResponse.json({ error: "Esta cotización no es de una gira" }, { status: 400 });

  // Una cotización con proyecto operativo ya está en producción: mover su fecha
  // dejaría el proyecto colgado de la plaza equivocada.
  const proyecto = await prisma.giraShow.findFirst({
    where: { cotizaciones: { some: { id } }, proyectoId: { not: null } },
    select: { id: true },
  });
  if (proyecto) {
    return NextResponse.json(
      { error: "Esa fecha ya tiene proyecto operativo; desvincúlalo antes de mover la cotización" },
      { status: 400 },
    );
  }

  let show = null;
  if (showId) {
    show = await prisma.giraShow.findFirst({ where: { id: showId, giraId }, select: SELECT_SHOW_COTIZAR });
    if (!show) return NextResponse.json({ error: "Esa fecha no es de esta gira" }, { status: 400 });
  }

  await prisma.cotizacion.update({
    where: { id },
    data: {
      giraId,
      giraShowId: show?.id ?? null,
      fechaEvento: show?.fecha ?? null,
      venueId: show?.venueId ?? null,
      lugarEvento: show?.venue?.nombre ?? null,
    },
  });

  await logActividad(
    session.id,
    "EDITAR",
    "Cotizacion",
    id,
    show
      ? `Cotización ${cot.numeroCotizacion} asignada a ${plazaDeShow(show)}`
      : `Cotización ${cot.numeroCotizacion} devuelta al alcance de toda la gira`,
  );

  return NextResponse.json({ ok: true });
}
