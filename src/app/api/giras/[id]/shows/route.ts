import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { ESTADOS_SHOW, TIPOS_SHOW, esGira, parseFechaGira } from "@/lib/giras";

/// El orden de los shows es la cronología de la gira, no una preferencia: se
/// reescribe cada vez que una fecha se mueve. Un route handler no puede exportar
/// nada además de sus verbos, así que el gemelo de esta función vive en
/// api/gira-shows/[showId]/route.ts.
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

function texto(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const shows = await prisma.giraShow.findMany({
    where: { giraId: id },
    orderBy: [{ fecha: "asc" }, { orden: "asc" }],
    include: {
      venue: { select: { id: true, nombre: true, ciudad: true, estado: true, capacidadPersonas: true } },
      repartos: { select: { prioridad: true, estado: true, cubiertoPor: true } },
      _count: { select: { crew: true, momentos: true } },
    },
  });

  return NextResponse.json({ shows });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const gira = await prisma.gira.findUnique({
    where: { id },
    select: { id: true, nombre: true, tipo: true, _count: { select: { shows: true } } },
  });
  if (!gira) return NextResponse.json({ error: "El show o la gira no existe" }, { status: 404 });

  // Un show suelto es de una sola fecha. La segunda fecha lo convierte en gira y
  // esa es una decisión del usuario, no un efecto secundario de agregar un show.
  if (!esGira(gira.tipo) && gira._count.shows > 0) {
    return NextResponse.json(
      { error: "Este registro es un show suelto. Pásalo a gira para agregarle más fechas." },
      { status: 400 },
    );
  }

  const body = await req.json();
  const fecha = parseFechaGira(body.fecha);
  if (!fecha) return NextResponse.json({ error: "La fecha del show es obligatoria" }, { status: 400 });

  let ciudad: string | null = typeof body.ciudad === "string" && body.ciudad.trim() ? body.ciudad.trim() : null;
  const venueId = typeof body.venueId === "string" && body.venueId ? body.venueId : null;

  // La ciudad se hereda del venue cuando no se capturó: es el dato que más se olvida
  // y el que ordena la logística.
  if (!ciudad && venueId) {
    const venue = await prisma.venue.findUnique({ where: { id: venueId }, select: { ciudad: true } });
    ciudad = venue?.ciudad ?? null;
  }

  const show = await prisma.giraShow.create({
    data: {
      giraId: id,
      fecha,
      ciudad,
      venueId,
      estado: ESTADOS_SHOW.includes(body.estado) ? body.estado : "POR_CONFIRMAR",
      tipoShow: TIPOS_SHOW.includes(body.tipoShow) ? body.tipoShow : null,
      aforoEsperado: Number.isFinite(Number(body.aforoEsperado)) && body.aforoEsperado !== null && body.aforoEsperado !== ""
        ? Math.trunc(Number(body.aforoEsperado))
        : null,
      promotorNombre: typeof body.promotorNombre === "string" && body.promotorNombre.trim() ? body.promotorNombre.trim() : null,
      promotorContacto: typeof body.promotorContacto === "string" && body.promotorContacto.trim() ? body.promotorContacto.trim() : null,
      promotorTelefono: typeof body.promotorTelefono === "string" && body.promotorTelefono.trim() ? body.promotorTelefono.trim() : null,
      promotorEmail: typeof body.promotorEmail === "string" && body.promotorEmail.trim() ? body.promotorEmail.trim() : null,
      contactoCasaNombre: texto(body.contactoCasaNombre),
      contactoCasaTelefono: texto(body.contactoCasaTelefono),
      contactoCasaEmail: texto(body.contactoCasaEmail),
      notas: typeof body.notas === "string" && body.notas.trim() ? body.notas.trim() : null,
    },
  });

  await reordenarShows(id);
  await logActividad(session.id, "CREAR", "GiraShow", show.id, `Agregó un show a ${gira.nombre}`);

  return NextResponse.json({ show });
}
