import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { ORIGENES_CREW, ROLES_PERSONA, nombreCrew } from "@/lib/giras";
import { INCLUDE_CREW } from "@/lib/logistica-gira";
import { SELECT_PERSONA, altaEnDirectorio } from "@/lib/contactos-artista";

/**
 * Crew de la gira. `showId` nulo = viaja toda la gira; `showId` con valor =
 * refuerzo que solo entra a ese show (el técnico local, el de la casa). Con
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
  const gira = await prisma.gira.findUnique({
    where: { id },
    select: { id: true, nombre: true, artistaId: true },
  });
  if (!gira) return NextResponse.json({ error: "El show o la gira no existe" }, { status: 404 });

  const body = await req.json();

  const tecnicoId = typeof body.tecnicoId === "string" && body.tecnicoId ? body.tecnicoId : null;
  let personaId = typeof body.personaId === "string" && body.personaId ? body.personaId : null;
  let nombreLibre = typeof body.nombreLibre === "string" && body.nombreLibre.trim() ? body.nombreLibre.trim() : null;

  // Dar de alta a alguien que no está en ningún catálogo sin salir de la pantalla:
  // entra al directorio del artista y el renglón nace ya ligado, así que después
  // se puede reusar en el rider y en los shows.
  if (body.nuevaPersona && typeof body.nuevaPersona === "object") {
    const nueva = body.nuevaPersona as Record<string, unknown>;
    const nombre = typeof nueva.nombre === "string" ? nueva.nombre.trim() : "";
    if (!nombre) return NextResponse.json({ error: "La persona nueva necesita nombre" }, { status: 400 });

    const persona = await altaEnDirectorio(prisma, gira.artistaId, {
      nombre,
      rol:
        typeof nueva.rol === "string" && (ROLES_PERSONA as readonly string[]).includes(nueva.rol)
          ? nueva.rol
          : "OTRO",
      telefono: typeof nueva.telefono === "string" ? nueva.telefono.trim() || null : null,
      email: typeof nueva.email === "string" ? nueva.email.trim() || null : null,
    });
    personaId = persona.id;
    nombreLibre = null;
  }

  // Una persona del crew tiene que ser alguien: o del catálogo de técnicos, o del
  // elenco del artista, o un nombre escrito a mano.
  if (!tecnicoId && !personaId && !nombreLibre) {
    return NextResponse.json({ error: "Dinos quién es: elige un técnico, un integrante o escribe el nombre" }, { status: 400 });
  }

  const funcion = typeof body.funcion === "string" && body.funcion.trim() ? body.funcion.trim() : "Por definir";
  const showId = typeof body.showId === "string" && body.showId ? body.showId : null;

  // Si llega un show, tiene que ser de esta gira: un crew colgado de otra gira
  // aparecería en un day sheet ajeno.
  if (showId) {
    const show = await prisma.giraShow.findUnique({ where: { id: showId }, select: { giraId: true } });
    if (!show || show.giraId !== id) return NextResponse.json({ error: "El show no pertenece a este registro" }, { status: 400 });
  }

  // Un renglón ligado no vuelve a teclear el teléfono: lo trae de la persona.
  let telefono = typeof body.telefono === "string" && body.telefono.trim() ? body.telefono.trim() : null;
  let email = typeof body.email === "string" && body.email.trim() ? body.email.trim() : null;
  if (personaId) {
    const persona = await prisma.artistaPersona.findFirst({
      where: { id: personaId, artistaId: gira.artistaId },
      select: SELECT_PERSONA,
    });
    if (!persona) return NextResponse.json({ error: "Esa persona no es del artista" }, { status: 400 });
    telefono = telefono ?? persona.telefono;
    email = email ?? persona.email;
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
      telefono,
      email,
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
