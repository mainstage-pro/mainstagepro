import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { TIPOS_HABITACION, nombreCrew, partirClaveRooming } from "@/lib/giras";
import { INCLUDE_ROOMING } from "@/lib/logistica-gira";

/**
 * Rooming list de la gira. Un renglón = una persona con su cuarto en un hotel.
 * Se asigna de a uno: el renglón se crea desde el hotel y la persona se elige en
 * su propio selector.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const hospedajeId = req.nextUrl.searchParams.get("hospedajeId");

  const roomings = await prisma.giraRooming.findMany({
    where: { giraId: id, ...(hospedajeId ? { hospedajeId } : {}) },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    include: INCLUDE_ROOMING,
  });

  return NextResponse.json({ roomings });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const gira = await prisma.gira.findUnique({ where: { id }, select: { id: true } });
  if (!gira) return NextResponse.json({ error: "La gira no existe" }, { status: 404 });

  const body = await req.json();

  const hospedajeId = typeof body.hospedajeId === "string" && body.hospedajeId ? body.hospedajeId : null;
  if (hospedajeId) {
    const hospedaje = await prisma.giraHospedaje.findUnique({
      where: { id: hospedajeId },
      select: { giraId: true },
    });
    if (!hospedaje || hospedaje.giraId !== id) {
      return NextResponse.json({ error: "El hotel no es de esta gira" }, { status: 400 });
    }
  }

  // El ocupante llega como clave compuesta del selector («crew:…» o «persona:…»)
  // o como id suelto cuando el renglón se crea desde la lista de pendientes.
  const asignado = partirClaveRooming(typeof body.asignado === "string" ? body.asignado : null);
  const crewId = typeof body.crewId === "string" && body.crewId ? body.crewId : asignado.crewId;

  const max = await prisma.giraRooming.aggregate({ where: { giraId: id }, _max: { orden: true } });

  const rooming = await prisma.giraRooming.create({
    data: {
      giraId: id,
      hospedajeId,
      showId: typeof body.showId === "string" && body.showId ? body.showId : null,
      crewId,
      personaId: typeof body.personaId === "string" && body.personaId ? body.personaId : asignado.personaId,
      nombreLibre: typeof body.nombreLibre === "string" && body.nombreLibre.trim() ? body.nombreLibre.trim() : null,
      habitacion: typeof body.habitacion === "string" && body.habitacion.trim() ? body.habitacion.trim() : null,
      tipoHabitacion:
        typeof body.tipoHabitacion === "string" && TIPOS_HABITACION.includes(body.tipoHabitacion)
          ? body.tipoHabitacion
          : null,
      comparteCon: typeof body.comparteCon === "string" && body.comparteCon.trim() ? body.comparteCon.trim() : null,
      notas: typeof body.notas === "string" && body.notas.trim() ? body.notas.trim() : null,
      orden: (max._max.orden ?? 0) + 10,
    },
    include: INCLUDE_ROOMING,
  });

  const quien = rooming.crew ? nombreCrew(rooming.crew) : (rooming.persona?.nombre ?? rooming.nombreLibre ?? "un cuarto");
  await logActividad(
    session.id,
    "CREAR",
    "GiraRooming",
    rooming.id,
    `Asignó cuarto a ${quien}${rooming.hospedaje ? ` en ${rooming.hospedaje.hotelNombre}` : ""}`,
  );

  return NextResponse.json({ rooming });
}
