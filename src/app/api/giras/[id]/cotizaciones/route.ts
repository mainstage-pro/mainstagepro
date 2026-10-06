import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import {
  SELECT_GIRA_COTIZAR,
  SELECT_SHOW_COTIZAR,
  copiarCotizacionAFecha,
  crearCotizacionDeGira,
  plazaDeShow,
} from "@/lib/cotizacion-gira";

/**
 * POST: abre una cotización de equipo de la gira.
 *
 * Sin `showId` cubre todo el tour: es la base donde se carga el equipo una vez.
 * Con `showId` queda anclada a esa plaza. Con `desdeId` copia el equipo y los
 * precios de otra cotización de la misma gira, que es cómo el tour baja a cada
 * fecha sin volver a capturar nada.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: giraId } = await params;
  const body = await req.json().catch(() => ({}));
  const showId: string | null = body?.showId ?? null;
  const desdeId: string | null = body?.desdeId ?? null;

  const gira = await prisma.gira.findUnique({ where: { id: giraId }, select: SELECT_GIRA_COTIZAR });
  if (!gira) return NextResponse.json({ error: "La gira no existe" }, { status: 404 });

  // Sin cliente no hay a quién cotizarle. Es el dato que más se deja pendiente al
  // dar de alta una gira, así que el error dice dónde arreglarlo.
  if (!gira.clienteId) {
    return NextResponse.json({ error: "Liga un cliente a la gira antes de cotizar equipo" }, { status: 400 });
  }

  let show = null;
  if (showId) {
    show = await prisma.giraShow.findFirst({ where: { id: showId, giraId }, select: SELECT_SHOW_COTIZAR });
    if (!show) return NextResponse.json({ error: "Esa fecha no es de esta gira" }, { status: 400 });
  }

  const destino = show ? plazaDeShow(show) : "toda la gira";

  if (desdeId) {
    const origen = await prisma.cotizacion.findFirst({
      where: { id: desdeId, giraId },
      select: { id: true, numeroCotizacion: true },
    });
    if (!origen) return NextResponse.json({ error: "Esa cotización no es de esta gira" }, { status: 400 });

    const copia = await copiarCotizacionAFecha(desdeId, gira, show, session.id);
    if (!copia) return NextResponse.json({ error: "No se pudo copiar" }, { status: 400 });

    await logActividad(
      session.id,
      "CREAR",
      "Cotizacion",
      copia.id,
      `Cotización ${copia.numeroCotizacion} copiada de ${origen.numeroCotizacion} para ${destino} (${gira.nombre})`,
    );
    return NextResponse.json(copia, { status: 201 });
  }

  const cot = await crearCotizacionDeGira(gira, show, session.id);

  await logActividad(
    session.id,
    "CREAR",
    "Cotizacion",
    cot.id,
    `Cotización ${cot.numeroCotizacion} de equipo para ${destino} (${gira.nombre})`,
  );

  return NextResponse.json(cot, { status: 201 });
}
