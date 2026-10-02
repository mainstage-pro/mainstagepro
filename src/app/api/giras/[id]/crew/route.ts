import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { ORIGENES_CREW, nombreCrew } from "@/lib/giras";
import { INCLUDE_CREW } from "@/lib/logistica-gira";

/**
 * Crew de la gira. `showId` nulo = viaja toda la gira; `showId` con plaza =
 * refuerzo que solo entra a esa plaza (el técnico local, el de la casa). Con
 * ?showId= se devuelve lo que trabaja ese día: los de toda la gira más los suyos.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const showId = req.nextUrl.searchParams.get("showId");

  const crew = await prisma.giraCrew.findMany({
    where: {
      giraId: id,
      activo: true,
      ...(showId ? { OR: [{ showId: null }, { showId }] } : {}),
    },
    orderBy: [{ origen: "asc" }, { orden: "asc" }, { createdAt: "asc" }],
    include: INCLUDE_CREW,
  });

  return NextResponse.json({ crew });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const gira = await prisma.gira.findUnique({ where: { id }, select: { id: true, nombre: true } });
  if (!gira) return NextResponse.json({ error: "La gira no existe" }, { status: 404 });

  const body = await req.json();

  const tecnicoId = typeof body.tecnicoId === "string" && body.tecnicoId ? body.tecnicoId : null;
  const personaId = typeof body.personaId === "string" && body.personaId ? body.personaId : null;
  const nombreLibre = typeof body.nombreLibre === "string" && body.nombreLibre.trim() ? body.nombreLibre.trim() : null;

  // Una persona del crew tiene que ser alguien: o del catálogo de técnicos, o del
  // elenco del artista, o un nombre escrito a mano.
  if (!tecnicoId && !personaId && !nombreLibre) {
    return NextResponse.json({ error: "Dinos quién es: elige un técnico, un integrante o escribe el nombre" }, { status: 400 });
  }

  const funcion = typeof body.funcion === "string" && body.funcion.trim() ? body.funcion.trim() : "Por definir";
  const showId = typeof body.showId === "string" && body.showId ? body.showId : null;

  // Si llega plaza, tiene que ser de esta gira: un crew colgado de otra gira
  // aparecería en un day sheet ajeno.
  if (showId) {
    const show = await prisma.giraShow.findUnique({ where: { id: showId }, select: { giraId: true } });
    if (!show || show.giraId !== id) return NextResponse.json({ error: "La plaza no es de esta gira" }, { status: 400 });
  }

  const max = await prisma.giraCrew.aggregate({ where: { giraId: id }, _max: { orden: true } });

  const miembro = await prisma.giraCrew.create({
    data: {
      giraId: id,
      showId,
      origen: typeof body.origen === "string" && ORIGENES_CREW.includes(body.origen) ? body.origen : "MAINSTAGE",
      tecnicoId,
      personaId,
      nombreLibre,
      funcion,
      rolTecnicoId: typeof body.rolTecnicoId === "string" && body.rolTecnicoId ? body.rolTecnicoId : null,
      telefono: typeof body.telefono === "string" && body.telefono.trim() ? body.telefono.trim() : null,
      email: typeof body.email === "string" && body.email.trim() ? body.email.trim() : null,
      llamado: typeof body.llamado === "string" && body.llamado.trim() ? body.llamado.trim() : null,
      notas: typeof body.notas === "string" && body.notas.trim() ? body.notas.trim() : null,
      orden: (max._max.orden ?? 0) + 10,
    },
    include: INCLUDE_CREW,
  });

  await logActividad(
    session.id,
    "CREAR",
    "GiraCrew",
    miembro.id,
    `Sumó a ${nombreCrew(miembro)} al crew de ${gira.nombre} como ${funcion}`,
    { showId },
  );

  return NextResponse.json({ miembro });
}
