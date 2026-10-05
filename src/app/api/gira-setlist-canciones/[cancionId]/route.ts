import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { TIPOS_FILA_SETLIST } from "@/lib/giras";

const TEXTO = ["tonalidad", "notasAudio", "notasLuces", "notasVideo", "cambioInstrumento", "notas"] as const;
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
  try {
    await prisma.giraSetlistCancion.delete({ where: { id: cancionId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo quitar la canción" }, { status: 404 });
  }
}
