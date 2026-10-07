import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { ESTADOS_SHOW, TIPOS_SHOW, esGira, parseFechaGira } from "@/lib/giras";
import { SELECT_PERSONA, altaEnDirectorio, propagarAPersona } from "@/lib/contactos-artista";

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

/// `promotorContacto`, `promotorTelefono` y `promotorEmail` no entran aquí: cuando
/// el promotor está ligado al directorio del artista son datos de la persona y se
/// escriben con `propagarAPersona`. `promotorNombre` sí: es la empresa, no alguien.
const TEXTOS = [
  "ciudad",
  "promotorNombre",
  "contactoCasaNombre",
  "contactoCasaTelefono",
  "contactoCasaEmail",
  "notas",
] as const;

const CAMPOS_CASA = ["contactoCasaNombre", "contactoCasaTelefono", "contactoCasaEmail"] as const;

function texto(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

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
      promotorPersona: { select: SELECT_PERSONA },
      repartos: { select: { prioridad: true, estado: true, cubiertoPor: true } },
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
    select: {
      id: true,
      giraId: true,
      fecha: true,
      estado: true,
      ciudad: true,
      venueId: true,
      promotorPersonaId: true,
      promotorContacto: true,
      promotorTelefono: true,
      promotorEmail: true,
      contactoCasaNombre: true,
      contactoCasaTelefono: true,
      contactoCasaEmail: true,
      gira: { select: { artistaId: true } },
    },
  });
  if (!existente) return NextResponse.json({ error: "El show no existe" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  // El contacto de casa es del venue: lo que se corrija aquí se puede devolver al
  // catálogo para que la próxima fecha en ese foro ya lo traiga bien.
  if (body.accion === "guardar-casa-en-venue") {
    if (!existente.venueId) return NextResponse.json({ error: "El show no tiene venue ligado" }, { status: 400 });
    await prisma.venue.update({
      where: { id: existente.venueId },
      data: {
        contactoTecnicoNombre: existente.contactoCasaNombre,
        contactoTecnicoTelefono: existente.contactoCasaTelefono,
        contactoTecnicoEmail: existente.contactoCasaEmail,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if ("fecha" in body) {
    const fecha = parseFechaGira(body.fecha);
    if (!fecha) return NextResponse.json({ error: "La fecha del show es obligatoria" }, { status: 400 });
    data.fecha = fecha;
  }

  if ("venueId" in body) {
    data.venueId = body.venueId || null;
    // Al ligar el venue se siembra lo que ya sabe el catálogo: la ciudad si el show
    // no la tenía (el advance se ordena por ciudad y uno sin ciudad desaparece de la
    // logística) y el contacto técnico del foro, que es el contacto de casa de esta
    // fecha. Se siembra editable: aquí se corrige y desde aquí se devuelve al venue.
    if (body.venueId) {
      const venue = await prisma.venue.findUnique({
        where: { id: body.venueId },
        select: {
          ciudad: true,
          contactoTecnicoNombre: true,
          contactoTecnicoTelefono: true,
          contactoTecnicoEmail: true,
        },
      });
      if (venue?.ciudad && !existente.ciudad && !("ciudad" in body)) data.ciudad = venue.ciudad;

      const casaVacia = CAMPOS_CASA.every((c) => !existente[c]);
      if (venue && casaVacia && !CAMPOS_CASA.some((c) => c in body)) {
        data.contactoCasaNombre = venue.contactoTecnicoNombre;
        data.contactoCasaTelefono = venue.contactoTecnicoTelefono;
        data.contactoCasaEmail = venue.contactoTecnicoEmail;
      }
    }
  }

  // El promotor de la fecha, ligado al directorio del artista (rol PROMOTOR) para
  // que la siguiente fecha con el mismo promotor lo reuse en vez de recapturarlo.
  let promotorPersonaId = existente.promotorPersonaId;
  let propago = false;

  if (body.nuevaPersonaPromotor && typeof body.nuevaPersonaPromotor === "object") {
    const nueva = body.nuevaPersonaPromotor as Record<string, unknown>;
    const nombre = texto(nueva.nombre);
    if (!nombre) return NextResponse.json({ error: "El promotor nuevo necesita nombre" }, { status: 400 });
    const persona = await altaEnDirectorio(prisma, existente.gira.artistaId, {
      nombre,
      rol: "PROMOTOR",
      telefono: texto(nueva.telefono),
      email: texto(nueva.email),
    });
    promotorPersonaId = persona.id;
  } else if ("promotorPersonaId" in body) {
    const nuevo = texto(body.promotorPersonaId);
    if (nuevo) {
      const persona = await prisma.artistaPersona.findFirst({
        where: { id: nuevo, artistaId: existente.gira.artistaId },
        select: { id: true },
      });
      if (!persona) return NextResponse.json({ error: "Esa persona no es del artista" }, { status: 400 });
    }
    promotorPersonaId = nuevo;
  }

  if (promotorPersonaId) {
    const aPersona: { nombre?: string; telefono?: string | null; email?: string | null } = {};
    const nombre = texto(body.promotorContacto);
    if (nombre) aPersona.nombre = nombre;
    if ("promotorTelefono" in body) aPersona.telefono = texto(body.promotorTelefono);
    if ("promotorEmail" in body) aPersona.email = texto(body.promotorEmail);
    propago = await propagarAPersona(prisma, promotorPersonaId, aPersona);

    if (promotorPersonaId !== existente.promotorPersonaId) {
      data.promotorPersonaId = promotorPersonaId;
      const persona = await prisma.artistaPersona.findUnique({
        where: { id: promotorPersonaId },
        select: SELECT_PERSONA,
      });
      if (persona) {
        data.promotorContacto = persona.nombre;
        data.promotorTelefono = persona.telefono;
        data.promotorEmail = persona.email;
      }
    }
  } else {
    if (promotorPersonaId !== existente.promotorPersonaId) data.promotorPersonaId = null;
    for (const campo of ["promotorContacto", "promotorTelefono", "promotorEmail"] as const) {
      if (campo in body) data[campo] = texto(body[campo]);
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

  if (Object.keys(data).length === 0) {
    // La edición pudo haberse ido entera a la persona ligada: eso no es "nada".
    if (propago) {
      const show = await prisma.giraShow.findUnique({
        where: { id: showId },
        include: { promotorPersona: { select: SELECT_PERSONA } },
      });
      return NextResponse.json({ show });
    }
    return NextResponse.json({ error: "Nada por actualizar" }, { status: 400 });
  }

  const show = await prisma.giraShow.update({
    where: { id: showId },
    data,
    include: { promotorPersona: { select: SELECT_PERSONA } },
  });

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
    select: { id: true, giraId: true, ciudad: true, fecha: true, _count: { select: { repartos: true } } },
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
    { renglonesAdvance: existente._count.repartos },
  );

  return NextResponse.json({ ok: true });
}
