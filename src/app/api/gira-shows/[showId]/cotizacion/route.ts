import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";

// POST: abre la cotización de equipo de esta fecha de gira.
//
// El equipo de una gira se cobra fecha por fecha con un total global —eso ya
// funcionaba— pero la cotización no sabía a qué fecha pertenecía. Al nacer desde
// aquí hereda el cliente y el trato de la gira, y la fecha y el venue del show,
// que es exactamente lo que había que volver a teclear.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ showId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { showId } = await params;

  const show = await prisma.giraShow.findUnique({
    where: { id: showId },
    select: {
      id: true,
      fecha: true,
      ciudad: true,
      venueId: true,
      venue: { select: { nombre: true } },
      gira: {
        select: {
          id: true,
          nombre: true,
          clienteId: true,
          tratoId: true,
          artista: { select: { nombre: true } },
        },
      },
    },
  });
  if (!show) return NextResponse.json({ error: "El show no existe" }, { status: 404 });

  // Sin cliente no hay a quién cotizarle. Es el dato que más se deja pendiente al
  // dar de alta una gira, así que el error dice dónde arreglarlo.
  if (!show.gira.clienteId) {
    return NextResponse.json(
      { error: "Liga un cliente a la gira antes de cotizar equipo" },
      { status: 400 },
    );
  }

  const ultima = await prisma.cotizacion.findFirst({
    orderBy: { numeroCotizacion: "desc" },
    select: { numeroCotizacion: true },
  });
  const consecutivo = ultima ? parseInt(ultima.numeroCotizacion.replace("COT-", "")) || 0 : 0;

  const dia = show.fecha.toISOString().slice(0, 10);
  const plaza = show.venue?.nombre ?? show.ciudad ?? dia;

  const cot = await prisma.cotizacion.create({
    data: {
      numeroCotizacion: `COT-${String(consecutivo + 1).padStart(4, "0")}`,
      estado: "BORRADOR",
      clienteId: show.gira.clienteId,
      tratoId: show.gira.tratoId,
      creadaPorId: session.id,
      giraShowId: show.id,
      nombreCotizacion: `${show.gira.artista.nombre} — ${plaza}`,
      nombreEvento: `${show.gira.nombre} — ${plaza}`,
      fechaEvento: show.fecha,
      venueId: show.venueId,
      lugarEvento: show.venue?.nombre ?? null,
      tipoEvento: "MUSICAL",
    },
    select: { id: true, numeroCotizacion: true },
  });

  await logActividad(
    session.id,
    "CREAR",
    "Cotizacion",
    cot.id,
    `Cotización ${cot.numeroCotizacion} de equipo para ${plaza} (${show.gira.nombre})`,
  );

  return NextResponse.json({ id: cot.id, numeroCotizacion: cot.numeroCotizacion }, { status: 201 });
}
