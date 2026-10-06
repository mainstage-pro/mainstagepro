import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import {
  SELECT_GIRA_COTIZAR,
  SELECT_SHOW_COTIZAR,
  crearCotizacionDeGira,
  plazaDeShow,
} from "@/lib/cotizacion-gira";

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
    select: { ...SELECT_SHOW_COTIZAR, gira: { select: SELECT_GIRA_COTIZAR } },
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

  const cot = await crearCotizacionDeGira(show.gira, show, session.id);

  await logActividad(
    session.id,
    "CREAR",
    "Cotizacion",
    cot.id,
    `Cotización ${cot.numeroCotizacion} de equipo para ${plazaDeShow(show)} (${show.gira.nombre})`,
  );

  return NextResponse.json({ id: cot.id, numeroCotizacion: cot.numeroCotizacion }, { status: 201 });
}
