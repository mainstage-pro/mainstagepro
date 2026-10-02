import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { TIPOS_HABITACION, nombreCrew, partirClaveRooming } from "@/lib/giras";
import { INCLUDE_ROOMING } from "@/lib/logistica-gira";

const TEXTO = ["habitacion", "comparteCon", "notas", "nombreLibre"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ roomingId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { roomingId } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  for (const campo of TEXTO) {
    if (!(campo in body)) continue;
    const v = body[campo];
    data[campo] = typeof v === "string" && v.trim() ? v.trim() : null;
  }

  if ("tipoHabitacion" in body) {
    const v = body.tipoHabitacion;
    data.tipoHabitacion =
      typeof v === "string" && (TIPOS_HABITACION as readonly string[]).includes(v) ? v : null;
  }

  // El selector de ocupante es uno solo y escribe en dos campos: al elegir a
  // alguien del crew se limpia el integrante y al revés, para que nunca queden
  // los dos y el cuarto termine con dos dueños.
  if ("asignado" in body) {
    const { crewId, personaId } = partirClaveRooming(typeof body.asignado === "string" ? body.asignado : null);
    data.crewId = crewId;
    data.personaId = personaId;
  }

  if ("crewId" in body) data.crewId = typeof body.crewId === "string" && body.crewId ? body.crewId : null;
  if ("personaId" in body) data.personaId = typeof body.personaId === "string" && body.personaId ? body.personaId : null;
  if ("hospedajeId" in body) data.hospedajeId = typeof body.hospedajeId === "string" && body.hospedajeId ? body.hospedajeId : null;
  if ("showId" in body) data.showId = typeof body.showId === "string" && body.showId ? body.showId : null;

  if ("orden" in body) {
    const n = Number(body.orden);
    data.orden = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
  }

  if (!Object.keys(data).length) return NextResponse.json({ error: "Nada por actualizar" }, { status: 400 });

  try {
    const rooming = await prisma.giraRooming.update({ where: { id: roomingId }, data, include: INCLUDE_ROOMING });
    return NextResponse.json({ rooming });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el cuarto" }, { status: 404 });
  }
}

/// GiraRooming no tiene bandera `activo`: un cuarto que no se usó no deja rastro
/// útil y el hotel se cobra por lo que quedó en la lista.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ roomingId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { roomingId } = await params;
  const existente = await prisma.giraRooming.findUnique({ where: { id: roomingId }, include: INCLUDE_ROOMING });
  if (!existente) return NextResponse.json({ error: "El cuarto no existe" }, { status: 404 });

  await prisma.giraRooming.delete({ where: { id: roomingId } });

  const quien = existente.crew
    ? nombreCrew(existente.crew)
    : (existente.persona?.nombre ?? existente.nombreLibre ?? "una persona");

  await logActividad(
    session.id,
    "ELIMINAR",
    "GiraRooming",
    roomingId,
    `Quitó el cuarto de ${quien}${existente.hospedaje ? ` en ${existente.hospedaje.hotelNombre}` : ""}`,
    { giraId: existente.giraId },
  );

  return NextResponse.json({ ok: true });
}
