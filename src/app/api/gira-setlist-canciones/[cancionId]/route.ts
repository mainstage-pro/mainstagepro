import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { TIPOS_FILA_SETLIST } from "@/lib/giras";

const TEXTO = [
  "artistaInvitado",
  "tonalidad",
  "notasAudio",
  "notasLuces",
  "notasVideo",
  "cambioInstrumento",
  "notas",
  "bloqueNombre",
] as const;
const ENTEROS = ["duracionSeg", "bpm", "orden"] as const;

/// Edición renglón por renglón, como el advance: la fila conserva su id.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ cancionId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { cancionId } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("tipo" in body) {
    if (!TIPOS_FILA_SETLIST.includes(body.tipo)) {
      return NextResponse.json({ error: "Ese tipo de renglón no existe" }, { status: 400 });
    }
    data.tipo = body.tipo;
  }

  if ("titulo" in body) {
    const titulo = typeof body.titulo === "string" ? body.titulo.trim() : "";
    if (!titulo) return NextResponse.json({ error: "El renglón necesita título" }, { status: 400 });
    data.titulo = titulo;
  }

  for (const campo of TEXTO) {
    if (!(campo in body)) continue;
    const v = body[campo];
    data[campo] = typeof v === "string" && v.trim() ? v.trim() : null;
  }

  for (const campo of ENTEROS) {
    if (!(campo in body)) continue;
    const v = body[campo];
    if (v === null || v === "" || v === undefined) {
      data[campo] = campo === "orden" ? 0 : null;
      continue;
    }
    const n = Number(v);
    data[campo] = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : null;
  }

  if ("conTrack" in body) data.conTrack = !!body.conTrack;

  // El color termina pintado en un style inline y en el relleno del PDF, así que
  // entra como hexadecimal o no entra. Vacío significa "el de la paleta".
  if ("bloqueColor" in body) {
    const v = typeof body.bloqueColor === "string" ? body.bloqueColor.trim() : "";
    if (v && !/^#[0-9a-f]{6}$/i.test(v)) {
      return NextResponse.json({ error: "Ese color no es un hexadecimal" }, { status: 400 });
    }
    data.bloqueColor = v || null;
  }

  // A qué fechas va el renglón. Vacío significa "a todas", así que una fecha
  // que se dé de alta después lo hereda sin que nadie vuelva a palomearla.
  if ("soloEnShows" in body) {
    if (!Array.isArray(body.soloEnShows)) {
      return NextResponse.json({ error: "Las fechas deben venir en una lista" }, { status: 400 });
    }
    data.soloEnShows = [...new Set(body.soloEnShows.filter((v: unknown) => typeof v === "string" && v))];
  }

  if (!Object.keys(data).length) return NextResponse.json({ error: "Nada por actualizar" }, { status: 400 });

  try {
    const cancion = await prisma.giraSetlistCancion.update({ where: { id: cancionId }, data });
    return NextResponse.json({ cancion });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar la canción" }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ cancionId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { cancionId } = await params;

  const cancion = await prisma.giraSetlistCancion.findUnique({
    where: { id: cancionId },
    select: { id: true, origenId: true, setlist: { select: { giraId: true, showId: true } } },
  });
  if (!cancion) return NextResponse.json({ error: "No se pudo quitar la canción" }, { status: 404 });

  // Quitar de una fecha un renglón que vino del base es decirle al base que esa
  // noche no va. Borrar solo la copia no alcanzaría: la siguiente visita a la
  // pestaña se la volvería a sembrar.
  const { giraId, showId } = cancion.setlist;
  if (showId && cancion.origenId) {
    const origen = await prisma.giraSetlistCancion.findUnique({
      where: { id: cancion.origenId },
      select: { soloEnShows: true },
    });
    if (origen) {
      const alcance = origen.soloEnShows.length
        ? origen.soloEnShows
        : (await prisma.giraShow.findMany({ where: { giraId }, select: { id: true } })).map((s) => s.id);
      const quedan = alcance.filter((id) => id !== showId);
      // Si ya no va en ninguna fecha deja de ser repertorio: se borra del base y
      // la cascada se lleva esta copia. Guardar la lista vacía diría "en todas".
      if (!quedan.length) {
        await prisma.giraSetlistCancion.delete({ where: { id: cancion.origenId } });
        return NextResponse.json({ ok: true });
      }
      await prisma.giraSetlistCancion.update({ where: { id: cancion.origenId }, data: { soloEnShows: quedan } });
    }
  }

  await prisma.giraSetlistCancion.delete({ where: { id: cancionId } });
  return NextResponse.json({ ok: true });
}
