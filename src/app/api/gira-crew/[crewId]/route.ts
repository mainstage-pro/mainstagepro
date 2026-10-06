import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { ORIGENES_CREW, ROLES_PERSONA, nombreCrew } from "@/lib/giras";
import { INCLUDE_CREW } from "@/lib/logistica-gira";
import { SELECT_PERSONA, altaEnDirectorio, propagarAPersona } from "@/lib/contactos-artista";

function texto(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

/// `telefono`, `email` y `nombreLibre` no entran aquí: cuando el renglón está
/// ligado a una persona del artista esos datos son de ella y se escriben con
/// `propagarAPersona`. Ver src/lib/contactos-artista.ts.
const TEXTO = ["llamado", "notas"] as const;
const RELACIONES = ["tecnicoId", "personaId", "rolTecnicoId"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ crewId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { crewId } = await params;
  const existente = await prisma.giraCrew.findUnique({
    where: { id: crewId },
    select: {
      id: true,
      giraId: true,
      personaId: true,
      tecnicoId: true,
      nombreLibre: true,
      funcion: true,
      telefono: true,
      email: true,
      gira: { select: { artistaId: true } },
    },
  });
  if (!existente) return NextResponse.json({ error: "El miembro del crew no existe" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  // Dar de alta en el directorio del artista al que entró como nombre libre: deja
  // de ser un nombre suelto de esta gira y queda disponible para riders y shows.
  if (body.accion === "alta-directorio") {
    if (existente.personaId || existente.tecnicoId) {
      return NextResponse.json({ error: "Ese miembro ya está ligado" }, { status: 400 });
    }
    const nombre = existente.nombreLibre?.trim();
    if (!nombre) return NextResponse.json({ error: "Ese miembro no tiene nombre" }, { status: 400 });

    const clave = existente.funcion.trim().toUpperCase().replace(/\s+/g, "_");
    const persona = await altaEnDirectorio(prisma, existente.gira.artistaId, {
      nombre,
      rol: (ROLES_PERSONA as readonly string[]).includes(clave) ? clave : "OTRO",
      telefono: existente.telefono,
      email: existente.email,
    });

    const miembro = await prisma.giraCrew.update({
      where: { id: crewId },
      data: { personaId: persona.id, nombreLibre: null },
      include: INCLUDE_CREW,
    });
    return NextResponse.json({ miembro });
  }

  if ("origen" in body) {
    if (typeof body.origen !== "string" || !ORIGENES_CREW.includes(body.origen)) {
      return NextResponse.json({ error: "Origen inválido" }, { status: 400 });
    }
    data.origen = body.origen;
  }

  if ("funcion" in body) {
    const funcion = typeof body.funcion === "string" ? body.funcion.trim() : "";
    if (!funcion) return NextResponse.json({ error: "La función no puede quedar vacía" }, { status: 400 });
    data.funcion = funcion;
  }

  // Mover el alcance: de toda la gira a un show y de vuelta. El show tiene que
  // ser de la misma gira.
  if ("showId" in body) {
    const showId = typeof body.showId === "string" && body.showId ? body.showId : null;
    if (showId) {
      const show = await prisma.giraShow.findUnique({ where: { id: showId }, select: { giraId: true } });
      if (!show || show.giraId !== existente.giraId) {
        return NextResponse.json({ error: "El show no pertenece a este registro" }, { status: 400 });
      }
    }
    data.showId = showId;
  }

  for (const campo of TEXTO) {
    if (!(campo in body)) continue;
    const v = body[campo];
    data[campo] = typeof v === "string" && v.trim() ? v.trim() : null;
  }

  for (const campo of RELACIONES) {
    if (!(campo in body)) continue;
    const v = body[campo];
    data[campo] = typeof v === "string" && v ? v : null;
  }

  // Nombre, teléfono y correo de un renglón ligado a una persona del artista son
  // de ella: se escriben sobre la persona y aparecen ya corregidos en el rider y
  // en los shows. El renglón suelto los guarda en su propia columna.
  const personaIdFinal =
    "personaId" in body ? ((data.personaId as string | null) ?? null) : existente.personaId;
  const nombreEntrante = texto(body.nombreLibre) ?? texto(body.nombre);

  if (personaIdFinal) {
    const aPersona: { nombre?: string; telefono?: string | null; email?: string | null } = {};
    if (nombreEntrante) aPersona.nombre = nombreEntrante;
    if ("telefono" in body) aPersona.telefono = texto(body.telefono);
    if ("email" in body) aPersona.email = texto(body.email);
    await propagarAPersona(prisma, personaIdFinal, aPersona);
    data.nombreLibre = null;
    if ("telefono" in body) data.telefono = texto(body.telefono);
    if ("email" in body) data.email = texto(body.email);

    // Recién ligado: la copia del renglón pasa a decir lo que dice la persona.
    if (personaIdFinal !== existente.personaId) {
      const persona = await prisma.artistaPersona.findUnique({
        where: { id: personaIdFinal },
        select: SELECT_PERSONA,
      });
      if (persona) {
        if (!("telefono" in body)) data.telefono = persona.telefono;
        if (!("email" in body)) data.email = persona.email;
      }
    }
  } else {
    if ("nombreLibre" in body || "nombre" in body) data.nombreLibre = nombreEntrante;
    if ("telefono" in body) data.telefono = texto(body.telefono);
    if ("email" in body) data.email = texto(body.email);
  }

  if ("orden" in body) {
    const n = Number(body.orden);
    data.orden = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
  }

  if (!Object.keys(data).length) return NextResponse.json({ error: "Nada por actualizar" }, { status: 400 });

  try {
    const miembro = await prisma.giraCrew.update({ where: { id: crewId }, data, include: INCLUDE_CREW });
    return NextResponse.json({ miembro });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el crew" }, { status: 404 });
  }
}

/// Baja suave: el renglón se queda para que el histórico de la gira no pierda
/// quién estaba contemplado, y su rooming y sus viajes siguen apuntando a algo.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ crewId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { crewId } = await params;
  const existente = await prisma.giraCrew.findUnique({ where: { id: crewId }, include: INCLUDE_CREW });
  if (!existente) return NextResponse.json({ error: "El miembro del crew no existe" }, { status: 404 });

  await prisma.giraCrew.update({ where: { id: crewId }, data: { activo: false } });

  await logActividad(
    session.id,
    "ELIMINAR",
    "GiraCrew",
    crewId,
    `Dio de baja a ${nombreCrew(existente)} del crew de la gira`,
    { giraId: existente.giraId, showId: existente.showId },
  );

  return NextResponse.json({ ok: true });
}
